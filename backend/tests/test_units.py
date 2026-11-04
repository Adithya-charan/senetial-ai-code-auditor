import pytest

from app import ai, repository, scanner


def test_url_validation():
    assert repository.parse_github_url("https://github.com/psf/requests") == ("psf", "requests")
    assert repository.parse_github_url("https://github.com/psf/requests.git/") == ("psf", "requests")
    for bad in ["http://github.com/a/b", "https://evil.com/a/b", "https://github.com/a",
                "https://github.com/a/b/../c", "file:///etc/passwd", "https://127.0.0.1/a/b",
                "https://github.com.evil.com/a/b", "https://github.com/../b"]:
        with pytest.raises(repository.IntakeError):
            repository.parse_github_url(bad)


def test_redaction():
    out = scanner.redact('password = "hunter2hunter2" key=gsk_' + "a" * 30)
    assert "hunter2" not in out and "gsk_aaaa" not in out


def _res(refs):
    return ai.AiResult(summary="s", potential_impact="i", remediation=["r"],
                       evidence_claims=[ai.Claim(claim="c", evidence_reference=r) for r in refs])


def test_verifier():
    refs = {"scanner-rule": "x", "location": "y"}
    assert ai.verify(_res(["scanner-rule"]), refs) == ("SUPPORTED", [])
    assert ai.verify(_res(["scanner-rule", "made-up"]), refs)[0] == "UNCERTAIN"
    assert ai.verify(_res(["made-up"]), refs)[0] == "UNSUPPORTED"
    assert ai.verify(_res([]), refs)[0] == "UNCERTAIN"


def test_correlate_merges_same_file_line_cwe():
    a = {"file_path": "a.py", "start_line": 3, "cwe_id": "CWE-78", "scanner": "bandit"}
    b = {**a, "scanner": "semgrep"}
    c = {**a, "cwe_id": None, "scanner": "gitleaks"}
    d = {**a, "start_line": 4}
    assert [f["scanner"] for f in scanner.correlate([a, b, c, d])] == ["bandit", "gitleaks", "bandit"]
