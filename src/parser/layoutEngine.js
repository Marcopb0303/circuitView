const ASC_TO_WORLD_SCALE = 80;
const FALLBACK_BOUNDS = {
  minX: -160,
  maxX: 160,
  minY: -160,
  maxY: 160,
};

const TYPE_HEIGHTS = {
  wire: 0.02,
  resistor: 0.1,
  capacitor: 0.12,
  inductor: 0.14,
  voltage: 0.16,
  current: 0.16,
  ground: 0.08,
};

export function layoutCircuit(circuit) {
  if (!circuit) {
    return null;
  }

  const bounds = getCircuitBounds(circuit);
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };

  const toWorld = (point, y = 0) => ({
    x: (point.x - center.x) / ASC_TO_WORLD_SCALE,
    y,
    z: (point.y - center.y) / ASC_TO_WORLD_SCALE,
  });

  const components = circuit.components.map((component) => {
    const pins = component.pins.map((pin) => ({
      ...pin,
      worldPosition: toWorld(pin.position, TYPE_HEIGHTS[component.type] ?? 0.1),
    }));

    const centerPosition = pins.length
      ? averagePositions(pins.map((pin) => pin.worldPosition))
      : toWorld(component.position, TYPE_HEIGHTS[component.type] ?? 0.1);
    const axis =
      pins.length >= 2
        ? vectorBetween(pins[0].worldPosition, pins[1].worldPosition)
        : { x: 1, y: 0, z: 0 };

    return {
      ...component,
      pins,
      worldPosition: centerPosition,
      worldRotationY: angleForAxis(axis),
      worldLength: Math.max(horizontalLength(axis), 0.8),
    };
  });

  const wires = circuit.wires.map((wire) => ({
    ...wire,
    fromWorld: toWorld(wire.from, TYPE_HEIGHTS.wire),
    toWorld: toWorld(wire.to, TYPE_HEIGHTS.wire),
  }));

  return {
    ...circuit,
    bounds,
    center,
    components,
    wires,
  };
}

function getCircuitBounds(circuit) {
  const points = [
    ...circuit.wires.flatMap((wire) => [wire.from, wire.to]),
    ...circuit.components.flatMap((component) => [
      component.position,
      ...component.pins.map((pin) => pin.position),
    ]),
  ].filter(Boolean);

  if (points.length === 0) {
    return FALLBACK_BOUNDS;
  }

  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    },
  );
}

function averagePositions(points) {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
      z: sum.z + point.z,
    }),
    { x: 0, y: 0, z: 0 },
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length,
  };
}

function vectorBetween(start, end) {
  return {
    x: end.x - start.x,
    y: end.y - start.y,
    z: end.z - start.z,
  };
}

function horizontalLength(vector) {
  return Math.hypot(vector.x, vector.z);
}

function angleForAxis(axis) {
  return -Math.atan2(axis.z, axis.x);
}
