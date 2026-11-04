import { useEffect } from "react";
import { Link } from "react-router-dom";

import { SCANNERS, SCANNER_LABEL, SEV_COLOR, SEV_ORDER, sevCounts, toolStatus } from "./util";

export function ScannerCoverage({ scan }) {
  return (
    <ul className="cov" aria-label="Scanner coverage">
      {SCANNERS.map((s) => {
        const t = toolStatus(scan.coverage?.tools[s]);
        return (
          <li key={s} className={`cov-${t.kind}`}>
            <span className="cov-name">{SCANNER_LABEL[s]}</span>
            <span className="cov-state"><i aria-hidden="true" />{t.label}</span>
            {t.detail && <span className="muted small">{t.detail}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export default function ScanSummary(props

) {
  const { scan, findings, fresh, onBegin } = props;
  const counts = sevCounts(findings);
  const ai = scan.coverage?.ai;
  const tools = scan.coverage?.tools ?? {};
  const incomplete = SCANNERS.filter((s) => toolStatus(tools[s]).kind !== "completed");
  const verCounts = findings.reduce((m, f) => ((m[f.evidence_status] = (m[f.evidence_status] ?? 0) + 1), m), {});

  // Brief completion transition: only when arriving straight from a live scan.
  useEffect(() => {
    if (!fresh || !findings.length) return;
    const t = window.setTimeout(onBegin, 3200);
    return () => clearTimeout(t);
  }, [fresh, findings.length, onBegin]);

  return (
    <div className="summary">
      <p className="eyebrow">Scan {scan.status === "COMPLETED" ? "complete" : scan.status.toLowerCase()}</p>
      <h1>{scan.repository_name}</h1>
      <p className="muted"><code title="Scan ID">{scan.id}</code></p>

      {scan.status === "FAILED" && <p className="callout" role="alert">The scan failed: {scan.error ?? "unknown error"}. No result here should be read as a clean bill of health.</p>}
      {scan.status === "PARTIAL" && (
        <p className="callout" role="alert">
          Partial scan. Some checks did not complete{incomplete.length ? ` (${incomplete.map((s) => SCANNER_LABEL[s]).join(", ")})` : ""}
          {typeof ai === "object" && ai.failed ? `; ${ai.failed} AI analyses failed` : ""}. This is not a clean result.
        </p>
      )}

      <div className="stats">
        <div><b>{findings.length}</b><span>findings</span></div>
        {SEV_ORDER.filter((s) => s !== "Info" || counts[s]).map((s) => (
          <div key={s} style={{ ["--c" ]: SEV_COLOR[s] }}><b>{counts[s] ?? 0}</b><span>{s}</span></div>
        ))}
        <div><b>{scan.coverage?.files?.total_files ?? "n/a"}</b><span>files inspected</span></div>
      </div>

      <div className="two">
        <div><h2>Scanner coverage</h2><ScannerCoverage scan={scan} /></div>
        <div>
          <h2>AI analysis &amp; verification</h2>
          <p>{typeof ai === "string" || !ai ? (findings.length === 0 ? "AI: nothing to analyse (no findings)" : `AI: ${ai ?? "not run"}`) : `${ai.analysed} analysed, ${ai.failed} failed, ${ai.skipped_over_limit} skipped`}</p>
          <p className="muted">
            {Object.entries(verCounts).map(([k, n]) => `${n} ${k.toLowerCase().replace("_", " ")}`).join(" · ") || "No findings to verify"}
          </p>
        </div>
      </div>

      {findings.length === 0 ? (
        <p className="callout neutral">
          No findings were reported by the tools that completed. This does not prove the code is secure: only the scanners marked Completed above ran, and
          scanners cover only the languages and rules they support.
        </p>
      ) : (
        <div className="row">
          <button className="cta" onClick={onBegin} autoFocus>Begin investigation →</button>
          {fresh && <span className="muted small" role="status">Opening the most severe finding…</span>}
        </div>
      )}
      <p><Link to={`/scans/${scan.id}?table=1`}>Table view</Link> · <Link to="/history">Scan history</Link></p>
    </div>
  );
}
