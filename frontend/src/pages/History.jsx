import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { RUNNING, useLoad } from "../hooks";
import { CoverageSummary, fmtDate, StatusChip } from "../ui";

const STATUSES = ["COMPLETED", "PARTIAL", "FAILED"];

export default function History() {
  const { data, error } = useLoad(api.scans, [], (s) => s.some((x) => RUNNING.has(x.status)));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [repo, setRepo] = useState("");
  const repos = useMemo(() => [...new Set((data ?? []).map((s) => s.repository_name))].sort(), [data]);
  const rows = useMemo(() => (data ?? []).filter((s) =>
    (!status || (status === "RUNNING" ? RUNNING.has(s.status) : s.status === status)) && (!repo || s.repository_name === repo) &&
    (!q.trim() || s.repository_name.toLowerCase().includes(q.trim().toLowerCase()))), [data, q, status, repo]);

  return (
    <>
      <h1 className="page-h1">Scan History</h1>
      <p className="lede">Every scan stored in the database, newest first. Open one to continue its investigation.</p>
      {error && !data && <p className="err" role="alert">Could not load scans: {error}</p>}
      {!data && !error && <div className="skel" style={{ height: 200 }} role="status" aria-label="Loading scans" />}
      {data?.length === 0 && <div className="panel empty"><p>No scans yet.</p><Link className="btn" to="/new">Launch a scan</Link></div>}
      {!!data?.length && (
        <>
          <div className="ffilters">
            <label className="hsearch"><Search size={14} aria-hidden="true" /><input type="search" placeholder="Search repositories" aria-label="Search repositories" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            <select aria-label="Repository" value={repo} onChange={(e) => setRepo(e.target.value)}><option value="">All repositories</option>{repos.map((r) => <option key={r}>{r}</option>)}</select>
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>{[...STATUSES, "RUNNING"].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
            </select>
            {(q || status || repo) && <button className="btn ghost" onClick={() => { setQ(""); setStatus(""); setRepo(""); }}>Clear filters</button>}
          </div>
          <p className="muted small" role="status">{rows.length} of {data.length} scans</p>
          {rows.length === 0 ? <div className="panel empty"><p>No scans match these filters.</p></div> : (
            <ol className="archive">
              {rows.map((s) => (
                <li key={s.id} className={`tl-${s.status}`}>
                  <Link to={RUNNING.has(s.status) ? `/scans/${s.id}` : `/scans/${s.id}/investigate`} aria-label={`${s.repository_name}, ${s.status.toLowerCase()}, ${s.total_findings} findings. ${RUNNING.has(s.status) ? "View progress" : "Open investigation"}`}>
                    <span className="tl-dot" aria-hidden="true" />
                    <span className="ar-main"><b>{s.repository_name}</b><span className="faint small">{fmtDate(s.started_at)}</span>{s.error && <span className="err small">{s.error}</span>}</span>
                    <StatusChip status={s.status} />
                    <span className="ar-n"><b>{s.total_findings}</b><span className="faint small">findings</span></span>
                    <span className="ar-cov small"><CoverageSummary scan={s} /></span>
                    <span className="r-go">{RUNNING.has(s.status) ? "View progress" : s.status === "FAILED" ? "Details" : "Investigate"} <ArrowRight size={13} aria-hidden="true" /></span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </>
  );
}
