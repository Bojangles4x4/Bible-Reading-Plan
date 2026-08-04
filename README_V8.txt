TEN-CATEGORY BIBLE PLAN — V8 IN-APP YOUTUBE PLAYER

WHAT THIS UPDATE DOES
- Keeps the complete verified 1,189-chapter LSB Audio Bible map.
- Replaces the external YouTube-app launch with a player modal inside the Bible app.
- Keeps the user on the same reading day and card.
- Adds:
  - Close
  - Mark Complete & Listen Next
  - Mark Complete & Close
  - Open in YouTube fallback
- Stops playback immediately when the modal closes.
- Preserves the existing progress storage key and all prior checkmarks.

FILES IN THIS PACKAGE
1. v8-player.js
   New in-app player code.
2. service-worker.js
   Replacement service worker with a V8 cache and offline caching for v8-player.js.
3. index-snippet.txt
   The one small edit required at the bottom of index.html.

SAFE GITHUB WORKFLOW
1. Create a new branch from main named:
   v8-in-app-player
2. Upload v8-player.js to the repository root.
3. Replace service-worker.js with the version in this package.
4. Edit index.html using the exact change in index-snippet.txt.
5. Commit all changes to v8-in-app-player.
6. Open a pull request into main.
7. Do not merge until the changed files have been reviewed.

EXPECTED IPHONE EXPERIENCE
- Tap Listen.
- An in-app sheet opens with the exact chapter.
- Playback should remain inside the installed Bible app.
- iOS may require one additional tap on the player's Play button.
- Closing full screen or the player returns directly to the Bible reading screen.

FALLBACK
If YouTube blocks embedding for any particular video, Open in YouTube remains available.
The underlying chapter map is unchanged.
