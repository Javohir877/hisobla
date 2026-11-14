"use strict";
/* Hisobla — ilova qobig'i.
   Asosiy sahifa, Sozlamalar, pastki oyna (tarix), "orqaga" tugmasi va Android ilova bilan aloqa.
   app.js dan keyin yuklanadi va uning funksiyalaridan foydalanadi. */

const SUB_PAGES = ["converter", "percent", "bmi", "loan"];
const SITE_URL = "https://javohir877.github.io/hisobla/";
const nativeApp = window.HisoblaNative || null;
const appVersion = (navigator.userAgent.match(/HisoblaApp\/([\d.]+)/) || [])[1] || null;

/* Vositalar: [sahifa, nomi, izoh, rang, ikonka (SVG yo'llari)] */
const TOOLS = [
  ["calculator", "Kalkulyator", "Oddiy va ilmiy", "#4c72ee",
    '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>'],
  ["fractions", "Kasrlar", "Yechim bilan", "#8b5cf6",
    '<path d="M5 12h14M12 4.5v4M10 6.5h4M10 17.5h4"/>'],
  ["converter", "Konvertor", "8 xil birlik", "#0ea5c6",
    '<path d="M5 8h13l-3.5-3.5M19 16H6l3.5 3.5"/>'],
  ["percent", "Foiz", "4 xil hisob", "#f59e0b",
    '<path d="M18 6 6 18"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>'],
  ["bmi", "BMI", "Tana massasi", "#ec4899",
    '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'],
  ["loan", "Kredit", "Oylik to'lov", "#10b981",
    '<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="M3.5 10h17M7 14.5h4"/>']
];

const svgIcon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;

/* ---------- Sarlavha paneli va pastki panel holati ---------- */

let navDepth = 0; // ilova ichida nechta qadam oldinga yurildi

function updateAppChrome() {
  const sub = SUB_PAGES.includes(activePage);
  const back = document.getElementById("app-back");
  if (back) back.hidden = !(IS_APP && sub);
  // Kichik vositalar ochiq bo'lsa, pastki panelda "Asosiy" belgilanadi
  document.querySelectorAll(".tab-btn[data-page]").forEach(tab => {
    const on = tab.dataset.page === activePage || (sub && tab.dataset.page === "home");
    tab.classList.toggle("active", on);
  });
  document.documentElement.dataset.page = activePage;
}

function onAppPopState() {
  navDepth = Math.max(0, navDepth - 1);
}

/* navigate() ni kuzatib, "orqaga" uchun qadamlarni sanaymiz */
const baseNavigate = navigate;
navigate = function (page) {
  if (page !== activePage) navDepth++;
  baseNavigate(page);
};

document.getElementById("app-back")?.addEventListener("click", () => {
  if (navDepth > 0) history.back();
  else { history.replaceState(null, "", "#home"); showPage("home"); }
});

/* ---------- Umumiy pastki oyna ---------- */

const sheet = document.getElementById("app-sheet");
const sheetBody = document.getElementById("app-sheet-body");
const sheetBackdrop = document.getElementById("app-sheet-backdrop");

function openSheet(html, label) {
  sheetBody.innerHTML = html;
  sheet.setAttribute("aria-label", label || "Oyna");
  sheet.hidden = false;
  sheetBackdrop.hidden = false;
  void sheet.offsetWidth;
  setTimeout(() => { sheet.classList.add("open"); sheetBackdrop.classList.add("open"); }, 10);
}

function closeSheet() {
  if (!sheet || sheet.hidden) return;
  sheet.classList.remove("open");
  sheetBackdrop.classList.remove("open");
  setTimeout(() => { sheet.hidden = true; sheetBackdrop.hidden = true; }, 250);
}
sheetBackdrop.addEventListener("click", closeSheet);

