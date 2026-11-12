// A style is a bundle of drawing settings. Five are built in; you can invent more in
// styles/custom.json (or inside a story under "styles") by naming one, picking a `base`,
// and overriding any field below. See references/styles.md.
import * as THREE from "three";
import custom from "../../styles/custom.json";
import type { Story, TimeOfDay } from "./types";

export type StyleSpec = {
  base?: string;
  /** How people are drawn. outline: ink-lined cartoon. paper: cut paper with white edges.
   *  sketch: marker drawing, white fill. lowpoly: real 3D bodies. */
  characters: "outline" | "paper" | "sketch" | "lowpoly";
  ink: string; // line colour for characters and prop outlines
  line: number; // character line thickness, 1 = normal
  /** How 3D props are shaded. toon: two-tone cartoon. matte: soft paper. flat: no shading. faceted: low-poly. */
  props: "toon" | "matte" | "flat" | "faceted";
  outline: number; // prop outline thickness, 0 = none
  shadows: boolean;
  /** Every colour in the film is pushed towards `mix` by `amount` (0..1) and its saturation scaled. */
  colors: { mix: string; amount: number; saturation: number };
  ground: "textured" | "plain";
  groundColor?: string; // one colour for every ground type (plain ground only)
  sky?: Partial<Record<TimeOfDay, [string, string]>>; // [top, horizon] per time of day
  evenLight: boolean; // true: sunset and night do not tint the characters
  fog: boolean;
  clouds: boolean;
  pixel: number; // 0 = off; 6 = each "pixel" is 6x6 real pixels
  posterize: number; // 0 = off; 5 = only 5 levels per colour channel (retro palettes)
  post: { saturate: number; contrast: number; grain: number; vignette: number };
  captions: { font: "round" | "marker" | "pixel"; color: string; stroke: string; highlight: string; size: number; uppercase: boolean };
  titleColor: string;
};

const toon: StyleSpec = {
  characters: "outline",
  ink: "#1E1A17",
  line: 1,
  props: "toon",
  outline: 1,
  shadows: true,
  colors: { mix: "#FFFFFF", amount: 0, saturation: 1 },
  ground: "textured",
  evenLight: false,
  fog: true,
  clouds: true,
  pixel: 0,
  posterize: 0,
  post: { saturate: 1, contrast: 1, grain: 0, vignette: 0.26 },
  captions: { font: "round", color: "#FFFFFF", stroke: "#14110F", highlight: "#FFD23F", size: 1, uppercase: false },
  titleColor: "#FFD23F",
};

export const BUILTIN: Record<string, StyleSpec> = {
  toon,
  paper: {
    ...toon,
    characters: "paper",
    ink: "#FFFDF6",
    line: 1.25,
    props: "matte",
    outline: 0,
    colors: { mix: "#F3E9D6", amount: 0.07, saturation: 0.9 },
    ground: "plain",
    sky: { day: ["#9CCBE8", "#F4E9D4"], sunset: ["#E58F6B", "#F7D9A8"], night: ["#27305C", "#5A5F96"] },
    fog: true,
    post: { saturate: 0.95, contrast: 1, grain: 0.5, vignette: 0.2 },
    captions: { font: "round", color: "#FFFDF6", stroke: "#3A2F28", highlight: "#FFC94A", size: 1, uppercase: false },
    titleColor: "#FFC94A",
  },
  whiteboard: {
    ...toon,
    characters: "sketch",
    ink: "#1B1B1F",
    line: 0.9,
    props: "flat",
    outline: 1.15,
    shadows: false,
    colors: { mix: "#FFFFFF", amount: 0.8, saturation: 1 },
    ground: "plain",
    groundColor: "#FFFFFF",
    sky: { day: ["#FFFFFF", "#FFFFFF"], sunset: ["#FFF3E6", "#FFF8F0"], night: ["#DCE2F2", "#EEF1F9"] },
    evenLight: true,
    fog: false,
    clouds: false,
    post: { saturate: 1, contrast: 1.04, grain: 0, vignette: 0.08 },
    captions: { font: "marker", color: "#1B1B1F", stroke: "#FFFFFF", highlight: "#E23D3D", size: 1.25, uppercase: false },
    titleColor: "#E23D3D",
  },
  lowpoly: {
    ...toon,
    characters: "lowpoly",
    props: "faceted",
    outline: 0,
    colors: { mix: "#FFFFFF", amount: 0.04, saturation: 1.08 },
    ground: "plain",
    sky: { day: ["#4FA4F0", "#D8F0FF"], sunset: ["#6A4FB0", "#FFB37A"], night: ["#0A1030", "#2C3F7A"] },
    post: { saturate: 1.08, contrast: 1.05, grain: 0, vignette: 0.3 },
  },
  pixel: {
    ...toon,
    line: 1.7,
    outline: 1.6,
    colors: { mix: "#FFFFFF", amount: 0.06, saturation: 0.95 },
    ground: "plain",
    fog: false,
    pixel: 6,
    posterize: 9,
    post: { saturate: 1, contrast: 1.04, grain: 0, vignette: 0 },
    captions: { font: "pixel", color: "#FFFFFF", stroke: "#000000", highlight: "#FFE14A", size: 0.6, uppercase: true },
    titleColor: "#FFE14A",
  },
};

