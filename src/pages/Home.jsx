import { useState } from "react";
import M from "../lib/math-core.js";
import { useApp } from "../context.js";
import { Icon } from "../components/Layout.jsx";

/* [sahifa, nomi, izoh, rang] */
const TOOLS = [
  ["calculator", "Kalkulyator", "Oddiy va ilmiy", "#4c72ee"],
  ["fractions", "Kasrlar", "Yechim bilan", "#8b5cf6"],
  ["roots", "Ildizlar", "√ aniq javob", "#6366f1"],
  ["converter", "Konvertor", "8 xil birlik", "#0ea5c6"],
  ["percent", "Foiz", "4 xil hisob", "#f59e0b"],
  ["bmi", "BMI", "Tana massasi", "#ec4899"],
  ["loan", "Kredit", "Oylik to'lov", "#10b981"]
];

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Xayrli tun" : h < 11 ? "Xayrli tong" : h < 17 ? "Xayrli kun" : h < 22 ? "Xayrli kech" : "Xayrli tun";
}

function quickResult(text, degrees) {
  if (!text.trim()) return null;
  try {
    const value = M.evaluate(text, degrees);
    const fraction = M.fractionText(value);
    return { text: `= ${M.formatValue(value)}${fraction && value.d < 10n ** 9n ? `  (${fraction.improper})` : ""}` };
  } catch (e) {
    return { text: e.isMath && !/tugallanmagan/.test(e.message) ? e.message : "…", error: true };
  }
}

export default function Home() {
  const { navigate, history, practiceScore: score, openExpression, openHistory, setFractionTab, settings } = useApp();
  const [quick, setQuick] = useState("");
  const result = quickResult(quick, settings.degrees);

  return (
    <>
      <section className="home-hero">
        <p className="home-greet">{greeting()} 👋</p>
        <h2>Bugun nimani hisoblaymiz?</h2>
        <div className="quick-calc">
          <input type="text" autoComplete="off" spellCheck="false" enterKeyHint="go" aria-label="Tezkor hisob"
            placeholder="Tezkor hisob: 3/4 + 1/6" value={quick} onChange={event => setQuick(event.target.value)}
            onKeyDown={event => { if (event.key === "Enter" && quick.trim()) openExpression(quick.trim()); }} />
          {result && <output className={result.error ? "error" : ""} aria-live="polite">{result.text}</output>}
        </div>
      </section>

      <h3 className="home-title">Vositalar</h3>
      <div className="tool-grid">
        {TOOLS.map(([page, name, hint, color]) => (
          <button key={page} type="button" className="tool-tile" style={{ "--tile": color }} onClick={() => navigate(page)}>
            <span className="tile-icon"><Icon name={page} /></span>
            <strong>{name}</strong>
            <small>{hint}</small>
          </button>
        ))}
      </div>

      <button type="button" className="practice-cta" onClick={() => { setFractionTab("practice"); navigate("fractions"); }}>
        <span className="cta-icon">✦</span>
        <span className="cta-text">
          <strong>Kasrlar mashqi</strong>
          <small>{score.total ? `To'g'ri: ${score.right} / ${score.total} · Eng yaxshi seriya: ${score.best || 0} 🔥` : "Misollar yechib, kasrlarni mustahkamlang"}</small>
        </span>
        <span className="cta-arrow" aria-hidden="true">›</span>
      </button>

      <div className="home-title-row">
        <h3 className="home-title">So'nggi hisoblar</h3>
        {history.length > 3 && <button type="button" className="text-button" onClick={openHistory}>Hammasi</button>}
      </div>
      <div className="card home-history">
        {history.length
          ? history.slice(0, 3).map((item, i) => (
              <button key={i} type="button" className="home-history-item" onClick={() => openExpression(item.expression)}>
                <span>{item.expression}</span>
                <strong>= {item.answer}</strong>
              </button>
            ))
          : <p className="home-empty">Hali hisoblar yo'q. Kalkulyatorda birinchi hisobingizni bajaring.</p>}
      </div>
    </>
  );
}
