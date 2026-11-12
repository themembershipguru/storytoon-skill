---
name: storytoon
description: Make a viral-style animated story reel (vertical 9:16, 80-90 s, never over 90) where hand-drawn 2D cartoon characters act in a 3D world, with a narrator voice and word-by-word captions. Use when the user asks for a cartoon story video, an animated parable or moral story, a "2D characters in 3D world" explainer, a rich-vs-poor style lesson reel, or says things like "make a story reel about X" / "X par animated kahani banao". It can also research which short videos already have a million views in a niche (yt-dlp) and turn those patterns into original ideas. Fourteen visual styles are built in (toon, paper cutout, whiteboard, line art, chalkboard, gold line art, comic book, flat vector, pixel art, PS2-era 3D, low-poly 3D, smooth CGI, clay, toy bricks) and the user can invent and name their own. Sound effects and music come from Openverse (CC0 and CC BY only, credits written for you). Everything is drawn in code (no image generation, no paid API): the user gives a topic, you write the story, fill one JSON file, and render an mp4.
---

# Storytoon: 2D characters, 3D world, one JSON file

You turn a topic into a finished vertical story video. The look: flat outlined cartoon characters standing in a real 3D set (ground, trees, houses, light, shadows), a moving camera, one or two caption words on screen at a time, a narrator voice.

You do not write animation code. You write **one file, `story/story.json`**, and the engine in `template/` renders it. Voice is free (edge-tts, no key). Nothing needs a paid API.

## Step 0: set up the project (once per machine/folder)

1. Check tools first, do not ask the user to install what is already there: `node -v` (18+), `python3 --version` (3.9+, only needed for the voice).
2. Copy this skill's `template/` folder into the user's working folder as `storytoon/` (skip if it already exists), then run `npm install` inside it. The install takes a few minutes the first time.
3. Quick proof it works: `npm run check -- 1` renders scene 1 of the sample story to `out/check/scene-01.png`. Look at it.

The tools use the Chrome, Edge or Chromium already installed on the computer. Set `BROWSER_EXECUTABLE` to point at a different one, or `STORYTOON_BUNDLED=1` to let Remotion download its own. On a Linux server without a GPU set `STORYTOON_GL=swangle`.

## Optional: research what already works in the niche

Use this when the user names a niche instead of a topic ("make me viral money videos"), asks what is working, or shares no idea of their own. Skip it when they already gave a specific story.

```
npm run research -- "money lessons" --tags moneytips,personalfinance
```

It searches YouTube with yt-dlp (no API key, nothing downloaded but text) and writes `out/research/<niche>.md`: short videos with at least 1,000,000 views, their numbers, opening line, pace and transcript. Options: `--min-views 300000` for small niches, `--max 10`, `--lang hi` for Hindi transcripts, `--tags` for hashtags to look in.

Then do the thinking yourself:

1. Read the file and throw out anything that is not really about the niche. Search is noisy: pranks, music and challenge clips get in. The list at the bottom ("no spoken script") is title-and-views evidence only.
2. For the ones that fit, write down the pattern, not the content: what kind of hook opens it, the shape (contrast of two people, list, question and answer, twist), length, words per second, what the title promises.
3. Give the user 3 to 5 **original** ideas that use those patterns, each with a hook line and a one-sentence lesson, and say which video inspired which pattern. Let them pick.

**What may be reused and what may not.** A topic, a lesson, a hook type, a structure and a pacing are free for anyone. The script wording, the characters, the named world and the scene-by-scene sequence of a specific video are its creator's work. Never retell a found video with new drawings, never paraphrase its transcript line by line, and never reuse its title. If the user asks to "recreate" one, make a new story that teaches the same idea and tell them plainly that this is what you did and why: copies get strikes, and the audience has already seen the original.

If yt-dlp fails (YouTube changes often), run it once with `STORYTOON_UPDATE=1` in front to update it. If it still fails, say so and continue from the user's own topic; do not invent research results.

## Step 1: write the story, then STOP for approval

Read `references/story-craft.md` first. It is short and it is what makes these videos get watched to the end.

Write the script as a numbered list of scenes, one narration line each, and show it to the user with the hook, the lesson and the estimated length. **Do not build anything until the user says yes.** Changing a script costs nothing; changing a rendered film costs minutes.

Rules for the script:

- Length is 80 to 90 seconds, and **90 is a hard maximum**: 18 to 22 scenes, 215 to 245 spoken words. Go shorter (45 to 60 s, 12 to 14 scenes) only if the user asks. `npm run voice` prints the real length and says how many words to cut or add; if it says TOO LONG, cut lines and run it again before rendering. Never fix length by changing the voice speed a lot.
- One idea per scene, at most about 16 words per line.
- Original stories only. Folk tales and fables in the public domain are fine; retell them in your own words. Never copy the script, characters or scene list of someone else's video, even if the user shares one as a reference: take the format, not the content.
- No real people, brands or logos as characters.
- A number or fact stated as true needs a source you actually opened. A parable needs none, but do not dress an invented story up as a true one.
- Write in the user's language. Hindi (Devanagari) and Hinglish both work; pick a matching voice.

## Step 2: write `story/story.json`

