// The 3D prop library. Everything is built from simple shapes with a cartoon (toon) material
// and a dark outline, so it matches the hand-drawn characters.
import React from "react";
import * as THREE from "three";
import { getEmoji, getTextTexture } from "./characters";
import { col, style } from "./style";
import type { PropSpec, TimeOfDay } from "./types";

type V3 = [number, number, number];
export type PropCtx = { t: number; p: number; yawAt: (x: number, z: number) => number; leanAt: (x: number, z: number) => number; time: TimeOfDay; tint: string };

/** The prop material. Which kind depends on the active style. */
export const Toon: React.FC<{ c: string }> = ({ c }) => {
  const kind = style().props;
  const color = col(c);
  if (kind === "matte") return <meshLambertMaterial color={color} />;
  if (kind === "flat") return <meshBasicMaterial color={color} toneMapped={false} />;
  if (kind === "faceted") return <meshStandardMaterial color={color} flatShading roughness={0.85} />;
  if (kind === "soft") return <meshStandardMaterial color={color} roughness={style().roughness} />;
  if (kind === "plastic") return <meshStandardMaterial color={color} roughness={0.3} />;
  return <meshToonMaterial color={color} />;
};
const Ink = () => <meshBasicMaterial color={style().ink} side={THREE.BackSide} toneMapped={false} />;
const ok = (o: number) => o * style().outline;

/** Box with an exact-width outline. */
/** Toy-brick studs on top of a block (bricks style). */
const Studs: React.FC<{ s: V3; c: string }> = ({ s, c }) => {
  const nx = Math.min(8, Math.floor(s[0] / 0.36));
  const nz = Math.min(8, Math.floor(s[2] / 0.36));
  if (nx < 1 || nz < 1 || s[1] < 0.06) return null;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    items.push(
      <mesh key={`${i}-${j}`} position={[(i - (nx - 1) / 2) * (s[0] / nx), s[1] / 2 + 0.035, (j - (nz - 1) / 2) * (s[2] / nz)]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.07, 16]} />
        <Toon c={c} />
      </mesh>,
    );
  }
  return <>{items}</>;
};

export const Box: React.FC<{ s: V3; p?: V3; r?: V3; c: string; o?: number }> = ({ s, p = [0, 0, 0], r = [0, 0, 0], c, o = 0.045 }) => (
  <group position={p} rotation={r}>
    <mesh castShadow receiveShadow><boxGeometry args={s} /><Toon c={c} /></mesh>
    {style().studs ? <Studs s={s} c={c} /> : null}
    {ok(o) > 0 ? <mesh><boxGeometry args={[s[0] + ok(o) * 2, s[1] + ok(o) * 2, s[2] + ok(o) * 2]} /><Ink /></mesh> : null}
  </group>
);

/** Any geometry with a scaled-shell outline. */
const Shape: React.FC<{ geo: React.ReactElement; c: string; p?: V3; r?: V3; s?: V3; o?: number }> = ({ geo, c, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], o = 0.05 }) => (
  <group position={p} rotation={r} scale={s}>
    <mesh castShadow receiveShadow>{geo}<Toon c={c} /></mesh>
    {ok(o) > 0 ? <mesh scale={1 + ok(o)}>{geo}<Ink /></mesh> : null}
  </group>
);

