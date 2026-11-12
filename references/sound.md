# Sound effects and music

`npm run sounds` finds sound effects and background music on [Openverse](https://openverse.org) (openly licensed audio from Freesound and Jamendo; no API key), downloads them into `public/sfx/`, trims and levels them, and places them on the timeline in `src/sounds.json`. Run it after the story is final (it can run before or after `npm run voice`).

## Licences

Only **CC0**, **public domain** and **CC BY** sounds are used. CC BY means the creator must be credited, so the tool writes `out/<id>-credits.txt`. Put those lines in the video description every time; it is the condition for using the sound. Non-commercial (NC), no-derivatives (ND) and share-alike (SA) sounds are skipped on purpose, because a monetised short that trims and mixes them would break those terms.

## What you get without writing anything

| On screen | Sound |
|---|---|
| `transition: "whip"` | whoosh |
| `transition: "flash"` | sparkle chime |
| `title` | pop |
| an actor or prop with `enter` | pop (coins clink, logs thud) |
| `bubble: "💡"` | ding |
| `bubble: "?"` | springy question sound |
| a `campfire` prop | crackling fire, looped for the scene |
| `time: "night"` (no fire) | crickets, looped |

The whole film also gets background music (default search: "acoustic"). It sits lower while the narrator speaks, rises in the gaps, and fades in and out.

## Choosing your own

On the story:

```json
"music": { "q": "ukulele", "vol": 0.3 }
```

`"music": false` turns music off. `"autoSfx": false` turns off the automatic effects above and keeps only the ones you list.

On a scene or a set:

```json
"sfx": ["door creak", { "q": "cash register", "at": 1.0, "vol": 0.35 }],
"ambience": { "q": "gentle waves", "vol": 0.12 }
```

- `at`: seconds into the scene. `vol`: 0 to 1 (effects default 0.45, ambience 0.18, music 0.18; music drops to 40% of that while the narrator speaks). `max`: longest an effect may play, in seconds.
- `ambience` on a set loops under every scene that uses the set, and plays as one continuous sound across consecutive scenes.
- `"sound": false` on a scene silences its automatic effects.
- Don't like what came back? Add `"pick": 2` (or 3, 4...) to take the next search result, or change the words.

## Getting good results

- Short, plain words find the most: "whoosh", "pop", "coins", "splash", "door", "crowd cheer", "rain". For music, one word works best: "ukulele", "piano", "acoustic", "lofi", "orchestral". Long phrases often match nothing; the tool then retries word by word.
- Less is more. One effect every two or three seconds is plenty. Effects should land on something you can see.
- Keep ambience quiet (0.1 to 0.2). It is there to be felt, not heard.
- Listen to the result. The search picks the first fitting sound; sometimes it is the wrong mood. Use `pick` or other words and run `npm run sounds` again; sounds already downloaded are reused, and `npm run sounds -- --fresh` picks everything again.
- Your own music still wins: a file at `public/music.mp3` (that you have the rights to) is used instead of the Openverse track once you rerun `npm run voice`.
