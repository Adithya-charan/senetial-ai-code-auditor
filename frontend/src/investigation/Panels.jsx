import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Copy, Crosshair } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { SCANNER_LABEL, SEV_COLOR, parseOsv, verifMeta } from "./util";

const SourceCodeViewer = lazy(() => import("./SourceCodeViewer"));

export function VerificationBadge({ status }) {
  const v = verifMeta(status);
  return (
    <span className="vbadge" style={{ color: v.color }} title={v.short}>
      <span aria-hidden="true">{status === "SUPPORTED" ? "✓" : status === "UNSUPPORTED" ? "!" : status === "UNCERTAIN" ? "?" : "•"}</span>
      <span className="sr-only">AI verification: </span>{v.label}
    </span>
  );
}

export function SeverityIndicator({ severity }) {
  return <span className="sev" style={{ color: SEV_COLOR[severity] }}><i aria-hidden="true" />{severity}</span>;
}

export function IssueOverview({ f }) {
  const osv = f.scanner === "osv-scanner" ? parseOsv(f) : null;
  return (
    <p className="meta">
      <span>{SCANNER_LABEL[f.scanner] ?? f.scanner} <code title="Scanner rule identifier">{f.rule_id}</code></span>
      {f.cwe_id && <span title="Common Weakness Enumeration"><code>{f.cwe_id}</code></span>}
      <span><code>{f.file_path}</code>{f.start_line ? `:${f.start_line}` : osv ? " (manifest)" : ""}</span>
    </p>
  );
}

/** Clipboard write with a textarea fallback for contexts where the async API is blocked (insecure origin, no permission). */
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  } catch { return false; }
}

function lookupCommand(name, ecosystem) {
  const e = (ecosystem ?? "").toLowerCase();
  if (e.includes("pypi")) return `pip index versions ${name}`;
  if (e.includes("npm")) return `npm view ${name} versions`;
  return null;
}

