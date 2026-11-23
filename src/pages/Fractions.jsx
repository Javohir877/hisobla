import { useMemo, useRef, useState } from "react";
import M from "../lib/math-core.js";
import { useApp } from "../context.js";
import FractionInput from "../components/FractionInput.jsx";
import { burstConfetti } from "../lib/confetti.js";
import { playSound } from "../lib/sounds.js";
import Emoji from "../components/Emoji.jsx";
import {
  EMPTY_FRACTION, Frac, Mixed, Typed, Steps, ResultBlock, OP_SYMBOL,
  parseFraction, makeFraction, solveFractionOp, simplifySolution, decimalToFraction, fractionToDecimal, compareFractions
} from "../lib/fractions.jsx";

const TABS = [["ops", "Amallar"], ["simplify", "Qisqartirish"], ["convert", "O'nli ⇄ oddiy"], ["compare", "Taqqoslash"], ["practice", <>Mashq <Emoji name="sparkles" size="1.05em" /></>]];

export default function Fractions() {
  const { fractionTab, setFractionTab } = useApp();
  const Panel = { ops: Operations, simplify: Simplify, convert: Convert, compare: Compare, practice: Practice }[fractionTab];
  return (
    <>
      <div className="frac-tabs" role="tablist" aria-label="Kasr amallari turlari">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={key === fractionTab}
            className={`frac-tab${key === fractionTab ? " active" : ""}`} onClick={() => setFractionTab(key)}>{label}</button>
        ))}
      </div>
      {/* key — yorliq almashganda panel qayta paydo bo'ladi (CSS animatsiyasi) */}
      <div className="page-enter" key={fractionTab}><Panel /></div>
    </>
  );
}

/* Umumiy qobiq: karta, natija paneli va yechim qadamlari */
export function Shell({ title, label, intro, children, hint, result, steps, resultRef, glow }) {
  return (
    <>
      <section className="card tool-card">
        <div className="card-heading"><h2>{title}</h2><span className="subtle-label">{label}</span></div>
        {intro && <p className="tool-intro">{intro}</p>}
        {children}
        {hint
          ? <div key="hint" className="result-panel frac-result is-hint" aria-live="polite"><div className="frac-hint">{hint}</div></div>
          : <div key="result" ref={resultRef} className={`result-panel frac-result pop-in${glow ? " good-glow" : ""}`} aria-live="polite">{result}</div>}
      </section>
      {steps && (
        <section className="card tool-card steps-card animate-steps">
          <div className="card-heading"><h2>Bosqichma-bosqich yechim</h2><span className="subtle-label">Tushunib oling</span></div>
          <Steps steps={steps} />
        </section>
      )}
    </>
  );
}

const Expression = ({ children }) => <div className="frac-expression">{children}</div>;
const Op = ({ children, big }) => <span className={`fx-op${big ? " big" : ""}`}>{children}</span>;

/* ----- Amallar ----- */
function Operations() {
  const [a, setA] = useState(EMPTY_FRACTION);
  const [b, setB] = useState(EMPTY_FRACTION);
  const [op, setOp] = useState("+");
  const ops = [["+", "Qo'shish"], ["-", "Ayirish"], ["*", "Ko'paytirish"], ["/", "Bo'lish"]];

  const fa = parseFraction(a, "Birinchi kasr"), fb = parseFraction(b, "Ikkinchi kasr");
  const solved = useMemo(() => (fa.error || fb.error ? null : solveFractionOp(fa, fb, op)), [a, b, op]); // eslint-disable-line react-hooks/exhaustive-deps
  const hint = fa.empty && fb.empty ? "Ikkala kasrni kiriting — natija shu yerda chiqadi." : fa.error || fb.error || solved?.error;

  return (
    <Shell title="Kasrlar ustida amallar" label="Aralash sonlar ham"
      intro={<>Butun qism (bo'lsa), surat va maxrajni kiriting. Natija avtomatik qisqartiriladi va har bir qadam tushuntiriladi. Maslahat: suratdan keyin <b>/</b> bossangiz, maxrajga o'tadi.</>}
      hint={hint} steps={!hint && solved.steps}
      result={!hint && <>
        <Expression>
          <Typed f={fa} /> <Op>{OP_SYMBOL[op]}</Op> <Typed f={fb} /> <Op>=</Op> <Frac n={solved.sn} d={solved.sd} />
          {solved.sd !== 1n && M.bAbs(solved.sn) > solved.sd && <> <Op>=</Op> <Mixed n={solved.sn} d={solved.sd} /></>}
        </Expression>
        <ResultBlock n={solved.sn} d={solved.sd} />
      </>}>
      <div className="frac-row">
        <FractionInput caption="Birinchi kasr" value={a} onChange={setA} />
        <div className="op-picker" role="radiogroup" aria-label="Amal">
          {ops.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={value === op} aria-label={label} title={label}
              className={`op-button${value === op ? " active" : ""}`} onClick={() => setOp(value)}>{OP_SYMBOL[value]}</button>
          ))}
        </div>
        <FractionInput caption="Ikkinchi kasr" value={b} onChange={setB} />
      </div>
    </Shell>
  );
}

