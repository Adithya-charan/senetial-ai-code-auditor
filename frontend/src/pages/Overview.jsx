import { motion } from "framer-motion";
import { ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import OrbitMap from "../three/OrbitMap";
import { api, } from "../api";
import { RUNNING, useLoad } from "../hooks";
import { VerificationBadge } from "../investigation/Panels";
import { basename, parseOsv, SCANNER_LABEL, SCANNERS, SEV_ORDER, scannerStates, sevCounts, STATE_LABEL, verifMeta } from "../investigation/util";
import { item, stagger } from "../motion";
import { Counter } from "../motionui";
import { CoverageSummary, fmtDate, SevBadge, StatusChip } from "../ui";

const VERIFS = ["SUPPORTED", "SCANNER_CONFIRMED", "UNCERTAIN", "UNSUPPORTED"];
const VERIF_NOTE = {
  SUPPORTED: "The AI explanation cites evidence the scanner reported.",
  SCANNER_CONFIRMED: "Reported by a scanner; no AI claim was checked.",
  UNCERTAIN: "The AI flagged what it could not establish.",
  UNSUPPORTED: "The AI cited something the evidence does not contain.",
};
const SEV_VAR = { Critical: "var(--critical)", High: "var(--high)", Medium: "var(--medium)", Low: "var(--low)", Info: "var(--faint)" };
const VERIF_VAR = { SUPPORTED: "var(--verified)", SCANNER_CONFIRMED: "var(--blue)", UNCERTAIN: "var(--medium)", UNSUPPORTED: "var(--critical)" };

/** Segmented ring. Arc lengths come from real counts; the legend beside it says the same in words. */
function Ring({ parts, total, label }) {
  const R = 86, GAP = total > 1 ? 1.2 : 0;
  let start = 0;
  return (
    <div className="pring" role="img" aria-label={label}>
      <svg viewBox="0 0 220 220" aria-hidden="true">
        <circle cx="110" cy="110" r={R} className="pring-track" pathLength={100} />
        {parts.filter((p) => p.n > 0).map((p) => {
          const len = Math.max(0.8, (p.n / Math.max(1, total)) * 100 - GAP), at = start;
          start += (p.n / Math.max(1, total)) * 100;
          return (
            <motion.circle key={p.id} cx="110" cy="110" r={R} pathLength={100} className="pring-seg" stroke={p.color}
              strokeDashoffset={-at} initial={{ strokeDasharray: "0 100" }} animate={{ strokeDasharray: `${len} ${100 - len}` }} transition={{ duration: 0.9, ease: "easeOut" }} />
          );
        })}
      </svg>
      <div className="pring-c"><strong><Counter value={total} /></strong><span>findings</span></div>
    </div>
  );
}

function resourceOf(f) {
  const osv = f.scanner === "osv-scanner" ? parseOsv(f) : null;
  return osv ? `${osv.name} ${osv.version}` : `${basename(f.file_path)}${f.start_line ? `:${f.start_line}` : ""}`;
}

export default function Overview() {
  const { data: scans, error } = useLoad(api.scans, []);
  const nav = useNavigate();
  const [picked, setPicked] = useState("");
  const [orbitHover, setOrbitHover] = useState(null);
  const done = (scans ?? []).filter((s) => !RUNNING.has(s.status));
  const focus = done.find((s) => s.id === picked) ?? done.find((s) => s.total_findings > 0) ?? done[0];
  // Tag the result with its scan so a previous scan's findings are never shown while the new ones load.
  const { data: loaded } = useLoad(() => (focus ? api.findings(focus.id).then((list) => ({ id: focus.id, list })) : Promise.resolve(null)), [focus?.id]);
  const findings = loaded && loaded.id === focus?.id ? loaded.list : null;
  const list = findings ?? [];
  const counts = sevCounts(list);
  const vCounts = Object.fromEntries(VERIFS.map((v) => [v, list.filter((f) => f.evidence_status === v).length]));
  const critical = list.filter((f) => f.severity === "Critical").slice(0, 5);
  const tools = focus ? scannerStates(focus) : [];
  const toolsDone = tools.filter((t) => t.state === "completed").length;
  const totalFindings = scans?.reduce((n, s) => n + s.total_findings, 0) ?? 0;
  const sevParts = SEV_ORDER.filter((s) => s !== "Info" || counts[s]).map((s) => ({ id: s, n: counts[s] ?? 0, color: SEV_VAR[s] }));
  const verParts = VERIFS.map((v) => ({ id: v, n: vCounts[v] ?? 0, color: VERIF_VAR[v] }));

  const base = focus ? `/findings?scan=${focus.id}` : "/findings";
  const metrics = [
    { id: "scans", label: "Total scans", value: scans?.length ?? 0, hint: `${done.length} finished · open scan history`, to: "/history", color: "#a8b5cc", ring: 1  },
    { id: "findings", label: "Total findings", value: totalFindings, hint: "across all scans · open the findings explorer", to: base, color: "#559dff", ring: 2  },
    { id: "critical", label: "Critical", value: findings ? counts.Critical ?? 0 : 0, hint: "filter findings to Critical", to: `${base}&sev=Critical`, color: "#ff526b", ring: 1  },
    { id: "high", label: "High", value: findings ? counts.High ?? 0 : 0, hint: "filter findings to High", to: `${base}&sev=High`, color: "#ff9c57", ring: 2  },
    { id: "coverage", label: "Scanner coverage", value: `${toolsDone}/${SCANNERS.length}`, hint: "scanners completed · jump to scanner status", to: "#coverage", color: "#4cd5ad", ring: 1  },
  ];
  const go = (id) => {
    if (id === "coverage") { document.getElementById("coverage")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const m = metrics.find((x) => x.id === id);
    if (m) nav(m.to);
  };

  return (
    <>
      <header className="ov-head">
        <div>
          <h1>Security Command Centre</h1>
          <p className="lede">Monitor your repository security, scanner activity and investigation priorities.</p>
        </div>
        <div className="ov-tools">
          {focus && (
            <>
              <label className="sr-only" htmlFor="focus">Scan to analyse</label>
              <select id="focus" value={focus.id} onChange={(e) => setPicked(e.target.value)}>
                {done.map((s) => <option key={s.id} value={s.id}>{s.repository_name} · {fmtDate(s.started_at)}</option>)}
              </select>
            </>
          )}
          <Link className="btn" to="/new"><Plus size={15} aria-hidden="true" />New Security Scan</Link>
        </div>
      </header>

      {error && !scans && <p className="err" role="alert">Could not reach the API: {error}. The backend may not be running.</p>}
      {!scans && !error && <div className="skel" style={{ height: 320 }} role="status" aria-label="Loading overview" />}

      {scans?.length === 0 && (
        <div className="empty"><ShieldCheck size={28} aria-hidden="true" /><p><strong>No scans yet.</strong></p><p>Scan a GitHub repository to see its findings and evidence here.</p><Link className="btn" to="/new">Start a scan</Link></div>
      )}

      {!!scans?.length && focus && (
        <>
          <section className="station space" aria-label="Security core">
            <div className="station-map">
              <OrbitMap ariaLabel="Security core: select a metric to explore it" coreLabel="SENTINEL" coreSub={focus.repository_name.split("/").pop()} activeId={orbitHover} onHover={setOrbitHover} onSelect={(id) => go(id)}
                nodes={metrics.map((m, i) => ({ id: m.id, label: m.label, value: m.value, color: m.color, ring: m.ring, angle: [210, 330, 270, 30, 150][i] }))} />
            </div>
            <ul className="metric-links" aria-label="Totals">
              {metrics.map((m) => (
                <li key={m.id}>
                  <Link to={m.to} onClick={m.id === "coverage" ? (e) => { e.preventDefault(); go("coverage"); } : undefined} className={orbitHover === m.id ? "hot" : ""} onPointerEnter={() => setOrbitHover(m.id)} onPointerLeave={() => setOrbitHover(null)}>
                    <b style={{ color: m.color }}>{m.value}</b><span><strong>{m.label}</strong><small>{m.hint}</small></span><ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="posture" aria-labelledby="post">
            <div className="posture-main">
              <p className="posture-for">Posture for <b>{focus.repository_name}</b></p>
              <h2 id="post">How well the findings are backed by evidence</h2>
              {!findings ? <div className="skel" style={{ height: 220 }} role="status" aria-label="Loading findings" /> : list.length === 0 ? (
                <p className="muted">This scan reported no findings from the scanners that completed. That does not prove the code is secure.</p>
              ) : (
                <div className="posture-body">
                  <Ring parts={verParts} total={list.length} label={verParts.map((p) => `${p.n} ${verifMeta(p.id).label}`).join(", ")} />
                  <ul className="vlist">
                    {VERIFS.map((v) => (
                      <li key={v}><Link to={`${base}&ver=${v}`} className="vlink"><i style={{ background: VERIF_VAR[v] }} aria-hidden="true" /><span className="vn">{verifMeta(v).label}</span><b>{vCounts[v] ?? 0}</b><span className="vnote">{VERIF_NOTE[v]}</span></Link></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="sevcol" aria-label="Severity">
              <h2>Severity</h2>
              {!findings ? <div className="skel" style={{ height: 180 }} /> : (
                <>
                  <ul className="sevbig">
                    {sevParts.map((p) => (
                      <li key={p.id} className={p.id === "Critical" ? "lead" : ""} style={{ color: p.color }}>
                        <Link to={`${base}&sev=${p.id}`} className="slink" aria-label={`${p.n} ${p.id} findings, open filtered list`}><span className="num"><Counter value={p.n} /></span><span><SevBadge severity={p.id} /></span></Link>
                      </li>
                    ))}
                  </ul>
                  <div className="sevbar" role="img" aria-label={sevParts.map((p) => `${p.n} ${p.id}`).join(", ")}>
                    {sevParts.filter((p) => p.n > 0).map((p) => <motion.i key={p.id} style={{ background: p.color }} initial={{ width: 0 }} animate={{ width: `${(p.n / Math.max(1, list.length)) * 100}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />)}
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="ov-sec" id="coverage" aria-labelledby="mon">
            <h2 id="mon">Scanner constellation</h2>
            <ul className="pipe">
              {tools.map((t, i) => (
                <li key={t.id} className={`t-${t.state}`} style={{ ["--i" ]: i }}>
                  <Link to={`${base}&scanner=${t.id}`} className="pipe-link" aria-label={`${t.label}: ${STATE_LABEL[t.state]}. Open its findings`}>
                    <span className="pipe-dot"><i className="st-dot" aria-hidden="true" /></span>
                    <strong>{t.label}</strong>
                    <span className="pipe-state">{STATE_LABEL[t.state]}</span>
                    <span className="faint mono">{findings ? list.filter((f) => f.scanner === t.id).length : "–"} findings</span>
                    {t.detail && <span className="faint small det">{t.detail}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {findings && list.length > 0 && (
            <section className="ov-sec" aria-labelledby="crit">
              <h2 id="crit">Needs attention <span className="faint">· critical findings</span></h2>
              {critical.length === 0 ? <p className="muted small">No critical findings in this scan.</p> : (
                <motion.ul className="rows crit-rows" variants={stagger} initial="hidden" animate="show">
                  {critical.map((f) => (
                    <motion.li key={f.id} variants={item}>
                      <Link to={`/scans/${f.scan_id}/investigate?f=${f.id}`}>
                        <SevBadge severity={f.severity} />
                        <span className="r-title">{f.title.length > 110 ? f.title.slice(0, 109) + "…" : f.title}<span className="r-res mono">{resourceOf(f)}</span></span>
                        <span className="faint small r-sc">{SCANNER_LABEL[f.scanner] ?? f.scanner}</span>
                        <VerificationBadge status={f.evidence_status} />
                        <span className="r-go">Investigate <ArrowRight size={13} aria-hidden="true" /></span>
                      </Link>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </section>
          )}

          <section className="ov-sec" aria-labelledby="recent">
            <h2 id="recent">Recent scans</h2>
            <ul className="timeline">
              {scans.slice(0, 7).map((s) => (
                <li key={s.id} className={`tl-${s.status}`}>
                  <Link to={RUNNING.has(s.status) ? `/scans/${s.id}` : `/scans/${s.id}/investigate`} aria-label={`Open ${s.repository_name} scan`}>
                    <span className="tl-dot" aria-hidden="true" />
                    <span className="r-title">{s.repository_name}<span className="r-res faint small"><CoverageSummary scan={s} /></span></span>
                    <StatusChip status={s.status} />
                    <span className="r-n"><b>{s.total_findings}</b> <span className="faint small">findings</span></span>
                    <span className="faint small r-date">{fmtDate(s.started_at)}</span>
                    <span className="r-go">Open <ArrowRight size={13} aria-hidden="true" /></span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="small"><Link to="/history">All scans</Link> · <Link to="/findings">Browse findings</Link></p>
          </section>
        </>
      )}
    </>
  );
}
