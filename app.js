"use strict";

const M = MathCore;

const pageInfo = {
  calculator: ["Kalkulyator", "Kundalik va murakkab hisob-kitoblar uchun. Kasrlar aniq hisoblanadi."],
  fractions: ["Kasrlar", "Oddiy kasrlar ustida amallar — bosqichma-bosqich tushuntirish bilan."],
  converter: ["Konvertor", "Uzunlik, og'irlik, harorat va boshqa birliklarni o'tkazing."],
  percent: ["Foiz kalkulyatori", "Foizni hisoblang yoki qiymatdagi o'zgarishni toping."],
  bmi: ["Tana massasi (BMI)", "Bo'yingiz va vazningizga qarab tana massasi indeksini hisoblang."],
  loan: ["Kredit kalkulyatori", "Oylik to'lov va kredit bo'yicha jami xarajatni hisoblang."]
};

const workspace = document.getElementById("workspace");
const toast = document.getElementById("toast");
const historyKey = "hisobla-calculation-history";
const themeKey = "hisobla-theme";
const pageKey = "hisobla-page";
let activePage = readStorage(pageKey) in pageInfo ? readStorage(pageKey) : "calculator";
let scientificMode = false;
let degreesMode = true;
let showFractionFirst = false;
let currentExpression = "";
let justEvaluated = null; // = bosilgandan keyingi holat: { expression, value }
let fractionTab = "ops";
let fractionOp = "+";
let toastTimer;
let historyItems = loadHistory();

/* ---------- Umumiy yordamchilar ---------- */

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function loadHistory() {
  try {
    const parsed = JSON.parse(readStorage(historyKey) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item =>
      item && typeof item.expression === "string" && typeof item.answer === "string"
    ).slice(0, 8);
  } catch {
    return [];
  }
}

function saveHistory() {
  if (!writeStorage(historyKey, JSON.stringify(historyItems))) {
    showToast("Natija ko'rsatildi, ammo tarix qurilmada saqlanmadi.");
  }
}

/* "12 500,5" yoki "12500.5" → 12500.5; noto'g'ri bo'lsa NaN */
function parseNum(text) {
  const clean = String(text).trim().replace(/[\s  ]/g, "").replace(",", ".");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(clean)) return NaN;
  return Number(clean);
}

function formatNumber(number, maxDigits = 10) {
  return M.formatFloat(number, maxDigits);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

/* ---------- Mavzu (yorug' / qora) ---------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#121214" : "#f5f7fb";
  const button = document.getElementById("theme-toggle");
  if (button) {
    const dark = theme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Yorug' mavzuga o'tish" : "Qora mavzuga o'tish");
    button.title = dark ? "Yorug' mavzu" : "Qora mavzu";
  }
  // Android ilovada status bar va pastki panel rangini mavzuga moslash
  try { window.HisoblaNative?.setTheme(theme === "dark"); } catch { /* sayt rejimi */ }
}

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* Elementga animatsiya klassini qaytadan qo'yish (qayta ijro etish uchun) */
function replay(el, className) {
  if (!el || reduceMotion) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  clearTimeout(el._replayTimer);
  el._replayTimer = setTimeout(() => el.classList.remove(className), 900);
}

/* Sahifa yoki panel almashganda kartalar navbat bilan paydo bo'ladi */
function playEnter(el) {
  if (!el || reduceMotion) return;
  el.classList.remove("page-enter");
  void el.offsetWidth;
  el.classList.add("page-enter");
  clearTimeout(el._enterTimer);
  el._enterTimer = setTimeout(() => el.classList.remove("page-enter"), 700);
}

document.getElementById("theme-toggle").addEventListener("click", event => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  writeStorage(themeKey, next);
  if (!document.startViewTransition || reduceMotion) { applyTheme(next); return; }
  // Yangi mavzu tugmadan aylana bo'lib yoyiladi
  const rect = event.currentTarget.getBoundingClientRect();
  const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement.style;
  root.setProperty("--tx", `${x}px`);
  root.setProperty("--ty", `${y}px`);
  root.setProperty("--tr", `${radius}px`);
  document.startViewTransition(() => applyTheme(next));
});

/* Tugmalarda bosilgan joydan to'lqin tarqaladi */
document.addEventListener("pointerdown", event => {
  if (reduceMotion) return;
  const target = event.target.closest(".key, .op-button, .primary-button, .app-banner-button, .frac-tab, .nav-item");
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.left = `${event.clientX - rect.left}px`;
  ripple.style.top = `${event.clientY - rect.top}px`;
  ripple.style.setProperty("--size", `${Math.max(rect.width, rect.height) * 2.2}px`);
  target.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}, { passive: true });

if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", event => {
    const saved = readStorage(themeKey);
    if (saved !== "light" && saved !== "dark") applyTheme(event.matches ? "dark" : "light");
  });
}
applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/* ---------- Sahifalar ---------- */

