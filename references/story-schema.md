# `story/story.json` reference

Coordinates: positions are `[x, z]` on the ground, in units where a character is about 1.65 tall. `+x` is screen right. `+z` is towards the default camera, so a bigger z is closer to the viewer. The centre of the stage is `[0, 0]`.

## Top level

```json
{
  "id": "two-woodcutters",
  "style": "toon",
  "title": "The Two Woodcutters",
  "voice": "en-US-AndrewMultilingualNeural",
  "rate": "+6%",
  "captions": { "y": 0.68, "size": 84, "highlight": "#FFD23F", "maxWords": 2 },
  "cast": { "bram": { ... }, "odo": { ... } },
  "sets": { "forest": { "ground": "grass", "props": [ ... ] } },
  "scenes": [ ... ]
}
```

`id` names the output file. `watermark` puts a small channel name on screen the whole time: `"watermark": "MyChannel"` or `{ "text": "MyChannel", "position": "top-right", "opacity": 0.6 }` (positions: `top-left`, `top-right`, `bottom-left`). `music` and `autoSfx` control sound (see `sound.md`); scenes and sets also take `sfx` and `ambience`. `style` is `toon`, `paper`, `whiteboard`, `lowpoly`, `pixel` or a custom name (see `styles.md`). `captions` is optional. `pitch` (for example `"-4Hz"`) is optional.

## Cast

```json
"bram": { "skin": "#E8B88A", "outfit": "#D9534F", "hair": "spiky", "hairColor": "#5A3A22", "hat": "none", "extra": "beard" }
```

| Field | Values |
|---|---|
| `kind` | `person` (default), `owl` (the teacher; uses `outfit` as feather colour, supports `hat` and `extra: "glasses"`) |
| `skin`, `outfit`, `hairColor`, `hatColor` | any hex colour |
| `hair` | `short` (default), `bowl`, `bun`, `spiky`, `curly`, `long`, `none` |
| `hat` | `none`, `cap`, `beanie`, `tophat`, `straw`, `crown` |
| `extra` | `none`, `glasses`, `moustache`, `beard`, `freckles`, `blush` |

Make every character different in at least outfit colour and one head feature.

## Sets

A set is shared scenery: `{ "ground": ..., "time": ..., "props": [ ... ] }`. A scene uses it with `"set": "forest"` and can add its own `props` on top and override `time` or `ground`.

`ground`: `grass`, `cobble`, `sand`, `wood`, `snow`, `soil`. `time`: `day`, `sunset`, `night`.

## Scene

```json
{
  "say": "Odo's pile was almost *twice as big.*",
  "set": "forest",
  "time": "sunset",
  "title": "optional big headline",
  "transition": "whip",
  "camera": { "shot": "medium", "on": "odo", "move": "push", "angle": 10, "zoom": 1 },
  "actors": [ { "who": "odo", "at": [1.5, 0], "face": "joy", "act": "hop" } ],
  "props": [ { "type": "logs", "at": [0, 0.4], "count": 15, "enter": 0.5 } ],
  "hold": 0.4
}
```

- `say`: the narration for this scene. Words inside `*stars*` are highlighted in the captions. The scene lasts as long as the line takes to speak.
- `transition`: how this scene starts: `cut` (default), `whip` (fast blur), `flash` (white flash, good for the turn).
- `hold`: extra silent seconds after the line.
- `voice`: a different voice just for this line.

### Camera

| Field | Values |
|---|---|
| `shot` | `wide` (whole place), `medium` (default, 1 to 3 people), `close` (one face), `top` (from above; good for comparing piles or crowds), `low` (from the ground looking up; makes the subject look big) |
| `on` | an actor key, or a ground point `[x, z]`. Default: the middle of the actors. |
| `move` | `static` (default, slight drift), `push` (move in), `pull` (move out), `orbit` (swing around), `pan` (slide sideways), `rise` (lift up) |
| `angle` | degrees around the subject. 0 is from the front, 90 from the right, -90 from the left. |
| `zoom` | distance multiplier. 0.8 is closer, 1.5 is further. |

