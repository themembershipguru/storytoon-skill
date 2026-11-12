// The film: plays the story scene by scene, with word-by-word captions, titles, voice and cuts.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Baloo2";
import { World } from "./engine/World";
import { buildSlots, FPS, slotAt, type Slot } from "./engine/timing";
import type { Story, Timing, Word } from "./engine/types";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin", "devanagari"] });

const pop = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** Groups words into short caption chunks (1-3 words), breaking at punctuation. */
const chunk = (words: Word[], maxWords: number): { start: number; words: Word[] }[] => {
  const out: { start: number; words: Word[] }[] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    const chars = cur.reduce((n, x) => n + x.w.length, 0);
    if (cur.length >= maxWords || chars >= 13 || /[.,!?;:…]$/.test(w.w)) { out.push({ start: cur[0].t, words: cur }); cur = []; }
  }
  if (cur.length) out.push({ start: cur[0].t, words: cur });
  return out;
};

const stroke = (px: number): React.CSSProperties => ({ WebkitTextStroke: `${px}px #14110F`, paintOrder: "stroke fill" });

const Captions: React.FC<{ slot: Slot; t: number; story: Story }> = ({ slot, t, story }) => {
  const cfg = story.captions ?? {};
  const chunks = chunk(slot.words, cfg.maxWords ?? 2);
  let current = null as null | (typeof chunks)[number];
  for (const c of chunks) if (t >= c.start - 0.03) current = c;
  if (!current) return null;
  const k = pop((t - current.start + 0.03) / 0.14);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: `${(cfg.y ?? 0.68) * 100}%`, display: "flex", justifyContent: "center", transform: `scale(${0.82 + k * 0.18})` }}>
      <div style={{ fontFamily, fontWeight: 800, fontSize: cfg.size ?? 84, lineHeight: 1.1, textAlign: "center", color: "#FFFFFF", textShadow: "0 8px 0 rgba(0,0,0,0.28)", ...stroke(16) }}>
        {current.words.map((w, i) => <span key={i} style={{ color: w.hl ? cfg.highlight ?? "#FFD23F" : "#FFFFFF" }}>{i ? " " : ""}{w.w}</span>)}
      </div>
    </div>
  );
};

const Title: React.FC<{ text: string; t: number }> = ({ text, t }) => {
  const k = pop((t - 0.1) / 0.3);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: "11%", display: "flex", justifyContent: "center", transform: `scale(${k}) rotate(-2deg)` }}>
      <div style={{ fontFamily, fontWeight: 800, fontSize: text.length > 16 ? 104 : 136, lineHeight: 1.02, textAlign: "center", color: "#FFD23F", textShadow: "0 12px 0 rgba(0,0,0,0.3)", ...stroke(22) }}>{text}</div>
    </div>
  );
};

export const Film: React.FC<{ story: Story; timing: Timing }> = ({ story, timing }) => {
  const frame = useCurrentFrame();
  const { slots } = React.useMemo(() => buildSlots(story, timing), [story, timing]);
  const slot = slotAt(slots, frame);
  const scene = story.scenes[slot.index];
  const t = (frame - slot.from) / FPS;
  const speaking = slot.words.some((w, i) => t >= w.t && t < (slot.words[i + 1]?.t ?? w.t + 0.4));

  // cut effects: a short blur + shove ("whip") or a white flash at the start of a scene
  const next = slots[slot.index + 1];
  const nextKind = next ? story.scenes[next.index].transition : undefined;
  const kind = slot.index > 0 ? scene.transition : undefined;
  const inK = Math.max(0, 1 - (frame - slot.from) / 5);
  const outK = next ? Math.max(0, 1 - (next.from - frame) / 4) : 0;
  const whip = (kind === "whip" ? inK : 0) + (nextKind === "whip" ? outK : 0);
  const dir = kind === "whip" && inK > 0 ? 1 : -1;
  const flash = kind === "flash" ? inK : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#CFEAFB" }}>
      <AbsoluteFill style={whip > 0 ? { filter: `blur(${whip * 22}px)`, transform: `translateX(${dir * whip * 150}px) scale(${1 + whip * 0.1})` } : undefined}>
        <World story={story} scene={scene} t={t} dur={slot.dur} speaking={speaking} seed={slot.index} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.26) 100%)" }} />
      {scene.title ? <Title text={scene.title} t={t} /> : null}
      <Captions slot={slot} t={t} story={story} />
      {flash > 0 ? <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: flash * 0.85 }} /> : null}
      {timing.voiced ? slots.map((s) => (s.audio ? <Sequence key={s.index} from={s.from} durationInFrames={s.frames}><Audio src={staticFile(s.audio)} /></Sequence> : null)) : null}
      {timing.music ? <Audio src={staticFile("music.mp3")} volume={0.1} loop /> : null}
    </AbsoluteFill>
  );
};
