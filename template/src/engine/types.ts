// The whole film is described by story/story.json. These types are that file's shape.

export type Vec2 = [number, number]; // [x, z] on the ground. +x is screen right, +z is towards the default camera.

export type Face = "neutral" | "happy" | "joy" | "sad" | "shocked" | "angry" | "smug" | "think" | "sleepy" | "worried";
export type Pose = "down" | "up" | "point" | "hips" | "hold";
export type Act = "idle" | "talk" | "hop" | "walk" | "shake" | "cheer" | "sleep" | "work" | "nod";
export type TimeOfDay = "day" | "sunset" | "night";
export type GroundKind = "cobble" | "grass" | "sand" | "wood" | "snow" | "soil";

export type CastSpec = {
  kind?: "person" | "owl";
  skin?: string;
  outfit?: string;
  hair?: "none" | "short" | "bowl" | "bun" | "spiky" | "curly" | "long";
  hairColor?: string;
  hat?: "none" | "cap" | "beanie" | "tophat" | "straw" | "crown";
  hatColor?: string;
  extra?: "none" | "glasses" | "moustache" | "beard" | "freckles" | "blush";
};

export type ActorSpec = {
  who: string; // key in story.cast
  at: Vec2;
  to?: Vec2; // with act "walk": walks from `at` to `to` during the scene
  face?: Face;
  act?: Act;
  pose?: Pose;
  hold?: string; // one emoji in the hand, e.g. "🪓"
  bubble?: string; // emoji or short text above the head, e.g. "💡" or "?"
  scale?: number;
  flip?: boolean;
  enter?: number; // seconds into the scene when the actor pops in
};

export type PropSpec = {
  type: string; // see references/story-schema.md for the list
  at?: Vec2;
  y?: number;
  rot?: number; // degrees around the vertical axis
  scale?: number;
  color?: string;
  color2?: string;
  count?: number;
  w?: number;
  h?: number;
  d?: number;
  len?: number;
  text?: string;
  lines?: string[];
  emoji?: string;
  float?: boolean;
  enter?: number;
  scatter?: { count: number; area: [number, number, number, number]; seed?: number };
};

export type CameraSpec = {
  shot?: "wide" | "medium" | "close" | "top" | "low";
  on?: string | Vec2; // actor key or a ground point
  angle?: number; // degrees; 0 looks from the front, 90 from the right side
  move?: "static" | "push" | "pull" | "orbit" | "pan" | "rise";
  zoom?: number; // 1 = default distance, 0.8 = closer
};

export type SetSpec = { ground?: GroundKind; time?: TimeOfDay; props?: PropSpec[] };

export type SceneSpec = {
  say: string; // narration. *stars* mark highlighted caption words.
  set?: string; // key in story.sets
  ground?: GroundKind;
  time?: TimeOfDay;
  camera?: CameraSpec;
  actors?: ActorSpec[];
  props?: PropSpec[];
  title?: string; // big headline at the top for this scene
  transition?: "cut" | "whip" | "flash"; // how this scene starts
  voice?: string; // overrides story.voice for this line
  hold?: number; // extra seconds of silence after the line
};

export type Story = {
  id: string;
  title?: string;
  voice?: string;
  rate?: string;
  pitch?: string;
  captions?: { y?: number; size?: number; highlight?: string; maxWords?: number };
  cast: Record<string, CastSpec>;
  sets?: Record<string, SetSpec>;
  scenes: SceneSpec[];
};

export type Word = { w: string; t: number; hl: boolean };
export type SceneTiming = { say: string; dur: number; words: Word[]; audio?: string };
export type Timing = { voiced: boolean; music: boolean; scenes: SceneTiming[] };
