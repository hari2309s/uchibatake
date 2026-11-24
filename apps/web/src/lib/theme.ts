/**
 * Theme preference. "system" follows prefers-color-scheme (CSS handles it);
 * "light" / "dark" put a class on <html>. Stored per device.
 */
export type ThemePref = "system" | "light" | "dark";

export const THEME_KEY = "uchibatake-theme";

export function readTheme(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    // No window (server) or storage blocked by the browser.
    return "system";
  }
}

export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (pref !== "system") root.classList.add(pref);
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
}

/** Runs before first paint (inline in <head>) so there's no flash of the wrong theme. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.classList.add(t)}catch(e){}`;

const listeners = new Set<() => void>();

/** Saves and applies a preference, then tells any subscribed screens. */
export function setTheme(pref: ThemePref): void {
  applyTheme(pref);
  listeners.forEach((l) => l());
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY) {
      applyTheme(readTheme());
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
