(() => {
  "use strict";

  const PLAYER_VERSION = "8.0";
  let activeItem = null;
  let activeEntry = null;

  const css = `
    .v8-player-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: end center;
      padding: max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom));
      background: rgba(10, 20, 30, .76);
    }
    .v8-player-backdrop[hidden] { display: none; }
    .v8-player-sheet {
      width: min(760px, 100%);
      max-height: 94vh;
      overflow: auto;
      background: var(--paper, #fff);
      border-radius: 22px 22px 16px 16px;
      padding: 18px;
      box-shadow: 0 24px 70px rgba(0, 0, 0, .38);
    }
    .v8-player-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 13px;
    }
    .v8-player-kicker {
      color: var(--gold, #b38732);
      text-transform: uppercase;
      font-size: .72rem;
      font-weight: 850;
      letter-spacing: .1em;
    }
    .v8-player-title {
      margin: 4px 0 2px;
      font-size: 1.45rem;
      line-height: 1.15;
    }
    .v8-player-subtitle {
      color: var(--muted, #617080);
      font-size: .84rem;
      line-height: 1.4;
    }
    .v8-player-close {
      flex: 0 0 auto;
      width: 40px;
      height: 40px;
      border: 1px solid var(--line, #d9e0e7);
      border-radius: 50%;
      background: #fff;
      color: var(--text, #17202a);
      font-size: 1.35rem;
      cursor: pointer;
    }
    .v8-player-frame-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      border-radius: 15px;
      background: #000;
    }
    .v8-player-frame {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }
    .v8-player-help {
      margin: 10px 2px 0;
      color: var(--muted, #617080);
      font-size: .78rem;
      line-height: 1.45;
    }
    .v8-player-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
      align-items: center;
    }
    .v8-player-actions .btn { text-decoration: none; }
    body.v8-player-open { overflow: hidden; }
    @media (min-width: 760px) {
      .v8-player-backdrop { place-items: center; }
      .v8-player-sheet { border-radius: 22px; }
    }
  `;

  const modalHtml = `
    <div class="v8-player-backdrop" id="v8PlayerModal" hidden aria-hidden="true">
      <section class="v8-player-sheet" role="dialog" aria-modal="true" aria-labelledby="v8PlayerTitle">
        <div class="v8-player-top">
          <div>
            <div class="v8-player-kicker">LSB Audio Bible</div>
            <h2 class="v8-player-title" id="v8PlayerTitle">Chapter audio</h2>
            <div class="v8-player-subtitle" id="v8PlayerSubtitle">Verified official chapter recording</div>
          </div>
          <button class="v8-player-close" id="v8PlayerClose" type="button" aria-label="Close audio player">×</button>
        </div>

        <div class="v8-player-frame-wrap">
          <iframe
            class="v8-player-frame"
            id="v8PlayerFrame"
            title="LSB Audio Bible chapter player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            playsinline
            referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>

        <p class="v8-player-help">
          Playback stays inside the Bible app. On some iPhones, you may need to tap Play once after the player opens.
        </p>

        <div class="v8-player-actions">
          <button class="btn success" id="v8CompleteNext" type="button">Mark Complete & Listen Next</button>
          <button class="btn" id="v8CompleteClose" type="button">Mark Complete & Close</button>
          <a class="btn small" id="v8OpenYouTube" target="_blank" rel="noopener noreferrer">Open in YouTube ↗</a>
          <button class="btn small" id="v8CloseBottom" type="button">Close</button>
        </div>
      </section>
    </div>
  `;

  function byId(id) {
    return document.getElementById(id);
  }

  function installPlayerUi() {
    if (byId("v8PlayerModal")) return;

    const style = document.createElement("style");
    style.id = "v8PlayerStyles";
    style.textContent = css;
    document.head.appendChild(style);

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    byId("v8PlayerClose").addEventListener("click", closePlayer);
    byId("v8CloseBottom").addEventListener("click", closePlayer);
    byId("v8CompleteNext").addEventListener("click", completeAndListenNext);
    byId("v8CompleteClose").addEventListener("click", completeAndClose);

    byId("v8PlayerModal").addEventListener("click", event => {
      if (event.target === byId("v8PlayerModal")) closePlayer();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !byId("v8PlayerModal").hidden) closePlayer();
    });
  }

  function playerUrl(videoId) {
    const params = new URLSearchParams({
      autoplay: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1"
    });
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`;
  }

  function openPlayerFor(item) {
    if (!item) return;

    const entry = audioEntry(item.reference);
    if (!entry?.videoId) {
      showToast(`Audio not mapped for ${item.reference}`);
      return;
    }

    activeItem = item;
    activeEntry = entry;

    state.lastOpened = {
      sourceDay: item.sourceDay,
      category: item.category,
      targetDay: state.selectedDay,
      mode: "listen"
    };
    saveState();
    renderContinue();

    byId("v8PlayerTitle").textContent = item.reference;
    byId("v8PlayerSubtitle").textContent = entry.title || "Verified official LSB Audio Bible recording";
    byId("v8OpenYouTube").href = entry.url || `https://www.youtube.com/watch?v=${encodeURIComponent(entry.videoId)}`;
    byId("v8PlayerFrame").src = playerUrl(entry.videoId);

    const modal = byId("v8PlayerModal");
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("v8-player-open");
    byId("v8PlayerClose").focus({ preventScroll: true });
  }

  function closePlayer() {
    const modal = byId("v8PlayerModal");
    if (!modal || modal.hidden) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("v8-player-open");

    // Clearing the source immediately stops playback.
    byId("v8PlayerFrame").src = "about:blank";
    activeItem = null;
    activeEntry = null;
  }

  function completeCurrentItem() {
    if (!activeItem) return false;
    const completedReference = activeItem.reference;
    markItemComplete(activeItem);
    state.lastOpened = null;
    saveState();
    showToast(`${completedReference} marked complete`);
    return true;
  }

  function completeAndListenNext() {
    if (!completeCurrentItem()) return;

    const next = nextUnfinishedItem();
    if (!next) {
      closePlayer();
      showToast("Selected day complete");
      return;
    }

    // Do not close the sheet; simply replace the chapter in the same player.
    openPlayerFor(next);
  }

  function completeAndClose() {
    if (!completeCurrentItem()) return;
    closePlayer();
  }

  installPlayerUi();

  // Replace V7's external YouTube launch with the in-app player.
  openListening = openPlayerFor;

  // Expose a small diagnostic marker for troubleshooting.
  window.BIBLE_AUDIO_PLAYER_VERSION = PLAYER_VERSION;
})();
