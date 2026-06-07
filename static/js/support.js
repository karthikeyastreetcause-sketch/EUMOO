(function () {
  "use strict";

  const ui = {
    breathToolBtn: document.getElementById("breathToolBtn"),
    groundingToolBtn: document.getElementById("groundingToolBtn"),
    reflectionToolBtn: document.getElementById("reflectionToolBtn"),
    audioToolBtn: document.getElementById("audioToolBtn"),
    resetToolBtn: document.getElementById("resetToolBtn"),
    stateButtons: Array.from(document.querySelectorAll("[data-support-state]")),
    output: document.getElementById("supportToolOutput"),
  };

  let breathTimer = null;
  let typingTimer = null;

  function setOutput(text) {
    if (!ui.output) return;
    if (typingTimer) {
      clearInterval(typingTimer);
      typingTimer = null;
    }
    const value = String(text || "");
    ui.output.textContent = "";
    ui.output.classList.add("is-typing");
    let i = 0;
    typingTimer = setInterval(() => {
      i += 1;
      ui.output.textContent = value.slice(0, i);
      if (i >= value.length) {
        clearInterval(typingTimer);
        typingTimer = null;
        ui.output.classList.remove("is-typing");
      }
    }, 9);
  }

  function runBreathTool() {
    if (breathTimer) {
      clearInterval(breathTimer);
      breathTimer = null;
    }

    const phases = [
      "Inhale gently (4s)",
      "Hold softly (4s)",
      "Exhale slowly (6s)",
      "Pause (2s)",
    ];

    let index = 0;
    let cycles = 0;
    setOutput(`Breathing reset started: ${phases[index]}`);

    breathTimer = setInterval(() => {
      index = (index + 1) % phases.length;
      if (index === 0) cycles += 1;

      if (cycles >= 3) {
        clearInterval(breathTimer);
        breathTimer = null;
        setOutput("Reset complete. Notice your breath and body before continuing.");
        return;
      }

      setOutput(`Breathing reset: ${phases[index]}`);
    }, 3000);
  }

  function runGroundingTool() {
    setOutput("Grounding: Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, and 1 you can taste.");
  }

  function runReflectionTool() {
    const prompts = [
      "What emotion needs your attention right now?",
      "What is one kind action you can take in the next 10 minutes?",
      "What thought can you release for tonight?",
    ];
    const pick = prompts[Math.floor(Math.random() * prompts.length)];
    setOutput(`Mini reflection: ${pick}`);
  }

  function runAudioTool() {
    setOutput("Calm audio mode: Play soft rain or low-frequency ambient sounds for 5 minutes while breathing evenly.");
  }

  function runResetTool() {
    setOutput("Emotional reset: unclench jaw, drop shoulders, place one hand on chest, and take 6 slow breaths. Then choose one tiny next step.");
  }

  function onStateSelect(event) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const state = target.dataset.supportState || "";

    ui.stateButtons.forEach((button) => button.classList.remove("is-active"));
    target.classList.add("is-active");

    const messages = {
      panic: "Panic mode support: sit down, exhale longer than inhale, and call a trusted person now.",
      burnout: "Burnout support: reduce one non-essential task and schedule a 15-minute recovery block.",
      loneliness: "Loneliness support: send one low-pressure message to someone safe.",
      crisis: "Crisis support: contact emergency/local helpline immediately and stay with another person if possible.",
      academic: "Academic pressure support: break work into one 20-minute block and one clear stopping point.",
      exhausted: "Emotional exhaustion support: choose rest first. Hydrate, breathe, then do one tiny task.",
      social: "Social anxiety support: ground physically first, then rehearse one short sentence you can use.",
      conflict: "Conflict recovery support: write what happened, what you felt, and one boundary for next time.",
    };

    setOutput(messages[state] || "Choose what feels closest to your current state.");
  }

  ui.breathToolBtn?.addEventListener("click", runBreathTool);
  ui.groundingToolBtn?.addEventListener("click", runGroundingTool);
  ui.reflectionToolBtn?.addEventListener("click", runReflectionTool);
  ui.audioToolBtn?.addEventListener("click", runAudioTool);
  ui.resetToolBtn?.addEventListener("click", runResetTool);
  ui.stateButtons.forEach((button) => button.addEventListener("click", onStateSelect));
})();
