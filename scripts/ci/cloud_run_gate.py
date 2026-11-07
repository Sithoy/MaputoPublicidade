"""Fail closed on fork/PR, stale, untested or non-main deployment requests."""
import json
import os
import re
import subprocess
from pathlib import Path

REPO = 'Sithoy/MaputoPublicidade'
REPO_ID = 1272027275
WORKFLOW_ID = 300620961


def gh(path):
    result = subprocess.run(['gh', 'api', path], capture_output=True, check=False, timeout=30)
    if result.returncode:
        raise ValueError('GitHub release evidence unavailable')
    return json.loads(result.stdout)


def valid_run(run, sha):
    return (run.get('workflow_id') == WORKFLOW_ID and run.get('head_sha') == sha
            and run.get('head_branch') == 'main' and run.get('event') == 'push'
            and run.get('status') == 'completed' and run.get('conclusion') == 'success'
            and run.get('head_repository', {}).get('id') == REPO_ID)


def resolve(event_name, event, current_sha, api=gh):
    if not re.fullmatch('[a-f0-9]{40}', current_sha):
        raise ValueError('Invalid main revision')
    if event.get('repository', {}).get('id') != REPO_ID:
        raise ValueError('Unexpected repository')
    if event_name == 'workflow_run':
        candidate = event.get('workflow_run', {})
        run_id = candidate.get('id')
        if not isinstance(run_id, int) or run_id <= 0:
            raise ValueError('Invalid CI run identifier')
        run = api(f'repos/{REPO}/actions/runs/{run_id}')
        if not valid_run(run, current_sha):
            raise ValueError('Only successful push CI for current main can deploy')
    elif event_name == 'workflow_dispatch':
        runs = api(f'repos/{REPO}/actions/workflows/{WORKFLOW_ID}/runs?head_sha={current_sha}&event=push&per_page=30')
        if not any(valid_run(run, current_sha) for run in runs.get('workflow_runs', [])):
            raise ValueError('Current main has no successful push CI')
    else:
        raise ValueError('Unsupported release event')
    return current_sha


if __name__ == '__main__':
    try:
        if os.environ.get('GITHUB_REPOSITORY') != REPO or os.environ.get('GITHUB_REF') != 'refs/heads/main':
            raise ValueError('Production workflow must run on trusted main')
        event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
        current = gh(f'repos/{REPO}/git/ref/heads/main')['object']['sha']
        sha = resolve(os.environ['GITHUB_EVENT_NAME'], event, current)
        with Path(os.environ['GITHUB_OUTPUT']).open('a') as output:
            output.write(f'sha={sha}\n')
        print(f'CI verified for current main {sha}; no cloud credentials used by this gate.')
    except Exception:
        raise SystemExit('Release blocked: current main and successful push CI could not be verified.') from None
