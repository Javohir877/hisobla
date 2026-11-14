/* Kasrlar: matematik tushuntirish qadamlari va ularni ko'rsatuvchi kichik komponentlar */
import M from "./math-core.js";

const abs = M.bAbs;
export const signed = big => (big < 0n ? `−${-big}` : String(big));
const paren = big => (big < 0n ? `(−${-big})` : String(big));

/* ---------- Ko'rinish komponentlari ---------- */

/* Surat ustida, maxraj ostida */
export function Fx({ n, d }) {
  return (
    <span className="fx">
      <span className="fx-n">{String(n)}</span>
      <span className="fx-d">{String(d)}</span>
    </span>
  );
}

const Minus = () => <span className="fx-sign">−</span>;

/* Kasr qiymati: −5/3 yoki butun son */
export function Frac({ n, d }) {
  if (d === 1n) return <span className="fx-int">{signed(n)}</span>;
  return <>{n < 0n && <Minus />}<Fx n={abs(n)} d={d} /></>;
}

/* Aralash son: 2 1/3 */
export function Mixed({ n, d }) {
  const a = abs(n);
  if (d === 1n || a < d) return <Frac n={n} d={d} />;
  const rest = a % d;
  return <>{n < 0n && <Minus />}<span className="fx-int">{String(a / d)}</span>{rest > 0n && <Fx n={rest} d={d} />}</>;
}

/* Foydalanuvchi kiritgan ko'rinishda (aralash son bo'lsa ham) */
export function Typed({ f }) {
  if (f.isInteger) return <span className="fx-int">{signed(f.sign * f.whole)}</span>;
  return (
    <>
      {f.sign < 0n && (f.whole !== 0n || f.num !== 0n) && <Minus />}
      {f.whole !== 0n && <span className="fx-int">{String(f.whole)}</span>}
      <Fx n={f.num} d={f.den} />
    </>
  );
}

