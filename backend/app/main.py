import uuid

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from . import pipeline, repository
from .config import settings
from .db import get_db
from .models import Finding, Scan

app = FastAPI(title="SENTINEL")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip().rstrip("/") for o in settings.cors_origins.split(",") if o.strip()],
                   allow_methods=["GET", "POST"], allow_headers=["content-type"])


class ScanIn(BaseModel):
    repository_url: str
    enable_ai_analysis: bool = True


def scan_out(s: Scan) -> dict:
    return {"id": s.id, "repository_url": s.repository_url, "repository_name": s.repository_name,
            "status": s.status, "error": s.error, "coverage": s.coverage,
            "total_findings": s.total_findings, "started_at": s.started_at,
            "completed_at": s.completed_at}


def finding_out(f: Finding, detail: bool = False) -> dict:
    d = {"id": f.id, "scan_id": f.scan_id, "scanner": f.scanner, "rule_id": f.rule_id,
         "title": f.title, "severity": f.severity, "file_path": f.file_path,
         "start_line": f.start_line, "end_line": f.end_line, "cwe_id": f.cwe_id,
         "evidence_status": f.evidence_status}
    if detail:
        d |= {"description": f.description, "excerpt": f.excerpt, "ai_analysis": None}
        if f.analysis:
            a = f.analysis
            d["ai_analysis"] = {
                "label": "AI-generated, advisory", "model": a.model_name, "summary": a.summary,
                "potential_impact": a.potential_impact, "remediation": a.remediation,
                "uncertainties": a.uncertainties, "unsupported_claims": a.unsupported_claims,
                "verification_status": a.verification_status}
    return d


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}


@app.post("/api/scans", status_code=202)
def create_scan(body: ScanIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        owner, repo = repository.parse_github_url(body.repository_url)
    except repository.IntakeError as e:
        raise HTTPException(422, str(e)) from e
    scan = Scan(repository_url=f"https://github.com/{owner}/{repo}",
                repository_name=f"{owner}/{repo}")
    db.add(scan)
    db.commit()
    bg.add_task(pipeline.run_scan, scan.id, body.enable_ai_analysis)
    return scan_out(scan)


@app.get("/api/scans")
def list_scans(db: Session = Depends(get_db)):
    rows = db.scalars(select(Scan).order_by(Scan.started_at.desc()).limit(50))
    return [scan_out(s) for s in rows]


@app.get("/api/scans/{scan_id}")
def get_scan(scan_id: uuid.UUID, db: Session = Depends(get_db)):
    s = db.get(Scan, scan_id)
    if not s:
        raise HTTPException(404, "Scan not found")
    return scan_out(s)


@app.get("/api/scans/{scan_id}/findings")
def scan_findings(scan_id: uuid.UUID, severity: str | None = None, db: Session = Depends(get_db)):
    q = select(Finding).where(Finding.scan_id == scan_id).order_by(Finding.severity, Finding.file_path)
    if severity:
        q = q.where(Finding.severity == severity)
    return [finding_out(f) for f in db.scalars(q.limit(500))]


@app.get("/api/findings/{finding_id}")
def get_finding(finding_id: uuid.UUID, db: Session = Depends(get_db)):
    f = db.scalar(select(Finding).where(Finding.id == finding_id)
                  .options(selectinload(Finding.analysis)))
    if not f:
        raise HTTPException(404, "Finding not found")
    return finding_out(f, detail=True)
