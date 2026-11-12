// Real 3D characters for the "lowpoly" style: chunky faceted bodies built from simple shapes.
// They take the same cast settings, faces and poses as the flat cartoon characters.
import React from "react";
import * as THREE from "three";
import { col } from "./style";
import type { CastSpec, Face, Pose } from "./types";

type V3 = [number, number, number];
const M: React.FC<{ c: string }> = ({ c }) => <meshStandardMaterial color={col(c)} flatShading roughness={0.85} />;
const Dark = () => <meshBasicMaterial color="#1E1A17" toneMapped={false} />;

const Part: React.FC<{ geo: React.ReactElement; c: string; p?: V3; r?: V3; s?: V3 }> = ({ geo, c, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] }) => (
  <mesh position={p} rotation={r} scale={s} castShadow receiveShadow>{geo}<M c={c} /></mesh>
);

// brow tilt, eye size, mouth shape per expression
const FACE: Record<Face, { brow: number; eye: number; mouth: "flat" | "smile" | "frown" | "open" | "small" }> = {
  neutral: { brow: 0, eye: 1, mouth: "flat" },
  happy: { brow: 0, eye: 1, mouth: "smile" },
  joy: { brow: 0.1, eye: 0.35, mouth: "open" },
  sad: { brow: 0.4, eye: 1, mouth: "frown" },
  shocked: { brow: 0.15, eye: 1.6, mouth: "open" },
  angry: { brow: -0.45, eye: 0.9, mouth: "frown" },
  smug: { brow: -0.12, eye: 0.55, mouth: "smile" },
  think: { brow: 0.25, eye: 1, mouth: "small" },
  sleepy: { brow: 0, eye: 0.15, mouth: "small" },
  worried: { brow: 0.4, eye: 1.15, mouth: "small" },
};

// [left arm, right arm] swing outwards from the shoulder; 0 hangs straight down
const ARM_Z: Record<Pose, [number, number]> = { down: [-0.28, 0.28], up: [-2.55, 2.55], point: [-0.28, 1.45], hips: [-0.75, 0.75], hold: [-0.28, 0.95] };

const Hat: React.FC<{ s: CastSpec; y: number; r: number }> = ({ s, y, r }) => {
  const hat = s.hat ?? "none";
  const c = s.hatColor ?? (hat === "straw" ? "#E8C45A" : hat === "crown" ? "#F5C542" : hat === "tophat" ? "#2B2B33" : "#D9534F");
  if (hat === "cap") return <><Part geo={<sphereGeometry args={[r * 1.05, 8, 5, 0, Math.PI * 2, 0, Math.PI / 3]} />} c={c} p={[0, y + 0.02, 0]} /><Part geo={<boxGeometry args={[r * 1.1, 0.05, r * 0.7]} />} c={c} p={[0, y + r * 0.56, r * 1.05]} /></>;
  if (hat === "beanie") return <><Part geo={<sphereGeometry args={[r * 1.06, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2.8]} />} c={c} p={[0, y + 0.03, 0]} /><Part geo={<icosahedronGeometry args={[0.1, 0]} />} c="#FFFFFF" p={[0, y + r * 1.25, 0]} /></>;
  if (hat === "tophat") return <><Part geo={<cylinderGeometry args={[r * 1.25, r * 1.25, 0.05, 10]} />} c={c} p={[0, y + r * 0.72, 0]} /><Part geo={<cylinderGeometry args={[r * 0.72, r * 0.72, 0.5, 10]} />} c={c} p={[0, y + r * 0.72 + 0.26, 0]} /></>;
  if (hat === "straw") return <><Part geo={<cylinderGeometry args={[r * 1.7, r * 1.7, 0.04, 12]} />} c={c} p={[0, y + r * 0.62, 0]} /><Part geo={<cylinderGeometry args={[r * 0.7, r * 0.85, 0.24, 10]} />} c={c} p={[0, y + r * 0.62 + 0.13, 0]} /></>;
  if (hat === "crown") return <Part geo={<cylinderGeometry args={[r * 0.78, r * 0.62, 0.26, 5, 1, true]} />} c={c} p={[0, y + r * 0.95, 0]} />;
  return null;
};

