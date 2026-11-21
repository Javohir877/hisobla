import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppContext, IS_APP, NATIVE, APP_VERSION, PAGES } from "./context.js";
import { useStored, read, write, KEYS } from "./lib/storage.js";
import { applyTheme, savedChoice, systemTheme } from "./lib/themes.js";
import { fetchLatestRelease, isNewer } from "./lib/updates.js";
import { Sidebar, Topbar, TabBar, AppBanner, Footer } from "./components/Layout.jsx";
import Sheet from "./components/Sheet.jsx";
import ThemeGrid from "./components/ThemeGrid.jsx";
import UpdateNotice from "./components/UpdateNotice.jsx";
import Calculator, { HistoryList } from "./pages/Calculator.jsx";
import Fractions from "./pages/Fractions.jsx";
import Roots from "./pages/Roots.jsx";
import { Converter, Percent, Bmi, Loan } from "./pages/Tools.jsx";
import Home from "./pages/Home.jsx";
import { configureSound, playSound, soundForElement } from "./lib/sounds.js";
import Settings from "./pages/Settings.jsx";

const PAGE_COMPONENTS = { home: Home, calculator: Calculator, fractions: Fractions, roots: Roots, converter: Converter, percent: Percent, bmi: Bmi, loan: Loan, settings: Settings };
const DEFAULT_PAGE = IS_APP ? "home" : "calculator";
const DEFAULT_SETTINGS = { degrees: true, fractionFirst: false, scientific: false, haptics: true, sound: true, soundPack: "deep", soundVolume: 0.7 };

/* Manzildan bo'lim: #fractions, #practice (= kasrlar mashqi) */
function fromHash() {
  const hash = location.hash.slice(1);
  if (hash === "practice") return { page: "fractions", tab: "practice" };
  return hash in PAGES ? { page: hash } : null;
}

function initialRoute() {
  const route = fromHash();
  if (IS_APP) {
    // Ilovada tarix boshida doim "Asosiy" turadi — "orqaga" unga qaytaradi
    history.replaceState(null, "", "#home");
    if (route && route.page !== "home") history.pushState(null, "", `#${route.page}`);
    return route || { page: "home" };
  }
  const saved = read(KEYS.page);
  const result = route || { page: saved in PAGES && saved !== "home" && saved !== "settings" ? saved : DEFAULT_PAGE };
  history.replaceState(null, "", `#${result.page}`);
  return result;
}

