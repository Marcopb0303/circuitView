import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCircuitStore } from '../../store/circuitStore.js';
import { computeEFieldLines } from '../../physics/electricField.js';

const COLOR_ORIGIN = new THREE.Color('#ff8800');
const COLOR_TIP = new THREE.Color('#ffee00');
const FLIP_QUAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);

// Same log-normalized rate as MagneticField so both fields are phase-locked
function animRate(frequency, speed) {
  return (Math.log10(Math.max(frequency, 10)) / Math.log10(1e7)) * 3 * speed;
}

function CapacitorField({ component }) {
  const sourceMode = useCircuitStore((s) => s.sourceMode);
  const animationSpeed = useCircuitStore((s) => s.animationSpeed);
  const frequency = useCircuitStore((s) => s.frequency);
  const override = useCircuitStore((s) => s.overrides[component.id]);

  const C = override?.value ?? component.value ?? 1e-9;
  const pin1 = component.pins[0]?.worldPosition;
  const pin2 = component.pins[1]?.worldPosition;

  const { lines } = useMemo(() => {
    if (!pin1 || !pin2) return { lines: [] };
    return computeEFieldLines(pin1, pin2, C);
  }, [pin1, pin2, C]);

  const fieldData = useMemo(() => {
    return lines.map(([p0, mid, p2]) => {
      const curve = new THREE.CatmullRomCurve3([p0, mid, p2]);
      const mainGeo = new THREE.TubeGeometry(curve, 20, 0.012, 6, false);
      const glowGeo = new THREE.TubeGeometry(curve, 20, 0.036, 6, false);
      const mainMat = new THREE.MeshBasicMaterial({ color: COLOR_ORIGIN.clone(), transparent: true, opacity: 1 });
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffaa00'),
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const arrowMat = new THREE.MeshBasicMaterial({ color: COLOR_TIP.clone(), transparent: true, opacity: 1 });

      const tangent = new THREE.Vector3().subVectors(p2, p0).normalize();
      const baseQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      const flippedQuat = new THREE.Quaternion().copy(baseQuat).multiply(FLIP_QUAT);

      return { mainGeo, glowGeo, mainMat, glowMat, arrowMat, arrowPos: p2.clone(), baseQuat, flippedQuat };
    });
  }, [lines]);

  useEffect(() => {
    return () => {
      fieldData.forEach(({ mainGeo, glowGeo, mainMat, glowMat, arrowMat }) => {
        mainGeo.dispose(); glowGeo.dispose(); mainMat.dispose(); glowMat.dispose(); arrowMat.dispose();
      });
    };
  }, [fieldData]);

  const groupRef = useRef();
  const arrowRefs = useRef([]);
  const stateRef = useRef({ sourceMode, animationSpeed, frequency });
  stateRef.current = { sourceMode, animationSpeed, frequency };
  const fieldDataRef = useRef(fieldData);
  fieldDataRef.current = fieldData;

  useFrame(({ clock }) => {
    const { sourceMode: mode, animationSpeed: speed, frequency: freq } = stateRef.current;
    const data = fieldDataRef.current;
    const t = clock.elapsedTime;

    let phase = 1;
    if (mode === 'AC') {
      const rate = animRate(freq, speed);
      phase = Math.sin(t * rate);
    }
    const abs = Math.abs(phase);

    // Scale the group so field lines physically appear/disappear as plates charge/discharge
    if (groupRef.current) {
      groupRef.current.scale.setScalar(Math.max(0.02, abs));
    }

    data.forEach(({ mainMat, glowMat, arrowMat, baseQuat, flippedQuat }, i) => {
      mainMat.color.lerpColors(COLOR_ORIGIN, COLOR_TIP, abs);
      mainMat.opacity = 0.7 + abs * 0.3;
      glowMat.opacity = abs * 0.14;
      arrowMat.opacity = Math.max(0.2, abs);

      const arrowMesh = arrowRefs.current[i];
      if (arrowMesh) {
        arrowMesh.quaternion.copy(phase >= 0 ? baseQuat : flippedQuat);
      }
    });
  });

  if (!pin1 || !pin2 || fieldData.length === 0) return null;

  // Centre of the capacitor — scale pivot for the E-field group
  const cx = (pin1.x + pin2.x) / 2;
  const cy = (pin1.y + pin2.y) / 2;
  const cz = (pin1.z + pin2.z) / 2;

  return (
    <group ref={groupRef} position={[cx, cy, cz]}>
      {fieldData.map(({ mainGeo, glowGeo, mainMat, glowMat, arrowMat, arrowPos, baseQuat }, i) => {
        // Shift geometry into group-local coords
        const localPos = new THREE.Vector3(arrowPos.x - cx, arrowPos.y - cy, arrowPos.z - cz);
        return (
          <group key={i}>
            {/* Geometries were built in world space; translate them back to local */}
            <mesh
              geometry={mainGeo}
              material={mainMat}
              position={[-cx, -cy, -cz]}
            />
            <mesh
              geometry={glowGeo}
              material={glowMat}
              position={[-cx, -cy, -cz]}
            />
            <mesh
              ref={(el) => { arrowRefs.current[i] = el; }}
              position={localPos}
              quaternion={baseQuat}
              material={arrowMat}
            >
              <coneGeometry args={[0.025, 0.07, 8]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function ElectricField({ components }) {
  return (
    <>
      {components
        .filter((c) => c.type === 'capacitor')
        .map((c) => (
          <CapacitorField key={c.id} component={c} />
        ))}
    </>
  );
}
