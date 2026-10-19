import tempfile
import unittest

from check_sarif import check_report, main


def report(results, rules=None):
    return {"version": "2.1.0", "runs": [{
        "tool": {"driver": {"rules": rules or []}}, "results": results,
    }]}


class SourceSecurityGateTests(unittest.TestCase):
    def test_empty_successful_scan_passes(self):
        self.assertEqual(check_report(report([])), [])

    def test_high_score_fails_even_when_sarif_level_is_warning(self):
        data = report([{"ruleId": "high", "level": "warning"}], [
            {"id": "high", "properties": {"security-severity": "7.5"}},
        ])
        self.assertEqual(check_report(data), ["high"])

    def test_medium_score_is_not_misrepresented_as_high(self):
        self.assertEqual(check_report(report([
            {"ruleId": "medium", "properties": {"security-severity": "6.5"}},
        ])), [])

    def test_error_without_numeric_score_fails(self):
        self.assertEqual(check_report(report([{"ruleId": "error", "level": "error"}])), ["error"])

    def test_suppressing_a_finding_does_not_bypass_the_gate(self):
        self.assertEqual(check_report(report([{
            "ruleId": "high", "level": "error", "suppressions": [{"kind": "inSource"}],
        }])), ["high"])

    def test_incomplete_or_failed_scans_are_not_success(self):
        for data in [{}, {"version": "2.1.0", "runs": []}, {
            "version": "2.1.0", "runs": [{"tool": {}}],
        }]:
            with self.assertRaises(ValueError):
                check_report(data)
        data = report([])
        data["runs"][0]["invocations"] = [{"executionSuccessful": False}]
        with self.assertRaises(ValueError):
            check_report(data)

    def test_missing_reports_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                main(directory)

    def test_invalid_security_scores_do_not_silently_pass(self):
        for score in ['NaN', 'Infinity', '-1', '11']:
            with self.subTest(score=score), self.assertRaises(ValueError):
                check_report(report([{'ruleId': 'invalid', 'properties': {'security-severity': score}}]))


if __name__ == "__main__":
    unittest.main()
