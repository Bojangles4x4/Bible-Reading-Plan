TEN-CATEGORY BIBLE PLAN — V7 VERIFIED DIRECT AUDIO

V7 DESIGN
- No Google search.
- No Google Apps Script proxy.
- No live YouTube channel search when you tap Listen.
- The app uses lsb-audio-map.json, a locally stored chapter-to-video map.
- Every mapped item opens the exact official LSB Audio Bible YouTube video.
- Audio is disabled for a chapter unless that exact chapter has a verified map entry.

MAP GENERATION
The GitHub workflow:
  .github/workflows/build-lsb-audio-map.yml

collects the complete public catalog from:
  https://www.youtube.com/@lsbaudiobible/videos

It then validates the catalog against all 1,189 canonical Bible chapters.
The workflow refuses to mark the map complete if there is:
- a missing chapter,
- a duplicate chapter,
- an invalid chapter,
- or fewer than 1,189 exact mappings.

PRIMARY COLLECTION METHOD
- yt-dlp on a GitHub Actions runner.
- No API key is normally required.

FALLBACK
If YouTube blocks yt-dlp on the GitHub runner, add a repository Actions secret:
  YOUTUBE_API_KEY

The workflow will then use the official YouTube Data API.

DO NOT MERGE V7 YET
Run the workflow on the v7-audio-map branch first.
Only merge after lsb-audio-map.json says:
  "mapped": 1189
  "complete": true

PROGRESS
V7 preserves the existing browser storage key:
  tenCategoryBiblePlan.v1

Existing reading checkmarks should carry forward.
