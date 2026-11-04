import logging
from datetime import datetime, timezone
from pathlib import Path

from . import ai, repository, scanner
from .config import settings
from .db import SessionLocal
from .models import AiAnalysis, Finding, Scan

log = logging.getLogger("sentinel")
MAX_AI_FINDINGS = 15  # bound cost/latency; the rest keep scanner evidence only


def run_scan(scan_id, enable_ai: bool) -> None:
    with SessionLocal() as db:
        scan = db.get(Scan, scan_id)
        coverage: dict = {"tools": {}, "ai": "disabled" if not enable_ai else "pending"}

        def setstatus(s: str):
            scan.status = s
            db.commit()

        try:
            with repository.make_workdir() as tmp:
                root = Path(tmp) / "repo"
                setstatus("ACQUIRING")
                repository.clone(scan.repository_url, root)
                setstatus("DISCOVERING")
                coverage["files"] = repository.discover(root)
                setstatus("SCANNING")
                findings: list[dict] = []
                py = coverage["files"]["python_files"]
                plan = [("bandit", scanner.run_bandit, py > 0, "no Python files"),
                        ("semgrep", scanner.run_semgrep, True, ""),
                        ("gitleaks", scanner.run_gitleaks, True, ""),
                        ("osv-scanner", scanner.run_osv, True, "")]
                for name, fn, applicable, why in plan:
                    if not applicable:
                        coverage["tools"][name] = f"skipped: {why}"
                        continue
                    try:
                        findings += fn(root)
                        coverage["tools"][name] = "completed"
                    except Exception as e:  # noqa: BLE001 - one tool must not sink the scan
                        log.warning("%s failed: %s", name, type(e).__name__)
                        coverage["tools"][name] = f"failed: {type(e).__name__}"
                before = len(findings)
                findings = scanner.correlate(findings)
                coverage["duplicates_merged"] = before - len(findings)
                rows = [Finding(scan_id=scan.id, **f) for f in findings]
                db.add_all(rows)
                db.commit()

                partial = any(v.startswith("failed") for v in coverage["tools"].values())
                if enable_ai and rows:
                    setstatus("AI_ANALYSIS")
                    done = failed = 0
                    for row, f in list(zip(rows, findings))[:MAX_AI_FINDINGS]:
                        try:
                            res, status, unsupported = ai.analyse(f)
                        except RuntimeError as e:
                            failed += 1
                            log.warning("ai failed for finding: %s", e)
                            continue
                        row.evidence_status = status
                        row.analysis = AiAnalysis(
                            model_name=settings.groq_model, summary=res.summary,
                            potential_impact=res.potential_impact, remediation=res.remediation,
                            uncertainties=res.uncertainties, unsupported_claims=unsupported,
                            verification_status=status)
                        done += 1
                        db.commit()
                    coverage["ai"] = {"analysed": done, "failed": failed,
                                      "skipped_over_limit": max(0, len(rows) - MAX_AI_FINDINGS)}
                    partial = partial or failed > 0
                # Scanner-reported findings stay scanner-confirmed if AI is off or failed.
                for row in rows:
                    if row.evidence_status == "NOT_EVALUATED":
                        row.evidence_status = "SCANNER_CONFIRMED"
                scan.total_findings = len(rows)
                scan.coverage = coverage
                scan.status = "PARTIAL" if partial else "COMPLETED"
        except repository.IntakeError as e:
            scan.status, scan.error, scan.coverage = "FAILED", str(e), coverage
        except Exception:  # noqa: BLE001 - never leak internals to the client
            log.exception("scan failed")
            scan.status, scan.error, scan.coverage = "FAILED", "Internal error during scan.", coverage
        scan.completed_at = datetime.now(timezone.utc)
        db.commit()
