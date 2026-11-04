import { lazy, Suspense } from "react";

import { RUNNING } from "./hooks";
import { SEV_ICON, SCANNERS, SCANNER_LABEL, STATE_LABEL, scannerStates, toolStatus } from "./investigation/util";


const Stage3D = lazy(() => import("./three/Stage3D"));
export { Stage3D };
export const LazyStage = (p) => (
  <Suspense fallback={<div className="stage3d" style={{ height: p.height ?? 260 }} aria-label={p.label} role="img" />}>
    <Stage3D {...p} />
  </Suspense>
);

/** Severity is always icon + text, never colour alone. */
export const SevBadge = ({ severity }) => (
  <span className={`sevb ${severity}`}><b aria-hidden="true">{SEV_ICON[severity] ?? "•"}</b>{severity}</span>
);

export const StatusChip = ({ status }) => (
  <span className={`pill s-${status}`}>{status.toLowerCase().replace("_", " ")}</span>
);

export const fmtDate = (s) => new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** "3 of 4 scanners completed" computed from stored coverage; unknown while a scan is still running. */
export function CoverageSummary({ scan }) {
  if (!scan.coverage?.tools) return <span className="muted">{RUNNING.has(scan.status) ? "In progress" : "Not recorded"}</span>;
  const kinds = SCANNERS.map((s) => toolStatus(scan.coverage.tools[s]).kind);
  const done = kinds.filter((k) => k === "completed").length;
  return (
    <span title={SCANNERS.map((s, i) => `${SCANNER_LABEL[s]}: ${kinds[i]}`).join(", ")}>
      <span className="cov-dots" aria-hidden="true">
        {kinds.map((k, i) => <i key={i} className={k === "completed" ? "t-completed" : k === "failed" || k === "timeout" ? "t-failed" : "t-skipped"} />)}
      </span>{" "}{done} of {SCANNERS.length} scanners completed
    </span>
  );
}

export function ScannerList({ scan }) {
  return (
    <ul className="scanlist" aria-label="Scanner status">
      {scannerStates(scan).map((s) => (
        <li key={s.id}>
          <strong style={{ minWidth: 104 }}>{s.label}</strong>
          <span className={`t-${s.state}`}><i className="st-dot" aria-hidden="true" /> {STATE_LABEL[s.state]}</span>
          {s.detail && <span className="muted small">{s.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

export const indicatorsOf = (scan) => scannerStates(scan).map((s) => ({ id: s.id, state: s.state }));
