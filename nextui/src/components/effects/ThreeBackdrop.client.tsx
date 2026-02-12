"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import styles from "./ThreeBackdrop.module.css";

function Orb() {
  const orb = useRef<Mesh>(null);

  useFrame((state) => {
    if (!orb.current) {
      return;
    }
    orb.current.rotation.y = state.clock.getElapsedTime() * 0.35;
    orb.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.2;
  });

  return (
    <mesh ref={orb} position={[0, 0.15, 0]}>
      <icosahedronGeometry args={[1.2, 12]} />
      <meshStandardMaterial color="#46d3ff" wireframe />
    </mesh>
  );
}

export function ThreeBackdrop() {
  return (
    <div className={styles.shell} aria-hidden>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.25} />
        <directionalLight position={[2, 3, 3]} intensity={0.9} color="#8afff4" />
        <Orb />
      </Canvas>
    </div>
  );
}

