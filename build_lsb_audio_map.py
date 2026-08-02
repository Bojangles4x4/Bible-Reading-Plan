#!/usr/bin/env python3
"""Build and strictly validate the LSB Audio Bible chapter-to-video map."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BOOKS: list[tuple[str, int, tuple[str, ...]]] = [
    ("Genesis", 50, ("Genesis",)),
    ("Exodus", 40, ("Exodus",)),
    ("Leviticus", 27, ("Leviticus",)),
    ("Numbers", 36, ("Numbers",)),
    ("Deuteronomy", 34, ("Deuteronomy",)),
    ("Joshua", 24, ("Joshua",)),
    ("Judges", 21, ("Judges",)),
    ("Ruth", 4, ("Ruth",)),
    ("1 Samuel", 31, ("1 Samuel", "First Samuel", "I Samuel")),
    ("2 Samuel", 24, ("2 Samuel", "Second Samuel", "II Samuel")),
    ("1 Kings", 22, ("1 Kings", "First Kings", "I Kings")),
    ("2 Kings", 25, ("2 Kings", "Second Kings", "II Kings")),
    ("1 Chronicles", 29, ("1 Chronicles", "First Chronicles", "I Chronicles")),
    ("2 Chronicles", 36, ("2 Chronicles", "Second Chronicles", "II Chronicles")),
    ("Ezra", 10, ("Ezra",)),
    ("Nehemiah", 13, ("Nehemiah",)),
    ("Esther", 10, ("Esther",)),
    ("Job", 42, ("Job",)),
    ("Psalms", 150, ("Psalm", "Psalms")),
    ("Proverbs", 31, ("Proverbs",)),
    ("Ecclesiastes", 12, ("Ecclesiastes",)),
    ("Song of Solomon", 8, ("Song of Solomon", "Song of Songs", "Canticles")),
    ("Isaiah", 66, ("Isaiah",)),
    ("Jeremiah", 52, ("Jeremiah",)),
    ("Lamentations", 5, ("Lamentations",)),
    ("Ezekiel", 48, ("Ezekiel",)),
    ("Daniel", 12, ("Daniel",)),
    ("Hosea", 14, ("Hosea",)),
    ("Joel", 3, ("Joel",)),
    ("Amos", 9, ("Amos",)),
    ("Obadiah", 1, ("Obadiah",)),
    ("Jonah", 4, ("Jonah",)),
    ("Micah", 7, ("Micah",)),
    ("Nahum", 3, ("Nahum",)),
    ("Habakkuk", 3, ("Habakkuk",)),
    ("Zephaniah", 3, ("Zephaniah",)),
    ("Haggai", 2, ("Haggai",)),
    ("Zechariah", 14, ("Zechariah",)),
    ("Malachi", 4, ("Malachi",)),
    ("Matthew", 28, ("Matthew",)),
    ("Mark", 16, ("Mark",)),
    ("Luke", 24, ("Luke",)),
    ("John", 21, ("John",)),
    ("Acts", 28, ("Acts",)),
    ("Romans", 16, ("Romans",)),
    ("1 Corinthians", 16, ("1 Corinthians", "First Corinthians", "I Corinthians")),
    ("2 Corinthians", 13, ("2 Corinthians", "Second Corinthians", "II Corinthians")),
    ("Galatians", 6, ("Galatians",)),
    ("Ephesians", 6, ("Ephesians",)),
    ("Philippians", 4, ("Philippians",)),
    ("Colossians", 4, ("Colossians",)),
    ("1 Thessalonians", 5, ("1 Thessalonians", "First Thessalonians", "I Thessalonians")),
    ("2 Thessalonians", 3, ("2 Thessalonians", "Second Thessalonians", "II Thessalonians")),
    ("1 Timothy", 6, ("1 Timothy", "First Timothy", "I Timothy")),
    ("2 Timothy", 4, ("2 Timothy", "Second Timothy", "II Timothy")),
    ("Titus", 3, ("Titus",)),
    ("Philemon", 1, ("Philemon",)),
    ("Hebrews", 13, ("Hebrews",)),
    ("James", 5, ("James",)),
    ("1 Peter", 5, ("1 Peter", "First Peter", "I Peter")),
    ("2 Peter", 3, ("2 Peter", "Second Peter", "II Peter")),
    ("1 John", 5, ("1 John", "First John", "I John")),
    ("2 John", 1, ("2 John", "Second John", "II John")),
    ("3 John", 1, ("3 John", "Third John", "III John")),
    ("Jude", 1, ("Jude",)),
    ("Revelation", 22, ("Revelation", "Revelation of Jesus Christ")),
]

EXPECTED = {f"{book} {chapter}" for book, chapters, _ in BOOKS for chapter in range(1, chapters + 1)}
EXPECTED_TOTAL = len(EXPECTED)

def read_entries(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []

    # yt-dlp --dump-single-json
    if text.startswith("{"):
        obj = json.loads(text)
        if isinstance(obj.get("entries"), list):
            return [entry for entry in obj["entries"] if isinstance(entry, dict)]

    entries = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON on line {line_no}: {exc}") from exc
        if isinstance(obj, dict):
            entries.append(obj)
    return entries

def compile_patterns() -> list[tuple[str, int, re.Pattern[str]]]:
    compiled = []
    for canonical, max_chapter, aliases in BOOKS:
        aliases_sorted = sorted(aliases, key=len, reverse=True)
        alias_part = "|".join(re.escape(alias) for alias in aliases_sorted)
        pattern = re.compile(
            rf"(?<![A-Za-z0-9])(?:the\s+book\s+of\s+)?(?:{alias_part})"
            rf"\s*(?:chapter\s*)?(\d{{1,3}})(?!\d)",
            re.IGNORECASE,
        )
        compiled.append((canonical, max_chapter, pattern))
    # Longest book names first so "1 John" wins before "John".
    compiled.sort(key=lambda item: len(item[0]), reverse=True)
    return compiled

PATTERNS = compile_patterns()

def identify_reference(title: str) -> str | None:
    cleaned = re.sub(r"\s+", " ", title).strip()
    matches: list[str] = []
    for canonical, max_chapter, pattern in PATTERNS:
        found = pattern.search(cleaned)
        if not found:
            continue
        chapter = int(found.group(1))
        if 1 <= chapter <= max_chapter:
            matches.append(f"{canonical} {chapter}")
    unique = list(dict.fromkeys(matches))
    return unique[0] if len(unique) == 1 else None

def video_id(entry: dict[str, Any]) -> str | None:
    candidate = entry.get("id") or entry.get("videoId")
    if candidate:
        return str(candidate)
    url = str(entry.get("url") or entry.get("webpage_url") or "")
    match = re.search(r"(?:v=|youtu\.be/|/shorts/)([A-Za-z0-9_-]{11})", url)
    return match.group(1) if match else None

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--source", default="https://www.youtube.com/@lsbaudiobible/videos")
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    entries = read_entries(args.input)
    mapped: dict[str, dict[str, str]] = {}
    duplicates: dict[str, list[dict[str, str]]] = {}
    unmatched: list[dict[str, str]] = []

    for entry in entries:
        title = str(entry.get("title") or "").strip()
        vid = video_id(entry)
        if not title or not vid:
            unmatched.append({"title": title, "videoId": vid or ""})
            continue

        reference = identify_reference(title)
        if reference not in EXPECTED:
            unmatched.append({"title": title, "videoId": vid})
            continue

        record = {
            "videoId": vid,
            "title": title,
            "url": f"https://www.youtube.com/watch?v={vid}",
        }
        if reference in mapped and mapped[reference]["videoId"] != vid:
            duplicates.setdefault(reference, [mapped[reference]]).append(record)
        else:
            mapped[reference] = record

    missing = sorted(EXPECTED - set(mapped), key=reference_sort_key)
    extras = sorted(set(mapped) - EXPECTED)
    complete = not missing and not duplicates and len(mapped) == EXPECTED_TOTAL

    payload = {
        "schemaVersion": 1,
        "source": args.source,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "expected": EXPECTED_TOTAL,
        "mapped": len(mapped),
        "complete": complete,
        "chapters": dict(sorted(mapped.items(), key=lambda kv: reference_sort_key(kv[0]))),
    }
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    report = {
        "sourceEntries": len(entries),
        "expected": EXPECTED_TOTAL,
        "mapped": len(mapped),
        "complete": complete,
        "missing": missing,
        "duplicates": duplicates,
        "extras": extras,
        "unmatchedCount": len(unmatched),
        "unmatched": unmatched,
    }
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Source videos: {len(entries)}")
    print(f"Mapped chapters: {len(mapped)}/{EXPECTED_TOTAL}")
    print(f"Missing: {len(missing)}")
    print(f"Duplicates: {len(duplicates)}")
    print(f"Unmatched: {len(unmatched)}")

    if args.strict and not complete:
        print("Strict validation failed. See the report file.", file=sys.stderr)
        return 1
    return 0

def reference_sort_key(reference: str) -> tuple[int, int]:
    for index, (book, _, _) in enumerate(BOOKS):
        prefix = f"{book} "
        if reference.startswith(prefix):
            return index, int(reference[len(prefix):])
    return 999, 999

if __name__ == "__main__":
    raise SystemExit(main())
