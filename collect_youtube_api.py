#!/usr/bin/env python3
"""Collect every upload from the LSB Audio Bible channel using YouTube Data API v3."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://www.googleapis.com/youtube/v3"

def get_json(path: str, params: dict[str, str]) -> dict:
    url = f"{API}/{path}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=45) as response:
        return json.load(response)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--handle", default="lsbaudiobible")
    args = parser.parse_args()

    key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not key:
        print("YOUTUBE_API_KEY is not set.", file=sys.stderr)
        return 2

    channels = get_json("channels", {
        "part": "id,contentDetails",
        "forHandle": args.handle,
        "key": key,
    })
    items = channels.get("items") or []
    if not items:
        print(f"No channel found for @{args.handle}", file=sys.stderr)
        return 1

    uploads = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
    output = []
    page_token = ""

    while True:
        params = {
            "part": "snippet,contentDetails",
            "playlistId": uploads,
            "maxResults": "50",
            "key": key,
        }
        if page_token:
            params["pageToken"] = page_token
        data = get_json("playlistItems", params)
        for item in data.get("items", []):
            video_id = item.get("contentDetails", {}).get("videoId")
            title = item.get("snippet", {}).get("title", "")
            if video_id:
                output.append({"id": video_id, "title": title})
        page_token = data.get("nextPageToken", "")
        if not page_token:
            break

    args.output.write_text(
        "\n".join(json.dumps(item, ensure_ascii=False) for item in output) + "\n",
        encoding="utf-8",
    )
    print(f"Collected {len(output)} videos from @{args.handle}.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
