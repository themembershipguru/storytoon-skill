// Turns story + voice timing into frame ranges. Without a voice file it estimates,
// so you can preview and check the visuals before generating any audio.
import type { SceneSpec, SceneTiming, Story, Timing, Word } from "./types";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
const GAP = 0.22; // breath between lines, seconds
const WORDS_PER_SEC = 2.7;

/** "*twice* as big." -> [{w:"twice", hl:true}, {w:"as"}, {w:"big."}] */
export const tokens = (say: string): { w: string; hl: boolean }[] => {
  const out: { w: string; hl: boolean }[] = [];
  let hl = false;
  for (const raw of say.split(/\s+/).filter(Boolean)) {
    const starts = raw.startsWith("*");
    const ends = /\*[.,!?;:…"']*$/.test(raw) && raw.length > 1;
    if (starts) hl = true;
    const w = raw.replace(/\*/g, "");
    if (w) out.push({ w, hl });
    if (ends) hl = false;
  }
  return out;
};

const estimate = (scene: SceneSpec): SceneTiming => {
  const toks = tokens(scene.say);
  const dur = Math.max(1.6, toks.length / WORDS_PER_SEC + 0.3);
  const step = (dur - 0.3) / Math.max(1, toks.length);
  const words: Word[] = toks.map((tk, i) => ({ ...tk, t: 0.1 + i * step }));
  return { say: scene.say, dur, words };
};

export type Slot = { index: number; from: number; frames: number; dur: number; words: Word[]; audio?: string };

export const buildSlots = (story: Story, timing: Timing): { slots: Slot[]; total: number } => {
  let from = 0;
  const slots = story.scenes.map((scene, index) => {
    const saved = timing.scenes[index];
    const t = saved && saved.say === scene.say ? saved : estimate(scene);
    const dur = t.dur + GAP + (scene.hold ?? 0);
    const frames = Math.round(dur * FPS);
    const slot: Slot = { index, from, frames, dur, words: t.words, audio: t.audio };
    from += frames;
    return slot;
  });
  return { slots, total: Math.max(1, from) };
};

export const slotAt = (slots: Slot[], frame: number): Slot => {
  for (let i = slots.length - 1; i >= 0; i--) if (frame >= slots[i].from) return slots[i];
  return slots[0];
};
