import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { buildSlots, FPS, HEIGHT, WIDTH } from "./engine/timing";
import type { Story, Timing } from "./engine/types";
import storyJson from "../story/story.json";
import timingJson from "./timing.json";

const story = storyJson as unknown as Story;
const timing = timingJson as unknown as Timing;

export const Root: React.FC = () => {
  const { slots, total } = buildSlots(story, timing);
  return (
    <Composition
      id="Story"
      component={Film as unknown as React.FC<Record<string, unknown>>}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      durationInFrames={total}
      // `marks` lets tools/check.mjs find one frame per scene without re-doing the maths
      defaultProps={{ story, timing, marks: slots.map((s) => ({ scene: s.index + 1, frame: s.from + Math.floor(s.frames * 0.6) })) }}
    />
  );
};
