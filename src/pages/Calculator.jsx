import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import M from "../lib/math-core.js";
import { useApp, IS_APP, NATIVE } from "../context.js";
import { exactRadicalForm } from "../lib/radicals.js";
import { configureSound, playSound } from "../lib/sounds.js";
import Emoji from "../components/Emoji.jsx";
import { Speaker } from "../components/Layout.jsx";

const SCIENTIFIC_KEYS = [
  ["sin(", "sin"], ["cos(", "cos"], ["tan(", "tan"], ["π", "π"],
  ["log(", "log"], ["ln(", "ln"], ["√(", "√"], ["e", "e"],
  ["^2", "x²"], ["^", "xʸ"], ["!", "n!"], ["abs(", "|x|"]
];

/* [qiymat yoki amal, ko'rinishi, turi, ekran o'quvchi uchun nomi] */
const BASIC_KEYS = [
  ["clear", "AC", "function"], ["(", "(", "function"], [")", ")", "function"], ["/", "÷", "operator", "Bo'lish"],
  ["7", "7"], ["8", "8"], ["9", "9"], ["*", "×", "operator", "Ko'paytirish"],
  ["4", "4"], ["5", "5"], ["6", "6"], ["-", "−", "operator", "Ayirish"],
  ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+", "operator", "Qo'shish"],
  ["%", "%", "function"], ["0", "0"], [",", ","], ["backspace", "⌫", "function", "Oxirgi belgini o'chirish"]
];

const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches;

/* Natija: asosiy ko'rinish va qo'shimcha qator (kasr, aniq ildiz yoki o'nli) */
function resultParts(value, fractionFirst, expression = "") {
  const fraction = M.fractionText(value);
  const decimal = M.formatValue(value);
  if (!value.exact) {
    // √8 + √18 → 7,07… va aniq ko'rinishi "5√2"
    const exact = /√|∛|sqrt|cbrt/i.test(expression) ? exactRadicalForm(expression) : null;
    return { main: decimal, alt: exact ? `Aniq: ${exact}` : "" };
  }
  if (!fraction || value.d >= 10n ** 12n || M.bAbs(value.n) >= 10n ** 15n) return { main: decimal, alt: "" };
  const repeating = M.formatRepeating(value.n, value.d);
  const periodic = repeating.includes("(");
  if (fractionFirst) {
    return { main: fraction.improper, alt: `${fraction.mixed ? `= ${fraction.mixed} · ` : ""}≈ ${periodic ? `${decimal} … = ${repeating}` : decimal}` };
  }
  return { main: decimal, alt: `Kasr: ${fraction.mixed ? `${fraction.improper} = ${fraction.mixed}` : fraction.improper}${periodic ? ` · ${repeating}` : ""}` };
}

