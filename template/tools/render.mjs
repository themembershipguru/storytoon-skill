// Renders the film to out/<story id>.mp4.   npm run render
// Uses the Chrome installed on this computer when there is one (see tools/chrome.mjs).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browser, freePort, gl } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const story = JSON.parse(fs.readFileSync(path.join(root, "story", "story.json"), "utf8"));
const args = process.argv.slice(2);
const si = args.indexOf("--style"); // npm run render -- --style pixel
const styleOverride = si >= 0 ? args[si + 1] : undefined;
if (si >= 0) args.splice(si, 2);
const out = args[0] || `out/${story.id || "story"}${styleOverride ? "-" + styleOverride : ""}.mp4`;
const propsFile = path.join(root, "tools", ".tmp-props.json");
if (styleOverride) fs.writeFileSync(propsFile, JSON.stringify({ styleOverride }));
fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });

const port = await freePort();
const run = (browser) =>
  spawnSync("npx", ["remotion", "render", "src/index.ts", "Story", out, "--crf=18", `--gl=${gl()}`, `--port=${port}`, ...(styleOverride ? [`--props=${propsFile}`] : []), ...(browser ? [`--browser-executable=${browser}`] : [])], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });

const chrome = browser();
if (!chrome) console.log("No installed Chrome found: using Remotion's own browser (first run downloads it, which can take a few minutes).");
const r = run(chrome);
fs.rmSync(propsFile, { force: true });
// Shorts, Reels and TikTok play at about -14 LUFS; level the final mix to match so it is not quieter than the feed.
if (r.status === 0 && spawnSync("ffmpeg", ["-version"]).status === 0) {
  const tmp = path.join(root, out.replace(/\.mp4$/, ".tmp.mp4"));
  const n = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(root, out), "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", tmp]);
  if (n.status === 0) fs.renameSync(tmp, path.join(root, out));
  else { fs.rmSync(tmp, { force: true }); console.log("Loudness levelling skipped (ffmpeg failed); the video is fine but may be quieter than others."); }
}
if (r.status === 0) console.log(`\nDone: ${out}`);
process.exit(r.status ?? 1);
