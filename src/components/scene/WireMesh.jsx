import { useMemo } from 'react';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

export default function WireMesh({ wire }) {
  const transform = useMemo(() => {
    const start = new THREE.Vector3(
      wire.fromWorld.x,
      wire.fromWorld.y,
      wire.fromWorld.z,
    );
    const end = new THREE.Vector3(wire.toWorld.x, wire.toWorld.y, wire.toWorld.z);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const midpoint = start.clone().add(end).multiplyScalar(0.5);

    if (length === 0) {
      return { length, midpoint, quaternion: new THREE.Quaternion() };
    }

    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      UP,
      direction.clone().normalize(),
    );

    return { length, midpoint, quaternion };
  }, [wire]);

  if (transform.length === 0) {
    return null;
  }

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion}>
      <cylinderGeometry args={[0.03, 0.03, transform.length, 12]} />
      <meshStandardMaterial
        color="#d8dde8"
        metalness={0.75}
        roughness={0.28}
      />
    </mesh>
  );
}
