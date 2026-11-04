import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, } from "../api";
import { RUNNING, useLoad } from "../hooks";
import FindingNavigator, { } from "./FindingNavigator";
import EvidenceGraph from "./EvidenceGraph";
import { AIIntelligencePanel, EvidencePanel, IssueOverview, SeverityIndicator, VerificationBadge } from "./Panels";
import ScanSummary from "./ScanSummary";
import { SEV_COLOR, sortFindings, verifMeta } from "./util";
import "./investigation.css";


export default function Investigation() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const [sp, setSp] = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [focusNode, setFocusNode] = useState(null);
  const fresh = Boolean((loc.state )?.fresh);

  const { data: scan, error: scanErr } = useLoad(() => api.scan(id), [id], (s) => RUNNING.has(s.status));
  const done = !!scan && !RUNNING.has(scan.status);
  const { data: all, error: listErr } = useLoad(
    () => (done ? api.findings(id) : Promise.resolve([])), [id, done]);

  const filters = { sev: sp.get("sev") ?? "", scanner: sp.get("scanner") ?? "", ver: sp.get("ver") ?? "", q: sp.get("q") ?? "" };
  const sorted = useMemo(() => sortFindings(all ?? []), [all]);
  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return sorted.filter((f) =>
      (!filters.sev || f.severity === filters.sev) && (!filters.scanner || f.scanner === filters.scanner) &&
      (!filters.ver || f.evidence_status === filters.ver) &&
      (!q || `${f.title} ${f.file_path} ${f.rule_id} ${f.scanner}`.toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, filters.sev, filters.scanner, filters.ver, filters.q]);

  const fid = sp.get("f");
  const selected = sorted.find((f) => f.id === fid) ?? null;
  const index = selected ? visible.findIndex((f) => f.id === selected.id) : -1;

  const setParams = useCallback((patch, replace = false) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) (v ? n.set(k, v) : n.delete(k));
      return n;
    }, { replace, state: loc.state });
  }, [setSp, loc.state]);

  const pick = useCallback((fid2) => { setParams({ f: fid2 }); setNavOpen(false); }, [setParams]);
  const go = useCallback((delta) => {
    if (!visible.length) return;
    const i = index < 0 ? 0 : (index + delta + visible.length) % visible.length;
    setParams({ f: visible[i].id });
  }, [visible, index, setParams]);
  const begin = useCallback(() => { if (visible[0]) setParams({ f: visible[0].id }); }, [visible, setParams]);

  // Keep the selection inside the active filter.
  const onFilters = (p) =>
    setParams(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v || null])), true);
  useEffect(() => {
    if (selected && visible.length && index < 0) setParams({ f: visible[0].id }, true);
  }, [selected, visible, index, setParams]);

  useEffect(() => {
    const h = (e) => {
      const t = e.target ;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [go]);

  const { data: detail } = useLoad(() => (fid ? api.finding(fid) : Promise.resolve(null)), [fid]);
  const current = selected && (detail?.id === selected.id ? detail : selected);
  const loadingDetail = !!selected && detail?.id !== selected.id;

  useEffect(() => { if (current) document.title = `${current.severity}: ${current.title} · SENTINEL`; return () => { document.title = "SENTINEL"; }; }, [current]);

  const header = (
    <header className="inv-head">
      <Link className="ghost back" aria-label="Back to findings" to={`/findings?scan=${id}`}><ArrowLeft size={14} aria-hidden="true" /> <span className="bt">Findings</span></Link>
      <span className="logo" aria-label="SENTINEL"><i aria-hidden="true" />SENTINEL</span>
      <span className="crumb strong">{scan?.repository_name ?? "…"}</span>
      {scan && <code className="crumb scanid" title={`Scan ID ${scan.id}`}>{scan.id.slice(0, 8)}</code>}
      {scan && <span className={`st st-${scan.status}`}>{scan.status.toLowerCase().replace("_", " ")}</span>}
      <span className="spacer" />
      {selected && <button className="ghost" onClick={() => setParams({ f: null })}>Summary</button>}
      {selected && <button className="ghost" aria-expanded={navOpen || !collapsed} title="Show or hide the finding list"
        onClick={() => (window.innerWidth <= 1180 ? setNavOpen((o) => !o) : setCollapsed((c) => !c))}>Finding list</button>}
      <Link className="ghost" to="/history" title="Back to scan history">History</Link>
    </header>
  );

  let body;
  if (scanErr && !scan) body = <p className="pad err" role="alert">Could not load scan: {scanErr}</p>;
  else if (!scan) body = <p className="pad muted" role="status">Loading scan…</p>;
  else if (!done) {
    body = <div className="summary"><p className="eyebrow">Scan in progress</p><h1>{scan.repository_name}</h1>
      <p role="status">Status: {scan.status.toLowerCase().replace("_", " ")}. This page updates automatically.</p>
      <Link to={`/scans/${id}`}>View live progress</Link></div>;
  } else if (listErr && !all) body = <p className="pad err" role="alert">Could not load findings: {listErr}</p>;
  else if (!all) body = <p className="pad muted" role="status">Loading findings…</p>;
  else if (!selected) {
    body = <ScanSummary scan={scan} findings={sorted} fresh={fresh} onBegin={begin} />;
    if (fid) body = <p className="pad err" role="alert">That finding is not part of this scan. <Link to={`/scans/${id}/investigate`}>Back to summary</Link></p>;
  } else if (current) {
    const color = SEV_COLOR[current.severity];
    body = (
      <div className={`inv-body${navOpen ? " nav-open" : ""}${collapsed ? " nav-collapsed" : ""}`} style={{ ["--sev" ]: color }}>
        <div className="a-nav">
          <FindingNavigator findings={visible} total={sorted.length} selectedId={selected.id} filters={filters} onFilters={onFilters} onPick={pick} />
        </div>
        <motion.main className="a-center" key={current.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <header className="issue">
            <h1 title={current.title}>{current.title}</h1>
            <p className="stage-line">
              <SeverityIndicator severity={current.severity} />
              <VerificationBadge status={current.evidence_status} />
              <span className="faint small">{verifMeta(current.evidence_status).short}</span>
            </p>
            <IssueOverview f={current} />
          </header>
          <EvidenceGraph f={current} repo={scan?.repository_name} focus={focusNode} />
          <div className="pager" role="group" aria-label="Finding navigation">
            <button className="ghost" onClick={() => go(-1)} aria-label="Previous finding">← Previous</button>
            <span role="status" aria-live="polite">Finding {index >= 0 ? index + 1 : "–"} of {visible.length}{visible.length !== sorted.length ? ` (filtered from ${sorted.length})` : ""}</span>
            <button className="ghost" onClick={() => go(1)} aria-label="Next finding">Next →</button>
          </div>
        </motion.main>
        <section className="a-code"><EvidencePanel f={current} /></section>
        <div className="a-ai"><AIIntelligencePanel f={current} loading={loadingDetail} onFocusNode={(id) => setFocusNode({ id, n: Date.now() })} /></div>
        {navOpen && <button className="scrim" aria-label="Close finding navigator" onClick={() => setNavOpen(false)} />}
      </div>
    );
  }

  return <div className="inv" role="region" aria-label="Security investigation">{header}{body}</div>;
}
