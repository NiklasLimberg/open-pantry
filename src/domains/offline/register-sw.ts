/** Registers the service worker in production builds; development has none (see src/sw.ts). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
    console.warn("Service worker registration failed; the app still works online.", error);
  });
}
