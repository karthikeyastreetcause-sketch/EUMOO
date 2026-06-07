(function () {
  "use strict";

  const API = {
    uploadProfileImage: "/api/settings/profile-image",
    resetAll: "/api/settings/reset",
  };

  const ui = {
    root: document.getElementById("settingsRoot"),

    profileImageForm: document.getElementById("profileImageForm"),
    profileImageInput: document.getElementById("profileImageInput"),
    profileImageUploadBtn: document.getElementById("profileImageUploadBtn"),
    profileImageFeedback: document.getElementById("profileImageFeedback"),

    profileAvatarImage: document.getElementById("profileAvatarImage"),
    profileAvatarFallback: document.getElementById("profileAvatarFallback"),

    resetDataForm: document.getElementById("resetDataForm"),
    resetConfirmInput: document.getElementById("resetConfirmInput"),
    resetDataBtn: document.getElementById("resetDataBtn"),
    resetFeedback: document.getElementById("resetFeedback"),

    prefMoodTheme: document.getElementById("prefMoodTheme"),
    prefAmbientIntensity: document.getElementById("prefAmbientIntensity"),
    prefAiTone: document.getElementById("prefAiTone"),
    prefAnimationIntensity: document.getElementById("prefAnimationIntensity"),
    prefPrivacyDepth: document.getElementById("prefPrivacyDepth"),
    prefJournalAtmosphere: document.getElementById("prefJournalAtmosphere"),
    prefInsightFrequency: document.getElementById("prefInsightFrequency"),
    prefInterfaceSound: document.getElementById("prefInterfaceSound"),
    prefFeedback: document.getElementById("settingsPrefFeedback"),
    countMetrics: Array.from(document.querySelectorAll(".count-metric")),
  };

  const PREF_STORAGE_KEY = "eumo_personalization_prefs_v1";
  const SOUND_STORAGE_KEY = "eumo_dashboard_sound_v1";

  function setFeedback(element, message, type) {
    if (!element) return;
    if (!message) {
      element.hidden = true;
      element.textContent = "";
      element.className = "settings-feedback";
      return;
    }
    element.hidden = false;
    element.textContent = message;
    element.className = `settings-feedback ${type === "error" ? "is-error" : type === "success" ? "is-success" : ""}`;
  }

  function setUploading(flag) {
    if (!ui.profileImageUploadBtn || !ui.profileImageInput) return;
    ui.profileImageUploadBtn.disabled = flag;
    ui.profileImageInput.disabled = flag;
    ui.profileImageUploadBtn.textContent = flag ? "Uploading..." : "Upload";
  }

  function setResetting(flag) {
    if (!ui.resetDataBtn || !ui.resetConfirmInput) return;
    ui.resetDataBtn.disabled = flag;
    ui.resetConfirmInput.disabled = flag;
    ui.resetDataBtn.textContent = flag ? "Resetting..." : "Reset";
  }

  function applyAvatar(url) {
    if (!ui.profileAvatarImage || !ui.profileAvatarFallback) return;
    if (url) {
      ui.profileAvatarImage.src = url;
      ui.profileAvatarImage.hidden = false;
      ui.profileAvatarFallback.hidden = true;
    } else {
      ui.profileAvatarImage.hidden = true;
      ui.profileAvatarFallback.hidden = false;
    }
  }

  function readPrefs() {
    try {
      const raw = localStorage.getItem(PREF_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_err) {
      return null;
    }
  }

  function writePrefs(prefs) {
    try {
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs));
    } catch (_err) {
      // non-blocking
    }
  }

  function applyPrefsToUI(prefs) {
    if (!prefs) return;
    if (ui.prefMoodTheme && prefs.moodTheme) ui.prefMoodTheme.value = prefs.moodTheme;
    if (ui.prefAmbientIntensity && prefs.ambientIntensity != null) ui.prefAmbientIntensity.value = String(prefs.ambientIntensity);
    if (ui.prefAiTone && prefs.aiTone) ui.prefAiTone.value = prefs.aiTone;
    if (ui.prefAnimationIntensity && prefs.animationIntensity != null) ui.prefAnimationIntensity.value = String(prefs.animationIntensity);
    if (ui.prefPrivacyDepth && prefs.privacyDepth) ui.prefPrivacyDepth.value = prefs.privacyDepth;
    if (ui.prefJournalAtmosphere && prefs.journalAtmosphere) ui.prefJournalAtmosphere.value = prefs.journalAtmosphere;
    if (ui.prefInsightFrequency && prefs.insightFrequency) ui.prefInsightFrequency.value = prefs.insightFrequency;
    if (ui.prefInterfaceSound && prefs.interfaceSound) ui.prefInterfaceSound.value = prefs.interfaceSound;
  }

  function applyPrefsToRoot(prefs) {
    if (!ui.root || !prefs) return;
    const theme = String(prefs.moodTheme || "").trim().toLowerCase();
    const themeMap = {
      adaptive: "neutral",
      calm: "calm",
      focused: "focused",
      soft: "hopeful",
    };
    ui.root.dataset.moodTheme = themeMap[theme] || "neutral";

    const ambient = Number(prefs.ambientIntensity);
    const animation = Number(prefs.animationIntensity);
    if (Number.isFinite(ambient)) {
      ui.root.style.setProperty("--custom-ambient-intensity", String(Math.max(0, Math.min(100, ambient))));
    }
    if (Number.isFinite(animation)) {
      ui.root.style.setProperty("--custom-animation-intensity", String(Math.max(0, Math.min(100, animation))));
    }
  }

  function currentPrefsFromUI() {
    return {
      moodTheme: ui.prefMoodTheme?.value || "adaptive",
      ambientIntensity: Number(ui.prefAmbientIntensity?.value || 55),
      aiTone: ui.prefAiTone?.value || "gentle",
      animationIntensity: Number(ui.prefAnimationIntensity?.value || 65),
      privacyDepth: ui.prefPrivacyDepth?.value || "standard",
      journalAtmosphere: ui.prefJournalAtmosphere?.value || "immersive",
      insightFrequency: ui.prefInsightFrequency?.value || "medium",
      interfaceSound: ui.prefInterfaceSound?.value || "off",
    };
  }

  function applySoundPreference(value) {
    const enabled = String(value || "").toLowerCase() === "on";
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "1" : "0");
    } catch (_err) {
      // non-blocking
    }
  }

  function preloadSoundPreference() {
    if (!ui.prefInterfaceSound) return;
    try {
      const existing = localStorage.getItem(SOUND_STORAGE_KEY);
      if (existing === "1") {
        ui.prefInterfaceSound.value = "on";
        return;
      }
      if (existing === "0") {
        ui.prefInterfaceSound.value = "off";
      }
    } catch (_err) {
      // non-blocking
    }
  }

  function savePersonalizationPrefs() {
    const prefs = currentPrefsFromUI();
    writePrefs(prefs);
    applyPrefsToRoot(prefs);
    applySoundPreference(prefs.interfaceSound);
    setFeedback(ui.prefFeedback, "Personalization saved for this device.", "success");
  }

  function previewSelectedImage() {
    const file = ui.profileImageInput?.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    applyAvatar(previewUrl);
  }

  async function uploadProfileImage(event) {
    event.preventDefault();
    setFeedback(ui.profileImageFeedback, "", "info");

    const file = ui.profileImageInput?.files?.[0];
    if (!file) {
      setFeedback(ui.profileImageFeedback, "Choose an image first.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      const response = await fetch(API.uploadProfileImage, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      let data = {};
      try {
        data = await response.json();
      } catch (_err) {
        data = {};
      }

      if (!response.ok || data.ok !== true) {
        throw new Error(data.message || "Unable to upload profile image.");
      }

      applyAvatar(data.profile_image_url || "");
      setFeedback(ui.profileImageFeedback, data.message || "Profile image updated.", "success");
      if (ui.profileImageInput) ui.profileImageInput.value = "";
    } catch (error) {
      setFeedback(ui.profileImageFeedback, error.message || "Unable to upload profile image.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function resetAllData(event) {
    event.preventDefault();
    setFeedback(ui.resetFeedback, "", "info");

    const confirmText = String(ui.resetConfirmInput?.value || "").trim();
    if (confirmText.toUpperCase() !== "RESET") {
      setFeedback(ui.resetFeedback, "Type RESET to confirm.", "error");
      return;
    }

    setResetting(true);
    try {
      const response = await fetch(API.resetAll, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_text: confirmText }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (_err) {
        data = {};
      }

      if (!response.ok || data.ok !== true) {
        throw new Error(data.message || "Unable to reset data.");
      }

      setFeedback(ui.resetFeedback, data.message || "Reset completed.", "success");
      if (ui.resetConfirmInput) ui.resetConfirmInput.value = "";
    } catch (error) {
      setFeedback(ui.resetFeedback, error.message || "Unable to reset data.", "error");
    } finally {
      setResetting(false);
    }
  }

  function bindEvents() {
    ui.profileImageInput?.addEventListener("change", previewSelectedImage);
    ui.profileImageForm?.addEventListener("submit", uploadProfileImage);
    ui.resetDataForm?.addEventListener("submit", resetAllData);

    [
      ui.prefMoodTheme,
      ui.prefAmbientIntensity,
      ui.prefAiTone,
      ui.prefAnimationIntensity,
      ui.prefPrivacyDepth,
      ui.prefJournalAtmosphere,
      ui.prefInsightFrequency,
      ui.prefInterfaceSound,
    ].forEach((element) => {
      element?.addEventListener("change", savePersonalizationPrefs);
      element?.addEventListener("input", () => {
        if (element === ui.prefAmbientIntensity || element === ui.prefAnimationIntensity) {
          savePersonalizationPrefs();
        }
      });
    });
  }

  function animateCounters() {
    ui.countMetrics.forEach((node, index) => {
      const target = Number(node.getAttribute("data-target") || "0");
      if (!Number.isFinite(target)) return;
      const duration = 900 + index * 90;
      const start = performance.now();

      const step = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = String(Math.round(target * eased));
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    });
  }

  const existingPrefs = readPrefs();
  applyPrefsToUI(existingPrefs);
  preloadSoundPreference();
  applyPrefsToRoot(existingPrefs);
  bindEvents();
  animateCounters();
})();
