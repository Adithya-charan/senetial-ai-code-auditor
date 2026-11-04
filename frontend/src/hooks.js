import { useEffect, useState } from "react";

export const RUNNING = new Set(["QUEUED", "ACQUIRING", "DISCOVERING", "SCANNING", "AI_ANALYSIS"]);

/** Fetch on mount/deps change; optionally keep polling while `pollWhile(data)` is true. */
export function useLoad(fn, deps, pollWhile) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true, timer;
    const tick = async () => {
      try {
        const d = await fn();
        if (!alive) return;
        setData(d); setError(null);
        if (pollWhile?.(d)) timer = window.setTimeout(tick, 2000);
      } catch (e) {
        if (!alive) return;
        setError((e ).message);
        timer = window.setTimeout(tick, 5000); // network interruption: retry quietly
      }
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error };
}
