import * as THREE from 'three';

const PARTICLES_PER_WIRE = 10;

// Use exact ASC integer coordinates as node keys — no floating-point snap tolerance needed.
function nodeKey(p) {
  return `${p.x},${p.y}`;
}

// BFS from the voltage source's + terminal through the wire graph.
// Returns a Map<wireId, +1|-1>:
//   +1  → particle travels from wire.fromWorld toward wire.toWorld
//   -1  → particle travels from wire.toWorld toward wire.fromWorld
//
// Adjacency is built from wire.from / wire.to (ASC integer coords) so
// every endpoint matches exactly — no SNAP tolerance required.
function assignWireDirections(wires, components) {
  const adj = new Map();
  const addEdge = (key, entry) => {
    if (!adj.has(key)) adj.set(key, []);
    adj.get(key).push(entry);
  };

  for (const wire of wires) {
    const fk = nodeKey(wire.from);
    const tk = nodeKey(wire.to);
    addEdge(fk, { wireId: wire.id, otherKey: tk, thisEnd: 'from' });
    addEdge(tk, { wireId: wire.id, otherKey: fk, thisEnd: 'to' });
  }

  // Start BFS from the voltage/current source's pin[0] (+ terminal).
  const source = components?.find((c) => c.type === 'voltage' || c.type === 'current');
  const srcPinPos = source?.pins?.[0]?.position; // ASC integer {x, y}

  let startKey = null;
  if (srcPinPos) {
    startKey = nodeKey(srcPinPos);
    // If the exact pin position isn't a wire endpoint, find the closest one.
    if (!adj.has(startKey)) {
      let best = Infinity;
      for (const [k] of adj) {
        const [kx, ky] = k.split(',').map(Number);
        const d = (kx - srcPinPos.x) ** 2 + (ky - srcPinPos.y) ** 2;
        if (d < best) { best = d; startKey = k; }
      }
    }
  }
  if (!startKey && wires.length > 0) {
    startKey = nodeKey(wires[0].from);
  }

  const directions = new Map();
  const visited = new Set();
  const queue = [startKey];
  visited.add(startKey);

  while (queue.length > 0) {
    const cur = queue.shift();
    for (const { wireId, otherKey, thisEnd } of (adj.get(cur) ?? [])) {
      if (directions.has(wireId)) continue;
      directions.set(wireId, thisEnd === 'from' ? 1 : -1);
      if (!visited.has(otherKey)) {
        visited.add(otherKey);
        queue.push(otherKey);
      }
    }
  }

  for (const wire of wires) {
    if (!directions.has(wire.id)) directions.set(wire.id, 1);
  }

  return directions;
}

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