function render() {
  document.querySelectorAll(".nav-item, .tab-btn[data-page], .sheet-item[data-page]").forEach(button => {
    const selected = button.dataset.page === activePage;
    button.classList.toggle("active", selected);
    if (selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelector(".tab-btn[data-more]")?.classList.toggle("active", activePage === "bmi" || activePage === "loan");
  document.getElementById("breadcrumb-current").textContent = pageInfo[activePage][0];
  document.getElementById("page-title").textContent = pageInfo[activePage][0];
  document.getElementById("page-description").textContent = pageInfo[activePage][1];
  ({
    calculator: renderCalculator,
    fractions: renderFractions,
    converter: renderConverter,
    percent: renderPercent,
    bmi: renderBmi,
    loan: renderLoan
  })[activePage]();
  playEnter(workspace);
  replay(document.querySelector(".page-heading"), "title-enter");
}

/* =================== KALKULYATOR =================== */

function renderCalculator() {
  workspace.innerHTML = `
    <div class="calc-layout">
      <section class="card calculator-card" aria-label="Ilmiy kalkulyator">
        <div class="card-heading">
          <h2>${scientificMode ? "Ilmiy kalkulyator" : "Kalkulyator"}</h2>
          <span class="subtle-label">Kasrlar aniq hisoblanadi</span>
        </div>
        <div class="calc-screen">
          <input class="calc-expression" id="expression" aria-label="Hisoblash ifodasi" autocomplete="off" spellcheck="false" placeholder="Masalan: 1/2 + 1/3" value="${escapeHtml(currentExpression)}" />
          <button type="button" class="calc-result" id="calc-result" aria-live="polite" title="Nusxa olish uchun bosing">0</button>
          <div class="calc-alt" id="calc-alt"></div>
        </div>
        <div class="calc-actions">
          <div class="mode-toggle" role="group" aria-label="Kalkulyator rejimi">
            <button type="button" class="mode-button ${scientificMode ? "" : "active"}" data-action="basic-mode">Oddiy</button>
            <button type="button" class="mode-button ${scientificMode ? "active" : ""}" data-action="scientific-mode">Ilmiy</button>
          </div>
          <div class="calc-actions-right">
            <button type="button" class="chip-button ${showFractionFirst ? "active" : ""}" data-action="toggle-fraction" title="Natijani kasr yoki o'nli ko'rinishda ko'rsatish">a/b ⇄ 0,5</button>
            ${scientificMode ? `<label class="angle-toggle"><input type="checkbox" id="degrees-toggle" ${degreesMode ? "checked" : ""} /> Gradus</label>` : ""}
          </div>
        </div>
        <div class="keypad" id="keypad">
          ${scientificMode ? `
            <button class="key function" data-insert="sin(">sin</button>
            <button class="key function" data-insert="cos(">cos</button>
            <button class="key function" data-insert="tan(">tan</button>
            <button class="key function" data-insert="π">π</button>
            <button class="key function" data-insert="log(">log</button>
            <button class="key function" data-insert="ln(">ln</button>
            <button class="key function" data-insert="√(">√</button>
            <button class="key function" data-insert="e">e</button>
            <button class="key function" data-insert="^2">x²</button>
            <button class="key function" data-insert="^">xʸ</button>
            <button class="key function" data-insert="!">n!</button>
            <button class="key function" data-insert="abs(">|x|</button>
          ` : ""}
          <button class="key function" data-action="clear">AC</button>
          <button class="key function" data-insert="(">(</button>
          <button class="key function" data-insert=")">)</button>
          <button class="key operator" data-insert="/" aria-label="Bo'lish yoki kasr chizig'i">÷</button>
          <button class="key" data-insert="7">7</button>
          <button class="key" data-insert="8">8</button>
          <button class="key" data-insert="9">9</button>
          <button class="key operator" data-insert="*" aria-label="Ko'paytirish">×</button>
          <button class="key" data-insert="4">4</button>
          <button class="key" data-insert="5">5</button>
          <button class="key" data-insert="6">6</button>
          <button class="key operator" data-insert="-" aria-label="Ayirish">−</button>
          <button class="key" data-insert="1">1</button>
          <button class="key" data-insert="2">2</button>
          <button class="key" data-insert="3">3</button>
          <button class="key operator" data-insert="+" aria-label="Qo'shish">+</button>
          <button class="key function" data-insert="%">%</button>
          <button class="key" data-insert="0">0</button>
          <button class="key" data-insert=",">,</button>
          <button class="key function" data-action="backspace" aria-label="Oxirgi belgini o'chirish">⌫</button>
          <button class="key equals wide4" data-action="equals">=</button>
        </div>
      </section>
      <div class="right-column">
        <section class="card history-card">
          <div class="history-title"><h2>So'nggi hisoblar</h2><button class="text-button" type="button" data-action="clear-history">Tozalash</button></div>
          <div class="history-list" id="history-list">${historyMarkup()}</div>
        </section>
        <section class="card tip-card">
          <h3>✦ Kasrlar bilan ishlash</h3>
          <p><strong>1/2 + 1/3</strong> deb yozing — natija <strong>5/6</strong> kasr ko'rinishida ham chiqadi. Aralash son: <strong>2+1/3</strong>. Davriy kasr: <strong>0,(3)</strong>. Bo'lish uchun <strong>:</strong> belgisi ham ishlaydi.</p>
        </section>
      </div>
    </div>`;

  const expression = document.getElementById("expression");
  // Sensorli ekranda: o'zimizning tugmalar bor — telefon klaviaturasi chiqmasin
  if (window.matchMedia?.("(pointer: coarse)").matches) expression.setAttribute("inputmode", "none");
  expression.addEventListener("input", () => {
    currentExpression = expression.value;
    justEvaluated = null;
    calculatePreview();
  });
  expression.addEventListener("keydown", handleExpressionKeydown);
  document.getElementById("degrees-toggle")?.addEventListener("change", event => {
    degreesMode = event.target.checked;
    calculatePreview();
  });
  workspace.querySelector(".calculator-card").addEventListener("click", handleCalculatorClick);
  document.getElementById("calc-result").addEventListener("click", copyResult);
  workspace.querySelector(".history-card").addEventListener("click", event => {
    if (event.target.closest('[data-action="clear-history"]')) {
      historyItems = [];
      saveHistory();
      document.getElementById("history-list").innerHTML = historyMarkup();
      return;
    }
    const entry = event.target.closest("[data-expression]");
    if (!entry) return;
    setExpression(entry.dataset.expression);
    expression.focus();
  });
  calculatePreview();
}

function historyMarkup() {
  if (historyItems.length === 0) {
    return '<div class="history-empty">Hali hisoblar yoʻq.<br />Birinchi hisobingizni kiriting.</div>';
  }
  return historyItems.map(item => `
    <button class="history-entry" type="button" data-expression="${escapeHtml(item.expression)}">
      <span class="history-expression">${escapeHtml(item.expression)}</span>
      <span class="history-answer">= ${escapeHtml(item.answer)}</span>
    </button>`).join("");
}

function setExpression(value, cursor = value.length) {
  currentExpression = value;
  justEvaluated = null;
  const input = document.getElementById("expression");
  if (input) {
    input.value = value;
    input.setSelectionRange(cursor, cursor);
  }
  calculatePreview();
}

function handleCalculatorClick(event) {
  const button = event.target.closest("button");
  if (!button || button.id === "calc-result") return;
  const action = button.dataset.action;
  if (action === "basic-mode" || action === "scientific-mode") {
    scientificMode = action === "scientific-mode";
    renderCalculator();
  } else if (action === "toggle-fraction") {
    showFractionFirst = !showFractionFirst;
    button.classList.toggle("active", showFractionFirst);
    calculatePreview();
  } else if (action === "clear") {
    setExpression("");
    document.getElementById("expression").focus();
  } else if (action === "backspace") {
    backspace();
  } else if (action === "equals") {
    calculateAndSave();
  } else if (button.dataset.insert !== undefined) {
    insertExpression(button.dataset.insert);
  }
}

function backspace() {
  const input = document.getElementById("expression");
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  if (start !== end) setExpression(input.value.slice(0, start) + input.value.slice(end), start);
  else if (start > 0) setExpression(input.value.slice(0, start - 1) + input.value.slice(start), start - 1);
  input.focus();
}

/* Natijadan keyin: raqam yangi hisob boshlaydi, amal esa natijani davom ettiradi */
function insertExpression(value) {
  const input = document.getElementById("expression");
  if (justEvaluated) {
    const previous = justEvaluated;
    justEvaluated = null;
    if (/^[+\-*/^%!]/.test(value)) {
      const base = M.valueToExpression(previous.value) ?? `(${previous.expression})`;
      setExpression(base + value);
    } else {
      setExpression(value);
    }
    input.focus();
    return;
  }
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  setExpression(input.value.slice(0, start) + value + input.value.slice(end), start + value.length);
  input.focus();
}

function handleExpressionKeydown(event) {
  if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculateAndSave();
  } else if (event.key === "Escape") {
    event.preventDefault();
    setExpression("");
  } else if (justEvaluated && event.key.length === 1 && !event.ctrlKey && !event.metaKey && /[0-9.,+\-*/^%!():]/.test(event.key)) {
    event.preventDefault();
    insertExpression(event.key === ":" ? "/" : event.key);
  }
}

function resultParts(value) {
  const fraction = M.fractionText(value);
  const decimal = M.formatValue(value);
  const smallFraction = fraction && value.d < 10n ** 12n && M.bAbs(value.n) < 10n ** 15n;
  if (!smallFraction) return { main: decimal, alt: "" };
  const fracLabel = fraction.mixed ? `${fraction.improper} = ${fraction.mixed}` : fraction.improper;
  const repeating = M.formatRepeating(value.n, value.d);
  const decimalLabel = repeating.includes("(") ? `${decimal} … = ${repeating}` : decimal;
  return showFractionFirst
    ? { main: fraction.improper, alt: `${fraction.mixed ? `= ${fraction.mixed} · ` : ""}≈ ${decimalLabel}` }
    : { main: decimal, alt: `Kasr: ${fracLabel}${repeating.includes("(") ? ` · ${repeating}` : ""}` };
}

function calculatePreview() {
  const result = document.getElementById("calc-result");
  const alt = document.getElementById("calc-alt");
  if (!result) return;
  result.classList.remove("error", "pending");
  if (!currentExpression.trim()) {
    result.textContent = "0";
    alt.textContent = "";
    return;
  }
  try {
    const parts = resultParts(M.evaluate(currentExpression, degreesMode));
    result.textContent = parts.main;
    alt.textContent = parts.alt;
  } catch (error) {
    // Yozish davom etayotgan bo'lishi mumkin — xatoni yumshoq ko'rsatamiz
    result.classList.add("pending");
    result.textContent = "…";
    alt.textContent = error.isMath && !/tugallanmagan|argumenti yo'q/.test(error.message) ? error.message : "";
  }
}

function calculateAndSave() {
  const result = document.getElementById("calc-result");
  const alt = document.getElementById("calc-alt");
  if (!currentExpression.trim()) return;
  try {
    const value = M.evaluate(currentExpression, degreesMode);
    const parts = resultParts(value);
    result.classList.remove("error", "pending");
    result.textContent = parts.main;
    alt.textContent = parts.alt;
    replay(result, "pop");
    const fraction = M.fractionText(value);
    const answer = parts.main + (fraction && !showFractionFirst && parts.alt ? `  (${fraction.improper})` : "");
    if (historyItems[0]?.expression !== currentExpression) {
      historyItems.unshift({ expression: currentExpression, answer });
      historyItems = historyItems.slice(0, 8);
      saveHistory();
      document.getElementById("history-list").innerHTML = historyMarkup();
      document.querySelector(".history-entry")?.classList.add("is-new");
    }
    justEvaluated = { expression: currentExpression, value };
  } catch (error) {
    result.classList.remove("pending");
    result.classList.add("error");
    result.textContent = error.isMath ? error.message : "Ifodani tekshiring";
    alt.textContent = "";
    replay(result, "shake");
  }
}

function copyResult() {
  const result = document.getElementById("calc-result");
  if (result.classList.contains("error") || !navigator.clipboard) return;
  navigator.clipboard.writeText(result.textContent.replace(/[\s  ]/g, ""))
    .then(() => showToast("Natija nusxalandi."))
    .catch(() => {});
}

/* =================== KASRLAR =================== */

function fx(n, d) {
  return `<span class="fx"><span class="fx-n">${n}</span><span class="fx-d">${d}</span></span>`;
}
function nm(big) { return big < 0n ? `(−${-big})` : String(big); }
function signed(big) { return big < 0n ? `−${-big}` : String(big); }

/* Kasr qiymatini chiroyli HTML ko'rinishda: −5/3 */
function fracHtml(n, d) {
  if (d === 1n) return `<span class="fx-int">${signed(n)}</span>`;
  return `${n < 0n ? '<span class="fx-sign">−</span>' : ""}${fx(M.bAbs(n), d)}`;
}
function mixedHtml(n, d) {
  const a = M.bAbs(n);
  if (d === 1n || a < d) return fracHtml(n, d);
  const rest = a % d;
  return `${n < 0n ? '<span class="fx-sign">−</span>' : ""}<span class="fx-int">${a / d}</span>${rest ? fx(rest, d) : ""}`;
}

function fracInputMarkup(id, caption) {
  return `
    <div class="frac-field">
      <span class="frac-caption">${caption}</span>
      <div class="frac-input">
        <button type="button" class="frac-sign" data-sign="${id}" aria-label="Ishorani almashtirish" aria-pressed="false">+</button>
        <input class="frac-whole" id="${id}-w" type="text" inputmode="numeric" autocomplete="off" placeholder="0" aria-label="${caption}: butun qism" />
        <div class="frac-stack">
          <input class="frac-num" id="${id}-n" type="text" inputmode="numeric" autocomplete="off" placeholder="surat" aria-label="${caption}: surat" />
          <span class="frac-bar" aria-hidden="true"></span>
          <input class="frac-den" id="${id}-d" type="text" inputmode="numeric" autocomplete="off" placeholder="maxraj" aria-label="${caption}: maxraj" />
        </div>
      </div>
    </div>`;
}

/* Kiritilgan kasrni o'qish: { n, d, whole, num, den, mixed } yoki xato matni */
function readFraction(id, label) {
  const raw = ["w", "n", "d"].map(part => document.getElementById(`${id}-${part}`).value.trim().replace(/[\s ]/g, ""));
  const [w, n, d] = raw;
  if (!w && !n && !d) return { empty: true, error: `${label}ni kiriting` };
  for (const value of raw) {
    if (value && !/^[+\-−]?\d{1,15}$/.test(value)) return { error: `${label}: faqat butun sonlar kiriting (masalan 2, 3, 15)` };
  }
  if (n && !d) return { error: `${label}: maxrajni kiriting` };
  if (d && !n) return { error: `${label}: suratni kiriting` };
  const toBig = value => BigInt(value.replace("−", "-") || "0");
  let sign = document.querySelector(`[data-sign="${id}"]`).dataset.negative === "true" ? -1n : 1n;
  const W = toBig(w), N = toBig(n), D = d ? toBig(d) : 1n;
  if (D === 0n) return { error: `${label}: maxraj 0 bo'lishi mumkin emas` };
  if (W < 0n) sign = -sign;
  if (N < 0n) sign = -sign;
  if (D < 0n) sign = -sign;
  const whole = M.bAbs(W), num = M.bAbs(N), den = M.bAbs(D);
  return { whole, num, den, sign, n: sign * (whole * den + num), d: den, mixed: whole !== 0n && num !== 0n, isInteger: !d };
}

function inputHtml(f) {
  if (f.isInteger) return `<span class="fx-int">${signed(f.sign * f.whole)}</span>`;
  const sign = f.sign < 0n && (f.whole !== 0n || f.num !== 0n) ? '<span class="fx-sign">−</span>' : "";
  return `${sign}${f.whole ? `<span class="fx-int">${f.whole}</span>` : ""}${fx(f.num, f.den)}`;
}

/* Aralash son yoki butun sonni noto'g'ri kasrga aylantirish qadami */
function improperStep(f) {
  if (f.whole && f.num) {
    const s = f.sign < 0n ? "−" : "";
    return `${inputHtml(f)} = ${s}${fx(`${f.whole}·${f.den} + ${f.num}`, f.den)} = ${fracHtml(f.n, f.d)}`;
  }
  return null;
}

function simplifySteps(n, d, steps) {
  if (n === 0n) { steps.push(["Natija", `Surat 0 ga teng, demak kasr qiymati <b>0</b>.`]); return [0n, 1n]; }
  const g = M.bGcd(n, d);
  if (g > 1n) {
    steps.push(["Qisqartiramiz", `EKUB(${M.bAbs(n)}, ${d}) = <b>${g}</b>. Surat va maxrajni ${g} ga bo'lamiz:<br>${fracHtml(n, d)} = ${n < 0n ? '<span class="fx-sign">−</span>' : ""}${fx(`${M.bAbs(n)} : ${g}`, `${d} : ${g}`)} = ${fracHtml(n / g, d / g)}`]);
  } else if (d !== 1n) {
    steps.push(["Qisqartirish", `EKUB(${M.bAbs(n)}, ${d}) = 1 — kasr qisqarmaydi.`]);
  }
  return [n / g, d / g];
}

function finishSteps(n, d, steps) {
  const a = M.bAbs(n);
  if (d === 1n) {
    steps.push(["Javob", `Natija butun son: <b>${signed(n)}</b>`]);
    return;
  }
  if (a > d) {
    steps.push(["Butun qismini ajratamiz", `${a} : ${d} = ${a / d} (qoldiq ${a % d}), demak ${fracHtml(n, d)} = ${mixedHtml(n, d)}`]);
  }
  steps.push(["O'nli kasr ko'rinishida", decimalExplain(n, d)]);
}

function decimalExplain(n, d) {
  const rep = M.formatRepeating(n, d);
  if (rep.includes("(")) {
    const period = rep.match(/\((\d+)\)/)[1];
    return `<b>${rep}</b> — cheksiz davriy kasr, takrorlanuvchi qism (davr): <b>${period}</b>. Taxminan ${M.formatExact(n, d, 6)}`;
  }
  return `<b>${rep}</b> — chekli o'nli kasr (maxraj faqat 2 va 5 ga bo'linadi).`;
}

function renderSteps(steps) {
  return `<ol class="steps">${steps.map(([title, body], i) =>
    `<li style="--i:${i}"><span class="step-index">${i + 1}</span><div><div class="step-title">${title}</div><div class="step-body">${body}</div></div></li>`
  ).join("")}</ol>`;
}

function fractionBar(n, d) {
  const a = M.bAbs(n);
  if (d > 24n || d < 2n || a === 0n || a > d * 3n) return "";
  const bars = Number((a + d - 1n) / d);
  let html = "";
  let remaining = Number(a);
  for (let b = 0; b < bars; b++) {
    let cells = "";
    for (let c = 0; c < Number(d); c++) cells += `<span class="${remaining-- > 0 ? "on" : ""}"></span>`;
    html += `<div class="fbar" style="--cols:${d}">${cells}</div>`;
  }
  return `<div class="fbar-wrap" aria-hidden="true">${html}<div class="fbar-note">Har bir bo'lak — 1/${d}</div></div>`;
}

function resultBlock(n, d, title = "JAVOB") {
  const a = M.bAbs(n);
  const chips = [];
  if (d !== 1n && a > d) chips.push(`<span class="chip">Aralash son: ${mixedHtml(n, d)}</span>`);
  if (d !== 1n) chips.push(`<span class="chip">O'nli: <b>${escapeHtml(M.formatRepeating(n, d))}</b></span>`);
  chips.push(`<span class="chip">Foizda: <b>${escapeHtml(M.formatExact(n * 100n, d, 4))}%</b></span>`);
  return `
    <div class="frac-result-main">
      <div>
        <div class="result-label">${title}</div>
        <div class="frac-answer">${fracHtml(n, d)}</div>
      </div>
      ${fractionBar(n, d)}
    </div>
    <div class="chips">${chips.join("")}</div>`;
}

function renderFractions() {
  const tabs = [
    ["ops", "Amallar"], ["simplify", "Qisqartirish"], ["convert", "O'nli ⇄ oddiy"], ["compare", "Taqqoslash"], ["practice", "Mashq ✦"]
  ];
  workspace.innerHTML = `
    <div class="frac-tabs" role="tablist" aria-label="Kasr amallari turlari">
      ${tabs.map(([key, label]) => `<button type="button" role="tab" class="frac-tab ${key === fractionTab ? "active" : ""}" aria-selected="${key === fractionTab}" data-ftab="${key}">${label}</button>`).join("")}
    </div>
    <div id="frac-panel"></div>`;
  workspace.querySelector(".frac-tabs").addEventListener("click", event => {
    const tab = event.target.closest("[data-ftab]");
    if (!tab || tab.dataset.ftab === fractionTab) return;
    fractionTab = tab.dataset.ftab;
    renderFractions();
    playEnter(document.getElementById("frac-panel"));
  });
  ({ ops: renderFracOps, simplify: renderFracSimplify, convert: renderFracConvert, compare: renderFracCompare, practice: renderFracPractice })[fractionTab]();
}

function fracPanelShell(title, label, inputs, intro) {
  document.getElementById("frac-panel").innerHTML = `
    <section class="card tool-card">
      <div class="card-heading"><h2>${title}</h2><span class="subtle-label">${label}</span></div>
      <p class="tool-intro">${intro}</p>
      ${inputs}
      <div class="result-panel frac-result" id="frac-result" aria-live="polite"></div>
    </section>
    <section class="card tool-card steps-card" id="frac-steps-card" hidden>
      <div class="card-heading"><h2>Bosqichma-bosqich yechim</h2><span class="subtle-label">Tushunib oling</span></div>
      <div id="frac-steps"></div>
    </section>`;
}

function bindFractionInputs(update) {
  const panel = document.getElementById("frac-panel");
  panel.addEventListener("input", update);
  panel.addEventListener("click", event => {
    const signButton = event.target.closest("[data-sign]");
    if (!signButton) return;
    const negative = signButton.dataset.negative !== "true";
    signButton.dataset.negative = String(negative);
    signButton.textContent = negative ? "−" : "+";
    signButton.setAttribute("aria-pressed", String(negative));
    signButton.classList.toggle("negative", negative);
    update();
  });
  // Surat kiritilgach "/" yoki Enter bosilsa — maxrajga o'tish
  panel.addEventListener("keydown", event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if ((event.key === "/" || event.key === ":") && input.classList.contains("frac-num")) {
      event.preventDefault();
      input.closest(".frac-stack").querySelector(".frac-den").focus();
    } else if (event.key === " " && input.classList.contains("frac-whole")) {
      event.preventDefault();
      input.closest(".frac-input").querySelector(".frac-num").focus();
    }
  });
  update();
}

function showFracResult(html, stepsHtml, hint) {
  const result = document.getElementById("frac-result");
  const stepsCard = document.getElementById("frac-steps-card");
  const wasHint = result.classList.contains("is-hint") || !result.innerHTML.trim();
  const stepsWereHidden = stepsCard.hidden;
  result.classList.toggle("is-hint", Boolean(hint));
  result.innerHTML = hint ? `<div class="frac-hint">${escapeHtml(hint)}</div>` : html;
  // Javob birinchi marta paydo bo'lganda "sakraydi"; yozish davomida esa tinch turadi
  if (!hint && wasHint) replay(result, "pop-in");
  stepsCard.hidden = !stepsHtml;
  if (stepsHtml) {
    const steps = document.getElementById("frac-steps");
    steps.innerHTML = stepsHtml;
    steps.classList.toggle("animate-steps", stepsWereHidden && !reduceMotion);
  }
}

/* To'g'ri javob uchun kichik konfetti */
function burstConfetti(anchor) {
  if (reduceMotion || !anchor) return;
  const rect = anchor.getBoundingClientRect();
  const colors = ["#6b8cf6", "#8ff5cf", "#ffd27a", "#ff8f9d", "#a3b8ff"];
  for (let i = 0; i < 26; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${rect.left + rect.width / 2}px`;
    piece.style.top = `${rect.top + 20}px`;
    piece.style.background = colors[i % colors.length];
    const angle = Math.random() * Math.PI * 2, distance = 60 + Math.random() * 120;
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance - 40}px`);
    piece.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    piece.style.animationDelay = `${Math.random() * 80}ms`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1300); // animationend fonda kelmasligi mumkin
  }
}