export default function Calculator() {
  const { settings, updateSettings, history, setHistory, expression, setExpression, toast, openHistory } = useApp();
  const [lastResult, setLastResult] = useState(null); // "=" dan keyingi natija
  const [error, setError] = useState(null);
  const [popKey, setPopKey] = useState(0);
  const inputRef = useRef(null);
  const caretRef = useRef(null);

  const { scientific, degrees, fractionFirst } = settings;

  /* Yozish davomida natija oldindan ko'rinadi */
  const preview = useMemo(() => {
    if (!expression.trim()) return { main: "0", alt: "" };
    try {
      return resultParts(M.evaluate(expression, degrees), fractionFirst, expression);
    } catch (e) {
      return { main: "…", alt: e.isMath && !/tugallanmagan|argumenti yo'q/.test(e.message) ? e.message : "", pending: true };
    }
  }, [expression, degrees, fractionFirst]);

  useLayoutEffect(() => {
    if (caretRef.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  });

  const change = (text, caret = text.length) => {
    caretRef.current = caret;
    setExpression(text);
    setLastResult(null);
    setError(null);
  };

  /* Natijadan keyin: raqam yangi hisob boshlaydi, amal esa natijani davom ettiradi */
  const insert = value => {
    const input = inputRef.current;
    if (lastResult) {
      const base = M.valueToExpression(lastResult.value) ?? `(${lastResult.expression})`;
      change(/^[+\-*/^%!]/.test(value) ? base + value : value);
    } else {
      const start = input?.selectionStart ?? expression.length;
      const end = input?.selectionEnd ?? expression.length;
      change(expression.slice(0, start) + value + expression.slice(end), start + value.length);
    }
    input?.focus({ preventScroll: true });
  };

  const backspace = () => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? expression.length;
    const end = input?.selectionEnd ?? expression.length;
    if (start !== end) change(expression.slice(0, start) + expression.slice(end), start);
    else if (start > 0) change(expression.slice(0, start - 1) + expression.slice(start), start - 1);
  };

  const equals = () => {
    if (!expression.trim()) return;
    try {
      const value = M.evaluate(expression, degrees);
      const parts = resultParts(value, fractionFirst, expression);
      const fraction = M.fractionText(value);
      const exactNote = parts.alt.startsWith("Aniq: ") ? `  (${parts.alt.slice(6)})` : "";
      const answer = parts.main + (fraction && !fractionFirst && parts.alt ? `  (${fraction.improper})` : exactNote);
      if (history[0]?.expression !== expression) setHistory([{ expression, answer }, ...history].slice(0, 30));
      setLastResult({ expression, value });
      setError(null);
      setPopKey(k => k + 1);
    } catch (e) {
      setError(e.isMath ? e.message : "Ifodani tekshiring");
      playSound("error");
      setPopKey(k => k + 1);
    }
  };

  const press = key => {
    if (key === "clear") change("");
    else if (key === "backspace") backspace();
    else if (key === "equals") equals();
    else insert(key);
  };

  /* Klaviatura: kalkulyator ekranidan tashqarida ham raqamlar yoziladi */
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    const onKey = event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest?.("input, select, textarea")) return;
      if (/^[0-9.,+\-*/()%^!:]$/.test(event.key)) { event.preventDefault(); pressRef.current(event.key === ":" ? "/" : event.key); }
      else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); pressRef.current("equals"); }
      else if (event.key === "Backspace") { event.preventDefault(); pressRef.current("backspace"); }
      else if (event.key === "Escape") pressRef.current("clear");
    };
    /* Fizik klaviaturada bosilgan tugma ekranda ham "botadi" */
    const KEY_MAP = { Enter: "equals", "=": "equals", Backspace: "backspace", Escape: "clear", ":": "/", ".": ",", "^": "^" };
    const keyEl = event => {
      const k = KEY_MAP[event.key] ?? event.key;
      return /^[\w+\-*/(),%^!.]+$/.test(k) ? document.querySelector(`.keypad .key[data-k="${k}"]`) : null;
    };
    const onDown = event => keyEl(event)?.classList.add("pressed");
    const onUp = event => keyEl(event)?.classList.remove("pressed");
    const clear = () => document.querySelectorAll(".keypad .key.pressed").forEach(el => el.classList.remove("pressed"));
    document.addEventListener("keydown", onKey);
    document.addEventListener("keydown", onDown);
    document.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
    };
  }, []);

  const onInputKey = event => {
    if (event.key === "Enter" || event.key === "=") { event.preventDefault(); equals(); }
    else if (event.key === "Escape") { event.preventDefault(); change(""); }
    else if (lastResult && event.key.length === 1 && !event.ctrlKey && !event.metaKey && /[0-9.,+\-*/^%!():]/.test(event.key)) {
      event.preventDefault();
      insert(event.key === ":" ? "/" : event.key);
    }
  };

  const shown = error ? { main: error, alt: "" } : lastResult ? resultParts(lastResult.value, fractionFirst, lastResult.expression) : preview;
  /* "=" dan keyin: natija odometr kabi aylanib chiqadi; xatoda harflar "qoqiladi" */
  const resultMotion = !popKey ? null : error ? "deny" : lastResult ? "roll" : null;
  const copy = () => {
    if (error || !navigator.clipboard) return;
    navigator.clipboard.writeText(shown.main.replace(/[\s  ]/g, "")).then(() => toast("Natija nusxalandi."), () => {});
  };

  /* ⌫ ni bosib turish — hammasini o'chiradi */
  const holdRef = useRef({ timer: 0, fired: false });
  const holdStart = () => {
    holdRef.current.fired = false;
    clearTimeout(holdRef.current.timer);
    holdRef.current.timer = setTimeout(() => { holdRef.current.fired = true; change(""); NATIVE?.haptic?.(); }, 550);
  };
  const holdEnd = () => clearTimeout(holdRef.current.timer);

  const key = (k, label, kind = "", aria) => {
    const hold = k === "backspace" ? { onPointerDown: holdStart, onPointerUp: holdEnd, onPointerLeave: holdEnd, onPointerCancel: holdEnd, title: "Bosib tursangiz — hammasi o'chadi" } : null;
    return (
      <button key={k} type="button" data-k={k} className={`key ${kind}`} aria-label={aria} {...hold}
        onClick={() => { if (k === "backspace" && holdRef.current.fired) { holdRef.current.fired = false; return; } press(k); }}>{label}</button>
    );
  };

  return (
    <div className="calc-layout">
      <section className="card calculator-card" aria-label="Kalkulyator">
        <div className="card-heading">
          <h2>{scientific ? "Ilmiy kalkulyator" : "Kalkulyator"}</h2>
          <span className="subtle-label">Kasrlar aniq hisoblanadi</span>
        </div>
        <div className="calc-screen">
          <input ref={inputRef} className="calc-expression" aria-label="Hisoblash ifodasi" autoComplete="off" spellCheck="false"
            placeholder="Masalan: 1/2 + 1/3" inputMode={coarsePointer ? "none" : undefined}
            value={expression} onChange={event => change(event.target.value, event.target.selectionStart)} onKeyDown={onInputKey} />
          <button type="button" key={popKey}
            className={`calc-result${resultMotion ? ` ${resultMotion}` : ""}${error ? " error" : ""}${preview.pending && !error && !lastResult ? " pending" : ""}`}
            style={{ "--len": shown.main.length }} aria-live="polite" aria-label={shown.main} title="Nusxa olish uchun bosing" onClick={copy}>
            {resultMotion
              ? [...shown.main].map((ch, i) => <span key={i} className="ch" style={{ "--i": i }} aria-hidden="true">{ch}</span>)
              : shown.main}
          </button>
          <div className="calc-alt">{shown.alt}</div>
        </div>
        <div className="calc-actions">
          <div className="mode-toggle" role="group" aria-label="Kalkulyator rejimi">
            <button type="button" className={`mode-button${scientific ? "" : " active"}`} onClick={() => updateSettings({ scientific: false })}>Oddiy</button>
            <button type="button" className={`mode-button${scientific ? " active" : ""}`} onClick={() => updateSettings({ scientific: true })}>Ilmiy</button>
          </div>
          <div className="calc-actions-right">
            <button type="button" className={`chip-button${fractionFirst ? " active" : ""}`} title="Natijani kasr yoki o'nli ko'rinishda ko'rsatish"
              onClick={() => updateSettings({ fractionFirst: !fractionFirst })}>a/b ⇄ 0,5</button>
            <button type="button" className={`chip-button sound-chip${settings.sound !== false ? " active" : ""}`}
              aria-pressed={settings.sound !== false} title="Tugma ovozlari"
              onClick={() => { const on = settings.sound === false; updateSettings({ sound: on }); if (on) { configureSound({ ...settings, sound: true }); playSound("down", { big: true }); setTimeout(() => playSound("up", { big: true }), 90); } toast(on ? "Tugma ovozlari yoqildi" : "Tugma ovozlari o'chirildi"); }}>
              <Speaker level={settings.sound !== false ? 2 : 0} size={15} />
            </button>
            {IS_APP && <button type="button" className="chip-button" onClick={openHistory}>Tarix</button>}
            {scientific && (
              <label className="angle-toggle">
                <input type="checkbox" checked={degrees} onChange={event => updateSettings({ degrees: event.target.checked })} /> Gradus
              </label>
            )}
          </div>
        </div>
        <div className="keypad">
          {scientific && SCIENTIFIC_KEYS.map(([k, label]) => key(k, label, "function"))}
          {BASIC_KEYS.map(([k, label, kind, aria]) => key(k, label, kind, aria))}
          {key("equals", "=", "equals wide4")}
        </div>
      </section>

      {!IS_APP && (
        <div className="right-column">
          <section className="card history-card">
            <div className="history-title">
              <h2>So'nggi hisoblar</h2>
              <button className="text-button" type="button" onClick={() => setHistory([])}>Tozalash</button>
            </div>
            <HistoryList items={history.slice(0, 8)} onPick={expr => change(expr)} />
          </section>
          <section className="card tip-card">
            <h3><Emoji name="bulb" size="1.2em" /> Kasrlar bilan ishlash</h3>
            <p><strong>1/2 + 1/3</strong> deb yozing — natija <strong>5/6</strong> kasr ko'rinishida ham chiqadi. Aralash son: <strong>2+1/3</strong>. Davriy kasr: <strong>0,(3)</strong>. Bo'lish uchun <strong>:</strong> belgisi ham ishlaydi.</p>
          </section>
        </div>
      )}
    </div>
  );
}

export function HistoryList({ items, onPick }) {
  if (!items.length) return <div className="history-empty">Hali hisoblar yoʻq.<br />Birinchi hisobingizni kiriting.</div>;
  return (
    <div className="history-list">
      {items.map((item, i) => (
        <button key={`${i}-${item.expression}`} type="button" className="history-entry" onClick={() => onPick(item.expression)}>
          <span className="history-expression">{item.expression}</span>
          <span className="history-answer">= {item.answer}</span>
        </button>
      ))}
    </div>
  );
}
