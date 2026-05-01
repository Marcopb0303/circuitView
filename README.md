# EMViz — Electromagnetic Circuit Visualizer

Visualize the invisible physics inside your circuits. Drop in a LTspice .asc file and see magnetic fields, electric fields, and current flow animate in real time.

**Built by Marco Pena for the OpenAI Codex Creator Challenge.**

---

## Features

- **Parse real LTspice .asc schematics** — drop your file, see your actual circuit in 3D
- **Animated B-field lines** around inductors (dipole approximation, AC/DC aware, scales with √L)
- **Animated E-field lines** between capacitor plates (fringing included, polarity reversal in AC)
- **Current flow particle system** — green particles stream along all wires, reverse in AC
- **Metal target perturbation** — drag a conductive disc near an inductor to see field distortion and eddy current visualization
- **Component inspector** — click any part to see its value, node connections, and a physics explanation
- **Real-time parameter tuning** — override L, C, R values with a slider and watch the physics respond instantly
- **URL state sharing** — visualization state encodes to a base64 URL parameter
- **Screenshot export** — download the current canvas as PNG

---

## How to Use

1. Drop an LTspice `.asc` file onto the sidebar upload zone, or click **Try example circuit**
2. Use the layer toggles to show/hide Magnetic Field (B), Electric Field (E), and Current Flow
3. Switch between AC and DC source modes to see field behavior change
4. Click any component to open the inspector and adjust its value
5. Enable Metal Target and drag the disc near an inductor to see perturbation

---

## Physics Background

### Magnetic Field
Field lines follow the dipole approximation `r = r_max · sin²(θ)` in polar coordinates, distributed over 8 azimuthal angles. `r_max` scales logarithmically with inductance: `0.8 + log10(L_µH) × 0.4`, clamped to [0.5, 2.5] world units. In AC mode the field breathes at the animation speed; arrows flip direction when the current reverses.

### Electric Field
N parallel lines (N = clamp(C_nF × 2, 4, 12)) run between the capacitor's positive and negative pins. The outermost two lines bow outward to represent fringing fields. In AC mode opacity pulses with `|sin(t)|` and arrows reverse polarity.

### Current Flow
Particles are distributed uniformly along every wire and advance at `0.3 × animSpeed` world-units/second. In AC mode the direction reverses each half-cycle.

### Metal Target Perturbation
Field line points inside the disc's radius are pushed radially outward by `(discRadius − dist) × 1.5`. Eddy current rings on the disc surface pulse in phase with the B-field. A qualitative `Δf` shift label appears near the inductor.

---

## Stack

React · Three.js · @react-three/fiber · @react-three/drei · @react-three/postprocessing · Zustand · Tailwind CSS · Vite · Vercel
