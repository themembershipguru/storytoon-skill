// Finds sound effects and background music on Openverse (openly licensed audio, no API key),
// downloads them, cleans them up, and lays them on the film's timeline.
//   npm run sounds            -> src/sounds.json, public/sfx/*, out/<id>-credits.txt
//   npm run sounds -- --fresh -> pick sounds again instead of reusing the downloaded ones
//
// Only CC0, public-domain and CC BY sounds are used. CC BY needs a credit: paste the credits
// file into the video description. Non-commercial (NC), no-derivatives (ND) and share-alike (SA)
// sounds are skipped, because a monetised short that mixes and trims them would break those terms.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fresh = process.argv.includes("--fresh");
const story = JSON.parse(fs.readFileSync(path.join(root, "story", "story.json"), "utf8"));
const sfxDir = path.join(root, "public", "sfx");
fs.mkdirSync(sfxDir, { recursive: true });
const libPath = path.join(sfxDir, "library.json");
const lib = !fresh && fs.existsSync(libPath) ? JSON.parse(fs.readFileSync(libPath, "utf8")) : {};
const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

const API = "https://api.openverse.org/v1/audio/";
const OK_LICENSES = new Set(["cc0", "pdm", "by"]);
const AUDIO_TYPES = new Set(["mp3", "mp32", "ogg", "wav", "flac", "m4a"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "sound";

// ---------- what the story needs ----------
// Automatic cues come from what is on screen. Anything can be overridden or added with
// "sfx" on a scene, "ambience" on a scene or set, and "music" on the story. See references/sound.md.
const AUTO = {
  whip: { q: "whoosh", vol: 0.45, max: 1.2 },
  flash: { q: "magic sparkle", vol: 0.5, max: 2 },
  title: { q: "pop", vol: 0.35, max: 0.8 },
  enter: { q: "pop", vol: 0.3, max: 0.8 },
  coins: { q: "coins", vol: 0.45, max: 2 },
  logs: { q: "wood thud", vol: 0.4, max: 1.2 },
  idea: { q: "ding", vol: 0.4, max: 1.5 },
  question: { q: "cartoon question", vol: 0.3, max: 1.2 },
  campfire: { q: "campfire crackling", vol: 0.22, ambient: true },
  night: { q: "crickets night", vol: 0.14, ambient: true },
};

const asList = (x) => (x === undefined || x === false ? [] : Array.isArray(x) ? x : [x]);
const cue = (base, extra) => ({ ...base, ...(typeof extra === "string" ? { q: extra } : extra) });

const cues = [];
story.scenes.forEach((scene, i) => {
  const set = scene.set ? story.sets?.[scene.set] ?? {} : {};
  const add = (c) => cues.push({ scene: i, at: 0, vol: 0.4, max: 3, ...c });
  if (scene.sound === false) return;
  const props = [...(set.props ?? []), ...(scene.props ?? [])];
  const autoOn = story.autoSfx !== false;
  if (autoOn) {
    if (i > 0 && scene.transition === "whip") add({ ...AUTO.whip, at: 0 });
    if (i > 0 && scene.transition === "flash") add({ ...AUTO.flash, at: 0 });
    if (scene.title) add({ ...AUTO.title, at: 0.1 });
    for (const a of scene.actors ?? []) {
      if (a.enter !== undefined) add({ ...AUTO.enter, at: a.enter });
      if (a.bubble === "💡") add({ ...AUTO.idea, at: (a.enter ?? 0) + 0.3 });
      if (a.bubble === "?") add({ ...AUTO.question, at: (a.enter ?? 0) + 0.3 });
    }
    for (const q of scene.props ?? []) {
      if (q.enter === undefined) continue;
      const kind = q.type === "coins" ? AUTO.coins : q.type === "logs" ? AUTO.logs : AUTO.enter;
      add({ ...kind, at: q.enter });
    }
    if (props.some((q) => q.type === "campfire")) add({ ...AUTO.campfire, at: 0 });
    else if ((scene.time ?? set.time) === "night") add({ ...AUTO.night, at: 0 });
  }
  for (const amb of asList(scene.ambience ?? set.ambience)) add(cue({ vol: 0.18, ambient: true }, amb));
  for (const s of asList(scene.sfx)) add(cue({ vol: 0.45, max: 3 }, s));
});
// at most one sound starting in the same tenth of a second per scene
const seen = new Set();
const timeline = cues.filter((c) => {
  const k = `${c.scene}|${Math.round(c.at * 10)}|${c.ambient ? "a" : "s"}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const musicSpec = story.music === false ? null : cue({ q: "acoustic", vol: 0.18 }, story.music ?? {});

// ---------- Openverse ----------
const search = async (q, music) => {
  const params = new URLSearchParams({ q, license: "cc0,by,pdm", page_size: "20", source: music ? "jamendo" : "freesound" });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}?${params}`, { headers: { "User-Agent": "storytoon-skill/1.0", Accept: "application/json" } });
    if (res.status === 429) { await sleep(4000 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`Openverse said ${res.status} for "${q}"`);
    return (await res.json()).results ?? [];
  }
  throw new Error("Openverse is rate-limiting us. Wait a minute and run this again.");
};

const fits = (r, music, ambient) => {
  const sec = (r.duration ?? 0) / 1000;
  if (!OK_LICENSES.has(r.license) || !AUDIO_TYPES.has(r.filetype ?? "mp3") || r.mature) return false;
  if (music) return sec >= 60 && sec <= 420;
  if (ambient) return sec >= 8 && sec <= 300;
  return sec >= 0.15 && sec <= 8;
};

const clean = (raw, out, { music, ambient, max }) => {
  if (!hasFfmpeg) { fs.copyFileSync(raw, out); return; }
  const filters = music
    ? ["silenceremove=start_periods=1:start_threshold=-40dB", "loudnorm=I=-18:TP=-2"]
    : ambient
    ? ["loudnorm=I=-18:TP=-2"]
    : ["silenceremove=start_periods=1:start_threshold=-45dB", "loudnorm=I=-16:TP=-1.5", "areverse", "afade=t=in:d=0.12", "areverse"];
  const limit = music ? 300 : ambient ? 60 : Math.max(0.3, max ?? 3);
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-t", String(limit), "-af", filters.join(","), "-ar", "44100", "-ac", "2", "-b:a", "160k", out]);
  if (r.status !== 0) throw new Error(`ffmpeg could not read ${path.basename(raw)}`);
};

const fetchSound = async (spec, music = false) => {
  const key = `${music ? "music" : spec.ambient ? "amb" : "sfx"}|${spec.q}|${spec.pick ?? 1}`;
  const known = lib[key];
  if (known && fs.existsSync(path.join(sfxDir, known.file))) return known;
  // phrases often match nothing (especially music), so fall back to single words
  const words = spec.q.split(/\s+/).filter((w) => w.length > 2);
  const attempts = [spec.q, ...(words.length > 1 ? [...words].reverse() : [])];
  let results = [];
  for (const q of attempts) {
    results = (await search(q, music)).filter((r) => fits(r, music, spec.ambient));
    if (results.length) break;
    await sleep(300);
  }
  const tryList = results.slice((spec.pick ?? 1) - 1);
  for (const r of tryList) {
    const file = `${music ? "music" : spec.ambient ? "amb" : "sfx"}-${slug(spec.q)}-${spec.pick ?? 1}.mp3`;
    const raw = path.join(sfxDir, `.raw-${r.id}`);
    try {
      const res = await fetch(r.url, { headers: { "User-Agent": "storytoon-skill/1.0" }, redirect: "follow" });
      if (!res.ok) continue;
      fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
      clean(raw, path.join(sfxDir, file), { music, ambient: spec.ambient, max: spec.max });
      const entry = {
        file,
        title: r.title,
        creator: r.creator || "unknown",
        license: r.license === "pdm" ? "Public Domain" : r.license === "cc0" ? "CC0" : `CC ${r.license.toUpperCase()}${r.license_version ? " " + r.license_version : ""}`,
        needsCredit: r.license === "by",
        page: r.foreign_landing_url,
        source: r.source,
      };
      lib[key] = entry;
      return entry;
    } catch {
      // dead link or unreadable file: try the next result
    } finally {
      fs.rmSync(raw, { force: true });
    }
  }
  return null;
};

// ---------- run ----------
const used = new Map();
const out = { music: null, cues: [] };
const missing = [];

if (musicSpec) {
  process.stdout.write(`music: "${musicSpec.q}" ... `);
  const m = await fetchSound(musicSpec, true);
  if (m) { out.music = { file: `sfx/${m.file}`, vol: musicSpec.vol }; used.set(m.file, m); console.log(m.title); }
  else { console.log("nothing usable found"); missing.push(`music "${musicSpec.q}"`); }
}
const queries = [...new Map(timeline.map((c) => [`${c.ambient ? "a" : "s"}|${c.q}|${c.pick ?? 1}`, c])).values()];
const got = new Map();
for (const c of queries) {
  process.stdout.write(`${c.ambient ? "ambience" : "sfx"}: "${c.q}" ... `);
  const s = await fetchSound(c);
  got.set(`${c.ambient ? "a" : "s"}|${c.q}|${c.pick ?? 1}`, s);
  console.log(s ? s.title : "nothing usable found");
  if (!s) missing.push(`"${c.q}"`);
  await sleep(300);
}
for (const c of timeline) {
  const s = got.get(`${c.ambient ? "a" : "s"}|${c.q}|${c.pick ?? 1}`);
  if (!s) continue;
  used.set(s.file, s);
  out.cues.push({ scene: c.scene, at: c.at, file: `sfx/${s.file}`, vol: c.vol, ...(c.ambient ? { ambient: true } : { max: c.max }) });
}

fs.writeFileSync(libPath, JSON.stringify(lib, null, 1));
fs.writeFileSync(path.join(root, "src", "sounds.json"), JSON.stringify(out, null, 1));

const lines = [...used.values()].map((s) => `"${s.title}" by ${s.creator}, ${s.license}${s.needsCredit ? "" : " (no credit required)"} - ${s.page}`);
fs.mkdirSync(path.join(root, "out"), { recursive: true });
const credits = path.join(root, "out", `${story.id || "story"}-credits.txt`);
fs.writeFileSync(credits, ["Sounds and music via Openverse (openverse.org):", ...lines, ""].join("\n"));
console.log(`\n${out.cues.length} sound cues${out.music ? " + music" : ""}. Credits: ${path.relative(root, credits)} (put the CC BY lines in the video description).`);
if (missing.length) console.log(`Not found: ${missing.join(", ")}. Try other words for those in story.json.`);
if (!hasFfmpeg) console.log("ffmpeg not found: sounds were used as downloaded (no trimming or volume levelling).");
