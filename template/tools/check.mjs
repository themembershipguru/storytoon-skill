// Renders one small still per scene into out/check/ so the visuals can be LOOKED at before a full render.
//   npm run check            -> every scene
//   npm run check -- 3 7     -> only scenes 3 and 7
//   npm run check -- --style paper 1 5   -> preview another style without editing the story
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromeOptions, freePort } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const si = args.indexOf("--style");
const styleOverride = si >= 0 ? args[si + 1] : undefined; // try a style without editing the story
if (si >= 0) args.splice(si, 2);
const only = args.map(Number).filter(Boolean);
const inputProps = styleOverride ? { styleOverride } : {};
const outDir = path.join(root, "out", "check");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });
const opts = { ...chromeOptions(), port: await freePort() };
const composition = await selectComposition({ serveUrl, id: "Story", inputProps, ...opts });
const marks = composition.props.marks.filter((m) => !only.length || only.includes(m.scene));

for (const m of marks) {
  const output = path.join(outDir, `scene-${String(m.scene).padStart(2, "0")}.png`);
  await renderStill({ composition, serveUrl, output, frame: m.frame, scale: 0.4, inputProps, ...opts });
  console.log(`scene ${m.scene} (frame ${m.frame}) -> ${path.relative(root, output)}`);
}
console.log(`\n${marks.length} stills in out/check. Total length: ${(composition.durationInFrames / composition.fps).toFixed(1)} s.`);
process.exit(0);
