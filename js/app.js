"use strict";

// ---------------------------------------------------------------------------
// Configuration et état de l'application
// ---------------------------------------------------------------------------

    const STORAGE_KEY = "murajaah_flash_v2_cards";
    const ACTIVITY_KEY = "murajaah_flash_v2_activity";
    const DAY = 86400000;
    let cards = load(STORAGE_KEY, []).map(card => ({
      ...card,
      beforeVerse: card.beforeVerse || card.prompt || "",
      blockageVerse: card.blockageVerse || card.answer || "",
      afterVerse: card.afterVerse || ""
    }));
    let activity = load(ACTIVITY_KEY, {});
    let activeFilter = "all";
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
      if (name === "settings") renderSettings();
      window.scrollTo(0, 0);
    }

    function renderDashboard() {
      const due = dueCards().length;
      const reviewed = reviewedTodayCount();
      const totalForDay = due + reviewed;
      const progress = totalForDay ? Math.round(reviewed / totalForDay * 100) : 100;
      const fragile = cards.filter(card => !card.archived && (card.strength || 0) <= 1).length;
      const days = streak();
      const date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
      document.getElementById("todayLabel").textContent = date;
      document.getElementById("dueCount").textContent = due;
      document.getElementById("timeEstimate").textContent = "≈ " + (due ? Math.max(1, Math.ceil(due * .35)) : 0) + " min";
      document.getElementById("dailyProgress").style.width = progress + "%";
      document.getElementById("reviewedToday").textContent = reviewed;
      document.getElementById("fragileCount").textContent = fragile;
      document.getElementById("totalCount").textContent = cards.length;
      document.getElementById("streakLabel").textContent = "🔥 " + days + " jour" + (days > 1 ? "s" : "");
      const startBtn = document.getElementById("startReviewBtn");
      startBtn.disabled = cards.length > 0 && due === 0;
      startBtn.textContent = due ? "Commencer la révision" : cards.length ? "Tout est à jour ✓" : "Ajoute ton premier passage";
      const insight = !cards.length
        ? "Ajoute ton premier passage pour lancer ta routine de murajaah ciblée."
        : due
          ? "En 5 minutes ou moins, tu peux revoir tes passages du jour."
          : "Tu es à jour. Reviens demain ou ajoute un passage rencontré aujourd’hui.";
      document.getElementById("insightText").textContent = insight;
    }

    function statusFor(card) {
      const due = (card.nextReview || 0) <= startOfToday() + DAY - 1;
      if (due) return ["due", "À revoir"];
      if ((card.strength || 0) <= 1) return ["fragile", "Fragile"];
      if ((card.strength || 0) >= 4) return ["mastered", "Maîtrisé"];
      return ["progress", "En progrès"];
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
      if (activeFilter === "fragile") filtered = filtered.filter(card => (card.strength || 0) <= 1);
      if (activeFilter === "mastered") filtered = filtered.filter(card => (card.strength || 0) >= 4);
      filtered.sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
      document.getElementById("librarySubtitle").textContent = `${cards.length} passage${cards.length !== 1 ? "s" : ""} enregistré${cards.length !== 1 ? "s" : ""}.`;
      const list = document.getElementById("cardList");
      if (!filtered.length) {
        list.innerHTML = `<div class="empty"><div class="empty-icon">📖</div><h3>${cards.length ? "Aucun résultat" : "Ta bibliothèque est vide"}</h3><p>${cards.length ? "Essaie un autre filtre ou une autre recherche." : "Ajoute un passage à revoir pour commencer ta murajaah ciblée."}</p>${cards.length ? "" : '<button class="primary-btn" onclick="showScreen(\'add\')">Ajouter un passage</button>'}</div>`;
        return;
      }
      list.innerHTML = filtered.map(card => {
        const status = statusFor(card);
        const label = [card.surah || "Sans sourate", card.ayah ? "v. " + card.ayah : ""].filter(Boolean).join(" · ");
        return `<article class="memory-card">
          <div class="memory-top">
            <div class="memory-meta">${escapeHtml(label)}</div>
            <div class="memory-actions">
              <button class="tiny-btn" aria-label="Modifier" onclick="editCard('${card.id}')">✎</button>
              <button class="tiny-btn" aria-label="Supprimer" onclick="askDelete('${card.id}')">×</button>
            </div>
          </div>
          <div class="arabic">${escapeHtml(card.blockageVerse)}</div>
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
      let response = await fetch("data/quran-tajweed.json");
      if (!response.ok) response = await fetch("data/quran-uthmani.json");
      if (!response.ok) throw new Error("Quran data unavailable");
      quranData = await response.json();
      return quranData;
    }

    function cleanTajweedHtml(value = "") {
      return String(value)
        .replace(/<tajweed class=([a-z_]+)>/g, '<tajweed class="$1">')
        .replace(/<span class=end>/g, '<span class="end">')
        .replace(/<(?!\/?(tajweed|span)\b)[^>]*>/g, "")
        .replace(/<span(?! class="end")[^>]*>/g, "<span>")
        .replace(/\son\w+="[^"]*"/g, "");
    }

    function setArabicContent(node, text = "", html = "") {
      if (html) node.innerHTML = cleanTajweedHtml(html);
      else node.textContent = text;
    }

    function resolveSurah(data, value) {
      const key = normalizeQuranKey(value);
      const id = data.aliases[key] || (/^\d+$/.test(key) ? key : "");
      return data.chapters[id] || null;
    }

    function updateQuranPickerTitle() {
      if (!quranData) return;
      const chapter = quranData.chapters[quranPickerState.surahId];
      const title = document.getElementById("quranPickerTitle");
      const summary = document.getElementById("quranPickerSummary");
      const value = chapter ? `${chapter.name} — ${chapter.id}:${quranPickerState.ayah}` : "Choisir un verset";
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
        const safeAyah = Math.min(Math.max(2, quranPickerState.ayah), Math.max(2, chapter.versesCount - 1));
        quranPickerState.ayah = safeAyah;
        for (let i = 2; i < chapter.versesCount; i++) {
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
        setArabicContent(arabic, item.text, item.html);

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
        const chapter = resolveSurah(data, surahValue);
        const targetAyah = Number.parseInt(ayahValue, 10);

        if (!chapter) {
          toast("Sourate non reconnue. Essaie le numéro, ex. 2.");
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

        const before = chapter.verses[String(targetAyah - 1)];
        const target = chapter.verses[String(targetAyah)];
        const after = chapter.verses[String(targetAyah + 1)];
        const beforeHtml = chapter.tajweed?.[String(targetAyah - 1)] || "";
        const targetHtml = chapter.tajweed?.[String(targetAyah)] || "";
        const afterHtml = chapter.tajweed?.[String(targetAyah + 1)] || "";
        if (!before || !target || !after) {
          toast("Les trois versets n’ont pas pu être trouvés.");
          return;
        }

        pendingAutoFill = {
          surah: chapter.name,
          ayah: String(targetAyah),
          beforeVerse: before,
          blockageVerse: target,
          afterVerse: after,
          beforeVerseHtml: beforeHtml,
          blockageVerseHtml: targetHtml,
          afterVerseHtml: afterHtml
        };

        renderAutoPreview([
          { label: "Verset avant", ref: `${chapter.name} — ${targetAyah - 1}`, text: before, html: beforeHtml },
          { label: "Verset cible", ref: `${chapter.name} — ${targetAyah}`, text: target, html: targetHtml },
          { label: "Verset après", ref: `${chapter.name} — ${targetAyah + 1}`, text: after, html: afterHtml }
        ]);
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
      toast("Champs remplis. Vérifie puis enregistre.");
    }

    function clearAutoPreview(clearPending = true) {
      const preview = document.getElementById("autoPreview");
      const list = document.getElementById("autoPreviewList");
      if (preview) preview.hidden = true;
      if (list) list.innerHTML = "";
      if (clearPending) pendingAutoFill = null;
    }

    function saveCard(event) {
      event.preventDefault();
      const editId = document.getElementById("editId").value;
      const existing = cards.find(card => card.id === editId);
      const beforeVerse = document.getElementById("beforeVerse").value.trim();
      const blockageVerse = document.getElementById("blockageVerse").value.trim();
      const afterVerse = document.getElementById("afterVerse").value.trim();
      if (!beforeVerse || !blockageVerse || !afterVerse) {
        toast("Choisis puis valide un passage Quran avant d’enregistrer.");
        return;
      }
      const data = {
        id: editId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
        surah: document.getElementById("surah").value.trim(),
        ayah: document.getElementById("ayah").value.trim(),
        beforeVerse,
        blockageVerse,
        afterVerse,
        beforeVerseHtml: pendingAutoFill?.beforeVerseHtml || existing?.beforeVerseHtml || "",
        blockageVerseHtml: pendingAutoFill?.blockageVerseHtml || existing?.blockageVerseHtml || "",
        afterVerseHtml: pendingAutoFill?.afterVerseHtml || existing?.afterVerseHtml || "",
        difficulty: document.getElementById("difficulty").value,
        note: document.getElementById("note").value.trim(),
        audioData: recordedAudio || "",
        createdAt: existing?.createdAt || Date.now(),
        nextReview: existing?.nextReview || Date.now(),
        strength: existing?.strength || 0,
        interval: existing?.interval || 0,
        reviews: existing?.reviews || 0
      };
      if (existing) cards = cards.map(card => card.id === editId ? data : card);
      else cards.push(data);
      persist();
      resetForm();
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
      document.getElementById("difficulty").value = card.difficulty || "transition";
      document.getElementById("note").value = card.note || "";
      recordedAudio = card.audioData || "";
      updateRecorderUI(recordedAudio ? "ready" : "empty");
      pendingAutoFill = {
        surah: card.surah || "",
        ayah: card.ayah || "",
        beforeVerse: card.beforeVerse || card.prompt || "",
        blockageVerse: card.blockageVerse || card.answer || "",
        afterVerse: card.afterVerse || "",
        beforeVerseHtml: card.beforeVerseHtml || "",
        blockageVerseHtml: card.blockageVerseHtml || "",
        afterVerseHtml: card.afterVerseHtml || ""
      };
      updateQuranPickerTitle();
      renderAutoPreview([
        { label: "Verset avant", ref: verseReference(card, -1), text: pendingAutoFill.beforeVerse, html: pendingAutoFill.beforeVerseHtml },
        { label: "Verset cible", ref: verseReference(card, 0), text: pendingAutoFill.blockageVerse, html: pendingAutoFill.blockageVerseHtml },
        { label: "Verset après", ref: verseReference(card, 1), text: pendingAutoFill.afterVerse, html: pendingAutoFill.afterVerseHtml }
      ]);
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
      document.getElementById("formTitle").textContent = "Ajoute un passage";
      document.getElementById("saveBtn").textContent = "Enregistrer";
    }

    function startReview() {
      reviewQueue = dueCards().sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
      if (!reviewQueue.length) {
        toast(cards.length ? "Tu es à jour pour aujourd’hui." : "Ajoute d’abord un passage.");
        if (!cards.length) showScreen("add");
        return;
      }
      const dueCount = reviewQueue.length;
      const estimatedMinutes = Math.max(1, Math.ceil(dueCount * 0.45));
      document.getElementById("introDueCount").textContent = dueCount;
      document.getElementById("introStartCount").textContent = dueCount;
      document.getElementById("introPlural").textContent = dueCount > 1 ? "s" : "";
      document.getElementById("introEstimate").textContent = `≈ ${estimatedMinutes} min pour revoir tes passages fragiles.`;
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
      document.getElementById("reviewCounter").textContent = `${reviewIndex + 1} / ${reviewQueue.length}`;
      document.getElementById("reviewProgress").style.width = `${(reviewIndex + 1) / reviewQueue.length * 100}%`;
      reviewStage = 0;
      setReviewStep(0);
      renderReviewVerses(card, 0);
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
      document.getElementById("reviewInstruction").style.display = "block";
      document.getElementById("reviewInstruction").textContent = "Récite de mémoire le passage qui vient après.";
      document.getElementById("revealBtn").style.display = "block";
      document.getElementById("revealBtn").textContent = "Révéler le passage";
    }

    function advanceReviewStage() {
      const card = reviewQueue[reviewIndex];
      if (!card) return;
      const reviewAudio = document.getElementById("reviewAudio");
      reviewAudio.pause();
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
        return `${surah} — ${Number.parseInt(rawAyah, 10) + offset}`;
      }
      return `${surah} — ${rawAyah}`;
    }

    function renderReviewVerses(card, stage) {
      const list = document.getElementById("reviewVerseList");
      list.innerHTML = "";
      list.classList.toggle("single", stage === 0);

      const pageHead = document.createElement("div");
      pageHead.className = "review-page-head";
      pageHead.innerHTML = `
        <span>${escapeHtml(card.surah || "Passage personnel")}</span>
        <span>${escapeHtml(card.ayah ? `Verset cible ${card.ayah}` : "Murajaah ciblée")}</span>
      `;
      list.appendChild(pageHead);

      const verses = [
        { label: "Verset avant", text: card.beforeVerse, html: card.beforeVerseHtml, ref: verseReference(card, -1) },
        { label: "Verset cible", text: card.blockageVerse, html: card.blockageVerseHtml, ref: verseReference(card, 0) },
        { label: "Verset de liaison", text: card.afterVerse || "Verset suivant non renseigné", html: card.afterVerseHtml, ref: verseReference(card, 1) }
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
        if (index <= stage) setArabicContent(arabic, verse.text, verse.html);

        const placeholder = document.createElement("div");
        placeholder.className = "mask-lines";
        placeholder.innerHTML = "<span></span><span></span><span></span>";

        const meta = document.createElement("div");
        meta.className = "review-meta";
        meta.textContent = index <= stage ? verse.ref : verse.label;

        item.append(arabic, placeholder, meta);
        list.appendChild(item);
      });

      if (stage < 2) {
        const hint = document.createElement("div");
        hint.className = "review-focus-hint";
        hint.innerHTML = stage === 0
          ? "<span>À retrouver</span><b>Verset cible + liaison</b>"
          : "<span>Continue</span><b>Verset de liaison</b>";
        list.appendChild(hint);
      }
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
      if (rating !== "yes" && !sessionRetryIds.includes(card.id)) sessionRetryIds.push(card.id);
      sessionSchedule.push({
        id: card.id,
        rating,
        title: `${card.surah || "Passage"}${card.ayah ? " — " + card.ayah : ""}`,
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

    renderDashboard();
    renderLibrary();
    hideSplash();
