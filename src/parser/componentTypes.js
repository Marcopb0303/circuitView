export const COMPONENT_TYPES = {
  res: 'resistor',
  res2: 'resistor',
  cap: 'capacitor',
  polcap: 'capacitor',
  ind: 'inductor',
  voltage: 'voltage',
  current: 'current',
  npn: 'transistor',
  pnp: 'transistor',
};

// Coordinates are from the stock LTspice .asy symbols. Keeping them here makes
// net inference deterministic instead of relying on visual proximity.
export const SYMBOL_PIN_MAPS = {
  res: [
    { name: 'A', spiceOrder: 1, x: 16, y: 16 },
    { name: 'B', spiceOrder: 2, x: 16, y: 96 },
  ],
  res2: [
    { name: 'A', spiceOrder: 1, x: 16, y: 16 },
    { name: 'B', spiceOrder: 2, x: 16, y: 96 },
  ],
  cap: [
    { name: 'A', spiceOrder: 1, x: 16, y: 0 },
    { name: 'B', spiceOrder: 2, x: 16, y: 64 },
  ],
  polcap: [
    { name: 'A', spiceOrder: 1, x: 16, y: 0 },
    { name: 'B', spiceOrder: 2, x: 16, y: 64 },
  ],
  ind: [
    { name: 'A', spiceOrder: 1, x: 16, y: 16 },
    { name: 'B', spiceOrder: 2, x: 16, y: 96 },
  ],
  voltage: [
    { name: '+', spiceOrder: 1, x: 0, y: 16 },
    { name: '-', spiceOrder: 2, x: 0, y: 96 },
  ],
  current: [
    { name: '+', spiceOrder: 1, x: 0, y: 0 },
    { name: '-', spiceOrder: 2, x: 0, y: 80 },
  ],
  npn: [
    { name: 'C', spiceOrder: 1, x: 64, y: 0 },
    { name: 'B', spiceOrder: 2, x: 0, y: 48 },
    { name: 'E', spiceOrder: 3, x: 64, y: 96 },
  ],
  pnp: [
    { name: 'C', spiceOrder: 1, x: 64, y: 0 },
    { name: 'B', spiceOrder: 2, x: 0, y: 48 },
    { name: 'E', spiceOrder: 3, x: 64, y: 96 },
  ],
};

export function normalizeSymbolName(symbolName) {
  return String(symbolName || '').trim().split(/[\\/]/).pop().toLowerCase();
}

export function getComponentType(symbolName) {
  const normalized = normalizeSymbolName(symbolName);
  return COMPONENT_TYPES[normalized] ?? normalized;
}

export function getSymbolPinMap(symbolName) {
  return SYMBOL_PIN_MAPS[normalizeSymbolName(symbolName)] ?? [];
}
