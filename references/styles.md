# Styles

The same `story.json` can be rendered in different looks. Set it with one line at the top of the story:

```json
"style": "paper"
```

## Built-in styles

| Name | Look | Good for |
|---|---|---|
| `toon` (default) | ink-outlined 2D characters in a textured 3D world | fables, money and career stories |
| `paper` | cut-paper characters with white edges, soft matte props, muted colours, paper grain | gentle stories, kids, history, wellbeing |
| `whiteboard` | black marker drawings on white, pale colour washes, marker captions | explainers, how-it-works, business ideas |
| `lowpoly` | everything is real 3D, chunky faceted characters and props | games-like energy, tech, action |
| `pixel` | toon world rendered as chunky pixels with a pixel font | nostalgia, gaming, internet culture |

Try a style without editing the story:

```
npm run check -- --style whiteboard 1 5 9
npm run render -- --style pixel
```

Always look at the stills after changing style. Things to watch:

- `whiteboard` ignores most colour, so characters must differ by hair, hat and glasses, not by outfit colour.
- `lowpoly` characters have simpler faces. Lean on `bubble`, `pose` and `act` to show feelings.
- `pixel` loses small details. Prefer `close` and `medium` shots, and keep board text to very short lines.
- `paper` is soft. Use `*highlight*` words and titles to keep energy up.

## Inventing your own style

A custom style has a name, a `base` to start from, and any settings you want to change. Put it in `styles/custom.json` to reuse it in every story, or under `"styles"` inside one story.

```json
{
  "neon-night": {
    "base": "toon",
    "ink": "#0B0B1E",
    "colors": { "mix": "#FF3DCB", "amount": 0.06, "saturation": 1.35 },
    "sky": { "day": ["#1B0F4A", "#FF5FA2"], "night": ["#05051A", "#3A1C8C"] },
    "evenLight": true,
    "post": { "saturate": 1.25, "contrast": 1.1, "vignette": 0.4 },
    "captions": { "highlight": "#3DF5FF" },
    "titleColor": "#3DF5FF"
  }
}
```

Then use it by name: `"style": "neon-night"`. A custom style can also use another custom style as its `base`.

When a user describes a look in words ("old newspaper", "candy pastel", "horror", "my brand colours"), turn it into settings like this, name it, save it in `styles/custom.json`, render two or three stills with `--style <name>`, look at them, and adjust before using it for a full film.

### Every setting

| Setting | Values | What it does |
|---|---|---|
| `base` | any built-in or custom style name | where the other settings come from |
| `characters` | `outline`, `paper`, `sketch`, `lowpoly` | how people are drawn: ink cartoon, cut paper, marker drawing with white fill, or real 3D |
| `ink` | colour | line colour for characters and prop outlines |
| `line` | number, 1 = normal | character line thickness |
| `props` | `toon`, `matte`, `flat`, `faceted` | prop shading: two-tone cartoon, soft, no shading, low-poly facets |
| `outline` | number, 0 = none | prop outline thickness |
| `shadows` | true / false | real cast shadows |
| `colors.mix`, `colors.amount` | colour, 0 to 1 | pushes every colour towards one colour. 0.1 gives a gentle tint, 0.8 is almost monochrome |
| `colors.saturation` | number, 1 = normal | 0 is grey, 1.4 is vivid |
| `ground` | `textured`, `plain` | drawn tiles and grass, or flat colour |
| `groundColor` | colour | one ground colour for every scene (plain ground only) |
| `sky.day`, `sky.sunset`, `sky.night` | `[top, horizon]` colours | sky gradient for each time of day |
| `evenLight` | true / false | true stops sunset and night from tinting the characters |
| `fog`, `clouds` | true / false | distance haze, clouds |
| `pixel` | 0, or 4 to 10 | pixel block size. 6 is the built-in pixel look, 10 is very chunky |
| `posterize` | 0, or 3 to 12 | limits colour steps for a retro palette. Lower is harsher |
| `post.saturate`, `post.contrast` | number, 1 = normal | final colour grade |
| `post.grain` | 0 to 1 | paper grain over the picture |
| `post.vignette` | 0 to 0.6 | dark corners |
| `captions.font` | `round`, `marker`, `pixel` | caption and title typeface |
| `captions.color`, `captions.stroke`, `captions.highlight` | colours | caption text, its outline, and the highlighted words |
| `captions.size` | number, 1 = normal | caption scale |
| `captions.uppercase` | true / false | all caps |
| `titleColor` | colour | big headline colour, also used for text bubbles like "?" |

### Recipes

- Monochrome with one accent: `colors.saturation` 0, then give the hero an emoji or a title in the accent colour.
- Brand look: `colors.mix` the brand colour at 0.1, `titleColor` and `captions.highlight` the brand accent, `sky.day` in brand tints.
- Night-only mood: set all three `sky` entries dark and `evenLight` false so characters stay tinted.
- Storybook: `base` `paper`, `post.grain` 0.7, warm `colors.mix` like `#F2DDB8` at 0.2.
- Chunkier retro: `base` `pixel`, `pixel` 9, `posterize` 5.

What a style cannot change: the shapes of the characters and props, and the animation. Those live in `src/engine/` and need code.