function openHistorySheet() {
  openSheet(`
    <div class="sheet-header">
      <h3>So'nggi hisoblar</h3>
      ${historyItems.length ? '<button type="button" class="text-button" data-sheet-action="clear-history">Tozalash</button>' : ""}
    </div>
    <div class="history-list sheet-history">${historyMarkup()}</div>`, "Hisoblar tarixi");
}

sheet.addEventListener("click", event => {
  if (event.target.closest('[data-sheet-action="clear-history"]')) {
    confirmSheet("Hisoblar tarixi o'chirilsinmi?", "O'chirish", () => {
      historyItems = [];
      saveHistory();
      if (activePage === "home") renderHome();
      showToast("Tarix tozalandi.");
    });
    return;
  }
  const entry = event.target.closest("[data-expression]");
  if (entry) {
    closeSheet();
    openExpression(entry.dataset.expression);
  }
});

/* Ifodani kalkulyatorda ochish */
function openExpression(expression) {
  currentExpression = expression;
  justEvaluated = null;
  if (activePage === "calculator") setExpression(expression);
  else navigate("calculator");
}

/* ---------- Asosiy sahifa ---------- */

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Xayrli tun";
  if (h < 11) return "Xayrli tong";
  if (h < 17) return "Xayrli kun";
  if (h < 22) return "Xayrli kech";
  return "Xayrli tun";
}

function renderHome() {
  const score = practiceScore;
  const recent = historyItems.slice(0, 3);
  workspace.innerHTML = `
    <section class="home-hero">
      <p class="home-greet">${greeting()} 👋</p>
      <h2>Bugun nimani hisoblaymiz?</h2>
      <div class="quick-calc">
        <input id="quick-input" type="text" autocomplete="off" spellcheck="false" enterkeyhint="go"
          placeholder="Tezkor hisob: 3/4 + 1/6" aria-label="Tezkor hisob" />
        <output id="quick-result" aria-live="polite"></output>
      </div>
    </section>

    <h3 class="home-title">Vositalar</h3>
    <div class="tool-grid">
      ${TOOLS.map(([page, name, hint, color, icon]) => `
        <button type="button" class="tool-tile" data-page="${page}" style="--tile:${color}">
          <span class="tile-icon">${svgIcon(icon)}</span>
          <strong>${name}</strong>
          <small>${hint}</small>
        </button>`).join("")}
    </div>

    <button type="button" class="practice-cta" data-go="practice">
      <span class="cta-icon">✦</span>
      <span class="cta-text">
        <strong>Kasrlar mashqi</strong>
        <small>${score.total ? `To'g'ri: ${score.right} / ${score.total} · Eng yaxshi seriya: ${score.best || 0} 🔥` : "Misollar yechib, kasrlarni mustahkamlang"}</small>
      </span>
      <span class="cta-arrow" aria-hidden="true">›</span>
    </button>

    <div class="home-title-row">
      <h3 class="home-title">So'nggi hisoblar</h3>
      ${historyItems.length > 3 ? '<button type="button" class="text-button" data-go="history">Hammasi</button>' : ""}
    </div>
    <div class="card home-history">
      ${recent.length ? recent.map(item => `
        <button type="button" class="home-history-item" data-expression="${escapeHtml(item.expression)}">
          <span>${escapeHtml(item.expression)}</span>
          <strong>= ${escapeHtml(item.answer)}</strong>
        </button>`).join("") : '<p class="home-empty">Hali hisoblar yo\'q. Kalkulyatorda birinchi hisobingizni bajaring.</p>'}
    </div>`;

  const input = document.getElementById("quick-input");
  const output = document.getElementById("quick-result");
  input.addEventListener("input", () => {
    const text = input.value.trim();
    output.classList.remove("error");
    if (!text) { output.textContent = ""; return; }
    try {
      const value = MathCore.evaluate(text, degreesMode);
      const fraction = MathCore.fractionText(value);
      output.textContent = `= ${MathCore.formatValue(value)}${fraction && value.d < 10n ** 9n ? `  (${fraction.improper})` : ""}`;
    } catch (error) {
      output.textContent = error.isMath && !/tugallanmagan/.test(error.message) ? error.message : "…";
      output.classList.add("error");
    }
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && input.value.trim()) {
      input.blur();
      openExpression(input.value.trim());
    }
  });
  workspace.querySelector(".home-history").addEventListener("click", event => {
    const item = event.target.closest("[data-expression]");
    if (item) openExpression(item.dataset.expression);
  });
}

