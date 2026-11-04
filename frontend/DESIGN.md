# SENTINEL — Frontend Design

Status (honest): Design system, Landing and Security Overview are redesigned and rendered. The Investigation workspace markup is redesigned (explorer, graph, header, AI panel labels) but its stylesheet rewrite, the remaining pages' consistency pass, and final validation are still in progress.

## 1. Direction
Premium, minimal, technical. Principles taken from Linear, Vercel, Sentry, Stripe, Raycast, Datadog, Grafana, GitHub: hairlines instead of boxes, one accent, dense but calm data, evidence always distinguishable from AI inference. No neon, glow, gaming or crypto styling; no decorative 3D.

## 2. Design tokens (`src/styles.css`)
| Role | Token | Value |
|---|---|---|
| Background | `--bg` | #090b10 |
| Sidebar | `--sidebar` | #0d1018 |
| Surface | `--card` / `--elev` | #141925 / #1a2030 |
| Lines | `--line` / `--line-soft` | #222a3b / #1a2130 |
| Text | `--text` / `--muted` / `--faint` | #f3f5fa / #a1aabc / #7f8ba3 |
| Accent | `--primary` | #8b7cff |
| Info | `--blue`, `--cyan` | #6fa5ed, #53c8d8 |
| Success / verified | `--verified` | #53c7a4 |
| Severity | Critical / High / Medium / Low | #f05b70 / #f29b58 / #e9c46a / #6fa5ed |

Type: Geist (UI) and Geist Mono (code, IDs). Scale: display clamp(38–62px), title 24, section 15, body 14, small 13, meta 12.
Spacing scale: 4, 8, 12, 16, 24, 32, 48, 72. Radius 8px (14px for the hero demo window).
Severity and verification are always a glyph plus a word, never colour alone.
Motion: framer-motion, subtle (selection, panel expand, page transitions); reduced-motion honoured globally; no continuous background animation.

## 3. Screens

### Landing `/`
- Nav: wordmark, anchor links, "Start a Security Scan".
- Hero: headline "See the vulnerabilities hiding in your code." with lede and CTAs "Start a Security Scan" / "Explore the Platform". Right side is a product demonstration, not a 3D sphere: a five-stage pipeline (Repository → Scanners → Vulnerability → Evidence → Remediation) using real example data (aiohttp 3.5.3, 53 known vulnerabilities, CVSS 9.1), stages light up in sequence via CSS.
- Credibility strip: the four real scanners plus AI-assisted investigation. No invented customers or statistics.
- Sections, each with a different layout: problem (sticky split with hairline list), five-step scroll-filled trace, multi-scanner table, evidence-backed AI investigation (tabbed product screenshots plus a Supported / Uncertain / Unsupported verdict explainer), dependency intelligence and remediation (code blocks), final CTA, footer.

### Shell (all app pages)
Compact collapsible sidebar (Overview, New Scan, Findings, Scan History, Settings), violet marker on the active item, tooltips when collapsed, status and collapse control in the footer, drawer on mobile.

### Security Overview `/overview`
- Header "Security Overview" with scan picker and a non-dominant "New Security Scan" button.
- Metrics band (Total scans, Total findings, Critical, High, Scanner coverage): one band with hairline dividers and large numerals, not five boxed cards.
- Severity stacked bar plus legend with counts and percentages; second bar for AI explanations by evidence (Supported / Scanner-confirmed / Uncertain / Unsupported) with one-line explanations.
- Scanner monitoring list with real backend states (completed, running, skipped, failed).
- "Needs attention": critical findings as rows (severity, title, resource, scanner, verification, Investigate).
- Recent scans as rows. Empty and loading states included.

### New Scan `/new`, Scan Progress `/scans/:id`
Single-column form; progress shows pipeline steps, per-scanner status and (only here) the optional 3D scan scene with a static fallback.

### Findings `/findings`, Finding `/findings/:id`, History `/history`, Settings `/settings`
Borderless tables with hairline rows, filters in one row, severity/verification badges shared with the overview.

### Investigation `/scans/:id/investigate`
Three regions: finding explorer | workspace | AI panel, collapsible and responsive.
- Explorer: "Findings" with count, search, severity chips, scanner and verification selects, findings grouped by severity as compact rows (severity dot, title, file · scanner · verification), animated selected state.
- Workspace: compact header (title, severity, verification, scanner rule, CWE, location), then the relationship graph, then the evidence inspector.
- Graph (real data only): Repository → Manifest/File → Vulnerable dependency/code → Scanner evidence, Advisories, AI Potential impact, AI Remediation. Automatic layered layout, larger nodes, directional arrows, edge labels on the selected node's edges, dashed outline for AI-generated nodes, zoom, pan, fit, reset, keyboard navigation, hover details, selected-node detail with origin label ("Scanner-reported" / "AI-generated") and what it connects to.
- Evidence inspector: source viewer with line numbers, highlighted lines and syntax colouring for code findings; for dependency findings a definition list (package, version, ecosystem, manifest, advisories, vulnerability count, CVSS). Manifest findings never show a fake source line.
- AI panel: six expandable sections (What happened, Why it matters, Confirmed evidence, What remains uncertain, Potential impact, Recommended remediation), each tagged "Scanner" or "AI", with copy actions and monospace commands. Unsupported AI claims are called out explicitly.

## 4. Not yet done / limitations
- Investigation stylesheet rewrite and visual check.
- Consistency pass on Findings, History, Settings, New Scan.
- Fresh screenshots in `public/shots/`, responsive audit at 320–1920px, production build, and tests re-run after the final pass. No frontend unit tests or linter exist.
