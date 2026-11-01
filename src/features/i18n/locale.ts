import { setLocale, type Locale } from "#/paraglide/runtime.js";

const CHANGE_EVENT = "localechange";

/**
 * Switches the language without reloading. A reload would be answered by the service worker, which
 * offline serves a page cached in the old language or redirects; everything shown is already on
 * the device, so the screen just renders again (see LocaleBoundary).
 */
export function changeLocale(locale: Locale) {
  setLocale(locale, { reload: false });
  document.documentElement.lang = locale;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeLocale(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}
