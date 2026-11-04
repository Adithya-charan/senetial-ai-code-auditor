let webgl = null;
/** Cheap WebGL capability check; lives outside the lazy 3D chunk so Settings can use it. */
export function hasWebGL() {
  if (webgl === null) {
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { webgl = false; }
  }
  return webgl;
}
