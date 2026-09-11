/* =========================================================
   APP — screen router + DOM wiring.
   No framework. Plain DOM. Order of execution:
   cases.js → scoring.js → leaderboard.js → app.js
   ========================================================= */

(function () {
  "use strict";

  // ---------- Module state ----------
  let currentCaseId = null;
  let tracker = createScoreTracker();
  let selectedTheoryId = null;

  // ---------- DOM refs ----------
  const $ = (sel) => document.querySelector(sel);
  const screens = {
    cases: $("#screen-cases"),
    briefing: $("#screen-briefing"),
    board: $("#screen-board"),
    accusation: $("#screen-accusation"),
    result: $("#screen-result"),
    leaderboard: $("#screen-leaderboard")
  };

  const modal = {
    root: $("#evidence-modal"),
    frame: $("#modal-frame"),
    kind: $("#modal-kind"),
    title: $("#modal-title"),
    body: $("#modal-body"),
    close: $("#modal-close")
  };

  // ---------- Screen router ----------
  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      if (!el) return;
      el.classList.remove("active", "enter");
    });
    const target = screens[name];
    if (!target) return;
    target.classList.add("active");
    // re-trigger entrance animation by toggling the class on the next frame
    // eslint-disable-next-line no-unused-expressions
    void target.offsetWidth;
    target.classList.add("enter");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "auto" : "auto" });
  }

  function getCurrentCase() {
    if (!currentCaseId) return null;
    return CASES.find((c) => c.id === currentCaseId) || null;
  }

  // ---------- Evidence modal ----------
  function openEvidence(evidenceType) {
    const cs = getCurrentCase();
    if (!cs) return;

    // Mark opened (idempotent — Set deduplicates)
    markEvidenceOpened(tracker, evidenceType);

    // Re-render board so "VIEWED" stamp appears on the card
    renderBoard();

    const ev = cs.evidence[evidenceType];
    const titles = {
      log: "Logs",
      stackTrace: "Stack Trace",
      commit: "Git Commit",
      code: "Source Code"
    };
    const kinds = {
      log: "EVIDENCE / LOG",
      stackTrace: "EVIDENCE / STACK TRACE",
      commit: "EVIDENCE / COMMIT",
      code: "EVIDENCE / SOURCE"
    };

    modal.kind.textContent = kinds[evidenceType] || "EVIDENCE";
    modal.title.textContent = titles[evidenceType] || evidenceType;
    modal.body.innerHTML = "";

    if (evidenceType === "log") {
      ev.forEach((line) => {
        const span = document.createElement("span");
        span.className = "log-line";
        if (line.includes("ERROR")) span.classList.add("level-error");
        else if (line.includes("WARN")) span.classList.add("level-warn");
        span.textContent = line;
        modal.body.appendChild(span);
      });
    } else if (evidenceType === "stackTrace") {
      ev.forEach((line) => {
        const span = document.createElement("span");
        span.className = "stack-line";
        span.textContent = line;
        modal.body.appendChild(span);
      });
    } else if (evidenceType === "commit") {
      const meta = document.createElement("div");
      meta.className = "commit-meta";
      meta.innerHTML =
        "<strong>" +
        escapeHtml(ev.author) +
        "</strong> · " +
        escapeHtml(ev.when) +
        " · <em>" +
        escapeHtml(ev.message) +
        "</em>";
      modal.body.appendChild(meta);

      const diff = document.createElement("div");
      diff.className = "commit-diff";
      ev.diff.forEach((line) => {
        const span = document.createElement("span");
        span.className = "diff-line";
        if (line.startsWith("+")) span.classList.add("added");
        else if (line.startsWith("-")) span.classList.add("removed");
        else if (line.trim() === "") span.classList.add("empty");
        else span.classList.add("context");
        span.textContent = line;
        diff.appendChild(span);
      });
      modal.body.appendChild(diff);
    } else if (evidenceType === "code") {
      const head = document.createElement("div");
      head.className = "snip-head";
      head.textContent = ev.filename;
      modal.body.appendChild(head);

      const body = document.createElement("div");
      body.className = "snip-body";
      ev.lines.forEach((ln) => {
        const row = document.createElement("div");
        row.className = "code-line";
        const no = document.createElement("span");
        no.className = "ln-no";
        no.textContent = ln.id;
        const txt = document.createElement("span");
        txt.className = "ln-text";
        txt.textContent = ln.text;
        row.appendChild(no);
        row.appendChild(txt);
        body.appendChild(row);
      });
      modal.body.appendChild(body);
    }

    modal.root.classList.remove("hidden");
    modal.root.setAttribute("aria-hidden", "false");
    modal.frame.classList.remove("enter");
    void modal.frame.offsetWidth;
    modal.frame.classList.add("enter");
  }

  function closeEvidence() {
    modal.root.classList.add("hidden");
    modal.root.setAttribute("aria-hidden", "true");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---------- SCREEN 1 — CASE SELECT ----------
  function renderCaseSelect() {
    const wrap = $("#case-cards");
    wrap.innerHTML = "";
    const diffLevels = { rookie: 1, investigator: 2, senior: 3 };
    CASES.forEach((cs, idx) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "case-card rot-" + ((idx % 3) + 1);
      card.dataset.caseId = cs.id;
      card.setAttribute("aria-label",
        cs.title + " (" + cs.difficulty + " difficulty)");

      const idTag = document.createElement("div");
      idTag.className = "case-id";
      idTag.textContent = "FILE #" + String(idx + 1).padStart(3, "0");

      const title = document.createElement("h3");
      title.className = "case-title";
      title.textContent = cs.title;

      const diffRow = document.createElement("div");
      diffRow.className = "case-difficulty-row";

      const diff = document.createElement("span");
      diff.className = "case-difficulty " + cs.difficulty;
      diff.textContent = cs.difficulty.toUpperCase();

      const dots = document.createElement("span");
      dots.className = "case-dots";
      dots.setAttribute("aria-hidden", "true");
      const level = diffLevels[cs.difficulty] || 1;
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement("span");
        dot.className = "case-dot" + (i < level ? " filled" : "");
        dots.appendChild(dot);
      }

      diffRow.appendChild(diff);
      diffRow.appendChild(dots);

      card.appendChild(idTag);
      card.appendChild(title);
      card.appendChild(diffRow);

      card.addEventListener("click", () => {
        currentCaseId = cs.id;
        tracker = createScoreTracker();
        selectedTheoryId = null;
        renderBriefing();
        showScreen("briefing");
      });

      wrap.appendChild(card);
    });
  }

  // ---------- SCREEN 2 — BRIEFING ----------
  function renderBriefing() {
    const cs = getCurrentCase();
    if (!cs) return;
    $("#briefing-title").textContent = cs.title;
    $("#briefing-body").textContent = cs.briefing;

    const stats = $("#briefing-stats");
    stats.innerHTML = "";
    const labels = {
      usersAffected: "USERS AFFECTED",
      errorRate: "ERROR RATE",
      status: "STATUS"
    };
    Object.entries(cs.stats).forEach(([key, val]) => {
      const cell = document.createElement("div");
      cell.className = "hud-stat";
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = labels[key] || key.toUpperCase();
      const value = document.createElement("span");
      value.className = "value";
      value.textContent = val;
      cell.appendChild(label);
      cell.appendChild(value);
      stats.appendChild(cell);
    });
  }

  // ---------- SCREEN 3 — EVIDENCE BOARD ----------
  function renderBoard() {
    const cs = getCurrentCase();
    if (!cs) return;
    $("#board-case-title").textContent = cs.title;
    updateEvidenceCounter();

    const grid = $("#board-grid");
    grid.innerHTML = "";

    // 1) Static red-string SVG spanning the grid
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "board-strings");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");

    // Center pin coordinate (in viewBox space)
    const cx = 50;
    const cy = 50;
    // Four card anchors (corners of the 2x2 grid)
    const anchors = [
      { x: 18, y: 22 },
      { x: 82, y: 22 },
      { x: 18, y: 78 },
      { x: 82, y: 78 }
    ];
    anchors.forEach((a) => {
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", String(cx));
      line.setAttribute("y1", String(cy));
      line.setAttribute("x2", String(a.x));
      line.setAttribute("y2", String(a.y));
      svg.appendChild(line);
    });
    // Center pin dot
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", String(cx));
    dot.setAttribute("cy", String(cy));
    dot.setAttribute("r", "2.4");
    dot.setAttribute("fill", "#b3231a");
    dot.setAttribute("stroke", "#7a1a14");
    dot.setAttribute("stroke-width", "0.6");
    svg.appendChild(dot);

    grid.appendChild(svg);

    // 2) Four evidence cards (in a fixed order)
    const evidenceOrder = ["log", "stackTrace", "commit", "code"];
    const labels = {
      log: "Logs",
      stackTrace: "Stack Trace",
      commit: "Git Commit",
      code: "Source Code"
    };
    evidenceOrder.forEach((kind, idx) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "evidence-card rot-" + (idx + 1);
      card.dataset.kind = kind;
      if (tracker.evidenceOpened.has(kind)) card.classList.add("opened");

      const ev = cs.evidence[kind];
      const kindTag = document.createElement("div");
      kindTag.className = "ev-kind";
      kindTag.textContent = "EVIDENCE / " + kind.toUpperCase();

      const title = document.createElement("div");
      title.className = "ev-title";
      title.textContent = labels[kind];

      const preview = document.createElement("div");
      preview.className = "ev-preview";
      preview.textContent = firstLineOf(cs, kind);

      card.appendChild(kindTag);
      card.appendChild(title);
      card.appendChild(preview);

      card.addEventListener("click", () => openEvidence(kind));
      grid.appendChild(card);
    });
  }

  function firstLineOf(cs, kind) {
    const ev = cs.evidence[kind];
    if (kind === "log" || kind === "stackTrace") return ev[0] || "";
    if (kind === "commit") return ev.message;
    if (kind === "code") return ev.filename;
    return "";
  }

  function updateEvidenceCounter() {
    const el = $("#board-evidence-counter");
    if (!el) return;
    const viewed = tracker.evidenceOpened.size;
    const total = 4;
    el.textContent = viewed + " / " + total + " evidence reviewed";
  }

  // ---------- SCREEN 4 — ACCUSATION ----------
  function renderAccusation() {
    const cs = getCurrentCase();
    if (!cs) return;

    // Reset stage to theory
    $("#accuse-theory").classList.remove("hidden");
    $("#accuse-fix").classList.add("hidden");
    $("#theory-stamp").classList.remove("shown");
    $("#fix-stamp").classList.remove("shown");
    selectedTheoryId = null;
    $("#theory-lock").disabled = true;

    const opts = $("#theory-options");
    opts.innerHTML = "";
    cs.rootCauseOptions.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theory-option";
      btn.dataset.optId = opt.id;

      const letter = document.createElement("span");
      letter.className = "opt-letter";
      letter.textContent = opt.id.toUpperCase() + ".";

      const text = document.createElement("span");
      text.className = "opt-text";
      text.textContent = opt.text;

      btn.appendChild(letter);
      btn.appendChild(text);
      btn.addEventListener("click", () => {
        selectedTheoryId = opt.id;
        opts.querySelectorAll(".theory-option").forEach((el) =>
          el.classList.remove("selected")
        );
        btn.classList.add("selected");
        $("#theory-lock").disabled = false;
      });
      opts.appendChild(btn);
    });
  }

  // Read-only code snippet for the fix stage (no click — just view).
  function renderFixStage() {
    const cs = getCurrentCase();
    if (!cs) return;

    $("#fix-prompt").textContent = cs.fixPrompt || "Write the fix.";
    updateFixAttempts();

    const wrap = $("#fix-snippet");
    wrap.innerHTML = "";

    const head = document.createElement("div");
    head.className = "snip-head";
    head.textContent = cs.evidence.code.filename;
    wrap.appendChild(head);

    const body = document.createElement("div");
    body.className = "snip-body";
    cs.evidence.code.lines.forEach((ln) => {
      const row = document.createElement("div");
      row.className = "code-line";
      if (ln.id === cs.correctLineId) row.classList.add("buggy");

      const no = document.createElement("span");
      no.className = "ln-no";
      no.textContent = ln.id;
      const txt = document.createElement("span");
      txt.className = "ln-text";
      txt.textContent = ln.text;

      row.appendChild(no);
      row.appendChild(txt);
      body.appendChild(row);
    });
    wrap.appendChild(body);

    // Reset the input
    const inp = $("#fix-input");
    inp.value = "";
    inp.classList.remove("wrong");
    setTimeout(() => inp.focus(), 30);
  }

  function updateFixAttempts() {
    const el = $("#fix-attempts");
    if (!el) return;
    const n = tracker.fixAttempts || 0;
    el.textContent = "attempts: " + n;
  }

  // Normalize a fix answer: lowercase, strip whitespace, remove
  // backticks/quotes (so user can use any quote style), drop trailing
  // semicolons. This makes validation forgiving across quoting styles.
  function normalizeFix(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[`'"]/g, "")
      .replace(/\s+/g, " ")
      .replace(/;\s*$/, "")
      .trim();
  }

  function isFixCorrect(userInput, cs) {
    const norm = normalizeFix(userInput);
    if (!norm) return false;
    const acceptable = (cs.acceptableFixes && cs.acceptableFixes.length)
      ? cs.acceptableFixes
      : [cs.correctFix];
    return acceptable.some((fix) => normalizeFix(fix) === norm);
  }

  function onFixSubmit() {
    const cs = getCurrentCase();
    if (!cs) return;
    const inp = $("#fix-input");
    const value = inp.value;

    const correct = isFixCorrect(value, cs);
    recordFixAttempt(tracker, correct);
    updateFixAttempts();

    if (!correct) {
      inp.classList.remove("wrong");
      void inp.offsetWidth;
      inp.classList.add("wrong");
      const stamp = $("#fix-stamp");
      stamp.textContent = "WRONG FIX";
      stamp.classList.remove("shown");
      void stamp.offsetWidth;
      stamp.classList.add("shown");
      return;
    }

    // Correct → result
    renderResult();
    showScreen("result");
  }

  // ---------- SCREEN 5 — RESULT ----------
  function renderResult() {
    const cs = getCurrentCase();
    if (!cs) return;
    const score = calculateScore(tracker);
    const rank = getRank(score.total);

    $("#result-case-title").textContent = cs.title;
    $("#result-rank").textContent = rank;

    const cells = [
      { label: "EVIDENCE", value: score.evidencePoints },
      { label: "ROOT CAUSE", value: score.rootCausePoints },
      { label: "FIX", value: score.fixPoints },
      { label: "TOTAL", value: score.total }
    ];
    const wrap = $("#score-breakdown");
    wrap.innerHTML = "";
    cells.forEach((c) => {
      const cell = document.createElement("div");
      cell.className = "score-cell";
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = c.label;
      const value = document.createElement("span");
      value.className = "value";
      value.textContent = String(c.value);
      cell.appendChild(label);
      cell.appendChild(value);
      wrap.appendChild(cell);
    });

    $("#explanation-body").textContent = cs.explanation;
    $("#result-name").value = "";
  }

  function saveResult() {
    const cs = getCurrentCase();
    if (!cs) return;
    const name = $("#result-name").value.trim();
    if (!name) {
      $("#result-name").focus();
      $("#result-name").style.borderColor = "var(--string-red)";
      return;
    }
    $("#result-name").style.borderColor = "";

    const score = calculateScore(tracker);
    addLeaderboardEntry({
      name: name,
      caseTitle: cs.title,
      difficulty: cs.difficulty,
      score: score.total,
      date: new Date().toISOString().slice(0, 10)
    });
    renderLeaderboard();
    showScreen("leaderboard");
  }

  // ---------- SCREEN 6 — LEADERBOARD ----------
  function renderLeaderboard() {
    const wrap = $("#lb-table");
    wrap.innerHTML = "";
    const entries = getTopEntries(10);

    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "lb-empty";
      empty.textContent = "No cases solved yet. Crack one to make the board.";
      wrap.appendChild(empty);
      return;
    }

    const head = document.createElement("div");
    head.className = "lb-row head";
    head.innerHTML =
      "<div class='lb-rank'>#</div>" +
      "<div class='lb-name'>NAME</div>" +
      "<div class='lb-case'>CASE</div>" +
      "<div class='lb-diff'>DIFF</div>" +
      "<div class='lb-score'>SCORE</div>" +
      "<div class='lb-date'>DATE</div>";
    wrap.appendChild(head);

    entries.forEach((e, idx) => {
      const row = document.createElement("div");
      row.className = "lb-row";
      const diffTag = (e.difficulty || "").toUpperCase();
      row.innerHTML =
        "<div class='lb-rank'>" + (idx + 1) + "</div>" +
        "<div class='lb-name'>" + escapeHtml(e.name) + "</div>" +
        "<div class='lb-case'>" + escapeHtml(e.caseTitle) + "</div>" +
        "<div class='lb-diff'>" + escapeHtml(diffTag) + "</div>" +
        "<div class='lb-score'>" + e.score + "</div>" +
        "<div class='lb-date'>" + escapeHtml(e.date) + "</div>";
      wrap.appendChild(row);
    });
  }

  // ---------- Wire up static buttons ----------
  function wireUp() {
    // Case Select → Leaderboard
    $("#open-leaderboard-from-cases").addEventListener("click", () => {
      renderLeaderboard();
      showScreen("leaderboard");
    });

    // Briefing
    $("#briefing-back").addEventListener("click", () => showScreen("cases"));
    $("#briefing-start").addEventListener("click", () => {
      renderBoard();
      showScreen("board");
    });

    // Board
    $("#board-back").addEventListener("click", () => {
      renderBriefing();
      showScreen("briefing");
    });
    $("#board-accuse").addEventListener("click", () => {
      renderAccusation();
      showScreen("accusation");
    });

    // Accusation — theory
    $("#theory-back").addEventListener("click", () => {
      renderBoard();
      showScreen("board");
    });
    $("#theory-lock").addEventListener("click", () => {
      const cs = getCurrentCase();
      if (!cs || !selectedTheoryId) return;
      const correct = selectedTheoryId === cs.correctRootCauseId;
      recordRootCauseAttempt(tracker, correct);

      if (!correct) {
        const stamp = $("#theory-stamp");
        stamp.textContent = "WRONG THEORY";
        stamp.classList.remove("shown");
        void stamp.offsetWidth;
        stamp.classList.add("shown");
        return;
      }

      // Correct → reveal fix stage
      $("#accuse-theory").classList.add("hidden");
      $("#accuse-fix").classList.remove("hidden");
      renderFixStage();
    });

    // Accusation — fix stage back goes all the way to cases (per the plan: a wrong fix
    // still lets them retry, so back exits the case cleanly)
    $("#fix-back").addEventListener("click", () => {
      currentCaseId = null;
      tracker = createScoreTracker();
      showScreen("cases");
    });

    // Fix stage — submit button + Enter key on input
    $("#fix-submit").addEventListener("click", onFixSubmit);
    $("#fix-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onFixSubmit();
      }
    });

    // Result
    $("#result-save").addEventListener("click", saveResult);
    $("#result-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveResult();
    });
    $("#result-back").addEventListener("click", () => {
      currentCaseId = null;
      tracker = createScoreTracker();
      showScreen("cases");
    });

    // Leaderboard
    $("#lb-back").addEventListener("click", () => showScreen("cases"));

    // Modal
    modal.close.addEventListener("click", closeEvidence);
    modal.root.addEventListener("click", (e) => {
      if (e.target === modal.root) closeEvidence();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.root.classList.contains("hidden")) {
        closeEvidence();
      }
    });
  }

  // ---------- Boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    wireUp();
    renderCaseSelect();

    // Optional: ?screen=briefing&case=midnight-crash for deep-linking / previews.
    // Used by the screenshot helper; harmless if absent.
    const params = new URLSearchParams(window.location.search);
    const screen = params.get("screen");
    const caseId = params.get("case");
    const modalKind = params.get("modal"); // open a specific evidence modal
    if (screen && screen !== "cases") {
      if (caseId) currentCaseId = caseId;
      switch (screen) {
        case "briefing":
          renderBriefing();
          break;
        case "board":
          renderBoard();
          if (modalKind) openEvidence(modalKind);
          break;
        case "accusation":
          renderAccusation();
          break;
        case "result": {
          // Force a perfect-run result so the breakdown has something to show.
          ["log", "stackTrace", "commit", "code"].forEach((k) =>
            markEvidenceOpened(tracker, k)
          );
          if (currentCaseId) {
            const cs = CASES.find((c) => c.id === currentCaseId);
            if (cs) {
              recordRootCauseAttempt(tracker, true);
              recordLineAttempt(tracker, true);
            }
          }
          renderResult();
          break;
        }
        case "leaderboard":
          renderLeaderboard();
          break;
      }
      showScreen(screen);
    } else {
      showScreen("cases");
    }
  });
})();