const Flat: React.FC<{ w: number; d: number; c: string; y?: number }> = ({ w, d, c, y = 0.02 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow><planeGeometry args={[w, d]} /><meshStandardMaterial color={col(c)} roughness={1} /></mesh>
);

const rand = (seed: number) => {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};

const House: React.FC<{ q: PropSpec }> = ({ q }) => {
  const w = q.w ?? 3, h = q.h ?? 2.4, d = q.d ?? 3;
  return (
    <>
      <Box s={[w, h, d]} p={[0, h / 2, 0]} c={q.color ?? "#F4E3C1"} />
      <Shape geo={<coneGeometry args={[Math.max(w, d) * 0.82, 1.5, 4]} />} c={q.color2 ?? "#C8553D"} p={[0, h + 0.75, 0]} r={[0, Math.PI / 4, 0]} o={0.035} />
      <Box s={[0.72, 1.25, 0.08]} p={[0, 0.625, d / 2 + 0.03]} c="#7A4A2A" o={0.03} />
      {[-1, 1].map((sgn) => <Box key={sgn} s={[0.58, 0.58, 0.08]} p={[sgn * w * 0.3, h * 0.66, d / 2 + 0.03]} c="#9FD3F2" o={0.03} />)}
    </>
  );
};

const Tower: React.FC<{ q: PropSpec }> = ({ q }) => {
  const w = q.w ?? 3, h = q.h ?? 7, d = q.d ?? 3;
  const floors = Math.max(1, Math.floor(h / 1.5));
  return (
    <>
      <Box s={[w, h, d]} p={[0, h / 2, 0]} c={q.color ?? "#E9D5B5"} />
      <Box s={[w + 0.3, 0.25, d + 0.3]} p={[0, h + 0.12, 0]} c={q.color2 ?? "#8C6E5D"} />
      {Array.from({ length: floors }).flatMap((_, fl) => [-1, 1].map((sgn) => (
        <Box key={`${fl}${sgn}`} s={[0.6, 0.75, 0.08]} p={[sgn * w * 0.25, 1.1 + fl * 1.5, d / 2 + 0.03]} c="#9FD3F2" o={0.03} />
      )))}
    </>
  );
};

const Tree: React.FC<{ q: PropSpec }> = ({ q }) => {
  const c = q.color ?? "#4FAE4E";
  return (
    <>
      <Shape geo={<cylinderGeometry args={[0.2, 0.28, 1.5, 10]} />} c="#7A4A2A" p={[0, 0.75, 0]} />
      <Shape geo={<icosahedronGeometry args={[1.15, 1]} />} c={c} p={[0, 2.3, 0]} o={0.04} />
      <Shape geo={<icosahedronGeometry args={[0.8, 1]} />} c={c} p={[0.75, 1.85, 0.25]} o={0.05} />
      <Shape geo={<icosahedronGeometry args={[0.75, 1]} />} c={c} p={[-0.7, 1.95, -0.2]} o={0.05} />
    </>
  );
};

const Pine: React.FC<{ q: PropSpec }> = ({ q }) => (
  <>
    <Shape geo={<cylinderGeometry args={[0.18, 0.24, 1, 10]} />} c="#7A4A2A" p={[0, 0.5, 0]} />
    {[0, 1, 2].map((i) => <Shape key={i} geo={<coneGeometry args={[1.1 - i * 0.25, 1.4, 10]} />} c={q.color ?? "#2F8F5B"} p={[0, 1.5 + i * 0.8, 0]} o={0.04} />)}
  </>
);

const Logs: React.FC<{ q: PropSpec }> = ({ q }) => {
  const n = q.count ?? 6;
  const base = Math.ceil((Math.sqrt(8 * n + 1) - 1) / 2);
  const items: React.ReactNode[] = [];
  let left = n;
  for (let row = 0; row < base && left > 0; row++) {
    const inRow = Math.min(base - row, left);
    for (let i = 0; i < inRow; i++) {
      const x = (i - (base - row - 1) / 2) * 0.46;
      items.push(
        <group key={`${row}-${i}`} position={[x, 0.22 + row * 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <Shape geo={<cylinderGeometry args={[0.22, 0.22, q.len ?? 1.5, 12]} />} c={q.color ?? "#A8703C"} o={0.06} />
          <mesh position={[0, (q.len ?? 1.5) / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.17, 12]} /><meshBasicMaterial color="#E7C690" /></mesh>
        </group>,
      );
    }
    left -= inRow;
  }
  return <>{items}</>;
};

const Coins: React.FC<{ q: PropSpec }> = ({ q }) => {
  const n = q.count ?? 5;
  const perStack = 8;
  const stacks = Math.ceil(n / perStack);
  const rnd = rand(n + 3);
  return (
    <>
      {Array.from({ length: stacks }).map((_, s) => {
        const count = Math.min(perStack, n - s * perStack);
        const ang = s * 2.4;
        const rad = s === 0 ? 0 : 0.35 + 0.22 * Math.sqrt(s);
        return (
          <group key={s} position={[Math.cos(ang) * rad, 0, Math.sin(ang) * rad]}>
            {Array.from({ length: count }).map((__, i) => (
              <Shape key={i} geo={<cylinderGeometry args={[0.26, 0.26, 0.085, 16]} />} c={i % 2 ? "#F5C542" : "#E5AE2C"} p={[(rnd() - 0.5) * 0.05, 0.045 + i * 0.09, (rnd() - 0.5) * 0.05]} o={0.06} />
            ))}
          </group>
        );
      })}
    </>
  );
};

const Stall: React.FC<{ q: PropSpec }> = ({ q }) => (
  <>
    <Box s={[2.5, 0.95, 1]} p={[0, 0.475, 0]} c="#B5773D" />
    {[[-1.15, -0.4], [1.15, -0.4], [-1.15, 0.4], [1.15, 0.4]].map(([x, z], i) => <Box key={i} s={[0.1, 2.3, 0.1]} p={[x, 1.15, z]} c="#7A4A2A" o={0.03} />)}
    {Array.from({ length: 6 }).map((_, i) => (
      <Box key={i} s={[0.46, 0.1, 1.7]} p={[-1.15 + i * 0.46, 2.38, 0.15]} r={[0.22, 0, 0]} c={i % 2 ? "#FFFFFF" : q.color ?? "#E2574C"} o={0.02} />
    ))}
  </>
);

const Fence: React.FC<{ q: PropSpec }> = ({ q }) => {
  const len = q.len ?? 4;
  const posts = Math.round(len) + 1;
  return (
    <>
      {Array.from({ length: posts }).map((_, i) => <Box key={i} s={[0.14, 0.9, 0.14]} p={[-len / 2 + (i * len) / (posts - 1), 0.45, 0]} c={q.color ?? "#F3EAD7"} o={0.03} />)}
      {[0.35, 0.7].map((y) => <Box key={y} s={[len, 0.1, 0.07]} p={[0, y, 0]} c={q.color ?? "#F3EAD7"} o={0.03} />)}
    </>
  );
};

const Board: React.FC<{ q: PropSpec; ctx: PropCtx }> = ({ q, ctx }) => {
  const lines = q.lines ?? (q.text ? [q.text] : []);
  // lines are written one by one across the first 70% of the scene
  const shown = Math.min(lines.length, Math.floor((ctx.p / 0.7) * lines.length + 0.999));
  const tex = getTextTexture(lines, shown, q.color ?? "#2E6B50");
  return (
    <>
      <Box s={[2.9, 2.0, 0.12]} p={[0, 2.0, 0]} c="#9A6A3A" />
      <mesh position={[0, 2.0, 0.085]}><planeGeometry args={[2.6, 1.72]} /><meshBasicMaterial map={tex} color={ctx.tint} toneMapped={false} /></mesh>
      {[-1.1, 1.1].map((x) => <Box key={x} s={[0.1, 3.2, 0.1]} p={[x, 1.55, -0.12]} r={[-0.07, 0, 0]} c="#7A4A2A" o={0.03} />)}
      <Box s={[0.1, 3.0, 0.1]} p={[0, 1.4, -0.7]} r={[0.35, 0, 0]} c="#7A4A2A" o={0.03} />
    </>
  );
};

const Sign: React.FC<{ q: PropSpec; ctx: PropCtx }> = ({ q, ctx }) => {
  const tex = getTextTexture(q.lines ?? [q.text ?? ""], 99, q.color ?? "#F2DEB0", 768, 320, false);
  return (
    <>
      <Box s={[0.14, 1.7, 0.14]} p={[0, 0.85, 0]} c="#7A4A2A" o={0.03} />
      <Box s={[1.9, 0.8, 0.1]} p={[0, 1.75, 0.06]} c="#B5773D" />
      <mesh position={[0, 1.75, 0.125]}><planeGeometry args={[1.74, 0.66]} /><meshBasicMaterial map={tex} color={ctx.tint} toneMapped={false} /></mesh>
    </>
  );
};

const Lamp: React.FC<{ ctx: PropCtx }> = ({ ctx }) => (
  <>
    <Shape geo={<cylinderGeometry args={[0.06, 0.09, 2.7, 8]} />} c="#3A3F4A" p={[0, 1.35, 0]} o={0.2} />
    <mesh position={[0, 2.85, 0]}><sphereGeometry args={[0.24, 16, 12]} /><meshBasicMaterial color={ctx.time === "day" ? "#FFF3C4" : "#FFD86B"} toneMapped={false} /></mesh>
    {ctx.time !== "day" ? <pointLight position={[0, 2.8, 0]} color="#FFC766" intensity={8} distance={11} /> : null}
  </>
);

const Campfire: React.FC<{ ctx: PropCtx }> = ({ ctx }) => {
  const fl = 1 + Math.sin(ctx.t * 17) * 0.08 + Math.sin(ctx.t * 29) * 0.05;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 3, 0]}>
          <Shape geo={<cylinderGeometry args={[0.09, 0.09, 1, 8]} />} c="#7A4A2A" p={[0, 0.1, 0]} r={[0, 0, Math.PI / 2]} o={0.1} />
        </group>
      ))}
      <mesh position={[0, 0.5 * fl, 0]} scale={[1, fl, 1]}><coneGeometry args={[0.3, 0.85, 8]} /><meshBasicMaterial color="#FF7A1A" toneMapped={false} /></mesh>
      <mesh position={[0, 0.36 * fl, 0.02]} scale={[1, fl, 1]}><coneGeometry args={[0.2, 0.6, 8]} /><meshBasicMaterial color="#FFD23F" toneMapped={false} /></mesh>
      <pointLight position={[0, 1.1, 0]} color="#FF9A3D" intensity={7 * fl} distance={12} />
    </>
  );
};

