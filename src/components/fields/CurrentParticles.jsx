import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCircuitStore } from '../../store/circuitStore.js';
import { buildParticleData } from '../../physics/currentFlow.js';

export default function CurrentParticles({ wires, components }) {
  const sourceMode = useCircuitStore((s) => s.sourceMode);
  const animationSpeed = useCircuitStore((s) => s.animationSpeed);

  const { particles, totalCount } = useMemo(
    () => buildParticleData(wires, components),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wires, components],
  );

  const mainRef = useRef();
  const glowRef = useRef();
  const tValues = useRef(particles.map((p) => p.t));
  const lastTime = useRef(0);

  const stateRef = useRef({ sourceMode, animationSpeed });
  stateRef.current = { sourceMode, animationSpeed };

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!mainRef.current || totalCount === 0) return;

    const now = clock.elapsedTime;
    const dt = Math.min(now - lastTime.current, 0.05);
    lastTime.current = now;

    const { sourceMode: mode, animationSpeed: speed } = stateRef.current;
    const baseSpeed = 0.3 * speed;
    const direction = mode === 'AC' ? Math.sign(Math.sin(now * speed)) : 1;
    const advance = baseSpeed * direction * dt;

    for (let i = 0; i < particles.length; i++) {
      let t = tValues.current[i] + advance;
      if (t > 1) t -= 1;
      if (t < 0) t += 1;
      tValues.current[i] = t;

      const { from, to } = particles[i];
      dummy.position.lerpVectors(from, to, t);
      dummy.updateMatrix();
      mainRef.current.setMatrixAt(i, dummy.matrix);
    }

    mainRef.current.instanceMatrix.needsUpdate = true;

    if (glowRef.current) {
      mainRef.current.instanceMatrix.version; // touch
      glowRef.current.instanceMatrix.copy(mainRef.current.instanceMatrix);
      glowRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  if (totalCount === 0) return null;

  return (
    <>
      <instancedMesh ref={mainRef} args={[null, null, totalCount]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#00ff88" />
      </instancedMesh>
      <instancedMesh ref={glowRef} args={[null, null, totalCount]}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshBasicMaterial
          color="#00ff88"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  );
}
