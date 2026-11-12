"""Free narration with edge-tts (no API key). Called by tools/voice.mjs.

Reads a job file: {"lines": [{"text", "voice", "out"}], "rate", "pitch"}
Writes one mp3 per line and prints JSON with the word timings.
"""
import asyncio
import json
import sys

import edge_tts


async def speak(line, rate, pitch):
    comm = edge_tts.Communicate(line["text"], line["voice"], rate=rate, pitch=pitch, boundary="WordBoundary")
    words = []
    size = 0
    with open(line["out"], "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
                size += len(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"t": chunk["offset"] / 1e7, "d": chunk["duration"] / 1e7, "w": chunk["text"]})
    return {"words": words, "bytes": size}


async def main():
    with open(sys.argv[1], encoding="utf-8") as f:
        job = json.load(f)
    out = []
    for line in job["lines"]:
        last = None
        for _ in range(3):
            try:
                out.append(await speak(line, job.get("rate", "+0%"), job.get("pitch", "+0Hz")))
                last = None
                break
            except Exception as err:  # network hiccup: retry
                last = err
                await asyncio.sleep(1.5)
        if last:
            raise last
    print(json.dumps(out))


asyncio.run(main())
