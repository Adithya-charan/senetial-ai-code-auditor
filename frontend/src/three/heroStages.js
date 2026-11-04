/** The flow the landing hero illustrates: a repository is scanned, a vulnerability is found, evidence backs it, remediation follows. Illustration only; no live data. */


export const HERO_STAGES = [
  { id: "repo", label: "Repository", color: "#A1AABC", pos: [-2.7, 0.9] },
  { id: "scan", label: "Scanners", color: "#53C8D8", pos: [0, 0] },
  { id: "vuln", label: "Vulnerability", color: "#F05B70", pos: [2.1, 1.35] },
  { id: "evidence", label: "Evidence", color: "#53C7A4", pos: [2.7, -0.7] },
  { id: "fix", label: "Remediation", color: "#8B7CFF", pos: [0.5, -2.0] },
];

export const HERO_EDGES = [["repo", "scan"], ["scan", "vuln"], ["vuln", "evidence"], ["evidence", "fix"]];
