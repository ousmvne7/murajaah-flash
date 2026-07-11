(() => {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", {
        scope: "./",
        updateViaCache: "none"
      });
      registration.update().catch(() => {});
    } catch (error) {
      console.error("[Murajaah Flash] Échec de l’enregistrement PWA.", error);
    }
  });
})();
