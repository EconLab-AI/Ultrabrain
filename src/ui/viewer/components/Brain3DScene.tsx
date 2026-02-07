import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BrainSceneProps {
  isProcessing: boolean;
}

// Node positions for the neural network
const NODE_POSITIONS: [number, number, number][] = [
  [-0.8, 0.8, 0.3],   // top-left
  [0.8, 0.8, 0.3],    // top-right
  [-1.0, 0, 0.2],     // mid-left
  [1.0, 0, 0.2],      // mid-right
  [-0.8, -0.8, 0.3],  // bottom-left
  [0.8, -0.8, 0.3],   // bottom-right
  [-0.5, 0.4, -0.4],  // inner-left-top
  [0.5, 0.4, -0.4],   // inner-right-top
  [-0.5, -0.4, -0.4], // inner-left-bottom
  [0.5, -0.4, -0.4],  // inner-right-bottom
  [0, 0.6, 0.5],      // top-center
  [0, -0.6, 0.5],     // bottom-center
];

// Connections between nodes (pairs of indices)
const CONNECTIONS: [number, number][] = [
  [0, 6], [1, 7], [2, 8], [3, 9],
  [4, 8], [5, 9], [6, 7], [8, 9],
  [0, 10], [1, 10], [10, 11],
  [4, 11], [5, 11], [6, 8], [7, 9],
  [2, 6], [3, 7], [0, 2], [1, 3],
  [2, 4], [3, 5],
];

function BrainHemisphere({ side }: { side: 'left' | 'right' }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const isLeft = side === 'left';

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.85, 32, 24,
      isLeft ? Math.PI / 2 : 0,
      Math.PI,
      0,
      Math.PI
    );

    // Displace vertices to create brain-like folds
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Create sulci (folds) using sine waves
      const fold1 = Math.sin(y * 6) * 0.04;
      const fold2 = Math.sin(y * 3 + x * 2) * 0.03;
      const fold3 = Math.cos(z * 4 + y * 2) * 0.025;

      const r = Math.sqrt(x * x + y * y + z * z);
      if (r > 0) {
        const displacement = fold1 + fold2 + fold3;
        const scale = 1 + displacement / r;
        pos.setXYZ(i, x * scale, y * scale, z * scale);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, [isLeft]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[isLeft ? -0.08 : 0.08, 0, 0]}
    >
      <meshStandardMaterial
        color="#e0e0e0"
        roughness={0.65}
        metalness={0.15}
        transparent
        opacity={isLeft ? 0.92 : 0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function NeuralConnection({ start, end, index }: {
  start: [number, number, number];
  end: [number, number, number];
  index: number;
}) {
  const lineRef = useRef<THREE.Line>(null!);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const points = [
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
    ];
    geo.setFromPoints(points);
    return geo;
  }, [start, end]);

  useFrame(({ clock }) => {
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      const t = clock.getElapsedTime();
      mat.opacity = 0.12 + Math.sin(t * 1.5 + index * 0.7) * 0.08;
    }
  });

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
    </line>
  );
}

function NeuralNode({ position, radius }: {
  position: [number, number, number];
  radius: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 12, 12]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.3}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function CenterCore() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const t = clock.getElapsedTime();
      mat.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.5}
        transparent
        opacity={0.95}
      />
    </mesh>
  );
}

function BrainGroup({ isProcessing }: { isProcessing: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (groupRef.current) {
      const speed = isProcessing ? 0.012 : 0.003;
      groupRef.current.rotation.y += speed;
    }
  });

  return (
    <group ref={groupRef}>
      <BrainHemisphere side="left" />
      <BrainHemisphere side="right" />

      {CONNECTIONS.map(([startIdx, endIdx], i) => (
        <NeuralConnection
          key={`conn-${i}`}
          start={NODE_POSITIONS[startIdx]}
          end={NODE_POSITIONS[endIdx]}
          index={i}
        />
      ))}

      {NODE_POSITIONS.map((pos, i) => (
        <NeuralNode
          key={`node-${i}`}
          position={pos}
          radius={i < 6 ? 0.04 : 0.03}
        />
      ))}

      <CenterCore />
    </group>
  );
}

export default function Brain3DScene({ isProcessing }: BrainSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.8], fov: 40 }}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 2, 3]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-2, -1, 2]} intensity={0.4} color="#cccccc" />
      <BrainGroup isProcessing={isProcessing} />
    </Canvas>
  );
}
