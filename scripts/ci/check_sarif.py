"""Fail closed on missing reports, incomplete scans and high/critical findings."""

import json
import math
import sys
from pathlib import Path


def check_report(report):
    if report.get("version") != "2.1.0" or not report.get("runs"):
        raise ValueError("Missing or unsupported SARIF runs")
    findings = []
    for run in report["runs"]:
        if "results" not in run:
            raise ValueError("Scan did not provide results")
        if any(invocation.get("executionSuccessful") is False for invocation in run.get("invocations", [])):
            raise ValueError("Scanner did not complete successfully")
        rules = {rule["id"]: rule for rule in run.get("tool", {}).get("driver", {}).get("rules", [])}
        for result in run["results"]:
            rule_id = result.get("ruleId", "unknown")
            rule = rules.get(rule_id, {})
            properties = {**rule.get("properties", {}), **result.get("properties", {})}
            score = float(properties.get("security-severity", 0))
            if not math.isfinite(score) or not 0 <= score <= 10:
                raise ValueError("Invalid security severity in scanner output")
            level = result.get("level", rule.get("defaultConfiguration", {}).get("level", "warning"))
            if score >= 7 or level == "error":
                findings.append(rule_id)
    return findings


def main(directory):
    reports = list(Path(directory).glob("*.sarif"))
    if not reports:
        raise ValueError("No SARIF reports found; refusing to report success")
    findings = []
    for report in reports:
        findings.extend(check_report(json.loads(report.read_text(encoding="utf-8"))))
    if findings:
        # Do not print source snippets, query strings, file contents or secrets.
        print("Source security gate failed: " + ", ".join(sorted(set(findings))))
        return 1
    print(f"Source security gate passed for {len(reports)} SARIF report(s)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1]))
    except (ValueError, OSError, IndexError, KeyError, TypeError) as error:
        print(f"Source security gate failed: {error}", file=sys.stderr)
        sys.exit(1)
