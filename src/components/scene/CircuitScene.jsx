import { useMemo } from 'react';
import { Grid, Text } from '@react-three/drei';
import { layoutCircuit } from '../../parser/layoutEngine.js';
import { useCircuitStore } from '../../store/circuitStore.js';
import ComponentMesh from './ComponentMesh.jsx';
import WireMesh from './WireMesh.jsx';
import MagneticField from '../fields/MagneticField.jsx';
import ElectricField from '../fields/ElectricField.jsx';
import CurrentParticles from '../fields/CurrentParticles.jsx';
import MetalTarget from '../fields/MetalTarget.jsx';

function ComponentLabel({ component }) {
  const valueLabel = component.valueRaw ? ` ${component.valueRaw}` : '';
  return (
    <Text
      position={[
        component.worldPosition.x,
        component.worldPosition.y + 0.45,
        component.worldPosition.z,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={0.12}
      color="#e0e0f0"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.006}
      outlineColor="#080810"
    >
      {component.id}
      {valueLabel}
    </Text>
  );
}

export default function CircuitScene({ circuit }) {
  const layout = useMemo(() => layoutCircuit(circuit), [circuit]);
  const layers = useCircuitStore((s) => s.layers);
  const metalTargetPosition = useCircuitStore((s) => s.metalTargetPosition);

  if (!layout) {
    return (
      <group position={[0.85, 0, 0]}>
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          sectionSize={2}
          cellColor="#1a1a3a"
          sectionColor="#2a2a5a"
          fadeDistance={25}
          fadeStrength={1.5}
          infiniteGrid
        />
      </group>
    );
  }

  return (
    <group position={[0.85, 0, 0]}>
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        sectionSize={2}
        cellColor="#1a1a3a"
        sectionColor="#2a2a5a"
        fadeDistance={25}
        fadeStrength={1.5}
        infiniteGrid
      />

      {layout.wires.map((wire) => (
        <WireMesh key={wire.id} wire={wire} />
      ))}

      {layout.components.map((component) => (
        <ComponentMesh key={component.id} component={component} />
      ))}

      {layers.componentLabels &&
        layout.components.map((component) => (
          <ComponentLabel key={`${component.id}-label`} component={component} />
        ))}

      {layers.magneticField && (
        <MagneticField
          components={layout.components}
          metalTargetWorld={layers.metalTarget ? metalTargetPosition : null}
        />
      )}

      {layers.electricField && (
        <ElectricField components={layout.components} />
      )}

      {layers.currentFlow && (
        <CurrentParticles wires={layout.wires} />
      )}

      {layers.metalTarget && (
        <MetalTarget components={layout.components} />
      )}
    </group>
  );
}
