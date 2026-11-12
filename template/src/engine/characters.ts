// Characters are painted in code onto a canvas, then used as textures on flat cards
// standing in the 3D world. No image files, no image API.
import * as THREE from "three";
import { col, style } from "./style";
import type { CastSpec, Face, Pose } from "./types";

export const INK = "#1E1A17";
const W = 512;
const H = 640;
const S = 2; // texture resolution multiplier
const LW0 = 11;
let LW = LW0; // line width, set per style
let OUT = INK; // outline colour (white in the paper style)
let FEAT = INK; // colour of eyes, mouths, brows
const TAU = Math.PI * 2;

export type Look = { face: Face; pose: Pose; mouth: boolean; blink: boolean; hold?: string };
export type Sprite = { map: THREE.CanvasTexture; depth: THREE.MeshDepthMaterial };
type Ctx = CanvasRenderingContext2D;

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const TEXT_FONT = '"Arial Rounded MT Bold","Trebuchet MS","Arial Black",Arial,sans-serif';

const cache = new Map<string, Sprite>();

const finish = (canvas: HTMLCanvasElement): Sprite => {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5, side: THREE.DoubleSide });
  return { map, depth };
};

const makeCanvas = (w: number, h: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
};

// ---------- small drawing helpers ----------
const rr = (c: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};
const disc = (c: Ctx, x: number, y: number, rx: number, ry = rx) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
};
const paint = (c: Ctx, fill: string, lw = LW, stroke = OUT) => {
  c.fillStyle = fill.startsWith("#") ? col(fill) : fill;
  c.fill();
  c.lineWidth = lw;
  c.strokeStyle = stroke;
  c.stroke();
};
/** Like paint, for face details: always uses the dark feature colour and never casts a paper shadow. */
const paintF = (c: Ctx, fill: string, lw = LW) => {
  const blur = c.shadowBlur;
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = lw;
  c.strokeStyle = FEAT;
  c.stroke();
  c.shadowBlur = blur;
  c.shadowOffsetY = blur ? 5 : 0;
};
const line = (c: Ctx, pts: number[][], lw = LW, color = FEAT) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.lineWidth = lw;
  c.strokeStyle = color;
  c.stroke();
};
const limb = (c: Ctx, pts: number[][], color: string, w = 20) => {
  line(c, pts, w + LW * 1.7, OUT);
  line(c, pts, w, col(color));
};
const shade = (hex: string, k: number) => {
  const col = new THREE.Color(hex);
  col.multiplyScalar(k);
  return `#${col.getHexString()}`;
};

// ---------- face ----------
const FACES: Record<Face, { eye: string; brow: string; mouth: string }> = {
  neutral: { eye: "dot", brow: "", mouth: "flat" },
  happy: { eye: "dot", brow: "", mouth: "smile" },
  joy: { eye: "arc", brow: "", mouth: "grin" },
  sad: { eye: "dot", brow: "sad", mouth: "frown" },
  shocked: { eye: "wide", brow: "raise", mouth: "o" },
  angry: { eye: "dot", brow: "angry", mouth: "frown" },
  smug: { eye: "half", brow: "", mouth: "smirk" },
  think: { eye: "up", brow: "one", mouth: "tiny" },
  sleepy: { eye: "line", brow: "", mouth: "tiny" },
  worried: { eye: "dot", brow: "sad", mouth: "wavy" },
};

