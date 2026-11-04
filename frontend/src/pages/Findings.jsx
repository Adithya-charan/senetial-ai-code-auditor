import { motion } from "framer-motion";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, } from "../api";
import { RUNNING, useLoad } from "../hooks";
import { VerificationBadge } from "../investigation/Panels";
import { SCANNER_LABEL, SCANNERS, SEV_ORDER, locationOf, sevRank, verifMeta } from "../investigation/util";
import { Counter } from "../motionui";
import { item, stagger } from "../motion";
import { fmtDate, SevBadge } from "../ui";
import ThreatField from "./ThreatField";

const PAGE = 20;

const sorters = {
  severity: (a, b) => sevRank(a.severity) - sevRank(b.severity),
  title: (a, b) => a.title.localeCompare(b.title),
  file: (a, b) => a.file_path.localeCompare(b.file_path),
  scanner: (a, b) => a.scanner.localeCompare(b.scanner),
  ver: (a, b) => verifMeta(a.evidence_status).label.localeCompare(verifMeta(b.evidence_status).label),
};

export default function Findings() {
  const [sp, setSp] = useSearchParams();
  const { data: scans, error: scansErr } = useLoad(api.scans, []);
  const done = useMemo(() => (scans ?? []).filter((s) => !RUNNING.has(s.status)), [scans]);
  const scanId = sp.get("scan") ?? (done.find((s) => s.total_findings > 0) ?? done[0])?.id ?? "";
  const { data: all, error } = useLoad(() => (scanId ? api.findings(scanId) : Promise.resolve([])), [scanId]);

  const sev = sp.get("sev") ?? "", scanner = sp.get("scanner") ?? "", ver = sp.get("ver") ?? "", q = sp.get("q") ?? "";
  const sort = (sp.get("sort") ) || "severity", dir = sp.get("dir") === "desc" ? -1 : 1;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const mode = sp.get("view") === "list" ? "list" : "map";
  const set = (patch, resetPage = true) =>
    setSp((p) => { const n = new URLSearchParams(p); if (resetPage) n.delete("page"); for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k); return n; }, { replace: true });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (all ?? [])
      .filter((f) => (!sev || f.severity === sev) && (!scanner || f.scanner === scanner) && (!ver || f.evidence_status === ver)
        && (!needle || `${f.title} ${f.file_path} ${f.rule_id}`.toLowerCase().includes(needle)))
      .sort((a, b) => dir * sorters[sort](a, b) || sevRank(a.severity) - sevRank(b.severity));
  }, [all, sev, scanner, ver, q, sort, dir]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE);
  const filtered = !!(sev || scanner || ver || q);
  const scan = scans?.find((s) => s.id === scanId);

  const Th = ({ k, children, cls }) => (
    <th className={cls} aria-sort={sort === k ? (dir === 1 ? "ascending" : "descending") : "none"}>
      <button onClick={() => set(sort === k ? { dir: dir === 1 ? "desc" : null } : { sort: k, dir: null })}>
        {children}{sort === k ? (dir === 1 ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );

  return (
    <>
      <h1 className="page-h1">Threat Intelligence</h1>
      <p className="lede">Explore detected vulnerabilities and investigate their evidence.</p>
      {scansErr && !scans && <p className="err" role="alert">Could not load scans: {scansErr}</p>}
      {scans && done.length === 0 && <div className="panel empty"><p>No completed scans yet.</p><Link className="btn" to="/new">New scan</Link></div>}

      {done.length > 0 && (
        <>
          <div className="ffilters">
            <label className="sr-only" htmlFor="scansel">Scan</label>
            <select id="scansel" value={scanId} onChange={(e) => set({ scan: e.target.value, sev: null, scanner: null, ver: null, q: null })}>
              {done.map((s) => <option key={s.id} value={s.id}>{s.repository_name} · {fmtDate(s.started_at)} · {s.total_findings}</option>)}
            </select>
            <input type="search" placeholder="Search findings" aria-label="Search findings" value={q} onChange={(e) => set({ q: e.target.value || null })} />
            <select aria-label="Severity" value={sev} onChange={(e) => set({ sev: e.target.value || null })}>
              <option value="">All severities</option>{SEV_ORDER.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select aria-label="Scanner" value={scanner} onChange={(e) => set({ scanner: e.target.value || null })}>
              <option value="">All scanners</option>{SCANNERS.map((s) => <option key={s} value={s}>{SCANNER_LABEL[s]}</option>)}
            </select>
            <select aria-label="Verification" value={ver} onChange={(e) => set({ ver: e.target.value || null })}>
              <option value="">All verification</option>
              {["SUPPORTED", "UNCERTAIN", "UNSUPPORTED", "SCANNER_CONFIRMED"].map((s) => <option key={s} value={s}>{verifMeta(s).label}</option>)}
            </select>
            {filtered && <button className="btn ghost" onClick={() => set({ sev: null, scanner: null, ver: null, q: null })}>Clear filters</button>}
          </div>
          <div className="vtoggle" role="group" aria-label="Presentation">
            <button aria-pressed={mode === "map"} className={mode === "map" ? "on" : ""} onClick={() => set({ view: null }, false)}>Threat map</button>
            <button aria-pressed={mode === "list"} className={mode === "list" ? "on" : ""} onClick={() => set({ view: "list" }, false)}>List</button>
          </div>
          {scan && scan.status === "PARTIAL" && <p className="muted small" role="status">This scan is partial: some checks did not complete, so the list may be incomplete.</p>}
          {error && !all && <p className="err" role="alert">Could not load findings: {error}</p>}
          {all && (
            <>
              <motion.div className="summarycards" variants={stagger} initial="hidden" animate="show" aria-label="Summary of this scan">
                {([["Total findings", all.length], ["Critical", all.filter((f) => f.severity === "Critical").length], ["High", all.filter((f) => f.severity === "High").length],
                  ["Medium", all.filter((f) => f.severity === "Medium").length], ["Low", all.filter((f) => f.severity === "Low").length],
                  ["AI verified", all.filter((f) => f.evidence_status === "SUPPORTED").length]] ).map(([l, n]) => (
                  <motion.div key={l} variants={item} className="panel"><b><Counter value={n} /></b><span>{l}</span></motion.div>
                ))}
              </motion.div>
              <p className="muted small" role="status">{rows.length} of {all.length} findings</p>
              {all.length === 0 ? (
                <div className="panel empty"><p>No findings were reported by the scanners that ran.</p><p className="small">That does not prove the code is secure.</p></div>
              ) : rows.length === 0 ? (
                <div className="panel empty"><p>No findings match these filters.</p></div>
              ) : mode === "map" ? (
                <ThreatField rows={rows} repoName={scan?.repository_name} />
              ) : (
                <div className="tablewrap">
                  <table>
                    <thead><tr>
                      <Th k="severity">Severity</Th><Th k="title">Finding</Th><Th k="file" cls="hide-sm">File or dependency</Th>
                      <Th k="scanner" cls="hide-sm">Scanner</Th><Th k="ver">Verification</Th><th className="hide-sm">Repository</th><th><span className="sr-only">Action</span></th>
                    </tr></thead>
                    <tbody>
                      {view.map((f) => {
                        const href = `/scans/${f.scan_id}/investigate?f=${f.id}`;
                        return (
                          <motion.tr key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                            <td><SevBadge severity={f.severity} /></td>
                            <td>
                              <Link className="ftitle" to={href}>{f.title.length > 140 ? f.title.slice(0, 139) + "…" : f.title}</Link>
                              <span className="fmeta"><code>{locationOf(f)}</code> · {SCANNER_LABEL[f.scanner] ?? f.scanner}{scan ? ` · ${scan.repository_name}` : ""}</span>
                            </td>
                            <td className="hide-sm"><code>{locationOf(f)}</code></td>
                            <td className="hide-sm">{SCANNER_LABEL[f.scanner] ?? f.scanner}</td>
                            <td className="vb"><VerificationBadge status={f.evidence_status} /></td>
                            <td className="hide-sm small muted">{scan ? `${scan.repository_name} · ${fmtDate(scan.started_at)}` : ""}</td>
                            <td><Link className="btn ghost" to={href} aria-label={`Investigate: ${f.title}`}>Investigate</Link></td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {mode === "list" && pages > 1 && (
                <div className="tpager">
                  <button className="btn ghost" disabled={page <= 1} onClick={() => set({ page: String(page - 1) }, false)}>← Previous</button>
                  <span className="muted small" role="status">Page {Math.min(page, pages)} of {pages}</span>
                  <button className="btn ghost" disabled={page >= pages} onClick={() => set({ page: String(page + 1) }, false)}>Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
