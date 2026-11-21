import { useEffect, useState } from "react";
import { useApp, IS_APP, PAGES, SUB_PAGES, APK_URL } from "../context.js";
import { read, write, KEYS } from "../lib/storage.js";

/* ---------- Ikonkalar ---------- */
const Svg = ({ children, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">{children}</svg>
);
export const ICONS = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" />,
  calculator: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" /></>,
  fractions: <path d="M5 12h14M12 4.5v4M10 6.5h4M10 17.5h4" />,
  roots: <path d="M3 13.5h3l3.5 6.5L15 4h6" />,
  converter: <path d="M5 8h13l-3.5-3.5M19 16H6l3.5 3.5" />,
  percent: <><path d="M18 6 6 18" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></>,
  bmi: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  loan: <><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><path d="M3.5 10h17M7 14.5h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7.2" /><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2" /></>
};
export const Icon = ({ name, size }) => <Svg size={size}>{ICONS[name]}</Svg>;

/* ---------- Sayt: yon menyu ---------- */
const SITE_NAV = ["calculator", "fractions", "roots", "converter", "percent", "bmi", "loan"];

export function Sidebar() {
  const { page, navigate } = useApp();
  return (
    <aside className="sidebar">
      <a className="brand" href="./" aria-label="Hisobla bosh sahifa">
        <img className="brand-mark" src="avatar.svg" alt="" width="35" height="35" />
        <span>hisobla<span className="brand-dot">.</span></span>
      </a>
      <div className="sidebar-caption">ASOSIY</div>
      <nav className="tool-nav" aria-label="Kalkulyator turlari">
        {SITE_NAV.map(key => (
          <button key={key} type="button" className={`nav-item${page === key ? " active" : ""}`}
            aria-current={page === key ? "page" : undefined} onClick={() => navigate(key)}>
            <span className="nav-icon"><Icon name={key} /></span>
            <span>{PAGES[key].title}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-caption">BOSHQA</div>
      <nav className="tool-nav" aria-label="Sozlamalar">
        <button type="button" className={`nav-item${page === "settings" ? " active" : ""}`}
          aria-current={page === "settings" ? "page" : undefined} onClick={() => navigate("settings")}>
          <span className="nav-icon"><Icon name="settings" /></span>
          <span>Sozlamalar</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <span className="note-icon" aria-hidden="true">✦</span>
          <p>Hisob-kitoblar<br />endi ancha oson.</p>
          <span className="note-spark spark-one" />
          <span className="note-spark spark-two" />
        </div>
        <div className="sidebar-footer">Sodda. Tez. Aniq.</div>
      </div>
    </aside>
  );
}

/* ---------- Yuqori panel ---------- */
const isAndroid = /Android/i.test(navigator.userAgent);
const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);

export function Topbar() {
  const { page, goBack, openThemes } = useApp();
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const onPrompt = event => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    setInstallPrompt(null);
  };

  return (
    <header className="topbar">
      {IS_APP && SUB_PAGES.includes(page) && (
        <button type="button" className="app-back" aria-label="Orqaga" onClick={goBack}>
          <Svg><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </button>
      )}
      <div className="breadcrumb">
        <span>Asosiy</span><span className="crumb-sep">/</span><strong>{PAGES[page].title}</strong>
      </div>
      <div className="topbar-right">
        <span className="online-indicator"><span /> Bepul va qulay</span>
        {installPrompt && !isAndroid && <button type="button" className="app-link" onClick={install}>⤓ O'rnatish</button>}
        {!isApple && (
          <a className="app-link" href={APK_URL} rel="noopener">
            <Svg size={15}><path d="M7.5 9.5h9v8.2a1.3 1.3 0 0 1-1.3 1.3H8.8a1.3 1.3 0 0 1-1.3-1.3V9.5ZM7.6 8.3a4.4 4.4 0 0 1 8.8 0H7.6Z" fill="currentColor" /></Svg>
            <span>Android ilova</span>
          </a>
        )}
        <button type="button" className="theme-toggle" aria-label="Rang mavzusini tanlash" title="Rang mavzusi" onClick={openThemes}>
          <svg className="icon-moon" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></svg>
          <svg className="icon-sun" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
        </button>
      </div>
    </header>
  );
}

/* ---------- Ilova: pastki tablar ---------- */
const TABS = [["home", "Asosiy"], ["calculator", "Hisob"], ["fractions", "Kasrlar"], ["roots", "Ildizlar"], ["settings", "Sozlamalar"]];

export function TabBar() {
  const { page, navigate } = useApp();
  return (
    <nav className="app-tabbar" aria-label="Bo'limlar">
      {TABS.map(([key, label]) => {
        const active = page === key || (key === "home" && SUB_PAGES.includes(page));
        return (
          <button key={key} type="button" className={`tab-btn${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined} onClick={() => navigate(key)}>
            <span className="tab-icon"><Icon name={key} /></span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ---------- Sayt (telefonda): "Ilovani yuklab oling" paneli ---------- */
export function AppBanner() {
  const { toast } = useApp();
  const recentlyClosed = Date.now() - Number(read(KEYS.banner) || 0) < 3 * 864e5;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (IS_APP || recentlyClosed || !(isAndroid || isApple)) return;
    const timer = setTimeout(() => setVisible(true), 700);
    return () => clearTimeout(timer);
  }, [recentlyClosed]);

  if (!visible) return null;
  const close = () => { write(KEYS.banner, String(Date.now())); setVisible(false); };
  return (
    <div className="app-banner show" role="dialog" aria-label="Hisobla ilovasi">
      <img src="avatar.svg" alt="" width="46" height="46" />
      <div className="app-banner-text">
        <strong>Hisobla ilovasi</strong>
        <span>{isAndroid ? "Tezroq ochiladi, internetsiz ham ishlaydi" : "Bosh ekranga qo'shing — ilova kabi ishlaydi"}</span>
      </div>
      {isAndroid
        ? <a className="app-banner-button" href={APK_URL} rel="noopener" onClick={() => { toast("APK yuklanmoqda. Yuklangach faylni oching va \"O'rnatish\"ni bosing."); close(); }}>Yuklab olish</a>
        : <button type="button" className="app-banner-button" onClick={() => toast("Safari'da \"Ulashish\" (□↑) tugmasini bosing va \"Bosh ekranga qo'shish\"ni tanlang.")}>Qanday?</button>}
      <button type="button" className="app-banner-close" aria-label="Yopish" onClick={close}>×</button>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="main-footer">
      <span>© 2026 hisobla. Oson hisoblang.</span>
      <span><span className="footer-dot" /> Barcha hisob-kitoblar qurilmangizda bajariladi</span>
    </footer>
  );
}
