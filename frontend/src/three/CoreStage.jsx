import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useAnimate } from "../prefs";

import { hasWebGL } from "./support";

// three.js and react-three-fiber load in their own chunk, only once the stage is visible and WebGL exists.
const CoreCanvas = lazy(() => import("./CoreCanvas"));



export default function CoreStage({ nodes, activeId, onHover, onSelect, fallback, label, className }) {
  const box = useRef(null);
  const animate = useAnimate();
  const [seen, setSeen] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const forcedOff = new URLSearchParams(location.search).get("webgl") === "off";
  const ok = hasWebGL() && !forcedOff;

  useEffect(() => {
    const el = box.current;
    if (!el || !ok || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => { setOnScreen(e.isIntersecting); if (e.isIntersecting) setSeen(true); });
    io.observe(el);
    return () => io.disconnect();
  }, [ok]);

  return (
    <div ref={box} className={`corestage ${className ?? ""}`} role="group" aria-label={label}>
      {ok && seen ? (
        <Suspense fallback={fallback}>
          <CoreCanvas nodes={nodes} activeId={activeId} animate={animate && onScreen} frameloop={animate && onScreen ? "always" : "demand"} onHover={onHover} onSelect={onSelect} />
        </Suspense>
      ) : fallback}
    </div>
  );
}
