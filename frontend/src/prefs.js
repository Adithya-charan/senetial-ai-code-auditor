import { useSyncExternalStore } from "react";

/** Animation preference: the user can switch decorative motion off; the OS reduced-motion setting always wins. */
 
const KEY = "sentinel.animation";
const listeners = new Set();
const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
mq?.addEventListener("change", () => listeners.forEach((l) => l()));

export function getAnimPref() {
  try { return localStorage.getItem(KEY) === "off" ? "off" : "auto"; } catch { return "auto"; }
}
export function setAnimPref(p) {
  try { localStorage.setItem(KEY, p); } catch { /* storage unavailable: preference lasts for this tab only */ }
  document.documentElement.dataset.motion = p === "off" ? "off" : "auto";
  listeners.forEach((l) => l());
}
if (typeof document !== "undefined") document.documentElement.dataset.motion = getAnimPref() === "off" ? "off" : "auto";

const subscribe = (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const snapshot = () => (getAnimPref() === "off" || mq?.matches ? "still" : "animate");

/** True when continuous decorative animation is allowed. */
export function useAnimate() {
  return useSyncExternalStore(subscribe, snapshot, () => "still") === "animate";
}
export function useAnimPref() {
  return useSyncExternalStore(subscribe, getAnimPref, () => "auto");
}
export const osReducedMotion = () => !!mq?.matches;
