import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useCircuitStore } from '../../store/circuitStore.js';
import CircuitScene from './CircuitScene.jsx';

function LightMarker() {
  return (
    <mesh position={[1.8, 2.2, 1.4]}>
      <sphereGeometry args={[0.08, 24, 24]} />
      <meshBasicMaterial color="#ffffff" />
      <pointLight color="#ffffff" intensity={85} distance={8} decay={2} />
    </mesh>
  );
}

function CameraController() {
  const cameraTarget = useCircuitStore((s) => s.cameraTarget);
  const isMetalDragging = useCircuitStore((s) => s.isMetalDragging);
  const controlsRef = useRef();
  const targetVec = useRef(new THREE.Vector3(0.85, 0, 0));

  useFrame(() => {
    if (!controlsRef.current) return;
    if (cameraTarget) {
      targetVec.current.set(cameraTarget.x + 0.85, cameraTarget.y, cameraTarget.z);
    }
    controlsRef.current.target.lerp(targetVec.current, 0.05);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!isMetalDragging}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.5}
      maxDistance={16}
      screenSpacePanning={true}
      makeDefault
    />
  );
}

export default function SceneCanvas() {
  const circuit = useCircuitStore((state) => state.circuit);

  return (
    <Canvas
      camera={{ position: [3.4, 3, 4.8], fov: 48, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      className="h-full w-full"
    >
      <color attach="background" args={['#0a0a0f']} />
      <ambientLight intensity={0.8} />
      <LightMarker />
      <CircuitScene circuit={circuit} />
      <CameraController />
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.5} />
      </EffectComposer>
    </Canvas>
  );
}
