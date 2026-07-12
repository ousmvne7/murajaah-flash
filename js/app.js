"use strict";

// Sécurité : le splash ne doit jamais bloquer l'application.
// Même si une erreur apparaît plus bas pendant l'initialisation,
// l'écran d'ouverture disparaît automatiquement.
setTimeout(() => {
  const splash = document.getElementById("splashScreen");
  if (!splash) return;
  splash.classList.add("hidden");
  setTimeout(() => splash.remove(), 420);
}, 2400);

// ---------------------------------------------------------------------------
// Configuration et état de l'application
// ---------------------------------------------------------------------------

    const STORAGE_KEY = "murajaah_flash_v2_cards";
    const ACTIVITY_KEY = "murajaah_flash_v2_activity";
    const HIFDH_HISTORY_KEY = "murajaah_flash_v2_hifdh_tests";
    const ELAN_RECITER_BASE = "https://everyayah.com/data/Minshawy_Murattal_128kbps";
    const ELAN_PLAYBACK_RATE = 1.25;
    const TOTAL_MUSHAF_PAGES = 604;
    const TEXT_REPOSITORIES = {
      kfgqpc: {
        label: "KFGQPC Hafs",
        path: "data/quran-uthmani.json"
      }
    };
    const DAY = 86400000;
    let cards = load(STORAGE_KEY, [])
      .filter(card => !card.type || card.type === "recitation")
      .map(card => ({
        ...card,
        type: "recitation",
        beforeVerse: card.beforeVerse || card.prompt || "",
        blockageVerse: card.blockageVerse || card.answer || "",
        afterVerse: card.afterVerse || ""
      }));
    let activity = load(ACTIVITY_KEY, {});
    let hifdhHistory = load(HIFDH_HISTORY_KEY, []);
    let activeFilter = "all";
    let reviewPool = [];
    let reviewSessionMode = "recitation";
    let reviewVisualMode = "normal";
    let mushafReviewRenderToken = 0;
    let reviewQueue = [];
    let reviewIndex = 0;
    let reviewStage = 0;
    let sessionResults = { no: 0, almost: 0, yes: 0 };
    let sessionRetryIds = [];
    let sessionSchedule = [];
    let recordedAudio = "";
    let mediaRecorder = null;
    let recordingStream = null;
    let recordingChunks = [];
    let recordingTimer = null;
    let recordingStartedAt = 0;
    let previewPlayer = null;
    let quranData = null;
    let quranPagesData = null;
    let pendingAutoFill = null;
    let quranPickerState = { surahId: "2", ayah: 2 };
    let hifdhSelectedHizb = 1;
    let hifdhQuestionCount = 10;
    let hifdhTest = null;
    let hifdhRevealStage = 0;
    let hifdhPickerCloseTimer = null;

    function load(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch (_) { return fallback; }
    }

    function persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
        localStorage.setItem(HIFDH_HISTORY_KEY, JSON.stringify(hifdhHistory));
        return true;
      } catch (_) {
        toast("Stockage plein : supprime un ancien audio ou raccourcis l’enregistrement.");
        return false;
      }
    }

    function todayKey(date = new Date()) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function startOfToday() {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }

    function escapeHtml(value = "") {
      return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
    }

    function dueCards() {
      const end = startOfToday() + DAY - 1;
      return cards.filter(card => !card.archived && (card.nextReview || 0) <= end);
    }

    function reviewedTodayCount() {
      return activity[todayKey()]?.reviewed || 0;
    }

    function dashboardSessionStats() {
      const remaining = dueCards().length;
      const reviewed = reviewedTodayCount();
      const total = reviewed + remaining;
      const progress = total ? Math.round((reviewed / total) * 100) : 0;
      const estimate = remaining ? Math.max(1, Math.ceil(remaining * .35)) : 0;

      return { remaining, reviewed, total, progress, estimate };
    }

    function confidence() {
      if (!cards.length) return 0;
      const total = cards.reduce((sum, card) => sum + (card.strength || 0), 0);
      return Math.round((total / (cards.length * 5)) * 100);
    }

    function streak() {
      let count = 0;
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      if (!activity[todayKey(cursor)]?.reviewed) cursor.setDate(cursor.getDate() - 1);
      while (activity[todayKey(cursor)]?.reviewed) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
      }
      return count;
    }

    function showScreen(name) {
      const target = document.getElementById(name + "Screen");
      if (!target) return;
      document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
      target.classList.add("active");
      target.scrollTop = 0;
      document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.screen === name));
      if (name === "home") renderDashboard();
      if (name === "library") renderLibrary();
      if (name === "progress") {
        renderProgress();
        renderSettings();
      }
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        target.scrollTop = 0;
        window.scrollTo(0, 0);
      });
    }

    function openProfile(tab = "progress") {
      showScreen("progress");
      setProfileTab(tab);
    }

    function setProfileTab(tab = "progress") {
      document.querySelectorAll(".profile-tab-btn").forEach(button => {
        const active = button.dataset.profileTab === tab;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      });
      document.getElementById("profileProgressPanel")?.classList.toggle("active", tab === "progress");
      document.getElementById("profileSettingsPanel")?.classList.toggle("active", tab === "settings");
      if (tab === "progress") renderProgress();
      if (tab === "settings") renderSettings();
    }

    function renderDashboard() {
      const session = dashboardSessionStats();
      const fragile = cards.filter(card => !card.archived && ["very-fragile", "fragile"].includes(autoDifficulty(card).level)).length;
      const days = streak();
      const date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
      document.getElementById("todayLabel").textContent = date;
      document.getElementById("dueCount").textContent = session.remaining;
      document.getElementById("timeEstimate").textContent = "≈ " + session.estimate + " min";
      document.getElementById("dailyProgress").style.width = session.progress + "%";
      document.getElementById("sessionRangeLabel").textContent = session.total
        ? "— " + session.total + " révision" + (session.total > 1 ? "s" : "")
        : "Aucune révision prévue";
      document.getElementById("sessionReviewedLabel").textContent = session.reviewed + " / " + session.total + " révisés";
      document.getElementById("reviewedToday").textContent = session.reviewed;
      document.getElementById("fragileCount").textContent = fragile;
      document.getElementById("totalCount").textContent = cards.length;
      document.getElementById("streakLabel").textContent = days + " jour" + (days > 1 ? "s" : "");
      const startBtn = document.getElementById("startReviewBtn");
      startBtn.disabled = cards.length > 0 && session.remaining === 0;
      startBtn.textContent = session.remaining ? "Commencer la révision" : cards.length ? "Tout est à jour ✓" : "Ajoute ton premier passage";
    }

    function reviewedOn(date) {
      return activity[todayKey(date)]?.reviewed || 0;
    }

    function bestStreak() {
      const days = Object.keys(activity)
        .filter(key => activity[key]?.reviewed > 0)
        .sort();
      if (!days.length) return 0;

      let best = 1;
      let current = 1;
      for (let index = 1; index < days.length; index++) {
        const previous = new Date(days[index - 1] + "T00:00:00").getTime();
        const next = new Date(days[index] + "T00:00:00").getTime();
        if (next - previous === DAY) {
          current++;
        } else {
          current = 1;
        }
        best = Math.max(best, current);
      }
      return best;
    }

    function currentWeekDays() {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
      });
    }

    function levelDistribution() {
      const active = cards.filter(card => !card.archived);
      const dueLimit = startOfToday() + DAY - 1;
      const counts = { mastered: 0, progress: 0, fragile: 0, due: 0 };

      active.forEach(card => {
        if ((card.nextReview || 0) <= dueLimit) {
          counts.due++;
          return;
        }
        const level = autoDifficulty(card).level;
        if (level === "mastered") counts.mastered++;
        else if (level === "fragile" || level === "very-fragile") counts.fragile++;
        else counts.progress++;
      });

      return { total: active.length, counts };
    }

    function renderProgress() {
      const current = streak();
      const best = bestStreak();
      const activeCards = cards.filter(card => !card.archived);
      const totalReviews = activeCards.reduce((sum, card) => sum + (card.reviews || 0), 0);
      const week = currentWeekDays().map(date => ({
        date,
        label: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(".", ""),
        value: reviewedOn(date)
      }));
      const weekTotal = week.reduce((sum, day) => sum + day.value, 0);
      const weekMax = Math.max(1, ...week.map(day => day.value));
      const levels = levelDistribution();
      const { mastered, progress, fragile, due } = levels.counts;
      const total = Math.max(1, levels.total);
      const masteredEnd = mastered / total * 100;
      const progressEnd = masteredEnd + progress / total * 100;
      const fragileEnd = progressEnd + fragile / total * 100;

      document.getElementById("progressStreakPill").textContent = current + " jour" + (current > 1 ? "s" : "");
      document.getElementById("progressStreakValue").textContent = current + " jour" + (current > 1 ? "s" : "");
      document.getElementById("progressBestStreak").textContent = "Meilleur record : " + best + " jour" + (best > 1 ? "s" : "");
      document.getElementById("progressTotalPassages").textContent = activeCards.length;
      document.getElementById("progressMasteryRate").textContent = confidence() + "%";
      document.getElementById("progressTotalReviews").textContent = totalReviews;
      document.getElementById("progressWeekTotal").textContent = weekTotal + " revue" + (weekTotal > 1 ? "s" : "");
      document.getElementById("progressLevelTotal").textContent = levels.total + " passage" + (levels.total > 1 ? "s" : "");

      document.getElementById("weekBars").innerHTML = week.map(day => {
        const isToday = todayKey(day.date) === todayKey();
        const height = day.value ? Math.max(10, Math.round(day.value / weekMax * 100)) : 0;
        return `
          <div class="week-bar ${isToday ? "today" : ""}" title="${day.value} révision${day.value > 1 ? "s" : ""}">
            <div class="week-bar-track"><div class="week-bar-fill" style="height:${height}%"></div></div>
            <span>${day.label.slice(0, 3)}</span>
          </div>
        `;
      }).join("");

      const donut = document.getElementById("levelDonut");
      donut.style.background = levels.total
        ? `conic-gradient(var(--green) 0 ${masteredEnd}%, var(--navy-2) ${masteredEnd}% ${progressEnd}%, var(--orange) ${progressEnd}% ${fragileEnd}%, var(--red) ${fragileEnd}% 100%)`
        : "conic-gradient(#edf1f5 0 100%)";

      const rows = [
        ["var(--green)", "Solides", mastered],
        ["var(--navy-2)", "En progrès", progress],
        ["var(--orange)", "Fragiles", fragile],
        ["var(--red)", "À revoir", due]
      ];
      document.getElementById("levelLegend").innerHTML = rows.map(([color, label, value]) => {
        const percent = levels.total ? Math.round(value / levels.total * 100) : 0;
        return `
          <div class="level-item">
            <span><i class="level-dot" style="background:${color}"></i>${label}</span>
            <b>${value} (${percent}%)</b>
          </div>
        `;
      }).join("");
    }

    function autoDifficulty(card) {
      const recent = Array.isArray(card.ratingHistory) ? card.ratingHistory.slice(-6) : [];
      const noCount = recent.filter(rating => rating === "no").length;
      const almostCount = recent.filter(rating => rating === "almost").length;
      const weakScore = noCount * 2 + almostCount;
      const strength = card.strength || 0;

      if (noCount >= 2 || weakScore >= 4 || strength <= 0) return { level: "very-fragile", label: "Très fragile" };
      if (noCount >= 1 || weakScore >= 2 || strength <= 1) return { level: "fragile", label: "Fragile" };
      if (strength >= 4 && weakScore === 0) return { level: "mastered", label: "Solide" };
      return { level: "progress", label: "En progrès" };
    }

    function statusFor(card) {
      const due = (card.nextReview || 0) <= startOfToday() + DAY - 1;
      if (due) return ["due", "À revoir"];
      const difficulty = autoDifficulty(card);
      return [difficulty.level, difficulty.label];
    }

    function cardTypeLabel() {
      return "Récitation";
    }

    function nextReviewLabel(card) {
      const next = card.nextReview || Date.now();
      const today = startOfToday();
      const tomorrow = today + DAY;
      if (next <= today + DAY - 1) return "Aujourd’hui";
      if (next < tomorrow + DAY) return "Demain";
      return "Prochaine : " + new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(next));
    }

    function scheduleLabelFromTime(next) {
      const today = startOfToday();
      const tomorrow = today + DAY;
      if (next <= today + DAY - 1) return "à revoir aujourd’hui";
      if (next < tomorrow + DAY) return "revient demain";
      const diffDays = Math.max(2, Math.round((next - today) / DAY));
      if (diffDays <= 7) return `revient dans ${diffDays} jours`;
      return "revient le " + new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(next));
    }

    function renderLibrary() {
      const query = document.getElementById("searchInput").value.trim().toLowerCase();
      let filtered = cards.filter(card => !card.archived);
      if (query) filtered = filtered.filter(card => [card.surah, card.ayah, card.beforeVerse, card.blockageVerse, card.afterVerse, card.note].join(" ").toLowerCase().includes(query));
      if (activeFilter === "due") filtered = filtered.filter(card => (card.nextReview || 0) <= startOfToday() + DAY - 1);
      if (activeFilter === "fragile") filtered = filtered.filter(card => ["very-fragile", "fragile"].includes(autoDifficulty(card).level));
      if (activeFilter === "mastered") filtered = filtered.filter(card => autoDifficulty(card).level === "mastered");
      filtered.sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
      document.getElementById("librarySubtitle").textContent = `${cards.length} passage${cards.length !== 1 ? "s" : ""} enregistré${cards.length !== 1 ? "s" : ""}.`;
      const list = document.getElementById("cardList");
      if (!filtered.length) {
        list.innerHTML = `<div class="empty"><div class="empty-icon">📖</div><h3>${cards.length ? "Aucun résultat" : "Ta bibliothèque est vide"}</h3><p>${cards.length ? "Essaie un autre filtre ou une autre recherche." : "Ajoute un passage à revoir pour commencer ta murajaah ciblée."}</p>${cards.length ? "" : '<button class="primary-btn" onclick="showScreen(\'add\')">Ajouter un passage</button>'}</div>`;
        return;
      }
      list.innerHTML = filtered.map(card => {
        const status = statusFor(card);
        const label = verseReference(card, 0);
        return `<article class="memory-card">
          <div class="memory-top">
            <div class="memory-meta">${escapeHtml(label)}<span class="memory-type">${escapeHtml(cardTypeLabel(card))}</span></div>
            <div class="memory-actions">
              <button class="tiny-btn" aria-label="Modifier" onclick="editCard('${card.id}')">✎</button>
              <button class="tiny-btn" aria-label="Supprimer" onclick="askDelete('${card.id}')">×</button>
            </div>
          </div>
          <div class="arabic">${escapeHtml(cleanQuranDisplayText(card.blockageVerse))}</div>
          <div class="memory-bottom"><span class="status ${status[0]}">${status[1]}</span><span>${nextReviewLabel(card)}</span></div>
        </article>`;
      }).join("");
    }

    function resetLibraryFilters() {
      activeFilter = "all";
      const searchInput = document.getElementById("searchInput");
      if (searchInput) searchInput.value = "";
      document.querySelectorAll(".filter-chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.filter === "all");
      });
    }

    function setFilter(filter, button) {
      activeFilter = filter;
      document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.remove("active"));
      button.classList.add("active");
      renderLibrary();
    }

    async function toggleRecording() {
      if (mediaRecorder?.state === "recording") {
        stopRecording();
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        toast("Micro indisponible ici. Ouvre l’app via localhost ou un lien HTTPS pour enregistrer.");
        return;
      }
      try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const preferredType = [
          "audio/mp4;codecs=mp4a.40.2",
          "audio/mp4",
          "audio/webm;codecs=opus",
          "audio/webm"
        ].find(type => MediaRecorder.isTypeSupported(type));
        mediaRecorder = new MediaRecorder(recordingStream, preferredType ? { mimeType: preferredType } : undefined);
        recordingChunks = [];
        mediaRecorder.ondataavailable = event => { if (event.data.size) recordingChunks.push(event.data); };
        mediaRecorder.onstop = finalizeRecording;
        mediaRecorder.start();
        recordingStartedAt = Date.now();
        updateRecorderUI("recording");
        recordingTimer = setInterval(() => {
          const seconds = Math.floor((Date.now() - recordingStartedAt) / 1000);
          document.getElementById("recordStatus").textContent = `En cours · ${seconds} s / 45 s`;
          if (seconds >= 45) stopRecording();
        }, 500);
      } catch (_) {
        toast("Autorise le microphone pour enregistrer ta récitation.");
        cleanupRecordingStream();
      }
    }

    function importCapturedAudio(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 900000) {
        toast("Audio trop volumineux. Enregistre une récitation plus courte.");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        recordedAudio = reader.result;
        updateRecorderUI("ready");
        toast("Récitation enregistrée.");
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    }

    function stopRecording() {
      if (mediaRecorder?.state === "recording") mediaRecorder.stop();
      clearInterval(recordingTimer);
      recordingTimer = null;
    }

    function finalizeRecording() {
      const mimeType = mediaRecorder?.mimeType || recordingChunks[0]?.type || "audio/webm";
      const blob = new Blob(recordingChunks, { type: mimeType });
      cleanupRecordingStream();
      if (!blob.size) {
        updateRecorderUI(recordedAudio ? "ready" : "empty");
        return;
      }
      if (blob.size > 900000) {
        toast("Audio trop volumineux. Essaie une récitation plus courte.");
        updateRecorderUI(recordedAudio ? "ready" : "empty");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        recordedAudio = reader.result;
        updateRecorderUI("ready");
        toast("Récitation enregistrée.");
      };
      reader.readAsDataURL(blob);
    }

    function cleanupRecordingStream() {
      recordingStream?.getTracks().forEach(track => track.stop());
      recordingStream = null;
      mediaRecorder = null;
      clearInterval(recordingTimer);
      recordingTimer = null;
    }

    function updateRecorderUI(state) {
      const button = document.getElementById("recordBtn");
      const dot = document.getElementById("recordDot");
      const status = document.getElementById("recordStatus");
      const hasAudio = Boolean(recordedAudio);
      button.classList.toggle("recording", state === "recording");
      dot.className = "record-dot" + (state === "recording" ? " live" : hasAudio ? " ready" : "");
      button.textContent = state === "recording" ? "■ Arrêter" : hasAudio ? "🎙 Refaire" : "🎙 Enregistrer";
      if (state !== "recording") status.textContent = hasAudio ? "Audio prêt · lecture automatique" : "Audio facultatif";
      document.getElementById("previewAudioBtn").disabled = !hasAudio;
      document.getElementById("deleteAudioBtn").disabled = !hasAudio;
    }

    function previewRecordedAudio() {
      if (!recordedAudio) return;
      const button = document.getElementById("previewAudioBtn");
      if (previewPlayer && !previewPlayer.paused) {
        previewPlayer.pause();
        previewPlayer.currentTime = 0;
        button.textContent = "▶ Écouter";
        return;
      }
      previewPlayer?.pause();
      previewPlayer = new Audio(recordedAudio);
      previewPlayer.preload = "auto";
      previewPlayer.playsInline = true;
      button.textContent = "■ Stop";
      previewPlayer.onended = () => { button.textContent = "▶ Écouter"; };
      previewPlayer.onerror = () => {
        button.textContent = "▶ Écouter";
        toast("Cet audio ne peut pas être lu. Réenregistre-le.");
      };
      previewPlayer.play().catch(() => {
        button.textContent = "▶ Écouter";
        toast("Impossible de lire cet audio. Réenregistre-le.");
      });
    }

    function deleteRecordedAudio() {
      previewPlayer?.pause();
      recordedAudio = "";
      updateRecorderUI("empty");
      toast("Audio supprimé.");
    }

    function normalizeQuranKey(value = "") {
      return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[\u0101\u00e2\u00e4]/g, "a")
        .replace(/[\u012b\u00ee\u00ef]/g, "i")
        .replace(/[\u016b\u00fb\u00fc]/g, "u")
        .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
    }

    async function loadQuranData() {
      if (quranData) return quranData;
      const response = await fetch(TEXT_REPOSITORIES.kfgqpc.path);
      if (!response.ok) throw new Error("Quran data unavailable");
      quranData = await response.json();
      return quranData;
    }

    async function loadQuranPagesData() {
      if (quranPagesData) return quranPagesData;
      const response = await fetch("data/quran-pages.json");
      if (!response.ok) throw new Error("Quran pages unavailable");
      quranPagesData = await response.json();
      return quranPagesData;
    }

    function resolveSurah(data, value) {
      const key = normalizeQuranKey(value);
      const id = data.aliases[key] || (/^\d+$/.test(key) ? key : "");
      return data.chapters[id] || null;
    }

    function resolveSurahId(value) {
      const data = quranData;
      if (!data) return "";
      const key = normalizeQuranKey(value);
      return data.aliases[key] || (/^\d+$/.test(key) ? key : "");
    }

    function quranPageFor(surahValue, ayahValue) {
      const surahId = resolveSurahId(surahValue);
      const ayah = String(ayahValue || "").trim();
      if (!surahId || !/^\d+$/.test(ayah)) return "";
      const chapterPage = quranData?.chapters?.[String(surahId)]?.pages?.[ayah];
      if (chapterPage) return chapterPage;
      return quranPagesData?.chapters?.[String(surahId)]?.pages?.[ayah] || "";
    }

    function formatVerseReference(surah, ayah, page = "") {
      if (!surah) return "Passage personnel";
      if (!ayah) return surah;
      return page ? `${surah} — Page ${page} - V${ayah}` : `${surah} — V${ayah}`;
    }

    function cleanQuranDisplayText(value = "") {
      return String(value)
        .replace(/[ \t\r\n\f]+/g, " ")
        .trim();
    }

    function setArabicVerseContent(element, text, surahValue = "", ayahValue = "") {
      element.textContent = cleanQuranDisplayText(text || "");
    }

    function elanAudioFileName(surahId, ayah) {
      const surahCode = String(surahId).padStart(3, "0");
      const ayahCode = String(ayah).padStart(3, "0");
      return `${surahCode}${ayahCode}.mp3`;
    }

    async function getElanAudioInfo(card) {
      const rawAyah = String(card.ayah || "").trim();
      if (!/^\d+$/.test(rawAyah)) return null;
      const targetAyah = Number.parseInt(rawAyah, 10);

      const data = await loadQuranData();
      await loadQuranPagesData();
      const chapter = resolveSurah(data, card.surah || "");
      if (!chapter) return null;

      const audioAyah = targetAyah - 1;
      if (audioAyah <= 0) return null;
      const fileName = elanAudioFileName(chapter.id, audioAyah);
      return {
        url: `${ELAN_RECITER_BASE}/${fileName}`,
        label: formatVerseReference(chapter.name, audioAyah, quranPageFor(chapter.name, audioAyah))
      };
    }

    function updateQuranPickerTitle() {
      if (!quranData) return;
      const chapter = quranData.chapters[quranPickerState.surahId];
      const title = document.getElementById("quranPickerTitle");
      const summary = document.getElementById("quranPickerSummary");
      const value = chapter ? formatVerseReference(chapter.name, quranPickerState.ayah, quranPageFor(chapter.name, quranPickerState.ayah)) : "Choisir un verset";
      if (title) title.textContent = value;
      if (summary) summary.textContent = value;
    }

    function renderQuranPicker() {
      if (!quranData) return;
      const surahColumn = document.getElementById("quranSurahColumn");
      const ayahColumn = document.getElementById("quranAyahColumn");
      const chapter = quranData.chapters[quranPickerState.surahId];
      surahColumn.innerHTML = "";
      ayahColumn.innerHTML = "";

      Object.values(quranData.chapters).forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "quran-picker-option";
        button.classList.toggle("active", String(item.id) === String(quranPickerState.surahId));
        button.textContent = `${item.id} - ${item.name}`;
        button.onclick = () => selectPickerSurah(String(item.id));
        surahColumn.appendChild(button);
      });

      if (chapter) {
        const minAyah = 2;
        const maxAyah = Math.max(2, chapter.versesCount - 1);
        const safeAyah = Math.min(Math.max(minAyah, quranPickerState.ayah), maxAyah);
        quranPickerState.ayah = safeAyah;
        for (let i = minAyah; i <= maxAyah; i++) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "quran-picker-option";
          button.classList.toggle("active", i === quranPickerState.ayah);
          button.textContent = i;
          button.onclick = () => selectPickerAyah(i);
          ayahColumn.appendChild(button);
        }
      }
      updateQuranPickerTitle();
      requestAnimationFrame(() => {
        surahColumn.querySelector(".active")?.scrollIntoView({ block: "center" });
        ayahColumn.querySelector(".active")?.scrollIntoView({ block: "center" });
      });
    }

    async function openQuranPicker() {
      try {
        await loadQuranData();
        await loadQuranPagesData();
        const currentSurah = resolveSurah(quranData, document.getElementById("surah").value.trim());
        const currentAyah = Number.parseInt(document.getElementById("ayah").value.trim(), 10);
        if (currentSurah) quranPickerState.surahId = String(currentSurah.id);
        if (Number.isFinite(currentAyah)) quranPickerState.ayah = currentAyah;
        renderQuranPicker();
        document.getElementById("quranPickerModal").classList.add("active");
      } catch (_) {
        toast("Base Quran indisponible. Lance l’app depuis le serveur ou GitHub Pages.");
      }
    }

    function closeQuranPicker() {
      document.getElementById("quranPickerModal")?.classList.remove("active");
    }

    function selectPickerSurah(id) {
      quranPickerState.surahId = id;
      renderQuranPicker();
    }

    function selectPickerAyah(ayah) {
      quranPickerState.ayah = ayah;
      renderQuranPicker();
    }

    function confirmQuranPicker() {
      if (!quranData) return;
      const chapter = quranData.chapters[quranPickerState.surahId];
      if (!chapter) return;
      document.getElementById("surah").value = chapter.name;
      document.getElementById("ayah").value = quranPickerState.ayah;
      updateQuranPickerTitle();
      closeQuranPicker();
      previewAutoFill();
    }

    function renderAutoPreview(items) {
      const preview = document.getElementById("autoPreview");
      const list = document.getElementById("autoPreviewList");
      list.innerHTML = "";
      items.forEach(item => {
        const row = document.createElement("div");
        row.className = "auto-preview-item";

        const label = document.createElement("div");
        label.className = "auto-preview-label";
        label.innerHTML = `<span>${escapeHtml(item.label)}</span><span>${escapeHtml(item.ref)}</span>`;

        const arabic = document.createElement("div");
        arabic.className = "arabic";
        arabic.dir = "rtl";
        setArabicVerseContent(arabic, item.text, item.surah, item.ayah);

        row.append(label, arabic);
        list.appendChild(row);
      });
      preview.hidden = false;
    }

    async function previewAutoFill() {
      const surahValue = document.getElementById("surah").value.trim();
      const ayahValue = document.getElementById("ayah").value.trim();
      clearAutoPreview(false);

      if (!surahValue || !ayahValue) {
        toast("Ajoute la sourate et le verset cible.");
        return;
      }
      if (!/^\d+$/.test(ayahValue)) {
        toast("Le verset cible doit être un nombre.");
        return;
      }

      try {
        const data = await loadQuranData();
        await loadQuranPagesData();
        const chapter = resolveSurah(data, surahValue);
        const targetAyah = Number.parseInt(ayahValue, 10);
        if (!chapter) {
          toast("Sourate non reconnue. Essaie le numéro, ex. 2.");
          return;
        }
        if (targetAyah < 1 || targetAyah > chapter.versesCount) {
          toast("Verset introuvable dans cette sourate.");
          return;
        }
        if (targetAyah <= 1) {
          toast("Impossible : il faut un verset avant le verset cible.");
          return;
        }
        if (targetAyah >= chapter.versesCount) {
          toast("Impossible : il faut un verset après le verset cible.");
          return;
        }

        const before = chapter.verses[String(targetAyah - 1)] || "";
        const target = chapter.verses[String(targetAyah)];
        const after = chapter.verses[String(targetAyah + 1)] || "";
        if (!target || !before || !after) {
          toast("Les trois versets n’ont pas pu être trouvés.");
          return;
        }

        pendingAutoFill = {
          surah: chapter.name,
          ayah: String(targetAyah),
          beforeVerse: before,
          blockageVerse: target,
          afterVerse: after
        };

        const previewItems = [
          { label: "Verset avant", ref: formatVerseReference(chapter.name, targetAyah - 1, quranPageFor(chapter.name, targetAyah - 1)), text: before, surah: chapter.name, ayah: targetAyah - 1 },
          { label: "Verset cible", ref: formatVerseReference(chapter.name, targetAyah, quranPageFor(chapter.name, targetAyah)), text: target, surah: chapter.name, ayah: targetAyah },
          { label: "Verset après", ref: formatVerseReference(chapter.name, targetAyah + 1, quranPageFor(chapter.name, targetAyah + 1)), text: after, surah: chapter.name, ayah: targetAyah + 1 }
        ];
        renderAutoPreview(previewItems);
      } catch (_) {
        toast("Base Quran indisponible. Lance l’app depuis le serveur ou GitHub Pages.");
      }
    }

    function applyAutoFill() {
      if (!pendingAutoFill) {
        toast("Prévisualise d’abord les trois versets.");
        return;
      }
      document.getElementById("surah").value = pendingAutoFill.surah;
      document.getElementById("ayah").value = pendingAutoFill.ayah;
      document.getElementById("beforeVerse").value = pendingAutoFill.beforeVerse;
      document.getElementById("blockageVerse").value = pendingAutoFill.blockageVerse;
      document.getElementById("afterVerse").value = pendingAutoFill.afterVerse;
    }

    function clearAutoPreview(clearPending = true) {
      const preview = document.getElementById("autoPreview");
      const list = document.getElementById("autoPreviewList");
      if (preview) preview.hidden = true;
      if (list) list.innerHTML = "";
      if (clearPending) pendingAutoFill = null;
    }

    function selectDifficulty(value = "transition") {
      const input = document.getElementById("difficulty");
      if (input) input.value = value;
      document.querySelectorAll(".difficulty-chip").forEach(chip => {
        const active = chip.dataset.difficulty === value;
        chip.classList.toggle("active", active);
        chip.setAttribute("aria-checked", active ? "true" : "false");
      });
    }

    function selectReviewMode() {
      const input = document.getElementById("reviewMode");
      if (input) input.value = "recitation";
      const audioSection = document.getElementById("userAudioSection");
      if (audioSection) audioSection.hidden = false;
      const title = document.getElementById("passageCopyTitle");
      const text = document.getElementById("passageCopyText");
      if (title) title.textContent = "Choisis ton passage";
      if (text) text.textContent = "Sélectionne la sourate et le verset cible. L’app prépare automatiquement le verset avant et le verset après.";
    }

    function saveCard(event) {
      event.preventDefault();
      const editId = document.getElementById("editId").value;
      const existing = cards.find(card => card.id === editId);
      const beforeVerse = document.getElementById("beforeVerse").value.trim();
      const blockageVerse = document.getElementById("blockageVerse").value.trim();
      const afterVerse = document.getElementById("afterVerse").value.trim();
      if (!blockageVerse || !beforeVerse || !afterVerse) {
        toast("Choisis puis valide un passage Quran avant d’enregistrer.");
        return;
      }
      const baseData = {
        surah: document.getElementById("surah").value.trim(),
        ayah: document.getElementById("ayah").value.trim(),
        beforeVerse,
        blockageVerse,
        afterVerse,
        difficulty: document.getElementById("difficulty").value,
        note: document.getElementById("note").value.trim(),
        audioData: recordedAudio || "",
        createdAt: existing?.createdAt || Date.now(),
        nextReview: existing?.nextReview || Date.now(),
        strength: existing?.strength || 0,
        interval: existing?.interval || 0,
        reviews: existing?.reviews || 0
      };

      if (existing) {
        const data = {
          ...baseData,
          id: editId,
          type: "recitation",
          audioData: recordedAudio || ""
        };
        cards = cards.map(card => card.id === editId ? data : card);
      } else {
        cards.push({
          ...baseData,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          type: "recitation",
          audioData: recordedAudio || ""
        });
      }
      persist();
      resetForm();
      resetLibraryFilters();
      toast(existing ? "Passage modifié." : "Passage ajouté à ta prochaine session.");
      showScreen("library");
    }

    function editCard(id) {
      const card = cards.find(item => item.id === id);
      if (!card) return;
      document.getElementById("editId").value = card.id;
      document.getElementById("surah").value = card.surah || "";
      document.getElementById("ayah").value = card.ayah || "";
      document.getElementById("beforeVerse").value = card.beforeVerse || card.prompt || "";
      document.getElementById("blockageVerse").value = card.blockageVerse || card.answer || "";
      document.getElementById("afterVerse").value = card.afterVerse || "";
      selectReviewMode();
      selectDifficulty(card.difficulty || "transition");
      document.getElementById("note").value = card.note || "";
      recordedAudio = card.audioData || "";
      updateRecorderUI(recordedAudio ? "ready" : "empty");
      pendingAutoFill = {
        surah: card.surah || "",
        ayah: card.ayah || "",
        beforeVerse: card.beforeVerse || card.prompt || "",
        blockageVerse: card.blockageVerse || card.answer || "",
        afterVerse: card.afterVerse || ""
      };
      updateQuranPickerTitle();
      const editAyah = /^\d+$/.test(String(card.ayah || "")) ? Number.parseInt(card.ayah, 10) : null;
      const previewItems = [
        { label: "Verset avant", ref: verseReference(card, -1), text: pendingAutoFill.beforeVerse, surah: card.surah, ayah: editAyah ? editAyah - 1 : "" },
        { label: "Verset cible", ref: verseReference(card, 0), text: pendingAutoFill.blockageVerse, surah: card.surah, ayah: editAyah || "" },
        { label: "Verset après", ref: verseReference(card, 1), text: pendingAutoFill.afterVerse, surah: card.surah, ayah: editAyah ? editAyah + 1 : "" }
      ];
      renderAutoPreview(previewItems);
      document.getElementById("formTitle").textContent = "Modifie ton passage";
      document.getElementById("saveBtn").textContent = "Enregistrer les modifications";
      showScreen("add");
    }

    function resetForm() {
      if (mediaRecorder?.state === "recording") stopRecording();
      cleanupRecordingStream();
      previewPlayer?.pause();
      document.getElementById("cardForm").reset();
      document.getElementById("editId").value = "";
      recordedAudio = "";
      updateRecorderUI("empty");
      clearAutoPreview();
      selectReviewMode("recitation");
      selectDifficulty("transition");
      document.getElementById("formTitle").textContent = "Ajoute un passage";
      document.getElementById("saveBtn").textContent = "Enregistrer";
    }

    function updateReviewIntroCounts() {
      const activeCount = reviewPool.length;
      const estimatedMinutes = Math.max(1, Math.ceil(activeCount * 0.45));

      document.getElementById("introDueCount").textContent = activeCount;
      document.getElementById("introStartCount").textContent = activeCount;
      document.getElementById("introPlural").textContent = activeCount > 1 ? "s" : "";
      document.getElementById("introEstimate").textContent = activeCount
        ? `≈ ${estimatedMinutes} min pour cette session.`
        : "Aucune carte à revoir dans ce mode aujourd’hui.";
      const introStart = document.querySelector(".intro-start-btn");
      if (introStart) introStart.disabled = activeCount === 0;
      reviewQueue = reviewPool
        .sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
    }

    async function startReview() {
      try {
        await loadQuranData();
        await loadQuranPagesData();
      } catch (_) {
        quranData = null;
      }
      reviewPool = dueCards().sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
      reviewSessionMode = "recitation";
      selectReviewVisualMode("normal");
      updateReviewIntroCounts();
      document.getElementById("reviewIntro").classList.add("active");
      document.getElementById("reviewSession").style.display = "none";
      document.getElementById("reviewSummary").classList.remove("active");
      document.getElementById("reviewScreen").classList.add("active");
      document.getElementById("bottomNav").style.display = "none";
    }

    function selectReviewVisualMode(mode = "normal") {
      reviewVisualMode = mode === "mushaf" ? "mushaf" : "normal";
      document.querySelectorAll("[data-review-visual]").forEach(button => {
        const active = button.dataset.reviewVisual === reviewVisualMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-checked", active ? "true" : "false");
      });
    }

    function beginReviewSession() {
      if (!reviewQueue.length) return startReview();
      reviewIndex = 0;
      sessionResults = { no: 0, almost: 0, yes: 0 };
      sessionRetryIds = [];
      sessionSchedule = [];
      document.getElementById("reviewIntro").classList.remove("active");
      document.getElementById("reviewSession").style.display = "flex";
      document.getElementById("reviewSummary").classList.remove("active");
      renderReviewCard();
    }

    function renderReviewCard() {
      const card = reviewQueue[reviewIndex];
      if (!card) return finishReview();
      document.getElementById("reviewCounter").textContent = `${reviewIndex + 1} / ${reviewQueue.length}`;
      document.getElementById("reviewProgress").style.width = `${(reviewIndex + 1) / reviewQueue.length * 100}%`;
      reviewStage = 0;
      setReviewStep(0);
      renderReviewVerses(card, 0);
      setupElanAudio(card);
      const reviewAudio = document.getElementById("reviewAudio");
      const reviewAudioBtn = document.getElementById("reviewAudioBtn");
      reviewAudio.pause();
      reviewAudio.currentTime = 0;
      reviewAudioBtn.classList.remove("playing");
      setAudioControlState(reviewAudioBtn, "play");
      reviewAudioBtn.classList.toggle("visible", Boolean(card.audioData));
      document.querySelector(".flashcard")?.classList.toggle("has-audio", Boolean(card.audioData));
      if (card.audioData) {
        reviewAudio.src = card.audioData;
        reviewAudio.load();
        reviewAudio.onplay = () => {
          reviewAudioBtn.classList.add("playing");
          setAudioControlState(reviewAudioBtn, "pause");
        };
        reviewAudio.onended = () => {
          reviewAudioBtn.classList.remove("playing");
          setAudioControlState(reviewAudioBtn, "replay");
        };
        reviewAudio.onerror = () => {
          reviewAudioBtn.classList.remove("playing");
          setAudioControlState(reviewAudioBtn, "error");
        };
        playReviewAudio(true);
      } else {
        reviewAudio.removeAttribute("src");
        reviewAudio.load();
      }
      document.getElementById("ratingWrap").classList.remove("visible");
      document.querySelector(".rating-title").textContent = "As-tu enchaîné les deux versets sans hésiter ?";
      setReviewInstruction("Récite de mémoire le passage qui vient après.", true);
      document.getElementById("revealBtn").style.display = "flex";
      document.getElementById("revealBtnLabel").textContent = "Voir le verset cible";
    }

    function setReviewInstruction(text, visible = true) {
      const instruction = document.getElementById("reviewInstruction");
      if (!instruction) return;
      instruction.style.display = visible ? "grid" : "none";
      if (!visible) return;
      instruction.innerHTML = `
        <span class="review-task-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.5 4.5A3 3 0 0 0 5 7.1a3.3 3.3 0 0 0 .5 6.4A3 3 0 0 0 9.5 18V4.5Z"/>
            <path d="M14.5 4.5A3 3 0 0 1 19 7.1a3.3 3.3 0 0 1-.5 6.4A3 3 0 0 1 14.5 18V4.5Z"/>
            <path d="M9.5 8H8M9.5 13H8M14.5 8H16M14.5 13H16M12 3v18"/>
          </svg>
        </span>
        <span class="review-task-copy">
          <strong>Consigne</strong>
          <small>${escapeHtml(text)}</small>
        </span>
        <span class="review-task-sound" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4.4 9.3v5.4h3.1l4.7 3.7V5.6L7.5 9.3H4.4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M16.1 8.8c.9.9 1.4 2 1.4 3.2s-.5 2.3-1.4 3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M19 6.5c1.5 1.5 2.4 3.4 2.4 5.5S20.5 16 19 17.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
      `;
    }

    function advanceReviewStage() {
      const card = reviewQueue[reviewIndex];
      if (!card) return;
      const reviewAudio = document.getElementById("reviewAudio");
      reviewAudio.pause();
      resetElanAudio();
      if (reviewStage === 0) {
        reviewStage = 1;
        setReviewStep(1);
        renderReviewVerses(card, 1);
        setReviewInstruction("Continue ensuite la récitation sans couper l’élan.", true);
        document.getElementById("revealBtnLabel").textContent = "Voir le verset de liaison";
        return;
      }
      reviewStage = 2;
      setReviewStep(2);
      renderReviewVerses(card, 2);
      setReviewInstruction("", false);
      document.getElementById("revealBtn").style.display = "none";
      document.getElementById("ratingWrap").classList.add("visible");
    }

    function verseReference(card, offset = 0) {
      const surah = card.surah || "Passage personnel";
      const rawAyah = String(card.ayah || "").trim();
      if (!rawAyah) return surah;
      if (/^\d+$/.test(rawAyah)) {
        const ayah = Number.parseInt(rawAyah, 10) + offset;
        return formatVerseReference(surah, ayah, quranPageFor(surah, ayah));
      }
      return formatVerseReference(surah, rawAyah);
    }

    function appendElanAudioPanel(list) {
      const elan = document.createElement("div");
      elan.className = "elan-audio-panel";
      elan.id = "elanAudioPanel";
      elan.innerHTML = `
        <div>
          <span id="elanAudioMeta">Préparation de l’élan audio…</span>
        </div>
        <div class="elan-actions">
          <button type="button" id="elanAudioBtn" onclick="playElanAudio()" disabled>${audioControlMarkup("loading")}</button>
          <span>1.25x</span>
        </div>
      `;
      list.appendChild(elan);
    }

    function renderReviewVerses(card, stage) {
      const list = document.getElementById("reviewVerseList");
      list.innerHTML = "";
      list.classList.remove("mushaf-review-surface");
      document.getElementById("reviewSession")?.classList.remove("mushaf-active");
      mushafReviewRenderToken++;

      if (reviewVisualMode === "mushaf" && canRenderMushafReview(card)) {
        renderMushafReviewVerses(card, stage);
        return;
      }

      list.classList.toggle("single", stage === 0);

      const pageHead = document.createElement("div");
      pageHead.className = "review-page-head";
      pageHead.innerHTML = `
        <span>${escapeHtml(card.surah || "Passage personnel")}</span>
        <span>${escapeHtml(card.ayah ? verseReference(card, 0).replace((card.surah || "Passage personnel") + " — ", "") : "Murajaah ciblée")}</span>
      `;
      list.appendChild(pageHead);

      const baseAyah = /^\d+$/.test(String(card.ayah || "")) ? Number.parseInt(card.ayah, 10) : null;
      const verses = [
        { label: "Verset avant", text: card.beforeVerse, ref: verseReference(card, -1), ayah: baseAyah ? baseAyah - 1 : "" },
        { label: "Verset cible", text: card.blockageVerse, ref: verseReference(card, 0), ayah: baseAyah || "" },
        { label: "Verset de liaison", text: card.afterVerse || "Verset suivant non renseigné", ref: verseReference(card, 1), ayah: baseAyah ? baseAyah + 1 : "" }
      ];

      const activeLength = String(verses[stage]?.text || "").length;
      const visibleLength = verses.slice(0, stage + 1).reduce((sum, verse) => sum + String(verse.text || "").length, 0);
      list.classList.toggle("has-long-active", activeLength > 115);
      list.classList.toggle("has-very-long-active", activeLength > 190);
      list.classList.toggle("compact-context", stage > 0 && (activeLength > 90 || visibleLength > 170));
      list.classList.toggle("focus-only", stage < 2);

      verses.forEach((verse, index) => {
        const length = String(verse.text || "").length;
        const item = document.createElement("div");
        item.className = "review-verse-item mushaf-line";
        if (index === stage) item.classList.add("active");
        if (index < stage) item.classList.add("context");
        if (index > stage) item.classList.add("masked");
        if (length > 115) item.classList.add("long");
        if (length > 190) item.classList.add("very-long");

        const arabic = document.createElement("div");
        arabic.className = "arabic";
        arabic.dir = "rtl";
        if (index <= stage) setArabicVerseContent(arabic, verse.text, card.surah, verse.ayah);

        const placeholder = document.createElement("div");
        placeholder.className = "mask-lines";
        placeholder.innerHTML = "<span></span><span></span><span></span>";

        const meta = document.createElement("div");
        meta.className = "review-meta";
        meta.textContent = index < stage ? "" : verse.label;

        if (index <= stage) {
          item.append(meta, arabic);
        } else {
          item.append(placeholder, meta);
        }
        list.appendChild(item);

        if (stage === 0 && index === 0) {
          appendElanAudioPanel(list);
        }
      });

    }

    function canRenderMushafReview(card) {
      const ayah = String(card.ayah || "").trim();
      return Boolean(card.surah && /^\d+$/.test(ayah) && resolveSurahId(card.surah));
    }

    function mushafReviewVerseForStage(card, stage) {
      const baseAyah = Number.parseInt(card.ayah, 10);
      const ayah = baseAyah + (stage - 1);
      const labels = ["Verset avant", "Verset cible", "Verset de liaison"];
      return {
        surah: card.surah,
        surahId: resolveSurahId(card.surah),
        ayah,
        page: quranPageFor(card.surah, ayah),
        label: labels[stage] || "Verset",
        ref: formatVerseReference(card.surah, ayah, quranPageFor(card.surah, ayah))
      };
    }

    function quranpediaMushafSvgUrl(page) {
      return `https://cdn.jsdelivr.net/gh/quranpedia/quran-svg@main/mushafs/hafs/kfqc/svg/${String(page).padStart(3, "0")}.svg`;
    }

    function renderMushafReviewVerses(card, stage) {
      const list = document.getElementById("reviewVerseList");
      document.getElementById("reviewSession")?.classList.add("mushaf-active");
      const token = mushafReviewRenderToken;
      const verse = mushafReviewVerseForStage(card, stage);
      list.className = "verse-surface mushaf-review-surface";
      list.innerHTML = `
        <div class="review-page-head">
          <span>${escapeHtml(verse.surah || "Passage personnel")}</span>
          <span>${escapeHtml(verse.page ? `Page ${verse.page} - V${verse.ayah}` : `V${verse.ayah}`)}</span>
        </div>
        <div class="review-mushaf-card">
          <div class="review-mushaf-meta">
            <strong>${escapeHtml(verse.label)}</strong>
            <span>${escapeHtml(verse.ref)}</span>
          </div>
          <div class="review-mushaf-stage" id="reviewMushafStage">
            <div class="mushaf-loading">Chargement de la page Mushaf…</div>
          </div>
        </div>
      `;

      if (stage === 0) {
        appendElanAudioPanel(list);
        const panel = document.getElementById("elanAudioPanel");
        const cardEl = list.querySelector(".review-mushaf-card");
        if (panel && cardEl) list.insertBefore(panel, cardEl);
      }

      loadMushafReviewSvg(verse, token);
    }

    async function loadMushafReviewSvg(verse, token) {
      const stage = document.getElementById("reviewMushafStage");
      if (!stage || !verse.page) {
        renderMushafReviewFallback(verse);
        return;
      }

      try {
        const response = await fetch(quranpediaMushafSvgUrl(verse.page));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const svgText = await response.text();
        if (token !== mushafReviewRenderToken) return;

        stage.innerHTML = svgText;
        const svg = stage.querySelector("svg");
        if (!svg) throw new Error("Aucun <svg> trouvé dans la réponse.");
        svg.classList.add("mushaf-inline-svg");
        highlightCurrentMushafAyah(svg, verse.surahId, String(verse.ayah));
      } catch (error) {
        console.error("[Murajaah Flash] Impossible de charger la page Mushaf de révision.", error);
        if (token === mushafReviewRenderToken) renderMushafReviewFallback(verse);
      }
    }

    function renderMushafReviewFallback(verse) {
      const stage = document.getElementById("reviewMushafStage");
      if (!stage) return;
      stage.innerHTML = `<div class="mushaf-loading">Page Mushaf indisponible pour ${escapeHtml(verse.ref)}.</div>`;
    }

    function setReviewStep(step) {
      ["stepBefore", "stepTarget", "stepAfter"].forEach((id, index) => {
        document.getElementById(id)?.classList.toggle("active", index === step);
      });
    }

    function audioControlMarkup(state = "play") {
      const icons = {
        play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 7 5-7 5V7Z" fill="currentColor"/></svg>',
        pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 7v10M15 7v10"/></svg>',
        replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 8a7 7 0 1 0 1 6"/><path d="M19 4v4h-4"/></svg>',
        loading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5M12 16.5h.01"/></svg>'
      };
      return icons[state] || icons.play;
    }

    function setAudioControlState(button, state = "play") {
      if (!button) return;
      button.innerHTML = audioControlMarkup(state);
      button.dataset.audioState = state;
      button.classList.toggle("playing", state === "pause");
    }

    function playReviewAudio(automatic = false) {
      const audio = document.getElementById("reviewAudio");
      if (!audio.src) return;
      audio.currentTime = 0;
      audio.play().catch(() => {
        const button = document.getElementById("reviewAudioBtn");
        button.classList.remove("playing");
        setAudioControlState(button, "play");
        if (!automatic) toast("Impossible de lire cet audio. Essaie de le réenregistrer.");
      });
    }

    function resetElanAudio() {
      const audio = document.getElementById("elanAudio");
      const panel = document.getElementById("elanAudioPanel");
      const button = document.getElementById("elanAudioBtn");
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
      if (panel) panel.hidden = true;
      if (button) {
        button.disabled = true;
        setAudioControlState(button, "play");
      }
    }

    async function setupElanAudio(card) {
      resetElanAudio();
      const panel = document.getElementById("elanAudioPanel");
      const meta = document.getElementById("elanAudioMeta");
      const button = document.getElementById("elanAudioBtn");
      const audio = document.getElementById("elanAudio");
      if (!panel || !meta || !button) return;
      panel.hidden = false;
      button.disabled = true;
      setAudioControlState(button, "loading");
      meta.textContent = "Préparation de l’élan audio…";

      try {
        const info = await getElanAudioInfo(card);
        if (reviewStage !== 0 || reviewQueue[reviewIndex]?.id !== card.id) return resetElanAudio();
        if (!info) {
          setAudioControlState(button, "error");
          meta.textContent = "Audio disponible seulement pour un passage Quran reconnu.";
          return;
        }

        audio.src = info.url;
        audio.playbackRate = ELAN_PLAYBACK_RATE;
        audio.load();
        meta.textContent = `${info.label} · Minshawi`;
        button.disabled = false;
        setAudioControlState(button, "play");
        audio.onplay = () => { setAudioControlState(button, "pause"); };
        audio.onpause = () => { setAudioControlState(button, "play"); };
        audio.onended = () => { setAudioControlState(button, "replay"); };
        audio.onerror = () => {
          setAudioControlState(button, "error");
          button.disabled = false;
          meta.textContent = "Audio indisponible pour ce verset.";
        };
        playElanAudio(true);
      } catch (_) {
        setAudioControlState(button, "error");
        meta.textContent = "Ouvre l’app via localhost ou GitHub Pages pour charger l’audio.";
      }
    }

    function playElanAudio(automatic = false) {
      const audio = document.getElementById("elanAudio");
      if (!audio.src) return toast("Élan audio indisponible pour ce passage.");
      audio.playbackRate = ELAN_PLAYBACK_RATE;
      if (!audio.paused) {
        audio.pause();
        return;
      }
      audio.currentTime = 0;
      audio.play().catch(() => {
        const button = document.getElementById("elanAudioBtn");
        if (button) setAudioControlState(button, "play");
        if (!automatic) toast("Impossible de lancer l’élan audio. Vérifie ta connexion.");
      });
    }

    function rateCard(rating) {
      const current = reviewQueue[reviewIndex];
      const card = cards.find(item => item.id === current.id);
      if (!card) return;
      let days = 1;
      if (rating === "no") {
        card.strength = Math.max(0, (card.strength || 0) - 1);
        card.interval = 0;
        days = 0;
      } else if (rating === "almost") {
        card.strength = Math.min(5, Math.max(1, card.strength || 0) + 1);
        card.interval = 1;
        days = 1;
      } else {
        card.strength = Math.min(5, (card.strength || 0) + 1);
        card.interval = card.interval < 3 ? 3 : Math.min(60, Math.round(card.interval * 2.2));
        days = card.interval;
      }
      card.nextReview = startOfToday() + days * DAY;
      card.lastReview = Date.now();
      card.reviews = (card.reviews || 0) + 1;
      card.ratingHistory = [...(Array.isArray(card.ratingHistory) ? card.ratingHistory : []), rating].slice(-10);
      if (rating !== "yes" && !sessionRetryIds.includes(card.id)) sessionRetryIds.push(card.id);
      sessionSchedule.push({
        id: card.id,
        rating,
        title: verseReference(card, 0),
        nextReview: card.nextReview,
        label: scheduleLabelFromTime(card.nextReview)
      });
      sessionResults[rating]++;
      const key = todayKey();
      activity[key] = activity[key] || { reviewed: 0 };
      activity[key].reviewed++;
      persist();
      reviewIndex++;
      if (navigator.vibrate) navigator.vibrate(20);
      renderReviewCard();
    }

    function finishReview() {
      resetElanAudio();
      document.getElementById("reviewSession").style.display = "none";
      document.getElementById("reviewIntro").classList.remove("active");
      document.getElementById("reviewSummary").classList.add("active");
      document.getElementById("sumNo").textContent = sessionResults.no;
      document.getElementById("sumAlmost").textContent = sessionResults.almost;
      document.getElementById("sumYes").textContent = sessionResults.yes;
      const retryTotal = sessionRetryIds.length;
      const total = sessionResults.no + sessionResults.almost + sessionResults.yes;
      const lead = retryTotal
        ? `${retryTotal} passage${retryTotal > 1 ? "s" : ""} mérite${retryTotal > 1 ? "nt" : ""} un rappel immédiat.`
        : `Belle session : ${total} passage${total > 1 ? "s" : ""} travaillé${total > 1 ? "s" : ""}.`;
      document.getElementById("summaryLead").textContent = lead;
      document.getElementById("retryCount").textContent = retryTotal;
      document.getElementById("retryNowBtn").style.display = retryTotal ? "flex" : "none";

      const next = document.getElementById("summaryNext");
      next.innerHTML = "";
      const items = sessionSchedule.slice(-4);
      items.forEach(item => {
        const row = document.createElement("div");
        row.className = `summary-next-row ${item.rating}`;
        row.innerHTML = `<span>${escapeHtml(item.title)}</span><b>${escapeHtml(item.label)}</b>`;
        next.appendChild(row);
      });
    }

    function reviewFailedNow() {
      const retryCards = sessionRetryIds
        .map(id => cards.find(card => card.id === id && !card.archived))
        .filter(Boolean);
      if (!retryCards.length) {
        toast("Aucun passage à revoir maintenant.");
        return;
      }
      reviewQueue = retryCards;
      reviewIndex = 0;
      sessionResults = { no: 0, almost: 0, yes: 0 };
      sessionRetryIds = [];
      sessionSchedule = [];
      document.getElementById("reviewSummary").classList.remove("active");
      document.getElementById("reviewSession").style.display = "flex";
      renderReviewCard();
    }

    function exitReview() {
      const audio = document.getElementById("reviewAudio");
      audio.pause();
      audio.currentTime = 0;
      resetElanAudio();
      document.getElementById("reviewScreen").classList.remove("active");
      document.getElementById("reviewIntro").classList.remove("active");
      document.getElementById("reviewSummary").classList.remove("active");
      document.getElementById("reviewSession").style.display = "flex";
      document.getElementById("bottomNav").style.display = "grid";
      showScreen("home");
    }

    function hifdhPageRangeForHizb(hizb) {
      const safeHizb = Math.min(60, Math.max(1, Number.parseInt(hizb, 10) || 1));
      const start = Math.floor((safeHizb - 1) * TOTAL_MUSHAF_PAGES / 60) + 1;
      const end = Math.floor(safeHizb * TOTAL_MUSHAF_PAGES / 60);
      return { start, end };
    }

    function hifdhRangeLabel(hizb) {
      const range = hifdhPageRangeForHizb(hizb);
      return `Pages ${range.start} - ${range.end}`;
    }

    function openHifdhTest() {
      hifdhTest = null;
      const picker = document.getElementById("hifdhHizbPicker");
      if (picker) {
        picker.hidden = true;
        picker.classList.remove("open");
      }
      document.getElementById("reviewScreen")?.classList.remove("active");
      document.getElementById("reviewIntro")?.classList.remove("active");
      document.getElementById("reviewSession").style.display = "flex";
      document.getElementById("reviewSummary")?.classList.remove("active");
      document.getElementById("bottomNav").style.display = "none";
      document.getElementById("hifdhScreen")?.classList.add("active");
      document.getElementById("hifdhScreen")?.classList.remove("test-running");
      document.getElementById("hifdhHeaderTitle").textContent = "Tester mon hifdh";
      document.getElementById("hifdhTestHeaderControls").hidden = true;
      document.getElementById("hifdhSetup").hidden = false;
      document.getElementById("hifdhQuestion").hidden = true;
      document.getElementById("hifdhSummary").hidden = true;
      renderHifdhSetup();
      window.scrollTo(0, 0);
    }

    function closeHifdhTest() {
      stopHifdhAudio();
      hifdhTest = null;
      const picker = document.getElementById("hifdhHizbPicker");
      if (picker) {
        picker.hidden = true;
        picker.classList.remove("open");
      }
      document.getElementById("hifdhScreen")?.classList.remove("picker-open");
      document.getElementById("hifdhScreen")?.classList.remove("test-running");
      document.getElementById("hifdhScreen")?.classList.remove("active");
      document.getElementById("hifdhTestHeaderControls").hidden = true;
      document.getElementById("bottomNav").style.display = "grid";
      showScreen("home");
    }

    function renderHifdhSetup() {
      const picker = document.getElementById("hifdhHizbPicker");
      const pickerList = document.getElementById("hifdhHizbList");
      if (pickerList && !pickerList.children.length) {
        for (let i = 1; i <= 60; i++) {
          const range = hifdhPageRangeForHizb(i);
          const button = document.createElement("button");
          button.type = "button";
          button.className = "hifdh-picker-item";
          button.dataset.hizb = String(i);
          button.dataset.search = `hizb ${i} pages ${range.start} ${range.end}`;
          button.innerHTML = `
            <span class="hifdh-picker-book" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h5a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H3Z"/><path d="M21 18a1 1 0 0 0 1-1V5a2 2 0 0 0-2-2h-5a3 3 0 0 0-3 3v15a3 3 0 0 1 3-3h6Z"/></svg>
            </span>
            <span class="hifdh-picker-copy">
              <strong>Hizb ${i}</strong>
              <small>Parcours du hizb</small>
            </span>
            <span class="hifdh-picker-pages">Pages ${range.start} - ${range.end}</span>
            <span class="hifdh-picker-state" aria-hidden="true"></span>`;
          button.onclick = () => selectHifdhHizb(i);
          pickerList.appendChild(button);
        }
      }
      document.getElementById("hifdhSelectedHizb").textContent = `Hizb ${hifdhSelectedHizb}`;
      document.getElementById("hifdhSelectedRange").textContent = hifdhRangeLabel(hifdhSelectedHizb);
      const estimate = document.querySelector("#hifdhEstimate span");
      if (estimate) estimate.textContent = `Environ ${Math.max(2, Math.ceil(hifdhQuestionCount * 0.5))} min`;
      document.querySelectorAll("#hifdhHizbList [data-hizb]").forEach(button => {
        const selected = Number(button.dataset.hizb) === hifdhSelectedHizb;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
        const state = button.querySelector(".hifdh-picker-state");
        if (state) {
          state.innerHTML = selected
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m7 12 3 3 7-7"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>';
        }
      });
      document.querySelectorAll("[data-hifdh-count]").forEach(button => {
        button.classList.toggle("active", Number(button.dataset.hifdhCount) === hifdhQuestionCount);
      });
    }

    function toggleHifdhHizbPicker() {
      const picker = document.getElementById("hifdhHizbPicker");
      if (!picker) return;
      if (picker.hidden) {
        window.clearTimeout(hifdhPickerCloseTimer);
        picker.hidden = false;
        document.getElementById("hifdhScreen")?.classList.add("picker-open");
        requestAnimationFrame(() => picker.classList.add("open"));
        const search = document.getElementById("hifdhHizbSearch");
        if (search) {
          search.value = "";
          filterHifdhPicker("");
        }
      } else {
        closeHifdhHizbPicker();
      }
    }

    function closeHifdhHizbPicker() {
      const picker = document.getElementById("hifdhHizbPicker");
      if (!picker || picker.hidden) return;
      picker.classList.remove("open");
      document.getElementById("hifdhScreen")?.classList.remove("picker-open");
      window.clearTimeout(hifdhPickerCloseTimer);
      hifdhPickerCloseTimer = window.setTimeout(() => { picker.hidden = true; }, 180);
    }

    function filterHifdhPicker(query) {
      const normalized = String(query || "").trim().toLocaleLowerCase("fr");
      document.querySelectorAll("#hifdhHizbList [data-hizb]").forEach(button => {
        button.hidden = normalized && !button.dataset.search.includes(normalized);
      });
    }

    function selectHifdhHizb(hizb) {
      hifdhSelectedHizb = Math.min(60, Math.max(1, Number.parseInt(hizb, 10) || 1));
      closeHifdhHizbPicker();
      renderHifdhSetup();
    }

    function selectHifdhQuestionCount(count) {
      hifdhQuestionCount = [5, 10, 20].includes(count) ? count : 10;
      renderHifdhSetup();
    }

    function verseTextFromChapter(chapter, ayah) {
      return chapter?.verses?.[String(ayah)] || "";
    }

    function hifdhAudioUrl(surahId, ayah) {
      return `${ELAN_RECITER_BASE}/${elanAudioFileName(surahId, ayah)}`;
    }

    async function hifdhCandidatesForHizb(hizb) {
      const data = await loadQuranData();
      await loadQuranPagesData();
      const range = hifdhPageRangeForHizb(hizb);
      const candidates = [];
      Object.values(data.chapters).forEach(chapter => {
        for (let ayah = 1; ayah <= chapter.versesCount - 2; ayah++) {
          const page = Number(quranPageFor(chapter.name, ayah));
          if (!page || page < range.start || page > range.end) continue;
          const startText = verseTextFromChapter(chapter, ayah);
          const nextOne = verseTextFromChapter(chapter, ayah + 1);
          const nextTwo = verseTextFromChapter(chapter, ayah + 2);
          if (!startText || !nextOne || !nextTwo) continue;
          candidates.push({
            id: `${chapter.id}:${ayah}`,
            surahId: String(chapter.id),
            surah: chapter.name,
            ayah,
            page,
            startText,
            nextOne,
            nextTwo,
            startRef: formatVerseReference(chapter.name, ayah, page),
            nextOneRef: formatVerseReference(chapter.name, ayah + 1, quranPageFor(chapter.name, ayah + 1)),
            nextTwoRef: formatVerseReference(chapter.name, ayah + 2, quranPageFor(chapter.name, ayah + 2))
          });
        }
      });
      return candidates;
    }

    function shuffledItems(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    async function startHifdhTest() {
      try {
        const candidates = await hifdhCandidatesForHizb(hifdhSelectedHizb);
        if (!candidates.length) {
          toast("Aucun verset testable trouvé pour ce hizb.");
          return;
        }
        const questions = shuffledItems(candidates).slice(0, Math.min(hifdhQuestionCount, candidates.length));
        hifdhTest = {
          hizb: hifdhSelectedHizb,
          range: hifdhPageRangeForHizb(hifdhSelectedHizb),
          total: questions.length,
          index: 0,
          questions,
          results: [],
          startedAt: Date.now()
        };
        document.getElementById("hifdhHeaderTitle").textContent = "Test hifdh";
        document.getElementById("hifdhTestHeaderControls").hidden = false;
        document.getElementById("hifdhSetup").hidden = true;
        document.getElementById("hifdhSummary").hidden = true;
        document.getElementById("hifdhQuestion").hidden = false;
        document.getElementById("hifdhScreen")?.classList.add("test-running");
        renderHifdhQuestion();
      } catch (error) {
        console.error("[Murajaah Flash] Test Hifdh indisponible.", error);
        toast("Impossible de lancer le test. Vérifie que la base Quran est chargée.");
      }
    }

    function currentHifdhQuestion() {
      return hifdhTest?.questions?.[hifdhTest.index] || null;
    }

    function renderHifdhQuestion() {
      const question = currentHifdhQuestion();
      if (!question) return finishHifdhTest(false);
      stopHifdhAudio();
      const current = hifdhTest.index + 1;
      const percent = Math.round((current / hifdhTest.total) * 100);
      document.getElementById("hifdhProgressLabel").textContent = `Question ${current} / ${hifdhTest.total}`;
      document.getElementById("hifdhProgressFill").style.width = `${percent}%`;
      document.getElementById("hifdhProgressPercent").textContent = `${percent}%`;
      document.getElementById("hifdhQuestionHizb").textContent = `Hizb ${hifdhTest.hizb}`;
      document.getElementById("hifdhQuestionRange").textContent = hifdhRangeLabel(hifdhTest.hizb);
      document.getElementById("hifdhAudioMeta").textContent = `${question.startRef} · Minshawi`;
      setArabicVerseContent(document.getElementById("hifdhStartVerse"), question.startText, question.surah, question.ayah);
      document.getElementById("hifdhAudioPanel").hidden = false;
      document.getElementById("hifdhTaskCard").hidden = false;
      document.getElementById("hifdhTaskTitle").textContent = "Consigne";
      document.getElementById("hifdhTaskText").textContent = "Récite les deux versets suivants de mémoire.";
      document.getElementById("hifdhRevealBtn").hidden = false;
      document.getElementById("hifdhRevealLabel").textContent = "Vérifier la suite";
      document.getElementById("hifdhRatings").hidden = true;
      hifdhRevealStage = 0;
      setHifdhStage("start");
      const audio = document.getElementById("hifdhAudio");
      audio.src = hifdhAudioUrl(question.surahId, question.ayah);
      audio.playbackRate = ELAN_PLAYBACK_RATE;
      audio.load();
      audio.onplay = () => { setAudioControlState(document.getElementById("hifdhAudioIcon"), "pause"); };
      audio.onpause = () => { setAudioControlState(document.getElementById("hifdhAudioIcon"), "play"); };
      audio.onended = () => { setAudioControlState(document.getElementById("hifdhAudioIcon"), "replay"); };
      audio.onerror = () => { setAudioControlState(document.getElementById("hifdhAudioIcon"), "error"); };
      audio.currentTime = 0;
      audio.play().catch(() => {});
      window.scrollTo(0, 0);
    }

    function stopHifdhAudio() {
      const audio = document.getElementById("hifdhAudio");
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      setAudioControlState(document.getElementById("hifdhAudioIcon"), "play");
    }

    function playHifdhAudio() {
      const audio = document.getElementById("hifdhAudio");
      if (!audio?.src) return toast("Audio indisponible.");
      audio.playbackRate = ELAN_PLAYBACK_RATE;
      if (!audio.paused) {
        audio.pause();
        return;
      }
      audio.currentTime = 0;
      audio.play().catch(() => toast("Impossible de lancer l’audio. Vérifie ta connexion."));
    }

    function revealHifdhAnswer() {
      const question = currentHifdhQuestion();
      if (!question) return;
      const verse = document.getElementById("hifdhStartVerse");
      const audioPanel = document.getElementById("hifdhAudioPanel");
      const task = document.getElementById("hifdhTaskCard");
      const taskTitle = document.getElementById("hifdhTaskTitle");
      const taskText = document.getElementById("hifdhTaskText");
      const button = document.getElementById("hifdhRevealBtn");
      const label = document.getElementById("hifdhRevealLabel");
      const ratings = document.getElementById("hifdhRatings");

      if (hifdhRevealStage === 0) {
        hifdhRevealStage = 1;
        stopHifdhAudio();
        audioPanel.hidden = true;
        setArabicVerseContent(verse, question.nextOne, question.surah, question.ayah + 1);
        taskTitle.textContent = "Continue";
        taskText.textContent = "Récite maintenant le verset qui vient ensuite.";
        label.textContent = "Voir le deuxième verset";
        setHifdhStage("answer");
        return;
      }

      hifdhRevealStage = 2;
      setArabicVerseContent(verse, question.nextTwo, question.surah, question.ayah + 2);
      task.hidden = true;
      button.hidden = true;
      ratings.hidden = false;
      setHifdhStage("check");
    }

    function setHifdhStage(stage) {
      document.querySelectorAll("[data-hifdh-stage]").forEach(item => {
        const key = item.dataset.hifdhStage;
        item.classList.toggle("active", key === stage);
        item.classList.toggle("done", (stage === "answer" && key === "start") || (stage === "check" && key !== "check"));
      });
    }

    function rateHifdhQuestion(rating) {
      const question = currentHifdhQuestion();
      if (!question) return;
      stopHifdhAudio();
      hifdhTest.results.push({
        ...question,
        rating,
        reviewedAt: Date.now()
      });
      hifdhTest.index++;
      if (navigator.vibrate) navigator.vibrate(18);
      renderHifdhQuestion();
    }

    function finishHifdhTest(cancelled = false) {
      stopHifdhAudio();
      if (!hifdhTest) return closeHifdhTest();
      const results = hifdhTest.results || [];
      const yes = results.filter(item => item.rating === "yes").length;
      const almost = results.filter(item => item.rating === "almost").length;
      const no = results.filter(item => item.rating === "no").length;
      const total = results.length || hifdhTest.total || 1;
      const score = Math.round(((yes + almost * 0.5) / total) * 100);
      const weak = results.filter(item => item.rating !== "yes");
      if (!cancelled || results.length) {
        hifdhHistory.unshift({
          id: Date.now().toString(36),
          hizb: hifdhTest.hizb,
          total,
          yes,
          almost,
          no,
          score,
          weak: weak.map(item => ({ surah: item.surah, ayah: item.ayah, rating: item.rating })),
          createdAt: Date.now()
        });
        hifdhHistory = hifdhHistory.slice(0, 30);
        persist();
      }
      if (cancelled) {
        closeHifdhTest();
        return;
      }
      document.getElementById("hifdhHeaderTitle").textContent = "Résumé";
      document.getElementById("hifdhScreen")?.classList.remove("test-running");
      document.getElementById("hifdhTestHeaderControls").hidden = true;
      document.getElementById("hifdhSetup").hidden = true;
      document.getElementById("hifdhQuestion").hidden = true;
      document.getElementById("hifdhSummary").hidden = false;
      document.getElementById("hifdhSummaryLead").textContent = `Hizb ${hifdhTest.hizb} · ${total} question${total > 1 ? "s" : ""} travaillée${total > 1 ? "s" : ""}.`;
      document.getElementById("hifdhScore").textContent = `${score}%`;
      document.getElementById("hifdhYes").textContent = yes;
      document.getElementById("hifdhAlmost").textContent = almost;
      document.getElementById("hifdhNo").textContent = no;
      renderHifdhWeakList(weak);
      window.scrollTo(0, 0);
    }

    function renderHifdhWeakList(weak) {
      const list = document.getElementById("hifdhWeakList");
      list.innerHTML = "";
      if (!weak.length) {
        list.innerHTML = `<p class="empty-state">Aucun passage faible détecté. Solide.</p>`;
        return;
      }
      weak.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "hifdh-weak-item";
        row.innerHTML = `
          <strong>${escapeHtml(formatVerseReference(item.surah, item.ayah + 1, quranPageFor(item.surah, item.ayah + 1)))}</strong>
          <small>${item.rating === "no" ? "À revoir" : "Presque"} · depuis ${escapeHtml(item.startRef)}</small>
          <button type="button" onclick="addHifdhWeakCard(${index})">Ajouter à mes passages</button>
        `;
        list.appendChild(row);
      });
    }

    function addHifdhWeakCard(index) {
      const weak = (hifdhTest?.results || []).filter(item => item.rating !== "yes");
      const item = weak[index];
      if (!item) return;
      const targetAyah = item.ayah + 1;
      cards.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        type: "recitation",
        surah: item.surah,
        ayah: String(targetAyah),
        beforeVerse: item.startText,
        blockageVerse: item.nextOne,
        afterVerse: item.nextTwo,
        difficulty: "transition",
        note: `Créé depuis le test Hifdh · Hizb ${hifdhTest.hizb}`,
        audioData: "",
        createdAt: Date.now(),
        nextReview: Date.now(),
        strength: 0,
        interval: 0,
        reviews: 0
      });
      persist();
      renderLibrary();
      toast("Passage ajouté à ta bibliothèque.");
      const button = document.querySelectorAll(".hifdh-weak-item button")[index];
      if (button) {
        button.textContent = "Ajouté";
        button.disabled = true;
      }
    }

    function renderSettings() {
      const value = confidence();
      document.getElementById("confidenceValue").textContent = value + "%";
      document.getElementById("confidenceRing").style.setProperty("--confidence", value + "%");
    }

    function askDelete(id) {
      openModal("Supprimer ce passage ?", "Il sera retiré de ta bibliothèque et de tes prochaines révisions.", () => {
        cards = cards.filter(card => card.id !== id);
        persist();
        closeModal();
        renderLibrary();
        toast("Passage supprimé.");
      });
    }

    function askReset() {
      openModal("Tout effacer ?", "Toutes tes cartes, révisions et statistiques locales seront supprimées.", () => {
        cards = [];
        activity = {};
        persist();
        closeModal();
        renderProgress();
        renderSettings();
        toast("Toutes les données ont été effacées.");
      });
    }

    function openModal(title, text, action) {
      document.getElementById("modalTitle").textContent = title;
      document.getElementById("modalText").textContent = text;
      document.getElementById("confirmAction").onclick = action;
      document.getElementById("confirmModal").classList.add("active");
    }

    function closeModal() {
      document.getElementById("confirmModal").classList.remove("active");
    }

    function exportData() {
      if (!cards.length) return toast("Aucune carte à exporter.");
      const data = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), cards, activity }, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `murajaah-flash-${todayKey()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast("Export préparé.");
    }

    let toastTimer;
    function toast(message) {
      const element = document.getElementById("toast");
      element.textContent = message;
      element.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => element.classList.remove("show"), 2400);
    }

    function hideSplash() {
      const splash = document.getElementById("splashScreen");
      if (!splash) return;
      setTimeout(() => {
        splash.classList.add("hidden");
        setTimeout(() => splash.remove(), 380);
      }, 2000);
    }

    function verifyQuranFontLoaded() {
      if (!document.fonts?.load || !document.fonts?.check) {
        console.error("[Murajaah Flash] Font Loading API unavailable: cannot verify KFGQPC Hafs v18.");
        return;
      }

      document.fonts.load('1em "KFGQPC Hafs"', "بِسۡمِ ٱللَّهِ").then(() => {
        const loaded = document.fonts.check('1em "KFGQPC Hafs"', "بِسۡمِ ٱللَّهِ");
        if (!loaded) {
          console.error("[Murajaah Flash] Technical font error: KFGQPC Hafs v18 failed to load.");
        }
      }).catch(error => {
        console.error("[Murajaah Flash] Technical font error: KFGQPC Hafs v18 failed to load.", error);
      });
    }

    const MUSHAF_PROTOTYPE_URL = "https://cdn.jsdelivr.net/gh/quranpedia/quran-svg@main/mushafs/hafs/kfqc/svg/003.svg";
    const MUSHAF_PROTOTYPE_CURRENT_SURAH = "2";
    const MUSHAF_PROTOTYPE_CURRENT_AYAH = "10";
    let mushafPrototypeStep = 0;
    const MUSHAF_PROTOTYPE_STEPS = [
      {
        title: "Verset avant",
        text: "Observe la page entière et repère l’élan sans perdre l’emplacement.",
        button: "Voir le verset cible"
      },
      {
        title: "Verset cible",
        text: "Récite de mémoire le passage que tu veux renforcer.",
        button: "Voir le verset de liaison"
      },
      {
        title: "Verset de liaison",
        text: "Continue ensuite la récitation pour vérifier la fluidité.",
        button: "Revenir à Murajaah"
      }
    ];

    function openMushafPrototype() {
      const prototype = document.getElementById("mushafPrototype");
      const stage = document.getElementById("mushafPrototypeStage");
      if (!prototype || !stage) return;

      mushafPrototypeStep = 0;
      prototype.classList.add("active");
      prototype.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      stage.innerHTML = `<div class="mushaf-loading">Chargement de la page Mushaf…</div>`;
      renderMushafPrototypeStep();
      loadInlineMushafPrototype(stage);
    }

    async function loadInlineMushafPrototype(stage) {
      try {
        const response = await fetch(MUSHAF_PROTOTYPE_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const svgText = await response.text();
        stage.innerHTML = svgText;

        const svg = stage.querySelector("svg");
        if (!svg) throw new Error("Aucun <svg> trouvé dans la réponse.");

        svg.classList.add("mushaf-inline-svg");

        const report = inspectInlineMushafSvg(svg);
        window.__mushafSvgReport = report;
        console.log("[Murajaah Flash] Rapport SVG Mushaf inline", report);
        console.table(report.semanticAttributes);
        console.table(report.verseLike);
        highlightCurrentMushafAyah(svg, MUSHAF_PROTOTYPE_CURRENT_SURAH, MUSHAF_PROTOTYPE_CURRENT_AYAH);
      } catch (error) {
        console.error("[Murajaah Flash] Impossible de charger le SVG Mushaf inline.", error);
        stage.innerHTML = `<div class="mushaf-loading">Impossible de charger le SVG Mushaf.</div>`;
      }
    }

    function highlightCurrentMushafAyah(svg, surah, ayah) {
      svg.querySelectorAll(".mushaf-spotlight-layer, .mushaf-spotlight-defs").forEach(element => element.remove());

      const currentAyah = svg.querySelector(
        `.ayahPolygon[surah="${surah}"][ayah="${ayah}"]`
      );

      if (!currentAyah) {
        console.warn(`[Murajaah Flash] Polygon introuvable pour le verset ${surah}:${ayah}.`);
        return;
      }

      drawMushafSpotlightMask(svg, currentAyah);
      console.log(`[Murajaah Flash] Spotlight Mushaf ${surah}:${ayah}`);
    }

    function drawMushafSpotlightMask(svg, ayahPolygon) {
      const namespace = "http://www.w3.org/2000/svg";
      const canvas = getSvgCanvasBox(svg);
      const maskId = `mushaf-spotlight-mask-${Date.now()}`;

      const defs = document.createElementNS(namespace, "defs");
      defs.classList.add("mushaf-spotlight-defs");

      const mask = document.createElementNS(namespace, "mask");
      mask.setAttribute("id", maskId);
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("x", String(canvas.x));
      mask.setAttribute("y", String(canvas.y));
      mask.setAttribute("width", String(canvas.width));
      mask.setAttribute("height", String(canvas.height));

      const maskBase = document.createElementNS(namespace, "rect");
      maskBase.setAttribute("x", String(canvas.x));
      maskBase.setAttribute("y", String(canvas.y));
      maskBase.setAttribute("width", String(canvas.width));
      maskBase.setAttribute("height", String(canvas.height));
      maskBase.setAttribute("fill", "white");

      const hole = ayahPolygon.cloneNode(false);
      hole.removeAttribute("id");
      hole.classList.remove("ayahPolygon", "is-current");
      hole.setAttribute("fill", "black");
      hole.setAttribute("fill-opacity", "1");
      hole.setAttribute("stroke", "none");

      mask.append(maskBase, hole);
      defs.appendChild(mask);

      const layer = document.createElementNS(namespace, "g");
      layer.classList.add("mushaf-spotlight-layer");
      layer.setAttribute("pointer-events", "none");

      const overlay = document.createElementNS(namespace, "rect");
      overlay.classList.add("mushaf-spotlight-overlay");
      overlay.setAttribute("x", String(canvas.x));
      overlay.setAttribute("y", String(canvas.y));
      overlay.setAttribute("width", String(canvas.width));
      overlay.setAttribute("height", String(canvas.height));
      overlay.setAttribute("mask", `url(#${maskId})`);

      const glow = ayahPolygon.cloneNode(false);
      glow.removeAttribute("id");
      glow.classList.remove("ayahPolygon", "is-current");
      glow.classList.add("mushaf-spotlight-glow");

      layer.append(overlay, glow);
      svg.append(defs, layer);
    }

    function getSvgCanvasBox(svg) {
      const viewBox = svg.viewBox?.baseVal;
      if (viewBox && viewBox.width && viewBox.height) {
        return {
          x: viewBox.x,
          y: viewBox.y,
          width: viewBox.width,
          height: viewBox.height
        };
      }
      const box = safeGetSvgBBox(svg);
      return box || { x: 0, y: 0, width: 1000, height: 1600 };
    }

    function safeGetSvgBBox(element) {
      try {
        return element.getBBox();
      } catch (_) {
        return null;
      }
    }

    function inspectInlineMushafSvg(svg) {
      const elements = Array.from(svg.querySelectorAll("*"));
      const unique = values => [...new Set(values.filter(Boolean))].sort();
      const classes = unique(elements.flatMap(element =>
        String(element.getAttribute("class") || "").split(/\s+/).filter(Boolean)
      ));
      const ids = unique(elements.map(element => element.id).filter(Boolean));
      const dataAttributes = unique(elements.flatMap(element =>
        Array.from(element.attributes || [])
          .filter(attribute => attribute.name.startsWith("data-"))
          .map(attribute => attribute.name)
      ));
      const semanticAttributes = ["surah", "ayah", "number", "verse"].map(name => {
        const match = elements.find(element => element.hasAttribute(name));
        return {
          name,
          count: elements.filter(element => element.hasAttribute(name)).length,
          sample: match ? match.getAttribute(name) : null
        };
      });
      const tagCounts = ["g", "path", "text", "use", "polygon"].reduce((counts, tag) => {
        counts[tag] = svg.querySelectorAll(tag).length;
        return counts;
      }, {});
      const verseLike = elements.filter(element => {
        const id = (element.id || "").toLowerCase();
        const className = String(element.getAttribute("class") || "").toLowerCase();
        const dataNames = Array.from(element.attributes || [])
          .filter(attribute => attribute.name.startsWith("data-"))
          .map(attribute => attribute.name.toLowerCase());
        return (
          id.includes("ayah") ||
          id.includes("verse") ||
          className.includes("ayah") ||
          className.includes("verse") ||
          element.hasAttribute("surah") ||
          element.hasAttribute("ayah") ||
          element.hasAttribute("number") ||
          element.hasAttribute("verse") ||
          dataNames.some(name => name.includes("ayah") || name.includes("verse") || name.includes("surah"))
        );
      }).slice(0, 20).map(element => ({
        tag: element.tagName,
        id: element.id || null,
        class: element.getAttribute("class") || null,
        data: Array.from(element.attributes || [])
          .filter(attribute => attribute.name.startsWith("data-"))
          .map(attribute => `${attribute.name}="${attribute.value}"`),
        surah: element.getAttribute("surah"),
        ayah: element.getAttribute("ayah"),
        number: element.getAttribute("number"),
        verse: element.getAttribute("verse")
      }));

      return {
        classes,
        idCount: ids.length,
        ids: ids.slice(0, 200),
        dataAttributes,
        semanticAttributes,
        tagCounts,
        verseLike
      };
    }

    function renderMushafPrototypeStep() {
      const current = MUSHAF_PROTOTYPE_STEPS[mushafPrototypeStep] || MUSHAF_PROTOTYPE_STEPS[0];
      document.querySelectorAll("#mushafPrototypeTabs span").forEach((tab, index) => {
        tab.classList.toggle("active", index === mushafPrototypeStep);
      });
      const title = document.getElementById("mushafPrototypeTaskTitle");
      const text = document.getElementById("mushafPrototypeTaskText");
      const button = document.getElementById("mushafPrototypeNextBtn");
      if (title) title.textContent = current.title;
      if (text) text.textContent = current.text;
      if (button) button.textContent = current.button;
    }

    function advanceMushafPrototype() {
      if (mushafPrototypeStep >= MUSHAF_PROTOTYPE_STEPS.length - 1) {
        closeMushafPrototype();
        return;
      }
      mushafPrototypeStep++;
      renderMushafPrototypeStep();
    }

    function closeMushafPrototype() {
      const prototype = document.getElementById("mushafPrototype");
      if (!prototype) return;
      prototype.classList.remove("active");
      prototype.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    verifyQuranFontLoaded();
    renderDashboard();
    renderLibrary();
    Promise.all([loadQuranData(), loadQuranPagesData()]).then(() => {
      renderDashboard();
      renderLibrary();
      if (document.getElementById("progressScreen")?.classList.contains("active")) renderProgress();
    }).catch(() => {});
    hideSplash();
