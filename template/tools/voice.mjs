// Makes the narration (free, no API key) and the caption timing.   npm run voice
// Output: public/audio/sNN.mp3 + src/timing.json
// First run creates a small Python environment in .venv and installs edge-tts into it.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const story = JSON.parse(fs.readFileSync(path.join(root, "story", "story.json"), "utf8"));
const win = process.platform === "win32";
const venvPy = path.join(root, ".venv", win ? "Scripts/python.exe" : "bin/python");

const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 26, ...opts });

if (!fs.existsSync(venvPy)) {
  const py = ["python3", "python"].find((p) => sh(p, ["--version"]).status === 0);
  if (!py) { console.error("Python 3 is needed for the free voice. Install it from python.org, then run this again."); process.exit(1); }
  console.log("Setting up the voice tool (one time)...");
  if (sh(py, ["-m", "venv", ".venv"], { stdio: "inherit" }).status !== 0) process.exit(1);
  if (sh(venvPy, ["-m", "pip", "install", "-q", "edge-tts"], { stdio: "inherit" }).status !== 0) process.exit(1);
}

// "*twice* as big." -> spoken text has no stars; display tokens keep the highlight flag
const tokens = (say) => {
  const out = [];
  let hl = false;
  for (const raw of say.split(/\s+/).filter(Boolean)) {
    if (raw.startsWith("*")) hl = true;
    const w = raw.replace(/\*/g, "");
    if (w) out.push({ w, hl });
    if (/\*[.,!?;:…"']*$/.test(raw) && raw.length > 1) hl = false;
  }
  return out;
};

const audioDir = path.join(root, "public", "audio");
fs.mkdirSync(audioDir, { recursive: true });
for (const f of fs.readdirSync(audioDir)) if (f.endsWith(".mp3")) fs.unlinkSync(path.join(audioDir, f));

const voice = story.voice || "en-US-AndrewMultilingualNeural";
const lines = story.scenes.map((s, i) => ({
  text: tokens(s.say).map((t) => t.w).join(" "),
  voice: s.voice || voice,
  out: path.join(audioDir, `s${String(i + 1).padStart(2, "0")}.mp3`),
}));
const job = path.join(root, "tools", ".tmp-voice-job.json");
fs.writeFileSync(job, JSON.stringify({ lines, rate: story.rate || "+0%", pitch: story.pitch || "+0Hz" }));
console.log(`Voice: ${voice}, ${lines.length} lines...`);
const r = sh(venvPy, [path.join("tools", "tts.py"), job]);
fs.rmSync(job, { force: true });
if (r.status !== 0) { console.error(r.stderr || r.stdout); console.error("\nVoice failed. Check the internet connection and the voice name (list: .venv/bin/edge-tts --list-voices)."); process.exit(1); }
const results = JSON.parse(r.stdout.trim().split("\n").pop());

// The voice service reports its own word list (it may split or merge words differently from the
// captions), so caption words are placed by their position in the text, not by index.
const scenes = story.scenes.map((s, i) => {
  const toks = tokens(s.say);
  const spoken = results[i].words;
  const last = spoken[spoken.length - 1];
  const dur = Math.max(results[i].bytes / 6000, last ? last.t + last.d + 0.15 : 0); // 48 kbit/s mp3 = 6000 bytes per second
  const marks = [];
  let chars = 0;
  for (const w of spoken) { marks.push([chars, w.t]); chars += w.w.length; }
  marks.push([Math.max(chars, 1), last ? last.t + last.d : dur]);
  const total = toks.reduce((n, t) => n + t.w.replace(/[^\p{L}\p{N}]/gu, "").length, 0) || 1;
  let seen = 0;
  const words = toks.map((t) => {
    const at = (seen / total) * chars;
    seen += t.w.replace(/[^\p{L}\p{N}]/gu, "").length;
    let k = 0;
    while (k < marks.length - 2 && marks[k + 1][0] <= at) k++;
    const [c0, t0] = marks[k];
    const [c1, t1] = marks[k + 1];
    const time = spoken.length ? t0 + ((at - c0) / Math.max(1, c1 - c0)) * (t1 - t0) : (seen / total) * dur;
    return { w: t.w, t: Math.round(time * 1000) / 1000, hl: t.hl };
  });
  return { say: s.say, dur: Math.round(dur * 1000) / 1000, words, audio: `audio/s${String(i + 1).padStart(2, "0")}.mp3` };
});

const music = fs.existsSync(path.join(root, "public", "music.mp3"));
fs.writeFileSync(path.join(root, "src", "timing.json"), JSON.stringify({ voiced: true, music, scenes }, null, 1));
const total = scenes.reduce((n, s) => n + s.dur + 0.22, 0);
console.log(`Done. ${scenes.length} lines, about ${total.toFixed(1)} s. ${music ? "Music: public/music.mp3" : "No music (put a file at public/music.mp3 to add one)."}`);