/* ---------- Sozlamalar ---------- */

function switchRow(id, title, hint, checked) {
  return `
    <label class="settings-row">
      <span class="settings-text"><strong>${title}</strong><small>${hint}</small></span>
      <input type="checkbox" class="switch" id="${id}" ${checked ? "checked" : ""} />
    </label>`;
}

function buttonRow(action, title, hint, danger = false) {
  return `
    <button type="button" class="settings-row ${danger ? "danger" : ""}" data-setting-action="${action}">
      <span class="settings-text"><strong>${title}</strong><small>${hint}</small></span>
      <span class="settings-chevron" aria-hidden="true">›</span>
    </button>`;
}

function renderSettings() {
  workspace.innerHTML = `
    <section class="settings-group">
      <h3>Ko'rinish</h3>
      <div class="card settings-card">
        <div class="settings-row column">
          <span class="settings-text"><strong>Rang mavzusi</strong><small>O'zingizga yoqqan rangni tanlang</small></span>
          ${themeOptionsHtml()}
        </div>
      </div>
    </section>

    <section class="settings-group">
      <h3>Kalkulyator</h3>
      <div class="card settings-card">
        ${switchRow("set-scientific", "Ilmiy rejim", "sin, cos, log, √, n! tugmalari", scientificMode)}
        ${switchRow("set-degrees", "Burchak — gradusda", "O'chirilsa, radian ishlatiladi", degreesMode)}
        ${switchRow("set-fraction", "Natija avval kasrda", "Masalan 0,5 o'rniga 1/2", showFractionFirst)}
        ${nativeApp ? switchRow("set-haptics", "Tugmalarda tebranish", "Bosilganda yengil titraydi", settings.haptics !== false) : ""}
      </div>
    </section>

    <section class="settings-group">
      <h3>Ma'lumotlar</h3>
      <div class="card settings-card">
        ${buttonRow("clear-history", "Hisoblar tarixini tozalash", `${historyItems.length} ta yozuv saqlangan`, true)}
        ${buttonRow("clear-practice", "Mashq natijalarini tozalash", `To'g'ri javoblar: ${practiceScore.right} / ${practiceScore.total}`, true)}
      </div>
    </section>

    <section class="settings-group">
      <h3>Ilova haqida</h3>
      <div class="card settings-card">
        <div class="settings-row about-row">
          <img src="avatar.svg" alt="" width="48" height="48" />
          <span class="settings-text"><strong>Hisobla</strong><small>${appVersion ? `Versiya ${appVersion}` : "Veb versiya"} · Internetsiz ishlaydi</small></span>
        </div>
        ${buttonRow("share", "Do'stlarga ulashish", "Havolani yuborish")}
        ${buttonRow("site", "Saytni ochish", SITE_URL.replace("https://", ""))}
      </div>
    </section>`;

  markThemeChoice();
  const bind = (id, apply) => document.getElementById(id)?.addEventListener("change", event => {
    apply(event.target.checked);
    saveSettings();
  });
  bind("set-scientific", on => { scientificMode = on; });
  bind("set-degrees", on => { degreesMode = on; });
  bind("set-fraction", on => { showFractionFirst = on; });
  bind("set-haptics", on => { settings.haptics = on; });

}

workspace.addEventListener("click", event => {
  if (activePage === "settings") handleSettingsClick(event);
});