const merge = (base: StyleSpec, over: Partial<StyleSpec>): StyleSpec => ({
  ...base,
  ...over,
  colors: { ...base.colors, ...(over.colors ?? {}) },
  sky: { ...(base.sky ?? {}), ...(over.sky ?? {}) },
  post: { ...base.post, ...(over.post ?? {}) },
  captions: { ...base.captions, ...(over.captions ?? {}) },
});

/** Finds the style a story asks for: a built-in name, a custom name, or an inline object. */
export const resolveStyle = (story: Story, override?: string): StyleSpec & { key: string } => {
  const library: Record<string, Partial<StyleSpec>> = { ...(custom as unknown as Record<string, Partial<StyleSpec>>), ...((story.styles ?? {}) as Record<string, Partial<StyleSpec>>) };
  const build = (ref: string | Partial<StyleSpec> | undefined, depth: number): StyleSpec => {
    if (!ref) return toon;
    if (typeof ref === "string") {
      if (BUILTIN[ref]) return BUILTIN[ref];
      const found = library[ref];
      if (!found || depth > 4) return toon; // unknown name: fall back to the default look
      return merge(build(found.base ?? "toon", depth + 1), found);
    }
    return merge(build(ref.base ?? "toon", depth + 1), ref);
  };
  const spec = build(override || (story.style as string | Partial<StyleSpec> | undefined), 0);
  return { ...spec, key: JSON.stringify(spec) };
};

// The renderer draws one frame at a time, so the active style is kept here for the painters to read.
let active: StyleSpec & { key: string } = { ...toon, key: "toon" };
export const setStyle = (s: StyleSpec & { key: string }) => { active = s; };
export const style = () => active;

const tmp = new THREE.Color();
const mixC = new THREE.Color();
const hsl = { h: 0, s: 0, l: 0 };
/** Passes a colour through the active style's palette settings. */
export const col = (hex: string): string => {
  const { mix, amount, saturation } = active.colors;
  if (!amount && saturation === 1) return hex;
  tmp.set(hex);
  if (saturation !== 1) {
    tmp.getHSL(hsl);
    tmp.setHSL(hsl.h, Math.min(1, hsl.s * saturation), hsl.l);
  }
  if (amount) tmp.lerp(mixC.set(mix), amount);
  return `#${tmp.getHexString()}`;
};

export const GROUND_COLOR: Record<string, string> = { cobble: "#E3D2AE", grass: "#7CC65A", sand: "#E9C98C", snow: "#F2F7FC", soil: "#9A6B3F", wood: "#C99A5B" };
