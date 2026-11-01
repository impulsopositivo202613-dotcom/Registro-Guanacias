(() => {
  "use strict";
  let installPrompt = null;
  const banner = document.getElementById("installBanner");
  const installButton = document.getElementById("installButton");
  const dismissButton = document.getElementById("dismissInstall");

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(error => {
        console.warn("No se pudo registrar el modo sin conexión:", error);
      });
    });
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    if (!sessionStorage.getItem("sclintex-install-dismissed") && banner) {
      banner.classList.remove("hidden");
    }
  });

  installButton?.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    banner?.classList.add("hidden");
  });

  dismissButton?.addEventListener("click", () => {
    banner?.classList.add("hidden");
    sessionStorage.setItem("sclintex-install-dismissed", "1");
  });

  window.addEventListener("appinstalled", () => {
    banner?.classList.add("hidden");
    installPrompt = null;
  });
})();