/* ----- Amallar: + − × ÷ ----- */

function renderFracOps() {
  const ops = [["+", "+", "Qo'shish"], ["-", "−", "Ayirish"], ["*", "×", "Ko'paytirish"], ["/", "÷", "Bo'lish"]];
  fracPanelShell("Kasrlar ustida amallar", "Aralash sonlar ham", `
    <div class="frac-row">
      ${fracInputMarkup("fa", "Birinchi kasr")}
      <div class="op-picker" role="radiogroup" aria-label="Amal">
        ${ops.map(([value, symbol, label]) => `<button type="button" role="radio" class="op-button ${value === fractionOp ? "active" : ""}" aria-checked="${value === fractionOp}" data-op="${value}" title="${label}" aria-label="${label}">${symbol}</button>`).join("")}
      </div>
      ${fracInputMarkup("fb", "Ikkinchi kasr")}
    </div>`,
    "Butun qism (bo'lsa), surat va maxrajni kiriting. Natija avtomatik qisqartiriladi va har bir qadam tushuntiriladi. Maslahat: suratdan keyin <b>/</b> bossangiz, maxrajga o'tadi.");
  document.querySelector(".op-picker").addEventListener("click", event => {
    const button = event.target.closest("[data-op]");
    if (!button) return;
    fractionOp = button.dataset.op;
    document.querySelectorAll(".op-button").forEach(b => {
      b.classList.toggle("active", b === button);
      b.setAttribute("aria-checked", String(b === button));
    });
    updateFracOps();
  });
  bindFractionInputs(updateFracOps);
}