const drawFace = (c: Ctx, k: Look, hx: number, hy: number) => {
  const f = FACES[k.face] ?? FACES.neutral;
  const ey = hy + 2;
  const dx = 54;
  let eye = f.eye;
  if (k.blink && eye !== "arc") eye = "line";
  for (const sgn of [-1, 1]) {
    const x = hx + sgn * dx;
    if (eye === "dot" || eye === "up") {
      disc(c, x + (eye === "up" ? 6 : 0), ey - (eye === "up" ? 8 : 0), 13, 15);
      c.fillStyle = FEAT;
      c.fill();
    } else if (eye === "wide") {
      disc(c, x, ey, 25, 27);
      paintF(c, "#FFFFFF", 7);
      disc(c, x, ey, 8);
      c.fillStyle = FEAT;
      c.fill();
    } else if (eye === "arc") {
      c.beginPath();
      c.arc(x, ey + 10, 20, Math.PI * 1.15, Math.PI * 1.85);
      c.lineWidth = 9;
      c.strokeStyle = FEAT;
      c.stroke();
    } else if (eye === "half") {
      disc(c, x, ey + 3, 13, 12);
      c.fillStyle = FEAT;
      c.fill();
      line(c, [[x - 22, ey - 9], [x + 22, ey - 9]], 8);
    } else {
      line(c, [[x - 18, ey], [x + 18, ey]], 9);
    }
    // brows: `sgn` mirrors them so the inner end is always towards the nose
    const inner = x - sgn * 24;
    const outer = x + sgn * 24;
    if (f.brow === "sad") line(c, [[outer, ey - 34], [inner, ey - 50]], 9);
    if (f.brow === "angry") line(c, [[outer, ey - 52], [inner, ey - 32]], 10);
    if (f.brow === "raise") line(c, [[outer, ey - 50], [inner, ey - 54]], 8);
    if (f.brow === "one") line(c, sgn > 0 ? [[outer, ey - 50], [inner, ey - 58]] : [[outer, ey - 34], [inner, ey - 34]], 8);
  }
  const my = hy + 66;
  let mouth = f.mouth;
  if (k.mouth && mouth !== "o") mouth = "open";
  c.lineWidth = 9;
  c.strokeStyle = FEAT;
  c.beginPath();
  if (mouth === "flat") { c.moveTo(hx - 22, my); c.lineTo(hx + 22, my); c.stroke(); }
  if (mouth === "tiny") { c.moveTo(hx - 10, my); c.lineTo(hx + 10, my); c.stroke(); }
  if (mouth === "smile") { c.arc(hx, my - 20, 40, Math.PI * 0.18, Math.PI * 0.82); c.stroke(); }
  if (mouth === "frown") { c.arc(hx, my + 36, 38, Math.PI * 1.22, Math.PI * 1.78); c.stroke(); }
  if (mouth === "smirk") { c.moveTo(hx - 20, my + 2); c.quadraticCurveTo(hx + 14, my + 10, hx + 34, my - 16); c.stroke(); }
  if (mouth === "wavy") { c.moveTo(hx - 30, my); c.bezierCurveTo(hx - 14, my - 16, hx - 6, my + 16, hx + 8, my); c.bezierCurveTo(hx + 16, my - 10, hx + 24, my + 6, hx + 30, my); c.stroke(); }
  if (mouth === "grin") {
    c.arc(hx, my - 14, 44, 0, Math.PI);
    c.closePath();
    paintF(c, "#5A1F1F", 8);
    disc(c, hx, my + 20, 20, 9);
    c.fillStyle = "#F08A8A";
    c.fill();
  }
  if (mouth === "o") { disc(c, hx, my + 4, 19, 25); paintF(c, "#5A1F1F", 8); }
  if (mouth === "open") {
    disc(c, hx, my, 26, 19);
    paintF(c, "#5A1F1F", 8);
    disc(c, hx, my + 9, 13, 6);
    c.fillStyle = "#F08A8A";
    c.fill();
  }
  if (k.face === "worried") {
    c.beginPath();
    c.moveTo(hx + 104, hy - 60);
    c.quadraticCurveTo(hx + 126, hy - 22, hx + 104, hy - 16);
    c.quadraticCurveTo(hx + 82, hy - 22, hx + 104, hy - 60);
    paintF(c, "#8FD3FF", 6);
  }
};

