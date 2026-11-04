import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { CheckCircle2, HelpCircle, Menu, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fast, page } from "../motion";
import OrbitMap from "../three/OrbitMap";
import CoreStage from "../three/CoreStage";
import "./landing.css";

const SECTIONS = [
  { id: "product", label: "Platform" },
  { id: "features", label: "Features" },
  { id: "how", label: "How it works" },
  { id: "evidence", label: "Security" },
];

/** The hero maps SENTINEL's real architecture. Every node is labelled in the panel, and each description states what the product does. */
const HERO_NODES = [
  { id: "repo", label: "Repository", color: "#a8b5cc", ring: 0, deg: 200, size: 0.2, desc: "A public GitHub repository is cloned read-only. Its code is never executed." },
  { id: "bandit", label: "Bandit", color: "#559dff", ring: 1, deg: 20, desc: "Finds common security issues in Python code." },
  { id: "semgrep", label: "Semgrep", color: "#559dff", ring: 1, deg: 110, desc: "Rule-based code scanning across many languages." },
  { id: "gitleaks", label: "Gitleaks", color: "#559dff", ring: 1, deg: 200, desc: "Detects secrets committed to the repository." },
  { id: "osv", label: "OSV-Scanner", color: "#42d8e7", ring: 1, deg: 290, desc: "Matches dependencies against known advisories, with versions and identifiers." },
  { id: "vuln", label: "Vulnerability", color: "#ff526b", ring: 2, deg: 60, size: 0.2, desc: "Scanner findings are merged and sorted by severity so the critical ones come first." },
  { id: "evidence", label: "Evidence", color: "#42d8e7", ring: 2, deg: 150, desc: "Each finding links to its source line or advisory and the scanner rule that reported it." },
  { id: "ai", label: "AI investigation", color: "#9275ff", ring: 2, deg: 240, desc: "Explains each finding. Every claim is compared with what the scanners reported." },
  { id: "fix", label: "Remediation", color: "#9275ff", ring: 2, deg: 330, desc: "Suggested steps are marked AI-suggested and untested. Nothing in your repository is changed." },
] ;

function HeroCore() {
  const [hover, setHover] = useState(null);
  const [sel, setSel] = useState("vuln");
  const shown = HERO_NODES.find((n) => n.id === (hover ?? sel)) ?? HERO_NODES[5];
  return (
    <div className="core">
      <CoreStage className="core-stage" label="Interactive map of SENTINEL: a repository, four scanners, vulnerabilities, evidence, AI investigation and remediation orbiting a security core"
        nodes={HERO_NODES.map((n) => ({ id: n.id, color: n.color, ring: n.ring, angle: (n.deg * Math.PI) / 180, size: "size" in n ? n.size : 0.15, speed: 0.12 + n.ring * 0.05 }))}
        activeId={hover ?? sel} onHover={setHover} onSelect={(id) => setSel(id)}
        fallback={<OrbitMap ariaLabel="SENTINEL architecture" coreLabel="SENTINEL" coreSub="security core" activeId={hover ?? sel} onSelect={setSel} onHover={setHover}
          nodes={HERO_NODES.map((n) => ({ id: n.id, label: n.label, color: n.color, ring: n.ring , angle: n.deg }))} />} />
      <div className="core-info" aria-live="polite">
        <b style={{ color: shown.color }}>{shown.label}</b>
        <p>{shown.desc}</p>
      </div>
      <ul className="core-chips" aria-label="Explore the system">
        {HERO_NODES.map((n) => (
          <li key={n.id}><button className={(hover ?? sel) === n.id ? "on" : ""} aria-pressed={sel === n.id} onClick={() => setSel(n.id)} onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)}>
            <i style={{ background: n.color }} aria-hidden="true" />{n.label}</button></li>
        ))}
      </ul>
      <p className="faint small core-note">Illustration of the SENTINEL architecture. Select or hover a node.</p>
    </div>
  );
}

const go = (id) => (e) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
};

function useSeo() {
  useEffect(() => {
    const prev = document.title;
    document.title = "SENTINEL: evidence-backed security intelligence for your code";
    const set = (sel, attr, key, val) => {
      let m = document.querySelector(sel);
      if (!m) { m = document.createElement("meta"); m.setAttribute(attr, key); document.head.appendChild(m); }
      m.content = val;
    };
    set('meta[name="description"]', "name", "description", "SENTINEL scans GitHub repositories with Bandit, Semgrep, Gitleaks and OSV-Scanner, then explains each finding with AI and checks every claim against scanner evidence.");
    set('meta[property="og:title"]', "property", "og:title", "SENTINEL: evidence-backed security intelligence");
    set('meta[property="og:description"]', "property", "og:description", "Multi-scanner analysis with AI explanations that are checked against the evidence.");
    return () => { document.title = prev; };
  }, []);
}

