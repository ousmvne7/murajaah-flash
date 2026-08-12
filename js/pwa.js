(() => {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  let reloading = false;

  function showUpdate(registration) {
    if (!registration.waiting || !navigator.serviceWorker.controller || document.getElementById("pwaUpdateNotice")) return;
    const notice = document.createElement("aside");
    notice.id = "pwaUpdateNotice";
    notice.className = "pwa-update-notice";
    notice.setAttribute("role", "status");
    notice.innerHTML = '<span>Nouvelle version disponible</span><button type="button">Mettre à jour</button>';
    notice.querySelector("button").addEventListener("click", () => {
      notice.classList.add("is-updating");
      notice.querySelector("button").disabled = true;
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    });
    document.body.append(notice);
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", {
        scope: "./",
        updateViaCache: "none"
      });
      showUpdate(registration);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") showUpdate(registration);
        });
      });
      registration.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      });
    } catch (error) {
      console.error("[Murajaah Flash] Échec de l’enregistrement PWA.", error);
    }
  });
})();
