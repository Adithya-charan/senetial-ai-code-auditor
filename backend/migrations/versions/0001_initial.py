"""initial schema

Replaces the placeholder scans/findings/ai_analyses tables created by the earlier
Node scaffold (verified empty) with the SENTINEL schema.
"""
from alembic import op

from app import models  # noqa: F401
from app.db import Base

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    for t in ("ai_analyses", "findings", "scans"):
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
    Base.metadata.create_all(bind)


def downgrade() -> None:
    for t in ("ai_analyses", "findings", "scans"):
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
