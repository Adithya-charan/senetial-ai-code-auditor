

export const SEV_ORDER = ["Critical", "High", "Medium", "Low", "Info"];
export const sevRank = (s) => {
  const i = SEV_ORDER.indexOf(s);
  return i < 0 ? 99 : i;
};
export const SEV_COLOR = {
  Critical: "#F05B70", High: "#F29B58", Medium: "#E9C46A", Low: "#6FA5ED", Info: "#A1AABC",
};
export const SEV_HEADLINE = {
  Critical: "Critical security issue detected", High: "High-severity security issue detected",
  Medium: "Medium-severity security issue detected", Low: "Low-severity security issue detected",
  Info: "Informational finding",
};


export const VERIF = {
  SUPPORTED: {
    label: "Supported", color: "#53C7A4", short: "AI claims cite real scanner evidence",
    explain: "The AI claims are supported by the available scanner evidence: every claim cites evidence that exists for this finding.",
  },
  UNCERTAIN: {
    label: "Uncertain", color: "#E9C46A", short: "Evidence insufficient or ambiguous",
    explain: "The available evidence is insufficient or ambiguous. Some AI claims could not be tied to scanner evidence, or none were made.",
  },
  UNSUPPORTED: {
    label: "Unsupported", color: "#F29B58", short: "AI claims not backed by evidence",
    explain: "One or more AI claims cannot be verified against the evidence. Treat the AI explanation as unconfirmed.",
  },
  SCANNER_CONFIRMED: {
    label: "Scanner only", color: "#6FA5ED", short: "Reported by a scanner, no AI analysis",
    explain: "A scanner reported this finding. No AI analysis was produced or verified for it.",
  },
  NOT_EVALUATED: {
    label: "Not evaluated", color: "#A1AABC", short: "Not evaluated",
    explain: "This finding has not been evaluated.",
  },
};
export const verifMeta = (s) => VERIF[s] ?? VERIF.NOT_EVALUATED;

export const SCANNERS = ["bandit", "semgrep", "gitleaks", "osv-scanner"];
export const SCANNER_LABEL = {
  bandit: "Bandit", semgrep: "Semgrep", gitleaks: "Gitleaks", "osv-scanner": "OSV-Scanner",
};

 
export function toolStatus(v) {
  if (!v) return { kind: "norun", label: "Not run" };
  if (v === "completed") return { kind: "completed", label: "Completed" };
  if (v.startsWith("skipped")) return { kind: "skipped", label: "Skipped", detail: v.replace(/^skipped:?\s*/, "") };
  if (v === "not implemented") return { kind: "unimplemented", label: "Not implemented" };
  if (/timeout/i.test(v)) return { kind: "timeout", label: "Timed out" };
  return { kind: "failed", label: "Failed", detail: v.replace(/^failed:?\s*/, "") };
}

export function sevCounts(findings) {
  const c = {};
  for (const f of findings) c[f.severity] = (c[f.severity] ?? 0) + 1;
  return c;
}

export function sortFindings(findings) {
  return [...findings].sort((a, b) => sevRank(a.severity) - sevRank(b.severity));
}

export const basename = (p) => p.split("/").pop() ?? p;
export const locationOf = (f) =>
  f.file_path + (f.start_line ? `:${f.start_line}` : "");

/** OSV findings carry package facts only in the scanner title/description; parse, never guess. */
export function parseOsv(f) {
  const t = /^(.+?) (\S+) has (\d+) known vulnerabilit(?:y|ies) \(max CVSS ([\d.]+)\)$/.exec(f.title);
  const ids = /advisories:\s*(.+)$/.exec(f.description ?? "")?.[1]?.split(",").map((s) => s.trim()).filter(Boolean);
  const eco = /^(\S+) dependency/.exec(f.description ?? "")?.[1];
  return t
    ? { name: t[1], version: t[2], count: Number(t[3]), cvss: t[4], ids: ids ?? [], ecosystem: eco ?? null }
    : null;
}


export function parseExcerpt(excerpt) {
  if (!excerpt) return [];
  return excerpt.split("\n").map((l) => {
    const m = /^(\d+): ?(.*)$/.exec(l);
    return m ? { n: Number(m[1]), text: m[2] } : { n: 0, text: l };
  });
}

export const LANG_BY_EXT = {
  py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  json: "json", yml: "yaml", yaml: "yaml", sh: "bash", html: "xml", xml: "xml", css: "css",
  sql: "sql", txt: "plaintext", jinja2: "xml",
};
export const langOf = (path) => LANG_BY_EXT[path.split(".").pop()?.toLowerCase() ?? ""] ?? "plaintext";

export function scanTitle(scan) {
  return scan.repository_name;
}


export const STATE_LABEL = {
  pending: "Pending", running: "Running", completed: "Completed", failed: "Failed",
  skipped: "Skipped", timeout: "Timed out", unknown: "Unavailable",
};
export const SEV_ICON = { Critical: "!!", High: "!", Medium: "◆", Low: "●", Info: "i" };

/** Per-scanner state. Per-tool results are only stored when a scan ends; until then say so honestly. */
export function scannerStates(scan) {
  return SCANNERS.map((id) => {
    let state = "unknown", detail = "Status unavailable";
    if (scan) {
      if (scan.coverage?.tools) {
        const t = toolStatus(scan.coverage.tools[id]);
        state = t.kind === "completed" ? "completed" : t.kind === "failed" ? "failed" : t.kind === "timeout" ? "timeout"
          : t.kind === "skipped" || t.kind === "unimplemented" ? "skipped" : "unknown";
        detail = t.detail ?? (t.kind === "norun" ? "Did not run" : "");
      } else if (["QUEUED", "ACQUIRING", "DISCOVERING"].includes(scan.status)) { state = "pending"; detail = "Waiting for the repository"; }
      else { detail = "Scanning; per-scanner results are reported when the scan ends"; }
    }
    return { id, label: SCANNER_LABEL[id], state, detail };
  });
}
