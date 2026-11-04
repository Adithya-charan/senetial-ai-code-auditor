import { motion } from "framer-motion";
import { Bug, CheckCircle2, GitBranch, KeyRound, Loader2, Package, Rocket, ScanSearch, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import OrbitMap from "../three/OrbitMap";

const GITHUB = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;

const SCANNERS = [
  { name: "Bandit", icon: Bug, body: "Python security analysis." },
  { name: "Semgrep", icon: ScanSearch, body: "Rule-based code analysis." },
  { name: "Gitleaks", icon: KeyRound, body: "Secret detection." },
  { name: "OSV-Scanner", icon: Package, body: "Dependency vulnerability analysis." },
];

/** The five stages are the real scan pipeline; the text states what each one does. */
const STAGES = [
  { id: "connect", label: "Connect", color: "#a8b5cc", ring: 2 , angle: 215, title: "Repository connection", body: "You provide a public GitHub URL. SENTINEL validates its format before anything is submitted." },
  { id: "clone", label: "Clone", color: "#559dff", ring: 1 , angle: 300, title: "Read-only clone", body: "The default branch is fetched. Nothing in the repository is ever executed." },
  { id: "scan", label: "Scan", color: "#42d8e7", ring: 2 , angle: 20, title: "Scanner analysis", body: "Bandit, Semgrep, Gitleaks and OSV-Scanner each run and report their own status. All four run on every scan." },
  { id: "ai", label: "Explain", color: "#9275ff", ring: 1 , angle: 100, title: "AI explanation and verification", body: "If enabled, each finding gets an explanation that is compared with the scanner evidence and labelled Supported, Uncertain or Unsupported." },
  { id: "investigate", label: "Investigate", color: "#4cd5ad", ring: 2 , angle: 150, title: "Investigation", body: "Open any finding to see its evidence, relationships and suggested remediation." },
];

export default function NewScan() {
  const nav = useNavigate();
  const [url, setUrl] = useState("");
  const [ai, setAi] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [stage, setStage] = useState("scan");
  const [hover, setHover] = useState(null);
  const clean = url.trim();
  const m = GITHUB.exec(clean);
  const hint = clean && !m ? "Use a public repository URL like https://github.com/owner/repository." : null;
  const shown = STAGES.find((s) => s.id === (hover ?? stage)) ?? STAGES[2];

  const submit = async (e) => {
    e.preventDefault();
    if (!m) return;
    setBusy(true); setErr(null);
    try { nav(`/scans/${(await api.createScan(clean, ai)).id}`); }
    catch (x) { setErr((x ).message); setBusy(false); }
  };

  return (
    <div className="ns">
      <section className="ns-main">
        <p className="ns-eyebrow">Mission control · New scan</p>
        <h1 className="ns-h1">Launch a security scan.</h1>
        <p className="lede ns-lede">Connect a GitHub repository and let SENTINEL investigate its code, dependencies and security evidence.</p>

        <form onSubmit={submit} noValidate className="ns-form">
          <h2 className="ns-fh"><GitBranch size={17} aria-hidden="true" />Connect a repository</h2>
          <label className="sr-only" htmlFor="repo">GitHub repository URL</label>
          <div className={`ns-field${hint ? " bad" : m ? " ok" : ""}`}>
            <GitBranch size={18} aria-hidden="true" />
            <input id="repo" type="text" inputMode="url" autoComplete="off" placeholder="https://github.com/owner/repository"
              value={url} onChange={(e) => setUrl(e.target.value)} aria-invalid={!!hint} aria-describedby="repo-hint" />
            {m && <CheckCircle2 size={18} aria-label="Valid repository URL" />}
          </div>
          <p id="repo-hint" className={hint ? "err small" : "muted small"} role={hint ? "alert" : undefined}>
            {hint ?? "Public GitHub repositories are supported. Repository code is never executed. Private repositories are not supported."}
          </p>

          {m && (
            <motion.dl className="ns-repo" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} aria-label="Repository preview">
              <div><dt>Owner</dt><dd>{m[1]}</dd></div>
              <div><dt>Repository</dt><dd>{m[2].replace(/\.git$/, "")}</dd></div>
              <div><dt>Branch</dt><dd>Default branch</dd></div>
              <div><dt>URL check</dt><dd className="t-completed">Valid format</dd></div>
            </motion.dl>
          )}

          <label className="ns-opt">
            <input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} />
            <span><b>Enable AI investigation</b><span className="faint small">AI explanations are checked against scanner evidence and labelled according to their verification status.</span></span>
          </label>

          <motion.button className="btn ns-go" disabled={busy || !m} whileTap={busy ? undefined : { scale: 0.98 }}>
            {busy ? <><Loader2 size={17} className="spin" aria-hidden="true" />Launching…</> : <><Rocket size={17} className="ns-rocket" aria-hidden="true" />Launch Security Scan</>}
          </motion.button>
          {err && <p className="err" role="alert">{err}</p>}
        </form>

        <section aria-labelledby="scn" className="ns-scanners">
          <h2 id="scn">Scanner pipeline</h2>
          <ul>{SCANNERS.map((s) => <li key={s.name}><s.icon size={16} aria-hidden="true" /><span><b>{s.name}</b><small>{s.body}</small></span></li>)}</ul>
          <p className="faint small">All four run on every scan. They cannot be switched off individually.</p>
        </section>
      </section>

      <aside className="ns-visual space" aria-label="Scan pipeline">
        <OrbitMap ariaLabel="Scan pipeline: select a stage to read what it does" coreLabel="SENTINEL" coreSub="scan pipeline" coreColor="#9275ff"
          activeId={hover ?? stage} onSelect={setStage} onHover={setHover} nodes={STAGES.map((s) => ({ id: s.id, label: s.label, color: s.color, ring: s.ring, angle: s.angle }))} />
        <div className="ns-stage" aria-live="polite">
          <b style={{ color: shown.color }}>{shown.title}</b>
          <p>{shown.body}</p>
        </div>
      </aside>

      <ul className="ns-assure" aria-label="How SENTINEL handles your repository">
        <li><ShieldCheck size={16} aria-hidden="true" />Read-only repository handling</li>
        <li><ShieldCheck size={16} aria-hidden="true" />Repository code is not executed</li>
        <li><ShieldCheck size={16} aria-hidden="true" />Findings come from the scanners</li>
        <li><ShieldCheck size={16} aria-hidden="true" />AI explanations are checked against evidence</li>
      </ul>
    </div>
  );
}
