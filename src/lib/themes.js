import { read, write, remove, KEYS } from "./storage.js";

/* Rang mavzulari: nomi, sxema, fon, karta, asosiy rang — app.css dagi qiymatlar bilan bir xil */
export const THEMES = {
  light:  { name: "Yorug'",   scheme: "light", bg: "#f5f7fb", surface: "#ffffff", accent: "#4c72ee" },
  dark:   { name: "Qora",     scheme: "dark",  bg: "#121214", surface: "#1b1b1f", accent: "#6b8cf6" },
  amoled: { name: "Qop-qora", scheme: "dark",  bg: "#000000", surface: "#0c0c0e", accent: "#6b8cf6" },
  ocean:  { name: "Okean",    scheme: "dark",  bg: "#0a1520", surface: "#101f2d", accent: "#3ea8e5" },
  forest: { name: "O'rmon",   scheme: "dark",  bg: "#0c1410", surface: "#131f19", accent: "#2fb57a" },
  grape:  { name: "Binafsha", scheme: "dark",  bg: "#120f1b", surface: "#1b1727", accent: "#9476f4" },
  sunset: { name: "Shaftoli", scheme: "light", bg: "#fbf4ee", surface: "#fffdfb", accent: "#e5652f" },
  rose:   { name: "Pushti",   scheme: "light", bg: "#fbf2f5", surface: "#ffffff", accent: "#d6457b" },
  mint:   { name: "Yalpiz",   scheme: "light", bg: "#f0f7f4", surface: "#ffffff", accent: "#14a06b" }
};

export const systemTheme = () =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";

/* Saqlangan tanlov: mavzu nomi yoki "auto" */
export const savedChoice = () => {
  const saved = read(KEYS.theme);
  return saved in THEMES ? saved : "auto";
};

export function applyTheme(id) {
  const theme = THEMES[id] || THEMES[systemTheme()];
  const root = document.documentElement;
  root.dataset.theme = id in THEMES ? id : systemTheme();
  root.dataset.scheme = theme.scheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.bg);
  // Android ilovada status bar va pastki tizim paneli ham shu rangda
  try { window.HisoblaNative?.setBars?.(theme.bg, theme.surface, theme.scheme === "dark"); } catch { /* sayt */ }
}

/* Mavzuni saqlab qo'llash; brauzer qo'llasa — bosilgan joydan aylana bo'lib yoyiladi */
export function chooseTheme(choice, originEl) {
  if (choice === "auto") remove(KEYS.theme);
  else write(KEYS.theme, choice);
  const next = choice === "auto" ? systemTheme() : choice;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // Sahifa ko'rinmayotgan bo'lsa animatsiya kadrlari chizilmaydi — darhol qo'llaymiz
  if (!document.startViewTransition || reduce || !originEl || document.visibilityState !== "visible") { applyTheme(next); return; }
  const r = originEl.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const style = document.documentElement.style;
  style.setProperty("--tx", `${x}px`);
  style.setProperty("--ty", `${y}px`);
  style.setProperty("--tr", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
  document.startViewTransition(() => applyTheme(next));
}
