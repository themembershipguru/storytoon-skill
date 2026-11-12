"""Find short videos in a niche that already got big view counts, and collect what is
needed to study WHY they worked: title, numbers, description and transcript.

Called by tools/research.mjs. Uses yt-dlp (no API key). Nothing is downloaded except text.
The output is study material. It is not a script to copy.
"""
import argparse
import json
import os
import re
import sys
import urllib.parse

import yt_dlp


class Quiet:
    def debug(self, msg): pass
    def warning(self, msg): pass
    def error(self, msg): pass


def listing(url, limit):
    opts = {"quiet": True, "no_warnings": True, "extract_flat": True, "skip_download": True, "playlistend": limit}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    return list(info.get("entries") or [])


def sources(niche, tags):
    """Plain search rarely returns Shorts and sorting by views returns unrelated clips, so we use
    several relevance-ordered searches limited to short videos, plus the Shorts shelf of hashtags."""
    q = urllib.parse.quote_plus
    short_only = "EgIYAQ%253D%253D"  # YouTube filter: under 4 minutes, ordered by relevance
    urls = [f"https://www.youtube.com/results?search_query={q(niche + extra)}&sp={short_only}" for extra in ("", " shorts", " story", " explained")]
    words = re.findall(r"[^\W_]+", niche.lower())
    for tag in list(dict.fromkeys(tags + ["".join(words)])):
        urls.append(f"https://www.youtube.com/hashtag/{q(tag)}/shorts")
    return urls


def transcript(ydl, info, lang):
    for source in ("subtitles", "automatic_captions"):
        tracks = info.get(source) or {}
        keys = [k for k in tracks if k == lang or k.startswith(lang + "-")] or [k for k in tracks if k.endswith("-orig")] or [k for k in tracks if k.startswith("en")] or list(tracks)[:1]
        for key in keys:
            for fmt in tracks[key]:
                if fmt.get("ext") != "json3":
                    continue
                try:
                    data = json.loads(ydl.urlopen(fmt["url"]).read().decode("utf-8"))
                except Exception:
                    continue
                words = []
                for event in data.get("events", []):
                    for seg in event.get("segs") or []:
                        words.append(seg.get("utf8", ""))
                text = re.sub(r"\s+", " ", "".join(words)).strip()
                if text:
                    return text
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("niche")
    ap.add_argument("--min-views", type=int, default=1_000_000)
    ap.add_argument("--max", type=int, default=8)
    ap.add_argument("--max-seconds", type=int, default=180)
    ap.add_argument("--lang", default="en")
    ap.add_argument("--min-words", type=int, default=40, help="spoken words needed to count as a narrated video")
    ap.add_argument("--tags", default="", help="extra hashtags to look in, comma separated")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    seen = {}
    tags = [t.strip().lstrip("#").lower() for t in args.tags.split(",") if t.strip()]
    for url in sources(args.niche, tags):
        try:
            for e in listing(url, 100):
                if e and e.get("id") and e["id"] not in seen:
                    e["is_short"] = "/shorts/" in (e.get("url") or "")
                    seen[e["id"]] = e
        except Exception as err:
            print(f"skipped {url}: {str(err)[:100]}", file=sys.stderr)

    found = len(seen)
    picks = [
        e for e in seen.values()
        if (e.get("view_count") or 0) >= args.min_views and (e["is_short"] if not e.get("duration") else e["duration"] <= args.max_seconds)
    ]
    picks.sort(key=lambda e: e.get("view_count") or 0, reverse=True)
    picks = picks[: args.max * 5]  # look deeper than needed: many top results are music clips with no script

    videos = []
    opts = {"quiet": True, "no_warnings": True, "skip_download": True, "logger": Quiet()}
    others = []
    with yt_dlp.YoutubeDL(opts) as ydl:
        for e in picks:
            if len(videos) >= args.max:
                break
            url = f"https://www.youtube.com/watch?v={e['id']}"
            row = {
                "url": url,
                "title": e.get("title"),
                "channel": e.get("channel") or e.get("uploader"),
                "views": e.get("view_count"),
                "seconds": int(e.get("duration") or 0),
            }
            try:
                info = ydl.extract_info(url, download=False)
                row["title"] = info.get("title") or row["title"]
                row["channel"] = info.get("channel") or row["channel"]
                row["seconds"] = int(info.get("duration") or row["seconds"])
                row["views"] = info.get("view_count") or row["views"]
                row["likes"] = info.get("like_count")
                row["comments"] = info.get("comment_count")
                row["uploaded"] = info.get("upload_date")
                row["description"] = (info.get("description") or "")[:400]
                row["transcript"] = transcript(ydl, info, args.lang)
            except Exception:
                continue  # removed, private or region-locked
            spoken = re.sub(r"\[[^\]]*\]", " ", row.get("transcript") or "").split()
            if len(spoken) < args.min_words:
                others.append(row)
                continue
            if True:
                words = len(spoken)
                row["words"] = words
                row["words_per_second"] = round(words / max(1, row["seconds"]), 2)
                row["first_line"] = " ".join(row["transcript"].split()[:22])
            videos.append(row)

    result = {"niche": args.niche, "min_views": args.min_views, "searched": found, "videos": videos, "no_script": others}
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out + ".json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    lines = [f"# Viral research: {args.niche}", "", f"{len(videos)} narrated videos of at least {args.min_views:,} views and at most {args.max_seconds} s, out of {found} search results.", "Check each one is really about the niche before learning from it.", ""]
    for i, v in enumerate(videos, 1):
        lines += [
            f"## {i}. {v['title']}",
            f"- {v['views']:,} views, {v['seconds']} s, channel: {v.get('channel')}, uploaded: {v.get('uploaded', '?')}",
            f"- {v['url']}",
        ]
        if v.get("likes"):
            lines.append(f"- likes: {v['likes']:,} ({100 * v['likes'] / max(1, v['views']):.1f}% of views)")
        lines += [f"- pace: {v['words']} words, {v['words_per_second']} per second", f"- opens with: \"{v['first_line']}...\"", "", "Transcript (study only, do not reuse the wording):", "", "> " + v["transcript"][:2500]]
        lines.append("")
    if others:
        lines += ["## Big views but no spoken script (visual or music only)", ""]
        lines += [f"- {v['views']:,} views, {v['seconds']} s: {v['title']} ({v['url']})" for v in others[:10]]
        lines.append("")
    with open(args.out + ".md", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("\n".join(lines))


main()
