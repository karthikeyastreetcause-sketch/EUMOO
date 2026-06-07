(function () {
  "use strict";

  const API = {
    bootstrap: "/api/journal/bootstrap",
    dashboardBootstrap: "/api/dashboard/bootstrap",
    create: "/api/journal",
    aiConsent: "/api/journal/ai-consent",
    entry: (id) => `/api/journal/${id}`,
    lock: (id) => `/api/journal/${id}/lock`,
    unlock: (id) => `/api/journal/${id}/unlock`,
    removeLock: (id) => `/api/journal/${id}/remove-lock`,
    resetPin: (id) => `/api/journal/${id}/reset-pin`,
  };

  const ui = {
    root: document.getElementById("journalRoot"),
    entryCount: document.getElementById("journalEntryCount"),
    aiConsentBadge: document.getElementById("journalAiConsentBadge"),

    createBtn: document.getElementById("createJournalBtn"),
    list: document.getElementById("journalList"),
    listEmpty: document.getElementById("journalListEmpty"),

    editorPanel: document.querySelector(".journal-editor-panel"),
    titleInput: document.getElementById("journalTitleInput"),
    contentInput: document.getElementById("journalContentInput"),
    updatedAt: document.getElementById("journalUpdatedAt"),
    lockState: document.getElementById("journalLockState"),
    saveState: document.getElementById("journalSaveState"),

    consentText: document.getElementById("journalConsentText"),
    allowBtn: document.getElementById("allowAiShareBtn"),
    denyBtn: document.getElementById("denyAiShareBtn"),
    aiPatterns: document.getElementById("journalAiPatterns"),
    aiAction: document.getElementById("journalAiAction"),

    lockGate: document.getElementById("journalLockGate"),
    unlockPinInput: document.getElementById("unlockPinInput"),
    unlockBtn: document.getElementById("unlockNoteBtn"),
    unlockFeedback: document.getElementById("unlockFeedback"),

    noteActionMenu: document.getElementById("noteActionMenu"),
    noteActionDeleteBtn: document.getElementById("noteActionDeleteBtn"),
    noteActionLockBtn: document.getElementById("noteActionLockBtn"),
    noteActionRemoveLockBtn: document.getElementById("noteActionRemoveLockBtn"),
    noteActionForgotPinBtn: document.getElementById("noteActionForgotPinBtn"),

    actionModal: document.getElementById("noteActionModal"),
    actionModalTitle: document.getElementById("noteActionModalTitle"),
    actionModalMessage: document.getElementById("noteActionModalMessage"),
    actionFieldCurrentWrap: document.getElementById("noteActionFieldCurrentWrap"),
    actionFieldCurrent: document.getElementById("noteActionCurrentPin"),
    actionFieldNewWrap: document.getElementById("noteActionFieldNewWrap"),
    actionFieldNew: document.getElementById("noteActionNewPin"),
    actionFieldDeleteWrap: document.getElementById("noteActionFieldDeleteWrap"),
    actionFieldDelete: document.getElementById("noteActionDeletePin"),
    actionFieldPasswordWrap: document.getElementById("noteActionFieldPasswordWrap"),
    actionFieldPassword: document.getElementById("noteActionLoginPassword"),
    actionModalFeedback: document.getElementById("noteActionModalFeedback"),
    actionModalCancelBtn: document.getElementById("noteActionModalCancelBtn"),
    actionModalConfirmBtn: document.getElementById("noteActionModalConfirmBtn"),
  };

  const state = {
    entries: [],
    selectedId: null,
    aiSharing: null,
    dirty: false,
    saveTimer: null,
    saving: false,
    saveQueued: false,
    unlockedPins: {},
    actionMenuEntryId: null,
    tapHistory: {},
    modalConfig: null,
    modalBusy: false,
    contextMood: null,
    contextScore: null,
  };

  function normalizeTitle(raw) {
    const title = String(raw || "").trim();
    if (!title) return "Untitled note";
    if (title.length <= 160) return title;
    return title.slice(0, 160).trim();
  }

  function normalizeContent(raw) {
    const content = String(raw || "");
    if (content.length <= 200000) return content;
    return content.slice(0, 200000);
  }

  function normalizePin(raw) {
    const pin = String(raw || "").trim();
    if (/^\d{4}$/.test(pin)) return pin;
    return null;
  }

  function buildSnippet(raw) {
    const oneLine = String(raw || "").replace(/\s+/g, " ").trim();
    if (!oneLine) return "No content yet.";
    if (oneLine.length <= 120) return oneLine;
    return `${oneLine.slice(0, 120).trim()}...`;
  }

  function getWordCount(raw) {
    return String(raw || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function inferToneAndMood(raw) {
    const text = String(raw || "").toLowerCase();
    const has = (words) => words.some((word) => text.includes(word));
    const hasPositive = has(["grateful", "calm", "good", "hope", "relief", "better", "joy"]);
    const hasStress = has(["stress", "anxious", "panic", "worried", "fear", "tired", "drained", "overwhelmed"]);
    const hasAnger = has(["angry", "frustrated", "annoyed", "irritated", "upset"]);
    const hasFocus = has(["focused", "productive", "clear", "momentum", "flow"]);

    let mood = "Reflective";
    let emoji = "📝";
    let tone = "Balanced";

    if (hasStress) {
      mood = "Anxious";
      emoji = "😟";
      tone = "Heavy";
    } else if (hasAnger) {
      mood = "Frustrated";
      emoji = "😤";
      tone = "Intense";
    } else if (hasPositive) {
      mood = "Hopeful";
      emoji = "🌤️";
      tone = "Bright";
    } else if (hasFocus) {
      mood = "Focused";
      emoji = "🎯";
      tone = "Sharp";
    }

    return { mood, emoji, tone };
  }

  function getIntensity(raw) {
    const text = String(raw || "");
    if (!text.trim()) return "Low";
    const intensityScore =
      (text.match(/[!?]/g) || []).length +
      (text.match(/\b(very|really|extremely|always|never)\b/gi) || []).length;
    if (intensityScore >= 8) return "High";
    if (intensityScore >= 3) return "Medium";
    return "Low";
  }

  function getPromptPoolByMood(mood) {
    const pools = {
      Calm: [
        "What stayed on your mind today even in your calm moments?",
        "What helped you feel most grounded today?",
        "What made you feel understood today?",
      ],
      Focused: [
        "What gave you the clearest momentum today?",
        "What should you protect tomorrow to stay focused?",
        "What did you finish that made you proud?",
      ],
      Anxious: [
        "What emotion followed you the longest today?",
        "What are you avoiding emotionally right now?",
        "What drained your energy most today?",
      ],
      Tired: [
        "What depleted you the most and what gave small recovery?",
        "Which task felt heavy even before you started it?",
        "How can tomorrow be gentler for you?",
      ],
      Hopeful: [
        "What felt possible today that didn’t before?",
        "What do you want to carry into tomorrow’s version of you?",
        "What small win deserves to be acknowledged?",
      ],
    };
    return pools[mood] || [
      "What stayed on your mind today?",
      "What made you feel seen today?",
      "What do you need more of tomorrow?",
    ];
  }

  function formatTimestamp(ts) {
    if (!ts) return "Not saved yet";
    const normalized = String(ts).includes("T") ? String(ts) : String(ts).replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return String(ts);
    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getSelectedEntry() {
    if (state.selectedId == null) return null;
    return state.entries.find((entry) => Number(entry.id) === Number(state.selectedId)) || null;
  }

  function getEntryById(entryId) {
    return state.entries.find((entry) => Number(entry.id) === Number(entryId)) || null;
  }

  function setSaveState(text, tone = "") {
    if (!ui.saveState) return;
    ui.saveState.textContent = text;
    ui.saveState.classList.remove("pending", "error", "success");
    if (tone) ui.saveState.classList.add(tone);
  }

  function setUnlockFeedback(text, tone = "") {
    if (!ui.unlockFeedback) return;
    if (!text) {
      ui.unlockFeedback.hidden = true;
      ui.unlockFeedback.textContent = "";
      ui.unlockFeedback.className = "unlock-feedback";
      return;
    }

    ui.unlockFeedback.hidden = false;
    ui.unlockFeedback.textContent = text;
    ui.unlockFeedback.className = `unlock-feedback ${tone ? `is-${tone}` : ""}`;
  }

  function setModalFeedback(text, tone = "") {
    if (!ui.actionModalFeedback) return;
    if (!text) {
      ui.actionModalFeedback.hidden = true;
      ui.actionModalFeedback.textContent = "";
      ui.actionModalFeedback.className = "note-action-modal-feedback";
      return;
    }

    ui.actionModalFeedback.hidden = false;
    ui.actionModalFeedback.textContent = text;
    ui.actionModalFeedback.className = `note-action-modal-feedback ${tone ? `is-${tone}` : ""}`;
  }

  async function requestJSON(url, options = {}) {
    const config = {
      method: options.method || "GET",
      headers: options.body ? { "Content-Type": "application/json" } : {},
      credentials: "same-origin",
      ...options,
    };

    const response = await fetch(url, config);
    let data = {};
    try {
      data = await response.json();
    } catch (_error) {
      data = {};
    }

    if (!response.ok) {
      const err = new Error(data.message || "Request failed");
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  async function loadEmotionalContext() {
    try {
      const data = await requestJSON(API.dashboardBootstrap);
      const mood = String(data?.mood?.today || "").trim();
      const score = Number(data?.emotional_stability?.score);
      state.contextMood = mood || null;
      state.contextScore = Number.isFinite(score) ? score : null;
      if (mood) {
        try {
          localStorage.setItem("eumo_last_mood", mood);
        } catch (_err) {
          // non-blocking
        }
      }
      if (Number.isFinite(score)) {
        try {
          localStorage.setItem("eumo_last_stability_score", String(score));
        } catch (_err) {
          // non-blocking
        }
      }
    } catch (_err) {
      try {
        state.contextMood = localStorage.getItem("eumo_last_mood") || null;
        const score = Number(localStorage.getItem("eumo_last_stability_score"));
        state.contextScore = Number.isFinite(score) ? score : null;
      } catch (_storageErr) {
        state.contextMood = null;
        state.contextScore = null;
      }
    }
    setMoodTheme(state.contextMood);
    renderDynamicPrompt();
  }

  function sortEntries() {
    state.entries.sort((a, b) => {
      const tsDiff = String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
      if (tsDiff !== 0) return tsDiff;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }

  function renderEntryCount() {
    if (ui.entryCount) ui.entryCount.textContent = String(state.entries.length);
  }

  function renderConsent() {
    let badge = "Not set";
    let hint =
      "Decide if journals can be shared with AI insights in the future. You can change this any time.";

    if (state.aiSharing === true) {
      badge = "Allowed";
      hint = "AI sharing is enabled. Only your approved notes are eligible for AI insights later.";
    } else if (state.aiSharing === false) {
      badge = "Private";
      hint = "AI sharing is disabled. Your journals stay private from AI analysis.";
    }

    if (ui.aiConsentBadge) ui.aiConsentBadge.textContent = badge;
    if (ui.consentText) ui.consentText.textContent = hint;
    if (ui.allowBtn) ui.allowBtn.textContent = "AI Reflection Enabled";
    if (ui.denyBtn) ui.denyBtn.textContent = "Private";

    ui.allowBtn?.classList.toggle("active", state.aiSharing === true);
    ui.denyBtn?.classList.toggle("active", state.aiSharing === false);
  }

  function setMoodTheme(mood) {
    if (!ui.root) return;
    const normalized = String(mood || "").trim().toLowerCase();
    const allowed = ["calm", "focused", "anxious", "tired", "hopeful"];
    ui.root.dataset.moodTheme = allowed.includes(normalized) ? normalized : "focused";
  }

  function buildDynamicPrompt() {
    let mood = state.contextMood || "Calm";
    if (state.entries.length > 0) {
      const recentTone = inferToneAndMood(state.entries[0].content);
      if (recentTone.mood === "Anxious") mood = "Anxious";
      if (recentTone.mood === "Frustrated") mood = "Anxious";
      if (recentTone.mood === "Focused") mood = "Focused";
      if (recentTone.mood === "Hopeful") mood = "Hopeful";
    }
    const pool = getPromptPoolByMood(mood);
    const baseIndex = Math.floor((Date.now() / 1000 / 60) % pool.length);
    let prompt = pool[baseIndex] || pool[0];

    if (Number.isFinite(state.contextScore)) {
      if (state.contextScore <= 48) {
        prompt = "What feels emotionally heavy tonight, and what is one gentle step for release?";
      } else if (state.contextScore >= 78) {
        prompt = "What worked emotionally today that you want to repeat tomorrow?";
      }
    }
    return prompt;
  }

  function renderDynamicPrompt() {
    const prompt = buildDynamicPrompt();
    if (ui.contentInput) ui.contentInput.placeholder = prompt;
  }

  function updateAiReflectionPreview() {
    if (!ui.aiPatterns || !ui.aiAction) return;
    const entry = getSelectedEntry();
    const content = entry ? String(entry.content || "") : String(ui.contentInput?.value || "");
    const wordCount = getWordCount(content);
    const tone = inferToneAndMood(content);
    const intensity = getIntensity(content);

    if (!content.trim()) {
      ui.aiPatterns.textContent = "Patterns detected: waiting for more writing.";
      ui.aiAction.textContent = "Suggested action: write 3 lines about what felt heavy and what felt light today.";
      return;
    }

    const patterns = [];
    if (tone.mood === "Anxious") patterns.push("mental fatigue");
    if (tone.mood === "Frustrated") patterns.push("suppressed frustration");
    if (tone.mood === "Hopeful") patterns.push("optimism recovery");
    if (tone.mood === "Focused") patterns.push("goal-directed clarity");
    if (!patterns.length) patterns.push("reflective processing");

    ui.aiPatterns.textContent = `Patterns detected: ${patterns.join(", ")} · ${intensity} intensity · ${wordCount} words.`;

    if (tone.mood === "Anxious" || tone.mood === "Frustrated") {
      ui.aiAction.textContent = "Suggested action: take a low-stimulation evening and offload one unresolved thought.";
    } else if (tone.mood === "Hopeful") {
      ui.aiAction.textContent = "Suggested action: capture one concrete next step while this positive momentum is active.";
    } else {
      ui.aiAction.textContent = "Suggested action: summarize this entry in one sentence and identify tomorrow’s smallest action.";
    }
  }

  function closeNoteActionMenu() {
    if (!ui.noteActionMenu) return;
    ui.noteActionMenu.hidden = true;
    state.actionMenuEntryId = null;
  }

  function openNoteActionMenu(entryId, x, y) {
    const entry = getEntryById(entryId);
    if (!entry || !ui.noteActionMenu) return;

    state.actionMenuEntryId = Number(entryId);
    if (ui.noteActionDeleteBtn) ui.noteActionDeleteBtn.textContent = "Delete";
    if (ui.noteActionLockBtn) {
      ui.noteActionLockBtn.textContent = entry.is_locked ? "Change PIN lock" : "Lock note";
    }
    if (ui.noteActionRemoveLockBtn) ui.noteActionRemoveLockBtn.hidden = !entry.is_locked;
    if (ui.noteActionForgotPinBtn) ui.noteActionForgotPinBtn.hidden = !entry.is_locked;

    ui.noteActionMenu.hidden = false;

    const menuRect = ui.noteActionMenu.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, window.innerWidth - menuRect.width - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - menuRect.height - 8));

    ui.noteActionMenu.style.left = `${left}px`;
    ui.noteActionMenu.style.top = `${top}px`;
  }

  function closeActionModal() {
    if (!ui.actionModal) return;
    ui.actionModal.hidden = true;
    state.modalConfig = null;
    state.modalBusy = false;

    if (ui.actionFieldCurrent) ui.actionFieldCurrent.value = "";
    if (ui.actionFieldNew) ui.actionFieldNew.value = "";
    if (ui.actionFieldDelete) ui.actionFieldDelete.value = "";
    if (ui.actionFieldPassword) ui.actionFieldPassword.value = "";

    setModalFeedback("");
  }

  function openActionModal(config) {
    if (!ui.actionModal) return;

    state.modalConfig = {
      type: config.type,
      entryId: Number(config.entryId),
      requireCurrentPin: Boolean(config.requireCurrentPin),
      requireNewPin: Boolean(config.requireNewPin),
      requireDeletePin: Boolean(config.requireDeletePin),
      requireLoginPassword: Boolean(config.requireLoginPassword),
    };

    if (ui.actionModalTitle) ui.actionModalTitle.textContent = config.title || "Confirm action";
    if (ui.actionModalMessage) ui.actionModalMessage.textContent = config.message || "";
    if (ui.actionModalConfirmBtn) ui.actionModalConfirmBtn.textContent = config.confirmLabel || "Confirm";

    if (ui.actionFieldCurrentWrap) ui.actionFieldCurrentWrap.hidden = !state.modalConfig.requireCurrentPin;
    if (ui.actionFieldNewWrap) ui.actionFieldNewWrap.hidden = !state.modalConfig.requireNewPin;
    if (ui.actionFieldDeleteWrap) ui.actionFieldDeleteWrap.hidden = !state.modalConfig.requireDeletePin;
    if (ui.actionFieldPasswordWrap) ui.actionFieldPasswordWrap.hidden = !state.modalConfig.requireLoginPassword;

    if (ui.actionFieldCurrent) ui.actionFieldCurrent.value = "";
    if (ui.actionFieldNew) ui.actionFieldNew.value = "";
    if (ui.actionFieldDelete) ui.actionFieldDelete.value = "";
    if (ui.actionFieldPassword) ui.actionFieldPassword.value = "";

    setModalFeedback("");
    ui.actionModal.hidden = false;

    if (state.modalConfig.requireCurrentPin && ui.actionFieldCurrent) {
      ui.actionFieldCurrent.focus();
    } else if (state.modalConfig.requireNewPin && ui.actionFieldNew) {
      ui.actionFieldNew.focus();
    } else if (state.modalConfig.requireDeletePin && ui.actionFieldDelete) {
      ui.actionFieldDelete.focus();
    } else if (state.modalConfig.requireLoginPassword && ui.actionFieldPassword) {
      ui.actionFieldPassword.focus();
    } else {
      ui.actionModalConfirmBtn?.focus();
    }
  }

  function openDeleteFlow(entry) {
    if (!entry) return;

    if (entry.is_locked) {
      openActionModal({
        type: "delete",
        entryId: entry.id,
        title: "Delete locked note",
        message: "Enter your 4-digit PIN to delete this locked note. Deleted notes are archived privately.",
        requireDeletePin: true,
        confirmLabel: "Delete",
      });
    } else {
      openActionModal({
        type: "delete",
        entryId: entry.id,
        title: "Delete note",
        message: "Are you sure you want to delete this note? It will be moved to secure archive storage.",
        confirmLabel: "Delete",
      });
    }
  }

  function openLockFlow(entry) {
    if (!entry) return;

    if (entry.is_locked) {
      openActionModal({
        type: "lock",
        entryId: entry.id,
        title: "Change note PIN",
        message: "Enter the current PIN and set a new 4-digit PIN.",
        requireCurrentPin: true,
        requireNewPin: true,
        confirmLabel: "Update PIN",
      });
    } else {
      openActionModal({
        type: "lock",
        entryId: entry.id,
        title: "Lock this note",
        message: "Set a 4-digit PIN to protect this note.",
        requireNewPin: true,
        confirmLabel: "Lock Note",
      });
    }
  }


  function openRemoveLockFlow(entry) {
    if (!entry || !entry.is_locked) return;

    openActionModal({
      type: "remove_lock",
      entryId: entry.id,
      title: "Remove note lock",
      message: "Enter current 4-digit PIN to remove the lock from this note.",
      requireCurrentPin: true,
      confirmLabel: "Remove lock",
    });
  }

  function openForgotPinFlow(entry) {
    if (!entry || !entry.is_locked) return;

    openActionModal({
      type: "forgot_pin",
      entryId: entry.id,
      title: "Reset PIN using login password",
      message: "Enter your login password and set a new 4-digit PIN.",
      requireLoginPassword: true,
      requireNewPin: true,
      confirmLabel: "Reset PIN",
    });
  }

  function renderList() {
    if (!ui.list) return;
    ui.list.innerHTML = "";

    for (const entry of state.entries) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "journal-list-item-btn";
      if (Number(entry.id) === Number(state.selectedId)) {
        button.classList.add("active");
      }

      const titleRow = document.createElement("div");
      titleRow.className = "journal-list-title-row";

      const title = document.createElement("p");
      title.className = "journal-list-title";
      title.textContent = normalizeTitle(entry.title);
      titleRow.appendChild(title);

      button.appendChild(titleRow);

      button.addEventListener("click", () => {
        void switchToEntry(entry.id);
      });

      button.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openNoteActionMenu(entry.id, event.clientX, event.clientY);
      });

      button.addEventListener(
        "touchend",
        (event) => {
          const now = Date.now();
          const lastTap = Number(state.tapHistory[entry.id] || 0);
          state.tapHistory[entry.id] = now;

          if (now - lastTap < 320) {
            const touch = event.changedTouches && event.changedTouches[0];
            const x = touch ? touch.clientX : window.innerWidth / 2;
            const y = touch ? touch.clientY : window.innerHeight / 2;
            event.preventDefault();
            event.stopPropagation();
            openNoteActionMenu(entry.id, x, y);
          }
        },
        { passive: false }
      );

      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        openNoteActionMenu(entry.id, event.clientX, event.clientY);
      });

      li.appendChild(button);
      ui.list.appendChild(li);
    }

    if (ui.listEmpty) {
      ui.listEmpty.hidden = state.entries.length > 0;
    }
  }

  function renderEditor() {
    const entry = getSelectedEntry();
    const hasSelection = Boolean(entry);

    if (ui.editorPanel) {
      ui.editorPanel.classList.toggle("has-selection", hasSelection);
    }

    if (!entry) {
      if (ui.titleInput) {
        ui.titleInput.value = "";
        ui.titleInput.disabled = true;
      }
      if (ui.contentInput) {
        ui.contentInput.value = "";
        ui.contentInput.disabled = true;
      }
      if (ui.updatedAt) ui.updatedAt.textContent = "No journal selected";
      if (ui.lockState) ui.lockState.textContent = "Unlocked";
      if (ui.lockGate) ui.lockGate.hidden = true;
      if (ui.unlockPinInput) ui.unlockPinInput.value = "";
      setUnlockFeedback("");
      updateAiReflectionPreview();
      return;
    }

    const isLocked = Boolean(entry.is_locked);
    const unlockPin = state.unlockedPins[entry.id] || null;
    const unlocked = !isLocked || Boolean(unlockPin);

    if (ui.lockState) ui.lockState.textContent = isLocked ? "Locked" : "Unlocked";
    if (ui.updatedAt) ui.updatedAt.textContent = `Updated ${formatTimestamp(entry.updated_at)}`;

    if (ui.titleInput) {
      ui.titleInput.value = String(entry.title || "");
      ui.titleInput.disabled = !unlocked;
    }

    if (ui.contentInput) {
      ui.contentInput.value = unlocked ? String(entry.content || "") : "";
      ui.contentInput.disabled = !unlocked;
    }

    if (ui.lockGate) ui.lockGate.hidden = unlocked;

    if (!unlocked && ui.unlockPinInput) {
      ui.unlockPinInput.value = "";
      ui.unlockPinInput.focus();
    }

    if (unlocked) {
      if (ui.unlockPinInput) ui.unlockPinInput.value = "";
      setUnlockFeedback("");
    }

    updateAiReflectionPreview();
  }

  function renderAll() {
    sortEntries();
    renderEntryCount();
    renderConsent();
    renderList();
    renderEditor();
    renderDynamicPrompt();
  }

  function queueSave() {
    if (state.saveTimer) clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      void persistSelectedEntry({ force: true });
    }, 650);
  }

  function updateSelectedDraft() {
    const entry = getSelectedEntry();
    if (!entry) return;
    if (entry.is_locked && !state.unlockedPins[entry.id]) return;

    entry.title = String(ui.titleInput?.value || "");
    entry.content = normalizeContent(ui.contentInput?.value || "");
    state.dirty = true;
    setSaveState("Unsaved changes", "pending");
    renderList();
    updateAiReflectionPreview();
    queueSave();
  }

  async function persistSelectedEntry({ force = false, silent = false } = {}) {
    const entry = getSelectedEntry();
    if (!entry) return true;
    if (!force && !state.dirty) return true;

    if (entry.is_locked && !state.unlockedPins[entry.id]) {
      if (!silent) setSaveState("Unlock note to edit", "error");
      return false;
    }

    if (state.saving) {
      state.saveQueued = true;
      return false;
    }

    state.saving = true;
    if (!silent) setSaveState("Saving...", "pending");

    try {
      const body = {
        title: entry.title,
        content: entry.content,
      };

      if (entry.is_locked) {
        body.pin = state.unlockedPins[entry.id];
      }

      const response = await requestJSON(API.entry(entry.id), {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      const updated = response.entry || {};
      const index = state.entries.findIndex((item) => Number(item.id) === Number(updated.id));
      if (index >= 0) state.entries[index] = updated;

      state.selectedId = Number(updated.id || entry.id);
      state.dirty = false;
      renderAll();
      if (!silent) setSaveState("Saved", "success");
      return true;
    } catch (error) {
      if (error.status === 403 && entry.is_locked) {
        delete state.unlockedPins[entry.id];
        renderEditor();
      }
      if (!silent) setSaveState(error.message || "Failed to save", "error");
      return false;
    } finally {
      state.saving = false;
      if (state.saveQueued) {
        state.saveQueued = false;
        setTimeout(() => {
          void persistSelectedEntry({ force: true, silent });
        }, 0);
      }
    }
  }

  async function switchToEntry(nextId) {
    if (Number(nextId) === Number(state.selectedId)) return;
    await persistSelectedEntry({ force: true, silent: true });
    state.selectedId = Number(nextId);
    state.dirty = false;
    renderAll();
    setSaveState("All changes saved", "success");
    closeNoteActionMenu();
  }

  async function createEntry() {
    await persistSelectedEntry({ force: true, silent: true });
    setSaveState("Creating journal...", "pending");

    try {
      const response = await requestJSON(API.create, {
        method: "POST",
        body: JSON.stringify({ title: "", content: "" }),
      });

      if (response.entry) {
        state.entries.unshift(response.entry);
        state.selectedId = Number(response.entry.id);
        state.dirty = false;
        renderAll();
        setSaveState("New journal ready", "success");
        ui.titleInput?.focus();
      }
    } catch (error) {
      setSaveState(error.message || "Unable to create journal", "error");
    }
  }

  async function performDelete(entryId, pin = null) {
    const entry = getEntryById(entryId);
    if (!entry) return false;

    setSaveState("Deleting...", "pending");

    try {
      await requestJSON(API.entry(entry.id), {
        method: "DELETE",
        ...(pin ? { body: JSON.stringify({ pin }) } : {}),
      });

      state.entries = state.entries.filter((item) => Number(item.id) !== Number(entry.id));
      delete state.unlockedPins[entry.id];
      if (Number(state.selectedId) === Number(entry.id)) {
        state.selectedId = state.entries.length ? Number(state.entries[0].id) : null;
      }

      state.dirty = false;
      renderAll();
      setSaveState("Journal deleted", "success");
      return true;
    } catch (error) {
      setSaveState(error.message || "Unable to delete journal", "error");
      setModalFeedback(error.message || "Unable to delete note", "error");
      return false;
    }
  }

  async function performLock(entryId, payload) {
    const entry = getEntryById(entryId);
    if (!entry) return false;

    setSaveState(entry.is_locked ? "Updating lock..." : "Locking note...", "pending");

    try {
      const response = await requestJSON(API.lock(entry.id), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const updated = response.entry || {};
      const index = state.entries.findIndex((item) => Number(item.id) === Number(updated.id));
      if (index >= 0) state.entries[index] = updated;

      delete state.unlockedPins[entry.id];
      if (Number(state.selectedId) === Number(entry.id)) {
        state.selectedId = Number(entry.id);
      }

      state.dirty = false;
      renderAll();
      setSaveState("Note locked", "success");
      return true;
    } catch (error) {
      setSaveState(error.message || "Unable to lock note", "error");
      setModalFeedback(error.message || "Unable to update lock", "error");
      return false;
    }
  }


  async function performRemoveLock(entryId, currentPin) {
    const entry = getEntryById(entryId);
    if (!entry) return false;

    setSaveState("Removing lock...", "pending");

    try {
      const response = await requestJSON(API.removeLock(entry.id), {
        method: "PATCH",
        body: JSON.stringify({ current_pin: currentPin }),
      });

      const updated = response.entry || {};
      const index = state.entries.findIndex((item) => Number(item.id) === Number(updated.id));
      if (index >= 0) state.entries[index] = updated;

      delete state.unlockedPins[entry.id];
      if (Number(state.selectedId) === Number(entry.id)) {
        state.selectedId = Number(entry.id);
      }

      state.dirty = false;
      renderAll();
      setSaveState("Lock removed", "success");
      return true;
    } catch (error) {
      setSaveState(error.message || "Unable to remove lock", "error");
      setModalFeedback(error.message || "Unable to remove lock", "error");
      return false;
    }
  }

  async function performForgotPinReset(entryId, loginPassword, newPin) {
    const entry = getEntryById(entryId);
    if (!entry) return false;

    setSaveState("Resetting PIN...", "pending");

    try {
      const response = await requestJSON(API.resetPin(entry.id), {
        method: "PATCH",
        body: JSON.stringify({ login_password: loginPassword, new_pin: newPin }),
      });

      const updated = response.entry || {};
      const index = state.entries.findIndex((item) => Number(item.id) === Number(updated.id));
      if (index >= 0) state.entries[index] = updated;

      delete state.unlockedPins[entry.id];
      if (Number(state.selectedId) === Number(entry.id)) {
        state.selectedId = Number(entry.id);
      }

      state.dirty = false;
      renderAll();
      setSaveState("PIN reset complete", "success");
      return true;
    } catch (error) {
      setSaveState(error.message || "Unable to reset PIN", "error");
      setModalFeedback(error.message || "Unable to reset PIN", "error");
      return false;
    }
  }

  async function confirmActionModal() {
    if (!state.modalConfig || state.modalBusy) return;

    const cfg = state.modalConfig;
    const entry = getEntryById(cfg.entryId);
    if (!entry) {
      closeActionModal();
      return;
    }

    let currentPin = null;
    let newPin = null;
    let deletePin = null;
    let loginPassword = "";

    if (cfg.requireCurrentPin) {
      currentPin = normalizePin(ui.actionFieldCurrent?.value || "");
      if (!currentPin) {
        setModalFeedback("Current PIN must be exactly 4 digits.", "error");
        return;
      }
    }

    if (cfg.requireNewPin) {
      newPin = normalizePin(ui.actionFieldNew?.value || "");
      if (!newPin) {
        setModalFeedback("New PIN must be exactly 4 digits.", "error");
        return;
      }
    }

    if (cfg.requireDeletePin) {
      deletePin = normalizePin(ui.actionFieldDelete?.value || "");
      if (!deletePin) {
        setModalFeedback("PIN must be exactly 4 digits.", "error");
        return;
      }
    }

    if (cfg.requireLoginPassword) {
      loginPassword = String(ui.actionFieldPassword?.value || "");
      if (!loginPassword) {
        setModalFeedback("Login password is required.", "error");
        return;
      }
    }

    state.modalBusy = true;
    if (ui.actionModalConfirmBtn) ui.actionModalConfirmBtn.disabled = true;
    if (ui.actionModalCancelBtn) ui.actionModalCancelBtn.disabled = true;

    let ok = false;
    if (cfg.type === "delete") {
      ok = await performDelete(entry.id, deletePin);
    } else if (cfg.type === "lock") {
      const payload = cfg.requireCurrentPin ? { current_pin: currentPin, pin: newPin } : { pin: newPin };
      ok = await performLock(entry.id, payload);
    } else if (cfg.type === "remove_lock") {
      ok = await performRemoveLock(entry.id, currentPin);
    } else if (cfg.type === "forgot_pin") {
      ok = await performForgotPinReset(entry.id, loginPassword, newPin);
    }

    if (ui.actionModalConfirmBtn) ui.actionModalConfirmBtn.disabled = false;
    if (ui.actionModalCancelBtn) ui.actionModalCancelBtn.disabled = false;
    state.modalBusy = false;

    if (ok) {
      closeActionModal();
    }
  }

  async function unlockSelectedEntry() {
    const entry = getSelectedEntry();
    if (!entry || !entry.is_locked) return;

    const pin = normalizePin(ui.unlockPinInput?.value || "");
    if (!pin) {
      setUnlockFeedback("Enter a valid 4-digit pin.", "error");
      return;
    }

    setUnlockFeedback("Unlocking...", "success");

    try {
      const response = await requestJSON(API.unlock(entry.id), {
        method: "POST",
        body: JSON.stringify({ pin }),
      });

      const updated = response.entry || {};
      const index = state.entries.findIndex((item) => Number(item.id) === Number(updated.id));
      if (index >= 0) state.entries[index] = updated;

      state.unlockedPins[entry.id] = pin;
      renderAll();
      setUnlockFeedback("Unlocked", "success");
      setSaveState("Note unlocked", "success");
      if (ui.unlockPinInput) ui.unlockPinInput.value = "";
      ui.titleInput?.focus();
    } catch (error) {
      if (ui.unlockPinInput) ui.unlockPinInput.value = "";
      setUnlockFeedback(error.message || "Incorrect pin", "error");
      setSaveState(error.message || "Unable to unlock note", "error");
    }
  }

  async function updateAiConsent(allow) {
    ui.allowBtn && (ui.allowBtn.disabled = true);
    ui.denyBtn && (ui.denyBtn.disabled = true);

    try {
      const response = await requestJSON(API.aiConsent, {
        method: "PATCH",
        body: JSON.stringify({ allow }),
      });

      const payload = response.journal || {};
      if (typeof payload.ai_sharing_enabled === "boolean") {
        state.aiSharing = payload.ai_sharing_enabled;
      } else {
        state.aiSharing = Boolean(allow);
      }

      renderConsent();
      setSaveState("Privacy setting updated", "success");
    } catch (error) {
      setSaveState(error.message || "Unable to update privacy setting", "error");
    } finally {
      ui.allowBtn && (ui.allowBtn.disabled = false);
      ui.denyBtn && (ui.denyBtn.disabled = false);
    }
  }

  function bindUI() {
    ui.createBtn?.addEventListener("click", () => {
      void createEntry();
    });

    ui.titleInput?.addEventListener("input", updateSelectedDraft);
    ui.contentInput?.addEventListener("input", updateSelectedDraft);

    ui.allowBtn?.addEventListener("click", () => {
      void updateAiConsent(true);
    });

    ui.denyBtn?.addEventListener("click", () => {
      void updateAiConsent(false);
    });

    ui.unlockBtn?.addEventListener("click", () => {
      void unlockSelectedEntry();
    });

    ui.unlockPinInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void unlockSelectedEntry();
      }
    });

    ui.noteActionDeleteBtn?.addEventListener("click", () => {
      if (state.actionMenuEntryId != null) {
        const entry = getEntryById(state.actionMenuEntryId);
        if (entry) openDeleteFlow(entry);
      }
      closeNoteActionMenu();
    });

    ui.noteActionLockBtn?.addEventListener("click", () => {
      if (state.actionMenuEntryId != null) {
        const entry = getEntryById(state.actionMenuEntryId);
        if (entry) openLockFlow(entry);
      }
      closeNoteActionMenu();
    });

    ui.noteActionRemoveLockBtn?.addEventListener("click", () => {
      if (state.actionMenuEntryId != null) {
        const entry = getEntryById(state.actionMenuEntryId);
        if (entry) openRemoveLockFlow(entry);
      }
      closeNoteActionMenu();
    });

    ui.noteActionForgotPinBtn?.addEventListener("click", () => {
      if (state.actionMenuEntryId != null) {
        const entry = getEntryById(state.actionMenuEntryId);
        if (entry) openForgotPinFlow(entry);
      }
      closeNoteActionMenu();
    });

    ui.actionModalCancelBtn?.addEventListener("click", () => {
      closeActionModal();
    });

    ui.actionModalConfirmBtn?.addEventListener("click", () => {
      void confirmActionModal();
    });

    [ui.actionFieldCurrent, ui.actionFieldNew, ui.actionFieldDelete, ui.actionFieldPassword].forEach((input) => {
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void confirmActionModal();
        }
      });
    });

    ui.actionFieldPassword?.addEventListener("focus", () => {
      if (ui.actionFieldPassword) ui.actionFieldPassword.value = "";
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("#noteActionMenu")) {
        closeNoteActionMenu();
      }
      if (!target.closest(".note-action-dialog") && target.closest("#noteActionModal")) {
        closeActionModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeNoteActionMenu();
        closeActionModal();
      }
    });

    window.addEventListener("scroll", closeNoteActionMenu, { passive: true });
    window.addEventListener("resize", () => {
      closeNoteActionMenu();
      closeActionModal();
    });

    window.addEventListener("beforeunload", (event) => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        void persistSelectedEntry({ force: true, silent: true });
      }
    });
  }

  async function bootstrap() {
    const response = await requestJSON(API.bootstrap);

    state.aiSharing =
      typeof response.ai_sharing_enabled === "boolean" ? response.ai_sharing_enabled : null;

    state.entries = Array.isArray(response.entries)
      ? response.entries.map((entry) => ({
          id: Number(entry.id),
          title: String(entry.title || ""),
          content: normalizeContent(entry.content || ""),
          snippet: buildSnippet(entry.content || ""),
          share_with_ai: Boolean(entry.share_with_ai),
          is_locked: Boolean(entry.is_locked),
          owner_user_id: Number(entry.owner_user_id || 0),
          owner_username: String(entry.owner_username || ""),
          owner_name: String(entry.owner_name || ""),
          created_at: entry.created_at || "",
          updated_at: entry.updated_at || "",
        }))
      : [];

    state.selectedId = state.entries.length ? Number(state.entries[0].id) : null;
    state.dirty = false;

    renderAll();
    setSaveState(state.entries.length ? "All changes saved" : "Create a journal to begin", "success");
  }

  async function init() {
    if (!ui.root) return;
    bindUI();
    renderDynamicPrompt();
    updateAiReflectionPreview();

    try {
      await loadEmotionalContext();
      await bootstrap();
    } catch (error) {
      setSaveState(error.message || "Failed to load journal", "error");
    }
  }

  init();
})();
