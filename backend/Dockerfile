FROM python:3.12-slim

ARG GITLEAKS_VERSION=8.24.2
ARG OSV_SCANNER_VERSION=2.0.2

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Scanners that are not pip packages. Pinned so builds are repeatable.
RUN curl -fsSL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" \
      | tar -xz -C /usr/local/bin gitleaks \
 && curl -fsSL -o /usr/local/bin/osv-scanner \
      "https://github.com/google/osv-scanner/releases/download/v${OSV_SCANNER_VERSION}/osv-scanner_linux_amd64" \
 && chmod +x /usr/local/bin/osv-scanner

# Semgrep pins older OpenTelemetry versions than FastAPI needs, so it gets its own virtualenv.
ARG SEMGREP_VERSION=1.183.0
RUN python -m venv /opt/semgrep  && /opt/semgrep/bin/pip install --no-cache-dir "semgrep==${SEMGREP_VERSION}"  && ln -s /opt/semgrep/bin/semgrep /usr/local/bin/semgrep

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a non-root user: scanned repositories are untrusted input.
RUN useradd --create-home sentinel && chown -R sentinel /app
USER sentinel

ENV PORT=8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
