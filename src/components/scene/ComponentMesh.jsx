import { useMemo } from 'react';
import * as THREE from 'three';
import { useCircuitStore } from '../../store/circuitStore.js';

function ResistorMesh({ length }) {
  const bandPositions = [-0.32, -0.12, 0.08, 0.28];
  const notches = [-0.36, -0.18, 0, 0.18, 0.36];

  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, Math.max(length, 1.2), 24]} />
        <meshStandardMaterial color="#d8b16a" roughness={0.55} />
      </mesh>
      {notches.map((x, index) => (
        <mesh
          key={`notch-${x}`}
          position={[x, 0.125, 0]}
          rotation={[0, 0, index % 2 === 0 ? 0.65 : -0.65]}
        >
          <boxGeometry args={[0.22, 0.018, 0.035]} />
          <meshStandardMaterial color="#8e6a3a" roughness={0.7} />
        </mesh>
      ))}
      {bandPositions.map((x, index) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.124, 0.124, 0.035, 20]} />
          <meshStandardMaterial
            color={['#2b2118', '#8f2f21', '#f3d55b', '#2c5fd7'][index]}
            roughness={0.42}
          />
        </mesh>
      ))}
    </group>
  );
}

function CapacitorMesh() {
  return (
    <group>
      <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.035, 36]} />
        <meshStandardMaterial color="#92a5bd" metalness={0.75} roughness={0.2} />
      </mesh>
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.035, 36]} />
        <meshStandardMaterial color="#6f8299" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function InductorMesh({ length }) {
  const geometry = useMemo(() => {
    const turns = 6;
    const samples = 140;
    const radius = 0.25;
    const coilLength = Math.max(length, 1.2);
    const points = Array.from({ length: samples }, (_, index) => {
      const t = index / (samples - 1);
      const angle = t * Math.PI * 2 * turns;
      return new THREE.Vector3(
        (t - 0.5) * coilLength,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
      );
    });

    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      samples,
      0.035,
      10,
      false,
    );
  }, [length]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#cc7a2f" metalness={0.8} roughness={0.22} />
    </mesh>
  );
}

function VoltageMesh() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.32, 36, 36]} />
        <meshStandardMaterial
          color="#ffb24a"
          emissive="#7a3d00"
          emissiveIntensity={1.4}
          roughness={0.24}
        />
      </mesh>
      <pointLight color="#ffb24a" intensity={3} distance={2.8} />
    </group>
  );
}

function CurrentMesh() {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.28, 0.035, 12, 42]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#005c32"
          emissiveIntensity={1}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.09, 0.18, 24]} />
        <meshStandardMaterial color="#00ff88" emissive="#005c32" />
      </mesh>
    </group>
  );
}

function TransistorMesh() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.5, 0.28, 0.42]} />
        <meshStandardMaterial color="#2d3447" metalness={0.3} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[0.34, 0.055, 0.28]} />
        <meshStandardMaterial color="#9aa5bd" metalness={0.45} roughness={0.25} />
      </mesh>
      {[-0.18, 0, 0.18].map((z) => (
        <mesh key={z} position={[0.34, -0.02, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.36, 10]} />
          <meshStandardMaterial color="#d7dcea" metalness={0.65} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function GroundMesh() {
  return (
    <mesh rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[0.28, 0.48, 4]} />
      <meshStandardMaterial color="#9ca3af" metalness={0.35} roughness={0.32} />
    </mesh>
  );
}

function UnknownMesh() {
  return (
    <mesh>
      <boxGeometry args={[0.56, 0.24, 0.56]} />
      <meshStandardMaterial color="#8b8fb8" roughness={0.42} />
    </mesh>
  );
}

export default function ComponentMesh({ component }) {
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const setCameraTarget = useCircuitStore((s) => s.setCameraTarget);

  const position = [
    component.worldPosition.x,
    component.worldPosition.y,
    component.worldPosition.z,
  ];

  const handleClick = (e) => {
    e.stopPropagation();
    selectComponent(component.id);
    setCameraTarget(component.worldPosition);
  };

  return (
    <group position={position} rotation={[0, component.worldRotationY, 0]} onClick={handleClick}>
      {component.type === 'resistor' ? (
        <ResistorMesh length={component.worldLength} />
      ) : null}
      {component.type === 'capacitor' ? <CapacitorMesh /> : null}
      {component.type === 'inductor' ? (
        <InductorMesh length={component.worldLength} />
      ) : null}
      {component.type === 'voltage' ? <VoltageMesh /> : null}
      {component.type === 'current' ? <CurrentMesh /> : null}
      {component.type === 'transistor' ? <TransistorMesh /> : null}
      {component.type === 'ground' ? <GroundMesh /> : null}
      {[
        'resistor',
        'capacitor',
        'inductor',
        'voltage',
        'current',
        'transistor',
        'ground',
      ].includes(component.type) ? null : (
        <UnknownMesh />
      )}
    </group>
  );
}
