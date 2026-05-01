import * as THREE from 'three';

const PARTICLES_PER_WIRE = 10;

// Build the initial particle data array from laid-out wires.
// Returns { particles: Array, totalCount: number }
export function buildParticleData(wires) {
  const particles = [];

  for (const wire of wires) {
    const from = new THREE.Vector3(wire.fromWorld.x, wire.fromWorld.y, wire.fromWorld.z);
    const to = new THREE.Vector3(wire.toWorld.x, wire.toWorld.y, wire.toWorld.z);

    if (from.distanceTo(to) < 0.01) continue;

    for (let i = 0; i < PARTICLES_PER_WIRE; i++) {
      particles.push({
        t: i / PARTICLES_PER_WIRE,
        from,
        to,
      });
    }
  }

  return { particles, totalCount: particles.length };
}
