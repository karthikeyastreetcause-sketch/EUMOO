(function () {
  "use strict";

  const API = {
    bootstrap: "/api/dashboard/bootstrap",
    mood: "/api/dashboard/mood",
    goals: "/api/dashboard/goals",
    reflection: "/api/dashboard/reflection",
    reflectionPrompt: "/api/dashboard/reflection/prompt",
    event: "/api/dashboard/event",
    echoChat: "/api/dashboard/echo",
  };

  const MOOD_NOTES = {
    Calm: "Steady and clear.",
    Focused: "Sharp attention and momentum.",
    Anxious: "Mind feels noisy right now.",
    Tired: "Energy is low. Keep it gentle.",
    Hopeful: "Optimistic and moving forward.",
  };

  const MOOD_COLORS = {
    Calm: "#75b7a8",
    Focused: "#6f8ed8",
    Anxious: "#cc7b72",
    Tired: "#9a86c5",
    Hopeful: "#caa65a",
  };

  const STORAGE_KEYS = {
    uiMode: "eumo_dashboard_ui_mode_v1",
    sound: "eumo_dashboard_sound_v1",
    openingSeen: "eumo_dashboard_opening_seen_v1",
  };

  const ui = {
    root: document.getElementById("dashboardRoot"),
    userName: document.getElementById("dashboardUserName"),
    notice: document.getElementById("dashboardNotice"),

    clockHours: document.getElementById("clockHours"),
    clockMinutes: document.getElementById("clockMinutes"),
    clockSeconds: document.getElementById("clockSeconds"),

    streakValue: document.getElementById("streakValue"),
    streakEvolutionText: document.getElementById("streakEvolutionText"),
    emotionalStabilityScore: document.getElementById("emotionalStabilityScore"),
    emotionalStabilityLabel: document.getElementById("emotionalStabilityLabel"),
    emotionalStabilityDelta: document.getElementById("emotionalStabilityDelta"),
    moodOrb: document.getElementById("moodOrb"),
    weatherIcon: document.getElementById("weatherIcon"),
    weatherTitle: document.getElementById("weatherTitle"),
    weatherDescription: document.getElementById("weatherDescription"),
    calmModeBtn: document.getElementById("calmModeBtn"),
    focusModeBtn: document.getElementById("focusModeBtn"),
    timelineList: document.getElementById("emotionalTimelineList"),
    achievementsList: document.getElementById("emotionalAchievementsList"),
    insightCards: document.getElementById("emotionalInsightCards"),
    dailyOpeningOverlay: document.getElementById("dailyOpeningOverlay"),
    dailyOpeningGreeting: document.getElementById("dailyOpeningGreeting"),
    dailyOpeningInsight: document.getElementById("dailyOpeningInsight"),

    toggleEmotionOptions: document.getElementById("toggleEmotionOptions"),
    emotionOptionsContainer: document.getElementById("emotionOptionsContainer"),
    emotionButtons: Array.from(document.querySelectorAll(".emotion-option-button")),
    selectedEmotionValue: document.getElementById("selectedEmotionValue"),
    selectedEmotionNote: document.getElementById("selectedEmotionNote"),
    moodLockText: document.getElementById("moodLockText"),

    weeklyProgressMini: document.getElementById("weeklyProgressMini"),
    weeklyCheckinsValue: document.getElementById("weeklyCheckinsValue"),
    weeklyConsistencyFill: document.getElementById("weeklyConsistencyFill"),
    weeklyProgressSub: document.getElementById("weeklyProgressSub"),

    checkinStatusBadge: document.getElementById("checkinStatusBadge"),
    checkInCompletionValue: document.getElementById("checkInCompletionValue"),
    checkInCompletionSub: document.getElementById("checkInCompletionSub"),

    stabilityMonthLabel: document.getElementById("stabilityMonthLabel"),
    lineGraphEmpty: document.getElementById("lineGraphEmpty"),
    stabilityLineGraph: document.getElementById("stabilityLineGraph"),

    barGraphEmpty: document.getElementById("barGraphEmpty"),
    weeklyBarGraph: document.getElementById("weeklyBarGraph"),

    emotionPieChart: document.getElementById("emotionPieChart"),
    emotionPieLegend: document.getElementById("emotionPieLegend"),

    goalForm: document.getElementById("goalForm"),
    goalInput: document.getElementById("goalInput"),
    microGoalsList: document.getElementById("microGoalsList"),

    contextSuggestionText: document.getElementById("contextSuggestionText"),

    refreshPromptBtn: document.getElementById("refreshPromptBtn"),
    reflectionPromptText: document.getElementById("reflectionPromptText"),
    reflectionForm: document.getElementById("reflectionForm"),
    reflectionAnswer: document.getElementById("reflectionAnswer"),
    reflectionFeedback: document.getElementById("reflectionFeedback"),

    quickActionFab: document.getElementById("quickActionFab"),
    echoChatOverlay: document.getElementById("echoChatOverlay"),
    echoChatPanel: document.getElementById("echoChatPanel"),
    echoChatClose: document.getElementById("echoChatClose"),
    echoChatMessages: document.getElementById("echoChatMessages"),
    echoChatForm: document.getElementById("echoChatForm"),
    echoChatInput: document.getElementById("echoChatInput"),
    echoSendBtn: document.getElementById("echoSendBtn"),
    graphTooltip: document.getElementById("graphTooltip"),
  };

  const state = {
    dashboard: null,
    selectedMood: null,
    moodLocked: false,
    serverTimeBaseMs: null,
    clientTimeBaseMs: null,
    clockTimer: null,
    echoOpen: false,
    echoSending: false,
    suggestionTypingTimer: null,
    orbParallaxBound: null,
    uiMode: "default",
    soundEnabled: false,
    audioCtx: null,
    audioPrimed: false,
  };

  function showNotice(message, type = "info") {
    if (!ui.notice) return;
    if (!message) {
      ui.notice.hidden = true;
      ui.notice.textContent = "";
      ui.notice.className = "dashboard-notice";
      return;
    }

    ui.notice.hidden = false;
    ui.notice.textContent = message;
    ui.notice.className = `dashboard-notice ${type === "error" ? "is-error" : type === "success" ? "is-success" : ""}`;
  }

  function normalizeMood(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    return ["Calm", "Focused", "Anxious", "Tired", "Hopeful"].find((m) => m.toLowerCase() === lower) || null;
  }

  function setMoodTheme(mood) {
    const normalized = normalizeMood(mood);
    ui.root.dataset.moodTheme = normalized ? normalized.toLowerCase() : "neutral";
  }

  function formatName(raw) {
    const clean = (raw || "").trim();
    if (!clean) return "Friend";
    return clean
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  function formatTimeParts(dateObj) {
    const pad = (v) => String(v).padStart(2, "0");
    return {
      h: pad(dateObj.getHours()),
      m: pad(dateObj.getMinutes()),
      s: pad(dateObj.getSeconds()),
    };
  }

  function readStorage(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (_err) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (_err) {
      // non-blocking
    }
  }

  function applyUiMode(modeName) {
    const mode = modeName === "calm" || modeName === "focus" ? modeName : "default";
    state.uiMode = mode;
    if (!ui.root) return;

    ui.root.dataset.uiMode = mode;
    ui.calmModeBtn?.classList.toggle("is-active", mode === "calm");
    ui.focusModeBtn?.classList.toggle("is-active", mode === "focus");

    if (ui.calmModeBtn) {
      ui.calmModeBtn.textContent = mode === "calm" ? "Exit Calm Mode" : "Enter Calm Mode";
    }
    if (ui.focusModeBtn) {
      ui.focusModeBtn.textContent = mode === "focus" ? "Exit Focus Mode" : "Enter Focus Mode";
    }
  }

  function initSoundState() {
    state.soundEnabled = readStorage(STORAGE_KEYS.sound, "0") === "1";
  }

  function primeAudio() {
    if (state.audioPrimed) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    try {
      state.audioCtx = state.audioCtx || new AudioCtx();
      state.audioPrimed = true;
      return true;
    } catch (_err) {
      return false;
    }
  }

  function playUiTone(type = "click") {
    if (!state.soundEnabled) return;
    if (!primeAudio() || !state.audioCtx) return;

    const ctx = state.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === "hover" ? "sine" : "triangle";
    osc.frequency.value = type === "hover" ? 420 : 560;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(type === "hover" ? 0.018 : 0.032, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === "hover" ? 0.09 : 0.13));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (type === "hover" ? 0.1 : 0.14));
  }

  function applyAdaptiveTheme(data) {
    if (!ui.root) return;
    const hour = new Date().getHours();
    let period = "day";
    if (hour < 6 || hour >= 22) period = "night";
    else if (hour >= 17) period = "evening";
    ui.root.dataset.dayPeriod = period;

    const score = Number(data?.emotional_stability?.score || 0);
    const intensity = score >= 80 ? "high" : score >= 60 ? "mid" : "low";
    ui.root.dataset.stabilityBand = intensity;
  }

  function getStabilityInterpretation(score) {
    const safe = Number(score);
    if (!Number.isFinite(safe)) return "No signal yet";
    if (safe >= 86) return "Calm and grounded";
    if (safe >= 76) return "Steady and focused";
    if (safe >= 66) return "Moderately stable";
    if (safe >= 56) return "Recovering rhythm";
    if (safe >= 46) return "Emotionally fatigued";
    return "Overwhelmed state";
  }

  function getStabilityDelta(points, latestScore) {
    const normalized = (Array.isArray(points) ? points : [])
      .map((item) => Number(item?.score))
      .filter((item) => Number.isFinite(item));

    if (normalized.length >= 2) {
      return Math.round(normalized[normalized.length - 1] - normalized[normalized.length - 2]);
    }

    if (normalized.length === 1 && Number.isFinite(latestScore)) {
      return Math.round(latestScore - normalized[0]);
    }

    return 0;
  }

  function setMoodOrbState(mood) {
    if (!ui.moodOrb) return;
    const normalized = normalizeMood(mood) || "Neutral";
    ui.moodOrb.dataset.mood = normalized.toLowerCase();
    const label = ui.moodOrb.querySelector(".mood-orb-label");
    if (label) {
      label.textContent = normalized === "Neutral" ? "Mood Pulse" : `${normalized} pulse`;
    }
  }

  function applyOrbDynamics(data) {
    if (!ui.moodOrb) return;
    const hour = new Date().getHours();
    const score = Number(data?.emotional_stability?.score || 0);
    const mood = normalizeMood(data?.mood?.today) || "Neutral";
    const streak = Number(data?.orb_context?.streak_days || 0);
    const journalToday = Number(data?.orb_context?.journal_today_count || 0);

    let phase = "stable";
    let speed = 3600;
    if (mood === "Anxious" || score <= 48) {
      phase = "anxious";
      speed = 1800;
    } else if (mood === "Tired" || score <= 60) {
      phase = "fatigued";
      speed = 4600;
    } else if (mood === "Focused" || score >= 82) {
      phase = "focused";
      speed = 3000;
    } else if (mood === "Calm") {
      phase = "calm";
      speed = 3900;
    }

    if (hour >= 22 || hour <= 4) {
      phase = phase === "anxious" ? "anxious" : "fatigued";
      speed += 700;
    }

    if (journalToday >= 1) {
      ui.moodOrb.dataset.journal = "active";
    } else {
      ui.moodOrb.dataset.journal = "idle";
    }

    if (streak >= 7) {
      ui.moodOrb.dataset.streak = "strong";
    } else {
      ui.moodOrb.dataset.streak = "normal";
    }

    ui.moodOrb.dataset.phase = phase;
    ui.moodOrb.style.setProperty("--orb-speed", `${Math.max(1600, speed)}ms`);
  }

  function typeSuggestionText(text) {
    if (!ui.contextSuggestionText) return;
    if (state.suggestionTypingTimer) {
      clearInterval(state.suggestionTypingTimer);
      state.suggestionTypingTimer = null;
    }

    const targetText = String(text || "");
    ui.contextSuggestionText.textContent = "";
    ui.contextSuggestionText.classList.add("is-typing");

    let idx = 0;
    state.suggestionTypingTimer = setInterval(() => {
      idx += 1;
      ui.contextSuggestionText.textContent = targetText.slice(0, idx);
      if (idx >= targetText.length) {
        clearInterval(state.suggestionTypingTimer);
        state.suggestionTypingTimer = null;
        ui.contextSuggestionText.classList.remove("is-typing");
      }
    }, 11);
  }

  function startServerClock(isoString) {
    const parsed = Date.parse(isoString || "");
    const serverNowMs = Number.isNaN(parsed) ? Date.now() : parsed;

    state.serverTimeBaseMs = serverNowMs;
    state.clientTimeBaseMs = Date.now();

    if (state.clockTimer) {
      clearInterval(state.clockTimer);
    }

    const tick = () => {
      const elapsed = Date.now() - state.clientTimeBaseMs;
      const now = new Date(state.serverTimeBaseMs + elapsed);
      const t = formatTimeParts(now);
      if (ui.clockHours) ui.clockHours.textContent = t.h;
      if (ui.clockMinutes) ui.clockMinutes.textContent = t.m;
      if (ui.clockSeconds) ui.clockSeconds.textContent = t.s;
    };

    tick();
    state.clockTimer = setInterval(tick, 1000);
  }

  async function requestJSON(url, options = {}) {
    const config = {
      method: options.method || "GET",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      credentials: "same-origin",
      ...options,
    };

    const response = await fetch(url, config);
    let data = {};
    try {
      data = await response.json();
    } catch (_err) {
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

  function logEvent(action, payload = {}) {
    try {
      fetch(API.event, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({ action, payload }),
      });
    } catch (_err) {
      // non-blocking
    }
  }

  function appendEchoMessage(role, text, extraClass = "") {
    if (!ui.echoChatMessages) return;
    const bubble = document.createElement("div");
    bubble.className = `echo-bubble ${role === "user" ? "echo-bubble-user" : "echo-bubble-assistant"} ${extraClass}`.trim();
    bubble.textContent = text;
    ui.echoChatMessages.appendChild(bubble);
    ui.echoChatMessages.scrollTop = ui.echoChatMessages.scrollHeight;
    return bubble;
  }

  function setEchoOpen(open) {
    if (!ui.echoChatPanel || !ui.echoChatOverlay) return;
    state.echoOpen = Boolean(open);
    ui.echoChatPanel.classList.toggle("is-open", state.echoOpen);
    ui.echoChatOverlay.classList.toggle("is-open", state.echoOpen);
    ui.echoChatPanel.setAttribute("aria-hidden", state.echoOpen ? "false" : "true");
    document.body.classList.toggle("echo-chat-open", state.echoOpen);

    if (state.echoOpen && ui.echoChatInput) {
      setTimeout(() => ui.echoChatInput.focus(), 80);
    }
  }

  async function requestEchoReply(messageText) {
    const data = await requestJSON(API.echoChat, {
      method: "POST",
      body: JSON.stringify({
        message: messageText,
        mood: state.selectedMood,
      }),
    });

    const text = typeof data.reply === "string" ? data.reply.trim() : "";
    return text || "I heard you. Try sharing a little more detail so I can help better.";
  }

  function renderMoodButtons(mood) {
    ui.emotionButtons.forEach((button) => {
      const isSelected = button.dataset.emotion === mood;
      button.classList.toggle("is-selected", isSelected);
      button.disabled = state.moodLocked;
    });
  }

  function renderMoodCard(data) {
    const mood = normalizeMood(data?.mood?.today);
    const locked = Boolean(data?.mood?.locked);

    state.selectedMood = mood;
    state.moodLocked = locked;

    if (ui.selectedEmotionValue) {
      ui.selectedEmotionValue.textContent = mood || "No check-in yet";
    }

    if (ui.selectedEmotionNote) {
      ui.selectedEmotionNote.textContent = mood
        ? (data?.mood?.note || MOOD_NOTES[mood] || "Captured for today.")
        : "Pick one mood for today.";
    }

    if (ui.moodLockText) {
      if (locked) {
        ui.moodLockText.textContent = "Today's mood already recorded. You can update again tomorrow.";
      } else {
        ui.moodLockText.textContent = "You can choose one mood today.";
      }
    }

    if (ui.toggleEmotionOptions) {
      ui.toggleEmotionOptions.disabled = locked;
      ui.toggleEmotionOptions.textContent = locked ? "Mood locked" : "Choose mood";
    }

    if (ui.emotionOptionsContainer) {
      ui.emotionOptionsContainer.hidden = true;
    }

    renderMoodButtons(mood);
    setMoodTheme(mood);
    setMoodOrbState(mood);
    try {
      if (mood) {
        localStorage.setItem("eumo_last_mood", mood);
      }
    } catch (_err) {
      // non-blocking
    }
  }

  function renderHeaderMetrics(data) {
    if (ui.userName) {
      const fallbackName = ui.root.dataset.username;
      ui.userName.textContent = formatName(data?.username || fallbackName);
    }

    if (ui.streakValue) {
      const streak = Number(data?.streak_days ?? 0);
      ui.streakValue.textContent = `${streak} ${streak === 1 ? "day" : "days"}`;
    }
    if (ui.streakEvolutionText) {
      ui.streakEvolutionText.textContent = data?.streak_evolution || "Your reflection rhythm is building.";
    }

    const score = Number(data?.emotional_stability?.score);
    if (ui.emotionalStabilityScore) {
      ui.emotionalStabilityScore.textContent = Number.isFinite(score) ? String(score) : "--";
    }

    if (ui.emotionalStabilityLabel) {
      ui.emotionalStabilityLabel.textContent = getStabilityInterpretation(score);
    }

    const delta = Number.isFinite(Number(data?.emotional_stability?.delta))
      ? Number(data?.emotional_stability?.delta)
      : getStabilityDelta(data?.emotional_stability?.line_points || [], score);
    if (ui.emotionalStabilityDelta) {
      const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
      const prefix = delta > 0 ? "+" : "";
      const trendLabel = data?.emotional_stability?.trend ? ` · ${data.emotional_stability.trend}` : "";
      ui.emotionalStabilityDelta.textContent = `${prefix}${delta} from yesterday${trendLabel}`;
      ui.emotionalStabilityDelta.dataset.trend = trend;
    }

    try {
      if (Number.isFinite(score)) {
        localStorage.setItem("eumo_last_stability_score", String(score));
      }
    } catch (_err) {
      // non-blocking
    }
  }

  function renderWeeklyProgress(data) {
    const activeDays = Number(data?.weekly_progress?.active_days ?? 0);
    const targetDays = Number(data?.weekly_progress?.target_days ?? 7) || 7;
    const percent = Math.max(0, Math.min(100, Math.round((activeDays / targetDays) * 100)));

    if (ui.weeklyProgressMini) {
      ui.weeklyProgressMini.textContent = `${percent}%`;
    }

    if (ui.weeklyCheckinsValue) {
      ui.weeklyCheckinsValue.textContent = `${activeDays} / ${targetDays}`;
    }

    if (ui.weeklyConsistencyFill) {
      requestAnimationFrame(() => {
        ui.weeklyConsistencyFill.style.width = `${percent}%`;
      });
    }

    if (ui.weeklyProgressSub) {
      if (activeDays === 0) {
        ui.weeklyProgressSub.textContent = "No login activity tracked this week yet.";
      } else {
        ui.weeklyProgressSub.textContent = `${targetDays - activeDays} day${targetDays - activeDays === 1 ? "" : "s"} left to hit weekly consistency.`;
      }
    }
  }

  function renderCheckinCard(data) {
    const checkin = data?.check_in || {};
    const completed = Boolean(checkin.completed);

    if (ui.checkinStatusBadge) {
      ui.checkinStatusBadge.textContent = completed ? "Completed" : "Pending";
      ui.checkinStatusBadge.className = `status-badge ${completed ? "is-complete" : "is-pending"}`;
    }

    if (ui.checkInCompletionValue) {
      ui.checkInCompletionValue.textContent = checkin.title || (completed ? "Check-in completed" : "Not completed");
    }

    if (ui.checkInCompletionSub) {
      ui.checkInCompletionSub.textContent =
        checkin.subtitle || (completed ? "Mood logged for today." : "Pick one mood to complete today's check-in.");
    }
  }

  function renderWeather(data) {
    const weather = data?.emotional_weather || {};
    if (ui.weatherIcon) ui.weatherIcon.textContent = weather.icon || "⛅";
    if (ui.weatherTitle) ui.weatherTitle.textContent = weather.headline || "Emotional weather unavailable";
    if (ui.weatherDescription) ui.weatherDescription.textContent = weather.detail || "Complete more check-ins to unlock weather signals.";
  }

  function renderTimeline(data) {
    if (!ui.timelineList) return;
    ui.timelineList.innerHTML = "";
    const list = Array.isArray(data?.emotional_timeline) ? data.emotional_timeline : [];

    if (!list.length) {
      const item = document.createElement("li");
      item.className = "timeline-item";
      item.innerHTML = `<p class="timeline-date">Today</p><p class="timeline-copy">${data?.empty_state_copy?.timeline || "Your emotional memory starts with one honest check-in."}</p>`;
      ui.timelineList.appendChild(item);
      return;
    }

    list.forEach((entry, index) => {
      const item = document.createElement("li");
      item.className = "timeline-item";
      item.style.animationDelay = `${Math.min(index * 80, 420)}ms`;
      item.innerHTML = `
        <p class="timeline-date">${entry.label || entry.date || "--"}</p>
        <p class="timeline-copy">${entry.message || "Pattern captured."}</p>
      `;
      ui.timelineList.appendChild(item);
    });
  }

  function renderAchievements(data) {
    if (!ui.achievementsList) return;
    ui.achievementsList.innerHTML = "";
    const list = Array.isArray(data?.emotional_achievements) ? data.emotional_achievements : [];

    if (!list.length) {
      const item = document.createElement("li");
      item.className = "achievement-item";
      item.innerHTML = `<div><p class="achievement-title">No achievements yet</p><p class="achievement-sub">${data?.empty_state_copy?.insights || "Keep showing up. Your pattern story becomes clearer with each entry."}</p></div>`;
      ui.achievementsList.appendChild(item);
      return;
    }

    list.forEach((entry, index) => {
      const target = Number(entry.target || 1) || 1;
      const progress = Math.max(0, Math.min(target, Number(entry.progress || 0)));
      const progressPct = Math.round((progress / target) * 100);
      const item = document.createElement("li");
      item.className = `achievement-item ${entry.unlocked ? "is-unlocked" : ""}`;
      item.style.animationDelay = `${Math.min(index * 70, 320)}ms`;
      item.innerHTML = `
        <div class="achievement-copy">
          <p class="achievement-title">${entry.title || "Achievement"}</p>
          <p class="achievement-sub">${entry.subtitle || ""}</p>
        </div>
        <div class="achievement-progress">
          <span>${entry.unlocked ? "Unlocked" : `${progress}/${target}`}</span>
          <div class="achievement-track"><span style="width:${progressPct}%"></span></div>
        </div>
      `;
      ui.achievementsList.appendChild(item);
    });
  }

  function renderInsightCards(data) {
    if (!ui.insightCards) return;
    ui.insightCards.innerHTML = "";
    const cards = Array.isArray(data?.emotional_insight_cards) ? data.emotional_insight_cards : [];

    cards.forEach((card, index) => {
      const node = document.createElement("article");
      node.className = "emotion-insight-card";
      node.style.animationDelay = `${Math.min(index * 90, 360)}ms`;
      node.innerHTML = `
        <p class="emotion-insight-title">${card.title || "Insight"}</p>
        <p class="emotion-insight-detail">${card.detail || ""}</p>
      `;
      ui.insightCards.appendChild(node);
    });
  }

  function showDailyOpening(data) {
    if (!ui.dailyOpeningOverlay || !ui.dailyOpeningGreeting || !ui.dailyOpeningInsight) return;
    const opening = data?.opening_experience;
    if (!opening || !opening.id) return;

    const seenToday = readStorage(STORAGE_KEYS.openingSeen, "");
    if (seenToday === String(opening.id)) return;

    ui.dailyOpeningGreeting.textContent = opening.greeting || "Welcome back.";
    ui.dailyOpeningInsight.textContent = opening.insight || "Your emotional rhythm is syncing.";
    ui.dailyOpeningOverlay.hidden = false;
    requestAnimationFrame(() => {
      ui.dailyOpeningOverlay.classList.add("is-open");
    });

    writeStorage(STORAGE_KEYS.openingSeen, String(opening.id));
    setTimeout(() => {
      ui.dailyOpeningOverlay.classList.remove("is-open");
      setTimeout(() => {
        ui.dailyOpeningOverlay.hidden = true;
      }, 280);
    }, 2100);
  }

  function renderContextSuggestion(data) {
    if (ui.contextSuggestionText) {
      const mood = normalizeMood(data?.mood?.today);
      const score = Number(data?.emotional_stability?.score || 0);
      let preface = "";
      if (mood === "Anxious" || score <= 48) {
        preface = "ECHO notices overload markers. ";
      } else if (mood === "Focused" || score >= 80) {
        preface = "ECHO notices a strong focus window. ";
      } else if (mood === "Calm") {
        preface = "ECHO notices a grounded rhythm. ";
      }
      typeSuggestionText(`${preface}${data?.context_suggestion || "Select today's emotional state to unlock personalized activity suggestions."}`);
    }
  }

  function renderReflectionPrompt(data) {
    if (ui.reflectionPromptText) {
      ui.reflectionPromptText.textContent = data?.reflection_prompt || "Choose today's mood to get a reflection prompt.";
    }
  }

  function renderGoals(goals, emptyText) {
    if (!ui.microGoalsList) return;

    ui.microGoalsList.innerHTML = "";
    const activeGoals = Array.isArray(goals) ? goals.filter((goal) => !goal?.is_done) : [];

    if (activeGoals.length === 0) {
      const empty = document.createElement("li");
      empty.className = "goal-item";
      empty.innerHTML = `<span class="goal-text">${emptyText || "Small intentional goals can slowly stabilize emotional momentum."}</span>`;
      ui.microGoalsList.appendChild(empty);
      return;
    }

    activeGoals.forEach((goal) => {
      const item = document.createElement("li");
      item.className = `goal-item ${goal.is_done ? "is-done" : ""}`;
      item.dataset.goalId = String(goal.id);

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "goal-toggle";
      toggleBtn.textContent = goal.is_done ? "✓" : "□";
      toggleBtn.setAttribute("aria-label", goal.is_done ? "Mark as not done" : "Mark as done");

      const text = document.createElement("span");
      text.className = "goal-text";
      text.textContent = goal.goal_text;

      toggleBtn.addEventListener("click", () => {
        toggleGoal(goal.id, !goal.is_done);
      });

      item.appendChild(toggleBtn);
      item.appendChild(text);
      ui.microGoalsList.appendChild(item);
    });
  }

  function getNumericScores(points) {
    return (points || [])
      .map((p) => (Number.isFinite(p.score) ? p.score : null))
      .filter((v) => v !== null);
  }

  function clearSvg(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function createSvgElement(tag, attrs = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, String(value));
      }
    });
    return element;
  }

  function hideGraphTooltip() {
    if (!ui.graphTooltip) return;
    ui.graphTooltip.hidden = true;
    ui.graphTooltip.classList.remove("is-visible");
  }

  function showGraphTooltip(event, title, value, color) {
    if (!ui.graphTooltip) return;
    ui.graphTooltip.innerHTML = `<strong>${title}</strong><span>${value}</span>`;
    ui.graphTooltip.style.setProperty("--tooltip-accent", color || "var(--mood-accent)");
    ui.graphTooltip.hidden = false;
    ui.graphTooltip.classList.add("is-visible");

    const rect = ui.graphTooltip.getBoundingClientRect();
    const x = Math.min(window.innerWidth - rect.width - 10, Math.max(10, event.clientX - rect.width / 2));
    const y = Math.max(10, event.clientY - rect.height - 14);

    ui.graphTooltip.style.left = `${x}px`;
    ui.graphTooltip.style.top = `${y}px`;
  }

  function animateLinePath(pathElement) {
    if (!pathElement || typeof pathElement.getTotalLength !== "function") return;
    const pathLength = pathElement.getTotalLength();
    pathElement.style.strokeDasharray = `${pathLength}`;
    pathElement.style.strokeDashoffset = `${pathLength}`;
    pathElement.style.opacity = "1";

    requestAnimationFrame(() => {
      pathElement.style.transition = "stroke-dashoffset 1050ms cubic-bezier(0.22, 1, 0.36, 1)";
      pathElement.style.strokeDashoffset = "0";
    });
  }

  function renderLineGraph(points) {
    const svg = ui.stabilityLineGraph;
    if (!svg) return;

    clearSvg(svg);
    const scores = getNumericScores(points);
    const hasData = scores.length > 0;

    if (ui.lineGraphEmpty) ui.lineGraphEmpty.hidden = hasData;
    svg.style.display = hasData ? "block" : "none";
    if (!hasData) return;

    const width = 900;
    const height = 280;
    const padL = 42;
    const padR = 20;
    const padT = 14;
    const padB = 34;
    const graphW = width - padL - padR;
    const graphH = height - padT - padB;

    const defs = createSvgElement("defs");
    const grad = createSvgElement("linearGradient", {
      id: "lineAreaGradient",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1",
    });
    grad.appendChild(createSvgElement("stop", { offset: "0%", "stop-color": "var(--mood-accent)", "stop-opacity": "0.28" }));
    grad.appendChild(createSvgElement("stop", { offset: "100%", "stop-color": "var(--mood-accent)", "stop-opacity": "0.03" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    [0, 25, 50, 75, 100].forEach((tick) => {
      const y = padT + ((100 - tick) / 100) * graphH;
      const line = createSvgElement("line", {
        x1: padL,
        y1: y,
        x2: width - padR,
        y2: y,
        class: "graph-grid-line",
      });
      svg.appendChild(line);

      const label = createSvgElement("text", {
        x: 6,
        y: y + 4,
        class: "graph-axis-label",
      });
      label.textContent = String(tick);
      svg.appendChild(label);
    });

    const step = points.length > 1 ? graphW / (points.length - 1) : graphW;
    const mapped = points.map((point, index) => {
      const x = padL + step * index;
      const score = Number.isFinite(point.score) ? point.score : null;
      const y = score === null ? null : padT + ((100 - score) / 100) * graphH;
      return { x, y, score, label: point.label || String(index + 1) };
    });

    const segments = [];
    let activeSegment = [];

    mapped.forEach((point) => {
      if (point.y === null) {
        if (activeSegment.length) segments.push(activeSegment);
        activeSegment = [];
        return;
      }
      activeSegment.push(point);
    });
    if (activeSegment.length) segments.push(activeSegment);

    segments.forEach((segment) => {
      if (segment.length < 2) {
        const solo = segment[0];
        const soloDot = createSvgElement("circle", {
          cx: solo.x,
          cy: solo.y,
          r: 4,
          class: "graph-line-dot",
        });
        soloDot.addEventListener("mouseenter", (event) => {
          showGraphTooltip(event, solo.label, `${solo.score}`, "var(--mood-accent)");
          soloDot.classList.add("is-hover");
        });
        soloDot.addEventListener("mousemove", (event) => {
          showGraphTooltip(event, solo.label, `${solo.score}`, "var(--mood-accent)");
        });
        soloDot.addEventListener("mouseleave", () => {
          soloDot.classList.remove("is-hover");
          hideGraphTooltip();
        });
        svg.appendChild(soloDot);
        return;
      }

      const lineD = segment
        .map((point, i) => `${i === 0 ? "M" : "L"}${point.x},${point.y}`)
        .join(" ");

      const areaD = `${lineD} L${segment[segment.length - 1].x},${height - padB} L${segment[0].x},${height - padB} Z`;

      svg.appendChild(createSvgElement("path", {
        d: areaD,
        class: "graph-line-area",
      }));

      const glowPath = createSvgElement("path", {
        d: lineD,
        class: "graph-line-glow",
      });
      svg.appendChild(glowPath);

      const linePath = createSvgElement("path", {
        d: lineD,
        class: "graph-line-path",
      });
      svg.appendChild(linePath);
      animateLinePath(linePath);

      segment.forEach((point) => {
        const dot = createSvgElement("circle", {
          cx: point.x,
          cy: point.y,
          r: 4,
          class: "graph-line-dot",
        });
        dot.addEventListener("mouseenter", (event) => {
          showGraphTooltip(event, point.label, `${point.score}`, "var(--mood-accent)");
          dot.classList.add("is-hover");
        });
        dot.addEventListener("mousemove", (event) => {
          showGraphTooltip(event, point.label, `${point.score}`, "var(--mood-accent)");
        });
        dot.addEventListener("mouseleave", () => {
          dot.classList.remove("is-hover");
          hideGraphTooltip();
        });
        svg.appendChild(dot);
      });
    });

    const labelIndexes = [0, Math.floor((mapped.length - 1) / 2), mapped.length - 1]
      .filter((value, idx, arr) => arr.indexOf(value) === idx);

    labelIndexes.forEach((idx) => {
      const point = mapped[idx];
      const label = createSvgElement("text", {
        x: point.x,
        y: height - 10,
        class: "graph-axis-label",
        "text-anchor": "middle",
      });
      label.textContent = point.label;
      svg.appendChild(label);
    });
  }

  function renderBarGraph(points) {
    const svg = ui.weeklyBarGraph;
    if (!svg) return;

    clearSvg(svg);
    const hasData = getNumericScores(points).length > 0;

    if (ui.barGraphEmpty) ui.barGraphEmpty.hidden = hasData;
    svg.style.display = hasData ? "block" : "none";
    if (!hasData) return;

    const width = 540;
    const height = 250;
    const padL = 30;
    const padR = 18;
    const padT = 14;
    const padB = 36;
    const graphW = width - padL - padR;
    const graphH = height - padT - padB;

    const defs = createSvgElement("defs");
    const grad = createSvgElement("linearGradient", {
      id: "barGrad",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1",
    });
    grad.appendChild(createSvgElement("stop", { offset: "0%", "stop-color": "var(--mood-accent)", "stop-opacity": "0.95" }));
    grad.appendChild(createSvgElement("stop", { offset: "100%", "stop-color": "#64a2c5", "stop-opacity": "0.88" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    const count = Math.max(points.length, 1);
    const slot = graphW / count;
    const barW = Math.max(18, slot - 10);

    points.forEach((point, index) => {
      const score = Number.isFinite(point.score) ? point.score : 0;
      const barH = Math.max(4, (score / 100) * graphH);
      const x = padL + slot * index + (slot - barW) / 2;
      const y = padT + (graphH - barH);

      const rect = createSvgElement("rect", {
        x,
        y,
        width: barW,
        height: barH,
        class: "graph-bar-rect graph-bar-animate",
      });

      if (!Number.isFinite(point.score)) {
        rect.setAttribute("fill", "rgba(50,57,99,0.22)");
      }

      rect.addEventListener("mouseenter", (event) => {
        const scoreLabel = Number.isFinite(point.score) ? `${point.score}` : "No check-in";
        showGraphTooltip(event, point.label || "--", scoreLabel, "var(--mood-accent)");
        rect.classList.add("is-hover");
      });
      rect.addEventListener("mousemove", (event) => {
        const scoreLabel = Number.isFinite(point.score) ? `${point.score}` : "No check-in";
        showGraphTooltip(event, point.label || "--", scoreLabel, "var(--mood-accent)");
      });
      rect.addEventListener("mouseleave", () => {
        rect.classList.remove("is-hover");
        hideGraphTooltip();
      });

      svg.appendChild(rect);

      const label = createSvgElement("text", {
        x: x + barW / 2,
        y: height - 10,
        class: "graph-axis-label",
        "text-anchor": "middle",
      });
      label.textContent = point.label || "--";
      svg.appendChild(label);
    });

    requestAnimationFrame(() => {
      Array.from(svg.querySelectorAll(".graph-bar-animate")).forEach((bar, index) => {
        bar.style.animationDelay = `${Math.min(index * 70, 520)}ms`;
      });
    });
  }

  function describeArc(cx, cy, radius, startAngle, endAngle) {
    const polarToCartesian = (centerX, centerY, r, angleDeg) => {
      const angle = ((angleDeg - 90) * Math.PI) / 180.0;
      return {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      };
    };

    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "L", cx, cy,
      "Z",
    ].join(" ");
  }

  function renderPieChart(segments) {
    const svg = ui.emotionPieChart;
    const legend = ui.emotionPieLegend;
    if (!svg || !legend) return;

    clearSvg(svg);
    legend.innerHTML = "";

    if (!Array.isArray(segments) || segments.length === 0) {
      const emptyCircle = createSvgElement("circle", {
        cx: 120,
        cy: 120,
        r: 76,
        fill: "rgba(255,255,255,0.78)",
        stroke: "rgba(50,57,99,0.18)",
        "stroke-dasharray": "5 5",
      });
      svg.appendChild(emptyCircle);

      const emptyText = document.createElement("li");
      emptyText.className = "pie-legend-item";
      emptyText.textContent = "No emotion distribution data yet.";
      legend.appendChild(emptyText);
      return;
    }

    const total = segments.reduce((acc, item) => acc + Number(item.count || 0), 0);
    let currentAngle = 0;

    segments.forEach((segment) => {
      const count = Number(segment.count || 0);
      const sweep = total > 0 ? (count / total) * 360 : 0;
      const start = currentAngle;
      const end = currentAngle + sweep;
      currentAngle = end;

      const mood = normalizeMood(segment.mood) || segment.mood;
      const color = MOOD_COLORS[mood] || "#6f7fc4";
      const pathData = describeArc(120, 120, 78, start, end);

      const path = createSvgElement("path", {
        d: pathData,
        fill: color,
        stroke: "rgba(255,255,255,0.86)",
        "stroke-width": 2,
      });
      svg.appendChild(path);

      const legendItem = document.createElement("li");
      legendItem.className = "pie-legend-item";
      legendItem.innerHTML = `<span class="pie-swatch" style="background:${color}"></span>${mood}: ${count}`;
      legend.appendChild(legendItem);
    });

    const inner = createSvgElement("circle", {
      cx: 120,
      cy: 120,
      r: 44,
      fill: "rgba(255,255,255,0.86)",
      stroke: "rgba(50,57,99,0.14)",
    });
    svg.appendChild(inner);

    const centerLabel = createSvgElement("text", {
      x: 120,
      y: 118,
      class: "graph-axis-label",
      "text-anchor": "middle",
      "font-size": 13,
    });
    centerLabel.textContent = "Month";
    svg.appendChild(centerLabel);

    const centerValue = createSvgElement("text", {
      x: 120,
      y: 136,
      class: "graph-axis-label",
      "text-anchor": "middle",
      "font-size": 12,
    });
    centerValue.textContent = String(total);
    svg.appendChild(centerValue);
  }

  function renderAnalytics(data) {
    const monthLabel = data?.emotional_stability?.month_label || "Current month";
    if (ui.stabilityMonthLabel) ui.stabilityMonthLabel.textContent = monthLabel;

    renderLineGraph(data?.emotional_stability?.line_points || []);
    renderBarGraph(data?.emotional_stability?.bar_points || []);
    renderPieChart(data?.emotional_stability?.pie_segments || []);
  }

  function applyDashboardData(payload) {
    if (!payload) return;

    state.dashboard = payload;
    renderHeaderMetrics(payload);
    renderMoodCard(payload);
    renderWeather(payload);
    renderWeeklyProgress(payload);
    renderCheckinCard(payload);
    renderAnalytics(payload);
    renderGoals(payload.micro_goals || [], payload?.empty_state_copy?.goals);
    renderTimeline(payload);
    renderAchievements(payload);
    renderInsightCards(payload);
    renderContextSuggestion(payload);
    renderReflectionPrompt(payload);
    applyOrbDynamics(payload);
    applyAdaptiveTheme(payload);

    if (payload.server_now) {
      startServerClock(payload.server_now);
    }

    showDailyOpening(payload);
  }

  async function loadDashboard() {
    const data = await requestJSON(API.bootstrap);
    applyDashboardData(data);
    showNotice("");
  }

  async function submitMood(mood) {
    if (state.moodLocked) {
      showNotice("Today's mood is already locked. You can choose again tomorrow.", "error");
      return;
    }

    try {
      const response = await requestJSON(API.mood, {
        method: "POST",
        body: JSON.stringify({ mood }),
      });
      applyDashboardData(response.dashboard || response);
      showNotice("Mood recorded for today.", "success");
      logEvent("mood_selected", { mood });
    } catch (error) {
      if (error.status === 409 && error.data?.dashboard) {
        applyDashboardData(error.data.dashboard);
      }
      showNotice(error.message || "Unable to save mood.", "error");
    }
  }

  async function addGoal(text) {
    const goalText = String(text || "").trim();
    if (goalText.length < 2) {
      showNotice("Goal text is too short.", "error");
      return;
    }

    try {
      const response = await requestJSON(API.goals, {
        method: "POST",
        body: JSON.stringify({ text: goalText }),
      });
      applyDashboardData(response.dashboard || response);
      if (ui.goalInput) ui.goalInput.value = "";
      showNotice("Goal added.", "success");
      logEvent("goal_added", { length: goalText.length });
    } catch (error) {
      showNotice(error.message || "Unable to add goal.", "error");
    }
  }

  async function toggleGoal(goalId, isDone) {
    try {
      const response = await requestJSON(`${API.goals}/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_done: Boolean(isDone) }),
      });
      applyDashboardData(response.dashboard || response);
      logEvent("goal_toggled", { goal_id: goalId, is_done: Boolean(isDone) });
    } catch (error) {
      showNotice(error.message || "Unable to update goal.", "error");
    }
  }

  async function refreshPrompt() {
    try {
      const mood = state.selectedMood || "";
      const query = mood ? `?mood=${encodeURIComponent(mood)}` : "";
      const response = await requestJSON(`${API.reflectionPrompt}${query}`);
      if (ui.reflectionPromptText) {
        ui.reflectionPromptText.textContent = response.prompt || "No prompt available right now.";
      }
      logEvent("prompt_refreshed", { mood: mood || null });
    } catch (error) {
      showNotice(error.message || "Unable to refresh prompt.", "error");
    }
  }

  async function submitReflection(answer, prompt) {
    const trimmedAnswer = String(answer || "").trim();
    const promptText = String(prompt || "").trim();

    if (trimmedAnswer.length < 2) {
      showNotice("Please write a short reflection before saving.", "error");
      return;
    }

    try {
      const response = await requestJSON(API.reflection, {
        method: "POST",
        body: JSON.stringify({
          mood: state.selectedMood,
          prompt: promptText,
          answer: trimmedAnswer,
        }),
      });

      if (ui.reflectionAnswer) ui.reflectionAnswer.value = "";
      if (ui.reflectionFeedback) {
        ui.reflectionFeedback.hidden = false;
        ui.reflectionFeedback.className = "reflection-feedback is-success";
        ui.reflectionFeedback.textContent = response.message || "Reflection saved.";
      }

      if (response.dashboard) {
        applyDashboardData(response.dashboard);
      }

      logEvent("reflection_saved", { mood: state.selectedMood, answer_length: trimmedAnswer.length });
    } catch (error) {
      if (ui.reflectionFeedback) {
        ui.reflectionFeedback.hidden = false;
        ui.reflectionFeedback.className = "reflection-feedback is-error";
        ui.reflectionFeedback.textContent = error.message || "Unable to save reflection.";
      }
      showNotice(error.message || "Unable to save reflection.", "error");
    }
  }

  function bindMoodActions() {
    if (ui.toggleEmotionOptions && ui.emotionOptionsContainer) {
      ui.toggleEmotionOptions.addEventListener("click", () => {
        if (state.moodLocked) return;
        const nextHidden = !ui.emotionOptionsContainer.hidden;
        ui.emotionOptionsContainer.hidden = nextHidden;
        logEvent("mood_options_toggled", { opened: !nextHidden });
      });

      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const inside = target.closest("#emotionOptionsContainer, #toggleEmotionOptions");
        if (!inside) ui.emotionOptionsContainer.hidden = true;
      });
    }

    ui.emotionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mood = normalizeMood(button.dataset.emotion);
        if (!mood) return;
        submitMood(mood);
      });
    });
  }

  function bindGoalActions() {
    if (!ui.goalForm) return;

    ui.goalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addGoal(ui.goalInput?.value || "");
    });
  }

  function bindReflectionActions() {
    if (ui.refreshPromptBtn) {
      ui.refreshPromptBtn.addEventListener("click", refreshPrompt);
    }

    if (ui.reflectionForm) {
      ui.reflectionForm.addEventListener("submit", (event) => {
        event.preventDefault();
        submitReflection(ui.reflectionAnswer?.value || "", ui.reflectionPromptText?.textContent || "");
      });
    }
  }

  function bindEchoChat() {
    if (
      !ui.quickActionFab ||
      !ui.echoChatPanel ||
      !ui.echoChatOverlay ||
      !ui.echoChatForm ||
      !ui.echoChatInput ||
      !ui.echoSendBtn
    ) {
      return;
    }

    ui.quickActionFab.addEventListener("click", () => {
      const next = !state.echoOpen;
      setEchoOpen(next);
      logEvent("echo_panel_toggled", { open: next });
    });

    ui.echoChatOverlay.addEventListener("click", () => {
      setEchoOpen(false);
    });

    ui.echoChatClose?.addEventListener("click", () => {
      setEchoOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.echoOpen) {
        setEchoOpen(false);
      }
    });

    ui.echoChatForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.echoSending) return;

      const text = String(ui.echoChatInput.value || "").trim();
      if (!text) return;

      state.echoSending = true;
      ui.echoSendBtn.disabled = true;
      ui.echoChatInput.value = "";
      appendEchoMessage("user", text);
      const pendingBubble = appendEchoMessage("assistant", "ECHO is reflecting...", "echo-bubble-typing");
      logEvent("echo_message_sent", { length: text.length });

      try {
        const reply = await requestEchoReply(text);
        if (pendingBubble && pendingBubble.classList.contains("echo-bubble-assistant")) {
          pendingBubble.classList.remove("echo-bubble-typing");
          pendingBubble.textContent = reply;
        } else {
          appendEchoMessage("assistant", reply);
        }
      } catch (error) {
        const failText = error.message || "ECHO is temporarily unavailable.";
        if (pendingBubble && pendingBubble.classList.contains("echo-bubble-assistant")) {
          pendingBubble.classList.remove("echo-bubble-typing");
          pendingBubble.textContent = failText;
        } else {
          appendEchoMessage("assistant", failText);
        }
      } finally {
        state.echoSending = false;
        ui.echoSendBtn.disabled = false;
        ui.echoChatInput.focus();
      }
    });
  }

  function bindModeActions() {
    const storedMode = readStorage(STORAGE_KEYS.uiMode, "default");
    applyUiMode(storedMode);
    initSoundState();

    ui.calmModeBtn?.addEventListener("click", () => {
      const next = state.uiMode === "calm" ? "default" : "calm";
      applyUiMode(next);
      writeStorage(STORAGE_KEYS.uiMode, next);
      playUiTone("click");
      logEvent("mode_changed", { mode: next });
    });

    ui.focusModeBtn?.addEventListener("click", () => {
      const next = state.uiMode === "focus" ? "default" : "focus";
      applyUiMode(next);
      writeStorage(STORAGE_KEYS.uiMode, next);
      playUiTone("click");
      logEvent("mode_changed", { mode: next });
    });

  }

  function bindGlobalUi() {
    document.addEventListener("scroll", hideGraphTooltip, true);
    document.addEventListener("touchstart", hideGraphTooltip, { passive: true });
    window.addEventListener("resize", hideGraphTooltip);

    if (ui.moodOrb && !state.orbParallaxBound) {
      state.orbParallaxBound = true;
      document.addEventListener("mousemove", (event) => {
        const nx = (event.clientX / window.innerWidth - 0.5) * 8;
        const ny = (event.clientY / window.innerHeight - 0.5) * 8;
        ui.moodOrb.style.setProperty("--orb-parallax-x", `${nx.toFixed(2)}px`);
        ui.moodOrb.style.setProperty("--orb-parallax-y", `${ny.toFixed(2)}px`);
      });
    }

    document.addEventListener("pointerdown", () => {
      primeAudio();
    }, { passive: true });

    document.addEventListener("pointerenter", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".sidebar-nav-link, .chip-btn, .mode-btn, .goal-toggle, .emotion-option-button, button")) {
        playUiTone("hover");
      }
    }, true);

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, .sidebar-nav-link, .floating-action-button")) {
        playUiTone("click");
      }
    }, true);
  }

  async function init() {
    if (!ui.root) return;
    ui.root.classList.add("is-loading");

    bindMoodActions();
    bindGoalActions();
    bindReflectionActions();
    bindEchoChat();
    bindModeActions();
    bindGlobalUi();

    try {
      await loadDashboard();
    } catch (error) {
      showNotice(error.message || "Unable to load dashboard data.", "error");
    } finally {
      ui.root.classList.remove("is-loading");
    }
  }

  init();
})();
