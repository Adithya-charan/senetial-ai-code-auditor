import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _id():
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class Scan(Base):
    __tablename__ = "scans"
    id: Mapped[uuid.UUID] = _id()
    repository_url: Mapped[str] = mapped_column(Text)
    repository_name: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="QUEUED")
    error: Mapped[str | None] = mapped_column(Text)
    # Honest coverage: which tools ran, which were skipped/failed, files seen.
    coverage: Mapped[dict | None] = mapped_column(JSONB)
    total_findings: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    findings: Mapped[list["Finding"]] = relationship(cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[uuid.UUID] = _id()
    scan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scans.id", ondelete="CASCADE"), index=True)
    scanner: Mapped[str] = mapped_column(String(32))
    rule_id: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(16), index=True)
    file_path: Mapped[str] = mapped_column(Text)
    start_line: Mapped[int | None] = mapped_column(Integer)
    end_line: Mapped[int | None] = mapped_column(Integer)
    cwe_id: Mapped[str | None] = mapped_column(String(16))
    excerpt: Mapped[str | None] = mapped_column(Text)
    evidence_status: Mapped[str] = mapped_column(String(24), default="NOT_EVALUATED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    analysis: Mapped["AiAnalysis | None"] = relationship(uselist=False, cascade="all, delete-orphan")


class AiAnalysis(Base):
    __tablename__ = "ai_analyses"
    id: Mapped[uuid.UUID] = _id()
    finding_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("findings.id", ondelete="CASCADE"), unique=True
    )
    model_name: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text)
    potential_impact: Mapped[str] = mapped_column(Text)
    remediation: Mapped[list] = mapped_column(JSONB)
    uncertainties: Mapped[list] = mapped_column(JSONB)
    unsupported_claims: Mapped[list] = mapped_column(JSONB)
    verification_status: Mapped[str] = mapped_column(String(24))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
