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
| `lineart` | pure black line drawing on off-white, no colour at all | calm, minimal, quotes and philosophy |
| `chalkboard` | chalk lines on a green board, muted chalk colours, chalk-dust grain | lessons, school, "the rule is..." videos |
| `gold` | thin gold lines on deep navy, serif captions | luxury, wealth, wisdom, spiritual stories |
| `comic` | thick ink, punchy colours, halftone dots, captions in yellow comic boxes | drama, twists, action |
| `flatvector` | no outlines, flat colour shapes, clean sky | explainers, brand-friendly content |
| `ps2` | low-poly 3D at low resolution with jagged edges and a muted palette | early-2000s game nostalgia |
| `cgi` | smooth, glossy 3D characters and props, soft shading | the closest to an animated-film look |
| `clay` | smooth, matte 3D like modelling clay, soft pastel colours, a little grain | cosy, kids, feel-good stories |
| `bricks` | blocky toy figures, shiny plastic, studs on blocks and a studded baseplate ground | playful, building and growth stories |
| `orbit` | dark navy everywhere (ignores time of day), smooth glossy characters, white captions with cyan highlights, no outlines; works with the space tools below | tech, AI, startups, space, "what if" explainers |

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
- `lineart`, `chalkboard` and `gold` mostly remove colour too. Same advice as whiteboard: tell characters apart by their heads.
- The 3D styles (`lowpoly`, `ps2`, `cgi`, `clay`, `bricks`) all use the same simpler 3D faces. `bricks` figures are original blocky toys, not any brand's.

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
| `characters` | `outline`, `paper`, `sketch`, `lowpoly`, `smooth`, `brick` | how people are drawn: ink cartoon, cut paper, line drawing, or real 3D (faceted, smooth, blocky toy) |
| `ink` | colour | line colour for characters and prop outlines. `"rgba(0,0,0,0)"` hides outlines |
| `features` | colour | colour of eyes, mouths and brows (default: same as `ink`) |
| `sketchFill`, `sketchHair` | colours | `sketch` characters only: face fill and hair fill |
| `line` | number, 1 = normal | character line thickness |
| `props` | `toon`, `matte`, `flat`, `faceted`, `soft`, `plastic` | prop shading: two-tone cartoon, paper-soft, none, low-poly facets, smooth 3D, shiny toy plastic |
| `roughness` | 0.2 to 1 | `smooth` characters and `soft` props: 0.2 is glossy, 1 is dull clay |
| `studs` | true / false | toy-brick studs on top of blocks |
| `outline` | number, 0 = none | prop outline thickness |
| `shadows` | true / false | real cast shadows |
| `colors.mix`, `colors.amount` | colour, 0 to 1 | pushes every colour towards one colour. 0.1 gives a gentle tint, 0.8 is almost monochrome |
| `colors.saturation` | number, 1 = normal | 0 is grey, 1.4 is vivid |
| `ground` | `textured`, `plain`, `studs` | drawn tiles and grass, flat colour, or a studded toy baseplate |
| `groundColor` | colour | one ground colour for every scene (plain ground only) |
| `sky.day`, `sky.sunset`, `sky.night` | `[top, horizon]` colours | sky gradient for each time of day |
| `evenLight` | true / false | true stops sunset and night from tinting the characters |
| `fog`, `clouds` | true / false | distance haze, clouds |
| `pixel` | 0, or 4 to 10 | pixel block size. 6 is the built-in pixel look, 10 is very chunky |
| `posterize` | 0, or 3 to 12 | limits colour steps for a retro palette. Lower is harsher |
| `post.saturate`, `post.contrast` | number, 1 = normal | final colour grade |
| `post.grain` | 0 to 1 | paper grain over the picture |
| `post.vignette` | 0 to 0.6 | dark corners |
| `post.halftone` | 0 to 0.6 | comic-print dots over the picture |
| `captions.font` | `round`, `marker`, `pixel`, `comic`, `serif` | caption and title typeface |
| `captions.box` | colour | puts each caption in a tilted box of this colour, like a comic panel |
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
- Silver line art: `base` `gold`, `ink` and `captions.color` `#D6DCE4`, `titleColor` `#FFFFFF`.
- Shiny toy CGI: `base` `cgi`, `roughness` 0.2, `colors.saturation` 1.25.
- Newspaper comic: `base` `comic`, `colors.saturation` 0, `post.halftone` 0.5, `captions.box` `#FFFFFF`.

What a style cannot change: the shapes of the characters and props, and the animation. Those live in `src/engine/` and need code.
