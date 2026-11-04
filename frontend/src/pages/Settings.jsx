import { api } from "../api";
import { useLoad } from "../hooks";
import { SCANNER_LABEL, SCANNERS } from "../investigation/util";
import { osReducedMotion, setAnimPref, useAnimPref } from "../prefs";
import { hasWebGL } from "../three/support";

const SCANNER_INFO = {
  bandit: "Python security analysis.", semgrep: "Rule-based code analysis.", gitleaks: "Secret detection.", "osv-scanner": "Dependency vulnerability analysis.",
};

export default function Settings() {
  const pref = useAnimPref();
  const { data: health, error } = useLoad(api.health, []);
  const os = osReducedMotion();
  return (
    <>
      <h1 className="page-h1">Settings</h1>
      <p className="lede">Preferences are stored in this browser only. Only settings the application supports are shown.</p>

      <div className="set">
        <section aria-labelledby="s-gen">
          <h2 id="s-gen">General</h2>
          <fieldset>
            <legend>Decorative animation</legend>
            <label className="row"><input type="radio" name="anim" checked={pref === "auto"} onChange={() => setAnimPref("auto")} /> Follow system setting</label>
            <label className="row"><input type="radio" name="anim" checked={pref === "off"} onChange={() => setAnimPref("off")} /> Turn off decorative animation</label>
          </fieldset>
          <p className="muted small" role="status">
            {os ? "Your system requests reduced motion, so animation is off regardless of this setting. " : ""}
            Turning animation off stops 3D rotation and pointer movement. All information stays available as text.
          </p>
        </section>

        <section aria-labelledby="s-ai">
          <h2 id="s-ai">AI investigation</h2>
          <p className="muted">AI explanations are chosen for each scan on the New Scan page and are on by default. Every explanation is compared with scanner evidence and labelled Supported, Uncertain or Unsupported.</p>
        </section>

        <section aria-labelledby="s-scn">
          <h2 id="s-scn">Scanners</h2>
          <ul className="set-list">
            {SCANNERS.map((s) => <li key={s}><strong>{SCANNER_LABEL[s]}</strong><span className="muted">{SCANNER_INFO[s]}</span></li>)}
          </ul>
          <p className="faint small">All four run on every scan and cannot be switched off individually.</p>
        </section>

        <section aria-labelledby="s-app">
          <h2 id="s-app">Appearance</h2>
          <p className="muted">SENTINEL uses a single dark space theme. There is no theme switch.</p>
        </section>

        <section aria-labelledby="s-st">
          <h2 id="s-st">Application status</h2>
          <ul className="set-list">
            <li><strong>API and database</strong>
              {health ? <span className="t-completed">Connected ({health.database})</span> : error ? <span className="t-failed">Unreachable: {error}</span> : <span className="muted">Checking…</span>}</li>
            <li><strong>3D graphics</strong><span className={hasWebGL() ? "t-completed" : "t-skipped"}>{hasWebGL() ? "WebGL available" : "WebGL unavailable; 2D views are used"}</span></li>
            <li><strong>Repository input</strong><span className="muted">GitHub URLs only. ZIP upload is not available.</span></li>
          </ul>
        </section>
      </div>
    </>
  );
}