/* Tasdiqlash oynasi (brauzerning confirm() oynasi Android ilovada ko'rinmaydi) */
function confirmSheet(question, okLabel, onConfirm) {
  openSheet(`
    <div class="confirm-sheet">
      <h3>${question}</h3>
      <p>Bu amalni ortga qaytarib bo'lmaydi.</p>
      <div class="confirm-actions">
        <button type="button" class="secondary-button" data-confirm="no">Bekor qilish</button>
        <button type="button" class="primary-button danger" data-confirm="yes">${okLabel}</button>
      </div>
    </div>`, "Tasdiqlash");
  sheetBody.querySelector('[data-confirm="no"]').addEventListener("click", closeSheet);
  sheetBody.querySelector('[data-confirm="yes"]').addEventListener("click", () => { closeSheet(); onConfirm(); });
}

function handleSettingsClick(event) {
  const theme = event.target.closest("[data-theme-choice]");
  if (theme) { switchTheme(theme.dataset.themeChoice, theme.querySelector(".theme-swatch")); return; }
  const button = event.target.closest("[data-setting-action]");
  if (!button) return;
  const action = button.dataset.settingAction;
  if (action === "clear-history") {
    if (!historyItems.length) { showToast("Tarix allaqachon bo'sh."); return; }
    confirmSheet("Hisoblar tarixi o'chirilsinmi?", "O'chirish", () => {
      historyItems = [];
      saveHistory();
      button.querySelector("small").textContent = "0 ta yozuv saqlangan";
      showToast("Tarix tozalandi.");
    });
  } else if (action === "clear-practice") {
    confirmSheet("Mashq natijalari o'chirilsinmi?", "O'chirish", () => {
      practiceScore = { right: 0, total: 0, streak: 0, best: 0 };
      writeStorage(practiceKey, JSON.stringify(practiceScore));
      button.querySelector("small").textContent = "To'g'ri javoblar: 0 / 0";
      showToast("Mashq natijalari tozalandi.");
    });
  } else if (action === "share") {
    const data = { title: "Hisobla", text: "Kasrlarni bosqichma-bosqich yechadigan kalkulyator:", url: SITE_URL };
    if (navigator.share) navigator.share(data).catch(() => {});
    else navigator.clipboard?.writeText(SITE_URL).then(() => showToast("Havola nusxalandi."), () => {});
  } else if (action === "site") {
    window.open(SITE_URL, "_blank", "noopener");
  }
}

/* ---------- Umumiy bosishlar ---------- */

document.addEventListener("click", event => {
  const pageButton = event.target.closest(".tool-nav [data-page], .app-tabbar [data-page], .tool-tile[data-page]");
  if (pageButton) { navigate(pageButton.dataset.page); return; }
  const go = event.target.closest("[data-go]");
  if (!go) return;
  if (go.dataset.go === "practice") {
    fractionTab = "practice";
    if (activePage === "fractions") renderFractions();
    else navigate("fractions");
  } else if (go.dataset.go === "history") {
    openHistorySheet();
  }
});

/* Ilova ichida: tugmalar bosilganda yengil tebranish (Sozlamalarda o'chirsa bo'ladi) */
if (nativeApp) {
  document.addEventListener("pointerdown", event => {
    if (settings.haptics === false) return;
    if (event.target.closest(".key, .op-button, .tab-btn, .frac-tab, .primary-button, .tool-tile, .settings-row, .frac-sign, .theme-option, .practice-cta")) {
      try { nativeApp.haptic(); } catch { /* jim */ }
    }
  }, { passive: true });
}

/* Android tezkor yorliqlari (ikonkani bosib turish) shu funksiyani chaqiradi */
window.hisoblaOpen = function (page) {
  if (page === "practice") { fractionTab = "practice"; page = "fractions"; if (activePage === "fractions") { renderFractions(); return; } }
  if (page in pageInfo) navigate(page);
};

/* Dastlabki chizish */
render();
