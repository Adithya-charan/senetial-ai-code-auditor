import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useAnimate } from "../prefs";
import { HERO_EDGES, HERO_STAGES } from "./heroStages";
import { hasWebGL } from "./support";

 

















// three.js + react-three-fiber live in their own chunk and load only when a stage scrolls into view.
const SceneCanvas = lazy(() => import("./SceneCanvas"));


/** Static 2D version of the hero: same pipeline, CSS-only flow, no WebGL. */
function HeroFallback() {
  const P = (id) => { const s = HERO_STAGES.find((x) => x.id === id); return [230 + s.pos[0] * 70, 150 - s.pos[1] * 62]; };
  return (
    <svg className="herofb" viewBox="0 0 460 300" aria-hidden="true">
      {HERO_EDGES.map(([a, b]) => { const [x1, y1] = P(a), [x2, y2] = P(b); return <line key={a + b} x1={x1} y1={y1} x2={x2} y2={y2} className="hfe" />; })}
      {HERO_STAGES.map((s) => { const [x, y] = P(s.id); const core = s.id === "scan"; return (
        <g key={s.id}>
          {core && <circle cx={x} cy={y} r="40" className="hfring" />}
          <circle cx={x} cy={y} r={core ? 26 : 9} fill={core ? "#111827" : s.color} stroke={s.color} strokeWidth="2" />
          <text x={x} y={y + (core ? 52 : 26)} textAnchor="middle" className="hft">{s.label}</text>
        </g>
      ); })}
    </svg>
  );
}

export default function Stage3D(props) {
  const { height = 260, label } = props;
  const box = useRef(null);
  const animate = useAnimate();
  const [seen, setSeen] = useState(false);      // mount the canvas only after first visibility
  const [onScreen, setOnScreen] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === "visible");
  const forced3dOff = new URLSearchParams(location.search).get("webgl") === "off"; // test hook for the fallback
  const ok = hasWebGL() && !forced3dOff;

  useEffect(() => {
    const el = box.current;
    if (!el || !ok || !("IntersectionObserver" in window)) { setSeen(true); setOnScreen(true); return; }
    const io = new IntersectionObserver(([e]) => { setOnScreen(e.isIntersecting); if (e.isIntersecting) setSeen(true); });
    io.observe(el);
    return () => io.disconnect();
  }, [ok]);

  useEffect(() => {
    const h = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, []);

  const running = animate && onScreen && pageVisible;
  return (
    <div ref={box} className="stage3d" style={{ height }} role="img" aria-label={label}>
      {ok && seen ? (
        <Suspense fallback={props.scene === "hero" ? <HeroFallback /> : <div className="s3-loading" aria-hidden="true" />}>
          <SceneCanvas {...props} frameloop={running ? "always" : "demand"} animate={running} />
        </Suspense>
      ) : (
        props.scene === "hero" ? <HeroFallback /> : (
          <div className="s3-static" aria-hidden="true">
            <span>{ok ? "" : "3D view unavailable on this device. All details are listed in text."}</span>
          </div>
        )
      )}
    </div>
  );
}
