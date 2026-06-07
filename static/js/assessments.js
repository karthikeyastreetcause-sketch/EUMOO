(function () {
  "use strict";

  const API = {
    bootstrap: "/api/assessments/bootstrap",
    start: "/api/assessments/start",
    answer: "/api/assessments/answer",
    submit: "/api/assessments/submit",
  };

  const ui = {
    notice: document.getElementById("kyNotice"),
    traitCount: document.getElementById("kyTraitCount"),
    questionCount: document.getElementById("kyQuestionCount"),
    traitList: document.getElementById("kyTraitList"),
    latestResultHint: document.getElementById("kyLatestResultHint"),

    introStage: document.getElementById("kyIntroStage"),
    questionStage: document.getElementById("kyQuestionStage"),
    resultStage: document.getElementById("kyResultStage"),

    startBtn: document.getElementById("kyStartBtn"),
    retakeBtn: document.getElementById("kyRetakeBtn"),
    submitBtn: document.getElementById("kySubmitBtn"),

    questionProgress: document.getElementById("kyQuestionProgress"),
    progressFill: document.getElementById("kyProgressFill"),
    traitBadge: document.getElementById("kyTraitBadge"),
    questionText: document.getElementById("kyQuestionText"),
    optionsWrap: document.getElementById("kyOptionsWrap"),
    answeredMeta: document.getElementById("kyAnsweredMeta"),

    resultTitle: document.getElementById("kyResultTitle"),
    resultDescription: document.getElementById("kyResultDescription"),
    resultLabel: document.getElementById("kyResultLabel"),
    positiveScore: document.getElementById("kyPositiveScore"),
    negativeScore: document.getElementById("kyNegativeScore"),
    topPositive: document.getElementById("kyTopPositive"),
    topNegative: document.getElementById("kyTopNegative"),
    traitBars: document.getElementById("kyTraitBars"),
    insightLines: document.getElementById("kyInsightLines"),
  };

  const state = {
    boot: null,
    sessionId: null,
    totalQuestions: 0,
    answeredCount: 0,
    currentQuestion: null,
    isBusy: false,
  };

  async function requestJson(url, config) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      ...config,
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_err) {
      data = {};
    }

    if (!response.ok || data.ok !== true) {
      throw new Error(data.message || "Something went wrong. Please retry.");
    }
    return data;
  }

  function showNotice(message) {
    if (!ui.notice) return;
    if (!message) {
      ui.notice.hidden = true;
      ui.notice.textContent = "";
      return;
    }
    ui.notice.hidden = false;
    ui.notice.textContent = message;
  }

  function switchStage(stage) {
    ui.introStage.hidden = stage !== "intro";
    ui.questionStage.hidden = stage !== "question";
    ui.resultStage.hidden = stage !== "result";
  }

  function formatPercent(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return "0%";
    return `${Math.round(num)}%`;
  }

  function renderTraitList(traits) {
    if (!ui.traitList) return;
    ui.traitList.innerHTML = "";
    const list = Array.isArray(traits) ? traits : [];

    list.forEach((trait) => {
      const item = document.createElement("li");
      const groupLabel = trait.trait_group === "positive" ? "Green" : trait.trait_group === "negative" ? "Red" : "Neutral";
      item.textContent = `${trait.trait} · ${trait.question_count} questions · ${groupLabel}`;
      ui.traitList.appendChild(item);
    });
  }

  function renderLatestResultHint(result) {
    if (!ui.latestResultHint) return;
    if (!result || typeof result !== "object") {
      ui.latestResultHint.hidden = true;
      ui.latestResultHint.textContent = "";
      return;
    }

    const title = result.personality?.title || "Previous session";
    const label = result.summary?.final_label || "Balanced";
    ui.latestResultHint.hidden = false;
    ui.latestResultHint.textContent = `Last result: ${title} (${label})`;
  }

  function updateProgress() {
    if (!ui.questionProgress || !ui.answeredMeta || !ui.progressFill) return;

    const total = Math.max(0, Number(state.totalQuestions || 0));
    const answered = Math.max(0, Number(state.answeredCount || 0));
    const isComplete = total > 0 && answered >= total;

    if (isComplete) {
      ui.questionProgress.textContent = `All questions answered (${total}/${total})`;
    } else {
      ui.questionProgress.textContent = `Question ${Math.min(answered + 1, total)} / ${total}`;
    }
    ui.answeredMeta.textContent = `Answered ${answered} / ${total}`;
    const pct = total > 0 ? Math.min(100, (answered / total) * 100) : 0;
    ui.progressFill.style.width = `${pct}%`;
  }

  function setBusy(flag) {
    state.isBusy = Boolean(flag);
    if (ui.startBtn) ui.startBtn.disabled = state.isBusy;
    if (ui.submitBtn) ui.submitBtn.disabled = state.isBusy;
    if (ui.retakeBtn) ui.retakeBtn.disabled = state.isBusy;
    Array.from(ui.optionsWrap?.querySelectorAll("button") || []).forEach((button) => {
      button.disabled = state.isBusy;
    });
  }

  function renderQuestion(question) {
    state.currentQuestion = question || null;
    updateProgress();
    if (!question) {
      ui.traitBadge.textContent = "Completed";
      ui.questionText.textContent = "Great job. Submit now to see your Know Yourself profile.";
      ui.optionsWrap.innerHTML = "";
      ui.submitBtn.hidden = false;
      return;
    }

    ui.submitBtn.hidden = true;
    const groupLabel = question.trait_group === "positive" ? "Green Trait" : question.trait_group === "negative" ? "Red Trait" : "Trait";
    ui.traitBadge.textContent = `${question.trait} · ${groupLabel}`;
    ui.questionText.textContent = question.question_text || "Question unavailable.";
    ui.optionsWrap.innerHTML = "";

    (question.options || []).forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ky-option-btn";
      button.innerHTML = `<span class="ky-option-key">${option.key}.</span>${option.text}`;
      button.addEventListener("click", () => answerQuestion(option.key));
      ui.optionsWrap.appendChild(button);
    });
  }

  async function bootstrap() {
    showNotice("");
    const data = await requestJson(API.bootstrap);
    state.boot = data;

    const traits = data.traits || [];
    if (ui.traitCount) ui.traitCount.textContent = String(data.total_traits || traits.length || "--");
    if (ui.questionCount) ui.questionCount.textContent = String(data.target_total_questions || "--");

    renderTraitList(traits);
    renderLatestResultHint(data.latest_result);
  }

  async function startAssessment() {
    if (state.isBusy) return;
    setBusy(true);
    showNotice("");

    try {
      const data = await requestJson(API.start, {
        method: "POST",
        body: JSON.stringify({}),
      });

      state.sessionId = data.session?.id || null;
      state.totalQuestions = Number(data.session?.total_questions || 0);
      state.answeredCount = Number(data.session?.answered_count || 0);

      switchStage("question");
      renderQuestion(data.current_question || null);
    } catch (error) {
      showNotice(error.message || "Unable to start assessment right now.");
      switchStage("intro");
    } finally {
      setBusy(false);
    }
  }

  async function answerQuestion(optionKey) {
    if (!state.sessionId || !state.currentQuestion || state.isBusy) return;
    setBusy(true);
    showNotice("");

    try {
      const data = await requestJson(API.answer, {
        method: "POST",
        body: JSON.stringify({
          session_id: state.sessionId,
          question_id: state.currentQuestion.question_id,
          selected_option: optionKey,
        }),
      });

      state.answeredCount = Number(data.session?.answered_count || state.answeredCount);
      const done = Boolean(data.session?.is_complete);

      if (done) {
        renderQuestion(null);
      } else {
        renderQuestion(data.next_question || null);
      }
    } catch (error) {
      showNotice(error.message || "Unable to save answer.");
    } finally {
      setBusy(false);
    }
  }

  function renderTraitBars(traitScores) {
    if (!ui.traitBars) return;
    ui.traitBars.innerHTML = "";

    traitScores.forEach((item, index) => {
      const row = document.createElement("article");
      row.className = "ky-trait-row";
      row.style.animation = `fadeUp 280ms var(--ease) both`;
      row.style.animationDelay = `${Math.min(index * 35, 420)}ms`;

      const userClass = item.trait_group === "positive" ? "user-positive" : item.trait_group === "negative" ? "user-negative" : "population";

      row.innerHTML = `
        <div class="ky-trait-name">${item.trait}</div>
        <div class="ky-bars-wrap">
          <div class="ky-bar-line"><span class="ky-bar-fill ${userClass}" data-target="${Math.max(0, Math.min(100, Number(item.score_percent || 0)))}"></span></div>
          <div class="ky-bar-line"><span class="ky-bar-fill population" data-target="${Math.max(0, Math.min(100, Number(item.population_average || 0)))}"></span></div>
          <div class="ky-bar-meta">
            <span>You: ${formatPercent(item.score_percent)}</span>
            <span>Population: ${formatPercent(item.population_average)}</span>
          </div>
        </div>
      `;
      ui.traitBars.appendChild(row);
    });

    requestAnimationFrame(() => {
      Array.from(ui.traitBars.querySelectorAll(".ky-bar-fill")).forEach((fill) => {
        const target = Number(fill.getAttribute("data-target") || 0);
        fill.style.width = `${Math.max(0, Math.min(100, target))}%`;
      });
    });
  }

  function renderRankList(targetEl, list, scoreKey) {
    if (!targetEl) return;
    targetEl.innerHTML = "";
    const safeList = Array.isArray(list) ? list : [];
    if (!safeList.length) {
      const li = document.createElement("li");
      li.textContent = "No data yet.";
      targetEl.appendChild(li);
      return;
    }

    safeList.forEach((item) => {
      const li = document.createElement("li");
      const value = formatPercent(item[scoreKey]);
      li.textContent = `${item.trait} · ${value}`;
      targetEl.appendChild(li);
    });
  }

  function renderInsightLines(lines) {
    if (!ui.insightLines) return;
    ui.insightLines.innerHTML = "";
    (Array.isArray(lines) ? lines : []).forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      ui.insightLines.appendChild(li);
    });
  }

  function renderResult(result) {
    const summary = result.summary || {};
    const personality = result.personality || {};
    const insights = result.insights || {};
    const traitScores = Array.isArray(result.trait_scores) ? result.trait_scores : [];

    ui.resultTitle.textContent = personality.title || "The Real One";
    ui.resultDescription.textContent = personality.description || "You are a mix in motion.";
    ui.resultLabel.textContent = summary.final_label || "Balanced";
    ui.resultLabel.setAttribute("data-label", summary.final_label || "Balanced");
    ui.positiveScore.textContent = formatPercent(summary.positive_score);
    ui.negativeScore.textContent = formatPercent(summary.negative_score);

    renderRankList(ui.topPositive, insights.top_positive_traits, "score_percent");
    renderRankList(ui.topNegative, insights.top_negative_traits, "score_percent");
    renderTraitBars(traitScores);
    renderInsightLines(insights.summary_lines || []);
  }

  async function submitAssessment() {
    if (!state.sessionId || state.isBusy) return;
    setBusy(true);
    showNotice("");

    try {
      const data = await requestJson(API.submit, {
        method: "POST",
        body: JSON.stringify({ session_id: state.sessionId }),
      });

      renderResult(data.result || {});
      switchStage("result");
    } catch (error) {
      showNotice(error.message || "Unable to submit assessment.");
    } finally {
      setBusy(false);
    }
  }

  function bindEvents() {
    ui.startBtn?.addEventListener("click", startAssessment);
    ui.submitBtn?.addEventListener("click", submitAssessment);
    ui.retakeBtn?.addEventListener("click", () => {
      switchStage("intro");
      state.sessionId = null;
      state.totalQuestions = 0;
      state.answeredCount = 0;
      state.currentQuestion = null;
      bootstrap().catch((error) => showNotice(error.message || "Unable to refresh."));
    });
  }

  async function init() {
    bindEvents();
    switchStage("intro");
    showNotice("");
    try {
      await bootstrap();
    } catch (error) {
      showNotice(error.message || "Failed to load assessment module.");
    }
  }

  init();
})();
