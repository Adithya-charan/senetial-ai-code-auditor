import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { BufferGeometry, Vector3, } from "three";
import { HERO_EDGES, HERO_STAGES } from "./heroStages";


const STATE_COLOR = {
  pending: "#626D83", running: "#6FA5ED", completed: "#53C7A4", failed: "#F05B70",
  skipped: "#E9C46A", timeout: "#F29B58", unknown: "#9299AB",
};



/** Thin connection lines between points; geometry is built once per input change. */
function Lines({ pairs, color, opacity = 0.5 }) {
  const geo = useMemo(() => new BufferGeometry().setFromPoints(pairs.flat()), [pairs]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <lineSegments geometry={geo}><lineBasicMaterial color={color} transparent opacity={opacity} /></lineSegments>;
}

/** Pointer parallax + slow spin. Reads refs only; no React state updates per frame. */
function useDrift(group, animate, spin = 0.1) {
  useFrame((s, dt) => {
    const g = group.current;
    if (!g || !animate) return;
    g.rotation.y += dt * spin;
    g.rotation.x += (s.pointer.y * 0.25 - g.rotation.x) * Math.min(1, dt * 2);
  });
}

/** Thin orbital paths; slow rotation only while animating. */
function OrbitalRings({ animate, radii = [1.7, 2.15], tilt = 0.5 }) {
  const g = useRef(null);
  useFrame((_, dt) => { if (animate && g.current) { g.current.rotation.z += dt * 0.08; g.current.rotation.x += dt * 0.03; } });
  return (
    <group ref={g}>
      {radii.map((r, i) => (
        <mesh key={r} rotation={[Math.PI / 2 + i * tilt, i * 0.7, 0]}>
          <torusGeometry args={[r, 0.012, 6, 72]} /><meshBasicMaterial color={i % 2 ? "#6FA5ED" : "#8B7CFF"} transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

/** Low-density particles (drei Sparkles, GPU-animated). Count stays small; skipped entirely when not animating. */
function ParticleField({ animate, count = 28, scale = 6 }) {
  // phones get no particle layer: it costs fill rate and adds nothing the scene needs
  if (!animate || (typeof matchMedia !== "undefined" && matchMedia("(max-width: 700px)").matches)) return null;
  return <Sparkles count={count} scale={scale} size={2} speed={0.25} opacity={0.5} color="#8B7CFF" />;
}

/** A single scanning ring that sweeps through the core while a scan is running. */
function ScanBeam({ active }) {
  const m = useRef(null);
  useFrame((s) => { if (m.current && active) m.current.position.y = Math.sin(s.clock.elapsedTime * 1.2) * 1.2; });
  if (!active) return null;
  return <mesh ref={m} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.25, 0.018, 6, 64]} /><meshBasicMaterial color="#53C8D8" transparent opacity={0.8} /></mesh>;
}

/** Landing hero: the scan pipeline as a small scene. Packets travel along each connection; a ring sweeps through the scanner core. Illustration only, carries no data. */
function Hero({ animate }) {
  const g = useRef(null);
  const packets = useRef([]);
  const pts = useMemo(() => new Map(HERO_STAGES.map((s) => [s.id, new Vector3(s.pos[0], s.pos[1], 0)])), []);
  const pairs = useMemo(() => HERO_EDGES.map(([a, b]) => [pts.get(a), pts.get(b)] ), [pts]);
  const placeAt = (t) => {
    packets.current.forEach((m, i) => {
      if (!m) return;
      const e = Math.floor(i / 2), ph = (i % 2) * 0.5;
      const k = (t * 0.28 + ph + e * 0.17) % 1;
      m.position.lerpVectors(pairs[e][0], pairs[e][1], k);
    });
  };
  useFrame((s) => {
    const grp = g.current;
    if (!grp) return;
    if (animate) {
      grp.rotation.y += (s.pointer.x * 0.18 - grp.rotation.y) * 0.05;
      grp.rotation.x += (-s.pointer.y * 0.1 - grp.rotation.x) * 0.05;
      placeAt(s.clock.elapsedTime);
    }
  });
  useEffect(() => { placeAt(0.35); }, []); // static frame when not animating
  return (
    <group ref={g}>
      <Lines pairs={pairs} color="#5C6B8C" opacity={0.7} />
      {pairs.flatMap((_, e) => [0, 1].map((j) => (
        <mesh key={`${e}-${j}`} ref={(m) => { packets.current[e * 2 + j] = m; }}>
          <sphereGeometry args={[0.065, 8, 8]} /><meshBasicMaterial color={HERO_STAGES[e + 1].color} />
        </mesh>
      )))}
      <group>
        <mesh><icosahedronGeometry args={[0.8, 1]} /><meshStandardMaterial color="#111827" metalness={0.6} roughness={0.3} flatShading /></mesh>
        <mesh scale={1.02}><icosahedronGeometry args={[0.8, 1]} /><meshBasicMaterial color="#53C8D8" wireframe transparent opacity={0.4} /></mesh>
        <OrbitalRings animate={animate} radii={[1.25, 1.55]} />
        <ScanBeam active={animate} />
      </group>
      <Html style={{ display: "none" }} aria-hidden="true"><span /></Html>{/* drei drops the first Html it mounts here; this placeholder takes that slot */}
      {HERO_STAGES.map((s) => (
        <group key={s.id} position={[s.pos[0], s.pos[1], 0]}>
          {s.id !== "scan" && <mesh><sphereGeometry args={[0.2, 16, 12]} /><meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.55} /></mesh>}
          <Html center position={[0, s.id === "scan" ? 1.85 : -0.5, 0]} style={{ pointerEvents: "none" }} zIndexRange={[5, 0]}><span className="g3label" aria-hidden="true">{s.label}</span></Html>
        </group>
      ))}
    </group>
  );
}

function Scan({ indicators = [], animate, final }) {
  const g = useRef(null);
  const dots = useRef([]);
  useDrift(g, animate, 0.08);
  const pos = useMemo(() => indicators.map((_, i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    return new Vector3(Math.cos(a) * 2, Math.sin(a) * 1.3, 0);
  }), [indicators]);
  useFrame((s) => {
    if (!animate) return;
    indicators.forEach((ind, i) => {
      const m = dots.current[i];
      if (m && ind.state === "running") m.scale.setScalar(1 + Math.sin(s.clock.elapsedTime * 3) * 0.18);
    });
  });
  const pairs = useMemo(() => pos.map((p) => [new Vector3(), p] ), [pos]);
  return (
    <group ref={g}>
      <mesh><dodecahedronGeometry args={[0.7, 0]} /><meshStandardMaterial color="#111827" flatShading metalness={0.4} roughness={0.4} /></mesh>
      <mesh scale={1.02}><dodecahedronGeometry args={[0.7, 0]} /><meshBasicMaterial color={final === "failed" ? "#F05B70" : final === "partial" ? "#E9C46A" : final === "completed" ? "#53C7A4" : "#6FA5ED"} wireframe transparent opacity={0.6} /></mesh>
      <OrbitalRings animate={animate} radii={[1.1, 1.4]} tilt={0.9} />
      <ScanBeam active={animate && !final} />
      <Lines pairs={pairs} color="#6FA5ED" opacity={0.35} />
      {indicators.map((ind, i) => (
        <mesh key={ind.id} position={pos[i]} ref={(m) => { dots.current[i] = m; }}>
          <sphereGeometry args={[0.24, 16, 12]} />
          <meshStandardMaterial color={STATE_COLOR[ind.state]} emissive={STATE_COLOR[ind.state]} emissiveIntensity={ind.state === "pending" || ind.state === "unknown" ? 0.1 : 0.7} />
        </mesh>
      ))}
    </group>
  );
}

export default function SceneCanvas(p) {
  return (
    <Canvas frameloop={p.frameloop} dpr={[1, 1.5]} camera={{ position: [0, 0, p.scene === "hero" ? 7.5 : 6], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} style={{ background: "transparent" }}>
      <ambientLight intensity={0.7} />
      <pointLight position={[4, 3, 4]} intensity={40} color="#8B7CFF" />
      <pointLight position={[-4, -2, 3]} intensity={25} color="#6FA5ED" />
      {p.scene === "scan" && <Scan indicators={p.indicators} animate={p.animate} final={p.final} />}
      {p.scene === "hero" && <Hero animate={p.animate} />}
      <ParticleField animate={p.animate} />
    </Canvas>
  );
}
