import {
  getComponentType,
  getSymbolPinMap,
  normalizeSymbolName,
} from './componentTypes.js';
import { normalizeAscText } from './textEncoding.js';

const ROTATION_DEGREES = {
  R0: 0,
  R90: 90,
  R180: 180,
  R270: 270,
  M0: 0,
  M90: 90,
  M180: 180,
  M270: 270,
};

const SI_MULTIPLIERS = [
  ['meg', 1e6],
  ['Meg', 1e6],
  ['MEG', 1e6],
  ['K', 1e3],
  ['k', 1e3],
  ['M', 1e6],
  ['m', 1e-3],
  ['U', 1e-6],
  ['u', 1e-6],
  ['µ', 1e-6],
  ['μ', 1e-6],
  ['N', 1e-9],
  ['n', 1e-9],
  ['P', 1e-12],
  ['p', 1e-12],
];

const SOURCE_FUNCTIONS = new Set(['SINE', 'PULSE', 'PWL', 'EXP', 'SFFM']);

export const PHASE_1_SMOKE_ASC = `WIRE 336 96 528 96
SYMBOL res 240 96 R0
SYMATTR InstName R1
SYMATTR Value 33K
SYMBOL cap 512 160 R0
SYMATTR InstName C1
SYMATTR Value 1.5nF
SYMBOL ind 784 96 R0
SYMATTR InstName L1
SYMATTR Value 100µ
SYMBOL voltage 144 368 R0
SYMATTR InstName V1
SYMATTR Value SINE(0 9 455K)
TEXT 144 800 Left 2 .ac dec 100 10 10Meg`;

export function parseSIValue(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const raw = String(rawValue).trim();
  if (!raw) {
    return null;
  }

  const numericMatch = raw.match(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
  if (!numericMatch) {
    return null;
  }

  const number = Number(numericMatch[0]);
  if (!Number.isFinite(number)) {
    return null;
  }

  const suffixPart = raw.slice(numericMatch[0].length).trim();
  const multiplierEntry = SI_MULTIPLIERS.find(([suffix]) =>
    suffixPart.startsWith(suffix),
  );

  return number * (multiplierEntry?.[1] ?? 1);
}

export function parseRotation(rotationCode = 'R0') {
  const code = String(rotationCode || 'R0').toUpperCase();
  return {
    code,
    degrees: ROTATION_DEGREES[code] ?? 0,
    mirrored: code.startsWith('M'),
  };
}

export function transformSymbolPoint(point, origin, rotationCode) {
  const { code } = parseRotation(rotationCode);
  const x = Number(point.x);
  const y = Number(point.y);
  const originX = Number(origin.x);
  const originY = Number(origin.y);

  switch (code) {
    case 'R90':
      return { x: originX - y, y: originY + x };
    case 'R180':
      return { x: originX - x, y: originY - y };
    case 'R270':
      return { x: originX + y, y: originY - x };
    case 'M0':
      return { x: originX - x, y: originY + y };
    case 'M90':
      return { x: originX - y, y: originY - x };
    case 'M180':
      return { x: originX + x, y: originY - y };
    case 'M270':
      return { x: originX + y, y: originY + x };
    case 'R0':
    default:
      return { x: originX + x, y: originY + y };
  }
}

export function parseAsc(ascText) {
  const components = [];
  const wires = [];
  const flags = [];
  const textLines = [];
  let currentComponent = null;
  const sourceText = normalizeAscText(ascText);

  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line, lineIndex) => {
    const [kind, ...parts] = line.split(/\s+/);

    switch (kind) {
      case 'WIRE': {
        const [x1, y1, x2, y2] = parts.map(Number);
        if ([x1, y1, x2, y2].every(Number.isFinite)) {
          wires.push({
            id: `W${wires.length + 1}`,
            from: { x: x1, y: y1 },
            to: { x: x2, y: y2 },
            net: null,
          });
        }
        break;
      }

      case 'FLAG': {
        const [xRaw, yRaw, ...labelParts] = parts;
        const x = Number(xRaw);
        const y = Number(yRaw);
        if (Number.isFinite(x) && Number.isFinite(y) && labelParts.length > 0) {
          flags.push({
            position: { x, y },
            label: normalizeNetLabel(labelParts.join(' ')),
          });
        }
        break;
      }

      case 'SYMBOL': {
        const [symbolName, xRaw, yRaw, rotationCode = 'R0'] = parts;
        const x = Number(xRaw);
        const y = Number(yRaw);
        if (!symbolName || !Number.isFinite(x) || !Number.isFinite(y)) {
          currentComponent = null;
          break;
        }

        currentComponent = createComponent({
          symbolName,
          x,
          y,
          rotationCode,
          lineIndex,
          index: components.length,
        });
        components.push(currentComponent);
        break;
      }

      case 'SYMATTR': {
        if (!currentComponent) {
          break;
        }

        const [attrName, ...valueParts] = parts;
        const value = valueParts.join(' ');
        applySymbolAttribute(currentComponent, attrName, value);
        break;
      }

      case 'TEXT': {
        const text = extractTextDirective(parts);
        if (text && !shouldDiscardDirective(text)) {
          textLines.push(text);
        }
        break;
      }

      default:
        break;
    }
  });

  flags
    .filter((flag) => flag.label === 'gnd')
    .forEach((flag, index) => {
      components.push(createGroundComponent(flag, index));
    });

  const graph = buildNetGraph(components, wires, flags);
  const source = inferSource(components);

  return {
    components: components.map((component) => ({
      ...component,
      nodes: component.pins.map((pin) => pin.net),
    })),
    wires: wires.map((wire) => ({
      ...wire,
      net: graph.wireNets.get(wire.id) ?? null,
    })),
    nets: graph.nets,
    source,
    directives: textLines,
  };
}