export function Steps({ steps }) {
  return (
    <ol className="steps">
      {steps.map(([title, body], i) => (
        <li key={i} style={{ "--i": i }}>
          <span className="step-index">{i + 1}</span>
          <div>
            <div className="step-title">{title}</div>
            <div className="step-body">{body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* Ko'rgazmali bo'laklar: 7/4 → ikki qator, har biri 4 bo'lak */
function FractionBar({ n, d }) {
  const a = abs(n);
  if (d > 24n || d < 2n || a === 0n || a > d * 3n) return null;
  const rows = Number((a + d - 1n) / d), cols = Number(d), filled = Number(a);
  return (
    <div className="fbar-wrap" aria-hidden="true">
      {Array.from({ length: rows }, (_, r) => (
        <div className="fbar" key={r} style={{ "--cols": cols }}>
          {Array.from({ length: cols }, (_, c) => <span key={c} className={r * cols + c < filled ? "on" : ""} />)}
        </div>
      ))}
      <div className="fbar-note">Har bir bo'lak — 1/{cols}</div>
    </div>
  );
}

export function ResultBlock({ n, d, title = "JAVOB" }) {
  return (
    <>
      <div className="frac-result-main">
        <div>
          <div className="result-label">{title}</div>
          <div className="frac-answer"><Frac n={n} d={d} /></div>
        </div>
        <FractionBar n={n} d={d} />
      </div>
      <div className="chips">
        {d !== 1n && abs(n) > d && <span className="chip">Aralash son: <Mixed n={n} d={d} /></span>}
        {d !== 1n && <span className="chip">O'nli: <b>{M.formatRepeating(n, d)}</b></span>}
        <span className="chip">Foizda: <b>{M.formatExact(n * 100n, d, 4)}%</b></span>
      </div>
    </>
  );
}

/* ---------- Kiritilgan kasrni o'qish ---------- */

export const EMPTY_FRACTION = { negative: false, w: "", n: "", d: "" };

/* { whole, num, den, sign, n, d, isInteger } yoki { error } */
export function parseFraction(value, label) {
  const clean = s => s.trim().replace(/[\s ]/g, "");
  const w = clean(value.w), n = clean(value.n), d = clean(value.d);
  if (!w && !n && !d) return { empty: true, error: `${label}ni kiriting` };
  for (const part of [w, n, d]) {
    if (part && !/^[+\-−]?\d{1,15}$/.test(part)) return { error: `${label}: faqat butun sonlar kiriting (masalan 2, 3, 15)` };
  }
  if (n && !d) return { error: `${label}: maxrajni kiriting` };
  if (d && !n) return { error: `${label}: suratni kiriting` };
  const big = s => BigInt(s.replace("−", "-") || "0");
  const W = big(w), N = big(n), D = d ? big(d) : 1n;
  if (D === 0n) return { error: `${label}: maxraj 0 bo'lishi mumkin emas` };
  let sign = value.negative ? -1n : 1n;
  for (const x of [W, N, D]) if (x < 0n) sign = -sign;
  const whole = abs(W), num = abs(N), den = abs(D);
  return { whole, num, den, sign, n: sign * (whole * den + num), d: den, isInteger: !d };
}

export function makeFraction(num, den, whole = 0n) {
  return { whole, num, den, sign: 1n, n: whole * den + num, d: den, isInteger: false };
}

/* ---------- Tushuntirish qadamlari ---------- */

export function improperStep(f) {
  if (!f.whole || !f.num) return null;
  return (
    <>
      <Typed f={f} /> = {f.sign < 0n && <Minus />}<Fx n={`${f.whole}·${f.den} + ${f.num}`} d={f.den} /> = <Frac n={f.n} d={f.d} />
    </>
  );
}

const Hint = ({ children }) => <div className="step-hint">{children}</div>;
const lines = items => items.map((item, i) => <div key={i}>{item}</div>);

export function simplifySteps(n, d, steps) {
  if (n === 0n) { steps.push(["Natija", <>Surat 0 ga teng, demak kasr qiymati <b>0</b>.</>]); return [0n, 1n]; }
  const g = M.bGcd(n, d);
  if (g > 1n) {
    steps.push(["Qisqartiramiz", <>
      EKUB({String(abs(n))}, {String(d)}) = <b>{String(g)}</b>. Surat va maxrajni {String(g)} ga bo'lamiz:<br />
      <Frac n={n} d={d} /> = {n < 0n && <Minus />}<Fx n={`${abs(n)} : ${g}`} d={`${d} : ${g}`} /> = <Frac n={n / g} d={d / g} />
    </>]);
  } else if (d !== 1n) {
    steps.push(["Qisqartirish", <>EKUB({String(abs(n))}, {String(d)}) = 1 — kasr qisqarmaydi.</>]);
  }
  return [n / g, d / g];
}

function decimalExplain(n, d) {
  const rep = M.formatRepeating(n, d);
  const period = rep.match(/\((\d+)\)/)?.[1];
  if (period) return <><b>{rep}</b> — cheksiz davriy kasr, takrorlanuvchi qism (davr): <b>{period}</b>. Taxminan {M.formatExact(n, d, 6)}</>;
  return <><b>{rep}</b> — chekli o'nli kasr (maxraj faqat 2 va 5 ga bo'linadi).</>;
}

export function finishSteps(n, d, steps) {
  if (d === 1n) { steps.push(["Javob", <>Natija butun son: <b>{signed(n)}</b></>]); return; }
  const a = abs(n);
  if (a > d) {
    steps.push(["Butun qismini ajratamiz", <>
      {String(a)} : {String(d)} = {String(a / d)} (qoldiq {String(a % d)}), demak <Frac n={n} d={d} /> = <Mixed n={n} d={d} />
    </>]);
  }
  steps.push(["O'nli kasr ko'rinishida", decimalExplain(n, d)]);
}

export const OP_SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷" };

/* Ikki kasr ustida amal: { sn, sd, steps } yoki { error } */
export function solveFractionOp(a, b, op) {
  const symbol = OP_SYMBOL[op];
  const steps = [];
  const conv = [improperStep(a), improperStep(b)].filter(Boolean);
  if (conv.length) steps.push(["Aralash sonni noto'g'ri kasrga aylantiramiz", <>
    {lines(conv)}<Hint>Butun qismni maxrajga ko'paytirib, suratga qo'shamiz.</Hint>
  </>]);

  let rn, rd;
  const A = <Frac n={a.n} d={a.d} />, B = <Frac n={b.n} d={b.d} />;
  if (op === "+" || op === "-") {
    const L = M.bLcm(a.d, b.d);
    let an = a.n, bn = b.n;
    const word = op === "+" ? "qo'shamiz" : "ayiramiz";
    if (a.d === b.d) {
      steps.push(["Maxrajlar bir xil", <>Ikkala kasrning maxraji {String(a.d)} — to'g'ridan-to'g'ri suratlarni {word}.</>]);
    } else {
      const ka = L / a.d, kb = L / b.d;
      an = a.n * ka; bn = b.n * kb;
      steps.push(["Umumiy maxrajni topamiz", <>EKUK({String(a.d)}, {String(b.d)}) = <b>{String(L)}</b> — bu ikkala maxrajga bo'linadigan eng kichik son.</>]);
      const rows = [];
      if (ka !== 1n) rows.push(<>{A} = {a.n < 0n && <Minus />}<Fx n={`${abs(a.n)}·${ka}`} d={`${a.d}·${ka}`} /> = <Frac n={an} d={L} /></>);
      if (kb !== 1n) rows.push(<>{B} = {b.n < 0n && <Minus />}<Fx n={`${abs(b.n)}·${kb}`} d={`${b.d}·${kb}`} /> = <Frac n={bn} d={L} /></>);
      steps.push(["Kasrlarni umumiy maxrajga keltiramiz", <>
        Qo'shimcha ko'paytuvchilar: {String(L)} : {String(a.d)} = <b>{String(ka)}</b>, {String(L)} : {String(b.d)} = <b>{String(kb)}</b>.
        {lines(rows)}
      </>]);
    }
    rn = op === "+" ? an + bn : an - bn;
    rd = L;
    steps.push([`Suratlarni ${word}`, <>
      <Frac n={an} d={L} /> {symbol} <Frac n={bn} d={L} /> = <Fx n={`${signed(an)} ${symbol} ${paren(bn)}`} d={L} /> = <Frac n={rn} d={L} />
      <Hint>Maxraj o'zgarmaydi — faqat suratlar bilan amal bajariladi.</Hint>
    </>]);
  } else {
    let cn = b.n, cd = b.d;
    if (op === "/") {
      if (b.n === 0n) return { error: "Nolga bo'lish mumkin emas — ikkinchi kasr 0 ga teng." };
      cn = b.n < 0n ? -b.d : b.d;
      cd = abs(b.n);
      steps.push(["Bo'lishni ko'paytirishga almashtiramiz", <>
        Ikkinchi kasrni teskarisiga (surat va maxrajini almashtirib) ko'paytiramiz:<br />
        {A} ÷ {B} = {A} × <Frac n={cn} d={cd} />
      </>]);
    }
    rn = a.n * cn;
    rd = a.d * cd;
    steps.push(["Surat suratga, maxraj maxrajga ko'paytiriladi", <>
      <Frac n={a.n} d={a.d} /> × <Frac n={cn} d={cd} /> = <Fx n={`${signed(a.n)} · ${paren(cn)}`} d={`${a.d} · ${cd}`} /> = <Frac n={rn} d={rd} />
    </>]);
  }
  const [sn, sd] = simplifySteps(rn, rd, steps);
  finishSteps(sn, sd, steps);
  return { sn, sd, steps, symbol };
}

/* Qisqartirish: tub ko'paytuvchilar + Yevklid algoritmi */
export function factorText(big) {
  const factors = M.primeFactors(big);
  if (!factors) return null;
  return factors.map(([p, k]) => (k > 1 ? `${p}${String(k).split("").map(c => M.SUPERSCRIPT[c]).join("")}` : String(p))).join(" · ");
}

export function simplifySolution(f) {
  const steps = [];
  const conv = improperStep(f);
  if (conv) steps.push(["Aralash sonni noto'g'ri kasrga aylantiramiz", conv]);
  const a = abs(f.n), d = f.d;
  if (a !== 0n && d !== 1n) {
    const fa = factorText(a), fd = factorText(d);
    if (fa && fd && a > 1n && d > 1n) steps.push(["Tub ko'paytuvchilarga ajratamiz", lines([`${a} = ${fa}`, `${d} = ${fd}`])]);
    let x = a > d ? a : d, y = a > d ? d : a;
    const rows = [];
    while (y !== 0n && rows.length < 12) {
      rows.push(`${x} = ${x / y} · ${y} + ${x % y}`);
      [x, y] = [y, x % y];
    }
    if (y === 0n) steps.push(["EKUB ni Yevklid algoritmi bilan topamiz", <>
      {lines(rows)}<Hint>Qoldiq 0 bo'lgan qadamdagi bo'luvchi — EKUB = <b>{String(x)}</b>.</Hint>
    </>]);
  }
  const [sn, sd] = simplifySteps(f.n, f.d, steps);
  finishSteps(sn, sd, steps);
  return { sn, sd, steps };
}

/* O'nli kasr (davriy ham) → oddiy kasr */
export function decimalToFraction(text) {
  const value = M.parseDecimal(text);
  const m = text.match(/^([+-]?)(\d*)(?:[.,](\d*)(?:\((\d+)\))?)?$/);
  if (!value || !m) return null;
  const negative = m[1] === "-";
  const intPart = m[2] || "0", frac = m[3] || "", rep = m[4] || "";
  const s = negative && <Minus />;
  const steps = [];
  let rawN, rawD;
  if (rep) {
    const all = BigInt(intPart + frac + rep), head = BigInt(intPart + frac);
    rawD = BigInt("9".repeat(rep.length) + "0".repeat(frac.length));
    rawN = all - head;
    steps.push(["Davriy kasr formulasi", <>
      Davrgacha bo'lgan son: <b>{String(head)}</b>, davr bilan birga: <b>{String(all)}</b>.<br />
      Maxraj: davrdagi har bir raqam uchun <b>9</b>, davrgacha verguldan keyingi har bir raqam uchun <b>0</b> → {String(rawD)}.<br />
      {s}<Fx n={`${all} − ${head}`} d={rawD} /> = {s}<Fx n={rawN} d={rawD} />
    </>]);
  } else {
    rawD = 10n ** BigInt(frac.length);
    rawN = BigInt(intPart + frac);
    steps.push(["Kasr ko'rinishida yozamiz", frac.length
      ? <>Verguldan keyin {frac.length} ta raqam bor, shuning uchun maxraj 1{"0".repeat(frac.length)}:<br />{s}<Fx n={rawN} d={rawD} /></>
      : <>Butun son: {s}<Fx n={rawN} d={1} /></>]);
  }
  const [sn, sd] = simplifySteps(negative ? -rawN : rawN, rawD, steps);
  if (sd !== 1n && abs(sn) > sd) steps.push(["Aralash son ko'rinishida", <><Frac n={sn} d={sd} /> = <Mixed n={sn} d={sd} /></>]);
  return { sn, sd, steps };
}

/* Oddiy kasr → o'nli kasr */
export function fractionToDecimal(f) {
  const steps = [];
  const conv = improperStep(f);
  if (conv) steps.push(["Aralash sonni noto'g'ri kasrga aylantiramiz", conv]);
  const [sn, sd] = simplifySteps(f.n, f.d, steps);
  if (sd !== 1n) {
    const fd = factorText(sd);
    const only25 = M.primeFactors(sd)?.every(([p]) => p === 2 || p === 5);
    steps.push(["Suratni maxrajga bo'lamiz", <>
      {String(abs(sn))} : {String(sd)} = {M.formatRepeating(abs(sn), sd)}
      {fd && <Hint>Maxraj: {String(sd)} = {fd}. {only25 === true ? "Faqat 2 va 5 dan iborat — demak o'nli kasr chekli." : only25 === false ? "2 va 5 dan boshqa tub ko'paytuvchi bor — demak o'nli kasr cheksiz davriy." : ""}</Hint>}
    </>]);
  }
  finishSteps(sn, sd, steps);
  return { sn, sd, steps };
}

/* Taqqoslash */
export function compareFractions(a, b) {
  const steps = [];
  const conv = [improperStep(a), improperStep(b)].filter(Boolean);
  if (conv.length) steps.push(["Aralash sonni noto'g'ri kasrga aylantiramiz", lines(conv)]);
  const L = M.bLcm(a.d, b.d);
  const an = a.n * (L / a.d), bn = b.n * (L / b.d);
  if (a.d !== b.d) {
    steps.push(["Umumiy maxrajga keltiramiz", <>
      EKUK({String(a.d)}, {String(b.d)}) = <b>{String(L)}</b><br />
      <Frac n={a.n} d={a.d} /> = <Frac n={an} d={L} />, {" "}<Frac n={b.n} d={b.d} /> = <Frac n={bn} d={L} />
    </>]);
  }
  const sign = an > bn ? ">" : an < bn ? "<" : "=";
  steps.push(["Suratlarni solishtiramiz", <>
    Maxrajlar teng bo'lsa, surati katta kasr katta: {signed(an)} {sign} {signed(bn)}, demak <Frac n={a.n} d={a.d} /> <b>{sign}</b> <Frac n={b.n} d={b.d} />
  </>]);
  if (an !== bn) {
    const diff = M.rat(an - bn, L);
    steps.push(["Farqi", <><Frac n={a.n} d={a.d} /> − <Frac n={b.n} d={b.d} /> = <Frac n={diff.n} d={diff.d} /></>]);
  }
  return { sign, steps };
}
