// One 3D scene: ground, sky, light, props and the flat cartoon actors standing in it.
import React from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { getCloud, getEmoji, getGround, getSky, getSprite, getStars, getStuds, SPRITE_ASPECT } from "./characters";
import { PropView, Toon, type PropCtx } from "./Props";
import { HAND, LowPolyBody } from "./LowPoly";
import { col, GROUND_COLOR, resolveStyle, setStyle, style } from "./style";
import { HEIGHT, WIDTH } from "./timing";
import type { ActorSpec, CameraSpec, Face, Pose, SceneSpec, Story, TimeOfDay, Vec2 } from "./types";

type V3 = [number, number, number];

const LOOKS: Record<TimeOfDay, { top: string; horizon: string; sun: string; sunI: number; amb: string; ambI: number; tint: string; sunPos: V3; cloud: number }> = {
  day: { top: "#2F86E0", horizon: "#CFEAFB", sun: "#FFF3DA", sunI: 2.3, amb: "#FFFFFF", ambI: 1.9, tint: "#FFFFFF", sunPos: [9, 15, 8], cloud: 1 },
  sunset: { top: "#4B4A9E", horizon: "#FFB877", sun: "#FFAA66", sunI: 2.3, amb: "#FFD2B0", ambI: 1.5, tint: "#FFE2C8", sunPos: [14, 7, 6], cloud: 0.85 },
  night: { top: "#070B24", horizon: "#27356B", sun: "#9DB4FF", sunI: 1.1, amb: "#7C8CE0", ambI: 1.2, tint: "#96A2DC", sunPos: [-7, 13, 6], cloud: 0.18 },
};

const SHOTS = {
  wide: { d: 19, h: 6.5, ly: 3.4 },
  medium: { d: 8.6, h: 2.7, ly: 2.1 },
  close: { d: 4.4, h: 1.5, ly: 1.45 },
  top: { d: 9, h: 17, ly: 0 },
  low: { d: 6.4, h: 0.45, ly: 1.7 },
};

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hash = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h;
};
const pop = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const actorXZ = (a: ActorSpec, p: number): Vec2 => (a.act === "walk" && a.to ? [lerp(a.at[0], a.to[0], smooth(p)), lerp(a.at[1], a.to[1], smooth(p))] : a.at);

export const cameraPose = (scene: SceneSpec, p: number): { pos: V3; look: V3 } => {
  const cam: CameraSpec = scene.camera ?? {};
  const shot = SHOTS[cam.shot ?? "medium"] ?? SHOTS.medium;
  const actors = scene.actors ?? [];
  let target: Vec2 = [0, 0];
  if (Array.isArray(cam.on)) target = cam.on;
  else if (typeof cam.on === "string") {
    const a = actors.find((x) => x.who === cam.on);
    if (a) target = actorXZ(a, p);
  } else if (actors.length) {
    target = [actors.reduce((s, a) => s + a.at[0], 0) / actors.length, actors.reduce((s, a) => s + a.at[1], 0) / actors.length];
  }
  const e = smooth(p);
  const move = cam.move ?? "static";
  let dist = shot.d * (cam.zoom ?? 1);
  let height = shot.h * (cam.shot === "top" ? cam.zoom ?? 1 : 1);
  let az = ((cam.angle ?? 0) * Math.PI) / 180;
  let tx = target[0];
  // bigger swings than you'd think you need: at a distance, a subtle move reads as none at all
  if (move === "push") dist *= lerp(1.24, 0.8, e);
  else if (move === "pull") dist *= lerp(0.78, 1.22, e);
  else dist *= lerp(1.02, 0.97, p); // every shot breathes a little
  if (move === "orbit") az += lerp(-0.42, 0.42, e);
  if (move === "pan") tx += lerp(-0.24, 0.24, e) * shot.d;
  if (move === "rise") height += lerp(0, shot.d * 0.48, e);
  return {
    pos: [tx + Math.sin(az) * dist, height, target[1] + Math.cos(az) * dist],
    look: [tx, shot.ly, target[1]],
  };
};

const Rig: React.FC<{ pos: V3; look: V3 }> = ({ pos, look }) => {
  const { camera } = useThree();
  camera.position.set(...pos);
  camera.lookAt(...look);
  camera.updateMatrixWorld();
  return null;
};

const DEFAULT_FACE: Partial<Record<string, Face>> = { cheer: "joy", sleep: "sleepy", shake: "worried" };
const DEFAULT_POSE: Partial<Record<string, Pose>> = { cheer: "up" };

