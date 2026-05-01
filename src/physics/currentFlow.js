import * as THREE from 'three';

const PARTICLES_PER_WIRE = 10;

// Snap world position to a key with 0.05-unit resolution so nearby endpoints
// (wire tip ↔ component pin) are treated as the same node.
const SNAP = 0.05;
function nodeKey(p) {
  return `${Math.round(p.x / SNAP)},${Math.round(p.y / SNAP)},${Math.round(p.z / SNAP)}`;
}

// BFS from the voltage source's + terminal through the wire graph.
// Returns a Map<wireId, +1|-1>:
//   +1  → particle travels from wire.fromWorld toward wire.toWorld
//   -1  → particle travels from wire.toWorld toward wire.fromWorld
//
// This guarantees KCL: at every intermediate node the wires that arrive
// are opposite in direction to the wires that leave.
function assignWireDirections(wires, components) {
  // Build adjacency: each endpoint key → list of { wireId, otherKey, thisEnd:'from'|'to' }
  const adj = new Map();
  const addEdge = (key, entry) => {
    if (!adj.has(key)) adj.set(key, []);
    adj.get(key).push(entry);
  };

  for (const wire of wires) {
    const fk = nodeKey(wire.fromWorld);
    const tk = nodeKey(wire.toWorld);
    addEdge(fk, { wireId: wire.id, otherKey: tk, thisEnd: 'from' });
    addEdge(tk, { wireId: wire.id, otherKey: fk, thisEnd: 'to' });
  }

  // Find the start node: closest wire endpoint to the voltage source + pin
  const source = components?.find((c) => c.type === 'voltage' || c.type === 'current');
  const srcPin = source?.pins?.[0]?.worldPosition; // pin[0] is the + terminal

  let startKey = null;
  if (srcPin) {
    let best = Infinity;
    for (const [k] of adj) {
      const parts = k.split(',').map(Number);
      const dx = parts[0] * SNAP - srcPin.x;
      const dz = parts[2] * SNAP - srcPin.z;
      const d = dx * dx + dz * dz;
      if (d < best) { best = d; startKey = k; }
    }
  }
  // Fallback: first wire's from-end
  if (!startKey && wires.length > 0) {
    startKey = nodeKey(wires[0].fromWorld);
  }

  const directions = new Map(); // wireId → +1 or -1
  const visited = new Set();
  const queue = [startKey];
  visited.add(startKey);

  while (queue.length > 0) {
    const cur = queue.shift();
    for (const { wireId, otherKey, thisEnd } of (adj.get(cur) ?? [])) {
      if (directions.has(wireId)) continue;
      // Arrived at this wire via `thisEnd`.
      // If we entered at 'from', current goes from→to (+1).
      // If we entered at 'to', current goes to→from (-1).
      directions.set(wireId, thisEnd === 'from' ? 1 : -1);
      if (!visited.has(otherKey)) {
        visited.add(otherKey);
        queue.push(otherKey);
      }
    }
  }

  // Assign default direction for any wires not reached by the BFS
  for (const wire of wires) {
    if (!directions.has(wire.id)) directions.set(wire.id, 1);
  }

  return directions;
}

// Build particle data from laid-out wires with KCL-consistent directions.
export function buildParticleData(wires, components) {
  const directions = assignWireDirections(wires, components);
  const particles = [];

  for (const wire of wires) {
    const rawFrom = new THREE.Vector3(wire.fromWorld.x, wire.fromWorld.y, wire.fromWorld.z);
    const rawTo   = new THREE.Vector3(wire.toWorld.x,  wire.toWorld.y,  wire.toWorld.z);
    if (rawFrom.distanceTo(rawTo) < 0.01) continue;

    const dir = directions.get(wire.id) ?? 1;
    const from = dir === 1 ? rawFrom : rawTo;
    const to   = dir === 1 ? rawTo   : rawFrom;

    for (let i = 0; i < PARTICLES_PER_WIRE; i++) {
      particles.push({ t: i / PARTICLES_PER_WIRE, from, to });
    }
  }

  return { particles, totalCount: particles.length };
}
