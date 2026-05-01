import {
  PHASE_1_SMOKE_ASC,
  parseAsc,
  parseSIValue,
} from '../src/parser/ascParser.js';
import { decodeAscBytes } from '../src/parser/textEncoding.js';

const parsed = parseAsc(PHASE_1_SMOKE_ASC);
const utf16Parsed = parseAsc(decodeAscBytes(Buffer.from(PHASE_1_SMOKE_ASC, 'utf16le')));
const nulSeparatedParsed = parseAsc(PHASE_1_SMOKE_ASC.split('').join('\0'));
const byId = Object.fromEntries(
  parsed.components.map((component) => [component.id, component]),
);
const utf16ById = Object.fromEntries(
  utf16Parsed.components.map((component) => [component.id, component]),
);
const pinMapped = parseAsc(`WIRE 256 128 528 128
WIRE 256 208 528 208
WIRE 528 192 528 208
FLAG 528 208 0
SYMBOL res 240 112 R0
SYMATTR InstName R1
SYMATTR Value 1K
SYMBOL cap 512 128 R0
SYMATTR InstName C1
SYMATTR Value 1n`);
const mappedById = Object.fromEntries(
  pinMapped.components.map((component) => [component.id, component]),
);

const closeTo = (actual, expected, epsilon = Math.abs(expected) * 1e-9) =>
  Math.abs(actual - expected) <= epsilon;

const checks = [
  ['R1 value', byId.R1?.value === 33000],
  ['C1 value', closeTo(byId.C1?.value, 1.5e-9)],
  ['L1 value', closeTo(byId.L1?.value, 100e-6)],
  ['V1 waveform', parsed.source?.waveform === 'SINE'],
  ['V1 frequency', parsed.source?.frequency === 455000],
  ['1m parses as milli', parseSIValue('1m') === 1e-3],
  ['10Meg parses as mega', parseSIValue('10Meg') === 1e7],
  ['.ac directive discarded', parsed.directives.length === 0],
  ['UTF-16 ASC decodes', utf16Parsed.components.length === parsed.components.length],
  ['UTF-16 micro suffix preserved', closeTo(utf16ById.L1?.value, 100e-6)],
  ['NUL-separated text normalizes', nulSeparatedParsed.wires.length === parsed.wires.length],
  ['pin-mapped top net', mappedById.R1?.nodes[0] === mappedById.C1?.nodes[0]],
  ['pin-mapped ground net', mappedById.R1?.nodes[1] === 'gnd'],
  ['pin-mapped capacitor ground', mappedById.C1?.nodes[1] === 'gnd'],
];

const failed = checks.filter(([, passed]) => !passed);

console.log(JSON.stringify(parsed, null, 2));

if (failed.length > 0) {
  console.error(
    `Parser smoke test failed: ${failed.map(([name]) => name).join(', ')}`,
  );
  process.exitCode = 1;
}
