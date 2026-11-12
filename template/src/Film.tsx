// The film: plays the story scene by scene, with word-by-word captions, titles, voice and cuts.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadMarker } from "@remotion/google-fonts/PatrickHand";
import { loadFont as loadPixel } from "@remotion/google-fonts/PressStart2P";
import { loadFont as loadComic } from "@remotion/google-fonts/Bangers";
import { loadFont as loadSerif } from "@remotion/google-fonts/Cinzel";
import { resolveStyle, type StyleSpec } from "./engine/style";
import { World } from "./engine/World";
import { buildSlots, FPS, slotAt, type Slot } from "./engine/timing";
import type { Sounds, Story, Timing, Word } from "./engine/types";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin", "devanagari"] });
const marker = loadMarker("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const pixelFont = loadPixel("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const comicFont = loadComic("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const serifFont = loadSerif("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily;
// the round font is always the fallback, so Hindi still renders in every style
const FONTS: Record<string, string> = { marker, pixel: pixelFont, comic: comicFont, serif: serifFont };
const fontOf = (st: StyleSpec) => (FONTS[st.captions.font] ? `${FONTS[st.captions.font]}, ${fontFamily}` : fontFamily);
const weightOf = (st: StyleSpec) => (st.captions.font === "round" ? 800 : st.captions.font === "serif" ? 700 : 400);
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.5 0"/></filter><rect width="400" height="400" filter="url(#n)"/></svg>')}")`;

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

const stroke = (px: number, color: string): React.CSSProperties => ({ WebkitTextStroke: `${px}px ${color}`, paintOrder: "stroke fill" });

const Captions: React.FC<{ slot: Slot; t: number; story: Story; st: StyleSpec }> = ({ slot, t, story, st }) => {
  const cs = st.captions;
  const sharp = cs.font === "pixel";
  const cfg = story.captions ?? {};
  const chunks = chunk(slot.words, cfg.maxWords ?? 2);
  let current = null as null | (typeof chunks)[number];
  for (const c of chunks) if (t >= c.start - 0.03) current = c;
  if (!current) return null;
  const k = pop((t - current.start + 0.03) / 0.14);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: `${(cfg.y ?? 0.68) * 100}%`, display: "flex", justifyContent: "center", transform: `scale(${0.82 + k * 0.18})` }}>
      <div style={{ fontFamily: fontOf(st), fontWeight: weightOf(st), fontSize: (cfg.size ?? 84) * cs.size, lineHeight: sharp ? 1.35 : 1.1, textAlign: "center", color: cs.color, textTransform: cs.uppercase ? "uppercase" : "none", textShadow: sharp ? "6px 6px 0 rgba(0,0,0,0.6)" : cs.color === "#FFFFFF" || cs.color === "#FFFDF6" ? "0 8px 0 rgba(0,0,0,0.28)" : "none", ...(cs.box ? { background: cs.box, border: `7px solid ${cs.stroke}`, borderRadius: 6, padding: "6px 26px 2px", boxShadow: "10px 10px 0 rgba(0,0,0,0.85)", transform: "rotate(-2deg)", textShadow: "none" } : stroke(sharp ? 12 : 16, cs.stroke)) }}>
        {current.words.map((w, i) => <span key={i} style={{ color: w.hl ? cfg.highlight ?? cs.highlight : cs.color }}>{i ? " " : ""}{w.w}</span>)}
      </div>
    </div>
  );
};

const Title: React.FC<{ text: string; t: number; st: StyleSpec }> = ({ text, t, st }) => {
  const k = pop((t - 0.1) / 0.3);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: "11%", display: "flex", justifyContent: "center", transform: `scale(${k}) rotate(-2deg)` }}>
      <div style={{ fontFamily: fontOf(st), fontWeight: weightOf(st), fontSize: (text.length > 16 ? 104 : 136) * st.captions.size, lineHeight: 1.1, textAlign: "center", color: st.titleColor, textShadow: st.captions.font === "marker" ? "none" : "0 12px 0 rgba(0,0,0,0.3)", ...stroke(st.captions.font === "pixel" ? 14 : 22, st.captions.stroke) }}>{text}</div>
    </div>
  );
};

