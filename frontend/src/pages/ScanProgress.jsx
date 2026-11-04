import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, } from "../api";
import { RUNNING, useLoad } from "../hooks";
import { SEV_ORDER, SCANNER_LABEL, STATE_LABEL, scannerStates, sevCounts } from "../investigation/util";
import OrbitMap, { } from "../three/OrbitMap";
import { pop } from "../motion";
import { ScannerList, SevBadge, StatusChip } from "../ui";

// What the server actually reports: one status per stage. Verification runs inside the AI stage.
const STEPS = ["Submit repository", "Run scanners", "Analyse findings", "Verify evidence", "View results"];
function stepStates(status) {
  const at = { QUEUED: 1, ACQUIRING: 1, DISCOVERING: 1, SCANNING: 1, AI_ANALYSIS: 2 };
  const i = at[status] ?? 5;
  return STEPS.map((_, k) => (k < i ? "done" : k === i || (status === "AI_ANALYSIS" && k === 3) ? "now" : "todo"));
}

export default function ScanProgress() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { data: scan, error } = useLoad(() => api.scan(id), [id], (s) => RUNNING.has(s.status));
  const [watched, setWatched] = useState(false);      // true once this page has seen the scan running
  const seenRunning = useRef(false);

  useEffect(() => {
    if (!scan) return;
    if (RUNNING.has(scan.status)) { seenRunning.current = true; setWatched(true); return; }
    // A scan opened after it finished goes straight to its results; one we watched shows a summary first.
    if (!seenRunning.current) nav(sp.has("table") ? `/findings?scan=${id}` : `/scans/${id}/investigate`, { replace: true });
  }, [scan, sp, id, nav]);

  const finished = !!scan && !RUNNING.has(scan.status);
  const { data: findings } = useLoad(() => (finished && watched ? api.findings(id) : Promise.resolve([])), [id, finished, watched]);

  if (error && !scan) return <p className="err" role="alert">Could not load scan: {error}</p>;
  if (!scan) return <div className="skel" style={{ height: 220 }} role="status" aria-label="Loading scan" />;
  if (finished && !watched) return <p className="muted" role="status">Opening results…</p>;

  const steps = stepStates(scan.status);
  const prep = ["QUEUED", "ACQUIRING", "DISCOVERING"].includes(scan.status);
  const final = scan.status === "COMPLETED" ? "completed" : scan.status === "PARTIAL" ? "partial" : scan.status === "FAILED" ? "failed" : null;
  const counts = sevCounts(findings ?? []);
  const toneOf = (st) => (st === "completed" ? "done" : st === "running" ? "running" : st === "failed" || st === "timeout" ? "failed" : "off");
  const aiState = scan.status === "AI_ANALYSIS" ? "running" : final === "completed" || final === "partial" ? "done" : final === "failed" ? "failed" : "off";
  const nodes = [
    ...scannerStates(scan).map((t, i) => ({ id: t.id, label: SCANNER_LABEL[t.id] ?? t.label, color: ({ failed: "#ff526b", timeout: "#ff526b", skipped: "#eac76a", completed: "#4cd5ad", running: "#559dff" } )[t.state] ?? "#75839c", ring: 1 , angle: [200, 340, 20, 160][i] ?? 90,
      state: toneOf(t.state), value: findings && finished ? findings.filter((f) => f.scanner === t.id).length : undefined })),
    { id: "ai", label: "AI analysis", color: aiState === "off" ? "#75839c" : "#9275ff", ring: 2, angle: 270, state: aiState },
  ];
  const [focus, setFocus] = useState(null);
  const picked = scannerStates(scan).find((t) => t.id === focus);
  const headline = prep ? "Fetching and inspecting the repository…" : scan.status === "SCANNING" ? "Running scanners…" : scan.status === "AI_ANALYSIS" ? "Analysing and verifying findings…"
    : final === "completed" ? "Scan complete." : final === "partial" ? "Scan finished with gaps." : "Scan failed.";

  return (
    <>
      <h1>{scan.repository_name}</h1>
      <p className="lede"><StatusChip status={scan.status} /> <span role="status">{headline}</span></p>
      <div className="livegrid">
        <div className="prog-map space">
          <OrbitMap ariaLabel={`Scan state: ${nodes.map((n) => `${n.label} ${n.state === "done" ? "completed" : n.state === "off" ? "waiting or skipped" : n.state}`).join(", ")}`}
            coreLabel="REPOSITORY" coreSub={scan.repository_name.split("/").pop()} activeId={focus} onSelect={(id) => setFocus((f) => (f === id ? null : id))} nodes={nodes} />
          <div className="prog-detail" aria-live="polite">
            {picked ? <><b>{picked.label}</b><p>{STATE_LABEL[picked.state]}{picked.detail ? `: ${picked.detail}` : ""}</p>{finished && <Link to={`/findings?scan=${id}&scanner=${picked.id}`}>Open its findings</Link>}</>
              : focus === "ai" ? <><b>AI analysis</b><p>{aiState === "running" ? "Running now. Explanations are being generated and checked against evidence." : aiState === "done" ? "Finished." : aiState === "failed" ? "Did not run because the scan failed." : "Not started yet."}</p></>
              : <p className="faint small">Select a node to see its state. A node is only marked complete when the server reports it.</p>}
          </div>
        </div>
        <div>
          <h2>Progress</h2>
          <ol className="steps" aria-label="Scan progress">
            {STEPS.map((s, i) => <li key={s} className={steps[i]} aria-current={steps[i] === "now" ? "step" : undefined}>{s}</li>)}
          </ol>
          {!finished && <div className="indet" role="progressbar" aria-label="Scan in progress, exact progress is not reported" style={{ margin: "14px 0 6px" }} />}
          {!finished && <p className="muted small">The server reports stages, not a percentage. <Link to="/history">Leave this page; the scan continues.</Link></p>}
          <h2 style={{ marginTop: 20 }}>Scanners</h2>
          <ScannerList scan={scan} />
        </div>
      </div>

      <AnimatePresence>
        {finished && (
          <motion.section className="panel" variants={pop} initial="hidden" animate="show" exit="exit" style={{ marginTop: 22 }} aria-labelledby="sumh">
            <h2 id="sumh" className="row" style={{ gap: 8 }}>
              {final === "completed" ? <CheckCircle2 size={18} className="t-completed" aria-hidden="true" /> : final === "partial" ? <AlertTriangle size={18} className="t-skipped" aria-hidden="true" /> : <XCircle size={18} className="t-failed" aria-hidden="true" />}
              {final === "completed" ? "Scan summary" : final === "partial" ? "Partial scan summary" : "Scan failed"}
            </h2>
            {final === "failed" ? (
              <p className="err" role="alert">{scan.error ?? "The scan did not finish."}</p>
            ) : (
              <>
                <p style={{ margin: "0 0 10px" }}><b>{scan.total_findings}</b> finding{scan.total_findings === 1 ? "" : "s"} reported.
                  {final === "partial" && " Some checks did not complete, so this list may be incomplete."}
                  {scan.total_findings === 0 && " This does not prove the code is secure; only the scanners marked Completed ran."}</p>
                {scan.total_findings > 0 && (
                  <div className="row" style={{ marginBottom: 12 }}>
                    {SEV_ORDER.filter((s) => counts[s]).map((s) => <span key={s} className="row small" style={{ gap: 6 }}><SevBadge severity={s} /> {counts[s]}</span>)}
                  </div>
                )}
              </>
            )}
            <div className="row">
              <Link className="btn" to={`/scans/${id}/investigate`}>Open Investigation <ArrowRight size={15} aria-hidden="true" /></Link>
              {final !== "failed" && <Link className="btn ghost" to={`/findings?scan=${id}`}>Explore Findings</Link>}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
