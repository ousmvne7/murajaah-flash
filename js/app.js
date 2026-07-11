"use strict";

// ---------------------------------------------------------------------------
// Configuration et état de l'application
// ---------------------------------------------------------------------------

    const STORAGE_KEY = "murajaah_flash_v2_cards";
    const ACTIVITY_KEY = "murajaah_flash_v2_activity";
    const ELAN_RECITER_BASE = "https://everyayah.com/data/Minshawy_Murattal_128kbps";
    const ELAN_PLAYBACK_RATE = 1.25;
    const TEXT_REPOSITORIES = {
      kfgqpc: {
        label: "KFGQPC Hafs",
        path: "data/quran-uthmani.json"
      }
    };
    const TRANSLATION_REPOSITORIES = {
      hamidullah: {
        label: "Muhammad Hamidullah",
        language: "fr",
        path: "data/quran-fr-hamidullah.json",
        source: "QUL Resources"
      }
    };
    const DAY = 86400000;
    let cards = load(STORAGE_KEY, []).map(card => ({
      ...card,
      type: card.type || "recitation",
      translation: card.translation || "",
      beforeVerse: card.beforeVerse || card.prompt || "",
      blockageVerse: card.blockageVerse || card.answer || "",
      afterVerse: card.afterVerse || ""
    }));
    let activity = load(ACTIVITY_KEY, {});
    let activeFilter = "all";
    let reviewPool = [];
    let reviewSessionMode = "recitation";
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
    let translationRepository = null;
    let translationIndex = null;
    let pendingAutoFill = null;
    let quranPickerState = { surahId: "2", ayah: 2 };

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
      document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.screen === name));
      if (name === "home") renderDashboard();
      if (name === "library") renderLibrary();
      if (name === "progress") {
        renderProgress();
        renderSettings();
      }
      window.scrollTo(0, 0);
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

    function cardTypeLabel(card) {
      return card?.type === "translation" ? "Comprendre" : "Récitation";
    }

    function renderLibrary() {
      const query = document.getElementById("searchInput").value.trim().toLowerCase();
      let filtered = cards.filter(card => !card.archived);
      if (query) filtered = filtered.filter(card => [card.surah, card.ayah, card.type, card.beforeVerse, card.blockageVerse, card.afterVerse, card.translation, card.note].join(" ").toLowerCase().includes(query));
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
          ${card.type === "translation" && card.translation ? `<p class="memory-translation">${escapeHtml(card.translation)}</p>` : ""}
          <div class="memory-bottom"><span class="status ${status[0]}">${status[1]}</span><span>${nextReviewLabel(card)}</span></div>
        </article>`;
      }).join("");
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

    async function loadTranslationRepository() {
      if (translationRepository && translationIndex) {
        return { data: translationRepository, index: translationIndex };
      }

      const response = await fetch(TRANSLATION_REPOSITORIES.hamidullah.path);
      if (!response.ok) throw new Error("Translation data unavailable");

      translationRepository = await response.json();
      translationIndex = new Map(
        translationRepository.map(item => [`${item.surah}:${item.ayah}`, item.text])
      );

      return { data: translationRepository, index: translationIndex };
    }

    async function translationForAyah(surahId, ayah) {
      const { index } = await loadTranslationRepository();
      return index.get(`${Number(surahId)}:${Number(ayah)}`) || "";
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

      const audioAyah = card.type === "translation" ? targetAyah : targetAyah - 1;
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
        const pickerMode = document.getElementById("reviewMode")?.value || "recitation";
        const minAyah = pickerMode === "translation" ? 1 : 2;
        const maxAyah = pickerMode === "translation" ? chapter.versesCount : Math.max(2, chapter.versesCount - 1);
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
        const selectedMode = document.getElementById("reviewMode").value || "recitation";

        if (!chapter) {
          toast("Sourate non reconnue. Essaie le numéro, ex. 2.");
          return;
        }
        if (targetAyah < 1 || targetAyah > chapter.versesCount) {
          toast("Verset introuvable dans cette sourate.");
          return;
        }
        if (selectedMode === "recitation" && targetAyah <= 1) {
          toast("Impossible : il faut un verset avant le verset cible.");
          return;
        }
        if (selectedMode === "recitation" && targetAyah >= chapter.versesCount) {
          toast("Impossible : il faut un verset après le verset cible.");
          return;
        }

        const before = chapter.verses[String(targetAyah - 1)] || "";
        const target = chapter.verses[String(targetAyah)];
        const after = chapter.verses[String(targetAyah + 1)] || "";
        if (!target || (selectedMode === "recitation" && (!before || !after))) {
          toast(selectedMode === "translation" ? "Le verset cible n’a pas pu être trouvé." : "Les trois versets n’ont pas pu être trouvés.");
          return;
        }

        const translation = selectedMode === "translation"
          ? await translationForAyah(chapter.id, targetAyah)
          : "";

        pendingAutoFill = {
          surah: chapter.name,
          ayah: String(targetAyah),
          beforeVerse: before,
          blockageVerse: target,
          afterVerse: after,
          translation
        };

        const previewItems = selectedMode === "translation"
          ? [{ label: "Verset cible", ref: formatVerseReference(chapter.name, targetAyah, quranPageFor(chapter.name, targetAyah)), text: target, surah: chapter.name, ayah: targetAyah }]
          : [
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
        const mode = document.getElementById("reviewMode")?.value || "recitation";
        toast(mode === "translation" ? "Prévisualise d’abord le verset cible." : "Prévisualise d’abord les trois versets.");
        return;
      }
      document.getElementById("surah").value = pendingAutoFill.surah;
      document.getElementById("ayah").value = pendingAutoFill.ayah;
      document.getElementById("beforeVerse").value = pendingAutoFill.beforeVerse;
      document.getElementById("blockageVerse").value = pendingAutoFill.blockageVerse;
      document.getElementById("afterVerse").value = pendingAutoFill.afterVerse;
      const translationInput = document.getElementById("translation");
      if (translationInput && !translationInput.value.trim() && pendingAutoFill.translation) {
        translationInput.value = pendingAutoFill.translation;
      }
      toast("Champs remplis. Vérifie puis enregistre.");
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

    function selectReviewMode(value = "recitation") {
      const mode = ["recitation", "translation"].includes(value) ? value : "recitation";
      const input = document.getElementById("reviewMode");
      if (input) input.value = mode;
      document.querySelectorAll(".review-mode-chip").forEach(chip => {
        const active = chip.dataset.reviewMode === mode;
        chip.classList.toggle("active", active);
        chip.setAttribute("aria-checked", active ? "true" : "false");
      });
      const section = document.getElementById("translationSection");
      const hint = document.getElementById("translationHint");
      const audioSection = document.getElementById("userAudioSection");
      if (section) section.classList.toggle("is-optional", mode === "recitation");
      if (audioSection) audioSection.hidden = mode === "translation";
      if (hint) {
        hint.textContent = mode === "recitation"
          ? "Optionnel · utile si tu veux transformer ce passage plus tard en carte Comprendre."
          : "Requis · cette traduction sera cachée pendant la révision.";
      }
      const title = document.getElementById("passageCopyTitle");
      const text = document.getElementById("passageCopyText");
      if (title) title.textContent = mode === "translation" ? "Choisis le verset" : "Choisis ton passage";
      if (text) {
        text.textContent = mode === "translation"
          ? "Sélectionne uniquement le verset cible. La carte servira à retrouver son sens."
          : "Sélectionne la sourate et le verset cible. L’app prépare automatiquement le verset avant et le verset après.";
      }
    }

    function saveCard(event) {
      event.preventDefault();
      const editId = document.getElementById("editId").value;
      const existing = cards.find(card => card.id === editId);
      const beforeVerse = document.getElementById("beforeVerse").value.trim();
      const blockageVerse = document.getElementById("blockageVerse").value.trim();
      const afterVerse = document.getElementById("afterVerse").value.trim();
      const selectedMode = document.getElementById("reviewMode").value || "recitation";
      if (!blockageVerse || (selectedMode === "recitation" && (!beforeVerse || !afterVerse))) {
        toast("Choisis puis valide un passage Quran avant d’enregistrer.");
        return;
      }
      const translation = document.getElementById("translation").value.trim();
      if (selectedMode === "translation" && !translation) {
        toast("Ajoute une traduction française pour créer la carte traduction.");
        return;
      }
      const baseData = {
        surah: document.getElementById("surah").value.trim(),
        ayah: document.getElementById("ayah").value.trim(),
        beforeVerse,
        blockageVerse,
        afterVerse,
        translation,
        difficulty: document.getElementById("difficulty").value,
        note: document.getElementById("note").value.trim(),
        audioData: selectedMode === "translation" ? "" : (recordedAudio || ""),
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
          type: selectedMode,
          audioData: selectedMode === "translation" ? "" : (recordedAudio || "")
        };
        cards = cards.map(card => card.id === editId ? data : card);
      } else {
        cards.push({
          ...baseData,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          type: selectedMode,
          audioData: selectedMode === "translation" ? "" : (recordedAudio || "")
        });
      }
      persist();
      resetForm();
      toast(existing ? "Passage modifié." : selectedMode === "translation" ? "Carte Comprendre ajoutée." : "Passage ajouté à ta prochaine session.");
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
      selectReviewMode(card.type || "recitation");
      selectDifficulty(card.difficulty || "transition");
      document.getElementById("translation").value = card.translation || "";
      document.getElementById("note").value = card.note || "";
      recordedAudio = card.audioData || "";
      updateRecorderUI(recordedAudio ? "ready" : "empty");
      pendingAutoFill = {
        surah: card.surah || "",
        ayah: card.ayah || "",
        beforeVerse: card.beforeVerse || card.prompt || "",
        blockageVerse: card.blockageVerse || card.answer || "",
        afterVerse: card.afterVerse || "",
        translation: card.translation || ""
      };
      updateQuranPickerTitle();
      const editAyah = /^\d+$/.test(String(card.ayah || "")) ? Number.parseInt(card.ayah, 10) : null;
      const previewItems = (card.type || "recitation") === "translation"
        ? [{ label: "Verset cible", ref: verseReference(card, 0), text: pendingAutoFill.blockageVerse, surah: card.surah, ayah: editAyah || "" }]
        : [
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
      const recitationCount = reviewPool.filter(card => (card.type || "recitation") === "recitation").length;
      const translationCount = reviewPool.filter(card => card.type === "translation").length;
      const activeCount = reviewPool.filter(card => (card.type || "recitation") === reviewSessionMode).length;
      const estimatedMinutes = Math.max(1, Math.ceil(activeCount * 0.45));

      document.getElementById("introDueCount").textContent = activeCount;
      document.getElementById("introStartCount").textContent = activeCount;
      document.getElementById("introPlural").textContent = activeCount > 1 ? "s" : "";
      document.getElementById("introEstimate").textContent = activeCount
        ? `≈ ${estimatedMinutes} min pour cette session.`
        : "Aucune carte à revoir dans ce mode aujourd’hui.";
      document.getElementById("sessionRecitationCount").textContent = recitationCount;
      document.getElementById("sessionTranslationCount").textContent = translationCount;

      document.querySelectorAll(".review-session-chip").forEach(chip => {
        const active = chip.dataset.sessionMode === reviewSessionMode;
        const count = chip.dataset.sessionMode === "translation" ? translationCount : recitationCount;
        chip.classList.toggle("active", active);
        chip.disabled = count === 0;
        chip.setAttribute("aria-checked", active ? "true" : "false");
      });
      reviewQueue = reviewPool
        .filter(card => (card.type || "recitation") === reviewSessionMode)
        .sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
    }

    function selectSessionReviewMode(mode = "recitation") {
      if (!["recitation", "translation"].includes(mode)) return;
      const count = reviewPool.filter(card => (card.type || "recitation") === mode).length;
      if (!count) return;
      reviewSessionMode = mode;
      updateReviewIntroCounts();
    }

    async function startReview() {
      try {
        await loadQuranData();
      } catch (_) {
        quranData = null;
      }
      reviewPool = dueCards().sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
      if (!reviewPool.length) {
        toast(cards.length ? "Tu es à jour pour aujourd’hui." : "Ajoute d’abord un passage.");
        if (!cards.length) showScreen("add");
        return;
      }
      reviewSessionMode = reviewPool.some(card => (card.type || "recitation") === "recitation") ? "recitation" : "translation";
      updateReviewIntroCounts();
      document.getElementById("reviewIntro").classList.add("active");
      document.getElementById("reviewSession").style.display = "none";
      document.getElementById("reviewSummary").classList.remove("active");
      document.getElementById("reviewScreen").classList.add("active");
      document.getElementById("bottomNav").style.display = "none";
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
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      document.getElementById("reviewCounter").textContent = `${reviewIndex + 1} / ${reviewQueue.length}`;
      document.getElementById("reviewProgress").style.width = `${(reviewIndex + 1) / reviewQueue.length * 100}%`;
      reviewStage = 0;
      setReviewStep(card.type === "translation" ? 1 : 0);
      renderReviewVerses(card, 0);
      setupElanAudio(card);
      const reviewAudio = document.getElementById("reviewAudio");
      const reviewAudioBtn = document.getElementById("reviewAudioBtn");
      reviewAudio.pause();
      reviewAudio.currentTime = 0;
      reviewAudioBtn.classList.remove("playing");
      reviewAudioBtn.textContent = "▶";
      reviewAudioBtn.classList.toggle("visible", Boolean(card.audioData));
      document.querySelector(".flashcard")?.classList.toggle("has-audio", Boolean(card.audioData));
      if (card.audioData) {
        reviewAudio.src = card.audioData;
        reviewAudio.load();
        reviewAudio.onplay = () => {
          reviewAudioBtn.classList.add("playing");
          reviewAudioBtn.textContent = "🔊";
        };
        reviewAudio.onended = () => {
          reviewAudioBtn.classList.remove("playing");
          reviewAudioBtn.textContent = "↻";
        };
        reviewAudio.onerror = () => {
          reviewAudioBtn.classList.remove("playing");
          reviewAudioBtn.textContent = "!";
        };
        playReviewAudio(true);
      } else {
        reviewAudio.removeAttribute("src");
        reviewAudio.load();
      }
      document.getElementById("ratingWrap").classList.remove("visible");
      document.querySelector(".rating-title").textContent = card.type === "translation"
        ? "As-tu retrouvé le sens du verset ?"
        : "As-tu enchaîné les deux versets sans hésiter ?";
      document.getElementById("reviewInstruction").style.display = "block";
      document.getElementById("reviewInstruction").textContent = card.type === "translation"
        ? "Retrouve le sens du verset en français."
        : "Récite de mémoire le passage qui vient après.";
      document.getElementById("revealBtn").style.display = "block";
      document.getElementById("revealBtn").textContent = card.type === "translation" ? "Révéler la traduction" : "Révéler le passage";
    }

    function advanceReviewStage() {
      const card = reviewQueue[reviewIndex];
      if (!card) return;
      const reviewAudio = document.getElementById("reviewAudio");
      reviewAudio.pause();
      resetElanAudio();
      if (card.type === "translation") {
        reviewStage = 1;
        setReviewStep(1);
        renderReviewVerses(card, 1);
        document.getElementById("reviewInstruction").style.display = "none";
        document.getElementById("revealBtn").style.display = "none";
        document.getElementById("ratingWrap").classList.add("visible");
        speakTranslationAudio(true);
        return;
      }
      if (reviewStage === 0) {
        reviewStage = 1;
        setReviewStep(1);
        renderReviewVerses(card, 1);
        document.getElementById("reviewInstruction").textContent = "Continue ensuite la récitation sans couper l’élan.";
        document.getElementById("revealBtn").textContent = "Voir le verset après";
        return;
      }
      reviewStage = 2;
      setReviewStep(2);
      renderReviewVerses(card, 2);
      document.getElementById("reviewInstruction").style.display = "none";
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
          <button type="button" id="elanAudioBtn" onclick="playElanAudio()" disabled>…</button>
          <span>1.25x</span>
        </div>
      `;
      list.appendChild(elan);
    }

    function renderTranslationReviewVerses(card, stage) {
      const list = document.getElementById("reviewVerseList");
      list.innerHTML = "";
      list.className = "verse-surface translation-surface single";

      const pageHead = document.createElement("div");
      pageHead.className = "review-page-head";
      pageHead.innerHTML = `
        <span>${escapeHtml(card.surah || "Passage personnel")}</span>
        <span>${escapeHtml(card.ayah ? verseReference(card, 0).replace((card.surah || "Passage personnel") + " — ", "") : "Comprendre")}</span>
      `;
      list.appendChild(pageHead);

      const item = document.createElement("div");
      item.className = "review-verse-item mushaf-line active translation-arabic-line";

      const meta = document.createElement("div");
      meta.className = "review-meta";
      meta.textContent = verseReference(card, 0);

      const arabic = document.createElement("div");
      arabic.className = "arabic";
      arabic.dir = "rtl";
      setArabicVerseContent(arabic, card.blockageVerse, card.surah, card.ayah);

      item.append(meta, arabic);
      list.appendChild(item);

      if (stage === 0) appendElanAudioPanel(list);

      const answer = document.createElement("div");
      answer.className = stage > 0 ? "translation-answer revealed" : "translation-answer masked";
      if (stage > 0) {
        answer.innerHTML = `
          <span>Sens du verset</span>
          <p>${escapeHtml(card.translation || "Traduction non renseignée.")}</p>
          <button type="button" class="translation-audio-btn" onclick="speakTranslationAudio()">Écouter en français</button>
        `;
      } else {
        answer.innerHTML = `
          <span>Sens caché</span>
          <div class="mask-lines"><span></span><span></span><span></span></div>
        `;
      }
      list.appendChild(answer);
    }

    function renderReviewVerses(card, stage) {
      if (card.type === "translation") {
        renderTranslationReviewVerses(card, stage);
        return;
      }
      const list = document.getElementById("reviewVerseList");
      list.innerHTML = "";
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

    function setReviewStep(step) {
      ["stepBefore", "stepTarget", "stepAfter"].forEach((id, index) => {
        document.getElementById(id)?.classList.toggle("active", index === step);
      });
    }

    function playReviewAudio(automatic = false) {
      const audio = document.getElementById("reviewAudio");
      if (!audio.src) return;
      audio.currentTime = 0;
      audio.play().catch(() => {
        const button = document.getElementById("reviewAudioBtn");
        button.classList.remove("playing");
        button.textContent = "▶";
        if (!automatic) toast("Impossible de lire cet audio. Essaie de le réenregistrer.");
      });
    }

    function speakTranslationAudio(automatic = false) {
      const card = reviewQueue[reviewIndex];
      const text = String(card?.translation || "").trim();
      if (!text) return;
      if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
        if (!automatic) toast("Lecture vocale indisponible sur ce navigateur.");
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.94;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
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
        button.textContent = "▶";
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
      button.textContent = "…";
      meta.textContent = card.type === "translation" ? "Préparation de l’audio du verset…" : "Préparation de l’élan audio…";

      try {
        const info = await getElanAudioInfo(card);
        if (reviewStage !== 0 || reviewQueue[reviewIndex]?.id !== card.id) return resetElanAudio();
        if (!info) {
          button.textContent = "!";
          meta.textContent = "Audio disponible seulement pour un passage Quran reconnu.";
          return;
        }

        audio.src = info.url;
        audio.playbackRate = ELAN_PLAYBACK_RATE;
        audio.load();
        meta.textContent = `${info.label} · Minshawi`;
        button.disabled = false;
        button.textContent = "▶";
        audio.onplay = () => { button.textContent = "Ⅱ"; };
        audio.onpause = () => { button.textContent = "▶"; };
        audio.onended = () => { button.textContent = "↻"; };
        audio.onerror = () => {
          button.textContent = "!";
          button.disabled = false;
          meta.textContent = "Audio indisponible pour ce verset.";
        };
        playElanAudio(true);
      } catch (_) {
        button.textContent = "!";
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
        if (button) button.textContent = "▶";
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
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      resetElanAudio();
      document.getElementById("reviewScreen").classList.remove("active");
      document.getElementById("reviewIntro").classList.remove("active");
      document.getElementById("reviewSummary").classList.remove("active");
      document.getElementById("reviewSession").style.display = "flex";
      document.getElementById("bottomNav").style.display = "grid";
      showScreen("home");
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

    verifyQuranFontLoaded();
    renderDashboard();
    renderLibrary();
    Promise.all([loadQuranData(), loadQuranPagesData()]).then(() => {
      renderDashboard();
      renderLibrary();
      if (document.getElementById("progressScreen")?.classList.contains("active")) renderProgress();
    }).catch(() => {});
    hideSplash();
