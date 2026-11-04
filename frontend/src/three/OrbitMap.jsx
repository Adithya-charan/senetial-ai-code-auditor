








const CX = 320, CY = 250, RX = [120, 190, 262], RY = [74, 118, 160];

/** Accessible 2D orbital map. Each node is a real button: keyboard focusable, announces its label and value, and does what the parent's onSelect does. */
export default function OrbitMap({ nodes, coreLabel, coreSub, coreColor = "#9275ff", ariaLabel, activeId, onSelect, onHover }) {
  const pos = (n) => ({ x: CX + RX[n.ring] * Math.cos((n.angle * Math.PI) / 180), y: CY + RY[n.ring] * Math.sin((n.angle * Math.PI) / 180) });
  return (
    <svg className="omap" viewBox="0 0 640 500" role="group" aria-label={ariaLabel}>
      <defs>
        <radialGradient id="omcore" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor={coreColor} stopOpacity=".5" /><stop offset="1" stopColor={coreColor} stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx={CX} cy={CY} rx="150" ry="110" fill="url(#omcore)" />
      {RX.map((rx, i) => <ellipse key={rx} cx={CX} cy={CY} rx={rx} ry={RY[i]} className="om-ring" />)}
      {nodes.map((n) => { const p = pos(n); return <line key={n.id} x1={CX} y1={CY} x2={p.x} y2={p.y} className={`om-spoke${activeId === n.id ? " on" : ""}`} />; })}
      <g className="om-core" aria-hidden="true">
        <circle cx={CX} cy={CY} r="52" fill="#0a1020" stroke={coreColor} strokeOpacity=".7" />
        <circle cx={CX} cy={CY} r="60" className="om-halo" stroke={coreColor} />
        <text x={CX} y={CY - 2} textAnchor="middle" className="om-ct">{coreLabel}</text>
        {coreSub && <text x={CX} y={CY + 16} textAnchor="middle" className="om-cs">{coreSub}</text>}
      </g>
      {nodes.map((n) => {
        const p = pos(n), on = activeId === n.id;
        return (
          <g key={n.id} className={`om-node${on ? " on" : ""} s-${n.state ?? "done"}`} transform={`translate(${p.x} ${p.y})`} role="button" tabIndex={0}
            aria-label={`${n.label}${n.value !== undefined ? `: ${n.value}` : ""}${n.sub ? `, ${n.sub}` : ""}`} aria-pressed={on}
            onClick={() => onSelect(n.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(n.id); } }}
            onPointerEnter={() => onHover?.(n.id)} onPointerLeave={() => onHover?.(null)} onFocus={() => onHover?.(n.id)} onBlur={() => onHover?.(null)}>
            <circle r="34" className="om-hit" />
            {n.state === "running" && <circle r="30" className="om-pulse" stroke={n.color} />}
            <circle r={n.value !== undefined ? 27 : 21} className="om-dot" stroke={n.color} fill={`color-mix(in srgb, ${n.color} 18%, #0a1020)`} />
            {n.value !== undefined && <text className="om-v" y="6" textAnchor="middle">{n.value}</text>}
            <text className="om-l" y={n.value !== undefined ? 48 : 40} textAnchor="middle">{n.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
