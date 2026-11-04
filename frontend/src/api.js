// In production the API lives on another origin (Render); set VITE_API_URL there.
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function req(path, init) {
  const r = await fetch(BASE + path, init);
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${r.status})`);
  }
  return r.json();
}

export const api = {
  health: () => req("/api/health"),
  createScan: (repository_url, enable_ai_analysis) =>
    req("/api/scans", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ repository_url, enable_ai_analysis }),
    }),
  scans: () => req("/api/scans"),
  scan: (id) => req(`/api/scans/${id}`),
  findings: (id) => req(`/api/scans/${id}/findings`),
  finding: (id) => req(`/api/findings/${id}`),
};
