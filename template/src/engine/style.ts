// A style is a bundle of drawing settings. Fourteen are built in; you can invent more in
// styles/custom.json (or inside a story under "styles") by naming one, picking a `base`,
// and overriding any field below. See references/styles.md.
import * as THREE from "three";
import custom from "../../styles/custom.json";
import type { Story, TimeOfDay } from "./types";

export type StyleSpec = {
  base?: string;
  /** How people are drawn. outline: ink-lined cartoon. paper: cut paper with white edges.
   *  sketch: line drawing filled with `sketchFill`. lowpoly / smooth / brick: real 3D bodies
   *  (faceted, smooth like clay or CGI, or blocky toy figures). */
  characters: "outline" | "paper" | "sketch" | "lowpoly" | "smooth" | "brick";
  ink: string; // line colour for characters and prop outlines
  features?: string; // colour of eyes, mouths and brows (default: ink)
  sketchFill?: string; // sketch characters: skin/face fill (default white)
  sketchHair?: string; // sketch characters: hair fill
  line: number; // character line thickness, 1 = normal
  /** How 3D props are shaded. toon: two-tone cartoon. matte: soft paper. flat: no shading.
   *  faceted: low-poly. soft: smooth 3D. plastic: shiny toy plastic. */
  props: "toon" | "matte" | "flat" | "faceted" | "soft" | "plastic";
  roughness: number; // smooth 3D surfaces: 0.2 glossy, 1 dull clay
  studs: boolean; // toy-brick studs on blocks
  outline: number; // prop outline thickness, 0 = none
  shadows: boolean;
  /** Every colour in the film is pushed towards `mix` by `amount` (0..1) and its saturation scaled. */
  colors: { mix: string; amount: number; saturation: number };
  ground: "textured" | "plain" | "studs";
  groundColor?: string; // one colour for every ground type (plain ground only)
  sky?: Partial<Record<TimeOfDay, [string, string]>>; // [top, horizon] per time of day
  evenLight: boolean; // true: sunset and night do not tint the characters
  fog: boolean;
  clouds: boolean;
  pixel: number; // 0 = off; 6 = each "pixel" is 6x6 real pixels
  posterize: number; // 0 = off; 5 = only 5 levels per colour channel (retro palettes)
  post: { saturate: number; contrast: number; grain: number; vignette: number; halftone: number };
  captions: { font: "round" | "marker" | "pixel" | "comic" | "serif"; color: string; stroke: string; highlight: string; size: number; uppercase: boolean; box?: string };
  titleColor: string;
};

const toon: StyleSpec = {
  characters: "outline",
  ink: "#1E1A17",
  line: 1,
  props: "toon",
  roughness: 0.6,
  studs: false,
  outline: 1,
  shadows: true,
  colors: { mix: "#FFFFFF", amount: 0, saturation: 1 },
  ground: "textured",
  evenLight: false,
  fog: true,
  clouds: true,
  pixel: 0,
  posterize: 0,
  post: { saturate: 1, contrast: 1, grain: 0, vignette: 0.26, halftone: 0 },
  captions: { font: "round", color: "#FFFFFF", stroke: "#14110F", highlight: "#FFD23F", size: 1, uppercase: false },
  titleColor: "#FFD23F",
};