Width you can see at the subject: about 2.3 units in `close`, 4.5 in `medium`, 10 in `wide`. Multiply by `zoom`.

### Actors

| Field | Values |
|---|---|
| `who` | a key from `cast` |
| `at` | `[x, z]` |
| `face` | `neutral`, `happy`, `joy`, `sad`, `shocked`, `angry`, `smug`, `think`, `sleepy`, `worried` |
| `act` | `idle` (default), `talk` (mouth moves with the narration), `hop`, `cheer` (hop with arms up), `walk` (needs `to: [x, z]`), `shake` (fear or cold), `work` (rhythmic swing: chopping, digging, hammering), `sleep`, `nod` |
| `pose` | `down` (default), `up`, `point`, `hips`, `hold` |
| `hold` | one emoji in the hand: `"🪓"`, `"💰"`, `"📱"` |
| `bubble` | emoji or short text above the head: `"💡"`, `"?"`, `"!"`, `"💤"` |
| `flip` | `true` mirrors the character (use it for whoever stands on the right, so two people face each other) |
| `scale` | 1 is normal. 0.7 for a child, 1.2 for a giant. |
| `enter` | seconds into the scene when the actor pops in |

Give the speaker `act: "talk"` when a line is dialogue.

### Props

Every prop takes `at`, and optionally `rot` (degrees), `scale`, `color`, `y` (height above ground) and `enter` (seconds into the scene when it pops in).

| `type` | What it is | Extra fields |
|---|---|---|
| `house` | cottage with a roof | `color` walls, `color2` roof, `w` `h` `d` |
| `tower` | tall building with windows | `h`, `color`, `color2` |
| `tree`, `pine`, `bush`, `rock`, `stump` | nature | `color` |
| `mountain` | far backdrop; place it at z -100 or further | `w`, `h` |
| `logs` | stacked pile | `count`, `len` |
| `coins` | gold coin stacks | `count` |
| `crate` | wooden box | `color` |
| `stall` | market stall with striped roof | `color` |
| `fence` | | `len`, `color` |
| `lamp` | street lamp, lights up at sunset and night | |
| `campfire` | flickers and lights the scene | |
| `board` | chalkboard on an easel; lines appear one by one | `lines: ["2 = 🥚", "3 = 🐔"]` |
| `sign` | wooden signpost | `text` |
| `field` | farm plot with rows | `w`, `d`, `color` soil, `color2` crop |
| `road` | flat strip | `w`, `d`, `color`, `rot` |
| `pond` | water with a sandy rim. 6 or wider gets rolling waves, foam and sparkles; pair it with a waves `ambience` | `w`, `color`, `waves: false` for still water |
| `block`, `ball`, `pillar` | plain shapes for anything else | `w`, `h`, `d`, `color` |
| `emoji` | any emoji or short word as a standing card | `emoji: "🐄"`, `float: true` to hover, `y` |

The `emoji` prop is the escape hatch: animals, food, tools, vehicles and money all exist as emoji. Scale them (`"scale": 1.5`) to match the characters.

Scatter many copies with one entry:

```json
{ "type": "tree", "scatter": { "count": 16, "area": [-16, -20, 16, -6], "seed": 4 } }
```

`area` is `[x0, z0, x1, z1]`. Keep scattered scenery behind the action (z below -4) or to the sides, so it never hides an actor. Change `seed` for a different layout.

An unknown `type` renders as a bright pink cube so you notice it in the check stills.

## Staging tips

- Two people talking: `x` of -1.3 and 1.3, the right one with `flip: true`, medium shot.
- Comparing two results: put them side by side and use `top` or a medium shot with `zoom` 1.5.
- A crowd: 5 to 8 actors in two rows (z of 0 and -1.2), wide shot. You can reuse the same cast key several times.
- The lesson scene: `board` slightly behind centre, the `owl` in front and to the left with `pose: "point"` and `act: "talk"`, `ground: "cobble"`, medium shot.
- Time passing: same staging, change `time`, and change a `count`.
