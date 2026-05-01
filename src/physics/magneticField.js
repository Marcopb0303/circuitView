import * as THREE from 'three';

const THETA_SAMPLES = 40;
const NUM_LINES = 8;

export function clampRmax(L_henries) {
  const L = Math.max(L_henries, 1e-12);
  const v = 0.8 + Math.log10(L * 1e6) * 0.4;
  return Math.max(0.5, Math.min(2.5, v));
}

// Dipole axis along local X (inductor coil axis).
// Returns { lines: THREE.Vector3[][], r_max: number }
export function computeDipoleFieldLines(L_henries) {
  const r_max = clampRmax(L_henries);
  const lines = [];

  for (let i = 0; i < NUM_LINES; i++) {
    const phi = (i / NUM_LINES) * Math.PI * 2;
    const points = [];

    for (let j = 0; j < THETA_SAMPLES; j++) {
      const theta = (j / (THETA_SAMPLES - 1)) * Math.PI;
      const sinT = Math.sin(theta);
      const r = r_max * sinT * sinT;

      points.push(new THREE.Vector3(
        r * Math.cos(theta),
        r * sinT * Math.sin(phi),
        r * sinT * Math.cos(phi),
      ));
    }

    lines.push(points);
  }

  return { lines, r_max };
}

// Push each point radially away from discCenter if it is inside the disc radius.
export function perturbPoints(points, discCenter, discRadius = 0.6) {
  return points.map((p) => {
    const dx = p.x - discCenter.x;
    const dy = p.y - discCenter.y;
    const dz = p.z - discCenter.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < discRadius && dist > 0.001) {
      const push = ((discRadius - dist) * 1.5) / dist;
      return new THREE.Vector3(p.x + dx * push, p.y + dy * push, p.z + dz * push);
    }
    return p;
  });
}
