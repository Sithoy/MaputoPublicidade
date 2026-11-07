"""Scoped, staged Cloud Run rollout. Never reads or prints production secrets."""
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request

from cloud_run_gate import REPO, gh

PROJECT = 'maputo-publicidade-gcp'
REGION = 'us-east4'
SERVICE = 'mp-backend-production'
IMAGE = 'us-east4-docker.pkg.dev/maputo-publicidade-gcp/mp-backend/api'
CANDIDATE_HOST = 'candidate---mp-backend-production-li3tt3hwvq-uk.a.run.app'
HOSTS = 'mp-backend-production-654913531299.us-east4.run.app,mp-backend-production-li3tt3hwvq-uk.a.run.app,' + CANDIDATE_HOST


def cloud(*args):
    result = subprocess.run(['gcloud', 'run', *args, '--project=' + PROJECT,
                             '--region=' + REGION, '--quiet'], capture_output=True, timeout=360, check=False)
    if result.returncode:
        raise RuntimeError('Cloud Run request failed; provider output withheld')
    return result.stdout.decode().strip()


def state():
    return json.loads(cloud('services', 'describe', SERVICE,
                           '--format=json(status.url,status.traffic,status.latestReadyRevisionName)'))['status']


def previous_revision(status):
    live = [row for row in status['traffic'] if row.get('percent', 0) > 0]
    if len(live) != 1 or live[0]['percent'] != 100 or not live[0].get('revisionName', '').startswith(SERVICE + '-'):
        raise ValueError('Expected one existing production revision; refusing to overwrite split traffic')
    return live[0]['revisionName']


def validate_inputs(sha, image, run_number, attempt):
    if not re.fullmatch('[a-f0-9]{40}', sha) or not re.fullmatch(re.escape(IMAGE) + r'@sha256:[a-f0-9]{64}', image):
        raise ValueError('Invalid immutable release source/image')
    if not re.fullmatch('[0-9]{1,8}', run_number) or not re.fullmatch('[0-9]{1,3}', attempt):
        raise ValueError('Invalid run identifier')


def current_main(sha):
    if gh(f'repos/{REPO}/git/ref/heads/main')['object']['sha'] != sha:
        raise ValueError('Main advanced; stale release will not be promoted')


def request(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'MP-CI-release-health', 'Cache-Control': 'no-cache'})
    try:
        response = urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError as exc:
        response = exc
    with response:
        return response.code, response.headers, response.read(16 * 1024 * 1024)


def check(origin, sha):
    code, headers, body = request(origin + '/health/')
    if code != 200 or json.loads(body).get('db') is not True or headers.get('X-MP-Release') != sha:
        raise RuntimeError('Health/database/exact release check failed')
    code, _, body = request(origin + '/api/products/')
    if code != 200 or not isinstance(json.loads(body), (list, dict)):
        raise RuntimeError('Public API smoke check failed')
    code, _, body = request(origin + '/api/quotes/')
    if code not in {401, 403} or 'detail' not in json.loads(body):
        raise RuntimeError('Application authorization check failed')


def healthy(origin, sha):
    for attempt in range(6):
        try:
            check(origin, sha)
            return
        except Exception:
            if attempt == 5:
                raise RuntimeError('Release health checks failed; responses withheld') from None
            time.sleep(5)


def rollout(sha, image, number, attempt):
    validate_inputs(sha, image, number, attempt)
    current_main(sha)
    before = state()
    previous = previous_revision(before)
    origin = before['url']
    if origin != 'https://mp-backend-production-li3tt3hwvq-uk.a.run.app':
        raise ValueError('Unexpected production service URL')
    code, headers, body = request(origin + '/health/')
    previous_sha = headers.get('X-MP-Release', '')
    if code != 200 or json.loads(body).get('db') is not True or not re.fullmatch('[a-f0-9]{40}', previous_sha):
        raise RuntimeError('Existing production health/recovery anchor unavailable')
    suffix = f'ci-{sha[:12]}-{number}-{attempt}'
    revision = SERVICE + '-' + suffix
    promoted = False
    try:
        cloud('deploy', SERVICE, '--image=' + image, '--no-traffic', '--tag=candidate',
              '--revision-suffix=' + suffix, '--update-env-vars=^|^ALLOWED_HOSTS=' + HOSTS)
        staged = state()
        matches = [row for row in staged['traffic'] if row.get('tag') == 'candidate']
        if len(matches) != 1 or matches[0].get('revisionName') != revision or matches[0].get('url') != 'https://' + CANDIDATE_HOST:
            raise RuntimeError('Staged revision identity mismatch')
        healthy('https://' + CANDIDATE_HOST, sha)
        current_main(sha)
        promoted = True
        cloud('services', 'update-traffic', SERVICE, '--to-revisions=' + revision + '=100')
        healthy(origin, sha)
        if previous_revision(state()) != revision:
            raise RuntimeError('Production traffic did not reach the tested revision')
        print(json.dumps({'released': True, 'commit': sha, 'revision': revision,
                          'previous_revision': previous, 'url': 'https://maputopublicidade.com'}))
    except Exception:
        if promoted:
            cloud('services', 'update-traffic', SERVICE, '--to-revisions=' + previous + '=100')
            if previous_revision(state()) != previous:
                raise RuntimeError('Rollback could not be confirmed; owner intervention required') from None
            healthy(origin, previous_sha)
            print(json.dumps({'rolled_back': True, 'revision': previous}))
        raise RuntimeError('Release stopped; prior production traffic preserved or restored') from None
    finally:
        cloud('services', 'update-traffic', SERVICE, '--remove-tags=candidate')


if __name__ == '__main__':
    try:
        rollout(os.environ['RELEASE_SHA'], os.environ['RELEASE_IMAGE'],
                os.environ['GITHUB_RUN_NUMBER'], os.environ['GITHUB_RUN_ATTEMPT'])
    except Exception as exc:
        raise SystemExit(str(exc)) from None
