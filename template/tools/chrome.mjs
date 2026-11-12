// Shared browser settings for check + render.
// By default the tools use the Chrome (or Edge, Chromium) already installed on this computer:
// Remotion's own downloaded browser can stall for minutes on some machines instead of failing.
// BROWSER_EXECUTABLE: use this browser instead.
// STORYTOON_BUNDLED=1: use Remotion's own browser (downloads it on first run).
// STORYTOON_GL: "angle" (default; macOS/Windows) or "swangle" (Linux servers without a GPU).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const home = os.homedir();
const KNOWN = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  path.join(home, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export const gl = () => (process.env.STORYTOON_GL === "swangle" ? "swangle" : "angle");

/** The browser to render with, or null to let Remotion use (and download) its own. */
export const browser = () => {
  if (process.env.BROWSER_EXECUTABLE) return process.env.BROWSER_EXECUTABLE;
  if (process.env.STORYTOON_BUNDLED) return null;
  return KNOWN.find((p) => p && fs.existsSync(p)) ?? null;
};

export const chromeOptions = () => {
  const browserExecutable = browser();
  if (!browserExecutable) console.log("No installed Chrome found: using Remotion's own browser (first run downloads it, which can take a few minutes).");
  return { chromiumOptions: { gl: gl() }, ...(browserExecutable ? { browserExecutable } : {}) };
};

// Another app may already sit on port 3000 in a way Remotion does not notice, so we pick a port
// nothing answers on. Set STORYTOON_PORT to force one.
import net from "node:net";
const answers = (port) =>
  new Promise((resolve) => {
    const s = net.connect({ port, host: "localhost" });
    s.setTimeout(400);
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("timeout", () => { s.destroy(); resolve(false); });
    s.once("error", () => resolve(false));
  });
export const freePort = async () => {
  if (process.env.STORYTOON_PORT) return Number(process.env.STORYTOON_PORT);
  for (let port = 3187; port < 3287; port++) if (!(await answers(port))) return port;
  return 3187;
};
