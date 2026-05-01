import * as THREE from 'three';

// Returns { lines: THREE.Vector3[][], N: number }
// pin1 = positive plate (worldPosition), pin2 = negative plate
// All positions in world space; render this as a child group at origin.
export function computeEFieldLines(pin1World, pin2World, C_farads) {
  const C_nF = (C_farads ?? 1e-9) * 1e9;
  const N = Math.max(4, Math.min(12, Math.round(C_nF * 2)));

  const start = new THREE.Vector3(pin1World.x, pin1World.y, pin1World.z);
  const end = new THREE.Vector3(pin2World.x, pin2World.y, pin2World.z);

  // Axis from pin1 to pin2
  const axis = end.clone().sub(start);
  const separation = axis.length();
  const axisNorm = axis.clone().normalize();

  // Perpendicular lateral direction for line offsets
  const up = Math.abs(axisNorm.y) < 0.9
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const lateral = new THREE.Vector3().crossVectors(axisNorm, up).normalize();

  const lines = [];
  const spacing = 0.12;

  for (let i = 0; i < N; i++) {
    const offset = (i - N / 2 + 0.5) * spacing;
    const lateralVec = lateral.clone().multiplyScalar(offset);

    const p0 = start.clone().add(lateralVec);
    const p2 = end.clone().add(lateralVec);
    const mid = p0.clone().lerp(p2, 0.5);

    // Fringing: bow outermost two lines outward
    const isOutermost = i === 0 || i === N - 1;
    if (isOutermost) {
      const bowDir = lateral.clone().multiplyScalar(
        Math.sign(offset) * 0.15 * separation,
      );
      mid.add(bowDir);
    }

    lines.push([p0, mid, p2]);
  }

  return { lines, N };
}