// ---------- hair, hats, extras (all placed relative to a head centre + radius) ----------
const drawHairBack = (c: Ctx, s: CastSpec, hx: number, hy: number, r: number, hairC: string) => {
  if (s.hair === "long") { rr(c, hx - r - 8, hy - 60, 2 * r + 16, 270, 70); paint(c, hairC); }
  if (s.hair === "bun") { disc(c, hx, hy - r - 22, 44); paint(c, hairC); }
  if (s.hair === "spiky") {
    c.beginPath();
    c.moveTo(hx - r * 0.8, hy - r * 0.55);
    for (let i = 0; i < 5; i++) {
      const x0 = hx - r * 0.8 + (i * 2 * r * 0.8) / 5;
      c.lineTo(x0 + r * 0.14, hy - r - 46 + (i % 2) * 14);
      c.lineTo(x0 + r * 0.32, hy - r * 0.75);
    }
    c.closePath();
    paint(c, hairC);
  }
};

const drawHairFront = (c: Ctx, s: CastSpec, hx: number, hy: number, r: number, hairC: string) => {
  const hair = s.hair ?? "short";
  if (hair === "none") return;
  if (hair === "curly") {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.08 + (i * 0.84) / 6);
      disc(c, hx + Math.cos(a) * r * 0.92, hy + Math.sin(a) * r * 0.92, 40);
      paint(c, hairC, 9);
    }
    return;
  }
  const cut = hair === "bowl" ? hy - 34 : hy - 62;
  const curve = hair === "bowl" ? 6 : 58;
  c.save();
  disc(c, hx, hy, r);
  c.clip();
  c.beginPath();
  c.moveTo(hx - r - 20, hy - r - 20);
  c.lineTo(hx + r + 20, hy - r - 20);
  c.lineTo(hx + r + 20, cut);
  c.quadraticCurveTo(hx, cut - curve, hx - r - 20, cut);
  c.closePath();
  paint(c, hairC, 9);
  c.restore();
  disc(c, hx, hy, r);
  c.lineWidth = LW;
  c.strokeStyle = OUT;
  c.stroke();
};

const drawHat = (c: Ctx, s: CastSpec, hx: number, hy: number, r: number) => {
  const hat = s.hat ?? "none";
  if (hat === "none") return;
  const col = s.hatColor ?? (hat === "straw" ? "#E8C45A" : hat === "crown" ? "#F5C542" : hat === "tophat" ? "#2B2B33" : "#D9534F");
  const dome = (a: number, grow = 5) => {
    c.beginPath();
    c.arc(hx, hy, r + grow, Math.PI + a, TAU - a);
    c.closePath();
    paint(c, col);
  };
  if (hat === "cap") {
    rr(c, hx + 20, hy - (r + 5) * Math.sin(0.5) - 22, r + 20, 30, 15);
    paint(c, shade(col, 0.82));
    dome(0.5);
  }
  if (hat === "beanie") {
    disc(c, hx, hy - r - 12, 26);
    paint(c, "#FFFFFF");
    dome(0.34);
    rr(c, hx - r - 4, hy - (r + 5) * Math.sin(0.34) - 30, 2 * r + 8, 38, 18);
    paint(c, shade(col, 0.8));
  }
  if (hat === "tophat") {
    rr(c, hx - 84, hy - r - 128, 168, 150, 12);
    paint(c, col);
    rr(c, hx - 84, hy - r - 26, 168, 26, 4);
    paint(c, "#C8553D", 7);
    rr(c, hx - 130, hy - r + 10, 260, 28, 14);
    paint(c, col);
  }
  if (hat === "straw") {
    dome(0.62);
    disc(c, hx, hy - (r + 5) * Math.sin(0.62) + 4, r * 1.45, 26);
    paint(c, col);
    c.beginPath();
    c.arc(hx, hy, r + 5, Math.PI + 0.72, TAU - 0.72);
    c.closePath();
    paint(c, col);
  }
  if (hat === "crown") {
    const y0 = hy - r * 0.72;
    c.beginPath();
    c.moveTo(hx - 96, y0);
    c.lineTo(hx - 104, y0 - 110);
    c.lineTo(hx - 52, y0 - 58);
    c.lineTo(hx, y0 - 128);
    c.lineTo(hx + 52, y0 - 58);
    c.lineTo(hx + 104, y0 - 110);
    c.lineTo(hx + 96, y0);
    c.closePath();
    paint(c, col);
    disc(c, hx, y0 - 34, 12);
    paint(c, "#E0457B", 6);
  }
};

