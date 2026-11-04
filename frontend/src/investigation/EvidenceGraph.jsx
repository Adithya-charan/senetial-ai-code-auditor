import { motion } from "framer-motion";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { VerificationBadge } from "./Panels";
import { SCANNER_LABEL, SEV_COLOR, parseOsv, verifMeta } from "./util";




const NW = 172, NH = 62, NH_LG = 80, GAP_X = 54, GAP_Y = 16, PAD = 24;

/** Builds only the relationships the finding's own data supports. Nothing is added that the data does not state. */
function buildGraph(f, repo) {
  const osv = f.scanner === "osv-scanner" ? parseOsv(f) : null;
  const a = f.ai_analysis;
  const v = verifMeta(f.evidence_status);
  const sev = SEV_COLOR[f.severity] ?? "#A1AABC";
  const nodes = [];
  const edges = [];
  if (repo) nodes.push({ id: "repo", type: "Repository", color: "#A1AABC", title: "Repository", summary: repo, body: <p><code>{repo}</code> is the repository this scan analysed.</p> });
  nodes.push({ id: "file", type: osv ? "Manifest" : "File", color: "#6FA5ED", title: osv ? "Manifest" : "Source file", summary: f.file_path,
    body: <p><code>{f.file_path}</code>{!osv && (f.start_line ? <>, line {f.start_line}{f.end_line && f.end_line > f.start_line ? `–${f.end_line}` : ""}</> : ", no line reported")}.</p> });
  nodes.push(osv
    ? { id: "vuln", type: "Vulnerable dependency", color: sev, size: "lg", title: "Vulnerable package", summary: `${osv.name} ${osv.version}`,
        body: <p><code>{osv.name}</code> version <code>{osv.version}</code>{osv.ecosystem ? <> ({osv.ecosystem})</> : null} has {osv.count} known vulnerabilit{osv.count === 1 ? "y" : "ies"}, highest CVSS {osv.cvss}. Severity: {f.severity}.</p> }
    : { id: "vuln", type: "Vulnerable code", color: sev, size: "lg", title: "Vulnerable code", summary: f.title,
        body: <p>{f.title}{f.cwe_id && <> · <code>{f.cwe_id}</code></>}. Severity: {f.severity}.</p> });
  nodes.push({ id: "evidence", type: "Scanner evidence", color: "#53C8D8", title: "Scanner evidence", summary: `${SCANNER_LABEL[f.scanner] ?? f.scanner} · ${f.rule_id}`,
    body: <p>{SCANNER_LABEL[f.scanner] ?? f.scanner} reported rule <code>{f.rule_id}</code>. {f.description}</p> });
  if (repo) edges.push({ from: "repo", to: "file", label: "contains" });
  edges.push({ from: "file", to: "vuln", label: osv ? "declares" : "contains" });
  edges.push({ from: "vuln", to: "evidence", label: "reported by" });
  if (osv?.ids.length) {
    nodes.push({ id: "adv", type: "Advisories", color: "#8B7CFF", title: "Advisories", summary: `${osv.ids.length} identifier${osv.ids.length === 1 ? "" : "s"}`,
      body: <p>{osv.ids.map((i) => <code key={i} className="chip">{i}</code>)}</p> });
    edges.push({ from: "vuln", to: "adv", label: "described in" });
  }
  if (a) {
    nodes.push({ id: "impact", type: "Potential impact", color: v.color, title: "Potential impact", summary: v.label, ai: true,
      body: <><p><VerificationBadge status={f.evidence_status} /></p><p>{a.potential_impact}</p><p className="muted small">AI-generated and not confirmed by the scanner. {v.explain}</p></> });
    edges.push({ from: "vuln", to: "impact", label: "may cause", ai: true });
    if (a.remediation.length) {
      nodes.push({ id: "fix", type: "Remediation", color: f.evidence_status === "UNSUPPORTED" ? "#68748B" : "#8B7CFF", title: "Remediation", ai: true,
        summary: `${a.remediation.length} AI-suggested step${a.remediation.length === 1 ? "" : "s"}`,
        body: <><ol>{a.remediation.map((r, i) => <li key={i}>{r}</li>)}</ol><p className="muted small">AI-suggested, not applied or tested.</p></> });
      edges.push({ from: "vuln", to: "fix", label: "fixed by", ai: true });
    }
  }
  return { nodes, edges };
}

