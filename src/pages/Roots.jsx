import { useMemo, useRef, useState } from "react";
import M from "../lib/math-core.js";
import { Shell } from "./Fractions.jsx";
import { burstConfetti } from "../lib/confetti.js";
import { playSound } from "../lib/sounds.js";
import {
  evaluateRadical, formatRadical, approx, equal, isRational, termsOf, underRoot, rootSign
} from "../lib/radicals.js";
import { Rad, RadValue, radicalSteps, simplifyExplain } from "../lib/radicals-view.jsx";
import Emoji from "../components/Emoji.jsx";

const TABS = [["ops", "Amallar"], ["simplify", "Soddalashtirish"], ["compare", "Taqqoslash"], ["practice", <>Mashq <Emoji name="sparkles" size="1.05em" /></>]];

export default function Roots() {
  const [tab, setTab] = useState("ops");
  const Panel = { ops: Operations, simplify: Simplify, compare: Compare, practice: Practice }[tab];
  return (
    <>
      <div className="frac-tabs" role="tablist" aria-label="Ildizlar bo'limlari">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={key === tab}
            className={`frac-tab${key === tab ? " active" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <div className="page-enter" key={tab}><Panel /></div>
    </>
  );
}

/* Ifoda maydoni + telefon klaviaturasida yo'q belgilar uchun tugmalar */
const SYMBOLS = [["√", "√"], ["∛", "∛"], ["(", "("], [")", ")"], ["²", "^2"], ["·", "·"], [":", "/"], ["+", "+"], ["−", "-"]];

function RadicalInput({ id, label, value, onChange, placeholder }) {
  const ref = useRef(null);
  const insert = symbol => {
    const input = ref.current;
    const start = input?.selectionStart ?? value.length, end = input?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + symbol + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + symbol.length, start + symbol.length); });
  };
  return (
    <div className="field radical-field">
      <label htmlFor={id}>{label}</label>
      <input ref={ref} id={id} className="radical-input" type="text" autoComplete="off" spellCheck="false"
        placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />
      <div className="symbol-row" aria-label="Belgilar">
        {SYMBOLS.map(([label, symbol]) => (
          <button key={label} type="button" className="symbol-key" onClick={() => insert(symbol)}>{label}</button>
        ))}
        <button type="button" className="symbol-key wide" onClick={() => onChange(value.slice(0, -1))} aria-label="O'chirish">⌫</button>
      </div>
    </div>
  );
}

const pretty = text => text.replace(/\*/g, "·").replace(/sqrt/gi, "√").replace(/cbrt/gi, "∛").replace(/\^2/g, "²").replace(/\^3/g, "³");

/* ----- Amallar: qo'shish, ayirish, ko'paytirish, bo'lish, daraja ----- */
const EXAMPLES = ["√8 + √18", "3√12 − √27", "√6 · √3", "2/√3", "1/(1+√2)", "(√5 + 1)²", "√50 − √32 + √2"];

function Operations() {
  const [text, setText] = useState("√8 + √18");
  const solved = useMemo(() => {
    if (!text.trim()) return { hint: "Ifodani yozing yoki pastdagi misollardan birini tanlang." };
    try {
      const result = evaluateRadical(text.replace(/²/g, "^2").replace(/³/g, "^3"));
      return { result, steps: radicalSteps(result) };
    } catch (e) {
      return { hint: e.isMath && !/tugallanmagan/.test(e.message) ? e.message : "Ifodani oxirigacha yozing…" };
    }
  }, [text]);

  return (
    <Shell title="Ildizlar ustida amallar" label="Qo'shish, ayirish, ko'paytirish, bo'lish"
      intro={<>Ifodani yozing: <b>√</b> — kvadrat ildiz, <b>∛</b> — kub ildiz, <b>3√2</b> — 3 ko'paytirilgan √2. Natija aniq ko'rinishda chiqadi va har bir qadam tushuntiriladi.</>}
      hint={solved.hint} steps={solved.steps}
      result={solved.result && <>
        <div className="frac-expression rad-expression">
          <span>{pretty(text)}</span> <span className="fx-op">=</span> <RadValue v={solved.result.value} />
        </div>
        <div className="result-label">JAVOB</div>
        <div className="frac-answer"><RadValue v={solved.result.value} /></div>
        <div className="chips">
          {!isRational(solved.result.value) && <span className="chip">Taxminan: <b>{M.formatFloat(approx(solved.result.value), 8)}</b></span>}
          <span className="chip">Matn: <b>{formatRadical(solved.result.value)}</b></span>
        </div>
      </>}>
      <RadicalInput id="radical-expr" label="Ifoda" value={text} onChange={setText} placeholder="Masalan: √8 + √18" />
      <div className="example-chips" aria-label="Misollar">
        {EXAMPLES.map(example => (
          <button key={example} type="button" className={`chip-button${example === text ? " active" : ""}`} onClick={() => setText(example)}>{example}</button>
        ))}
      </div>
    </Shell>
  );
}

/* ----- Soddalashtirish: k·ⁿ√a ----- */
function Simplify() {
  const [n, setN] = useState("2");
  const [coef, setCoef] = useState("");
  const [radicand, setRadicand] = useState("72");
  const parsed = (() => {
    const a = radicand.trim(), c = coef.trim() || "1";
    if (!a) return { hint: "Ildiz ostidagi sonni kiriting, masalan 72." };
    if (!/^\d{1,12}$/.test(a) || !/^-?\d{1,9}$/.test(c)) return { hint: "Faqat butun sonlar kiriting (ildiz ostidagi son 12 xonagacha)." };
    if (BigInt(a) === 0n) return { hint: "Ildiz ostidagi son 0 dan katta bo'lsin." };
    return { solved: simplifyExplain(BigInt(n), BigInt(a), BigInt(c)), a: BigInt(a), c: BigInt(c) };
  })();
  const N = BigInt(n);

  return (
    <Shell title="Ildizni soddalashtirish" label="Ko'paytuvchini ildizdan chiqarish"
      intro={<>Masalan: <b>√72 = 6√2</b>, <b>∛54 = 3∛2</b>. Son tub ko'paytuvchilarga ajratiladi va to'liq daraja qismi ildizdan chiqariladi.</>}
      hint={parsed.hint} steps={parsed.solved?.steps}
      result={parsed.solved && <>
        <div className="frac-expression rad-expression">
          {parsed.c !== 1n && String(parsed.c)}<Rad n={N}>{String(parsed.a)}</Rad> <span className="fx-op">=</span>{" "}
          <b>{parsed.solved.r === 1n ? String(parsed.solved.k) : <>{parsed.solved.k !== 1n && String(parsed.solved.k)}<Rad n={N}>{String(parsed.solved.r)}</Rad></>}</b>
        </div>
        <div className="chips"><span className="chip">Taxminan: <b>{M.formatFloat(Number(parsed.c) * Math.pow(Number(parsed.a), 1 / Number(N)), 8)}</b></span></div>
      </>}>
      <div className="form-grid three">
        <div className="field">
          <label htmlFor="root-index">Ildiz darajasi</label>
          <select id="root-index" value={n} onChange={event => setN(event.target.value)}>
            <option value="2">Kvadrat ildiz (√)</option>
            <option value="3">Kub ildiz (∛)</option>
            <option value="4">4-darajali (⁴√)</option>
            <option value="5">5-darajali (⁵√)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="root-coef">Oldidagi son (bo'lsa)</label>
          <input id="root-coef" type="text" inputMode="numeric" autoComplete="off" placeholder="1" value={coef} onChange={event => setCoef(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="root-radicand">Ildiz ostidagi son</label>
          <input id="root-radicand" type="text" inputMode="numeric" autoComplete="off" placeholder="72" value={radicand} onChange={event => setRadicand(event.target.value)} />
        </div>
      </div>
    </Shell>
  );
}

/* ----- Taqqoslash ----- */
function Compare() {
  const [a, setA] = useState("3√2");
  const [b, setB] = useState("2√3");

  const solved = useMemo(() => {
    if (!a.trim() || !b.trim()) return { hint: "Ikkala ifodani kiriting, masalan 3√2 va 2√3." };
    let va, vb;
    try { va = evaluateRadical(a).value; vb = evaluateRadical(b).value; }
    catch (e) { return { hint: e.isMath && !/tugallanmagan/.test(e.message) ? e.message : "Ifodani oxirigacha yozing…" }; }
    const same = equal(va, vb);
    const sign = same ? "=" : approx(va) > approx(vb) ? ">" : "<";
    const steps = [];
    const ta = termsOf(va), tb = termsOf(vb);
    const single = ta.length === 1 && tb.length === 1 && ta[0].c.n > 0n && tb[0].c.n > 0n && ta[0].n === tb[0].n && ta[0].n > 1n;
    if (single) {
      const n = ta[0].n, ia = underRoot(ta[0]).inside, ib = underRoot(tb[0]).inside;
      const q = x => (x.d === 1n ? String(x.n) : `${x.n}/${x.d}`);
      steps.push(["Koeffitsiyentni ildiz ostiga kiritamiz", <>
        <RadValue v={va} /> = <Rad n={n}>{q(ia)}</Rad>, {" "} <RadValue v={vb} /> = <Rad n={n}>{q(ib)}</Rad>
        <div className="step-hint">{n === 2n ? "a√b = √(a²·b)" : `a${rootSign(n)}b = ${rootSign(n)}(aⁿ·b)`} — shunda ikkala son bitta ildiz ostida bo'ladi.</div>
      </>]);
      steps.push(["Ildiz ostidagi sonlarni solishtiramiz", <>
        {q(ia)} {sign} {q(ib)}, demak <RadValue v={va} /> <b>{sign}</b> <RadValue v={vb} />
        <div className="step-hint">Ildiz ostidagi son qancha katta bo'lsa, ildiz ham shuncha katta.</div>
      </>]);
    } else {
      steps.push(["Taxminiy qiymatlarni solishtiramiz", <>
        <RadValue v={va} /> ≈ {M.formatFloat(approx(va), 6)}, {" "} <RadValue v={vb} /> ≈ {M.formatFloat(approx(vb), 6)}<br />
        Demak <RadValue v={va} /> <b>{sign}</b> <RadValue v={vb} />
      </>]);
    }
    return { va, vb, sign, steps };
  }, [a, b]);

  const verdict = solved.sign === "=" ? "IFODALAR TENG" : solved.sign === ">" ? "BIRINCHISI KATTA" : "IKKINCHISI KATTA";
  return (
    <Shell title="Ildizlarni taqqoslash" label="Qaysi biri katta?"
      intro="Ikkita ildizli ifodani kiriting — qaysi biri katta ekanini va nima uchun shundayligini ko'rasiz."
      hint={solved.hint} steps={solved.steps}
      result={solved.sign && <>
        <div className="frac-expression rad-expression"><RadValue v={solved.va} /> <span className="fx-op big">{solved.sign}</span> <RadValue v={solved.vb} /></div>
        <div className="result-label">{verdict}</div>
      </>}>
      <div className="compare-row">
        <RadicalInput id="cmp-a" label="Birinchi ifoda" value={a} onChange={setA} placeholder="3√2" />
        <div className="compare-sign" aria-hidden="true">{solved.sign ?? "?"}</div>
        <RadicalInput id="cmp-b" label="Ikkinchi ifoda" value={b} onChange={setB} placeholder="2√3" />
      </div>
    </Shell>
  );
}

/* ----- Mashq ----- */
const pick = list => list[Math.floor(Math.random() * list.length)];
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const FREE = [2, 3, 5, 6, 7, 10, 11];

function newProblem() {
  const type = pick(["simplify", "add", "sub", "mul", "rationalize"]);
  const r = pick(FREE);
  if (type === "simplify") { const k = randInt(2, 6); return { type, text: `√${k * k * r}`, title: "Soddalashtiring" }; }
  if (type === "add" || type === "sub") {
    const a = randInt(1, 4), b = randInt(2, 5);
    const op = type === "add" ? "+" : "−";
    return { type, text: `√${a * a * r} ${op} √${b * b * r}`, title: "Hisoblang" };
  }
  if (type === "mul") { const x = pick([2, 3, 6, 8, 10, 12]), y = pick([2, 3, 6, 15, 18]); return { type, text: `√${x} · √${y}`, title: "Ko'paytiring" }; }
  const c = randInt(1, 9);
  return { type, text: `${c}/√${r}`, title: "Maxrajni ildizdan qutqaring" };
}

function Practice() {
  const [problem, setProblem] = useState(newProblem);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });
  const [shake, setShake] = useState(0);
  const resultRef = useRef(null);
  const expected = useMemo(() => evaluateRadical(problem.text.replace(/−/g, "-")), [problem]);

  const record = correct => {
    if (problem.answered) return;
    setProblem(p => ({ ...p, answered: true }));
    setScore(s => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1, streak: correct ? s.streak + 1 : 0 }));
  };

  const check = () => {
    if (!answer.trim()) { setFeedback({ kind: "hint", text: "Avval javobni yozing, masalan 6√2." }); return; }
    let given;
    try { given = evaluateRadical(answer.replace(/²/g, "^2")); }
    catch (e) { setFeedback({ kind: "hint", text: e.isMath ? e.message : "Javobni tekshiring" }); return; }
    if (!equal(given.value, expected.value)) {
      record(false);
      setFeedback({ kind: "bad", given: given.value });
      setShake(k => k + 1);
      playSound("error");
      return;
    }
    // Qiymat to'g'ri — javob oxirigacha soddalashtirilganmi?
    const notSimple = given.trace.some(ev => ev.kind === "root" && ev.simplified && ev.simplified.k > 1n && ev.simplified.r !== 1n)
      || given.trace.some(ev => ev.kind === "div") || given.groups.length > 0 || given.trace.some(ev => ev.kind === "root" && ev.radicand.d !== 1n);
    if (notSimple) { setFeedback({ kind: "almost" }); return; }
    record(true);
    setFeedback({ kind: "good" });
    playSound("success");
    setTimeout(() => burstConfetti(resultRef.current), 30);
  };

  const next = () => {
    if (!problem.answered && feedback?.kind !== "good") record(false);
    setProblem(newProblem());
    setAnswer("");
    setFeedback(null);
  };

  let hint = "Javobni yozing va \"Tekshirish\" ni bosing (yoki Enter).", result = null, steps = null;
  if (feedback?.kind === "hint") hint = feedback.text;
  else if (feedback?.kind === "almost") { hint = null; result = <div className="practice-verdict almost">Deyarli! Qiymat to'g'ri, lekin javobni oxirigacha soddalashtiring (ildizdan ko'paytuvchini chiqaring, maxrajda ildiz qoldirmang).</div>; }
  else if (feedback) {
    hint = null;
    result = <>
      {feedback.kind === "good" && <div className="practice-verdict good stamp"><Emoji name="check" size="1.3em" /> To'g'ri! Barakalla.</div>}
      {feedback.kind === "bad" && <div className="practice-verdict bad"><Emoji name="cross" size="1.1em" /> Noto'g'ri. Siz yozdingiz: <RadValue v={feedback.given} />. Quyida to'g'ri yechim:</div>}
      <div className="result-label">{feedback.kind === "good" ? "JAVOB" : "TO'G'RI JAVOB"}</div>
      <div className="frac-answer"><RadValue v={expected.value} /></div>
    </>;
    if (feedback.kind !== "good") steps = radicalSteps(expected);
  }

  return (
    <Shell title="Mashq qiling" label={problem.title} intro={null}
      hint={hint} result={result} steps={steps} resultRef={resultRef} glow={feedback?.kind === "good"}>
      <div className="practice-stats">
        <span className="chip">To'g'ri: <b>{score.right}</b> / {score.total}</span>
        <span className="chip">Ketma-ket: <b>{score.streak}</b> <Emoji name="fire" anim={score.streak >= 3 ? "flicker" : undefined} /></span>
      </div>
      <div className="practice-task" onKeyDown={event => event.key === "Enter" && event.target.tagName === "INPUT" && check()}>
        <div key={shake} className={`frac-expression practice-expression rad-expression${shake ? " shake" : ""}`}>
          {problem.title}: <b>{problem.text}</b> <span className="fx-op">=</span> <span className="fx-op">?</span>
        </div>
        <RadicalInput id="root-answer" label="Javobingiz" value={answer} onChange={setAnswer} placeholder="Masalan: 6√2" />
      </div>
      <div className="practice-actions">
        <button className="primary-button" type="button" onClick={check}>Tekshirish</button>
        <button className="secondary-button" type="button" onClick={() => { record(false); setFeedback({ kind: "reveal" }); }}>Yechimni ko'rsatish</button>
        <button className="secondary-button" type="button" onClick={next}>Keyingi misol →</button>
      </div>
    </Shell>
  );
}