function updateFracOps() {
  const a = readFraction("fa", "Birinchi kasr");
  const b = readFraction("fb", "Ikkinchi kasr");
  if (a.error || b.error) {
    showFracResult("", "", a.empty && b.empty ? "Ikkala kasrni kiriting — natija shu yerda chiqadi." : (a.error || b.error));
    return;
  }
  const solved = solveFractionOp(a, b, fractionOp);
  if (solved.error) { showFracResult("", "", solved.error); return; }
  const { sn, sd, steps, symbol } = solved;
  const expression = `<div class="frac-expression">${inputHtml(a)} <span class="fx-op">${symbol}</span> ${inputHtml(b)} <span class="fx-op">=</span> ${fracHtml(sn, sd)}${sd !== 1n && M.bAbs(sn) > sd ? ` <span class="fx-op">=</span> ${mixedHtml(sn, sd)}` : ""}</div>`;
  showFracResult(expression + resultBlock(sn, sd), renderSteps(steps));
}

/* Ikki kasr ustida amal: natija (qisqartirilgan) va tushuntirish qadamlari */
function solveFractionOp(a, b, op) {
  const symbol = { "+": "+", "-": "−", "*": "×", "/": "÷" }[op];
  const steps = [];
  const conv = [improperStep(a), improperStep(b)].filter(Boolean);
  if (conv.length) steps.push(["Aralash sonni noto'g'ri kasrga aylantiramiz", conv.join("<br>") + `<div class="step-hint">Butun qismni maxrajga ko'paytirib, suratga qo'shamiz.</div>`]);

  let rn, rd;
  const A = fracHtml(a.n, a.d), B = fracHtml(b.n, b.d);
  if (op === "+" || op === "-") {
    const L = M.bLcm(a.d, b.d);
    let an = a.n, bn = b.n;
    if (a.d === b.d) {
      steps.push(["Maxrajlar bir xil", `Ikkala kasrning maxraji ${a.d} — to'g'ridan-to'g'ri suratlarni ${op === "+" ? "qo'shamiz" : "ayiramiz"}.`]);
    } else {
      const ka = L / a.d, kb = L / b.d;
      an = a.n * ka; bn = b.n * kb;
      steps.push(["Umumiy maxrajni topamiz", `EKUK(${a.d}, ${b.d}) = <b>${L}</b> — bu ikkala maxrajga bo'linadigan eng kichik son.`]);
      const lines = [];
      if (ka !== 1n) lines.push(`${A} = ${a.n < 0n ? '<span class="fx-sign">−</span>' : ""}${fx(`${M.bAbs(a.n)}·${ka}`, `${a.d}·${ka}`)} = ${fracHtml(an, L)}`);
      if (kb !== 1n) lines.push(`${B} = ${b.n < 0n ? '<span class="fx-sign">−</span>' : ""}${fx(`${M.bAbs(b.n)}·${kb}`, `${b.d}·${kb}`)} = ${fracHtml(bn, L)}`);
      steps.push(["Kasrlarni umumiy maxrajga keltiramiz", `Qo'shimcha ko'paytuvchilar: ${L} : ${a.d} = <b>${ka}</b>, ${L} : ${b.d} = <b>${kb}</b>.<br>${lines.join("<br>")}`]);
    }
    rn = op === "+" ? an + bn : an - bn;
    rd = L;
    const opWord = op === "+" ? "qo'shamiz" : "ayiramiz";
    steps.push([`Suratlarni ${opWord}`, `${fracHtml(an, L)} ${symbol} ${fracHtml(bn, L)} = ${fx(`${signed(an)} ${symbol} ${nm(bn)}`, L)} = ${fracHtml(rn, L)}<div class="step-hint">Maxraj o'zgarmaydi — faqat suratlar bilan amal bajariladi.</div>`]);
  } else {
    let cn = b.n, cd = b.d;
    if (op === "/") {
      if (b.n === 0n) return { error: "Nolga bo'lish mumkin emas — ikkinchi kasr 0 ga teng." };
      cn = b.n < 0n ? -b.d : b.d;
      cd = M.bAbs(b.n);
      steps.push(["Bo'lishni ko'paytirishga almashtiramiz", `Ikkinchi kasrni teskarisiga (surat va maxrajini almashtirib) ko'paytiramiz:<br>${A} ÷ ${B} = ${A} × ${fracHtml(cn, cd)}`]);
    }
    rn = a.n * cn;
    rd = a.d * cd;
    steps.push(["Surat suratga, maxraj maxrajga ko'paytiriladi", `${fracHtml(a.n, a.d)} × ${fracHtml(cn, cd)} = ${fx(`${signed(a.n)} · ${nm(cn)}`, `${a.d} · ${cd}`)} = ${fracHtml(rn, rd)}`]);
  }
  const [sn, sd] = simplifySteps(rn, rd, steps);
  finishSteps(sn, sd, steps);
  return { sn, sd, steps, symbol };
}

/* ----- Mashq: tasodifiy misollar ----- */

let practice = null;
let practiceScore = { right: 0, total: 0, streak: 0 };

function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

/* Oddiy kasr (yoki aralash son) obyektini readFraction formatida yasash */
function makeFraction(num, den, whole = 0n) {
  return { whole, num, den, sign: 1n, n: whole * den + num, d: den, mixed: whole !== 0n && num !== 0n, isInteger: false };
}

function newPracticeProblem() {
  const level = practiceScore.streak >= 6 ? 3 : practiceScore.streak >= 3 ? 2 : 1;
  const ops = ["+", "-", "*", "/"];
  const op = ops[randInt(0, 3)];
  const maxDen = level === 1 ? 6 : level === 2 ? 10 : 12;
  const pick = () => {
    const den = BigInt(randInt(2, maxDen));
    const num = BigInt(randInt(1, Number(den) - 1));
    const whole = level === 3 && Math.random() < .4 ? BigInt(randInt(1, 3)) : 0n;
    return makeFraction(num, den, whole);
  };
  let a = pick(), b = pick();
  // Ayirishda manfiy javob chiqmasin (boshlang'ich darajada)
  if (op === "-" && a.n * b.d < b.n * a.d) [a, b] = [b, a];
  practice = { a, b, op, level, revealed: false, answered: false };
}

function renderFracPractice() {
  if (!practice) newPracticeProblem();
  const { a, b, op, level } = practice;
  const symbol = { "+": "+", "-": "−", "*": "×", "/": "÷" }[op];
  const oldPanel = document.getElementById("frac-panel");
  const freshPanel = oldPanel.cloneNode(false); // eski hodisa tinglovchilarisiz
  oldPanel.replaceWith(freshPanel);
  freshPanel.innerHTML = `
    <section class="card tool-card">
      <div class="card-heading"><h2>Mashq qiling</h2><span class="subtle-label">Daraja ${level} / 3</span></div>
      <div class="practice-stats">
        <span class="chip">To'g'ri: <b>${practiceScore.right}</b> / ${practiceScore.total}</span>
        <span class="chip">Ketma-ket: <b>${practiceScore.streak}</b> 🔥</span>
      </div>
      <div class="practice-task">
        <div class="frac-expression practice-expression">${inputHtml(a)} <span class="fx-op">${symbol}</span> ${inputHtml(b)} <span class="fx-op">=</span> <span class="fx-op">?</span></div>
        <div class="frac-row single">${fracInputMarkup("pr", "Javobingiz")}</div>
      </div>
      <p class="tool-intro practice-note">Javobni <b>qisqartirilgan</b> holda yozing. Noto'g'ri kasr (masalan 7/4) yoki aralash son (1 3/4) — ikkalasi ham qabul qilinadi.</p>
      <div class="practice-actions">
        <button class="primary-button" type="button" id="practice-check">Tekshirish</button>
        <button class="secondary-button" type="button" id="practice-reveal">Yechimni ko'rsatish</button>
        <button class="secondary-button" type="button" id="practice-next">Keyingi misol →</button>
      </div>
      <div class="result-panel frac-result is-hint" id="frac-result" aria-live="polite"><div class="frac-hint">Javobni kiriting va "Tekshirish" ni bosing (yoki Enter).</div></div>
    </section>
    <section class="card tool-card steps-card" id="frac-steps-card" hidden>
      <div class="card-heading"><h2>Bosqichma-bosqich yechim</h2><span class="subtle-label">Tushunib oling</span></div>
      <div id="frac-steps"></div>
    </section>`;
  const panel = document.getElementById("frac-panel");
  bindFractionInputs(() => {});
  panel.addEventListener("keydown", event => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) checkPractice();
  });
  document.getElementById("practice-check").addEventListener("click", checkPractice);
  document.getElementById("practice-reveal").addEventListener("click", () => revealPractice());
  document.getElementById("practice-next").addEventListener("click", () => {
    if (!practice.answered && !practice.revealed) { practiceScore.total++; practiceScore.streak = 0; }
    newPracticeProblem();
    renderFracPractice();
    document.getElementById("pr-n").focus();
  });
}