export const LowPolyBody: React.FC<{ spec: CastSpec; face: Face; pose: Pose; mouth: boolean; blink: boolean }> = ({ spec, face, pose, mouth, blink }) => {
  const f = FACE[face] ?? FACE.neutral;
  const owl = spec.kind === "owl";
  const skin = spec.skin ?? "#F2D3B1";
  const outfit = spec.outfit ?? (owl ? "#8A5A3B" : "#3A7BD5");
  const hairC = spec.hairColor ?? "#2B2320";
  const hair = spec.hair ?? "short";
  const eyeH = blink ? 0.02 : 0.1 * f.eye;
  const say = mouth ? "open" : f.mouth;

  if (owl) {
    const hy = 1.0;
    return (
      <group>
        <Part geo={<icosahedronGeometry args={[0.55, 1]} />} c={outfit} p={[0, 0.72, 0]} s={[1, 1.25, 0.95]} />
        <Part geo={<icosahedronGeometry args={[0.36, 1]} />} c="#F1DFBF" p={[0, 0.55, 0.3]} s={[1, 1.15, 0.6]} />
        {[-1, 1].map((sg) => (
          <group key={sg}>
            <Part geo={<coneGeometry args={[0.13, 0.3, 4]} />} c={outfit} p={[sg * 0.3, 1.45, 0]} r={[0, 0, -sg * 0.3]} />
            <Part geo={<cylinderGeometry args={[0.17, 0.17, 0.05, 10]} />} c="#FFFFFF" p={[sg * 0.2, hy, 0.5]} r={[Math.PI / 2, 0, 0]} />
            <mesh position={[sg * 0.2, hy, 0.535]} scale={[1, blink ? 0.15 : 1, 1]}><sphereGeometry args={[0.07, 8, 6]} /><Dark /></mesh>
            <Part geo={<boxGeometry args={[0.12, 0.5, 0.36]} />} c={outfit} p={[sg * 0.56, 0.72, 0]} r={[0, 0, sg * (pose === "point" && sg > 0 ? 1.3 : 0.12)]} />
            <Part geo={<boxGeometry args={[0.16, 0.05, 0.22]} />} c="#F2A33A" p={[sg * 0.18, 0.03, 0.12]} />
          </group>
        ))}
        <Part geo={<coneGeometry args={[0.09, mouth ? 0.14 : 0.2, 4]} />} c="#F2A33A" p={[0, hy - 0.16, 0.55]} r={[Math.PI / 2 + 0.6, 0, 0]} />
        {spec.extra === "glasses" ? [-1, 1].map((sg) => <mesh key={sg} position={[sg * 0.2, hy, 0.55]}><torusGeometry args={[0.19, 0.018, 4, 12]} /><Dark /></mesh>) : null}
        <Hat s={spec} y={1.15} r={0.4} />
      </group>
    );
  }

  const hy = 1.27, hr = 0.4;
  const [la, ra] = ARM_Z[pose] ?? ARM_Z.down;
  return (
    <group>
      {[-1, 1].map((sg) => <Part key={sg} geo={<boxGeometry args={[0.15, 0.3, 0.2]} />} c="#3A2E28" p={[sg * 0.13, 0.15, 0.02]} />)}
      <Part geo={<cylinderGeometry args={[0.24, 0.36, 0.62, 7]} />} c={outfit} p={[0, 0.6, 0]} />
      {[[-1, la], [1, ra]].map(([sg, rot]) => (
        <group key={sg} position={[sg * 0.31, 0.86, 0]} rotation={[0, 0, rot]}>
          <Part geo={<boxGeometry args={[0.1, 0.4, 0.1]} />} c={outfit} p={[0, -0.2, 0]} />
          <Part geo={<icosahedronGeometry args={[0.075, 0]} />} c={skin} p={[0, -0.43, 0]} />
        </group>
      ))}
      <Part geo={<icosahedronGeometry args={[hr, 1]} />} c={skin} p={[0, hy, 0]} />
      {hair !== "none" ? <Part geo={<sphereGeometry args={[hr * 1.06, 8, 5, 0, Math.PI * 2, 0, hair === "bowl" ? Math.PI / 1.9 : Math.PI / 2.5]} />} c={hairC} p={[0, hy + 0.02, -0.03]} r={[-0.25, 0, 0]} /> : null}
      {hair === "bun" ? <Part geo={<icosahedronGeometry args={[0.15, 0]} />} c={hairC} p={[0, hy + hr + 0.08, -0.05]} /> : null}
      {hair === "long" ? <Part geo={<boxGeometry args={[hr * 1.9, 0.6, 0.2]} />} c={hairC} p={[0, hy - 0.2, -0.28]} /> : null}
      {hair === "spiky" ? [-0.18, 0, 0.18].map((x) => <Part key={x} geo={<coneGeometry args={[0.1, 0.24, 4]} />} c={hairC} p={[x, hy + hr + 0.02, 0]} />) : null}
      {hair === "curly" ? [[-0.25, 0.28], [0, 0.4], [0.25, 0.28], [-0.36, 0.05], [0.36, 0.05]].map(([x, y], i) => <Part key={i} geo={<icosahedronGeometry args={[0.15, 0]} />} c={hairC} p={[x, hy + y, -0.02]} />) : null}
      {spec.extra === "beard" ? <Part geo={<sphereGeometry args={[hr * 1.04, 8, 5, 0, Math.PI * 2, Math.PI / 1.7, Math.PI / 2]} />} c={hairC} p={[0, hy, 0.03]} r={[0.3, 0, 0]} /> : null}
      {spec.extra === "moustache" ? <Part geo={<boxGeometry args={[0.22, 0.05, 0.05]} />} c={hairC} p={[0, hy - 0.1, hr * 0.97]} /> : null}
      {[-1, 1].map((sg) => (
        <group key={sg}>
          <mesh position={[sg * 0.14, hy + 0.04, hr * 0.93]}><boxGeometry args={[0.07, eyeH, 0.04]} /><Dark /></mesh>
          <mesh position={[sg * 0.14, hy + 0.16 + (face === "shocked" ? 0.04 : 0), hr * 0.93]} rotation={[0, 0, -sg * f.brow]}><boxGeometry args={[0.13, 0.025, 0.03]} /><Dark /></mesh>
          {spec.extra === "glasses" ? <mesh position={[sg * 0.14, hy + 0.04, hr * 0.98]}><torusGeometry args={[0.1, 0.014, 4, 12]} /><Dark /></mesh> : null}
        </group>
      ))}
      {say === "flat" || say === "small" ? <mesh position={[0, hy - 0.17, hr * 0.92]}><boxGeometry args={[say === "small" ? 0.07 : 0.15, 0.025, 0.03]} /><Dark /></mesh> : null}
      {say === "open" ? <mesh position={[0, hy - 0.18, hr * 0.9]}><boxGeometry args={[0.13, 0.1, 0.04]} /><meshBasicMaterial color="#5A1F1F" toneMapped={false} /></mesh> : null}
      {say === "smile" ? <mesh position={[0, hy - 0.11, hr * 0.92]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.09, 0.016, 4, 8, Math.PI]} /><Dark /></mesh> : null}
      {say === "frown" ? <mesh position={[0, hy - 0.24, hr * 0.92]}><torusGeometry args={[0.08, 0.016, 4, 8, Math.PI]} /><Dark /></mesh> : null}
      <Hat s={spec} y={hy} r={hr} />
    </group>
  );
};

// where a held emoji goes, relative to the feet
export const HAND: V3 = [0.62, 0.72, 0.15];
export const _three = THREE; // keeps the import for JSX intrinsic types
