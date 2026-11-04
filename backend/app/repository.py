"""Safe repository intake. Never executes repository code."""
import os
import re
import subprocess
import tempfile
from pathlib import Path

from .config import settings

# Only github.com https URLs: a fixed host means no SSRF to internal addresses.
GITHUB_RE = re.compile(r"^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$")


class IntakeError(Exception):
    pass


def parse_github_url(url: str) -> tuple[str, str]:
    m = GITHUB_RE.match(url.strip())
    if not m or m.group(1) in (".", "..") or m.group(2) in (".", ".."):
        raise IntakeError("Only public https://github.com/<owner>/<repo> URLs are supported.")
    return m.group(1), m.group(2)


def clone(url: str, dest: Path) -> None:
    owner, repo = parse_github_url(url)
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    try:
        subprocess.run(
            ["git", "-c", "core.symlinks=false", "clone", "--depth", "1", "--no-tags", "--",
             f"https://github.com/{owner}/{repo}.git", str(dest)],
            check=True, capture_output=True, encoding="utf-8", errors="replace", env=env,
            timeout=settings.clone_timeout_seconds,
        )
    except subprocess.TimeoutExpired as e:
        raise IntakeError("Repository clone timed out.") from e
    except subprocess.CalledProcessError as e:
        raise IntakeError("Could not clone repository (is it public?).") from e


def make_workdir() -> tempfile.TemporaryDirectory:
    return tempfile.TemporaryDirectory(prefix="sentinel-", ignore_cleanup_errors=True)


def discover(root: Path) -> dict:
    counts: dict[str, int] = {}
    total = 0
    for p in root.rglob("*"):
        if ".git" in p.parts or p.is_symlink() or not p.is_file():
            continue
        total += 1
        if total > settings.max_repo_files:
            raise IntakeError("Repository exceeds the file limit.")
        ext = p.suffix.lower() or "(none)"
        counts[ext] = counts.get(ext, 0) + 1
    return {"total_files": total, "python_files": counts.get(".py", 0), "by_extension": counts}