export const Film: React.FC<{ story: Story; timing: Timing; sounds?: Sounds; styleOverride?: string }> = ({ story, timing, sounds, styleOverride }) => {
  const frame = useCurrentFrame();
  const st = React.useMemo(() => resolveStyle(story, styleOverride), [story, styleOverride]);
  const { slots, total } = React.useMemo(() => buildSlots(story, timing), [story, timing]);
  // music sits lower while the narrator speaks, rises in the gaps, and fades in and out
  const musicLevel = React.useMemo(() => {
    const talk = new Float32Array(total);
    for (const s of slots) for (let i = 0; i < s.words.length; i++) {
      const a = s.from + Math.floor(s.words[i].t * FPS);
      const b = s.from + Math.ceil((s.words[i + 1]?.t ?? s.words[i].t + 0.45) * FPS);
      for (let f = Math.max(0, a - 3); f < Math.min(total, b + 3); f++) talk[f] = 1;
    }
    const lvl = new Float32Array(total);
    let v = 0;
    for (let f = 0; f < total; f++) { v += (talk[f] - v) * 0.12; lvl[f] = v; }
    return lvl;
  }, [slots, total]);
  // sound cues on the timeline; a background loop that carries on into the next scene plays as one sound
  const placed = React.useMemo(() => {
    const out: { from: number; len: number; file: string; vol: number; ambient: boolean }[] = [];
    const runs = new Map<string, (typeof out)[number] & { scene: number }>();
    const cues = [...(sounds?.cues ?? [])].sort((x, y) => x.scene - y.scene || x.at - y.at);
    for (const c of cues) {
      const s = slots[c.scene];
      if (!s || c.at >= s.dur) continue;
      const from = s.from + Math.round(c.at * FPS);
      if (c.ambient) {
        const run = runs.get(c.file);
        if (run && run.scene === c.scene - 1 && c.at === 0) { run.len = s.from + s.frames - run.from; run.scene = c.scene; continue; }
        const r = { from, len: s.from + s.frames - from, file: c.file, vol: c.vol, ambient: true, scene: c.scene };
        runs.set(c.file, r);
        out.push(r);
      } else {
        const len = Math.min(Math.round((c.max ?? 3) * FPS), total - from);
        if (len > 0) out.push({ from, len, file: c.file, vol: c.vol, ambient: false });
      }
    }
    return out;
  }, [sounds, slots, total]);
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
      {st.posterize > 1 ? (
        // retro palettes: only a few brightness steps per colour channel
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id="st-poster" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              {(["feFuncR", "feFuncG", "feFuncB"] as const).map((Fn) => <Fn key={Fn} type="discrete" tableValues={Array.from({ length: st.posterize }, (_, i) => (i / (st.posterize - 1)).toFixed(3)).join(" ")} />)}
            </feComponentTransfer>
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{ filter: [st.posterize > 1 ? "url(#st-poster)" : "", st.post.saturate !== 1 ? `saturate(${st.post.saturate})` : "", st.post.contrast !== 1 ? `contrast(${st.post.contrast})` : "", whip > 0 ? `blur(${whip * 22}px)` : ""].filter(Boolean).join(" ") || undefined, transform: whip > 0 ? `translateX(${dir * whip * 150}px) scale(${1 + whip * 0.1})` : undefined }}>
        <World story={story} scene={scene} t={t} dur={slot.dur} speaking={speaking} seed={slot.index} styleName={styleOverride} />
      </AbsoluteFill>
      {st.post.grain > 0 ? <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: st.post.grain, mixBlendMode: "multiply" }} /> : null}
      {st.post.halftone > 0 ? <AbsoluteFill style={{ backgroundImage: "radial-gradient(circle, rgba(20,20,20,0.9) 1.3px, transparent 1.9px)", backgroundSize: "9px 9px", opacity: st.post.halftone, mixBlendMode: "multiply" }} /> : null}
      {st.post.vignette > 0 ? <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,${st.post.vignette}) 100%)` }} /> : null}
      {scene.title ? <Title text={scene.title} t={t} st={st} /> : null}
      <Captions slot={slot} t={t} story={story} st={st} />
      {flash > 0 ? <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: flash * 0.85 }} /> : null}
      {timing.voiced ? slots.map((s) => (s.audio ? <Sequence key={s.index} from={s.from} durationInFrames={s.frames}><Audio src={staticFile(s.audio)} /></Sequence> : null)) : null}
      {timing.music || sounds?.music ? (
        <Audio
          src={staticFile(timing.music ? "music.mp3" : sounds!.music!.file)}
          loop
          volume={(f) => {
            const base = timing.music ? 0.18 : sounds!.music!.vol;
            const duck = 1 - 0.6 * (musicLevel[Math.min(total - 1, f)] ?? 0);
            const fade = Math.min(1, f / FPS, (total - f) / (FPS * 2));
            return Math.max(0, base * duck * fade);
          }}
        />
      ) : null}
      {placed.map((c, i) => (
        <Sequence key={i} from={c.from} durationInFrames={c.len}>
          <Audio src={staticFile(c.file)} loop={c.ambient} volume={(f) => (c.ambient ? c.vol * Math.min(1, f / 15, (c.len - f) / 15) : c.vol)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