const Actor: React.FC<{ a: ActorSpec; story: Story; t: number; p: number; speaking: boolean; yawAt: (x: number, z: number) => number; leanAt: (x: number, z: number) => number; tint: string; index: number }> = ({ a, story, t, p, speaking, yawAt, leanAt, tint, index }) => {
  const spec = story.cast[a.who] ?? {};
  const act = a.act ?? "idle";
  const ph = hash(a.who) * 0.37 + index;
  const size = (a.scale ?? 1) * 1.65;
  const grow = a.enter === undefined ? 1 : pop((t - a.enter) / 0.3);
  if (grow <= 0) return null;

  const [x, z] = actorXZ(a, p);
  let y = 0, sx = 1, sy = 1 + Math.sin(t * 3 + ph) * 0.014, tilt = 0, dx = 0;
  let mouth = false;
  if (act === "talk" && speaking) { mouth = Math.floor(t * 9) % 2 === 0; sy += Math.abs(Math.sin(t * 9)) * 0.025; }
  if (act === "hop" || act === "cheer") { const s = Math.abs(Math.sin(t * 5.2 + ph)); y = s * 0.34; sy *= 0.94 + s * 0.1; sx = 1.04 - s * 0.06; }
  if (act === "shake") dx = Math.sin(t * 42) * 0.03;
  if (act === "walk") { tilt = Math.sin(t * 10) * 0.07; y = Math.abs(Math.sin(t * 10)) * 0.07; }
  if (act === "sleep") { tilt = 0.16 + Math.sin(t * 1.6) * 0.03; sy = 1 + Math.sin(t * 1.6) * 0.03; }
  if (act === "work") { tilt = (a.flip ? 1 : -1) * (0.1 + Math.sin(t * 7 + ph) * 0.16); }
  if (act === "nod") sy *= 1 - Math.max(0, Math.sin(t * 6)) * 0.05;

  const blink = (t * 30 + hash(a.who) * 13) % 96 < 4;
  const face = a.face ?? DEFAULT_FACE[act] ?? "neutral";
  const pose = a.pose ?? DEFAULT_POSE[act] ?? (a.hold ? "hold" : "down");
  const solid = ["lowpoly", "smooth", "brick"].includes(style().characters);
  const sprite = solid ? null : getSprite(a.who, spec, { face, pose, mouth, blink, hold: a.hold });
  const held = solid && a.hold ? getEmoji(a.hold) : null;
  const h = size, w = size * SPRITE_ASPECT;
  const yaw = yawAt(x, z);
  const bubble = a.bubble ?? (act === "sleep" ? "💤" : undefined);
  const bub = bubble ? getEmoji(bubble) : null;
  const bubGrow = pop((t - (a.enter ?? 0) - 0.15) / 0.3);

  return (
    <group position={[x + dx, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[size * 0.3 * (1 - y * 0.6), 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={style().shadows ? 0.2 : 0.07} depthWrite={false} />
      </mesh>
      {solid ? (
        // real 3D body: turns most of the way towards the camera, and a little towards the middle when flipped
        <group rotation={[0, yaw * 0.75 + (a.flip ? -0.3 : 0.3) * (pose === "point" ? 0.3 : 1), 0]}>
          <group position={[0, y, 0]} rotation={[0, 0, tilt]} scale={[sx * grow * (a.scale ?? 1), sy * grow * (a.scale ?? 1), grow * (a.scale ?? 1)]}>
            <LowPolyBody spec={spec} face={face} pose={pose} mouth={mouth} blink={blink} />
            {held ? <mesh position={HAND}><planeGeometry args={[0.55, 0.55]} /><meshBasicMaterial map={held.map} transparent alphaTest={0.04} side={THREE.DoubleSide} toneMapped={false} /></mesh> : null}
          </group>
        </group>
      ) : null}
      <group rotation={[0, yaw, 0]}>
        <group rotation={[-leanAt(x, z), 0, 0]}>
        {sprite ? (
        <group position={[0, y, 0]} rotation={[0, 0, tilt]} scale={[sx * grow * (a.flip ? -1 : 1), sy * grow, 1]}>
          <mesh position={[0, h / 2, 0]} castShadow customDepthMaterial={sprite.depth}>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial map={sprite.map} transparent alphaTest={0.04} color={tint} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
        ) : null}
        {bub && bubGrow > 0 ? (
          <mesh position={[0, h * 1.02 + 0.42 + Math.sin(t * 2.6 + ph) * 0.05, 0.02]} scale={bubGrow * 0.72 * (a.scale ?? 1)}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={bub.map} transparent alphaTest={0.04} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        ) : null}
        </group>
      </group>
    </group>
  );
};

const CLOUDS: [number, number, number, number][] = [[-60, 30, -90, 26], [25, 38, -110, 34], [80, 27, -70, 22], [-95, 34, -30, 28], [110, 40, -10, 30], [-30, 44, -130, 30], [60, 32, 90, 26], [-80, 36, 80, 30]];

export const World: React.FC<{ story: Story; scene: SceneSpec; t: number; dur: number; speaking: boolean; seed: number; styleName?: string }> = ({ story, scene, t, dur, speaking, seed, styleName }) => {
  const st = resolveStyle(story, styleName);
  setStyle(st);
  const p = Math.min(1, Math.max(0, t / Math.max(0.01, dur)));
  const set = scene.set ? story.sets?.[scene.set] : undefined;
  const time: TimeOfDay = scene.time ?? set?.time ?? "day";
  const base = LOOKS[time] ?? LOOKS.day;
  const skyPair = st.sky?.[time];
  const space = scene.space ?? set?.space ?? false;
  const look = space
    ? { ...base, top: "#020208", horizon: "#0A1230", sunI: 0.5, ambI: 0.55, tint: st.evenLight ? "#FFFFFF" : base.tint, cloud: 0 }
    : { ...base, top: skyPair?.[0] ?? base.top, horizon: skyPair?.[1] ?? base.horizon, tint: st.evenLight ? "#FFFFFF" : base.tint };
  const px = st.pixel > 1 ? Math.round(st.pixel) : 1;
  const ground = scene.ground ?? set?.ground ?? "grass";
  const cam = cameraPose(scene, p);
  const yawAt = (x: number, z: number) => Math.atan2(cam.pos[0] - x, cam.pos[2] - z);
  // seen from high above, the flat cards lean back to face the camera (otherwise they vanish edge-on)
  const leanAt = (x: number, z: number) => {
    const pitch = Math.atan2(cam.pos[1] - 0.8, Math.hypot(cam.pos[0] - x, cam.pos[2] - z));
    return pitch * smooth((pitch - 0.5) / 0.5) * 0.92;
  };
  const ctx: PropCtx = { t, p, yawAt, leanAt, time, tint: look.tint };
  const props = [...(set?.props ?? []), ...(scene.props ?? [])];
  const drift = (seed * 7 + t) * 0.35;

  return (
    // pixel styles render a small picture and blow it up with hard edges
    <div style={{ position: "absolute", left: 0, top: 0, width: WIDTH / px, height: HEIGHT / px, transform: `scale(${px})`, transformOrigin: "0 0", imageRendering: px > 1 ? "pixelated" : "auto" }}>
    <ThreeCanvas key={px} width={WIDTH / px} height={HEIGHT / px} shadows={st.shadows} flat dpr={1} gl={{ antialias: px === 1 }} camera={{ fov: 50, near: 0.1, far: 500 }} style={{ position: "absolute", inset: 0 }}>
      <color attach="background" args={[look.horizon]} />
      {st.fog && !space ? <fog attach="fog" args={[look.horizon, 38, 150]} /> : null}
      <Rig pos={cam.pos} look={cam.look} />
      <ambientLight color={look.amb} intensity={look.ambI} />
      <directionalLight
        color={look.sun}
        intensity={look.sunI}
        position={look.sunPos}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      <mesh scale={[1, 1, 1]}>
        <sphereGeometry args={[300, 24, 16]} />
        <meshBasicMaterial map={getSky(look.top, look.horizon)} side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} />
      </mesh>
      {space ? (
        <mesh rotation={[0, drift * 0.01, 0]}>
          <sphereGeometry args={[280, 24, 16]} />
          <meshBasicMaterial map={getStars()} side={THREE.BackSide} transparent fog={false} depthWrite={false} toneMapped={false} />
        </mesh>
      ) : null}
      {(!space && st.clouds ? CLOUDS : []).map(([cx, cy, cz, s], i) => {
        const x = ((cx + drift + 150) % 300) - 150;
        return (
          <mesh key={i} position={[x, cy, cz]} rotation={[0, Math.atan2(cam.pos[0] - x, cam.pos[2] - cz), 0]}>
            <planeGeometry args={[s, s / 2]} />
            <meshBasicMaterial map={getCloud()} transparent opacity={0.95 * look.cloud} fog={false} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      {time === "night" && !space ? <mesh position={[-40, 60, -160]}><circleGeometry args={[9, 32]} /><meshBasicMaterial color="#F4F1D8" fog={false} toneMapped={false} /></mesh> : null}
      {!space ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[360, 360]} />
          {st.ground === "studs" ? <meshStandardMaterial map={getStuds(st.groundColor ?? col(GROUND_COLOR[ground] ?? "#7CC65A"))} roughness={0.35} /> : st.ground === "plain" ? (st.props === "flat" ? <meshBasicMaterial color={st.groundColor ?? col(GROUND_COLOR[ground] ?? "#7CC65A")} toneMapped={false} /> : <meshStandardMaterial color={st.groundColor ?? col(GROUND_COLOR[ground] ?? "#7CC65A")} roughness={1} />) : <meshStandardMaterial map={getGround(ground)} roughness={1} />}
        </mesh>
      ) : null}
      {props.map((q, i) => <PropView key={`${scene.set ?? ""}-${i}-${q.type}`} q={q} ctx={ctx} />)}
      {(scene.actors ?? []).map((a, i) => <Actor key={`${a.who}-${i}`} a={a} story={story} t={t} p={p} speaking={speaking} yawAt={yawAt} leanAt={leanAt} tint={look.tint} index={i} />)}
    </ThreeCanvas>
    </div>
  );
};
