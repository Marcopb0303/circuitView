import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useCircuitStore } from '../../store/circuitStore.js';
import { freqShiftPct } from '../../physics/metalPerturbation.js';

const DISC_RADIUS = 0.6;
const DISC_HEIGHT = 0.05;
const INFLUENCE_DIST = 2.0;
// CircuitScene renders its children inside a group at x=+0.85;
// metalTargetPosition is stored in that local frame, so subtract the offset when
// converting from world-space raycast hits.
const SCENE_OFFSET_X = 0.85;

export default function MetalTarget({ components }) {
  const { camera, pointer } = useThree();
  const { metalTargetPosition, setMetalTargetPosition } = useCircuitStore((s) => ({
    metalTargetPosition: s.metalTargetPosition,
    setMetalTargetPosition: s.setMetalTargetPosition,
  }));
  const sourceMode = useCircuitStore((s) => s.sourceMode);
  const animationSpeed = useCircuitStore((s) => s.animationSpeed);
  const frequency = useCircuitStore((s) => s.frequency);

  const eddyRefs = useRef([]);
  const isDragging = useRef(false);
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const inductors = components.filter((c) => c.type === 'inductor');

  // Release drag on global pointer up
  useEffect(() => {
    const up = () => { isDragging.current = false; };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  useFrame(({ clock }) => {
    // Drag: update position every frame while dragging, using current pointer NDC
    if (isDragging.current) {
      raycaster.setFromCamera(pointer, camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlane, hit)) {
        setMetalTargetPosition({ x: hit.x - SCENE_OFFSET_X, y: 0, z: hit.z });
      }
    }

    // Eddy current ring animation
    const animRate = (Math.log10(Math.max(frequency, 10)) / Math.log10(1e7)) * 3 * animationSpeed;
    const t = clock.elapsedTime;
    const abs = sourceMode === 'AC' ? Math.abs(Math.sin(t * animRate)) : 1;

    const mt = metalTargetPosition;
    let minDist = Infinity;
    for (const ind of inductors) {
      const dx = mt.x - ind.worldPosition.x;
      const dz = mt.z - ind.worldPosition.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) minDist = d;
    }
    const inRange = minDist < INFLUENCE_DIST;

    eddyRefs.current.forEach((mesh) => {
      if (!mesh) return;
      mesh.visible = inRange;
      if (inRange) mesh.material.opacity = abs * 0.75;
    });
  });

  const pos = metalTargetPosition;

  const nearestInductor = inductors.reduce((best, ind) => {
    const dx = pos.x - ind.worldPosition.x;
    const dz = pos.z - ind.worldPosition.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    return d < (best?.dist ?? Infinity) ? { ind, dist: d } : best;
  }, null);
  const showLabel = nearestInductor && nearestInductor.dist < INFLUENCE_DIST;

  return (
    <>
      <group
        position={[pos.x, DISC_HEIGHT / 2, pos.z]}
        onPointerDown={(e) => {
          e.stopPropagation();
          isDragging.current = true;
        }}
      >
        <mesh>
          <cylinderGeometry args={[DISC_RADIUS, DISC_RADIUS, DISC_HEIGHT, 32]} />
          <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.2} />
        </mesh>

        {[0.15, 0.35, 0.55].map((r, i) => (
          <mesh
            key={r}
            ref={(el) => { eddyRefs.current[i] = el; }}
            position={[0, DISC_HEIGHT / 2 + 0.002, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            visible={false}
          >
            <torusGeometry args={[r, 0.012, 8, 48]} />
            <meshBasicMaterial
              color="#ff4400"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {showLabel && (
        <Text
          position={[
            nearestInductor.ind.worldPosition.x,
            nearestInductor.ind.worldPosition.y + 0.75,
            nearestInductor.ind.worldPosition.z,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.13}
          color="#00ffaa"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="#080810"
        >
          {`Δf ↑ ~${freqShiftPct(nearestInductor.dist)}%`}
        </Text>
      )}
    </>
  );
}
