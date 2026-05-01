import { create } from 'zustand';
import { parseAsc } from '../parser/ascParser.js';

const DEFAULT_LAYERS = {
  magneticField: true,
  electricField: true,
  currentFlow: true,
  componentLabels: true,
  metalTarget: false,
};

export const useCircuitStore = create((set) => ({
  circuit: null,
  circuitName: null,
  parseError: null,
  isParsing: false,
  layers: DEFAULT_LAYERS,
  sourceMode: 'AC',
  frequency: 455000,
  amplitude: 9,
  overrides: {},
  selectedComponent: null,
  cameraTarget: null,
  isMetalDragging: false,
  metalTargetPosition: { x: 0, y: 0, z: 0 },
  animationSpeed: 1,

  loadCircuit: (ascText, circuitName = 'uploaded.asc') => {
    set({ isParsing: true, parseError: null });

    try {
      const circuit = parseAsc(ascText);

      if (circuit.components.length === 0 && circuit.wires.length === 0) {
        throw new Error(
          'No LTspice components or wires were found in this .asc file.',
        );
      }

      set({
        circuit,
        circuitName,
        sourceMode:
          circuit.source?.waveform && circuit.source.waveform !== 'DC'
            ? 'AC'
            : 'DC',
        frequency: circuit.source?.frequency ?? 455000,
        amplitude: circuit.source?.amplitude ?? 9,
        parseError: null,
        isParsing: false,
      });
      return circuit;
    } catch (error) {
      set({
        parseError: error instanceof Error ? error.message : String(error),
        isParsing: false,
      });
      return null;
    }
  },

  clearCircuit: () =>
    set({
      circuit: null,
      circuitName: null,
      parseError: null,
      isParsing: false,
    }),

  toggleLayer: (layerName) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layerName]: !state.layers[layerName],
      },
    })),

  setLayer: (layerName, value) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layerName]: value,
      },
    })),

  setSourceMode: (sourceMode) => set({ sourceMode }),
  setFrequency: (frequency) => set({ frequency }),
  setAmplitude: (amplitude) => set({ amplitude }),
  setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
  setMetalTargetPosition: (metalTargetPosition) => set({ metalTargetPosition }),
  selectComponent: (selectedComponent) => set({ selectedComponent }),
  setCameraTarget: (cameraTarget) => set({ cameraTarget }),
  setMetalDragging: (isMetalDragging) => set({ isMetalDragging }),
  setOverride: (componentId, param, value) =>
    set((state) => ({
      overrides: {
        ...state.overrides,
        [componentId]: {
          ...(state.overrides[componentId] ?? {}),
          [param]: value,
        },
      },
    })),
}));
