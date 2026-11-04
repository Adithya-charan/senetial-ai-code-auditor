import { animate, MotionConfig, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAnimate } from "./prefs";

/** Applies the user's motion preference (OS setting or the in-app switch) to every framer-motion component. */
export function MotionRoot({ children }) {
  const animated = useAnimate();
  return <MotionConfig reducedMotion={animated ? "user" : "always"}>{children}</MotionConfig>;
}

/** Counts up to a real value; with reduced motion it renders the value at once. */
export function Counter({ value, suffix = "" }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const animated = useAnimate();
  const [shown, setShown] = useState(reduce || !animated ? value : 0);
  useEffect(() => {
    if (!seen) return;
    if (reduce || !animated) { setShown(value); return; }
    const c = animate(0, value, { duration: 0.8, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [seen, value, reduce, animated]);
  return <span ref={ref}><span aria-hidden="true">{shown}{suffix}</span><span className="sr-only">{value}{suffix}</span></span>;
}
