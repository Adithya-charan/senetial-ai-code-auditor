import { useEffect, useMemo, useRef, useState } from "react";

import { langOf, parseExcerpt } from "./util";

// highlight.js core + a few languages, loaded on demand so the main bundle stays small.
let hljsPromise = null;
function loadHljs() {
  hljsPromise ??= (async () => {
    const [core, py, js, ts, json, yaml, bash, xml, css, sql] = await Promise.all([
      import("highlight.js/lib/core"), import("highlight.js/lib/languages/python"),
      import("highlight.js/lib/languages/javascript"), import("highlight.js/lib/languages/typescript"),
      import("highlight.js/lib/languages/json"), import("highlight.js/lib/languages/yaml"),
      import("highlight.js/lib/languages/bash"), import("highlight.js/lib/languages/xml"),
      import("highlight.js/lib/languages/css"), import("highlight.js/lib/languages/sql"),
    ]);
    const h = core.default;
    h.registerLanguage("python", py.default); h.registerLanguage("javascript", js.default);
    h.registerLanguage("typescript", ts.default); h.registerLanguage("json", json.default);
    h.registerLanguage("yaml", yaml.default); h.registerLanguage("bash", bash.default);
    h.registerLanguage("xml", xml.default); h.registerLanguage("css", css.default);
    h.registerLanguage("sql", sql.default);
    return h;
  })();
  return hljsPromise;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default function SourceCodeViewer({ finding }) {
  const lines = useMemo(() => parseExcerpt(finding.excerpt), [finding.excerpt]);
  const [html, setHtml] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(null);
  const box = useRef(null);
  const lang = langOf(finding.file_path);
  const hitFrom = finding.start_line ?? -1, hitTo = finding.end_line ?? hitFrom;

  useEffect(() => {
    let alive = true;
    setHtml(null);
    loadHljs().then((h) => {
      if (!alive) return;
      setHtml(lines.map((l) => {
        try { return lang === "plaintext" ? esc(l.text) : h.highlight(l.text, { language: lang, ignoreIllegals: true }).value; }
        catch { return esc(l.text); }
      }));
    }).catch(() => alive && setHtml(null));
    return () => { alive = false; };
  }, [lines, lang]);

  // Scroll the vulnerable line into view inside the viewer only (never the page).
  useEffect(() => {
    const el = box.current?.querySelector(".cl.hit");
    if (!el || !box.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.current.scrollTo({ top: el.offsetTop - box.current.clientHeight / 2 + el.clientHeight / 2, behavior: reduce ? "auto" : "smooth" });
  }, [html, finding.id]);

  const copy = async (what, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1500); }
    catch { setCopied("failed"); }
  };

  return (
    <section className="code" aria-label="Source code evidence">
      <div className="code-bar">
        <code className="code-path" title={finding.file_path}>{finding.file_path}</code>
        <span className="code-actions">
          <button className="ghost" onClick={() => copy("path", finding.file_path)}>{copied === "path" ? "Copied" : "Copy path"}</button>
          <button className="ghost" onClick={() => copy("code", lines.map((l) => l.text).join("\n"))}>{copied === "code" ? "Copied" : "Copy code"}</button>
          <button className="ghost" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>{expanded ? "Collapse" : "Expand"}</button>
        </span>
      </div>
      <div ref={box} className={`code-scroll${expanded ? " open" : ""}`} tabIndex={0} aria-label="Code excerpt">
        {lines.map((l, i) => {
          const hit = l.n >= hitFrom && l.n <= hitTo && hitFrom > 0;
          return (
            <div key={i} className={`cl${hit ? " hit" : ""}`} aria-label={hit ? "vulnerable line" : undefined}>
              <span className="ln">{l.n || ""}</span>
              {html ? <span className="lt" dangerouslySetInnerHTML={{ __html: html[i] || " " }} /> : <span className="lt">{l.text || " "}</span>}
            </div>
          );
        })}
      </div>
      <p className="code-note">
        Excerpt stored by SENTINEL (limited context around the finding, secrets redacted).
        {hitFrom > 0 && <> Highlighted: line{hitTo > hitFrom ? `s ${hitFrom}–${hitTo}` : ` ${hitFrom}`}.</>}
      </p>
    </section>
  );
}
