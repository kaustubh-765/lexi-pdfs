'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';

function CentralOrb() {
  return (
    <Sphere args={[1, 64, 64]}>
      <MeshDistortMaterial
        color="#6366f1"
        distort={0.4}
        speed={2}
        roughness={0.1}
        metalness={0.3}
        emissive="#4338ca"
        emissiveIntensity={0.3}
      />
    </Sphere>
  );
}

function PdfBox({ angle, radius }: { angle: number; radius: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const currentAngle = angle + t * 0.3;
    meshRef.current.position.x = Math.cos(currentAngle) * radius;
    meshRef.current.position.z = Math.sin(currentAngle) * radius;
    meshRef.current.rotation.y = t * 0.5;
    meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.3, 0.4, 0.05]} />
        <meshStandardMaterial
          color="#8b5cf6"
          roughness={0.2}
          metalness={0.5}
          emissive="#7c3aed"
          emissiveIntensity={0.2}
          transparent
          opacity={0.8}
        />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} color="#6366f1" intensity={2} />
      <pointLight position={[-5, -3, -5]} color="#22d3ee" intensity={1.5} />

      <CentralOrb />

      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => (
        <PdfBox key={i} angle={angle} radius={2.2} />
      ))}

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade />
    </>
  );
}

export function PdfOrb3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >
      <Scene />
    </Canvas>
  );
}