const EmojiCard: React.FC<{ q: PropSpec; ctx: PropCtx }> = ({ q, ctx }) => {
  const sprite = getEmoji(q.emoji ?? q.text ?? "⭐");
  const bob = q.float ? Math.sin(ctx.t * 2.4) * 0.12 : 0;
  const [x, z] = q.at ?? [0, 0];
  return (
    <group rotation={[0, ctx.yawAt(x, z) - ((q.rot ?? 0) * Math.PI) / 180, 0]}>
      <mesh position={[0, 0.5 + bob, 0]} rotation={[-ctx.leanAt(x, z), 0, 0]} castShadow customDepthMaterial={sprite.depth}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={sprite.map} transparent alphaTest={0.04} color={ctx.tint} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
};

/** Water with a sandy rim. Big enough water (6+ wide) gets waves: foam lines that roll in and
 *  fade at the shore, a lighter shallow band, and slow sparkles. `waves: false` keeps it still. */
const Pond: React.FC<{ q: PropSpec; ctx: PropCtx }> = ({ q, ctx }) => {
  const r = (q.w ?? 4) / 2;
  const water = col(q.color ?? "#5BB8E8");
  const shallow = new THREE.Color(water).lerp(new THREE.Color("#FFFFFF"), 0.35).getStyle();
  const flat = style().props === "flat";
  const waves = q.waves !== false && r >= 3;
  const period = 3.4; // seconds per wave, roughly the rhythm of a calm beach recording
  const band = Math.min(3.2, r * 0.3); // how far from the shore the foam starts
  const Mat: React.FC<{ c: string; o?: number }> = ({ c, o = 1 }) =>
    flat ? <meshBasicMaterial color={c} transparent={o < 1} opacity={o} toneMapped={false} depthWrite={false} /> : <meshStandardMaterial color={c} transparent={o < 1} opacity={o} roughness={0.25} depthWrite={o >= 1} />;
  const flatRot: [number, number, number] = [-Math.PI / 2, 0, 0];
  return (
    <>
      <mesh rotation={flatRot} position={[0, 0.02, 0]}><circleGeometry args={[r + 0.2, 96]} /><meshStandardMaterial color={col("#D9C79A")} roughness={1} /></mesh>
      <mesh rotation={flatRot} position={[0, 0.03, 0]} receiveShadow><circleGeometry args={[r, 96]} /><Mat c={water} /></mesh>
      {waves ? (
        <>
          <mesh rotation={flatRot} position={[0, 0.034, 0]}><ringGeometry args={[r - band * 0.8, r, 128]} /><Mat c={shallow} o={0.55} /></mesh>
          {[0, 1, 2, 3].map((k) => {
            // each foam line travels from open water to the shore, swells, then thins out and fades
            const ph = (ctx.t / period + k / 4) % 1;
            const inner = r - band + ph * (band + 0.05);
            const width = 0.08 + Math.sin(ph * Math.PI) * 0.26;
            const o = Math.sin(Math.min(1, ph * 1.15) * Math.PI) * 0.9;
            if (o <= 0.02 || inner + width > r + 0.25) return null;
            return <mesh key={k} rotation={flatRot} position={[0, 0.038 + k * 0.001, 0]}><ringGeometry args={[inner, inner + width, 160]} /><Mat c="#FFFFFF" o={o} /></mesh>;
          })}
          {[0, 1].map((k) => {
            // the wash: a thin film of water that runs up the sand and slips back
            const ph = (ctx.t / period + 0.15 + k / 2) % 1;
            const reach = Math.sin(ph * Math.PI) * 0.35;
            return <mesh key={`w${k}`} rotation={flatRot} position={[0, 0.026, 0]}><ringGeometry args={[r - 0.05, r + 0.05 + reach, 160]} /><Mat c={shallow} o={0.5 * Math.sin(ph * Math.PI)} /></mesh>;
          })}
          {Array.from({ length: 14 }).map((_, k) => {
            // small sparkles out on the water
            const a = k * 2.399;
            const d = r * (0.25 + ((k * 37) % 60) / 100);
            const tw = Math.max(0, Math.sin(ctx.t * 2.2 + k * 1.7));
            return tw > 0.2 ? <mesh key={`s${k}`} rotation={flatRot} position={[Math.cos(a) * d, 0.036, Math.sin(a) * d]}><planeGeometry args={[0.5 * tw, 0.06]} /><Mat c="#FFFFFF" o={0.7 * tw} /></mesh> : null;
          })}
        </>
      ) : null}
    </>
  );
};

const one = (q: PropSpec, ctx: PropCtx): React.ReactNode => {
  switch (q.type) {
    case "house": return <House q={q} />;
    case "tower": return <Tower q={q} />;
    case "tree": return <Tree q={q} />;
    case "pine": return <Pine q={q} />;
    case "bush": return <>{[[0, 0.4, 0, 0.55], [0.5, 0.32, 0.1, 0.42], [-0.45, 0.3, -0.05, 0.4]].map(([x, y, z, r], i) => <Shape key={i} geo={<icosahedronGeometry args={[r, 1]} />} c={q.color ?? "#5DBB55"} p={[x, y, z]} o={0.07} />)}</>;
    case "rock": return <Shape geo={<dodecahedronGeometry args={[0.55, 0]} />} c={q.color ?? "#9DA3A8"} p={[0, 0.32, 0]} s={[1.2, 0.7, 1]} o={0.07} />;
    case "stump": return <><Shape geo={<cylinderGeometry args={[0.36, 0.42, 0.45, 12]} />} c="#8A5A34" p={[0, 0.225, 0]} o={0.07} /><mesh position={[0, 0.456, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.3, 16]} /><meshBasicMaterial color="#E7C690" /></mesh></>;
    case "logs": return <Logs q={q} />;
    case "coins": return <Coins q={q} />;
    case "crate": return <><Box s={[1, 1, 1]} p={[0, 0.5, 0]} c={q.color ?? "#C9954F"} /><Box s={[1.04, 0.14, 1.04]} p={[0, 0.5, 0]} c="#A8763A" o={0} /></>;
    case "stall": return <Stall q={q} />;
    case "fence": return <Fence q={q} />;
    case "lamp": return <Lamp ctx={ctx} />;
    case "campfire": return <Campfire ctx={ctx} />;
    case "board": return <Board q={q} ctx={ctx} />;
    case "sign": return <Sign q={q} ctx={ctx} />;
    case "field": return <><Flat w={q.w ?? 6} d={q.d ?? 6} c={q.color ?? "#9A6B3F"} />{Array.from({ length: Math.floor((q.w ?? 6) / 0.8) }).map((_, i) => <mesh key={i} position={[-(q.w ?? 6) / 2 + 0.4 + i * 0.8, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.28, (q.d ?? 6) * 0.94]} /><meshStandardMaterial color={col(q.color2 ?? "#6FBF4A")} roughness={1} /></mesh>)}</>;
    case "road": return <Flat w={q.w ?? 4} d={q.d ?? 40} c={q.color ?? "#B9B2A3"} y={0.015} />;
    case "pond": return <Pond q={q} ctx={ctx} />;
    case "mountain": return <><mesh position={[0, (q.h ?? 22) / 2, 0]}><coneGeometry args={[q.w ?? 18, q.h ?? 22, 6]} /><Toon c={q.color ?? "#8FA3B8"} /></mesh><mesh position={[0, (q.h ?? 22) * 0.86, 0]}><coneGeometry args={[(q.w ?? 18) * 0.29, (q.h ?? 22) * 0.29, 6]} /><Toon c="#FFFFFF" /></mesh></>;
    case "block": return <Box s={[q.w ?? 1, q.h ?? 1, q.d ?? 1]} p={[0, (q.h ?? 1) / 2, 0]} c={q.color ?? "#D9D2C5"} />;
    case "ball": return <Shape geo={<sphereGeometry args={[(q.w ?? 1) / 2, 24, 16]} />} c={q.color ?? "#E2574C"} p={[0, (q.w ?? 1) / 2, 0]} o={0.04} />;
    case "pillar": return <Shape geo={<cylinderGeometry args={[(q.w ?? 0.6) / 2, (q.w ?? 0.6) / 2, q.h ?? 3, 16]} />} c={q.color ?? "#E8E2D6"} p={[0, (q.h ?? 3) / 2, 0]} o={0.04} />;
    case "emoji": return <EmojiCard q={q} ctx={ctx} />;
    default: return <Box s={[0.6, 0.6, 0.6]} p={[0, 0.3, 0]} c="#FF00FF" />; // unknown type: loud pink cube so it gets noticed in the check
  }
};

const pop = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export const PropView: React.FC<{ q: PropSpec; ctx: PropCtx }> = ({ q, ctx }) => {
  const grow = q.enter === undefined ? 1 : pop((ctx.t - q.enter) / 0.35);
  if (grow <= 0) return null;
  const place = (at: [number, number], rot: number, scale: number, key?: React.Key) => (
    <group key={key} position={[at[0], q.y ?? 0, at[1]]} rotation={[0, q.type === "emoji" ? 0 : (rot * Math.PI) / 180, 0]} scale={scale * grow}>
      {one({ ...q, at }, ctx)}
    </group>
  );
  if (q.scatter) {
    const rnd = rand(q.scatter.seed ?? 1);
    const [x0, z0, x1, z1] = q.scatter.area;
    return <>{Array.from({ length: q.scatter.count }).map((_, i) => place([x0 + rnd() * (x1 - x0), z0 + rnd() * (z1 - z0)], (q.rot ?? 0) + rnd() * 360, (q.scale ?? 1) * (0.8 + rnd() * 0.45), i))}</>;
  }
  return place(q.at ?? [0, 0], q.rot ?? 0, q.scale ?? 1);
};