Read `references/story-schema.md` for every field, prop, face and camera shot. The sample `story/story.json` in the template is a complete worked example; read it before writing your own.

What matters most:

- **Watermark**: if the user has a channel or brand name, set `"watermark"` to it (see the schema). Ask once; remember the answer for their later videos.
- **Style**: set `"style"` at the top. Ask the user which look they want if they have not said, and offer the built-in ones from `references/styles.md` by name, with the "good for" hint. If they describe a look of their own, build it as a named custom style (see `references/styles.md`) and show them stills before the full film.
- **Cast**: 2 to 4 characters, each with a clearly different outfit colour and head (hair, hat, glasses, beard), so the viewer can tell them apart at phone size.
- **Sets**: put the scenery every scene shares into `sets` once and reuse it by name. Add scene-specific props in the scene.
- **The frame is narrow.** A medium shot shows about 4.5 units of width at the actors; keep people who must be seen together within 3 units of each other, or use a wide shot or a bigger `zoom`.
- **Change the picture every line.** Alternate shot sizes (wide, medium, close, top, low), change who the camera is on, and give most scenes a camera `move`. Two scenes in a row with the same shot on the same subject read as a freeze.
- **Show the line.** If the narration says the pile doubled, the pile on screen doubles (`count`). If someone is shocked, `face: "shocked"`. Use `bubble` and `hold` emoji for ideas and objects, and the `board` prop (with an `owl` teacher) for the one scene that states the rule or the maths.
- **Highlight** the one or two words per line that carry the meaning by wrapping them in stars: `"twice as *big*"`.
- Use `time` (day, sunset, night) to show time passing; it changes the whole mood for free.

## Step 3: look before you voice

```
npm run check
```

This renders one still per scene into `out/check/` with estimated timing, no audio needed. **Open the stills and look at every one.** Fix what you see, then run it again (or `npm run check -- 4 9` for just those scenes):

- someone important is cut off or outside the frame: move them closer together, or raise `zoom`
- an actor is hidden behind a prop or another actor: change `at` (bigger z is closer to the camera)
- a bright pink cube: a prop `type` is misspelled
- the caption sits on a face: pick a different shot, or set `captions.y` (0.68 by default)
- a scene looks the same as the one before it: change the shot

## Step 4: voice, final check, render

```
npm run voice     # free narration + word timing -> public/audio, src/timing.json
npm run sounds    # sound effects + music from Openverse -> public/sfx, src/sounds.json, out/<id>-credits.txt
npm run check     # again: timing changed, so look once more
npm run render    # -> out/<story id>.mp4
```

- The first `npm run voice` sets up a small Python environment by itself. It needs internet.
- Voice is set by `voice` in the story (for example `en-US-AndrewMultilingualNeural`, `en-US-AvaMultilingualNeural`, `en-IN-PrabhatNeural`, `hi-IN-MadhurNeural`, `hi-IN-SwaraNeural`). List all of them with `.venv/bin/edge-tts --list-voices`. `rate` like `"+8%"` speeds it up; story reels usually want `+4%` to `+10%`.
- Any edit to a `say` line needs `npm run voice` again. A line whose text no longer matches the saved audio plays silent with estimated timing, on purpose, so the mismatch is obvious.
- Sound effects and music come from `npm run sounds` (read `references/sound.md`). It only takes CC0, public-domain and CC BY audio. Effects for whips, flashes, pops, coins, ideas, campfires and night are added automatically; add `sfx` or `ambience` where the story needs a specific sound (a splash, a door, waves, rain), and set `"music"` to a one-word mood like "ukulele", "piano" or "lofi". Check what it picked, and if something sounds wrong, change the words or add `"pick": 2`.
- If the user has their own music, put it at `public/music.mp3` and rerun `npm run voice`; it replaces the Openverse track. Never download other music for them without checking its licence.
- After rendering, watch or sample the mp4 (for example pull a few frames) before saying it is done. Report the real length.

## Step 5: hand over

Give the user the mp4 path, the length, a caption for the post (hook line, 2 short lines, a question to comment on) and 5 to 8 hashtags. Add the CC BY lines from `out/<id>-credits.txt` to the end of the caption: crediting them is the licence condition. Say that the voice is AI-generated; platforms increasingly ask for that label.

## Going beyond the library

The engine is small and meant to be edited when the story truly needs it:

- new prop: add a `case` in `src/engine/Props.tsx` (build it from `Box` and `Shape`)
- new hair, hat, face or animal: `src/engine/characters.ts`
- new shot or camera move: `SHOTS` and `cameraPose` in `src/engine/World.tsx`
- caption look: `Captions` in `src/Film.tsx`

Before adding code, check whether an `emoji` prop, a `block`, or a `bubble` already tells the story. It usually does. Run `npm run typecheck` after any code change.

## Files

- `template/`: the project you copy. `story/story.json` is the film; `src/engine/` is the renderer; `tools/` has research, voice, check and render.
- `references/story-craft.md`: how to write a story that holds attention.
- `references/story-schema.md`: every field you can put in `story.json`.
- `references/styles.md`: the built-in styles and how to invent a new one.
- `references/sound.md`: sound effects, ambience and music from Openverse, and their licences.