function Nav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);
  return (
    <header className="lp-nav">
      <div className="lp-wrap lp-navin">
        <Link to="/" className="lp-brand"><i aria-hidden="true" />SENTINEL</Link>
        <nav aria-label="Page sections" className="lp-links">
          {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} onClick={go(s.id)}>{s.label}</a>)}
          <Link to="/overview">Open the app</Link>
        </nav>
        <div className="lp-navr">
          <Link to="/new" className="btn lp-cta-sm">Launch Security Scan</Link>
          <button className="btn ghost lp-burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="lp-mobile" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav id="lp-mobile" className="lp-mobile" aria-label="Mobile" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={fast}>
            {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} onClick={(e) => { go(s.id)(e); setOpen(false); }}>{s.label}</a>)}
            <Link to="/overview">Open the app</Link><Link to="/new">Start a Security Scan</Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

/** The hero scene follows one real finding from repository to remediation. Facts come from a scan of the public anxolerd/dvpwa repository; it is labelled as an illustration. */

const SCN = [
  { id: "repo", x: 24, y: 184, w: 168, h: 72, t: "Repository", s: "anxolerd/dvpwa", c: "#a4b0c5" },
  { id: "bandit", x: 282, y: 40, w: 138, h: 46, t: "Bandit", s: "code patterns", c: "#72a8f2" },
  { id: "semgrep", x: 282, y: 126, w: 138, h: 46, t: "Semgrep", s: "rule matching", c: "#72a8f2" },
  { id: "gitleaks", x: 282, y: 268, w: 138, h: 46, t: "Gitleaks", s: "secrets", c: "#72a8f2" },
  { id: "osv", x: 282, y: 354, w: 138, h: 46, t: "OSV-Scanner", s: "dependencies", c: "#50d7db" },
  { id: "vuln", x: 540, y: 160, w: 214, h: 120, t: "Critical · aiohttp 3.5.3", s: "53 known vulnerabilities", c: "#ff526b", core: true },
  { id: "evi", x: 850, y: 66, w: 176, h: 62, t: "Scanner evidence", s: "GHSA-2g87-pp6c-29x5", c: "#50d7db" },
  { id: "ai", x: 850, y: 188, w: 176, h: 62, t: "AI investigation", s: "claims checked", c: "#9278ff", ai: true },
  { id: "fix", x: 850, y: 310, w: 176, h: 62, t: "Remediation", s: "AI-suggested", c: "#9278ff", ai: true },
];
const SEDGES = [
  ["repo", "bandit"], ["repo", "semgrep"], ["repo", "gitleaks"], ["repo", "osv"],
  ["bandit", "vuln"], ["semgrep", "vuln"], ["gitleaks", "vuln"], ["osv", "vuln", true],
  ["vuln", "evi", true], ["vuln", "ai"], ["vuln", "fix"],
];
const byId = Object.fromEntries(SCN.map((n) => [n.id, n]));

