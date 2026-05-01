import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCircuitStore } from '../../store/circuitStore.js';
import { computeDipoleFieldLines, perturbPoints } from '../../physics/magneticField.js';

const COLOR_COLD = new THREE.Color('#0066ff');
const COLOR_HOT = new THREE.Color('#00d4ff');
const FLIP_QUAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);

// Log-normalize frequency → visual cycles/sec so different circuits animate at
// perceptibly different speeds. 10 Hz → ~0.4 cps, 455 kHz → ~2.4 cps, 1 MHz → ~2.6 cps
function animRate(frequency, speed) {
  return (Math.log10(Math.max(frequency, 10)) / Math.log10(1e7)) * 3 * speed;
}

function buildLineGeometries(points) {
  const curve = new THREE.CatmullRomCurve3(points);
  return {
    main: new THREE.TubeGeometry(curve, 30, 0.015, 6, false),
    glow: new THREE.TubeGeometry(curve, 30, 0.045, 6, false),
  };
}

function arrowMeta(points) {
  const mid = Math.floor(points.length / 2);
  const prev = points[Math.max(mid - 1, 0)];
  const next = points[Math.min(mid + 1, points.length - 1)];
  const tangent = new THREE.Vector3().subVectors(next, prev);
  if (tangent.length() < 0.001) tangent.set(1, 0, 0);
  tangent.normalize();
  const baseQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  return {
    position: points[mid].clone(),
    baseQuat,
    flippedQuat: new THREE.Quaternion().copy(baseQuat).multiply(FLIP_QUAT),
  };
}

function InductorField({ component, metalTargetWorld }) {
  const sourceMode = useCircuitStore((s) => s.sourceMode);
  const animationSpeed = useCircuitStore((s) => s.animationSpeed);
  const frequency = useCircuitStore((s) => s.frequency);
  const override = useCircuitStore((s) => s.overrides[component.id]);

  const L = override?.value ?? component.value ?? 1e-4;

  const { lines } = useMemo(() => computeDipoleFieldLines(L), [L]);

  const fieldData = useMemo(() => {
    return lines.map((points) => {
      const { main, glow } = buildLineGeometries(points);
      const mainMat = new THREE.MeshBasicMaterial({ color: COLOR_COLD.clone(), transparent: true, opacity: 0.9 });
      const glowMat = new THREE.MeshBasicMaterial({
        color: COLOR_HOT.clone(),
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const arrowMat = new THREE.MeshBasicMaterial({ color: COLOR_HOT.clone(), transparent: true, opacity: 1 });
      return { mainGeo: main, glowGeo: glow, mainMat, glowMat, arrowMat, arrow: arrowMeta(points), points };
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
  const mainRefs = useRef([]);
  const glowRefs = useRef([]);
  const arrowRefs = useRef([]);
  const perturbedGeos = useRef(lines.map(() => ({ main: null, glow: null })));

  const stateRef = useRef({ sourceMode, animationSpeed, frequency, metalTargetWorld });
  stateRef.current = { sourceMode, animationSpeed, frequency, metalTargetWorld };
  const fieldDataRef = useRef(fieldData);
  fieldDataRef.current = fieldData;
  const componentRef = useRef(component);
  componentRef.current = component;

  useFrame(({ clock }) => {
    const { sourceMode: mode, animationSpeed: speed, frequency: freq, metalTargetWorld: mt } = stateRef.current;
    const data = fieldDataRef.current;
    const comp = componentRef.current;
    const t = clock.elapsedTime;

    // Field phase: in DC = full strength; in AC = sin wave at frequency-derived rate
    let phase = 1;
    if (mode === 'AC') {
      const rate = animRate(freq, speed);
      phase = Math.sin(t * rate);
    }
    const abs = Math.abs(phase);

    // Scale the whole group so field lines physically shrink to 0 and grow back out.
    // This is the key visual that shows the field actually oscillating, not just fading.
    if (groupRef.current) {
      groupRef.current.scale.setScalar(Math.max(0.02, abs));
    }

    // Metal perturbation in local space
    const wPos = comp.worldPosition;
    let localMetal = null;
    let metalNearby = false;
    if (mt) {
      const dx = mt.x - wPos.x;
      const dy = mt.y - wPos.y;
      const dz = mt.z - wPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      metalNearby = dist < 2.0;
      if (metalNearby) localMetal = new THREE.Vector3(dx, dy, dz);
    }

    data.forEach(({ mainGeo, glowGeo, mainMat, glowMat, arrowMat, arrow, points }, i) => {
      const mainMesh = mainRefs.current[i];
      const glowMesh = glowRefs.current[i];
      const arrowMesh = arrowRefs.current[i];

      // Metal perturbation: rebuild geometry this frame
      if (metalNearby && localMetal) {
        const perturbed = perturbPoints(points, localMetal);
        const curve = new THREE.CatmullRomCurve3(perturbed);
        const newMain = new THREE.TubeGeometry(curve, 30, 0.015, 6, false);
        const newGlow = new THREE.TubeGeometry(curve, 30, 0.045, 6, false);
        if (perturbedGeos.current[i].main) perturbedGeos.current[i].main.dispose();
        if (perturbedGeos.current[i].glow) perturbedGeos.current[i].glow.dispose();
        perturbedGeos.current[i] = { main: newMain, glow: newGlow };
        if (mainMesh) mainMesh.geometry = newMain;
        if (glowMesh) glowMesh.geometry = newGlow;
      } else if (!metalNearby && perturbedGeos.current[i].main) {
        perturbedGeos.current[i].main.dispose();
        perturbedGeos.current[i].glow.dispose();
        perturbedGeos.current[i] = { main: null, glow: null };
        if (mainMesh) mainMesh.geometry = mainGeo;
        if (glowMesh) glowMesh.geometry = glowGeo;
      }

      // Color: lerp cold→hot as field grows stronger
      mainMat.color.lerpColors(COLOR_COLD, COLOR_HOT, abs);
      mainMat.opacity = 0.7 + abs * 0.3;
      glowMat.opacity = abs * 0.18;
      arrowMat.opacity = Math.max(0.2, abs);

      // Arrow direction flips when current reverses
      if (arrowMesh) {
        arrowMesh.quaternion.copy(phase >= 0 ? arrow.baseQuat : arrow.flippedQuat);
      }
    });
  });

  const pos = component.worldPosition;
  return (
    <group ref={groupRef} position={[pos.x, pos.y, pos.z]} rotation={[0, component.worldRotationY, 0]}>
      {fieldData.map(({ mainGeo, glowGeo, mainMat, glowMat, arrowMat, arrow }, i) => (
        <group key={i}>
          <mesh ref={(el) => { mainRefs.current[i] = el; }} geometry={mainGeo} material={mainMat} />
          <mesh ref={(el) => { glowRefs.current[i] = el; }} geometry={glowGeo} material={glowMat} />
          <mesh ref={(el) => { arrowRefs.current[i] = el; }} position={arrow.position} quaternion={arrow.baseQuat} material={arrowMat}>
            <coneGeometry args={[0.03, 0.08, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function MagneticField({ components, metalTargetWorld }) {
  return (
    <>
      {components
        .filter((c) => c.type === 'inductor')
        .map((c) => (
          <InductorField key={c.id} component={c} metalTargetWorld={metalTargetWorld} />
        ))}
    </>
  );
}