/* ----- Qisqartirish ----- */
function Simplify() {
  const [value, setValue] = useState(EMPTY_FRACTION);
  const f = parseFraction(value, "Kasr");
  const solved = useMemo(() => (f.error ? null : simplifySolution(f)), [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const hint = f.error && (f.empty ? "Kasrni kiriting, masalan 84/120." : f.error);
  return (
    <Shell title="Kasrni qisqartirish" label="EKUB orqali"
      intro="Kasrni kiriting — surat va maxrajning eng katta umumiy bo'luvchisi (EKUB) topiladi va kasr eng sodda holga keltiriladi."
      hint={hint} steps={!hint && solved.steps}
      result={!hint && <>
        <Expression><Typed f={f} /> <Op>=</Op> <Frac n={solved.sn} d={solved.sd} /></Expression>
        <ResultBlock n={solved.sn} d={solved.sd} title="ENG SODDA KO'RINISH" />
      </>}>
      <div className="frac-row single"><FractionInput caption="Kasr" value={value} onChange={setValue} /></div>
    </Shell>
  );
}

/* ----- O'nli ⇄ oddiy ----- */
function Convert() {
  const [mode, setMode] = useState("dec");
  const [text, setText] = useState("");
  const [value, setValue] = useState(EMPTY_FRACTION);

  let hint, result, steps;
  if (mode === "dec") {
    const clean = text.trim().replace(/[\s ]/g, "").replace("−", "-");
    const solved = clean && decimalToFraction(clean);
    if (!clean) hint = "O'nli kasrni kiriting, masalan 0,75.";
    else if (!solved) hint = "Format: 0,75 yoki 2,5 yoki davriy 0,(3)";
    else {
      steps = solved.steps;
      result = <>
        <Expression><span className="fx-int">{clean.replace(".", M.DEC_SEP)}</span> <Op>=</Op> <Frac n={solved.sn} d={solved.sd} /></Expression>
        <ResultBlock n={solved.sn} d={solved.sd} title="ODDIY KASR" />
      </>;
    }
  } else {
    const f = parseFraction(value, "Kasr");
    if (f.error) hint = f.empty ? "Oddiy kasrni kiriting, masalan 3/8." : f.error;
    else {
      const solved = fractionToDecimal(f);
      steps = solved.steps;
      result = <>
        <Expression><Typed f={f} /> <Op>=</Op> <span className="fx-int">{M.formatRepeating(solved.sn, solved.sd)}</span></Expression>
        <ResultBlock n={solved.sn} d={solved.sd} title="O'NLI KASR" />
      </>;
    }
  }

  return (
    <Shell title="O'nli va oddiy kasrlar" label="Davriy kasrlar ham"
      intro={<>Davriy kasrni qavs bilan yozing: <b>0,(3)</b> = 0,333…, <b>1,2(36)</b> = 1,23636…</>}
      hint={hint} result={result} steps={steps}>
      <div className="convert-mode" role="radiogroup" aria-label="Aylantirish yo'nalishi">
        <label><input type="radio" name="fconv" checked={mode === "dec"} onChange={() => setMode("dec")} /> O'nli → oddiy</label>
        <label><input type="radio" name="fconv" checked={mode === "frac"} onChange={() => setMode("frac")} /> Oddiy → o'nli</label>
      </div>
      {mode === "dec"
        ? <div className="field" style={{ maxWidth: 340 }}>
            <label htmlFor="fconv-input">O'nli kasr</label>
            <input id="fconv-input" type="text" inputMode="decimal" autoComplete="off" placeholder="Masalan: 0,375 yoki 0,(3)"
              value={text} onChange={event => setText(event.target.value)} />
          </div>
        : <div className="frac-row single"><FractionInput caption="Oddiy kasr" value={value} onChange={setValue} /></div>}
    </Shell>
  );
}

/* ----- Taqqoslash ----- */
function Compare() {
  const [a, setA] = useState(EMPTY_FRACTION);
  const [b, setB] = useState(EMPTY_FRACTION);
  const fa = parseFraction(a, "Birinchi kasr"), fb = parseFraction(b, "Ikkinchi kasr");
  const hint = fa.empty && fb.empty ? "Ikkala kasrni kiriting." : fa.error || fb.error;
  const solved = hint ? null : compareFractions(fa, fb);
  const verdict = solved && (solved.sign === "=" ? "KASRLAR TENG" : solved.sign === ">" ? "BIRINCHI KASR KATTA" : "IKKINCHI KASR KATTA");
  return (
    <Shell title="Kasrlarni taqqoslash" label="Qaysi biri katta?"
      intro="Ikki kasrni kiriting — qaysi biri katta ekanini va nima uchun shundayligini ko'rasiz."
      hint={hint} steps={solved?.steps}
      result={solved && <>
        <Expression><Typed f={fa} /> <Op big>{solved.sign}</Op> <Typed f={fb} /></Expression>
        <div className="result-label">{verdict}</div>
        <div className="chips"><span className="chip">{M.formatRepeating(fa.n, fa.d)} {solved.sign} {M.formatRepeating(fb.n, fb.d)}</span></div>
      </>}>
      <div className="frac-row">
        <FractionInput caption="Birinchi kasr" value={a} onChange={setA} />
        <div className="compare-sign" aria-hidden="true">{solved?.sign ?? "?"}</div>
        <FractionInput caption="Ikkinchi kasr" value={b} onChange={setB} />
      </div>
    </Shell>
  );
}

/* ----- Mashq ----- */
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function newProblem(streak) {
  const level = streak >= 6 ? 3 : streak >= 3 ? 2 : 1;
  const op = ["+", "-", "*", "/"][randInt(0, 3)];
  const maxDen = level === 1 ? 6 : level === 2 ? 10 : 12;
  const pick = () => {
    const den = BigInt(randInt(2, maxDen));
    const num = BigInt(randInt(1, Number(den) - 1));
    return makeFraction(num, den, level === 3 && Math.random() < 0.4 ? BigInt(randInt(1, 3)) : 0n);
  };
  let a = pick(), b = pick();
  if (op === "-" && a.n * b.d < b.n * a.d) [a, b] = [b, a]; // manfiy javob chiqmasin
  return { a, b, op, level, answered: false };
}

function Practice() {
  const { practiceScore: score, setPracticeScore: setScore } = useApp();
  const [problem, setProblem] = useState(() => newProblem(score.streak));
  const [answer, setAnswer] = useState(EMPTY_FRACTION);
  const [feedback, setFeedback] = useState(null); // { kind, reveal }
  const [shake, setShake] = useState(0);
  const resultRef = useRef(null);
  const solved = useMemo(() => solveFractionOp(problem.a, problem.b, problem.op), [problem]);

  const record = correct => {
    if (problem.answered) return;
    setProblem(p => ({ ...p, answered: true }));
    setScore(s => {
      const streak = correct ? s.streak + 1 : 0;
      return { right: s.right + (correct ? 1 : 0), total: s.total + 1, streak, best: Math.max(s.best || 0, streak) };
    });
  };

  const check = () => {
    const f = parseFraction(answer, "Javob");
    if (f.error) { setFeedback({ kind: "hint", text: f.empty ? "Avval javobni kiriting." : f.error }); return; }
    const correct = f.n * solved.sd === solved.sn * f.d;
    if (correct && M.bGcd(f.n, f.d) === 1n) {
      record(true);
      setFeedback({ kind: "good" });
      playSound("success");
    setTimeout(() => burstConfetti(resultRef.current), 30);
    } else if (correct) {
      setFeedback({ kind: "almost", text: `Deyarli! Qiymat to'g'ri, lekin kasrni oxirigacha qisqartiring: EKUB(${M.bAbs(f.n)}, ${f.d}) = ${M.bGcd(f.n, f.d)}.` });
    } else {
      record(false);
      setFeedback({ kind: "bad", given: f });
      setShake(k => k + 1);
      playSound("error");
    }
  };

  const next = () => {
    if (!problem.answered && feedback?.kind !== "good") record(false);
    setProblem(newProblem(feedback?.kind === "good" ? score.streak : 0));
    setAnswer(EMPTY_FRACTION);
    setFeedback(null);
  };

  const reveal = () => { record(false); setFeedback({ kind: "reveal" }); };

  let hint = "Javobni kiriting va \"Tekshirish\" ni bosing (yoki Enter).", result = null, steps = null;
  if (feedback?.kind === "hint") hint = feedback.text;
  else if (feedback?.kind === "almost") { hint = null; result = <div className="practice-verdict almost">{feedback.text}</div>; }
  else if (feedback) {
    hint = null;
    result = <>
      {feedback.kind === "good" && <div className="practice-verdict good stamp"><Emoji name="check" size="1.3em" /> To'g'ri! Barakalla.</div>}
      {feedback.kind === "bad" && <div className="practice-verdict bad"><Emoji name="cross" size="1.1em" /> Noto'g'ri. Siz yozdingiz: <Frac n={feedback.given.n} d={feedback.given.d} />. Quyida to'g'ri yechim:</div>}
      <ResultBlock n={solved.sn} d={solved.sd} title={feedback.kind === "good" ? "JAVOB" : "TO'G'RI JAVOB"} />
    </>;
    if (feedback.kind !== "good") steps = solved.steps;
  }

  return (
    <Shell title="Mashq qiling" label={`Daraja ${problem.level} / 3`} intro={null}
      hint={hint} result={result} steps={steps} resultRef={resultRef} glow={feedback?.kind === "good"}>
      <div className="practice-stats">
        <span className="chip">To'g'ri: <b>{score.right}</b> / {score.total}</span>
        <span className="chip">Ketma-ket: <b>{score.streak}</b> <Emoji name="fire" anim={score.streak >= 3 ? "flicker" : undefined} /></span>
      </div>
      <div className="practice-task" onKeyDown={event => event.key === "Enter" && event.target.tagName === "INPUT" && check()}>
        <div key={shake} className={`frac-expression practice-expression${shake ? " shake" : ""}`}>
          <Typed f={problem.a} /> <Op>{OP_SYMBOL[problem.op]}</Op> <Typed f={problem.b} /> <Op>=</Op> <Op>?</Op>
        </div>
        <div className="frac-row single"><FractionInput caption="Javobingiz" value={answer} onChange={setAnswer} /></div>
      </div>
      <p className="tool-intro practice-note">Javobni <b>qisqartirilgan</b> holda yozing. Noto'g'ri kasr (masalan 7/4) yoki aralash son (1 3/4) — ikkalasi ham qabul qilinadi.</p>
      <div className="practice-actions">
        <button className="primary-button" type="button" onClick={check}>Tekshirish</button>
        <button className="secondary-button" type="button" onClick={reveal}>Yechimni ko'rsatish</button>
        <button className="secondary-button" type="button" onClick={next}>Keyingi misol →</button>
      </div>
    </Shell>
  );
}
