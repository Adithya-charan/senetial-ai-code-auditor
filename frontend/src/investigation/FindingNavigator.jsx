import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { memo } from "react";

import { SEV_COLOR, SEV_ORDER, SCANNER_LABEL, SCANNERS, basename, verifMeta } from "./util";



function Item({ f, active, onPick }) {
  const v = verifMeta(f.evidence_status);
  return (
    <li>
      <button className={`item${active ? " on" : ""}`} aria-current={active ? "true" : undefined}
        style={{ ["--sc" ]: SEV_COLOR[f.severity] }} onClick={() => onPick(f.id)}>
        {active && <motion.span layoutId="navsel" className="itemsel" transition={{ type: "spring", stiffness: 420, damping: 38 }} aria-hidden="true" />}
        <i className="sevdot" aria-hidden="true" />
        <span className="item-body">
          <span className="item-title"><span className="sr-only">{f.severity}: </span>{f.title}</span>
          <span className="item-meta">{basename(f.file_path)} · {SCANNER_LABEL[f.scanner] ?? f.scanner} · <span style={{ color: v.color }}>{v.label}</span></span>
        </span>
      </button>
    </li>
  );
}
const MemoItem = memo(Item);

export default function FindingNavigator(props


) {
  const { findings, total, selectedId, filters, onFilters, onPick } = props;
  return (
    <nav className="navp" aria-label="Finding explorer">
      <div className="navtop">
        <h2>Findings <span className="faint" role="status">{findings.length === total ? total : `${findings.length} of ${total}`}</span></h2>
        <label className="search"><Search size={14} aria-hidden="true" />
          <input type="search" placeholder="Search findings" aria-label="Search findings" value={filters.q} onChange={(e) => onFilters({ q: e.target.value })} />
        </label>
        <div className="sevchips" role="group" aria-label="Filter by severity">
          {SEV_ORDER.filter((s) => s !== "Info").map((s) => (
            <button key={s} aria-pressed={filters.sev === s} className={filters.sev === s ? "on" : ""} style={{ ["--sc" ]: SEV_COLOR[s] }}
              onClick={() => onFilters({ sev: filters.sev === s ? "" : s })}><i aria-hidden="true" />{s}</button>
          ))}
        </div>
        <div className="selrow">
          <select aria-label="Filter by scanner" value={filters.scanner} onChange={(e) => onFilters({ scanner: e.target.value })}>
            <option value="">All scanners</option>{SCANNERS.map((s) => <option key={s} value={s}>{SCANNER_LABEL[s]}</option>)}
          </select>
          <select aria-label="Filter by AI verification" value={filters.ver} onChange={(e) => onFilters({ ver: e.target.value })}>
            <option value="">All verification</option>
            {["SUPPORTED", "UNCERTAIN", "UNSUPPORTED", "SCANNER_CONFIRMED"].map((s) => <option key={s} value={s}>{verifMeta(s).label}</option>)}
          </select>
        </div>
      </div>
      {findings.length === 0 && <p className="muted small pad">No findings match these filters.</p>}
      <div className="list">
        {SEV_ORDER.map((sev) => {
          const group = findings.filter((f) => f.severity === sev);
          if (!group.length) return null;
          return (
            <section key={sev} aria-label={`${sev} findings`}>
              <h3 style={{ color: SEV_COLOR[sev] }}>{sev}<span className="faint"> {group.length}</span></h3>
              <ul>{group.map((f) => <MemoItem key={f.id} f={f} active={f.id === selectedId} onPick={onPick} />)}</ul>
            </section>
          );
        })}
      </div>
    </nav>
  );
}
