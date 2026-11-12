import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// The 3D world needs WebGL. "angle" works on macOS and Windows; on Linux servers use "swangle".
Config.setChromiumOpenGlRenderer(process.env.STORYTOON_GL === "swangle" ? "swangle" : "angle");
