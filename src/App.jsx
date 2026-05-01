import { useEffect } from 'react';
import Sidebar from './components/layout/Sidebar.jsx';
import SceneCanvas from './components/scene/SceneCanvas.jsx';
import ComponentInspector from './components/ui/ComponentInspector.jsx';
import { useCircuitStore } from './store/circuitStore.js';

function LandingOverlay() {
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);

  const loadExample = async () => {
    try {
      const res = await fetch('/example-circuits/lc-oscillator.asc');
      const text = await res.text();
      loadCircuit(text, 'lc-oscillator.asc');
    } catch {
      // file may not exist in dev
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          pointerEvents: 'auto',
          padding: '48px 40px',
          borderRadius: 16,
          border: '1.5px dashed rgba(0,212,255,0.4)',
          background: 'rgba(8,8,16,0.7)',
          backdropFilter: 'blur(12px)',
          animation: 'glow-border 2s ease-in-out infinite alternate',
          maxWidth: 360,
        }}
      >
        <h1
          style={{
            fontFamily: 'Syne, Inter, system-ui, sans-serif',
            fontSize: 56,
            fontWeight: 800,
            color: '#f5f7ff',
            margin: '0 0 8px',
            letterSpacing: '-1px',
          }}
        >
          EMViz
        </h1>
        <p
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 15,
            color: '#a8abc7',
            margin: '0 0 28px',
            lineHeight: 1.6,
          }}
        >
          See the physics inside your circuit
        </p>
        <p
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            color: '#6060a0',
            margin: '0 0 20px',
          }}
        >
          Drop an LTspice .asc file in the sidebar to begin
        </p>
        <button
          onClick={loadExample}
          style={{
            background: 'rgba(0,212,255,0.12)',
            border: '1px solid rgba(0,212,255,0.4)',
            borderRadius: 8,
            color: '#00d4ff',
            fontFamily: 'Space Mono, monospace',
            fontSize: 12,
            letterSpacing: '0.1em',
            padding: '10px 20px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { e.target.style.background = 'rgba(0,212,255,0.22)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'rgba(0,212,255,0.12)'; }}
        >
          Try example circuit
        </button>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
        background: 'rgba(8,8,16,0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="4" y="4" width="56" height="56" rx="4" stroke="#00d4ff" strokeWidth="2" strokeDasharray="12 6" strokeDashoffset="0">
          <animate attributeName="stroke-dashoffset" from="0" to="-72" dur="1.2s" repeatCount="indefinite" />
        </rect>
        <circle cx="32" cy="32" r="6" fill="#00d4ff" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

function ScreenshotButton() {
  const handleClick = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'emviz-circuit.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <button
      onClick={handleClick}
      title="Download screenshot"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 15,
        background: 'rgba(13,13,26,0.85)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        color: '#8d91b8',
        cursor: 'pointer',
        padding: '8px 10px',
        backdropFilter: 'blur(8px)',
        lineHeight: 1,
        transition: 'color 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#00d4ff';
        e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#8d91b8';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    </button>
  );
}

// URL state encoding / restoring
function useUrlState() {
  const { layers, sourceMode, frequency, overrides, setLayer, setSourceMode, setFrequency, setOverride } = useCircuitStore((s) => ({
    layers: s.layers,
    sourceMode: s.sourceMode,
    frequency: s.frequency,
    overrides: s.overrides,
    setLayer: s.setLayer,
    setSourceMode: s.setSourceMode,
    setFrequency: s.setFrequency,
    setOverride: s.setOverride,
  }));

  // Restore from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('s');
    if (!encoded) return;
    try {
      const state = JSON.parse(atob(encoded));
      if (state.layers) Object.entries(state.layers).forEach(([k, v]) => setLayer(k, v));
      if (state.sourceMode) setSourceMode(state.sourceMode);
      if (state.frequency) setFrequency(state.frequency);
      if (state.overrides) {
        Object.entries(state.overrides).forEach(([id, params]) => {
          Object.entries(params).forEach(([param, value]) => setOverride(id, param, value));
        });
      }
    } catch {
      // ignore malformed
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to URL on state change
  useEffect(() => {
    const state = { layers, sourceMode, frequency, overrides };
    const encoded = btoa(JSON.stringify(state));
    window.history.replaceState(null, '', `?s=${encoded}`);
  }, [layers, sourceMode, frequency, overrides]);
}

export default function App() {
  const circuit = useCircuitStore((s) => s.circuit);
  const isParsing = useCircuitStore((s) => s.isParsing);

  useUrlState();

  return (
    <main className="relative h-full w-full overflow-hidden bg-bg-deep text-[#e0e0f0]">
      <style>{`
        @keyframes glow-border {
          from { box-shadow: 0 0 12px rgba(0,212,255,0.15); }
          to   { box-shadow: 0 0 28px rgba(0,212,255,0.35); }
        }
      `}</style>

      <SceneCanvas />
      <Sidebar />
      <ComponentInspector />
      <ScreenshotButton />

      {!circuit && !isParsing && <LandingOverlay />}
      {isParsing && <LoadingSpinner />}
    </main>
  );
}
