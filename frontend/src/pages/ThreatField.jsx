import { useState } from "react";
import { Link } from "react-router-dom";

import { VerificationBadge } from "../investigation/Panels";
import { SCANNER_LABEL, SEV_COLOR, SEV_ORDER, locationOf } from "../investigation/util";

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

/** Every finding is one node of the same size, coloured by severity and grouped into severity bands. Position within a band is cosmetic only; size never encodes importance. */
export default function ThreatField({ rows, repoName }) {
  const [hot, setHot] = useState(null);
  return (
    <div className="tfield space">
      <div className="tf-info" aria-live="polite">
        {hot ? (
          <>
            <span className="tf-sev" style={{ color: SEV_COLOR[hot.severity] }}>{hot.severity}</span>
            <b>{hot.title.length > 120 ? hot.title.slice(0, 119) + "…" : hot.title}</b>
            <span className="faint small"><code>{locationOf(hot)}</code> · {SCANNER_LABEL[hot.scanner] ?? hot.scanner}{repoName ? ` · ${repoName}` : ""}</span>
            <VerificationBadge status={hot.evidence_status} />
          </>
        ) : <span className="faint">Hover or focus a node to see the finding. Select it to open its investigation.</span>}
      </div>
      {SEV_ORDER.map((sev) => {
        const group = rows.filter((f) => f.severity === sev);
        if (!group.length) return null;
        return (
          <section key={sev} className="tf-band" aria-label={`${sev} findings, ${group.length}`}>
            <h2 style={{ color: SEV_COLOR[sev] }}>{sev}<span className="faint"> {group.length}</span></h2>
            <div className="tf-nodes">
              {group.map((f) => (
                <Link key={f.id} to={`/scans/${f.scan_id}/investigate?f=${f.id}`} className={`tf-node${hot?.id === f.id ? " on" : ""}`} style={{ ["--c" ]: SEV_COLOR[sev], ["--dy" ]: `${(hash(f.id) % 9) - 4}px` }}
                  aria-label={`${sev}: ${f.title}. ${locationOf(f)}. ${SCANNER_LABEL[f.scanner] ?? f.scanner}`}
                  onPointerEnter={() => setHot(f)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(f)} onBlur={() => setHot(null)}><i aria-hidden="true" /></Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
