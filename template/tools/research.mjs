// Finds short videos in a niche that already have big view counts, with transcripts, so the
// patterns behind them can be studied before writing an original story.
//   npm run research -- "personal finance"
//   npm run research -- "stoic lessons" --min-views 500000 --max 10 --lang en
// Output: out/research/<niche>.md and .json. Uses yt-dlp, no API key.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [niche, ...rest] = process.argv.slice(2);
if (!niche || niche.startsWith("--")) { console.error('Usage: npm run research -- "<niche>" [--min-views 1000000] [--max 8] [--max-seconds 180] [--lang en] [--tags money,investing]'); process.exit(1); }

const win = process.platform === "win32";
const venvPy = path.join(root, ".venv", win ? "Scripts/python.exe" : "bin/python");
const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: root, encoding: "utf8", ...opts });

if (!fs.existsSync(venvPy)) {
  const py = ["python3", "python"].find((p) => sh(p, ["--version"]).status === 0);
  if (!py) { console.error("Python 3 is needed for research. Install it from python.org, then run this again."); process.exit(1); }
  if (sh(py, ["-m", "venv", ".venv"], { stdio: "inherit" }).status !== 0) process.exit(1);
}
// yt-dlp must stay current: YouTube changes often and old versions stop working.
if (sh(venvPy, ["-c", "import yt_dlp"]).status !== 0 || process.env.STORYTOON_UPDATE) {
  console.log("Installing the research tool (yt-dlp)...");
  if (sh(venvPy, ["-m", "pip", "install", "-q", "-U", "yt-dlp"], { stdio: "inherit" }).status !== 0) process.exit(1);
}

const slug = niche.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "niche";
const out = path.join("out", "research", slug);
console.log(`Searching YouTube for "${niche}"... (about a minute)`);
const r = sh(venvPy, [path.join("tools", "research.py"), niche, "--out", out, ...rest], { stdio: "inherit" });
if (r.status !== 0) { console.error("\nResearch failed. If YouTube changed something, update the tool: STORYTOON_UPDATE=1 npm run research -- \"" + niche + "\""); process.exit(1); }
console.log(`\nSaved: ${out}.md and ${out}.json`);
