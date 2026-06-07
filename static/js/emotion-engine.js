(function (factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
    return;
  }

  if (typeof window !== "undefined") {
    window.EmotionEngine = factory();
  }
})(function () {
  "use strict";

  const PHASE_SCREENING = "screening";
  const PHASE_DEEP_DIVE = "deep-dive";

  class EmotionEngine {
    constructor(questions, options = {}) {
      this.config = this._buildConfig(options);
      this.questions = this._normalizeQuestions(Array.isArray(questions) ? questions : []);

      const { emotionMap, emotionOrder, questionsById } = this._buildEmotionStructure(this.questions);
      this.emotionMap = emotionMap;
      this.emotionOrder = emotionOrder;
      this.questionsById = questionsById;

      this._initializeSessionState();
    }

    start() {
      this._initializeSessionState();
      this.state.started = true;
      return this.getNextQuestion();
    }

    getNextQuestion() {
      if (!this.state.started) {
        this.state.started = true;
      }

      if (this.state.completed) {
        return null;
      }

      const existingQuestion = this._getCurrentQuestion();
      if (existingQuestion) {
        return this._toPublicQuestion(existingQuestion);
      }

      if (!this._hasRemainingQuestions()) {
        this.state.completed = true;
        return null;
      }

      this._updatePhase();
      const nextQuestion = this._selectNextQuestion();

      if (!nextQuestion) {
        this.state.completed = true;
        return null;
      }

      this.state.currentQuestionId = nextQuestion.id;
      return this._toPublicQuestion(nextQuestion);
    }

    answer(option) {
      if (this.state.completed) {
        return null;
      }

      const question = this._getCurrentQuestion();
      if (!question) {
        return this.getNextQuestion();
      }

      const selectedOption = this._resolveOption(question, option);
      if (!selectedOption) {
        return this._toPublicQuestion(question);
      }

      this.state.askedSet.add(question.id);
      this.state.answeredCount += 1;
      this.state.consecutiveSkips = 0;
      this.state.currentQuestionId = null;
      this.state.forceAlternateEmotion = null;

      const scoreIncrement = this._toFiniteNumber(selectedOption.score, 0);
      this.state.emotionScores[question.emotion] =
        this._toFiniteNumber(this.state.emotionScores[question.emotion], 0) + scoreIncrement;

      const answerIntensity = this._normalizeDepth(selectedOption.intensity, null);
      if (answerIntensity !== null) {
        this.state.lastIntensity = answerIntensity;
      } else if (question.type === "deep") {
        this.state.lastIntensity = question.depth;
      }

      this._decaySkipPenalties();
      this._updatePhase();

      if (this._shouldStop()) {
        this.state.completed = true;
        return null;
      }

      return this.getNextQuestion();
    }

    skip() {
      if (this.state.completed) {
        return null;
      }

      const question = this._getCurrentQuestion();
      if (!question) {
        return this.getNextQuestion();
      }

      this.state.askedSet.add(question.id);
      this.state.totalSkipped += 1;
      this.state.consecutiveSkips += 1;
      this.state.currentQuestionId = null;

      this.state.skipCount[question.emotion] =
        this._toFiniteNumber(this.state.skipCount[question.emotion], 0) + 1;

      this.state.skipPenalty[question.emotion] =
        this._toFiniteNumber(this.state.skipPenalty[question.emotion], 0) +
        this.config.skipPenaltyBoost;

      this.state.forceAlternateEmotion = question.emotion;
      this._updatePhase();

      if (!this._hasRemainingQuestions()) {
        this.state.completed = true;
        return null;
      }

      return this.getNextQuestion();
    }

    getResults() {
      const ranked = this._rankEmotionsByRawScore();
      const dominant = ranked[0] || null;
      const secondary = ranked[1] || null;

      return {
        emotionScores: { ...this.state.emotionScores },
        dominantEmotion: dominant ? dominant.emotion : null,
        secondaryEmotion: secondary ? secondary.emotion : null,
        severity: this._calculateSeverity(dominant ? dominant.score : 0),
        totalAnswered: this.state.answeredCount,
        totalSkipped: this.state.totalSkipped,
      };
    }

    _buildConfig(options) {
      const minAnswered = this._toFiniteNumber(options.minAnswered, 8);
      const maxAnswered = this._toFiniteNumber(options.maxAnswered, 15);

      return {
        minAnswered: Math.max(1, Math.floor(minAnswered)),
        maxAnswered: Math.max(Math.floor(minAnswered), Math.floor(maxAnswered)),
        confidenceGap: this._toFiniteNumber(options.confidenceGap, 4),
        skipPenaltyBoost: Math.max(0, this._toFiniteNumber(options.skipPenaltyBoost, 2)),
        skipPenaltyDecay: Math.max(0, this._toFiniteNumber(options.skipPenaltyDecay, 1)),
        skipPenaltyWeight: Math.max(0, this._toFiniteNumber(options.skipPenaltyWeight, 1)),
      };
    }

    _initializeSessionState() {
      const emotionScores = Object.create(null);
      const skipCount = Object.create(null);
      const skipPenalty = Object.create(null);

      for (const emotion of this.emotionOrder) {
        emotionScores[emotion] = 0;
        skipCount[emotion] = 0;
        skipPenalty[emotion] = 0;
      }

      this.state = {
        started: false,
        completed: false,
        phase: PHASE_SCREENING,
        currentQuestionId: null,
        emotionScores,
        askedSet: new Set(),
        answeredCount: 0,
        totalSkipped: 0,
        skipCount,
        skipPenalty,
        lastIntensity: null,
        consecutiveSkips: 0,
        screeningCursor: 0,
        forceAlternateEmotion: null,
      };
    }

    _normalizeQuestions(rawQuestions) {
      const normalized = [];
      const seenIds = new Set();

      for (let index = 0; index < rawQuestions.length; index += 1) {
        const raw = rawQuestions[index];
        if (!raw || typeof raw !== "object") {
          continue;
        }

        const id = typeof raw.id === "string" ? raw.id.trim() : "";
        const emotion = typeof raw.emotion === "string" ? raw.emotion.trim() : "";

        if (!id || !emotion || seenIds.has(id)) {
          continue;
        }

        const type = raw.type === "deep" ? "deep" : "gateway";
        const depth = type === "deep" ? this._normalizeDepth(raw.depth, 1) : null;
        const options = this._normalizeOptions(raw.options, id);

        normalized.push({
          id,
          emotion,
          type,
          depth,
          text: typeof raw.text === "string" ? raw.text : "",
          options,
          order: index,
        });

        seenIds.add(id);
      }

      return normalized;
    }

    _normalizeOptions(rawOptions, questionId) {
      if (!Array.isArray(rawOptions)) {
        return [];
      }

      const options = [];
      for (let index = 0; index < rawOptions.length; index += 1) {
        const raw = rawOptions[index];
        if (!raw || typeof raw !== "object") {
          continue;
        }

        options.push({
          id: `${questionId}::${index}`,
          text: typeof raw.text === "string" ? raw.text : `Option ${index + 1}`,
          score: this._toFiniteNumber(raw.score, 0),
          intensity: this._normalizeDepth(raw.intensity, null),
          order: index,
        });
      }

      return options;
    }

    _buildEmotionStructure(questions) {
      const emotionMap = Object.create(null);
      const emotionOrder = [];
      const questionsById = Object.create(null);

      for (const question of questions) {
        if (!emotionMap[question.emotion]) {
          emotionMap[question.emotion] = {
            gateway: [],
            deep: {
              1: [],
              2: [],
              3: [],
            },
          };
          emotionOrder.push(question.emotion);
        }

        questionsById[question.id] = question;
        if (question.type === "gateway") {
          emotionMap[question.emotion].gateway.push(question);
        } else {
          emotionMap[question.emotion].deep[question.depth].push(question);
        }
      }

      return { emotionMap, emotionOrder, questionsById };
    }

    _selectNextQuestion() {
      if (this.state.phase === PHASE_SCREENING) {
        const screeningQuestion = this._selectScreeningQuestion();
        if (screeningQuestion) {
          return screeningQuestion;
        }
        this.state.phase = PHASE_DEEP_DIVE;
      }

      const deepQuestion = this._selectDeepQuestion();
      if (deepQuestion) {
        return deepQuestion;
      }

      return this._selectFallbackQuestion();
    }

    _selectScreeningQuestion() {
      const emotions = this.emotionOrder;
      if (!emotions.length) {
        return null;
      }

      for (let step = 0; step < emotions.length; step += 1) {
        const index = (this.state.screeningCursor + step) % emotions.length;
        const emotion = emotions[index];
        const queue = this.emotionMap[emotion].gateway;

        const nextQuestion = queue.find((question) => !this.state.askedSet.has(question.id));
        if (nextQuestion) {
          this.state.screeningCursor = (index + 1) % emotions.length;
          return nextQuestion;
        }
      }

      return null;
    }

    _selectDeepQuestion() {
      const rankings = this._rankEmotionsForSelection().map((entry) => entry.emotion);
      if (!rankings.length) {
        return null;
      }

      const skippedEmotion = this.state.forceAlternateEmotion;
      if (skippedEmotion) {
        const alternateRankings = rankings.filter((emotion) => emotion !== skippedEmotion);
        const alternateQuestion = this._pickDeepQuestionFromRankings(alternateRankings);
        if (alternateQuestion) {
          this.state.forceAlternateEmotion = null;
          return alternateQuestion;
        }
      }

      const selected = this._pickDeepQuestionFromRankings(rankings);
      if (selected) {
        this.state.forceAlternateEmotion = null;
      }

      return selected;
    }

    _pickDeepQuestionFromRankings(rankings) {
      for (const emotion of rankings) {
        const question = this._pickDeepQuestionForEmotion(emotion);
        if (question) {
          return question;
        }
      }
      return null;
    }

    _pickDeepQuestionForEmotion(emotion) {
      const deepBuckets = this.emotionMap[emotion] ? this.emotionMap[emotion].deep : null;
      if (!deepBuckets) {
        return null;
      }

      const preferredDepth = this._normalizeDepth(this.state.lastIntensity, 1);
      const availableDepths = [];

      for (const depth of [1, 2, 3]) {
        const queue = deepBuckets[depth].filter((question) => !this.state.askedSet.has(question.id));
        if (queue.length > 0) {
          availableDepths.push({ depth, queue });
        }
      }

      if (!availableDepths.length) {
        return null;
      }

      const exactMatch = availableDepths.find((entry) => entry.depth === preferredDepth);
      if (exactMatch) {
        return exactMatch.queue[0];
      }

      availableDepths.sort((a, b) => {
        const distanceA = Math.abs(a.depth - preferredDepth);
        const distanceB = Math.abs(b.depth - preferredDepth);
        if (distanceA !== distanceB) {
          return distanceA - distanceB;
        }
        return a.depth - b.depth;
      });

      return availableDepths[0].queue[0];
    }

    _selectFallbackQuestion() {
      const rankedEmotions = this._rankEmotionsForSelection().map((entry) => entry.emotion);

      for (const emotion of rankedEmotions) {
        const gateway = this.emotionMap[emotion].gateway.find(
          (question) => !this.state.askedSet.has(question.id)
        );
        if (gateway) {
          return gateway;
        }
      }

      for (const question of this.questions) {
        if (!this.state.askedSet.has(question.id)) {
          return question;
        }
      }

      return null;
    }

    _updatePhase() {
      if (this.state.phase === PHASE_DEEP_DIVE) {
        return;
      }

      if (this.state.answeredCount >= this.config.minAnswered) {
        this.state.phase = PHASE_DEEP_DIVE;
        return;
      }

      if (!this._hasRemainingGatewayQuestions()) {
        this.state.phase = PHASE_DEEP_DIVE;
      }
    }

    _hasRemainingGatewayQuestions() {
      for (const emotion of this.emotionOrder) {
        const hasRemaining = this.emotionMap[emotion].gateway.some(
          (question) => !this.state.askedSet.has(question.id)
        );
        if (hasRemaining) {
          return true;
        }
      }
      return false;
    }

    _hasRemainingQuestions() {
      if (this.state.askedSet.size >= this.questions.length) {
        return false;
      }

      for (const question of this.questions) {
        if (!this.state.askedSet.has(question.id)) {
          return true;
        }
      }
      return false;
    }

    _shouldStop() {
      if (this.state.answeredCount >= this.config.maxAnswered) {
        return true;
      }

      if (!this._hasRemainingQuestions()) {
        return true;
      }

      if (this.state.answeredCount < this.config.minAnswered) {
        return false;
      }

      const ranked = this._rankEmotionsByRawScore();
      const dominantScore = ranked[0] ? ranked[0].score : 0;
      const secondScore = ranked[1] ? ranked[1].score : 0;

      return dominantScore >= secondScore + this.config.confidenceGap;
    }

    _rankEmotionsForSelection() {
      const ranked = this.emotionOrder.map((emotion, index) => {
        const rawScore = this._toFiniteNumber(this.state.emotionScores[emotion], 0);
        const penalty = this._toFiniteNumber(this.state.skipPenalty[emotion], 0);
        const effectiveScore = rawScore - penalty * this.config.skipPenaltyWeight;

        return {
          emotion,
          rawScore,
          effectiveScore,
          index,
        };
      });

      ranked.sort((a, b) => {
        if (b.effectiveScore !== a.effectiveScore) {
          return b.effectiveScore - a.effectiveScore;
        }
        if (b.rawScore !== a.rawScore) {
          return b.rawScore - a.rawScore;
        }
        const skipA = this._toFiniteNumber(this.state.skipCount[a.emotion], 0);
        const skipB = this._toFiniteNumber(this.state.skipCount[b.emotion], 0);
        if (skipA !== skipB) {
          return skipA - skipB;
        }
        return a.index - b.index;
      });

      return ranked;
    }

    _rankEmotionsByRawScore() {
      const ranked = this.emotionOrder.map((emotion, index) => ({
        emotion,
        score: this._toFiniteNumber(this.state.emotionScores[emotion], 0),
        index,
      }));

      ranked.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.index - b.index;
      });

      return ranked;
    }

    _decaySkipPenalties() {
      const decay = this.config.skipPenaltyDecay;
      if (decay <= 0) {
        return;
      }

      for (const emotion of this.emotionOrder) {
        const current = this._toFiniteNumber(this.state.skipPenalty[emotion], 0);
        this.state.skipPenalty[emotion] = Math.max(0, current - decay);
      }
    }

    _calculateSeverity(dominantScore) {
      if (this.state.answeredCount <= 0 || dominantScore <= 0) {
        return "none";
      }

      const averagePerAnswer = dominantScore / this.state.answeredCount;
      if (averagePerAnswer < 0.75) {
        return "low";
      }
      if (averagePerAnswer < 1.5) {
        return "moderate";
      }
      if (averagePerAnswer < 2.25) {
        return "high";
      }
      return "very-high";
    }

    _resolveOption(question, optionInput) {
      const options = question.options || [];
      if (!options.length) {
        return null;
      }

      if (Number.isInteger(optionInput)) {
        return options[optionInput] || null;
      }

      if (typeof optionInput === "string") {
        return options.find((option) => option.text === optionInput) || null;
      }

      if (!optionInput || typeof optionInput !== "object") {
        return null;
      }

      if (Number.isInteger(optionInput.index)) {
        return options[optionInput.index] || null;
      }

      if (typeof optionInput.id === "string") {
        return options.find((option) => option.id === optionInput.id) || null;
      }

      const matchedByShape = options.find(
        (option) =>
          option.text === optionInput.text &&
          this._toFiniteNumber(option.score, 0) === this._toFiniteNumber(optionInput.score, 0) &&
          this._normalizeDepth(option.intensity, null) ===
            this._normalizeDepth(optionInput.intensity, null)
      );
      if (matchedByShape) {
        return matchedByShape;
      }

      return options.find((option) => option === optionInput) || null;
    }

    _getCurrentQuestion() {
      if (!this.state.currentQuestionId) {
        return null;
      }
      return this.questionsById[this.state.currentQuestionId] || null;
    }

    _toPublicQuestion(question) {
      return {
        id: question.id,
        emotion: question.emotion,
        type: question.type,
        depth: question.depth,
        text: question.text,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          score: option.score,
          intensity: option.intensity,
        })),
      };
    }

    _normalizeDepth(value, fallback) {
      if (!Number.isFinite(value)) {
        return fallback;
      }
      const clamped = Math.max(1, Math.min(3, Math.floor(value)));
      return clamped;
    }

    _toFiniteNumber(value, fallback) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }
  }

  return EmotionEngine;
});
