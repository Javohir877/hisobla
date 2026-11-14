import { useEffect, useState } from "react";

/* localStorage yopiq bo'lishi mumkin (maxfiy oyna, ilova cheklovi) — xatolarsiz ishlaymiz */
export function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function write(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

export function remove(key) {
  try { localStorage.removeItem(key); } catch { /* jim */ }
}

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(read(key) ?? "null");
    if (value === null) return fallback;
    if (Array.isArray(fallback)) return Array.isArray(value) ? value : fallback;
    return typeof value === "object" ? { ...fallback, ...value } : fallback;
  } catch {
    return fallback;
  }
}

/* useState kabi, lekin qiymat qurilmada saqlanadi */
export function useStored(key, fallback) {
  const [value, setValue] = useState(() => readJSON(key, fallback));
  useEffect(() => { write(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}

export const KEYS = {
  history: "hisobla-calculation-history",
  theme: "hisobla-theme",
  page: "hisobla-page",
  settings: "hisobla-settings",
  practice: "hisobla-practice",
  banner: "hisobla-app-banner-closed"
};
