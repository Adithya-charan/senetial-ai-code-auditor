import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useRef } from "react";





const RADII = [1.5, 2.3, 3.1];
const TILT = [0.35, -0.25, 0.15];

function Satellite({ n, active, animate, onHover, onSelect }) {
  const orbit = useRef(null);
  const body = useRef(null);
  useFrame((_, dt) => {
    if (animate && orbit.current) orbit.current.rotation.y += dt * (n.speed ?? 0.18) * (n.ring % 2 ? -1 : 1);
    if (body.current) body.current.scale.setScalar(body.current.scale.x + ((active ? 1.5 : 1) - body.current.scale.x) * 0.2);
  });
  const r = RADII[n.ring];
  return (
    <group rotation={[TILT[n.ring], 0, 0]}>
      <group ref={orbit} rotation={[0, n.angle, 0]}>
        <lineSegments>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0, r, 0, 0]), 3]} /></bufferGeometry>
          <lineBasicMaterial color={n.color} transparent opacity={active ? 0.8 : 0.22} />
        </lineSegments>
        <mesh ref={body} position={[r, 0, 0]}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; onHover(n.id); }}
          onPointerOut={() => { document.body.style.cursor = ""; onHover(null); }}
          onClick={(e) => { e.stopPropagation(); onSelect(n.id); }}>
          <sphereGeometry args={[n.size ?? 0.17, 20, 16]} />
          <meshStandardMaterial color={n.color} emissive={n.color} emissiveIntensity={active ? 1.1 : 0.55} />
        </mesh>
      </group>
    </group>
  );
}

function Core({ animate }) {
  const g = useRef(null);
  useFrame((s, dt) => {
    const grp = g.current; if (!grp || !animate) return;
    grp.rotation.y += dt * 0.12;
    grp.rotation.x += (-s.pointer.y * 0.25 - grp.rotation.x) * 0.04;
  });
  return (
    <group ref={g}>
      <mesh><icosahedronGeometry args={[0.78, 2]} /><meshStandardMaterial color="#0b1730" metalness={0.5} roughness={0.35} flatShading /></mesh>
      <mesh scale={1.03}><icosahedronGeometry args={[0.78, 1]} /><meshBasicMaterial color="#42d8e7" wireframe transparent opacity={0.35} /></mesh>
      <mesh scale={1.35}><sphereGeometry args={[0.78, 24, 18]} /><meshBasicMaterial color="#9275ff" transparent opacity={0.07} /></mesh>
    </group>
  );
}

export default function CoreCanvas({ nodes, activeId, animate, frameloop, onHover, onSelect }) {
  const rings = useRef(null);
  return (
    <Canvas frameloop={frameloop} dpr={[1, 1.5]} camera={{ position: [0, 2.8, 8.6], fov: 42 }} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} style={{ background: "transparent" }}
      onPointerMissed={() => onHover(null)}>
      <ambientLight intensity={0.8} />
      <pointLight position={[4, 3, 4]} intensity={45} color="#9275ff" />
      <pointLight position={[-4, -2, 3]} intensity={28} color="#42d8e7" />
      {animate && <Stars radius={30} depth={20} count={700} factor={2.2} saturation={0} fade speed={0.4} />}
      <group ref={rings}>
        <Core animate={animate} />
        {RADII.map((r, i) => (
          <mesh key={r} rotation={[Math.PI / 2 + TILT[i], 0, 0]}><torusGeometry args={[r, 0.006, 6, 120]} /><meshBasicMaterial color="#5a6d96" transparent opacity={0.45} /></mesh>
        ))}
        {nodes.map((n) => <Satellite key={n.id} n={n} active={activeId === n.id} animate={animate} onHover={onHover} onSelect={onSelect} />)}
      </group>
    </Canvas>
  );
}