export function runAscParserSmokeTest() {
  const parsed = parseAsc(PHASE_1_SMOKE_ASC);
  console.log(parsed);
  return parsed;
}

function createComponent({ symbolName, x, y, rotationCode, lineIndex, index }) {
  const symbol = normalizeSymbolName(symbolName);
  const type = getComponentType(symbol);
  const rotation = parseRotation(rotationCode);
  const pinMap = getSymbolPinMap(symbol);
  const position = { x, y };

  return {
    id: `${type.toUpperCase()}_${index + 1}`,
    type,
    symbol,
    value: null,
    valueRaw: null,
    nodes: [],
    pins: pinMap.map((pin) => ({
      ...pin,
      position: transformSymbolPoint(pin, position, rotation.code),
      net: null,
    })),
    position,
    rotation: rotation.degrees,
    rotationCode: rotation.code,
    attributes: {
      sourceLine: lineIndex + 1,
    },
  };
}

function createGroundComponent(flag, index) {
  return {
    id: `GND${index + 1}`,
    type: 'ground',
    symbol: 'gnd',
    value: null,
    valueRaw: null,
    nodes: [],
    pins: [
      {
        name: '0',
        spiceOrder: 1,
        x: 0,
        y: 0,
        position: flag.position,
        net: null,
      },
    ],
    position: flag.position,
    rotation: 0,
    rotationCode: 'R0',
    attributes: {
      label: flag.label,
    },
  };
}

function applySymbolAttribute(component, attrName, value) {
  if (!attrName) {
    return;
  }

  component.attributes[attrName] = value;

  if (attrName === 'InstName' && value) {
    component.id = value;
    return;
  }

  if (attrName === 'Value') {
    component.valueRaw = value;
    component.value = parseComponentValue(component.type, value);
  }
}

function parseComponentValue(type, valueRaw) {
  if (type === 'voltage' || type === 'current') {
    const source = parseSourceValue(valueRaw);
    return source.amplitude ?? parseSIValue(valueRaw);
  }

  return parseSIValue(valueRaw);
}

export function parseSourceValue(valueRaw) {
  const raw = String(valueRaw || '').trim();
  if (!raw) {
    return {
      waveform: 'DC',
      amplitude: null,
      frequency: null,
    };
  }

  const functionMatch = raw.match(/^([A-Za-z]+)\((.*)\)$/);
  if (functionMatch && SOURCE_FUNCTIONS.has(functionMatch[1].toUpperCase())) {
    const waveform = functionMatch[1].toUpperCase();
    const args = tokenizeSourceArgs(functionMatch[2]);
    const values = args.map(parseSIValue);

    if (waveform === 'SINE') {
      return {
        waveform,
        amplitude: values[1] ?? null,
        offset: values[0] ?? null,
        frequency: values[2] ?? null,
        args,
      };
    }

    return {
      waveform,
      amplitude: values.find((value) => value !== null) ?? null,
      frequency: null,
      args,
    };
  }

  const acMatch = raw.match(/^AC(?:\s+(.+))?$/i);
  if (acMatch) {
    const args = tokenizeSourceArgs(acMatch[1] || '');
    return {
      waveform: 'AC',
      amplitude: parseSIValue(args[0] ?? '1') ?? 1,
      frequency: null,
      args,
    };
  }

  return {
    waveform: 'DC',
    amplitude: parseSIValue(raw),
    frequency: null,
  };
}

function tokenizeSourceArgs(argsRaw) {
  return String(argsRaw || '')
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
}

function inferSource(components) {
  const sourceComponent = components.find(
    (component) => component.type === 'voltage' || component.type === 'current',
  );

  if (!sourceComponent) {
    return null;
  }

  const parsedSource = parseSourceValue(sourceComponent.valueRaw);

  return {
    id: sourceComponent.id,
    type: sourceComponent.type,
    waveform: parsedSource.waveform,
    frequency: parsedSource.frequency,
    amplitude: parsedSource.amplitude,
    nodes: sourceComponent.pins.map((pin) => pin.net),
    valueRaw: sourceComponent.valueRaw,
  };
}

