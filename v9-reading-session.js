(() => {
  "use strict";

  const VERSION = "9.0";
  const REFLECTION_KEY = "tenCategoryBiblePlan.reflections.v1";
  let sessionOpen = false;
  let sessionDay = null;
  let focusCategory = null;
  let saveTimer = null;

  const css = `
    .v9-session-launcher {
      background: linear-gradient(135deg, var(--navy), #476f9c) !important;
      border-color: var(--navy) !important;
      color: #fff !important;
    }
    .v9-session-backdrop {
      position: fixed;
      inset: 0;
      z-index: 900;
      display: grid;
      place-items: end center;
      padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
      background: rgba(12, 22, 34, .78);
    }
    .v9-session-backdrop[hidden] { display: none; }
    .v9-session-sheet {
      width: min(820px, 100%);
      max-height: 95vh;
      overflow: auto;
      overscroll-behavior: contain;
      background: var(--paper, #fff);
      border-radius: 24px 24px 16px 16px;
      padding: 18px;
      box-shadow: 0 26px 80px rgba(0, 0, 0, .4);
    }
    .v9-session-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
    }
    .v9-session-kicker {
      color: var(--gold, #b38732);
      text-transform: uppercase;
      letter-spacing: .11em;
      font-weight: 850;
      font-size: .72rem;
    }
    .v9-session-title {
      margin: 4px 0 3px;
      font-size: 1.55rem;
      line-height: 1.15;
    }
    .v9-session-date {
      color: var(--muted, #617080);
      font-size: .86rem;
    }
    .v9-session-close {
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
    .v9-session-progress-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 16px;
      color: var(--muted, #617080);
      font-size: .84rem;
    }
    .v9-session-progress-row strong { color: var(--text, #17202a); }
    .v9-session-track {
      height: 10px;
      margin: 8px 0 17px;
      overflow: hidden;
      border-radius: 999px;
      background: #edf1f4;
    }
    .v9-session-fill {
      width: 0;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--green, #2f7d4a), #63a979);
      transition: width .2s ease;
    }
    .v9-current-card {
      border: 1px solid #b9cee0;
      border-radius: 18px;
      padding: 17px;
      background: linear-gradient(180deg, var(--blue-soft, #e8f1f8), #fff);
    }
    .v9-current-category {
      color: var(--gold, #b38732);
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: .74rem;
      font-weight: 850;
    }
    .v9-current-reference {
      margin: 5px 0 4px;
      font-size: clamp(1.65rem, 7vw, 2.35rem);
      line-height: 1.05;
      font-weight: 900;
    }
    .v9-current-note {
      color: var(--muted, #617080);
      font-size: .84rem;
      line-height: 1.45;
    }
    .v9-current-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      margin-top: 16px;
    }
    .v9-current-actions .btn { flex: 1 1 170px; }
    .v9-session-primary {
      background: var(--green, #2f7d4a) !important;
      border-color: var(--green, #2f7d4a) !important;
      color: #fff !important;
    }
    .v9-queue-title {
      margin: 18px 0 9px;
      font-size: .82rem;
      color: var(--muted, #617080);
      text-transform: uppercase;
      letter-spacing: .09em;
      font-weight: 850;
    }
    .v9-queue {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .v9-queue-item {
      width: 100%;
      display: grid;
      grid-template-columns: 27px 1fr;
      gap: 9px;
      align-items: center;
      text-align: left;
      border: 1px solid var(--line, #d9e0e7);
      border-radius: 13px;
      padding: 9px 10px;
      background: #fff;
      color: var(--text, #17202a);
      cursor: pointer;
    }
    .v9-queue-item.current {
      border-color: #7d9fbd;
      background: var(--blue-soft, #e8f1f8);
    }
    .v9-queue-item.done {
      border-color: #a8d4b6;
      background: var(--green-soft, #e7f4eb);
    }
    .v9-queue-number {
      width: 27px;
      height: 27px;
      display: grid;
      place-items: center;
      border-radius: 9px;
      background: #edf1f4;
      font-size: .78rem;
      font-weight: 850;
    }
    .v9-queue-item.done .v9-queue-number {
      background: var(--green, #2f7d4a);
      color: #fff;
    }
    .v9-queue-copy strong { display: block; font-size: .86rem; }
    .v9-queue-copy span { display: block; color: var(--muted, #617080); font-size: .72rem; margin-top: 2px; }
    .v9-complete-card {
      border: 1px solid #a8d4b6;
      border-radius: 18px;
      padding: 17px;
      background: linear-gradient(180deg, var(--green-soft, #e7f4eb), #fff);
    }
    .v9-complete-card[hidden] { display: none; }
    .v9-complete-card h3 { margin: 0 0 6px; font-size: 1.35rem; }
    .v9-complete-card > p { margin: 0; color: var(--muted, #617080); line-height: 1.5; }
    .v9-reflection-grid { display: grid; gap: 12px; margin-top: 16px; }
    .v9-reflection-field label { display: block; margin-bottom: 6px; font-weight: 800; }
    .v9-reflection-field textarea {
      width: 100%;
      min-height: 86px;
      resize: vertical;
      border: 1px solid var(--line, #d9e0e7);
      border-radius: 12px;
      padding: 10px;
      background: #fff;
      color: var(--text, #17202a);
      font: inherit;
      line-height: 1.45;
    }
    .v9-save-status { margin-top: 8px; color: var(--muted, #617080); font-size: .76rem; }
    body.v9-session-open { overflow: hidden; }
    @media (min-width: 760px) {
      .v9-session-backdrop { place-items: center; }
      .v9-session-sheet { border-radius: 24px; }
    }
    @media (max-width: 620px) {
      .v9-queue { grid-template-columns: 1fr; }
      .v9-current-actions .btn { flex-basis: 100%; }
    }
  `;

  const modalHtml = `
    <div class="v9-session-backdrop" id="v9SessionModal" hidden aria-hidden="true">
      <section class="v9-session-sheet" role="dialog" aria-modal="true" aria-labelledby="v9SessionTitle">
        <div class="v9-session-top">
          <div>
            <div class="v9-session-kicker">Guided Reading Session</div>
            <h2 class="v9-session-title" id="v9SessionTitle">Day 1</h2>
            <div class="v9-session-date" id="v9SessionDate"></div>
          </div>
          <button class="v9-session-close" id="v9SessionClose" type="button" aria-label="Pause and close reading session">×</button>
        </div>

        <div class="v9-session-progress-row">
          <span>Today: <strong id="v9SessionCount">0 of 10</strong></span>
          <span id="v9SessionEncouragement">Begin with the next unfinished chapter.</span>
        </div>
        <div class="v9-session-track"><div class="v9-session-fill" id="v9SessionFill"></div></div>

        <div class="v9-current-card" id="v9CurrentCard">
          <div class="v9-current-category" id="v9CurrentCategory">Category 1</div>
          <div class="v9-current-reference" id="v9CurrentReference">Genesis 1</div>
          <div class="v9-current-note" id="v9CurrentNote">Read or listen, then mark the chapter complete when you are ready.</div>
          <div class="v9-current-actions">
            <button class="btn primary" id="v9ReadButton" type="button">Read in LSB ↗</button>
            <button class="btn audio" id="v9ListenButton" type="button">▶ Listen in App</button>
            <button class="btn v9-session-primary" id="v9CompleteButton" type="button">Mark Complete & Continue</button>
            <button class="btn" id="v9PauseButton" type="button">Pause Session</button>
          </div>
        </div>

        <div class="v9-complete-card" id="v9CompleteCard" hidden>
          <h3>Today’s ten readings are complete.</h3>
          <p>Pause long enough to answer from the text before moving into personal requests.</p>
          <div class="v9-reflection-grid">
            <div class="v9-reflection-field">
              <label for="v9RevealGod">What did today’s reading reveal about God?</label>
              <textarea id="v9RevealGod" placeholder="Write a truth from the text..."></textarea>
            </div>
            <div class="v9-reflection-field">
              <label for="v9BelieveObey">What should I believe or obey?</label>
              <textarea id="v9BelieveObey" placeholder="Name the response Scripture calls for..."></textarea>
            </div>
            <div class="v9-reflection-field">
              <label for="v9Prayer">Turn that truth into prayer.</label>
              <textarea id="v9Prayer" placeholder="Pray the truth before bringing your requests..."></textarea>
            </div>
          </div>
          <div class="v9-save-status" id="v9SaveStatus">Responses are saved locally on this device.</div>
          <div class="v9-current-actions">
            <button class="btn primary" id="v9CloseComplete" type="button">Finish Session</button>
          </div>
        </div>

        <div class="v9-queue-title">Today’s readings</div>
        <div class="v9-queue" id="v9Queue"></div>
      </section>
    </div>
  `;

  function byId(id) {
    return document.getElementById(id);
  }

  function reflectionId(day) {
    return `${state.startDate}|${day}`;
  }

  function loadReflections() {
    try {
      return JSON.parse(localStorage.getItem(REFLECTION_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveReflection(field, value) {
    const all = loadReflections();
    const key = reflectionId(sessionDay);
    all[key] = all[key] || {};
    all[key][field] = value;
    all[key].updatedAt = new Date().toISOString();
    localStorage.setItem(REFLECTION_KEY, JSON.stringify(all));
    byId("v9SaveStatus").textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      byId("v9SaveStatus").textContent = "Saved locally on this device.";
    }, 450);
  }

  function dayItems(day) {
    const items = [];
    for (let category = 1; category <= 10; category++) {
      items.push(readingDescriptor({ sourceDay: day, category, targetDay: day, kind: "regular" }));
    }
    return items;
  }

  function selectedItem() {
    const items = dayItems(sessionDay);
    if (focusCategory) {
      const focused = items.find(item => item.category === focusCategory);
      if (focused && !state.checked[focused.id]) return focused;
    }
    return items.find(item => !state.checked[item.id]) || null;
  }

  function updateLauncher() {
    const button = byId("v9BeginSessionButton");
    if (!button) return;
    const count = dayReadCount(state.selectedDay);
    if (count === 10) button.textContent = "Review & Pray";
    else if (count === 0) button.textContent = "Begin Reading Session";
    else button.textContent = `Resume Session · ${count}/10`;
    button.title = `Guided session for Day ${state.selectedDay}`;
  }

  function renderReflection() {
    const saved = loadReflections()[reflectionId(sessionDay)] || {};
    byId("v9RevealGod").value = saved.revealGod || "";
    byId("v9BelieveObey").value = saved.believeObey || "";
    byId("v9Prayer").value = saved.prayer || "";
    byId("v9SaveStatus").textContent = saved.updatedAt
      ? "Saved locally on this device."
      : "Responses are saved locally on this device.";
  }

  function renderQueue(current) {
    const queue = byId("v9Queue");
    queue.innerHTML = "";
    dayItems(sessionDay).forEach(item => {
      const done = Boolean(state.checked[item.id]);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `v9-queue-item${done ? " done" : ""}${current?.category === item.category ? " current" : ""}`;
      button.innerHTML = `
        <span class="v9-queue-number">${done ? "✓" : item.category}</span>
        <span class="v9-queue-copy">
          <strong>${item.reference}</strong>
          <span>Category ${item.category}${done ? " · Complete" : ""}</span>
        </span>`;
      button.addEventListener("click", () => {
        if (done) {
          showToast(`${item.reference} is already complete`);
          return;
        }
        focusCategory = item.category;
        renderSession();
      });
      queue.appendChild(button);
    });
  }

  function renderSession() {
    if (!sessionOpen || !sessionDay) return;

    const count = dayReadCount(sessionDay);
    const current = selectedItem();
    const complete = count === 10;

    byId("v9SessionTitle").textContent = `Day ${sessionDay}`;
    byId("v9SessionDate").textContent = formatDate(dateForDay(sessionDay));
    byId("v9SessionCount").textContent = `${count} of 10`;
    byId("v9SessionFill").style.width = `${count * 10}%`;
    byId("v9SessionEncouragement").textContent = complete
      ? "Receive the completion with gratitude, not as a score."
      : count === 0
        ? "Begin with the next unfinished chapter."
        : `${10 - count} chapter${10 - count === 1 ? "" : "s"} remaining.`;

    byId("v9CurrentCard").hidden = complete;
    byId("v9CompleteCard").hidden = !complete;

    if (current && !complete) {
      byId("v9CurrentCategory").textContent = `Category ${current.category}`;
      byId("v9CurrentReference").textContent = current.reference;
      byId("v9CurrentNote").textContent = "Read or listen, then mark the chapter complete when you are ready.";
      const listen = byId("v9ListenButton");
      const mapped = Boolean(audioEntry(current.reference)?.videoId);
      listen.disabled = !mapped;
      listen.title = mapped ? `Play ${current.reference} inside the app` : `No verified audio entry for ${current.reference}`;
    }

    if (complete) renderReflection();
    renderQueue(current);
    updateLauncher();
  }

  function openSession() {
    sessionDay = state.selectedDay;
    focusCategory = null;
    sessionOpen = true;
    const modal = byId("v9SessionModal");
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("v9-session-open");
    renderSession();
    byId("v9SessionClose").focus({ preventScroll: true });
  }

  function closeSession() {
    const modal = byId("v9SessionModal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("v9-session-open");
    sessionOpen = false;
    focusCategory = null;
  }

  function currentSessionItem() {
    return selectedItem();
  }

  function completeCurrent() {
    const item = currentSessionItem();
    if (!item) return;
    markItemComplete(item);
    state.lastOpened = null;
    focusCategory = null;
    saveState();
    render();
    showToast(`${item.reference} marked complete`);
  }

  function installUi() {
    const style = document.createElement("style");
    style.id = "v9SessionStyles";
    style.textContent = css;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const launch = document.createElement("button");
    launch.id = "v9BeginSessionButton";
    launch.type = "button";
    launch.className = "btn primary small v9-session-launcher";
    launch.addEventListener("click", openSession);
    const todayButton = byId("todayButton");
    todayButton.parentElement.insertBefore(launch, todayButton.nextSibling);

    const settings = document.querySelector(".settings-content");
    const settingsActions = settings?.querySelector(".actions");
    if (settings && settingsActions) {
      const version = document.createElement("div");
      version.className = "field";
      version.style.gridColumn = "1/-1";
      version.innerHTML = `<label>App version</label><div class="audio-status">V9 · Guided Reading Session</div>`;
      settings.insertBefore(version, settingsActions);
    }

    byId("v9SessionClose").addEventListener("click", closeSession);
    byId("v9PauseButton").addEventListener("click", closeSession);
    byId("v9CloseComplete").addEventListener("click", closeSession);
    byId("v9SessionModal").addEventListener("click", event => {
      if (event.target === byId("v9SessionModal")) closeSession();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && sessionOpen && byId("v8PlayerModal")?.hidden !== false) closeSession();
    });

    byId("v9ReadButton").addEventListener("click", () => openReading(currentSessionItem()));
    byId("v9ListenButton").addEventListener("click", () => openListening(currentSessionItem()));
    byId("v9CompleteButton").addEventListener("click", completeCurrent);

    byId("v9RevealGod").addEventListener("input", event => saveReflection("revealGod", event.target.value));
    byId("v9BelieveObey").addEventListener("input", event => saveReflection("believeObey", event.target.value));
    byId("v9Prayer").addEventListener("input", event => saveReflection("prayer", event.target.value));
  }

  function installBackupEnhancements() {
    byId("exportButton").onclick = () => {
      const payload = {
        format: "tenCategoryBiblePlan.v9",
        exportedAt: new Date().toISOString(),
        planState: state,
        reflections: loadReflections()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "bible-reading-progress-v9.json";
      anchor.click();
      URL.revokeObjectURL(url);
      showToast("Progress and reflections exported");
    };

    byId("importInput").onchange = async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (parsed?.planState) {
          state = normalizeState(parsed.planState);
          localStorage.setItem(REFLECTION_KEY, JSON.stringify(parsed.reflections || {}));
        } else {
          state = normalizeState(parsed);
        }
        saveState();
        render();
        if (sessionOpen) {
          sessionDay = state.selectedDay;
          focusCategory = null;
          renderSession();
        }
        showToast("Progress imported");
      } catch {
        alert("That file could not be imported.");
      }
      event.target.value = "";
    };

    byId("resetButton").onclick = () => {
      if (!confirm("Reset the plan and erase all progress, skipped days, catch-up assignments, and saved reflections?")) return;
      localStorage.removeItem(REFLECTION_KEY);
      state = normalizeState({});
      state.selectedDay = todayDayNumber();
      saveState();
      closeSession();
      render();
      showToast("Plan reset");
    };
  }

  installUi();
  installBackupEnhancements();

  const originalRender = render;
  render = function (...args) {
    const result = originalRender(...args);
    updateLauncher();
    if (sessionOpen) renderSession();
    return result;
  };

  updateLauncher();
  window.BIBLE_READING_SESSION_VERSION = VERSION;
})();