function revealPractice(prefix = "") {
  const solved = solveFractionOp(practice.a, practice.b, practice.op);
  practice.revealed = true;
  if (!practice.answered) { practice.answered = true; practiceScore.total++; practiceScore.streak = 0; }
  showFracResult(`${prefix}${resultBlock(solved.sn, solved.sd, "TO'G'RI JAVOB")}`, renderSteps(solved.steps));
  updatePracticeStats();
  document.getElementById("frac-steps-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function updatePracticeStats() {
  const stats = document.querySelector(".practice-stats");
  if (stats) stats.innerHTML = `<span class="chip">To'g'ri: <b>${practiceScore.right}</b> / ${practiceScore.total}</span><span class="chip">Ketma-ket: <b>${practiceScore.streak}</b> 🔥</span>`;
}

function checkPractice() {
  const answer = readFraction("pr", "Javob");
  if (answer.error) { showFracResult("", "", answer.empty ? "Avval javobni kiriting." : answer.error); return; }
  const solved = solveFractionOp(practice.a, practice.b, practice.op);
  const correct = answer.n * solved.sd === solved.sn * answer.d;
  const simplified = M.bGcd(answer.n, answer.d) === 1n;
  if (correct && simplified) {
    if (!practice.answered) { practiceScore.right++; practiceScore.total++; practiceScore.streak++; }
    practice.answered = true;
    showFracResult(`<div class="practice-verdict good">✓ To'g'ri! Barakalla.</div>${resultBlock(solved.sn, solved.sd)}`, "");
    replay(document.getElementById("frac-result"), "good-glow");
    burstConfetti(document.getElementById("frac-result"));
    updatePracticeStats();
    document.getElementById("practice-next").focus();
  } else if (correct) {
    showFracResult(`<div class="practice-verdict almost">Deyarli! Qiymat to'g'ri, lekin kasrni oxirigacha qisqartiring: EKUB(${M.bAbs(answer.n)}, ${answer.d}) = ${M.bGcd(answer.n, answer.d)}.</div>`, "");
  } else {
    if (!practice.answered) { practice.answered = true; practiceScore.total++; practiceScore.streak = 0; }
    revealPractice(`<div class="practice-verdict bad">✗ Noto'g'ri. Siz yozdingiz: ${fracHtml(answer.n, answer.d)}. Quyida to'g'ri yechim:</div>`);
    replay(document.querySelector(".practice-task"), "shake");
  }
}

/* ----- Qisqartirish ----- */

function factorHtml(big) {
  const factors = M.primeFactors(big);
  if (!factors) return null;
  return factors.map(([p, k]) => k > 1 ? `${p}${String(k).split("").map(c => M.SUPERSCRIPT[c]).join("")}` : String(p)).join(" · ");
}

function renderFracSimplify() {
  fracPanelShell("Kasrni qisqartirish", "EKUB orqali", `<div class="frac-row single">${fracInputMarkup("fs", "Kasr")}</div>`,
    "Kasrni kiriting — surat va maxrajning eng katta umumiy bo'luvchisi (EKUB) topiladi va kasr eng sodda holga keltiriladi.");
  bindFractionInputs(() => {
    const f = readFraction("fs", "Kasr");
    if (f.error) { showFracResult("", "", f.empty ? "Kasrni kiriting, masalan 84/120." : f.error); return; }
    const steps = [];
    const conv = improperStep(f);
    if (conv) steps.push(["Aralash sonni noto'g'ri kasrga aylantiramiz", conv]);
    const a = M.bAbs(f.n), d = f.d;
    if (a !== 0n && d !== 1n) {
      const fa = factorHtml(a), fd = factorHtml(d);
      if (fa && fd && a > 1n && d > 1n) steps.push(["Tub ko'paytuvchilarga ajratamiz", `${a} = ${fa}<br>${d} = ${fd}`]);
      // Yevklid algoritmi
      let x = a > d ? a : d, y = a > d ? d : a;
      const lines = [];
      while (y !== 0n && lines.length < 12) {
        lines.push(`${x} = ${x / y} · ${y} + ${x % y}`);
        [x, y] = [y, x % y];
      }
      if (y === 0n) steps.push(["EKUB ni Yevklid algoritmi bilan topamiz", `${lines.join("<br>")}<div class="step-hint">Qoldiq 0 bo'lgan qadamdagi bo'luvchi — EKUB = <b>${x}</b>.</div>`]);
    }
    const [sn, sd] = simplifySteps(f.n, f.d, steps);
    finishSteps(sn, sd, steps);
    showFracResult(`<div class="frac-expression">${inputHtml(f)} <span class="fx-op">=</span> ${fracHtml(sn, sd)}</div>` + resultBlock(sn, sd, "ENG SODDA KO'RINISH"), renderSteps(steps));
  });
}

/* ----- O'nli ⇄ oddiy ----- */

function renderFracConvert() {
  fracPanelShell("O'nli va oddiy kasrlar", "Davriy kasrlar ham", `
    <div class="convert-mode" role="radiogroup" aria-label="Aylantirish yo'nalishi">
      <label><input type="radio" name="fconv" value="dec" checked /> O'nli → oddiy</label>
      <label><input type="radio" name="fconv" value="frac" /> Oddiy → o'nli</label>
    </div>
    <div id="fconv-dec" class="field" style="max-width:340px">
      <label for="fconv-input">O'nli kasr</label>
      <input id="fconv-input" type="text" inputmode="decimal" autocomplete="off" placeholder="Masalan: 0,375 yoki 0,(3)" />
    </div>
    <div id="fconv-frac" class="frac-row single" hidden>${fracInputMarkup("fc", "Oddiy kasr")}</div>`,
    "Davriy kasrni qavs bilan yozing: <b>0,(3)</b> = 0,333…, <b>1,2(36)</b> = 1,23636…");
  document.getElementById("frac-panel").addEventListener("change", event => {
    if (event.target.name !== "fconv") return;
    const dec = event.target.value === "dec";
    document.getElementById("fconv-dec").hidden = !dec;
    document.getElementById("fconv-frac").hidden = dec;
    updateFracConvert();
  });
  bindFractionInputs(updateFracConvert);
}

function updateFracConvert() {
  const mode = document.querySelector('input[name="fconv"]:checked').value;
  const steps = [];
  if (mode === "dec") {
    const text = document.getElementById("fconv-input").value.trim().replace(/[\s ]/g, "").replace("−", "-");
    if (!text) { showFracResult("", "", "O'nli kasrni kiriting, masalan 0,75."); return; }
    const value = M.parseDecimal(text);
    if (!value) { showFracResult("", "", "Format: 0,75 yoki 2,5 yoki davriy 0,(3)"); return; }
    const m = text.match(/^([+-]?)(\d*)(?:[.,](\d*)(?:\((\d+)\))?)?$/);
    const negative = m[1] === "-";
    const intPart = m[2] || "0", frac = m[3] || "", rep = m[4] || "";
    const s = negative ? '<span class="fx-sign">−</span>' : "";
    let rawN, rawD;
    if (rep) {
      const all = BigInt(intPart + frac + rep), head = BigInt(intPart + frac);
      rawD = BigInt("9".repeat(rep.length) + "0".repeat(frac.length));
      rawN = all - head;
      steps.push(["Davriy kasr formulasi", `Davrgacha bo'lgan son: <b>${head}</b>, davr bilan birga: <b>${all}</b>.<br>Maxraj: davrdagi har bir raqam uchun <b>9</b>, davrgacha verguldan keyingi har bir raqam uchun <b>0</b> → ${rawD}.<br>${s}${fx(`${all} − ${head}`, rawD)} = ${s}${fx(rawN, rawD)}`]);
    } else {
      rawD = 10n ** BigInt(frac.length);
      rawN = BigInt(intPart + frac);
      steps.push(["Kasr ko'rinishida yozamiz", frac.length
        ? `Verguldan keyin ${frac.length} ta raqam bor, shuning uchun maxraj 1${"0".repeat(frac.length)}:<br>${s}${fx(rawN, rawD)}`
        : `Butun son: ${s}${fx(rawN, 1)}`]);
    }
    const sn0 = negative ? -rawN : rawN;
    const [sn, sd] = simplifySteps(sn0, rawD, steps);
    if (sd !== 1n && M.bAbs(sn) > sd) steps.push(["Aralash son ko'rinishida", `${fracHtml(sn, sd)} = ${mixedHtml(sn, sd)}`]);
    showFracResult(`<div class="frac-expression"><span class="fx-int">${escapeHtml(text.replace(".", M.DEC_SEP))}</span> <span class="fx-op">=</span> ${fracHtml(sn, sd)}</div>` + resultBlock(sn, sd, "ODDIY KASR"), renderSteps(steps));
  } else {
    const f = readFraction("fc", "Kasr");
    if (f.error) { showFracResult("", "", f.empty ? "Oddiy kasrni kiriting, masalan 3/8." : f.error); return; }
    const conv = improperStep(f);
    if (conv) steps.push(["Aralash sonni noto'g'ri kasrga aylantiramiz", conv]);
    const [sn, sd] = simplifySteps(f.n, f.d, steps);
    if (sd !== 1n) {
      const fd = factorHtml(sd);
      const only25 = M.primeFactors(sd)?.every(([p]) => p === 2 || p === 5);
      steps.push(["Suratni maxrajga bo'lamiz", `${M.bAbs(sn)} : ${sd} = ${escapeHtml(M.formatRepeating(M.bAbs(sn), sd))}${fd ? `<div class="step-hint">Maxraj: ${sd} = ${fd}. ${only25 === true ? "Faqat 2 va 5 dan iborat — demak o'nli kasr chekli." : only25 === false ? "2 va 5 dan boshqa tub ko'paytuvchi bor — demak o'nli kasr cheksiz davriy." : ""}</div>` : ""}`]);
    }
    finishSteps(sn, sd, steps);
    showFracResult(`<div class="frac-expression">${inputHtml(f)} <span class="fx-op">=</span> <span class="fx-int">${escapeHtml(M.formatRepeating(sn, sd))}</span></div>` + resultBlock(sn, sd, "O'NLI KASR"), renderSteps(steps));
  }
}

/* ----- Taqqoslash ----- */

function renderFracCompare() {
  fracPanelShell("Kasrlarni taqqoslash", "Qaysi biri katta?", `
    <div class="frac-row">
      ${fracInputMarkup("ca", "Birinchi kasr")}
      <div class="compare-sign" id="compare-sign" aria-hidden="true">?</div>
      ${fracInputMarkup("cb", "Ikkinchi kasr")}
    </div>`,
    "Ikki kasrni kiriting — qaysi biri katta ekanini va nima uchun shundayligini ko'rasiz.");
  bindFractionInputs(() => {
    const a = readFraction("ca", "Birinchi kasr"), b = readFraction("cb", "Ikkinchi kasr");
    const signEl = document.getElementById("compare-sign");
    if (a.error || b.error) {
      signEl.textContent = "?";
      showFracResult("", "", a.empty && b.empty ? "Ikkala kasrni kiriting." : (a.error || b.error));
      return;
    }
    const steps = [];
    const conv = [improperStep(a), improperStep(b)].filter(Boolean);
    if (conv.length) steps.push(["Aralash sonni noto'g'ri kasrga aylantiramiz", conv.join("<br>")]);
    const L = M.bLcm(a.d, b.d);
    const an = a.n * (L / a.d), bn = b.n * (L / b.d);
    if (a.d !== b.d) {
      steps.push(["Umumiy maxrajga keltiramiz", `EKUK(${a.d}, ${b.d}) = <b>${L}</b><br>${fracHtml(a.n, a.d)} = ${fracHtml(an, L)}, &nbsp; ${fracHtml(b.n, b.d)} = ${fracHtml(bn, L)}`]);
    }
    const sign = an > bn ? ">" : an < bn ? "<" : "=";
    signEl.textContent = sign;
    steps.push(["Suratlarni solishtiramiz", `Maxrajlar teng bo'lsa, surati katta kasr katta: ${signed(an)} ${sign} ${signed(bn)}, demak ${fracHtml(a.n, a.d)} <b>${sign}</b> ${fracHtml(b.n, b.d)}`]);
    if (an !== bn) {
      const diff = M.rat(an - bn, L);
      steps.push(["Farqi", `${fracHtml(a.n, a.d)} − ${fracHtml(b.n, b.d)} = ${fracHtml(diff.n, diff.d)}`]);
    }
    const verdict = sign === "=" ? "Kasrlar teng" : sign === ">" ? "Birinchi kasr katta" : "Ikkinchi kasr katta";
    showFracResult(`
      <div class="frac-expression">${inputHtml(a)} <span class="fx-op big">${sign}</span> ${inputHtml(b)}</div>
      <div class="result-label">${verdict.toUpperCase()}</div>
      <div class="chips"><span class="chip">${escapeHtml(M.formatRepeating(a.n, a.d))} ${sign} ${escapeHtml(M.formatRepeating(b.n, b.d))}</span></div>`, renderSteps(steps));
  });
}

/* =================== KONVERTOR =================== */

const units = {
  length: {
    label: "Uzunlik", units: {
      "Millimetr (mm)": 0.001, "Santimetr (sm)": 0.01, "Detsimetr (dm)": 0.1, "Metr (m)": 1,
      "Kilometr (km)": 1000, "Dyuym (in)": 0.0254, "Fut (ft)": 0.3048,
      "Yard (yd)": 0.9144, "Mil (mi)": 1609.344, "Dengiz mili": 1852
    }
  },
  mass: {
    label: "Og'irlik", units: {
      "Milligramm (mg)": 0.000001, "Gramm (g)": 0.001, "Kilogramm (kg)": 1,
      "Sentner (s)": 100, "Tonna (t)": 1000, "Unsiya (oz)": 0.028349523125, "Funt (lb)": 0.45359237
    }
  },
  temperature: { label: "Harorat", units: { "Selsiy (°C)": "c", "Farengeyt (°F)": "f", "Kelvin (K)": "k" } },
  area: {
    label: "Maydon", units: {
      "Kv. millimetr (mm²)": 0.000001, "Kv. santimetr (sm²)": 0.0001,
      "Kv. metr (m²)": 1, "Sotix (ar)": 100, "Gektar (ga)": 10000, "Kv. kilometr (km²)": 1000000,
      "Akr (ac)": 4046.8564224
    }
  },
  volume: {
    label: "Hajm", units: {
      "Millilitr (ml)": 0.001, "Litr (l)": 1, "Kub metr (m³)": 1000,
      "Choy qoshiq (US)": 0.00492892159375, "Gallon (US)": 3.785411784
    }
  },
  time: {
    label: "Vaqt", units: {
      "Millisekund (ms)": 0.001, "Sekund (s)": 1, "Daqiqa (min)": 60, "Soat (h)": 3600,
      "Kun": 86400, "Hafta": 604800, "Yil (365 kun)": 31536000
    }
  },
  speed: {
    label: "Tezlik", units: {
      "m/s": 1, "km/soat": 1 / 3.6, "Mil/soat (mph)": 0.44704, "Tugun (kn)": 1852 / 3600
    }
  },
  data: {
    label: "Ma'lumot hajmi", units: {
      "Bit (b)": 0.125, "Bayt (B)": 1, "Kilobayt (KB)": 1e3, "Megabayt (MB)": 1e6,
      "Gigabayt (GB)": 1e9, "Terabayt (TB)": 1e12, "Kibibayt (KiB)": 1024,
      "Mebibayt (MiB)": 1048576, "Gibibayt (GiB)": 1073741824
    }
  }
};
let converterCategory = "length";

function selectOptions(items, selected) {
  return Object.keys(items).map(unit =>
    `<option value="${escapeHtml(unit)}" ${unit === selected ? "selected" : ""}>${escapeHtml(unit)}</option>`
  ).join("");
}

function renderConverter() {
  const categoryOptions = Object.keys(units).map(key =>
    `<option value="${key}" ${key === converterCategory ? "selected" : ""}>${escapeHtml(units[key].label)}</option>`
  ).join("");
  workspace.innerHTML = `
    <section class="card tool-card">
      <div class="card-heading"><h2>O'lchov birliklari konvertori</h2><span class="subtle-label">${Object.keys(units).length} ta yo'nalish</span></div>
      <p class="tool-intro">Miqdorni kiriting va kerakli birliklarni tanlang — natija darhol hisoblanadi.</p>
      <div class="field" style="max-width:360px;margin-bottom:19px">
        <label for="convert-category">O'lchov turi</label>
        <select id="convert-category">${categoryOptions}</select>
      </div>
      <div class="converter-fields">
        <div class="convert-side">
          <label for="convert-value">Qiymat</label>
          <input id="convert-value" type="text" value="1" inputmode="decimal" autocomplete="off" />
          <select id="convert-from" aria-label="Boshlang'ich birlik"></select>
        </div>
        <button type="button" id="swap-units" class="swap-button" aria-label="Birliklarni almashtirish" title="Almashtirish">⇄</button>
        <div class="convert-side">
          <label for="convert-result">Natija</label>
          <input id="convert-result" type="text" readonly value="1" />
          <select id="convert-to" aria-label="Natija birligi"></select>
        </div>
      </div>
      <div class="result-panel converter-result" aria-live="polite"><div><div class="result-label">O'TKAZILGAN QIYMAT</div><div class="result-value" id="convert-large-result">1</div></div><div class="result-note" id="convert-equation"></div></div>
    </section>`;
  document.getElementById("convert-category").addEventListener("change", event => {
    converterCategory = event.target.value;
    updateUnitChoices();
  });
  updateUnitChoices();
  ["convert-value", "convert-from", "convert-to"].forEach(id =>
    document.getElementById(id).addEventListener("input", updateConversion)
  );
  document.getElementById("convert-from").addEventListener("change", updateConversion);
  document.getElementById("convert-to").addEventListener("change", updateConversion);
  document.getElementById("swap-units").addEventListener("click", () => {
    const from = document.getElementById("convert-from");
    const to = document.getElementById("convert-to");
    [from.value, to.value] = [to.value, from.value];
    updateConversion();
  });
}

function updateUnitChoices() {
  const category = units[converterCategory];
  const keys = Object.keys(category.units);
  const defaultFrom = converterCategory === "length" ? "Metr (m)" : keys[0];
  const defaultTo = converterCategory === "length" ? "Santimetr (sm)" : keys[Math.min(2, keys.length - 1)];
  document.getElementById("convert-from").innerHTML = selectOptions(category.units, defaultFrom);
  document.getElementById("convert-to").innerHTML = selectOptions(category.units, defaultTo === defaultFrom ? keys[1] : defaultTo);
  updateConversion();
}

function toBaseTemperature(value, unit) {
  if (unit === "c") return value;
  if (unit === "f") return (value - 32) * 5 / 9;
  return value - 273.15;
}

function fromBaseTemperature(value, unit) {
  if (unit === "c") return value;
  if (unit === "f") return value * 9 / 5 + 32;
  return value + 273.15;
}

function updateConversion() {
  const category = units[converterCategory];
  const rawValue = document.getElementById("convert-value").value;
  const value = parseNum(rawValue);
  const from = document.getElementById("convert-from").value;
  const to = document.getElementById("convert-to").value;
  const output = document.getElementById("convert-result");
  const large = document.getElementById("convert-large-result");
  const equation = document.getElementById("convert-equation");
  const fail = (title, note = "") => { output.value = ""; large.textContent = title; equation.textContent = note; };
  if (!rawValue.trim()) return fail("Qiymat kiriting");
  if (!Number.isFinite(value)) return fail("Son noto'g'ri", "Masalan: 12,5 yoki 1500");
  const isTemperature = converterCategory === "temperature";
  const baseValue = isTemperature ? toBaseTemperature(value, category.units[from]) : value;
  if (isTemperature && baseValue < -273.15 - 1e-10) {
    return fail("Noto'g'ri harorat", "Harorat mutlaq noldan (−273,15 °C) past bo'lishi mumkin emas.");
  }
  let result = isTemperature
    ? fromBaseTemperature(baseValue, category.units[to])
    : value * category.units[from] / category.units[to];
  if (!Number.isFinite(result)) return fail("Qiymat juda katta");
  result = Number(result.toPrecision(12)); // 0.1·3 kabi suzuvchi nuqta xatolarini yo'qotadi
  const formatted = formatNumber(result, 8);
  output.value = formatted;
  large.textContent = `${formatted} ${to}`;
  equation.textContent = `${formatNumber(value, 8)} ${from} = ${formatted} ${to}`;
}

/* =================== FOIZ =================== */

const percentModes = {
  of: { label: "Sonning foizini topish", a: ["Son", "Masalan, 250"], b: ["Foiz (%)", "Masalan, 15"] },
  what: { label: "A son B ning necha foizi?", a: ["A son (qism)", "Masalan, 30"], b: ["B son (butun)", "Masalan, 120"] },
  change: { label: "Foiz o'zgarishini topish", a: ["Boshlang'ich qiymat", "Masalan, 100"], b: ["Yangi qiymat", "Masalan, 125"] },
  add: { label: "Songa foiz qo'shish / ayirish", a: ["Son", "Masalan, 80 000"], b: ["Foiz (%) — ayirish uchun minus", "Masalan, 12 yoki -12"] }
};

function renderPercent() {
  workspace.innerHTML = `
    <section class="card tool-card">
      <div class="card-heading"><h2>Foiz kalkulyatori</h2><span class="subtle-label">Tez va tushunarli</span></div>
      <p class="tool-intro">Hisoblash turini tanlang va qiymatlarni kiriting — natija darhol chiqadi.</p>
      <div class="form-grid three">
        <div class="field"><label for="percent-mode">Hisoblash turi</label><select id="percent-mode">${Object.entries(percentModes).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}</select></div>
        <div class="field" id="percent-field-a"><label for="percent-a">Son</label><input id="percent-a" type="text" inputmode="decimal" autocomplete="off" /></div>
        <div class="field" id="percent-field-b"><label for="percent-b">Foiz (%)</label><input id="percent-b" type="text" inputmode="decimal" autocomplete="off" /></div>
      </div>
      <div class="result-panel" id="percent-result" aria-live="polite"><div class="result-note">Qiymatlarni kiriting.</div></div>
    </section>`;
  document.getElementById("percent-mode").addEventListener("change", () => { updatePercentLabels(); calculatePercent(); });
  ["percent-a", "percent-b"].forEach(id => document.getElementById(id).addEventListener("input", calculatePercent));
  updatePercentLabels();
}

function updatePercentLabels() {
  const mode = percentModes[document.getElementById("percent-mode").value];
  document.querySelector("#percent-field-a label").textContent = mode.a[0];
  document.getElementById("percent-a").placeholder = mode.a[1];
  document.querySelector("#percent-field-b label").textContent = mode.b[0];
  document.getElementById("percent-b").placeholder = mode.b[1];
}

function calculatePercent() {
  const rawA = document.getElementById("percent-a").value, rawB = document.getElementById("percent-b").value;
  const a = parseNum(rawA), b = parseNum(rawB);
  const panel = document.getElementById("percent-result");
  const mode = document.getElementById("percent-mode").value;
  if (!rawA.trim() || !rawB.trim()) { panel.innerHTML = '<div class="result-note">Ikkala qiymatni ham kiriting.</div>'; return; }
  if (!Number.isFinite(a) || !Number.isFinite(b)) { panel.innerHTML = '<div class="result-note">Sonlarni to\'g\'ri kiriting, masalan 12,5.</div>'; return; }
  const clean = x => Number(x.toPrecision(14));
  const f = x => formatNumber(clean(x));
  if (mode === "of") {
    const result = a * b / 100;
    panel.innerHTML = `<div class="result-label">${f(a)} NING ${f(b)}%</div><div class="result-value">${f(result)}</div><div class="result-note">${f(a)} × ${f(b)} : 100 = ${f(result)}</div>`;
  } else if (mode === "what") {
    if (b === 0) { panel.innerHTML = '<div class="result-note">B son 0 bo\'lishi mumkin emas.</div>'; return; }
    const result = a / b * 100;
    panel.innerHTML = `<div class="result-label">${f(a)} SONI ${f(b)} NING</div><div class="result-value">${f(result)}%</div><div class="result-note">${f(a)} : ${f(b)} × 100 = ${f(result)}%</div>`;
  } else if (mode === "change") {
    if (a === 0) { panel.innerHTML = '<div class="result-label">HISOBLAB BO\'LMAYDI</div><div class="result-note">Boshlang\'ich qiymat 0 bo\'lsa, foiz o\'zgarishini aniqlab bo\'lmaydi.</div>'; return; }
    const change = (b - a) / Math.abs(a) * 100;
    const sign = change > 0 ? "+" : "";
    panel.innerHTML = `<div class="result-label">FOIZ O'ZGARISHI</div><div class="result-value ${change < 0 ? "negative" : change > 0 ? "positive" : ""}">${sign}${f(change)}%</div><div class="result-note">${f(a)} dan ${f(b)} ga ${change < 0 ? "kamayish" : change > 0 ? "o'sish" : "o'zgarish yo'q"} (farq: ${sign}${f(b - a)}).</div>`;
  } else {
    const part = a * b / 100, result = a + part;
    panel.innerHTML = `<div class="result-label">${f(a)} ${b >= 0 ? "+" : "−"} ${f(Math.abs(b))}%</div><div class="result-value">${f(result)}</div><div class="result-note">${f(Math.abs(b))}% = ${f(Math.abs(part))}; ${f(a)} ${b >= 0 ? "+" : "−"} ${f(Math.abs(part))} = ${f(result)}</div>`;
  }
}

/* =================== BMI =================== */

function renderBmi() {
  workspace.innerHTML = `
    <section class="card tool-card">
      <div class="card-heading"><h2>Tana massasi indeksi (BMI)</h2><span class="subtle-label">Kattalar uchun</span></div>
      <p class="tool-intro">Vazn (kg) va bo'y (sm) ni kiriting. BMI — vaznning bo'y (metrda) kvadratiga nisbati.</p>
      <div class="form-grid">
        <div class="field"><label for="bmi-weight">Vazn</label><div class="input-with-unit"><input id="bmi-weight" type="text" inputmode="decimal" autocomplete="off" placeholder="Masalan, 68" /><span class="input-unit">kg</span></div></div>
        <div class="field"><label for="bmi-height">Bo'y</label><div class="input-with-unit"><input id="bmi-height" type="text" inputmode="decimal" autocomplete="off" placeholder="Masalan, 172" /><span class="input-unit">sm</span></div></div>
      </div>
      <div class="result-panel" id="bmi-result" aria-live="polite"><div class="result-note">Vazn va bo'yni kiriting.</div></div>
    </section>`;
  ["bmi-weight", "bmi-height"].forEach(id => document.getElementById(id).addEventListener("input", calculateBmi));
}

function calculateBmi() {
  const weight = parseNum(document.getElementById("bmi-weight").value);
  const heightCm = parseNum(document.getElementById("bmi-height").value);
  const panel = document.getElementById("bmi-result");
  if (!(weight > 0 && weight <= 500 && heightCm >= 50 && heightCm <= 300)) {
    panel.innerHTML = '<div class="result-note">Vaznni 1–500 kg, bo\'yni 50–300 sm oralig\'ida kiriting.</div>';
    return;
  }
  const bmi = weight / ((heightCm / 100) ** 2);
  const category = bmi < 18.5 ? "Me'yordan past vazn" : bmi < 25 ? "Me'yoriy vazn" : bmi < 30 ? "Ortiqcha vazn" : "Semizlik";
  // Shkala 10…40: chegaralar 18,5 → 28,3%, 25 → 50%, 30 → 66,7%
  const marker = Math.max(1, Math.min(99, (bmi - 10) / 30 * 100));
  const h = heightCm / 100;
  const low = 18.5 * h * h, high = 24.9 * h * h;
  panel.innerHTML = `
    <div class="result-label">SIZNING BMI KO'RSATKICHINGIZ</div>
    <div class="result-value">${formatNumber(bmi, 1)} <span class="result-tag">${category}</span></div>
    <div class="bmi-meter"><span class="bmi-marker" style="left:${marker}%"></span></div>
    <div class="bmi-legend"><span style="width:28.3%">Past</span><span style="width:21.7%">Me'yoriy</span><span style="width:16.7%">Ortiqcha</span><span style="width:33.3%">Semizlik</span></div>
    <div class="result-note">Bo'yingiz uchun me'yoriy vazn: <b>${formatNumber(low, 1)} – ${formatNumber(high, 1)} kg</b>. BMI taxminiy ko'rsatkich bo'lib, tashxis hisoblanmaydi.</div>`;
}

/* =================== KREDIT =================== */

function renderLoan() {
  workspace.innerHTML = `
    <section class="card tool-card">
      <div class="card-heading"><h2>Kredit to'lovini hisoblash</h2><span class="subtle-label">Annuitet / differensial</span></div>
      <p class="tool-intro">Kredit summasi, yillik foiz stavkasi va muddatni kiriting. Summani bo'shliq bilan yozish mumkin: 50 000 000.</p>
      <div class="form-grid four">
        <div class="field"><label for="loan-amount">Kredit summasi</label><div class="input-with-unit"><input id="loan-amount" type="text" inputmode="decimal" autocomplete="off" placeholder="50 000 000" /><span class="input-unit">so'm</span></div></div>
        <div class="field"><label for="loan-rate">Yillik foiz stavkasi</label><div class="input-with-unit"><input id="loan-rate" type="text" inputmode="decimal" autocomplete="off" placeholder="24" /><span class="input-unit">%</span></div></div>
        <div class="field"><label for="loan-months">Muddat</label><div class="input-with-unit"><input id="loan-months" type="text" inputmode="numeric" autocomplete="off" placeholder="36" /><span class="input-unit">oy</span></div></div>
        <div class="field"><label for="loan-method">To'lov usuli</label><select id="loan-method"><option value="annuity">Annuitet (teng to'lov)</option><option value="diff">Differensial (kamayuvchi)</option></select></div>
      </div>
      <div class="result-panel" id="loan-result" aria-live="polite"><div class="result-note">Qiymatlarni kiriting.</div></div>
    </section>`;
  ["loan-amount", "loan-rate", "loan-months", "loan-method"].forEach(id =>
    document.getElementById(id).addEventListener("input", calculateLoan)
  );
}

function calculateLoan() {
  const amount = parseNum(document.getElementById("loan-amount").value);
  const annualRate = parseNum(document.getElementById("loan-rate").value);
  const months = parseNum(document.getElementById("loan-months").value);
  const method = document.getElementById("loan-method").value;
  const panel = document.getElementById("loan-result");
  if (!(amount > 0 && annualRate >= 0 && annualRate <= 1000 && Number.isInteger(months) && months >= 1 && months <= 600)) {
    panel.innerHTML = '<div class="result-note">Summani, foiz stavkasini (0–1000%) va muddatni (1–600 oy, butun son) kiriting.</div>';
    return;
  }
  const r = annualRate / 1200;
  const rows = [];
  let balance = amount, total = 0;
  const annuity = r === 0 ? amount / months : amount * r / (1 - (1 + r) ** -months);
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const principal = method === "annuity" ? (m === months ? balance : annuity - interest) : amount / months;
    const payment = principal + interest;
    balance = Math.max(0, balance - principal);
    total += payment;
    rows.push([m, payment, principal, interest, balance]);
  }
  const money = x => formatNumber(Math.round(x), 0);
  const headline = method === "annuity"
    ? `<div class="result-label">OYLIK TO'LOV</div><div class="result-value">${money(annuity)} so'm</div>`
    : `<div class="result-label">BIRINCHI / OXIRGI OY TO'LOVI</div><div class="result-value">${money(rows[0][1])} → ${money(rows[rows.length - 1][1])} so'm</div>`;
  panel.innerHTML = `
    ${headline}
    <div class="loan-summary">
      <div class="loan-stat"><span>Jami to'lov</span><strong>${money(total)} so'm</strong></div>
      <div class="loan-stat"><span>Foiz xarajati</span><strong>${money(total - amount)} so'm</strong></div>
    </div>
    <details class="loan-schedule">
      <summary>To'lov jadvali (${months} oy)</summary>
      <div class="table-wrap"><table>
        <thead><tr><th>Oy</th><th>To'lov</th><th>Asosiy qarz</th><th>Foiz</th><th>Qoldiq</th></tr></thead>
        <tbody>${rows.map(row => `<tr><td>${row[0]}</td>${row.slice(1).map(v => `<td>${money(v)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>
    </details>
    <div class="result-note">Bank komissiyasi, sug'urta va boshqa xarajatlar kiritilmagan.</div>`;
}

/* =================== NAVIGATSIYA VA KLAVIATURA =================== */

/* Bo'limlar manzil orqali: #fractions, #converter ... — "Orqaga" tugmasi ishlaydi */
function pageFromHash() {
  const page = location.hash.slice(1);
  return page in pageInfo ? page : null;
}

function showPage(page) {
  if (!(page in pageInfo)) page = "calculator";
  closeSheet();
  if (page === activePage && workspace.childElementCount) return;
  activePage = page;
  writeStorage(pageKey, activePage);
  render();
  window.scrollTo({ top: 0 });
}

function navigate(page) {
  if (page === activePage) { closeSheet(); return; }
  history.pushState(null, "", `#${page}`);
  showPage(page);
}

window.addEventListener("popstate", () => showPage(pageFromHash() || "calculator"));

const sheet = document.getElementById("app-sheet");
const sheetBackdrop = document.getElementById("app-sheet-backdrop");
function openSheet() {
  sheet.hidden = false;
  sheetBackdrop.hidden = false;
  void sheet.offsetWidth; // yashirin holatdan chiqqach animatsiya ishlashi uchun
  setTimeout(() => { sheet.classList.add("open"); sheetBackdrop.classList.add("open"); }, 10);
}
function closeSheet() {
  if (sheet.hidden) return;
  sheet.classList.remove("open");
  sheetBackdrop.classList.remove("open");
  setTimeout(() => { sheet.hidden = true; sheetBackdrop.hidden = true; }, 250);
}
sheetBackdrop.addEventListener("click", closeSheet);

document.addEventListener("click", event => {
  const pageButton = event.target.closest(".tool-nav [data-page], .app-tabbar [data-page], .app-sheet [data-page]");
  if (pageButton) { navigate(pageButton.dataset.page); return; }
  if (event.target.closest(".app-tabbar [data-more]")) { sheet.hidden ? openSheet() : closeSheet(); return; }
  if (event.target.closest('.app-sheet [data-action="theme"]')) {
    closeSheet();
    document.getElementById("theme-toggle").click();
  }
});

/* Ilova ichida: tugmalar bosilganda yengil tebranish */
const native = window.HisoblaNative;
if (native) {
  document.addEventListener("pointerdown", event => {
    if (event.target.closest(".key, .op-button, .tab-btn, .frac-tab, .primary-button, .sheet-item, .frac-sign")) {
      try { native.haptic(); } catch { /* bo'lmasa — jim */ }
    }
  }, { passive: true });
}

// Boshlang'ich bo'lim: manzildagi yoki oxirgi ochilgani
{
  const initial = pageFromHash() || activePage;
  history.replaceState(null, "", `#${initial}`);
  activePage = initial;
}

/* =================== ILOVA: o'rnatish va oflayn ishlash =================== */

(function setupApp() {
  const insideApk = /HisoblaApp/.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  const apkLink = document.getElementById("apk-link");
  const installButton = document.getElementById("install-app");
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Ilova ichida yoki o'rnatilgan holatda yuklab olish tugmalari kerak emas; iPhone APK ni o'rnata olmaydi
  if (insideApk || standalone || isApple) apkLink.hidden = true;

  if (location.protocol.startsWith("http") && "serviceWorker" in navigator && !insideApk) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    if (!insideApk && !standalone && !isAndroid) installButton.hidden = false;
  });
  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => {});
    deferredPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    installButton.hidden = true;
    showToast("Hisobla o'rnatildi! Endi uni bosh ekrandan ochishingiz mumkin.");
  });
  apkLink.addEventListener("click", () => showToast("APK yuklanmoqda. O'rnatishda \"Noma'lum manbalar\"ga ruxsat bering."));

  // Telefondan kirganlar uchun pastki panel: "Ilovani yuklab oling"
  const bannerKey = "hisobla-app-banner-closed";
  const closedAt = Number(readStorage(bannerKey) || 0);
  const recentlyClosed = Date.now() - closedAt < 3 * 24 * 3600 * 1000; // 3 kun ko'rsatmaymiz
  if (insideApk || standalone || recentlyClosed || !(isAndroid || isApple)) return;

  const banner = document.createElement("div");
  banner.className = "app-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Hisobla ilovasi");
  banner.innerHTML = `
    <img src="avatar.svg" alt="" width="46" height="46" />
    <div class="app-banner-text">
      <strong>Hisobla ilovasi</strong>
      <span>${isAndroid ? "Tezroq ochiladi, internetsiz ham ishlaydi" : "Bosh ekranga qo'shing — ilova kabi ishlaydi"}</span>
    </div>
    ${isAndroid
      ? `<a class="app-banner-button" href="${apkLink.href}" rel="noopener">Yuklab olish</a>`
      : `<button type="button" class="app-banner-button" data-ios-help>Qanday?</button>`}
    <button type="button" class="app-banner-close" aria-label="Yopish">×</button>`;
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add("show"), 700);

  const close = () => {
    writeStorage(bannerKey, String(Date.now()));
    banner.classList.remove("show");
    setTimeout(() => banner.remove(), 300);
  };
  banner.querySelector(".app-banner-close").addEventListener("click", close);
  banner.querySelector("a.app-banner-button")?.addEventListener("click", () => {
    showToast("APK yuklanmoqda. Yuklangach faylni oching va \"O'rnatish\"ni bosing.");
    close();
  });
  banner.querySelector("[data-ios-help]")?.addEventListener("click", () => {
    showToast("Safari'da pastdagi \"Ulashish\" (□↑) tugmasini bosing va \"Bosh ekranga qo'shish\"ni tanlang.");
  });
})();

document.addEventListener("keydown", event => {
  if (activePage !== "calculator" || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return;
  const input = document.getElementById("expression");
  if (!input) return;
  if (/^[0-9.,+\-*/()%^!:]$/.test(event.key)) {
    event.preventDefault();
    input.setSelectionRange(input.value.length, input.value.length);
    insertExpression(event.key === ":" ? "/" : event.key);
  } else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculateAndSave();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    input.setSelectionRange(input.value.length, input.value.length);
    backspace();
  } else if (event.key === "Escape" || event.key.toLowerCase() === "c") {
    setExpression("");
  }
});

render();
