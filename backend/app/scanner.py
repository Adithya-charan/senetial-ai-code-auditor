import json
import re
import subprocess
import sys
from pathlib import Path

from .config import settings

SECRET_RE = re.compile(
    r"(?i)((?:api[_-]?key|secret|token|passw(?:or)?d)\s*[:=]\s*)['\"][^'\"\n]{4,}['\"]"
    r"|gsk_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}"
)
SEVERITY = {"HIGH": "High", "MEDIUM": "Medium", "LOW": "Low"}


def redact(text: str) -> str:
    return SECRET_RE.sub(
        lambda m: (m.group(1) + '"[REDACTED]"') if m.group(1) else "[REDACTED]", text
    )


def excerpt(root: Path, rel: str, start: int | None, end: int | None, ctx: int = 3) -> str | None:
    p = (root / rel).resolve()
    if root.resolve() not in p.parents or not p.is_file() or not start:
        return None
    lines = p.read_text(errors="replace").splitlines()
    lo, hi = max(1, start - ctx), min(len(lines), (end or start) + ctx)
    return redact("\n".join(f"{n}: {lines[n - 1]}" for n in range(lo, hi + 1)))[:2000]


def run_bandit(root: Path) -> list[dict]:
    """Return normalised findings. Raises RuntimeError if the tool fails."""
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "bandit", "-r", str(root), "-f", "json", "-q"],
            capture_output=True, encoding="utf-8", errors="replace", timeout=settings.scan_timeout_seconds,
        )
        data = json.loads(proc.stdout)  # exit code 1 only means "issues found"
    except (subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        raise RuntimeError(f"bandit {type(e).__name__}") from e
    out = []
    for r in data.get("results", []):
        rel = str(Path(r["filename"]).resolve().relative_to(root.resolve())).replace("\\", "/")
        cwe = r.get("issue_cwe", {}).get("id")
        line = r.get("line_number")
        end = max(r.get("line_range") or [line])
        out.append({
            "scanner": "bandit", "rule_id": r["test_id"], "title": r["issue_text"][:200],
            "description": f'{r["test_name"]} (confidence: {r["issue_confidence"]})',
            "severity": SEVERITY.get(r["issue_severity"], "Info"), "file_path": rel,
            "start_line": line, "end_line": end,
            "cwe_id": f"CWE-{cwe}" if cwe else None,
            "excerpt": excerpt(root, rel, line, end),
        })
    return out


def _tool(name: str) -> str | None:
    """Find a scanner executable: PATH, the venv's Scripts dir, or the winget install."""
    import glob
    import shutil

    found = shutil.which(name)
    if found:
        return found
    candidates = [str(Path(sys.executable).parent / f"{name}.exe")]
    pkgs = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    key = name.lower().replace("-", "")
    if pkgs.is_dir():
        for d in pkgs.iterdir():
            if key in d.name.lower():
                candidates += glob.glob(str(d / f"{name}*.exe"))
    return next((c for c in candidates if Path(c).is_file()), None)


def _rel(root: Path, p: str) -> str:
    return str((root / p).resolve().relative_to(root.resolve())).replace("\\", "/")


def run_semgrep(root: Path) -> list[dict]:
    exe = _tool("semgrep")
    if not exe:
        raise RuntimeError("semgrep not installed")
    sev = {"ERROR": "High", "WARNING": "Medium", "INFO": "Low"}
    try:
        proc = subprocess.run(
            [exe, "scan", "--config", "p/default", "--metrics=off", "--json", "--quiet",
             "--timeout", "30", "--exclude", ".git", str(root)],
            capture_output=True, encoding="utf-8", errors="replace", timeout=settings.scan_timeout_seconds,
            env={**__import__("os").environ, "PYTHONUTF8": "1"},
        )
        data = json.loads(proc.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        raise RuntimeError(f"semgrep {type(e).__name__}") from e
    out = []
    for r in data.get("results", []):
        rel = _rel(root, r["path"])
        meta = r["extra"].get("metadata", {})
        cwes = meta.get("cwe") or []
        cwe = (cwes[0] if isinstance(cwes, list) else cwes).split(":")[0] if cwes else None
        start, end = r["start"]["line"], r["end"]["line"]
        out.append({
            "scanner": "semgrep", "rule_id": r["check_id"].split(".")[-1], "title": r["extra"]["message"][:200],
            "description": r["check_id"], "severity": sev.get(r["extra"].get("severity"), "Info"),
            "file_path": rel, "start_line": start, "end_line": end, "cwe_id": cwe,
            "excerpt": excerpt(root, rel, start, end),
        })
    return out


def run_gitleaks(root: Path) -> list[dict]:
    exe = _tool("gitleaks")
    if not exe:
        raise RuntimeError("gitleaks not installed")
    import tempfile

    with tempfile.TemporaryDirectory(prefix="gl-") as td:
        report = Path(td) / "r.json"
        try:
            # --redact keeps the secret value out of our report, DB and AI prompts.
            subprocess.run(
                [exe, "detect", "--no-git", "--source", str(root), "--report-format", "json",
                 "--report-path", str(report), "--redact", "--no-banner"],
                capture_output=True, encoding="utf-8", errors="replace", timeout=settings.scan_timeout_seconds,
            )
            data = json.loads(report.read_text())
        except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError) as e:
            raise RuntimeError(f"gitleaks {type(e).__name__}") from e
    return [{
        "scanner": "gitleaks", "rule_id": r["RuleID"], "title": f'Possible hardcoded secret: {r["Description"]}'[:200],
        "description": "Secret value redacted by the scanner and never stored.",
        "severity": "High", "file_path": _rel(root, r["File"]) if not Path(r["File"]).is_absolute()
        else str(Path(r["File"]).resolve().relative_to(root.resolve())).replace("\\", "/"),
        "start_line": r["StartLine"], "end_line": r["EndLine"], "cwe_id": "CWE-798", "excerpt": None,
    } for r in data]


def correlate(findings: list[dict]) -> list[dict]:
    """Drop a later finding that duplicates an earlier one (same file, line and CWE)."""
    seen, out = set(), []
    for f in findings:
        key = (f["file_path"], f["start_line"], f["cwe_id"]) if f["cwe_id"] else None
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        out.append(f)
    return out


def run_osv(root: Path) -> list[dict]:
    """One finding per vulnerable package (grouped by alias), located at its manifest."""
    exe = _tool("osv-scanner")
    if not exe:
        raise RuntimeError("osv-scanner not installed")
    try:
        proc = subprocess.run(
            [exe, "scan", "source", "-r", "--format", "json", str(root)],
            capture_output=True, encoding="utf-8", errors="replace", timeout=settings.scan_timeout_seconds,
        )
        # exit 1 = vulnerabilities found; 128 = nothing to scan (no manifests)
        data = json.loads(proc.stdout) if proc.stdout.strip() else {"results": []}
    except (subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        raise RuntimeError(f"osv-scanner {type(e).__name__}") from e
    if proc.returncode not in (0, 1, 128):
        raise RuntimeError(f"osv-scanner exit {proc.returncode}")
    out = []
    for res in data.get("results") or []:
        rel = str(Path(res["source"]["path"]).resolve().relative_to(root.resolve())).replace("\\", "/")
        for pkg in res.get("packages", []):
            groups = pkg.get("groups") or []
            if not groups:
                continue
            scored = []
            for g in groups:
                try:
                    scored.append((float(g.get("max_severity") or 0), g["ids"][0]))
                except (ValueError, KeyError, IndexError):
                    scored.append((0.0, g["ids"][0] if g.get("ids") else "unknown"))
            top, top_id = max(scored)
            sev = "Critical" if top >= 9 else "High" if top >= 7 else "Medium" if top >= 4 else "Low"
            p = pkg["package"]
            ids = ", ".join(i for _, i in sorted(scored, reverse=True)[:5])
            out.append({
                "scanner": "osv-scanner", "rule_id": top_id,
                "title": f'{p["name"]} {p["version"]} has {len(groups)} known vulnerabilities (max CVSS {top})',
                "description": f'{p["ecosystem"]} dependency; highest-severity advisories: {ids}',
                "severity": sev, "file_path": rel, "start_line": None, "end_line": None,
                "cwe_id": None, "excerpt": None,
            })
    return out
