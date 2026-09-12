// PWA install prompt handling. Imported for side-effects in index.js.
let deferredPrompt = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new Event("pwa:available"));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event("pwa:installed"));
  });
}

export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);

export const canInstall = () => deferredPrompt !== null;

export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") deferredPrompt = null;
  return outcome;
}