const drawExtra = (c: Ctx, s: CastSpec, hx: number, hy: number, hairC: string) => {
  const ex = s.extra ?? "none";
  if (ex === "glasses") {
    for (const sgn of [-1, 1]) {
      disc(c, hx + sgn * 54, hy + 2, 36);
      c.fillStyle = "rgba(255,255,255,0.28)";
      c.fill();
      c.lineWidth = 8;
      c.strokeStyle = FEAT;
      c.stroke();
    }
    line(c, [[hx - 18, hy + 2], [hx + 18, hy + 2]], 8);
  }
  if (ex === "moustache") {
    for (const sgn of [-1, 1]) {
      c.beginPath();
      c.ellipse(hx + sgn * 24, hy + 46, 30, 13, sgn * -0.25, 0, TAU);
      paint(c, hairC, 6, FEAT);
    }
  }
  if (ex === "freckles") {
    c.fillStyle = "rgba(150,85,50,0.7)";
    for (const [x, y] of [[-84, 34], [-66, 44], [-76, 54], [84, 34], [66, 44], [76, 54]]) { disc(c, hx + x, hy + y, 5); c.fill(); }
  }
  if (ex === "blush") {
    c.fillStyle = "rgba(240,110,120,0.4)";
    for (const sgn of [-1, 1]) { disc(c, hx + sgn * 88, hy + 40, 24, 16); c.fill(); }
  }
};

