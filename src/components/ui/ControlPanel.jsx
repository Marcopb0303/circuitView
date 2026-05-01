import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';
import { useCircuitStore } from '../../store/circuitStore.js';

const FIELD_LAYERS = [
  {
    key: 'magneticField',
    label: 'Magnetic Field',
    symbol: 'B',
    color: '#00d4ff',
    borderColor: 'rgba(0, 212, 255, 0.45)',
  },
  {
    key: 'electricField',
    label: 'Electric Field',
    symbol: 'E',
    color: '#ffee00',
    borderColor: 'rgba(255, 238, 0, 0.42)',
  },
  {
    key: 'currentFlow',
    label: 'Current Flow',
    symbol: 'I',
    color: '#00ff88',
    borderColor: 'rgba(0, 255, 136, 0.42)',
  },
  {
    key: 'componentLabels',
    label: 'Component Labels',
    symbol: 'Ω',
    color: '#e0e0f0',
    borderColor: 'rgba(224, 224, 240, 0.26)',
  },
];

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-white/[0.07] bg-bg-panel2/70 p-4">
      <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-[#6060a0]">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function CompactSwitch({ checked, onCheckedChange, label }) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="relative h-5 w-9 rounded-full border border-white/[0.08] bg-[#252538] outline-none transition data-[state=checked]:border-accent-cyan/40 data-[state=checked]:bg-accent-cyan/25"
    >
      <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-[#d7d9ed] shadow-sm transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-cyan" />
    </Switch.Root>
  );
}

function LayerIcon({ layer }) {
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md border bg-black/20 font-mono text-xs font-bold"
      style={{ color: layer.color, borderColor: layer.borderColor }}
      aria-hidden="true"
    >
      {layer.symbol}
    </span>
  );
}

function NumberField({ label, value, unit, min, step, onChange }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6060a0]">
        {label}
      </span>
      <div className="mt-2 flex items-center gap-2 rounded-md border border-white/[0.08] bg-black/20 px-3 py-2">
        <input
          type="number"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (Number.isFinite(nextValue)) {
              onChange(nextValue);
            }
          }}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-[#f5f7ff] outline-none"
        />
        <span className="font-mono text-xs text-[#6060a0]">{unit}</span>
      </div>
    </label>
  );
}

export default function ControlPanel() {
  const {
    sourceMode,
    setSourceMode,
    frequency,
    setFrequency,
    amplitude,
    setAmplitude,
    layers,
    setLayer,
    animationSpeed,
    setAnimationSpeed,
  } = useCircuitStore((state) => ({
    sourceMode: state.sourceMode,
    setSourceMode: state.setSourceMode,
    frequency: state.frequency,
    setFrequency: state.setFrequency,
    amplitude: state.amplitude,
    setAmplitude: state.setAmplitude,
    layers: state.layers,
    setLayer: state.setLayer,
    animationSpeed: state.animationSpeed,
    setAnimationSpeed: state.setAnimationSpeed,
  }));

  return (
    <div className="mt-6 space-y-4">
      <Section title="Source Mode">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-bold text-[#f5f7ff]">
              {sourceMode}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#8d91b8]">
              {sourceMode === 'AC'
                ? 'Oscillating field behavior'
                : 'Static field behavior'}
            </p>
          </div>
          <CompactSwitch
            checked={sourceMode === 'AC'}
            onCheckedChange={(checked) => setSourceMode(checked ? 'AC' : 'DC')}
            label="Toggle source mode"
          />
        </div>

        {sourceMode === 'AC' ? (
          <NumberField
            label="Frequency"
            unit="Hz"
            min={0}
            step={1000}
            value={frequency}
            onChange={setFrequency}
          />
        ) : (
          <NumberField
            label="Amplitude"
            unit="V"
            min={0}
            step={0.1}
            value={amplitude}
            onChange={setAmplitude}
          />
        )}
      </Section>

      <Section title="Field Layers">
        <div className="space-y-3">
          {FIELD_LAYERS.map((layer) => (
            <div
              key={layer.key}
              className="flex min-h-9 items-center justify-between gap-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <LayerIcon layer={layer} />
                <span className="min-w-0 flex-1 text-[13px] leading-5 text-[#d5d8ef]">
                  {layer.label}
                </span>
              </div>
              <CompactSwitch
                checked={layers[layer.key]}
                onCheckedChange={(checked) => setLayer(layer.key, checked)}
                label={`Toggle ${layer.label}`}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Animation Speed">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#d5d8ef]">Playback</span>
          <span className="font-mono text-sm text-accent-cyan">
            {animationSpeed.toFixed(1)}x
          </span>
        </div>
        <Slider.Root
          value={[animationSpeed]}
          min={0.1}
          max={3}
          step={0.1}
          onValueChange={([value]) => setAnimationSpeed(value)}
          aria-label="Animation speed"
          className="relative flex h-5 w-full touch-none select-none items-center"
        >
          <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-[#26263a]">
            <Slider.Range className="absolute h-full rounded-full bg-accent-cyan" />
          </Slider.Track>
          <Slider.Thumb className="block h-4 w-4 rounded-full border border-accent-cyan/60 bg-[#e8fbff] shadow-lg shadow-cyan-500/20 outline-none transition hover:scale-105" />
        </Slider.Root>
      </Section>

      <Section title="Metal Target">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#d5d8ef]">Conductive disc</p>
            <p className="mt-1 text-xs leading-5 text-[#8d91b8]">
              Enables the perturbation layer state.
            </p>
          </div>
          <CompactSwitch
            checked={layers.metalTarget}
            onCheckedChange={(checked) => setLayer('metalTarget', checked)}
            label="Toggle metal target"
          />
        </div>
      </Section>
    </div>
  );
}
