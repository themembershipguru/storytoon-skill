// Renders the film to out/<story id>.mp4.   npm run render
// Uses the Chrome installed on this computer when there is one (see tools/chrome.mjs).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browser, freePort, gl } from "./chrome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const story = JSON.parse(fs.readFileSync(path.join(root, "story", "story.json"), "utf8"));
const out = process.argv[2] || `out/${story.id || "story"}.mp4`;
fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });

const port = await freePort();
const run = (browser) =>
  spawnSync("npx", ["remotion", "render", "src/index.ts", "Story", out, "--crf=18", `--gl=${gl()}`, `--port=${port}`, ...(browser ? [`--browser-executable=${browser}`] : [])], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });

const chrome = browser();
if (!chrome) console.log("No installed Chrome found: using Remotion's own browser (first run downloads it, which can take a few minutes).");
const r = run(chrome);
if (r.status === 0) console.log(`\nDone: ${out}`);
process.exit(r.status ?? 1);
