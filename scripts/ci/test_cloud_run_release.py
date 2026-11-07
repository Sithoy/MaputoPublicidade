import unittest
from unittest.mock import patch

import cloud_run_gate as gate
import deploy_cloud_run as deploy

SHA = 'a' * 40
DIGEST = deploy.IMAGE + '@sha256:' + 'b' * 64
OLD = deploy.SERVICE + '-00001-rdf'
NEW = deploy.SERVICE + '-ci-' + SHA[:12] + '-12-1'
ORIGIN = 'https://mp-backend-production-li3tt3hwvq-uk.a.run.app'


def successful_run(**updates):
    run = {'workflow_id': gate.WORKFLOW_ID, 'head_sha': SHA, 'head_branch': 'main',
           'event': 'push', 'status': 'completed', 'conclusion': 'success',
           'head_repository': {'id': gate.REPO_ID}}
    return {**run, **updates}


def live(revision=OLD):
    return {'url': ORIGIN, 'traffic': [{'revisionName': revision, 'percent': 100}]}


def staged():
    result = live()
    result['traffic'].append({'tag': 'candidate', 'revisionName': NEW, 'url': 'https://' + deploy.CANDIDATE_HOST})
    return result


class ReleaseGateTests(unittest.TestCase):
    def test_successful_push_ci_for_current_main(self):
        event = {'repository': {'id': gate.REPO_ID}, 'workflow_run': {'id': 123}}
        self.assertEqual(gate.resolve('workflow_run', event, SHA, lambda _: successful_run()), SHA)

    def test_reject_fork_pr_failed_stale_and_other_workflow(self):
        for change in [{'head_repository': {'id': 1}}, {'event': 'pull_request'},
                       {'conclusion': 'failure'}, {'head_sha': 'c' * 40},
                       {'head_branch': 'staging'}, {'workflow_id': 1}, {'status': 'in_progress'}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                gate.resolve('workflow_run', {'repository': {'id': gate.REPO_ID}, 'workflow_run': {'id': 123}}, SHA,
                             lambda _: successful_run(**change))

    def test_manual_release_still_requires_successful_ci(self):
        event = {'repository': {'id': gate.REPO_ID}}
        with self.assertRaises(ValueError):
            gate.resolve('workflow_dispatch', event, SHA, lambda _: {'workflow_runs': []})
        self.assertEqual(gate.resolve('workflow_dispatch', event, SHA,
                                    lambda _: {'workflow_runs': [successful_run()]}), SHA)

    def test_reject_wrong_repository_and_malformed_identifiers(self):
        for event in [{'repository': {'id': 1}}, {'repository': {'id': gate.REPO_ID}, 'workflow_run': {'id': '../evil'}}]:
            with self.assertRaises(ValueError):
                gate.resolve('workflow_run', event, SHA, lambda _: successful_run())


class RolloutTests(unittest.TestCase):
    def run_rollout(self, states, health=None, command=None):
        with patch.object(deploy, 'current_main') as current, patch.object(deploy, 'state', side_effect=states), \
                patch.object(deploy, 'healthy', side_effect=health) as check, \
                patch.object(deploy, 'cloud', side_effect=command) as cloud, \
                patch.object(deploy, 'request', return_value=(200, {'X-MP-Release': 'c' * 40}, b'{"db":true}')):
            error = None
            try:
                deploy.rollout(SHA, DIGEST, '12', '1')
            except RuntimeError as exc:
                error = exc
            return error, cloud.call_args_list, check.call_args_list, current.call_count

    def test_success_stages_before_promoting_exact_revision(self):
        error, calls, _, current_checks = self.run_rollout([live(), staged(), live(NEW)])
        self.assertIsNone(error)
        self.assertIn('--no-traffic', calls[0].args)
        self.assertIn('--to-revisions=' + NEW + '=100', calls[1].args)
        self.assertIn('--remove-tags=candidate', calls[-1].args)
        self.assertEqual(current_checks, 2)

    def test_failed_candidate_never_changes_live_revision(self):
        error, calls, _, _ = self.run_rollout([live(), staged()], health=[RuntimeError('candidate')])
        self.assertIsNotNone(error)
        self.assertFalse(any(any('--to-revisions=' in item for item in call.args) for call in calls))

    def test_failed_live_health_rolls_back_and_checks_previous(self):
        error, calls, checks, _ = self.run_rollout([live(), staged(), live()],
                                                 health=[None, RuntimeError('live'), None])
        self.assertIsNotNone(error)
        self.assertIn('--to-revisions=' + OLD + '=100', calls[-2].args)
        self.assertEqual(checks[-1].args, (ORIGIN, 'c' * 40))

    def test_ambiguous_promotion_failure_also_restores_previous(self):
        error, calls, _, _ = self.run_rollout([live(), staged(), live()],
                                             command=[None, RuntimeError('lost response'), None, None])
        self.assertIsNotNone(error)
        self.assertIn('--to-revisions=' + OLD + '=100', calls[-2].args)

    def test_split_traffic_is_not_overwritten(self):
        with self.assertRaises(ValueError):
            deploy.previous_revision({'traffic': [{'revisionName': OLD, 'percent': 90},
                                                 {'revisionName': NEW, 'percent': 10}]})

    def test_only_immutable_mp_image_and_valid_source_are_allowed(self):
        for sha, image, number in [('main', DIGEST, '12'), (SHA, deploy.IMAGE + ':latest', '12'),
                                   (SHA, DIGEST.replace('mp-backend/api', 'other/api'), '12'), (SHA, DIGEST, 'x;evil')]:
            with self.assertRaises(ValueError):
                deploy.validate_inputs(sha, image, number, '1')

    def test_healthy_rejects_wrong_release_even_when_http_200(self):
        with patch.object(deploy, 'request', return_value=(200, {'X-MP-Release': 'c' * 40}, b'{"db":true}')):
            with self.assertRaises(RuntimeError):
                deploy.check(ORIGIN, SHA)


if __name__ == '__main__':
    unittest.main()
