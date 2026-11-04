from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # .env.local is written by `neon deploy`; backend/.env holds the other secrets.
    model_config = SettingsConfigDict(
        env_file=(ROOT / ".env.local", ROOT / "backend" / ".env"), extra="ignore"
    )
    database_url: str
    database_url_unpooled: str | None = None
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-120b"
    cors_origins: str = "http://localhost:5173"
    max_repo_files: int = 10000
    clone_timeout_seconds: int = 120
    scan_timeout_seconds: int = 300

    @property
    def sqlalchemy_url(self) -> str:
        return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    @property
    def migration_url(self) -> str:
        url = self.database_url_unpooled or self.database_url
        return url.replace("postgresql://", "postgresql+psycopg://", 1)


settings = Settings()