function Section({ id, title, tag, kind, defaultOpen = true, copy, onCopy, node, onFocus, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const doCopy = async () => {
    onCopy((await copyText(copy ?? "")) ? `${title} copied` : "Copy is not available in this browser");
  };
  return (
    <section className={`aisec${kind ? ` k-${kind}` : ""}`}>
      <h2>
        <button className="aihead" aria-expanded={open} aria-controls={`ai-${id}`} onClick={() => setOpen(!open)}>
          <ChevronDown size={15} aria-hidden="true" style={{ transform: open ? undefined : "rotate(-90deg)", transition: "transform .15s" }} />{title}
        </button>
        {kind && <span className={`kind ${kind}`}>{kind === "scanner" ? "Scanner" : "AI"}</span>}
        {node && onFocus && <button className="aicopy" onClick={() => onFocus(node)} aria-label={`Show ${title} in the graph`} title="Show in graph"><Crosshair size={13} aria-hidden="true" /></button>}
        {copy && <button className="aicopy" onClick={doCopy} aria-label={`Copy ${title}`}><Copy size={13} aria-hidden="true" /></button>}
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={`ai-${id}`} className="aibody" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div>{children}{tag && <p className="tag">{tag}</p>}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Right panel: six sections in reading order. Scanner facts and AI text are labelled apart; nothing is presented as confirmed unless a scanner reported it. */
export function AIIntelligencePanel({ f, loading, onFocusNode }) {
  const a = f.ai_analysis;
  const v = verifMeta(f.evidence_status);
  const unsupported = f.evidence_status === "UNSUPPORTED";
  const osv = f.scanner === "osv-scanner" ? parseOsv(f) : null;
  const [toast, setToast] = useState("");
  const timer = useRef(0);
  const say = (m) => { setToast(m); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(""), 2200); };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const cmd = osv ? lookupCommand(osv.name, osv.ecosystem) : null;
  const where = `${f.file_path}${f.start_line ? `:${f.start_line}` : ""}`;
  const uncertainCopy = [...(a?.uncertainties ?? []), ...(a?.unsupported_claims ?? []).map((c) => `Unsupported: ${c}`)].join("\n");

  return (
    <aside className="ai" aria-label="AI assistant">
      <Section id="what" node="vuln" onFocus={onFocusNode} title="What happened" tag="Scanner finding" kind="scanner" onCopy={say} copy={`${f.title}\n${f.description ?? ""}`}>
        <p>{f.title}</p>
        {f.description && <p className="muted small">{f.description}</p>}
        {a ? <div className="aiblock"><p className={unsupported ? "dim" : undefined}>{a.summary}</p><span className="aitag">AI-generated summary</span></div>
          : <p className="muted">{loading ? "Loading analysis…" : "No AI analysis exists for this finding. Only the scanner facts are shown."}</p>}
      </Section>

      <Section id="why" node="impact" onFocus={onFocusNode} title="Why it matters" kind="ai" tag="Potential impact, not confirmed" onCopy={say} copy={a?.potential_impact}>
        {a ? <p className={unsupported ? "dim" : undefined}>{a.potential_impact}</p> : <p className="muted">Not available without an AI analysis.</p>}
      </Section>

      <Section id="evidence" node="evidence" onFocus={onFocusNode} title="Confirmed evidence" kind="scanner" onCopy={say} copy={`${SCANNER_LABEL[f.scanner] ?? f.scanner} rule ${f.rule_id} at ${where}`}>
        <ul className="evrefs">
          <li><b>Scanner:</b> <button className="ref" onClick={() => onFocusNode?.("evidence")}>{SCANNER_LABEL[f.scanner] ?? f.scanner}, rule <code>{f.rule_id}</code></button></li>
          <li><b>Location:</b> <button className="ref" onClick={() => onFocusNode?.("file")}><code>{where}</code>{osv && " (manifest)"}</button></li>
          {f.cwe_id && <li><b>Weakness:</b> <code>{f.cwe_id}</code></li>}
          {osv && <li><b>Dependency:</b> <button className="ref" onClick={() => onFocusNode?.("vuln")}><code>{osv.name} {osv.version}</code></button>, {osv.count} advisor{osv.count === 1 ? "y" : "ies"}, highest CVSS {osv.cvss}</li>}
          {osv && osv.ids.length > 0 && <li><b>Advisories:</b> {osv.ids.map((i) => <button key={i} className="ref chip" onClick={() => onFocusNode?.("adv")}><code>{i}</code></button>)}</li>}
          <li><b>AI check:</b> <VerificationBadge status={f.evidence_status} /> <span className="muted small">{v.explain}</span></li>
        </ul>
      </Section>

      <Section id="uncertain" node="impact" onFocus={onFocusNode} title="What remains uncertain" kind="ai" defaultOpen={!!(a?.uncertainties.length || a?.unsupported_claims.length)} onCopy={say} copy={uncertainCopy || undefined}>
        {a?.uncertainties.length ? <ul>{a.uncertainties.map((u, i) => <li key={i}>{u}</li>)}</ul> : <p className="muted small">The analysis lists no uncertainties. This does not mean exploitability is established.</p>}
        {!!a?.unsupported_claims.length && (<><p className="warn">Claims not backed by evidence:</p><ul>{a.unsupported_claims.map((c, i) => <li key={i}>{c}</li>)}</ul></>)}
        {unsupported && <p className="callout" role="alert">This AI explanation is <strong>not supported</strong> by the available evidence. Do not treat it as confirmed.</p>}
      </Section>

      <Section id="impact" node="impact" onFocus={onFocusNode} title="Potential impact" kind="ai" tag="AI-generated, not confirmed" defaultOpen={false} onCopy={say} copy={a?.potential_impact}>
        <p className="muted small">Severity reported by the scanner: <strong>{f.severity}</strong>. No exploitability is claimed unless the scanner or advisory states it.</p>
        {a && <p className={unsupported ? "dim" : undefined}>{a.potential_impact}</p>}
      </Section>

      <Section id="fix" node="fix" onFocus={onFocusNode} title="Recommended remediation" kind="ai" tag="AI-suggested, not applied or tested" onCopy={say} copy={a?.remediation.map((r, i) => `${i + 1}. ${r}`).join("\n")}>
        {a?.remediation.length ? <ol className={unsupported ? "dim" : undefined}>{a.remediation.map((r, i) => <li key={i}>{r}</li>)}</ol> : <p className="muted small">No remediation steps were generated.</p>}
        {osv && (
          <div className="fixbox">
            <p><b>Action:</b> upgrade <code>{osv.name}</code> from <code>{osv.version}</code> to a release that fixes the listed advisories.</p>
            <p className="muted small">SENTINEL does not know which version fixes every advisory. Check each advisory and the changelog for breaking changes before upgrading.</p>
            {cmd && <div className="cmd"><code>{cmd}</code><button onClick={async () => say((await copyText(cmd)) ? "Command copied" : "Copy is not available in this browser")} aria-label="Copy command"><Copy size={13} aria-hidden="true" /></button></div>}
            {cmd && <p className="muted small">Lists available versions only. It does not change your repository.</p>}
          </div>
        )}
      </Section>

      {a && <p className="muted small modelnote">Model: {a.model}</p>}
      <p className="toast" role="status" aria-live="polite">{toast}</p>
    </aside>
  );
}

/** Bottom panel: real source for code findings; manifest/advisory facts for dependencies. */
export function EvidencePanel({ f }) {
  const osv = f.scanner === "osv-scanner" ? parseOsv(f) : null;
  if (f.excerpt) {
    return (
      <Suspense fallback={<p className="muted pad">Loading source viewer…</p>}>
        <SourceCodeViewer finding={f} />
      </Suspense>
    );
  }
  if (f.scanner === "osv-scanner") {
    return (
      <section className="code dep" aria-label="Dependency evidence">
        <div className="code-bar"><strong>Dependency evidence</strong><span className="muted">no source line: this is a manifest-level finding</span></div>
        <dl className="overview wide">
          {osv ? (<>
            <div><dt>Dependency</dt><dd><code>{osv.name}</code></dd></div>
            <div><dt>Affected version</dt><dd><code>{osv.version}</code></dd></div>
            {osv.ecosystem && <div><dt>Ecosystem</dt><dd>{osv.ecosystem}</dd></div>}
            <div><dt>Known vulnerabilities</dt><dd>{osv.count} (max CVSS {osv.cvss})</dd></div>
            <div><dt>Manifest</dt><dd><code>{f.file_path}</code></dd></div>
            <div><dt>Advisory identifiers</dt><dd>{osv.ids.length ? osv.ids.map((i) => <code key={i} className="chip">{i}</code>) : "Not reported"}</dd></div>
          </>) : (<>
            <div><dt>Manifest</dt><dd><code>{f.file_path}</code></dd></div>
            <div><dt>Scanner message</dt><dd>{f.title}</dd></div>
            <div><dt>Details</dt><dd>{f.description}</dd></div>
          </>)}
        </dl>
      </section>
    );
  }
  return (
    <section className="code dep" aria-label="Scanner evidence">
      <div className="code-bar"><strong>Scanner evidence</strong></div>
      <dl className="overview wide">
        <div><dt>File</dt><dd><code>{f.file_path}</code></dd></div>
        <div><dt>Line</dt><dd>{f.start_line ?? "Not available"}</dd></div>
        <div><dt>Scanner message</dt><dd>{f.title}</dd></div>
      </dl>
      <p className="code-note">
        {f.scanner === "gitleaks"
          ? "The secret value is redacted by the scanner and intentionally never stored or displayed."
          : "No source excerpt was stored for this finding."}
      </p>
    </section>
  );
}