function HeroScene() {
  return (
    <figure className="scene" aria-label="Illustration: a repository is scanned by four scanners, a critical dependency vulnerability is found, evidence is attached, the AI investigates and remediation is suggested">
      <div className="scene-bar"><span>Example investigation</span><span className="faint">Illustration of a real scan of a public repository</span></div>
      <div className="scene-scroll">
        <svg viewBox="0 0 1050 430" className="scene-svg" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="hg" x1="0" x2="1"><stop offset="0" stopColor="#9278ff" /><stop offset="1" stopColor="#50d7db" /></linearGradient>
            <radialGradient id="core" cx=".5" cy=".5" r=".6"><stop offset="0" stopColor="#ff526b" stopOpacity=".22" /><stop offset="1" stopColor="#ff526b" stopOpacity="0" /></radialGradient>
          </defs>
          <ellipse cx="647" cy="220" rx="230" ry="150" fill="url(#core)" />
          {SEDGES.map(([a, b, hot]) => {
            const p = byId[a], q = byId[b];
            const x1 = p.x + p.w, y1 = p.y + p.h / 2, x2 = q.x, y2 = q.y + q.h / 2, mx = (x1 + x2) / 2;
            const d = `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
            return <g key={a + b}><path d={d} className="se" /><path d={d} className={`se-flow${hot ? " hot" : ""}`} /></g>;
          })}
          {SCN.map((n, i) => (
            <g key={n.id} className="sn" style={{ ["--i" ]: i }} transform={`translate(${n.x} ${n.y})`}>
              <rect width={n.w} height={n.h} rx={n.core ? 16 : 11} className={`sbox${n.core ? " core" : ""}${n.ai ? " ai" : ""}`} stroke={n.c} />
              {n.core && <rect width={n.w} height="3" rx="1.5" fill={n.c} />}
              <circle cx="16" cy={n.core ? 30 : n.h / 2 - 7} r="4.5" fill={n.c} />
              <text x="30" y={n.core ? 35 : n.h / 2 - 3} className="st1">{n.t}</text>
              <text x="16" y={n.core ? 62 : n.h / 2 + 14} className="st2">{n.s}</text>
              {n.core && <text x="16" y="96" className="st3">Highest CVSS 9.1</text>}
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}

const SHOTS = [
  { id: "investigation", label: "Investigation", src: "/shots/investigation.png", alt: "SENTINEL investigation workspace: finding explorer, relationship graph with evidence, and AI analysis panel",
    text: "Explore findings, follow the relationship graph, read the evidence and see the AI explanation next to it." },
  { id: "overview", label: "Overview", src: "/shots/overview.png", alt: "SENTINEL security overview with severity, AI verification and scanner monitoring",
    text: "Severity, evidence verification and scanner status for any scan, computed from what the scanners reported." },
  { id: "findings", label: "Findings", src: "/shots/findings.png", alt: "SENTINEL findings table with severity, scanner and verification columns",
    text: "Search, filter and sort every finding in a scan. Filters live in the URL, so a view can be shared." },
];

const MATRIX = [
  ["Bandit", "Insecure patterns in Python code, such as weak hashes or shell calls."],
  ["Semgrep", "Rule-based code patterns across many languages."],
  ["Gitleaks", "Secrets committed to the repository: keys, tokens, credentials."],
  ["OSV-Scanner", "Dependencies with published advisories, with versions and identifiers."],
];

const STAGES = [
  { t: "Connect repository", d: "Paste a public GitHub URL. SENTINEL clones it read-only and never runs its code." },
  { t: "Scan codebase", d: "Bandit, Semgrep, Gitleaks and OSV-Scanner run in turn. Each reports whether it completed, failed or was skipped." },
  { t: "Correlate findings", d: "Results are merged and sorted by severity." },
  { t: "Investigate evidence", d: "Open any finding to see the source line or advisory, the scanner rule and an AI explanation with its verification result." },
  { t: "Review remediation", d: "Read suggested fixes, marked as AI-suggested and untested, and decide what to change." },
];

const VERDICTS = {
  supported: { icon: CheckCircle2, name: "Supported", cls: "ok", claim: "The package pins an affected version of the library.", evidence: "Scanner output names the same package and version.", says: "Every reference the AI cited was found in the evidence for this finding." },
  uncertain: { icon: HelpCircle, name: "Uncertain", cls: "warn", claim: "Exploitation is likely in this deployment.", evidence: "The scanner reports a vulnerable version, but nothing about how it is used.", says: "The AI flagged what it could not establish, or the evidence only partly covers its statement. Treat it as a lead, not a conclusion." },
  unsupported: { icon: XCircle, name: "Unsupported", cls: "bad", claim: "The issue is fixed in version 9.9.9.", evidence: "No such reference appears in the scanner evidence.", says: "A reference the AI cited could not be found. SENTINEL keeps the explanation behind a warning." },
} ;

function Browser({ src, alt }) {
  return (
    <div className="lp-browser">
      <div className="lp-bar" aria-hidden="true"><i /><i /><i /><span>SENTINEL</span></div>
      <img src={src} alt={alt} width={1440} height={1000} loading="lazy" decoding="async" />
    </div>
  );
}

export default function Landing() {
  useSeo();
  const [shot, setShot] = useState(SHOTS[0].id);
  const [verdict, setVerdict] = useState("supported");
  const cur = SHOTS.find((s) => s.id === shot);
  const v = VERDICTS[verdict];
  const how = useRef(null);
  const { scrollYProgress } = useScroll({ target: how, offset: ["start 70%", "end 60%"] });
  const trace = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  const traceH = useTransform(trace, (p) => `${Math.max(0, Math.min(1, p)) * 100}%`);

  return (
    <div className="lp">
      <Nav />
      <main>
        <section className="lp-hero space" aria-labelledby="hero-h">
          <div className="lp-wrap lp-herogrid">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow">Explore. Detect. Investigate. Secure.</p>
              <h1 id="hero-h" className="lp-h1">See what is hiding inside your code.</h1>
              <p className="lp-lede">Turn repository scans into connected security intelligence. Discover vulnerabilities, investigate dependencies and understand the evidence behind every finding.</p>
              <div className="lp-actions">
                <Link to="/new" className="btn lp-btn">Launch Security Scan</Link>
                <a href="#features" onClick={go("features")} className="btn ghost lp-btn">Explore the Platform</a>
              </div>
              <p className="lp-fine">Public GitHub repositories. Repository code is never executed.</p>
            </div>
            <HeroCore />
          </div>
        </section>

        <section className="lp-preview lp-wrap" aria-label="SENTINEL investigation workspace">
          <Browser src="/shots/investigation.png" alt="SENTINEL investigation workspace: finding explorer, relationship graph with evidence, and AI analysis panel" />
        </section>

        <section id="features" className="lp-sec lp-wrap" aria-labelledby="flow-h">
          <h2 id="flow-h" className="lp-h2">One finding, from repository to remediation.</h2>
          <p className="lp-sub">An example from a scan of a public repository, showing how the pieces connect.</p>
          <HeroScene />
        </section>

        <section className="lp-strip lp-wrap" aria-label="What SENTINEL uses">
          <p>Built on</p>
          <ul>{["Bandit", "Semgrep", "Gitleaks", "OSV-Scanner", "AI-assisted investigation"].map((n) => <li key={n}>{n}</li>)}</ul>
        </section>

        <section id="product" className="lp-sec lp-wrap" aria-labelledby="prob-h">
          <div className="lp-split">
            <h2 id="prob-h" className="lp-h2 lp-sticky">Scanners find issues. They rarely explain them.</h2>
            <ul className="lp-problems">
              <li><h3>Four scanners, four formats.</h3><p>Each tool has its own output and severity scale. SENTINEL merges the results and sorts them, so the critical items come first.</p></li>
              <li><h3>Dependency advisories read like noise.</h3><p>A package, an affected version and a list of identifiers is the whole story. SENTINEL shows exactly that and never invents a source line for a manifest.</p></li>
              <li><h3>AI explanations can sound right and be wrong.</h3><p>Every AI claim is compared with what the scanners reported, and the result is shown beside it.</p></li>
            </ul>
          </div>
        </section>

        <section id="how" className="lp-sec lp-wrap" aria-labelledby="how-h">
          <h2 id="how-h" className="lp-h2">From repository to evidence in five steps.</h2>
          <div className="lp-trace" ref={how}>
            <div className="lp-rail" aria-hidden="true"><motion.i style={{ height: traceH }} /></div>
            <ol>
              {STAGES.map((s, i) => (
                <motion.li key={s.t} initial={{ opacity: 0.4 }} whileInView={{ opacity: 1 }} viewport={{ margin: "-35% 0px -35% 0px" }} transition={{ duration: 0.3 }}>
                  <span className="lp-dot" aria-hidden="true">{i + 1}</span><div><h3>{s.t}</h3><p>{s.d}</p></div>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lp-sec lp-wrap" aria-labelledby="scan-h">
          <div className="lp-split lp-split-r">
            <div>
              <h2 id="scan-h" className="lp-h2">Multi-scanner intelligence.</h2>
              <p className="lp-sub">Each scanner covers a different part of a repository. SENTINEL runs all four and says so when one is skipped or fails.</p>
            </div>
            <table className="lp-matrix">
              <thead><tr><th scope="col">Scanner</th><th scope="col">What it looks for</th></tr></thead>
              <tbody>{MATRIX.map(([n, d]) => <tr key={n}><th scope="row">{n}</th><td>{d}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section id="evidence" className="lp-sec lp-wrap" aria-labelledby="show-h">
          <h2 id="show-h" className="lp-h2">Evidence-backed AI investigation.</h2>
          <p className="lp-sub">Scanner facts and AI interpretation are kept apart, and every AI claim carries a verification result. These are screenshots of SENTINEL running against public repositories.</p>
          <div role="tablist" aria-label="Product screens" className="lp-tabs">
            {SHOTS.map((s) => (
              <button key={s.id} role="tab" id={`tab-${s.id}`} aria-selected={s.id === shot} aria-controls="showcase" onClick={() => setShot(s.id)} className={s.id === shot ? "on" : ""}>
                {s.id === shot && <motion.span layoutId="tabline" className="lp-tabline" aria-hidden="true" />}{s.label}
              </button>
            ))}
          </div>
          <div id="showcase" role="tabpanel" aria-labelledby={`tab-${shot}`}>
            <AnimatePresence mode="wait">
              <motion.div key={cur.id} variants={page} initial="hidden" animate="show" exit="exit">
                <p className="lp-cap">{cur.text}</p>
                <Browser src={cur.src} alt={cur.alt} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="lp-verify">
            <div role="tablist" aria-label="Verification verdicts" className="lp-verdicts">
              {(Object.keys(VERDICTS) ).map((k) => {
                const x = VERDICTS[k];
                return <button key={k} role="tab" aria-selected={k === verdict} className={`${x.cls}${k === verdict ? " on" : ""}`} onClick={() => setVerdict(k)}><x.icon size={15} aria-hidden="true" />{x.name}</button>;
              })}
            </div>
            <div role="tabpanel" className={`lp-claim ${v.cls}`} aria-live="polite">
              <div className="lp-lane"><b>Scanner observed</b><p>{v.evidence}</p></div>
              <div className="lp-lane ai"><b>AI claimed</b><p>{v.claim}</p></div>
              <p className="lp-says"><v.icon size={17} aria-hidden="true" /><span><b>{v.name}.</b> {v.says}</span></p>
            </div>
            <p className="lp-note">Example for illustration. Verification checks that AI claims cite real scanner evidence. It does not show that an application is secure.</p>
          </div>
        </section>

        <section className="lp-sec lp-wrap" aria-labelledby="dep-h">
          <div className="lp-split lp-split-r">
            <div>
              <h2 id="dep-h" className="lp-h2">Dependency intelligence.</h2>
              <p className="lp-sub">For a vulnerable package SENTINEL shows the package, the affected version, the ecosystem, the manifest and the advisory identifiers, and says outright that there is no source line.</p>
            </div>
            <figure className="lp-code" aria-label="Example dependency finding">
              <figcaption>From a scan of anxolerd/dvpwa</figcaption>
              <pre><code>{`aiohttp 3.5.3   PyPI
manifest   requirements.txt
source     none (manifest-level finding)
known vulnerabilities   53 (max CVSS 9.1)
advisories PYSEC-2026-2102
           GHSA-2g87-pp6c-29x5
           GHSA-9xw5-w5jj-pvcg`}</code></pre>
            </figure>
          </div>
        </section>

        <section className="lp-sec lp-wrap" aria-labelledby="fix-h">
          <div className="lp-split lp-split-r">
            <div>
              <h2 id="fix-h" className="lp-h2">Remediation workflow.</h2>
              <p className="lp-sub">Each finding comes with suggested steps, marked as AI-suggested and untested. For dependencies, SENTINEL offers a command that lists available versions. It never edits your repository.</p>
            </div>
            <figure className="lp-code" aria-label="Example remediation command">
              <figcaption>Lists versions only; nothing is changed</figcaption>
              <pre><code>{`pip index versions aiohttp`}</code></pre>
            </figure>
          </div>
        </section>

        <section className="lp-final lp-wrap" aria-labelledby="fin-h">
          <h2 id="fin-h" className="lp-h2">Your next security insight starts here.</h2>
          <p className="lp-sub">Launch a scan, follow the evidence and decide what needs attention.</p>
          <Link to="/new" className="btn lp-btn">Launch SENTINEL</Link>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <div><Link to="/" className="lp-brand"><i aria-hidden="true" />SENTINEL</Link><p>AI-powered code auditor with automated security verification.</p></div>
          <nav aria-label="Product"><Link to="/overview">Overview</Link><Link to="/new">New Scan</Link><Link to="/findings">Findings</Link><Link to="/history">Scan History</Link></nav>
        </div>
        <p className="lp-wrap lp-copy">© {new Date().getFullYear()} SENTINEL</p>
      </footer>
    </div>
  );
}