const p = (o: Partial<StyleSpec["post"]>) => ({ ...toon.post, ...o });

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
    post: p({ saturate: 0.95, grain: 0.5, vignette: 0.2 }),
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
    post: p({ contrast: 1.04, vignette: 0.08 }),
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
    post: p({ saturate: 1.08, contrast: 1.05, vignette: 0.3 }),
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
    post: p({ contrast: 1.04, vignette: 0 }),
    captions: { font: "pixel", color: "#FFFFFF", stroke: "#000000", highlight: "#FFE14A", size: 0.6, uppercase: true },
    titleColor: "#FFE14A",
  },
  chalkboard: {
    ...toon,
    characters: "sketch",
    ink: "#F2EFE6",
    sketchFill: "#2F4A3E",
    sketchHair: "rgba(242,239,230,0.55)",
    line: 0.95,
    props: "flat",
    outline: 1.15,
    shadows: false,
    colors: { mix: "#2F4A3E", amount: 0.55, saturation: 0.8 },
    ground: "plain",
    groundColor: "#2B4438",
    sky: { day: ["#25392F", "#2F4A3E"], sunset: ["#25392F", "#2F4A3E"], night: ["#1D2D25", "#26392F"] },
    evenLight: true,
    fog: false,
    clouds: false,
    post: p({ grain: 0.25, vignette: 0.35 }),
    captions: { font: "marker", color: "#F2EFE6", stroke: "#2F4A3E", highlight: "#FFE066", size: 1.25, uppercase: false },
    titleColor: "#FFE066",
  },
  lineart: {
    ...toon,
    characters: "sketch",
    ink: "#141414",
    sketchHair: "#FFFFFF",
    line: 0.8,
    props: "flat",
    outline: 1,
    shadows: false,
    colors: { mix: "#FFFFFF", amount: 1, saturation: 0 },
    ground: "plain",
    groundColor: "#FBFAF6",
    sky: { day: ["#FBFAF6", "#FBFAF6"], sunset: ["#FBFAF6", "#FBFAF6"], night: ["#EDEDED", "#F5F5F2"] },
    evenLight: true,
    fog: false,
    clouds: false,
    post: p({ saturate: 0, vignette: 0.05 }),
    captions: { font: "marker", color: "#141414", stroke: "#FBFAF6", highlight: "#141414", size: 1.25, uppercase: true },
    titleColor: "#141414",
  },
  gold: {
    ...toon,
    characters: "sketch",
    ink: "#E3B85C",
    sketchFill: "#121A2E",
    sketchHair: "#1B2540",
    line: 0.8,
    props: "flat",
    outline: 1,
    shadows: false,
    colors: { mix: "#121A2E", amount: 0.86, saturation: 0.6 },
    ground: "plain",
    groundColor: "#0F1627",
    sky: { day: ["#0A0F1C", "#18223B"], sunset: ["#0A0F1C", "#2A2433"], night: ["#05080F", "#121A2E"] },
    evenLight: true,
    fog: false,
    clouds: false,
    post: p({ vignette: 0.45 }),
    captions: { font: "serif", color: "#E3B85C", stroke: "#0A0F1C", highlight: "#FFF1CC", size: 0.92, uppercase: true },
    titleColor: "#E3B85C",
  },
  comic: {
    ...toon,
    line: 1.6,
    outline: 1.6,
    colors: { mix: "#FFFFFF", amount: 0, saturation: 1.3 },
    ground: "plain",
    sky: { day: ["#3FA9F5", "#BDE6FF"], sunset: ["#FF6A3D", "#FFD23F"], night: ["#1A1240", "#4A2C8A"] },
    fog: false,
    post: p({ saturate: 1.15, contrast: 1.1, vignette: 0, halftone: 0.3 }),
    captions: { font: "comic", color: "#141414", stroke: "#141414", highlight: "#E8262D", size: 1.05, uppercase: true, box: "#FFE14A" },
    titleColor: "#E8262D",
  },
  flatvector: {
    ...toon,
    ink: "rgba(0,0,0,0)",
    features: "#2B2622",
    outline: 0,
    shadows: false,
    colors: { mix: "#FFFFFF", amount: 0.04, saturation: 1.05 },
    ground: "plain",
    sky: { day: ["#7CC8F2", "#DDF2FC"], sunset: ["#F28B6B", "#FFD7A1"], night: ["#24305E", "#4C5C9A"] },
    evenLight: true,
    fog: false,
    post: p({ vignette: 0 }),
    captions: { font: "round", color: "#FFFFFF", stroke: "#2B2622", highlight: "#FFC93C", size: 1, uppercase: false },
    titleColor: "#FFC93C",
  },
  ps2: {
    ...toon,
    characters: "lowpoly",
    props: "faceted",
    outline: 0,
    colors: { mix: "#B8C4C8", amount: 0.08, saturation: 0.82 },
    ground: "textured",
    sky: { day: ["#6F9CC4", "#C9D8E0"], sunset: ["#5E4B7A", "#D99A6C"], night: ["#0C1226", "#2A3556"] },
    fog: true,
    pixel: 3,
    post: p({ saturate: 0.9, contrast: 1.08, grain: 0.18, vignette: 0.35 }),
  },
  cgi: {
    ...toon,
    characters: "smooth",
    props: "soft",
    roughness: 0.42,
    outline: 0,
    colors: { mix: "#FFFFFF", amount: 0.02, saturation: 1.05 },
    ground: "plain",
    sky: { day: ["#4E9BE6", "#D9EEFF"], sunset: ["#5B4FA8", "#FFB27A"], night: ["#0A1030", "#2C3F7A"] },
    post: p({ saturate: 1.06, contrast: 1.06, vignette: 0.32 }),
  },
  clay: {
    ...toon,
    characters: "smooth",
    props: "soft",
    roughness: 1,
    outline: 0,
    colors: { mix: "#FFF4E8", amount: 0.07, saturation: 0.95 },
    ground: "plain",
    sky: { day: ["#B7D6F0", "#F6EEE4"], sunset: ["#E6A38C", "#F8DDBE"], night: ["#3B4170", "#6E739E"] },
    post: p({ saturate: 1.02, contrast: 1.05, grain: 0.25, vignette: 0.22 }),
    fog: false,
    captions: { font: "round", color: "#FFFDF8", stroke: "#5A4636", highlight: "#FFB547", size: 1, uppercase: false },
    titleColor: "#FFB547",
  },
  bricks: {
    ...toon,
    characters: "brick",
    props: "plastic",
    studs: true,
    outline: 0,
    colors: { mix: "#FFFFFF", amount: 0, saturation: 1.2 },
    ground: "studs",
    sky: { day: ["#3E9BEA", "#CFEAFF"], sunset: ["#6A4FB0", "#FFB37A"], night: ["#0A1030", "#2C3F7A"] },
    post: p({ saturate: 1.08, contrast: 1.04, vignette: 0.28 }),
  },
  orbit: {
    ...toon,
    characters: "smooth",
    ink: "rgba(0,0,0,0)",
    features: "#0B0F1A",
    props: "soft",
    roughness: 0.28,
    outline: 0,
    colors: { mix: "#0A1030", amount: 0.1, saturation: 1.1 },
    ground: "textured",
    groundColor: "#232B3D",
    sky: { day: ["#050714", "#0B1230"], sunset: ["#050714", "#141226"], night: ["#020208", "#070A1C"] },
    evenLight: true,
    fog: false,
    clouds: false,
    post: p({ saturate: 1.12, contrast: 1.12, vignette: 0.42 }),
    captions: { font: "round", color: "#F4F8FF", stroke: "#060A18", highlight: "#4FE0FF", size: 1, uppercase: false },
    titleColor: "#4FE0FF",
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

export const GROUND_COLOR: Record<string, string> = { cobble: "#E3D2AE", grass: "#7CC65A", sand: "#E9C98C", snow: "#F2F7FC", soil: "#9A6B3F", wood: "#C99A5B", metal: "#3A4452", concrete: "#9AA0A6" };