function buildNetGraph(components, wires, flags) {
  const unionFind = new UnionFind();
  const coordinateItems = new Map();

  wires.forEach((wire) => {
    addCoordinateItem(coordinateItems, wire.from, { kind: 'wire', id: wire.id });
    addCoordinateItem(coordinateItems, wire.to, { kind: 'wire', id: wire.id });
  });

  components.forEach((component) => {
    component.pins.forEach((pin) => {
      addCoordinateItem(coordinateItems, pin.position, {
        kind: 'pin',
        componentId: component.id,
        pinName: pin.name,
      });
    });
  });

  flags.forEach((flag) => {
    addCoordinateItem(coordinateItems, flag.position, {
      kind: 'flag',
      label: flag.label,
    });
  });

  for (const key of coordinateItems.keys()) {
    unionFind.add(key);
  }

  wires.forEach((wire) => {
    const pointsOnWire = findPointsOnSegment([...coordinateItems.keys()], wire);

    for (let i = 1; i < pointsOnWire.length; i += 1) {
      unionFind.union(pointsOnWire[i - 1], pointsOnWire[i]);
    }
  });

  const netByRoot = createNetNames(unionFind, coordinateItems);
  const pointToNet = new Map();
  for (const key of coordinateItems.keys()) {
    pointToNet.set(key, netByRoot.get(unionFind.find(key)));
  }

  components.forEach((component) => {
    component.pins.forEach((pin) => {
      pin.net = pointToNet.get(pointKey(pin.position)) ?? null;
    });
  });

  const wireNets = new Map();
  wires.forEach((wire) => {
    wireNets.set(wire.id, pointToNet.get(pointKey(wire.from)) ?? null);
  });

  return {
    nets: createNetsObject(unionFind, coordinateItems, netByRoot),
    wireNets,
  };
}

function createNetNames(unionFind, coordinateItems) {
  const roots = new Map();

  for (const [key, items] of coordinateItems.entries()) {
    const root = unionFind.find(key);
    const entry =
      roots.get(root) ??
      {
        labels: [],
        pinCount: 0,
      };

    items.forEach((item) => {
      if (item.kind === 'flag') {
        entry.labels.push(item.label);
      }
      if (item.kind === 'pin') {
        entry.pinCount += 1;
      }
    });

    roots.set(root, entry);
  }

  const netByRoot = new Map();
  let generatedNetIndex = 1;

  for (const [root, entry] of roots.entries()) {
    const explicitLabel =
      entry.labels.find((label) => label === 'gnd') ?? entry.labels[0];
    netByRoot.set(root, explicitLabel ?? `net${generatedNetIndex}`);

    if (!explicitLabel) {
      generatedNetIndex += 1;
    }
  }

  return netByRoot;
}

function createNetsObject(unionFind, coordinateItems, netByRoot) {
  const nets = {};

  for (const [key, items] of coordinateItems.entries()) {
    const root = unionFind.find(key);
    const netName = netByRoot.get(root);
    if (!netName) {
      continue;
    }

    nets[netName] ??= [];
    items.forEach((item) => {
      if (item.kind === 'pin') {
        nets[netName].push(`${item.componentId}.${item.pinName}`);
      }
      if (item.kind === 'flag' && item.label !== netName) {
        nets[netName].push(`FLAG.${item.label}`);
      }
    });
  }

  return Object.fromEntries(
    Object.entries(nets).map(([netName, entries]) => [
      netName,
      [...new Set(entries)],
    ]),
  );
}

function addCoordinateItem(coordinateItems, point, item) {
  const key = pointKey(point);
  coordinateItems.set(key, [...(coordinateItems.get(key) ?? []), item]);
}

function pointKey(point) {
  return `${Number(point.x)},${Number(point.y)}`;
}

function parsePointKey(key) {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

function findPointsOnSegment(pointKeys, wire) {
  return pointKeys
    .filter((key) => pointLiesOnSegment(parsePointKey(key), wire.from, wire.to))
    .sort((a, b) => {
      const pointA = parsePointKey(a);
      const pointB = parsePointKey(b);
      if (wire.from.x !== wire.to.x) {
        return pointA.x - pointB.x;
      }
      return pointA.y - pointB.y;
    });
}

function pointLiesOnSegment(point, start, end) {
  const cross =
    (point.y - start.y) * (end.x - start.x) -
    (point.x - start.x) * (end.y - start.y);

  if (cross !== 0) {
    return false;
  }

  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  return (
    point.x >= minX &&
    point.x <= maxX &&
    point.y >= minY &&
    point.y <= maxY
  );
}

function normalizeNetLabel(label) {
  const normalized = String(label || '').trim();
  if (normalized === '0') {
    return 'gnd';
  }
  return normalized;
}

function extractTextDirective(parts) {
  const directiveStart = parts.findIndex((part) => part.startsWith('.'));
  if (directiveStart < 0) {
    return null;
  }
  return parts.slice(directiveStart).join(' ');
}

function shouldDiscardDirective(text) {
  return /^\.(?:ac|op|tran)\b/i.test(text);
}

class UnionFind {
  constructor() {
    this.parent = new Map();
  }

  add(value) {
    if (!this.parent.has(value)) {
      this.parent.set(value, value);
    }
  }

  find(value) {
    this.add(value);
    const parent = this.parent.get(value);
    if (parent === value) {
      return value;
    }
    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }
}