/** Layered layout: a node sits one column right of its deepest parent; nodes in a column stack and are centred together. */
function layout(nodes, edges) {
  const depth = {};
  nodes.forEach((n) => (depth[n.id] = 0));
  for (let pass = 0; pass < nodes.length; pass++) for (const e of edges) depth[e.to] = Math.max(depth[e.to], depth[e.from] + 1);
  const layers = Math.max(...Object.values(depth)) + 1;
  const cols = Array.from({ length: layers }, () => []);
  nodes.forEach((n) => cols[depth[n.id]].push(n));
  const h = (n) => (n.size === "lg" ? NH_LG : NH);
  const colH = cols.map((c) => c.reduce((s, n) => s + h(n), 0) + GAP_Y * Math.max(0, c.length - 1));
  const H = Math.max(...colH) + PAD * 2;
  const W = layers * NW + (layers - 1) * GAP_X + PAD * 2;
  const pos = {};
  cols.forEach((c, ci) => {
    let y = (H - colH[ci]) / 2;
    c.forEach((n) => { pos[n.id] = { x: PAD + ci * (NW + GAP_X), y, h: h(n) }; y += h(n) + GAP_Y; });
  });
  return { pos, W, H };
}

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function EvidenceGraph({ f, repo, focus }) {
  const { nodes, edges } = useMemo(() => buildGraph(f, repo), [f, repo]);
  const { pos, W, H } = useMemo(() => layout(nodes, edges), [nodes, edges]);
  const [sel, setSel] = useState("vuln");
  const [hover, setHover] = useState(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const svg = useRef(null);
  const drag = useRef(null);
  const current = nodes.find((n) => n.id === sel) ?? nodes[0];
  const reset = useCallback(() => setView({ k: 1, x: 0, y: 0 }), []);
  /** Scale and centre so every node is inside the frame, whatever the node count. */
  const fit = reset;
  const zoom = (d) => setView((v) => ({ ...v, k: Math.min(3, Math.max(0.6, v.k * d)) }));

  useEffect(() => { setSel("vuln"); reset(); }, [f.id, reset]);
  // Selecting an evidence reference in the AI panel focuses its node here.
  useEffect(() => {
    if (!focus || !nodes.some((n) => n.id === focus.id)) return;
    setSel(focus.id);
    svg.current?.closest(".graph")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const h = (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 0.9); };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

  const key = (e, id, i) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(id); return; }
    const to = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? nodes.length - 1 : null;
    if (to !== null) { e.preventDefault(); e.stopPropagation(); const el = svg.current?.querySelectorAll(".gnode")[Math.max(0, Math.min(nodes.length - 1, to))]; el?.focus(); }
  };
  const canvasKey = (e) => {
    if (e.key === "+" || e.key === "=") zoom(1.18); else if (e.key === "-") zoom(0.85); else if (e.key === "0") fit();
  };
  const label = `Relationship graph. ${edges.map((e) => `${nodes.find((n) => n.id === e.from)?.title} ${e.label} ${nodes.find((n) => n.id === e.to)?.title}`).join("; ")}.`;
  const hov = nodes.find((n) => n.id === hover);
  const leadsTo = edges.filter((e) => e.from === current.id).map((e) => nodes.find((n) => n.id === e.to)?.title).filter(Boolean);
  const from = edges.filter((e) => e.to === current.id).map((e) => nodes.find((n) => n.id === e.from)?.title).filter(Boolean);

  return (
    <section className="graph" aria-label="Relationship graph">
      <div className="graph-top">
        <h2>Relationships</h2>
        <ul className="legend" aria-label="Legend">
          <li><i className="solid" aria-hidden="true" />Scanner-reported</li>
          <li><i className="dashed" aria-hidden="true" />AI-generated</li>
        </ul>
        <div className="zoom" role="group" aria-label="Graph zoom">
          <button onClick={() => zoom(0.85)} aria-label="Zoom out"><Minus size={14} aria-hidden="true" /></button>
          <button onClick={() => zoom(1.18)} aria-label="Zoom in"><Plus size={14} aria-hidden="true" /></button>
          <button onClick={fit} aria-label="Fit graph to view" title="Fit to view"><Maximize2 size={14} aria-hidden="true" /></button>
          <button onClick={reset} aria-label="Reset view" title="Reset view"><RotateCcw size={14} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="graph-canvas" onKeyDown={canvasKey}>
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="gsvg" style={{ aspectRatio: `${W} / ${H}` }}
          onPointerDown={(e) => { if (e.pointerType === "touch" || (e.target ).closest(".gnode")) return; drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; (e.currentTarget ).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { const d = drag.current; if (!d) return; const s = W / (svg.current?.getBoundingClientRect().width || W); setView((v) => ({ ...v, x: d.vx + (e.clientX - d.x) * s, y: d.vy + (e.clientY - d.y) * s })); }}
          onPointerUp={() => { drag.current = null; }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#58637a" /></marker>
            <marker id="arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#f3f5fa" /></marker>
          </defs>
          <g transform={`translate(${W / 2 + view.x} ${H / 2 + view.y}) scale(${view.k}) translate(${-W / 2} ${-H / 2})`}>
            {edges.map((e) => {
              const a = pos[e.from], b = pos[e.to];
              const x1 = a.x + NW, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2, mx = (x1 + x2) / 2;
              const on = sel === e.from || sel === e.to;
              return (
                <g key={e.from + e.to} className={`gedge${on ? " on" : ""}${e.ai ? " ai" : ""}`}>
                  <path d={`M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2 - 2} ${y2}`} markerEnd={`url(#${on ? "arrow-on" : "arrow"})`} />
                  {on && <text x={mx} y={(y1 + y2) / 2 - 7} textAnchor="middle" className="gel">{e.label}</text>}
                </g>
              );
            })}
            {nodes.map((n, i) => {
              const p = pos[n.id], on = n.id === sel;
              return (
                <g key={n.id} className={`gnode${on ? " on" : ""}`} transform={`translate(${p.x} ${p.y})`} role="button" tabIndex={0} aria-pressed={on} aria-label={`${n.title}: ${n.summary}${n.ai ? ", AI-generated" : ""}`}
                  onClick={() => setSel(n.id)} onKeyDown={(e) => key(e, n.id, i)} onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(n.id)} onBlur={() => setHover(null)}>
                  <rect className="gbox" width={NW} height={p.h} rx="9" fill={on ? "#1a2030" : "#141925"} stroke={on ? "#f3f5fa" : n.color} strokeOpacity={on ? 1 : 0.55} strokeWidth={on ? 1.8 : 1} strokeDasharray={n.ai ? "4 4" : undefined} />
                  <circle cx="15" cy={n.size ? 26 : 23} r={n.size ? 5.5 : 4.5} fill={n.color} />
                  <text x="28" y={n.size ? 31 : 28} className="gt">{clip(n.title, 20)}</text>
                  <text x="15" y={n.size ? 58 : 48} className="gs">{clip(n.summary, 21)}</text>
                  <title>{n.title}: {n.summary}</title>
                </g>
              );
            })}
          </g>
        </svg>
        {hov && <p className="ghover" aria-hidden="true"><b>{hov.title}</b> {hov.summary}</p>}
      </div>
      <motion.div key={current.id} className="node-detail" aria-live="polite" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <h3>{current.title}<span className={`origin${current.ai ? " ai" : ""}`}>{current.ai ? "AI-generated" : "Scanner-reported"}</span></h3>
        <p className="faint small nd-sum">{current.summary}</p>
        {current.body}
        {(from.length > 0 || leadsTo.length > 0) && <p className="faint small">{from.length > 0 && <>From: {from.join(", ")}. </>}{leadsTo.length > 0 && <>Leads to: {leadsTo.join(", ")}.</>}</p>}
      </motion.div>
      {!f.ai_analysis && <p className="faint small">No AI analysis exists for this finding, so the graph shows scanner facts only.</p>}
      <p className="faint small ghint">Select a node to inspect it. Arrow keys move between nodes, drag pans, + and − zoom, 0 resets.</p>
    </section>
  );
}