export default function App() {
  const [route] = useState(initialRoute);
  const [page, setPage] = useState(route.page);
  const [fractionTab, setFractionTab] = useState(route.tab || "ops");
  const [settings, setSettings] = useStored(KEYS.settings, DEFAULT_SETTINGS);
  // Diqqat: "history" nomi brauzerning window.history bilan to'qnashadi — shuning uchun calcHistory
  const [calcHistory, setHistory] = useStored(KEYS.history, []);
  const [practiceScore, setPracticeScore] = useStored(KEYS.practice, { right: 0, total: 0, streak: 0, best: 0 });
  const [expression, setExpression] = useState("");
  const [sheet, setSheet] = useState(null);
  const [toastState, setToastState] = useState(null);
  const navDepth = useRef(0);

  /* ---------- Xabarlar va oynalar ---------- */
  const toast = useCallback(text => setToastState({ text, id: Date.now() }), []);
  useEffect(() => {
    if (!toastState) return;
    const timer = setTimeout(() => setToastState(null), 3200);
    return () => clearTimeout(timer);
  }, [toastState]);

  const closeSheet = useCallback(() => setSheet(null), []);

  /* ---------- Navigatsiya ---------- */
  const pageRef = useRef(page);
  const showPage = next => { pageRef.current = next; setPage(next); };

  const navigate = useCallback(next => {
    setSheet(null);
    if (pageRef.current === next) return;
    history.pushState(null, "", `#${next}`);
    navDepth.current++;
    showPage(next);
    window.scrollTo({ top: 0 });
  }, []);

  const goBack = useCallback(() => {
    if (navDepth.current > 0) history.back();
    else { history.replaceState(null, "", "#home"); showPage("home"); }
  }, []);

  useEffect(() => {
    const onPop = () => {
      navDepth.current = Math.max(0, navDepth.current - 1);
      const r = fromHash() || { page: DEFAULT_PAGE };
      if (r.tab) setFractionTab(r.tab);
      showPage(r.page);
      setSheet(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!IS_APP) write(KEYS.page, page);
    document.documentElement.dataset.page = page;
  }, [page]);

  /* ---------- Mavzu: saqlangan yoki tizimnikiga mos ---------- */
  useEffect(() => {
    applyTheme(savedChoice() === "auto" ? systemTheme() : savedChoice());
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = event => savedChoice() === "auto" && applyTheme(event.matches ? "dark" : "light");
    media?.addEventListener?.("change", onChange);
    return () => media?.removeEventListener?.("change", onChange);
  }, []);

  /* ---------- Ilova ichida: tugmalarda tebranish ---------- */
  useEffect(() => {
    if (!NATIVE || settings.haptics === false) return;
    const onDown = event => {
      if (event.target.closest?.(".key, .op-button, .tab-btn, .frac-tab, .primary-button, .tool-tile, .settings-row, .frac-sign, .theme-option, .practice-cta")) {
        try { NATIVE.haptic(); } catch { /* jim */ }
      }
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, [settings.haptics]);

  /* ---------- Tugma ovozlari (ASMR) ---------- */
  useEffect(() => { configureSound(settings); }, [settings]);
  useEffect(() => {
    if (settings.sound === false) return;
    const onDown = event => {
      if (event.button > 0) return;
      const s = soundForElement(event.target);
      if (s) playSound(...s);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, [settings.sound]);

  /* ---------- Yangilanish: ilova ochilganda tekshiramiz ---------- */
  const checkUpdate = useCallback(async (manual = false) => {
    if (!APP_VERSION) return;
    const later = Number(read("hisobla-update-later") || 0);
    if (!manual && Date.now() - later < 12 * 3600e3) return;
    try {
      const latest = await fetchLatestRelease();
      if (latest.version && isNewer(latest.version, APP_VERSION)) setSheet({ kind: "update", update: latest });
      else if (manual) toast("Sizda eng so'nggi versiya o'rnatilgan ✓");
    } catch {
      if (manual) toast("Internetga ulanib bo'lmadi. Keyinroq urinib ko'ring.");
    }
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => checkUpdate(false), 1500);
    return () => clearTimeout(timer);
  }, [checkUpdate]);

  const installUpdate = update => {
    setSheet(null);
    if (NATIVE?.downloadUpdate) {
      NATIVE.downloadUpdate(update.url);
      toast("Yangilanish yuklanmoqda… Tugagach o'rnatish oynasi ochiladi.");
    } else {
      window.open(update.url, "_blank", "noopener");
    }
  };

  /* Android: tezkor yorliqlar va yangilanish holati shu funksiyalarni chaqiradi */
  useEffect(() => {
    window.hisoblaOpen = target => {
      if (target === "practice") { setFractionTab("practice"); navigate("fractions"); }
      else if (target in PAGES) navigate(target);
    };
    window.hisoblaUpdateStatus = status => {
      if (status === "failed") toast("Yangilanishni yuklab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.");
      if (status === "permission") toast("O'rnatish uchun \"Ushbu manbadan ruxsat berish\"ni yoqing va ilovaga qayting.");
    };
  }, [navigate, toast]);

  /* ---------- Umumiy holat (barcha sahifalar uchun) ---------- */
  const app = useMemo(() => ({
    page, navigate, goBack, fractionTab, setFractionTab,
    settings, updateSettings: patch => setSettings(s => ({ ...s, ...patch })),
    history: calcHistory, setHistory, practiceScore, setPracticeScore,
    expression, setExpression,
    openExpression: text => { setExpression(text); navigate("calculator"); },
    toast, checkUpdate,
    openHistory: () => setSheet({ kind: "history" }),
    openThemes: () => setSheet({ kind: "themes" }),
    confirm: (question, onYes) => setSheet({ kind: "confirm", question, onYes })
  }), [page, navigate, goBack, fractionTab, settings, calcHistory, practiceScore, expression, toast, checkUpdate, setSettings, setHistory, setPracticeScore]);

  const Page = PAGE_COMPONENTS[page];
  // Oyna yopilayotganda (animatsiya davomida) oxirgi mazmuni ko'rinib tursin
  const lastSheet = useRef(null);
  if (sheet) lastSheet.current = sheet;
  const shown = sheet || lastSheet.current || {};

  return (
    <AppContext.Provider value={app}>
      <div className="app-shell">
        {!IS_APP && <Sidebar />}
        <main className="main-content">
          <Topbar />
          {!IS_APP && (
            <section className="page-heading title-enter" key={`h-${page}`}>
              <div>
                <p className="eyebrow">BARCHA HISOBLAR — BIR JOYDA</p>
                <h1>{PAGES[page].title}</h1>
                <p className="page-description">{PAGES[page].desc}</p>
              </div>
              <div className="date-chip"><span aria-hidden="true">✳</span> Aniq hisob-kitob</div>
            </section>
          )}
          {/* key — sahifa almashganda kartalar CSS animatsiyasi bilan paydo bo'ladi */}
          <div className="workspace page-enter" key={page}><Page /></div>
          {!IS_APP && <Footer />}
        </main>
      </div>
      {IS_APP && <TabBar />}
      <AppBanner />

      <Sheet open={sheet?.kind === "history"} onClose={closeSheet} label="Hisoblar tarixi">
        <div className="sheet-header">
          <h3>So'nggi hisoblar</h3>
          {calcHistory.length > 0 && (
            <button type="button" className="text-button"
              onClick={() => setSheet({ kind: "confirm", question: "Hisoblar tarixi o'chirilsinmi?", onYes: () => { setHistory([]); toast("Tarix tozalandi."); } })}>
              Tozalash
            </button>
          )}
        </div>
        <div className="sheet-history"><HistoryList items={calcHistory} onPick={text => { setSheet(null); app.openExpression(text); }} /></div>
      </Sheet>

      <Sheet open={sheet?.kind === "confirm"} onClose={closeSheet} label="Tasdiqlash">
        <div className="confirm-sheet">
          <h3>{shown.question}</h3>
          <p>Bu amalni ortga qaytarib bo'lmaydi.</p>
          <div className="confirm-actions">
            <button type="button" className="secondary-button" onClick={closeSheet}>Bekor qilish</button>
            <button type="button" className="primary-button danger" onClick={() => { const yes = sheet.onYes; setSheet(null); yes(); }}>O'chirish</button>
          </div>
        </div>
      </Sheet>

      <Sheet open={sheet?.kind === "themes"} onClose={closeSheet} label="Rang mavzusi" variant="theme-sheet">
        <h3 className="sheet-title">Rang mavzusi</h3>
        <p className="sheet-subtitle">O'zingizga yoqqan rangni tanlang — eslab qolinadi.</p>
        <ThemeGrid />
      </Sheet>

      <Sheet open={sheet?.kind === "update"} onClose={closeSheet} label="Yangilanish">
        {shown.update && (
          <UpdateNotice update={shown.update}
            onLater={() => { write("hisobla-update-later", String(Date.now())); setSheet(null); }}
            onInstall={() => installUpdate(shown.update)} />
        )}
      </Sheet>

      <div className={`toast${toastState ? " show" : ""}`} role="status" aria-live="polite">{toastState?.text}</div>
    </AppContext.Provider>
  );
}
