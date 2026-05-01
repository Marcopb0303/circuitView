import * as Slider from '@radix-ui/react-slider';
import { useCircuitStore } from '../../store/circuitStore.js';

function formatH(v) {
  if (!v || !Number.isFinite(v)) return '?H';
  if (v >= 1) return `${v.toFixed(3)}H`;
  if (v >= 1e-3) return `${(v * 1e3).toFixed(2)}mH`;
  if (v >= 1e-6) return `${(v * 1e6).toFixed(2)}µH`;
  return `${(v * 1e9).toFixed(2)}nH`;
}

function formatF(v) {
  if (!v || !Number.isFinite(v)) return '?F';
  if (v >= 1e-3) return `${(v * 1e3).toFixed(2)}mF`;
  if (v >= 1e-6) return `${(v * 1e6).toFixed(2)}µF`;
  if (v >= 1e-9) return `${(v * 1e9).toFixed(2)}nF`;
  return `${(v * 1e12).toFixed(2)}pF`;
}

function formatOhm(v) {
  if (!v || !Number.isFinite(v)) return '?Ω';
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}MΩ`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}kΩ`;
  return `${v.toFixed(1)}Ω`;
}

function formatHz(v) {
  if (!v || !Number.isFinite(v)) return '?Hz';
  if (v >= 1e6) return `${(v / 1e6).toFixed(3)}MHz`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}kHz`;
  return `${v.toFixed(0)}Hz`;
}

function formatValue(type, value) {
  if (type === 'inductor') return formatH(value);
  if (type === 'capacitor') return formatF(value);
  if (type === 'resistor') return formatOhm(value);
  return value != null ? String(value) : '—';
}

const physicsText = {
  inductor: (comp, layers) =>
    `This inductor stores energy in its magnetic field. At ${formatH(comp.value)}, the field ${
      layers.magneticField ? 'you see pulsing around it' : 'around it'
    } contains energy proportional to ½LI². Field strength and reach scale with √L — doubling inductance extends field lines by ~41%.`,

  capacitor: (comp, layers) =>
    `This capacitor stores energy in the electric field between its plates. At ${formatF(
      comp.value,
    )}, it stores charge proportional to CV. ${
      layers.electricField ? 'The amber lines show the E-field direction — ' : ''
    }In AC circuits, this field reverses with every half-cycle.`,

  resistor: (comp) =>
    `Resistors dissipate energy as heat — no stored field energy. At ${formatOhm(
      comp.value,
    )}, it drops ${formatOhm(comp.value)}×I volts and dissipates I²×${formatOhm(comp.value)} watts. Current flows directly through with no reactive delay.`,

  voltage: (comp) =>
    `The source driving this circuit. ${
      comp.attributes?.Value?.match(/^(SINE|AC|PULSE)/i)
        ? `AC — all field animations are phase-locked to this source.`
        : `DC at ${comp.valueRaw ?? '?'}V — fields are static.`
    }`,
};

function getPhysicsText(comp, layers) {
  const fn = physicsText[comp.type];
  if (fn) return fn(comp, layers);
  return `${comp.type} component — value: ${comp.valueRaw ?? '—'}.`;
}

function hasSlider(type) {
  return ['inductor', 'capacitor', 'resistor'].includes(type);
}

export default function ComponentInspector() {
  const { selectedComponent, circuit, layers, overrides, setOverride, selectComponent } =
    useCircuitStore((s) => ({
      selectedComponent: s.selectedComponent,
      circuit: s.circuit,
      layers: s.layers,
      overrides: s.overrides,
      setOverride: s.setOverride,
      selectComponent: s.selectComponent,
    }));

  const component = selectedComponent
    ? circuit?.components.find((c) => c.id === selectedComponent)
    : null;

  const isOpen = !!component;

  if (!isOpen) return null;

  const origValue = component.value;
  const currentOverride = overrides[component.id]?.value ?? origValue;
  const showSlider = hasSlider(component.type) && origValue && Number.isFinite(origValue);
  const multiplier = showSlider ? currentOverride / origValue : 1;

  const handleSliderChange = ([rawMultiplier]) => {
    const newValue = origValue * rawMultiplier;
    setOverride(component.id, 'value', newValue);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        width: 280,
        background: '#0d0d1a',
        borderLeft: '1px solid #00d4ff',
        zIndex: 20,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        transform: 'translateX(0)',
        transition: 'transform 300ms ease',
        padding: '24px 20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6060a0', margin: 0 }}>
            {component.type}
          </p>
          <h2 style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, color: '#f5f7ff', margin: '4px 0 0' }}>
            {component.id}
          </h2>
          {origValue != null && (
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 14, color: '#00d4ff', margin: '2px 0 0' }}>
              {formatValue(component.type, currentOverride)}
            </p>
          )}
        </div>
        <button
          onClick={() => selectComponent(null)}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: '#8d91b8',
            cursor: 'pointer',
            padding: '4px 8px',
            fontFamily: 'Space Mono, monospace',
            fontSize: 11,
          }}
        >
          ✕
        </button>
      </div>

      {/* Nodes */}
      {component.nodes?.filter(Boolean).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6060a0', margin: '0 0 6px' }}>
            Nodes
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {component.nodes.filter(Boolean).map((n) => (
              <span key={n} style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 4, padding: '2px 6px', color: '#a0d8ef' }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '16px 0' }} />

      {/* Physics explanation */}
      <div>
        <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6060a0', margin: '0 0 8px' }}>
          Physics
        </p>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.7, color: '#c7cae6', margin: 0 }}>
          {getPhysicsText(component, layers)}
        </p>
      </div>

      {/* Value override slider */}
      {showSlider && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6060a0', margin: 0 }}>
              Value Override
            </p>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: '#00d4ff' }}>
              {multiplier.toFixed(2)}×
            </span>
          </div>
          <Slider.Root
            value={[multiplier]}
            min={0.1}
            max={10}
            step={0.05}
            onValueChange={handleSliderChange}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 20, width: '100%', touchAction: 'none', userSelect: 'none' }}
          >
            <Slider.Track style={{ position: 'relative', height: 6, flexGrow: 1, borderRadius: 9999, background: '#26263a' }}>
              <Slider.Range style={{ position: 'absolute', height: '100%', borderRadius: 9999, background: '#00d4ff' }} />
            </Slider.Track>
            <Slider.Thumb style={{ display: 'block', width: 16, height: 16, borderRadius: '50%', background: '#e8fbff', border: '1px solid rgba(0,212,255,0.6)', outline: 'none', cursor: 'pointer' }} />
          </Slider.Root>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#6060a0', margin: '6px 0 0', textAlign: 'center' }}>
            {formatValue(component.type, currentOverride)}
          </p>
        </div>
      )}
    </div>
  );
}