const drawHeld = (c: Ctx, emoji: string, x: number, y: number) => {
  c.font = `110px ${EMOJI_FONT}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#000";
  c.fillText(emoji, x, y);
};

// ---------- person ----------
const ARM: Record<string, number[][]> = {
  down: [[332, 388], [376, 470]],
  up: [[336, 392], [436, 292]],
  point: [[336, 392], [470, 352]],
  hips: [[334, 382], [394, 432], [342, 474]],
  hold: [[336, 396], [418, 440]],
};
const mirror = (pts: number[][]) => pts.map(([x, y]) => [W - x, y]);

const drawPerson = (c: Ctx, s: CastSpec, k: Look) => {
  const sketch = style().characters === "sketch";
  const skin = sketch ? "#FFFFFF" : s.skin ?? "#F2D3B1";
  const outfit = s.outfit ?? "#3A7BD5";
  const hairC = sketch ? "rgb(40,40,46)" : s.hairColor ?? "#2B2320";
  const hx = 256, hy = 218, r = 146;
  const right = ARM[k.pose === "up" || k.pose === "point" || k.pose === "hips" || k.pose === "hold" ? k.pose : "down"];
  const left = mirror(ARM[k.pose === "up" || k.pose === "hips" ? k.pose : "down"]);
  const arms = () => {
    for (const pts of [left, right]) {
      limb(c, pts, skin);
      const [x, y] = pts[pts.length - 1];
      disc(c, x, y, 17);
      paint(c, skin, 8);
    }
  };
  drawHairBack(c, s, hx, hy, r, hairC);
  for (const x of [224, 288]) {
    limb(c, [[x, 540], [x, 598]], shade(outfit, 0.55), 18);
    disc(c, x + 6, 606, 27, 14);
    paint(c, "#3A2E28", 8);
  }
  if (k.pose !== "up") arms();
  rr(c, 170, 322, 172, 236, 78);
  paint(c, outfit);
  c.save();
  rr(c, 170, 322, 172, 236, 78);
  c.clip();
  c.fillStyle = shade(outfit, 0.82);
  c.fillRect(170, 500, 172, 80);
  c.restore();
  disc(c, hx, hy, r);
  paint(c, skin);
  if (s.extra === "beard") {
    c.save();
    disc(c, hx, hy, r);
    c.clip();
    c.beginPath();
    c.moveTo(hx - r - 10, hy + 34);
    c.quadraticCurveTo(hx, hy + 4, hx + r + 10, hy + 34);
    c.lineTo(hx + r + 10, hy + r + 10);
    c.lineTo(hx - r - 10, hy + r + 10);
    c.closePath();
    paint(c, hairC, 8);
    c.restore();
    disc(c, hx, hy + 66, 44, 30);
    c.fillStyle = col(skin);
    c.fill();
    disc(c, hx, hy, r);
    c.lineWidth = LW;
    c.strokeStyle = OUT;
    c.stroke();
  }
  drawHairFront(c, s, hx, hy, r, hairC);
  drawFace(c, k, hx, hy);
  drawExtra(c, s, hx, hy, hairC);
  drawHat(c, s, hx, hy, r);
  if (k.pose === "up") arms();
  if (k.hold) { const [x, y] = right[right.length - 1]; drawHeld(c, k.hold, x + 26, y - 40); }
};

// ---------- owl (the teacher / narrator animal) ----------
const drawOwl = (c: Ctx, s: CastSpec, k: Look) => {
  const body = s.outfit ?? "#8A5A3B";
  const hx = 256, hy = 292;
  for (const x of [214, 298]) { disc(c, x, 606, 30, 13); paint(c, "#F2A33A", 8); }
  for (const sgn of [-1, 1]) {
    c.beginPath();
    c.moveTo(hx + sgn * 60, 150);
    c.lineTo(hx + sgn * 150, 96);
    c.lineTo(hx + sgn * 150, 230);
    c.closePath();
    paint(c, body);
  }
  const pointing = k.pose === "point" || k.pose === "up";
  if (pointing) {
    line(c, [[410, 372], [500, 268]], 9, "#F3E7C9");
    c.beginPath();
    c.moveTo(376, 330);
    c.quadraticCurveTo(470, 318, 452, 380);
    c.quadraticCurveTo(410, 440, 370, 430);
    c.closePath();
    paint(c, shade(body, 0.8));
  }
  disc(c, hx, 392, 168, 210);
  paint(c, body);
  disc(c, hx, 462, 106, 126);
  c.fillStyle = "#F1DFBF";
  c.fill();
  c.strokeStyle = shade(body, 0.7);
  c.lineWidth = 7;
  for (const [x, y] of [[-40, 420], [40, 420], [0, 462], [-40, 504], [40, 504]]) {
    c.beginPath();
    c.arc(hx + x, y, 16, Math.PI * 0.1, Math.PI * 0.9);
    c.stroke();
  }
  c.beginPath();
  c.ellipse(108, 430, 34, 96, 0.14, 0, TAU);
  paint(c, shade(body, 0.8));
  if (!pointing) {
    c.beginPath();
    c.ellipse(404, 430, 34, 96, -0.14, 0, TAU);
    paint(c, shade(body, 0.8));
  }
  for (const sgn of [-1, 1]) {
    const x = hx + sgn * 64;
    disc(c, x, hy, 56);
    paint(c, "#FFFFFF", 9);
    if (k.blink || k.face === "sleepy") line(c, [[x - 30, hy], [x + 30, hy]], 9);
    else { disc(c, x + (k.face === "think" ? 10 : 0), hy + (k.face === "shocked" ? 0 : 4), k.face === "shocked" ? 12 : 21); c.fillStyle = FEAT; c.fill(); }
    if (k.face === "angry") line(c, [[x + sgn * 44, hy - 66], [x - sgn * 34, hy - 36]], 11);
  }
  c.beginPath();
  c.moveTo(hx - 24, hy + 44);
  c.lineTo(hx + 24, hy + 44);
  c.lineTo(hx, hy + (k.mouth ? 72 : 88));
  c.closePath();
  paint(c, "#F2A33A", 8);
  if (k.mouth) {
    c.beginPath();
    c.moveTo(hx - 16, hy + 84);
    c.lineTo(hx + 16, hy + 84);
    c.lineTo(hx, hy + 104);
    c.closePath();
    paint(c, "#D9862A", 7);
  }
  drawExtra(c, s, hx, hy, "#3A2E28");
  drawHat(c, s, hx, hy + 30, 150);
  if (k.hold) drawHeld(c, k.hold, 450, 420);
};

/** Texture (+ shadow material) for one character in one look. Cached. */
export const getSprite = (id: string, spec: CastSpec, look: Look): Sprite => {
  const st = style();
  const key = `${st.key}|${id}|${JSON.stringify(spec)}|${look.face}|${look.pose}|${look.mouth ? 1 : 0}|${look.blink ? 1 : 0}|${look.hold ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = makeCanvas(W * S, H * S);
  const c = canvas.getContext("2d")!;
  c.scale(S, S);
  c.lineJoin = "round";
  c.lineCap = "round";
  LW = LW0 * st.line;
  OUT = st.ink;
  FEAT = st.characters === "paper" ? "#2B2622" : st.ink;
  if (st.characters === "paper") {
    // each cut-out piece drops a soft shadow on the pieces under it
    c.shadowColor = "rgba(40,25,10,0.3)";
    c.shadowBlur = 9;
    c.shadowOffsetY = 5;
  }
  if (spec.kind === "owl") drawOwl(c, spec, look);
  else drawPerson(c, spec, look);
  const sprite = finish(canvas);
  cache.set(key, sprite);
  return sprite;
};
export const SPRITE_ASPECT = W / H;

/** An emoji or a short word as a texture: bubbles, floating icons, held items. */
export const getEmoji = (text: string): Sprite => {
  const key = `emoji|${style().key}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = makeCanvas(512, 512);
  const c = canvas.getContext("2d")!;
  c.textAlign = "center";
  c.textBaseline = "middle";
  if (/^[\x20-\x7E]+$/.test(text)) {
    const size = Math.min(380, 760 / Math.max(1, text.length));
    c.font = `900 ${size}px ${TEXT_FONT}`;
    c.lineJoin = "round";
    c.lineWidth = size * 0.16;
    c.strokeStyle = style().characters === "paper" ? "#3A2F28" : style().ink;
    c.strokeText(text, 256, 270);
    c.fillStyle = style().titleColor;
    c.fillText(text, 256, 270);
  } else {
    c.font = `380px ${EMOJI_FONT}`;
    c.fillStyle = "#000";
    c.fillText(text, 256, 280);
  }
  const sprite = finish(canvas);
  cache.set(key, sprite);
  return sprite;
};

/** Chalkboard / sign text as a texture. `shown` = how many lines are visible yet. */
export const getTextTexture = (lines: string[], shown: number, bg: string, w = 1024, h = 680, chalk = true): THREE.CanvasTexture => {
  const key = `text|${lines.join("\n")}|${shown}|${bg}|${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit.map;
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext("2d")!;
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  if (chalk) {
    c.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 60; i++) c.fillRect((i * 173) % w, (i * 97) % h, 90, 3);
  }
  c.textAlign = "center";
  c.textBaseline = "middle";
  const n = Math.max(1, lines.length);
  const rowH = (h * 0.84) / n;
  lines.slice(0, shown).forEach((text, i) => {
    let size = Math.min(rowH * 0.74, 170);
    c.font = `900 ${size}px ${TEXT_FONT}, ${EMOJI_FONT}`;
    const tw = c.measureText(text).width;
    if (tw > w * 0.88) { size *= (w * 0.88) / tw; c.font = `900 ${size}px ${TEXT_FONT}, ${EMOJI_FONT}`; }
    c.fillStyle = chalk ? (i % 2 ? "#FFE066" : "#FFFFFF") : INK;
    c.fillText(text, w / 2, h * 0.08 + rowH * (i + 0.5));
  });
  const sprite = finish(canvas);
  cache.set(key, sprite);
  return sprite.map;
};

/** Procedural ground tiles. */
export const getGround = (kind: string): THREE.CanvasTexture => {
  const key = `ground|${kind}`;
  const hit = cache.get(key);
  if (hit) return hit.map;
  const n = 512;
  const canvas = makeCanvas(n, n);
  const c = canvas.getContext("2d")!;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const speckle = (count: number, colors: string[], min: number, max: number) => {
    for (let i = 0; i < count; i++) {
      c.fillStyle = colors[i % colors.length];
      const sz = min + rnd() * (max - min);
      c.fillRect(rnd() * n, rnd() * n, sz, sz * (0.6 + rnd()));
    }
  };
  if (kind === "cobble") {
    c.fillStyle = "#B9A27E";
    c.fillRect(0, 0, n, n);
    const rows = 6, cols = 4;
    const ch = n / rows, cw = n / cols;
    for (let row = 0; row < rows; row++) {
      for (let col = -1; col <= cols; col++) {
        const x = col * cw + (row % 2 ? cw / 2 : 0);
        c.fillStyle = ["#EBDDBE", "#E3D2AE", "#F0E4C9", "#DCCAA4"][Math.floor(rnd() * 4)];
        rr(c, x + 5, row * ch + 5, cw - 10, ch - 10, 16);
        c.fill();
      }
    }
  } else if (kind === "grass") {
    c.fillStyle = "#7CC65A";
    c.fillRect(0, 0, n, n);
    speckle(260, ["#6DB84C", "#8AD268", "#69B047"], 4, 14);
  } else if (kind === "sand") {
    c.fillStyle = "#E9C98C";
    c.fillRect(0, 0, n, n);
    speckle(220, ["#DFBC7C", "#F1D6A0"], 3, 9);
  } else if (kind === "snow") {
    c.fillStyle = "#F2F7FC";
    c.fillRect(0, 0, n, n);
    speckle(160, ["#E1EBF5", "#FFFFFF"], 4, 16);
  } else if (kind === "soil") {
    c.fillStyle = "#9A6B3F";
    c.fillRect(0, 0, n, n);
    speckle(220, ["#8A5D35", "#A97848"], 4, 12);
  } else {
    c.fillStyle = "#C99A5B";
    c.fillRect(0, 0, n, n);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i % 2 ? "#C2924F" : "#D0A366";
      c.fillRect(0, (i * n) / 4, n, n / 4 - 4);
    }
    speckle(60, ["#B5843F"], 20, 60);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(90, 90);
  map.anisotropy = 16;
  cache.set(key, { map, depth: new THREE.MeshDepthMaterial() });
  return map;
};

/** Vertical sky gradient. */
export const getSky = (top: string, horizon: string): THREE.CanvasTexture => {
  const key = `sky|${top}|${horizon}`;
  const hit = cache.get(key);
  if (hit) return hit.map;
  const canvas = makeCanvas(8, 512);
  const c = canvas.getContext("2d")!;
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(0.5, horizon);
  g.addColorStop(1, horizon);
  c.fillStyle = g;
  c.fillRect(0, 0, 8, 512);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, { map, depth: new THREE.MeshDepthMaterial() });
  return map;
};

export const getCloud = (): THREE.CanvasTexture => {
  const hit = cache.get("cloud");
  if (hit) return hit.map;
  const canvas = makeCanvas(512, 256);
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#FFFFFF";
  for (const [x, y, r] of [[130, 160, 70], [220, 120, 90], [320, 140, 80], [400, 170, 60], [256, 180, 90]]) { disc(c, x, y, r, r * 0.8); c.fill(); }
  c.fillRect(110, 170, 310, 50);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  cache.set("cloud", { map, depth: new THREE.MeshDepthMaterial() });
  return map;
};
