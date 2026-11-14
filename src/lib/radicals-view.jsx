/* Ildizlarni chiroyli ko'rsatish va hisoblash qadamlarini tushuntirishga aylantirish */
import M from "./math-core.js";
import { displayTerms, formatRadical, rootSign, approx, simplifyRoot, isRational, asRational, fromTerms, mul } from "./radicals.js";

const SUP = M.SUPERSCRIPT;
const babs = a => (a < 0n ? -a : a);

/* ⁿ√r — ildiz belgisi ustida chiziq bilan */
export function Rad({ n = 2n, children }) {
  return (
    <span className="rad">
      {n !== 2n && <span className="rad-index">{String(n)}</span>}
      <span className="sr-only">√</span>
      <span className="rad-sign" aria-hidden="true" />
      <span className="rad-body">{children}</span>
    </span>
  );
}

/* Ustma-ust kasr (surat va maxraj ixtiyoriy React elementlari) */
const Over = ({ top, bottom }) => (
  <span className="fx"><span className="fx-n">{top}</span><span className="fx-d">{bottom}</span></span>
);

function TermView({ t, first }) {
  const negative = t.c.n < 0n;
  const p = babs(t.c.n), q = t.c.d;
  const rad = t.n === 1n ? null : <Rad n={t.n}>{String(t.r)}</Rad>;
  const top = rad ? <>{p !== 1n && String(p)}{rad}</> : String(p);
  const body = q === 1n ? top : <Over top={top} bottom={String(q)} />;
  const sign = first ? (negative ? "−" : "") : negative ? " − " : " + ";
  return <>{sign && <span className="rad-op">{sign}</span>}{body}</>;
}

/* Butun qiymat: 6 + 2√5 */
export function RadValue({ v }) {
  const terms = displayTerms(v);
  if (!terms.length) return <span className="fx-int">0</span>;
  return <span className="rad-value">{terms.map((t, i) => <TermView key={i} t={t} first={i === 0} />)}</span>;
}

/* Kasr qiymat (ildiz ostidagi son) matn ko'rinishida */
const qText = q => (q.d === 1n ? String(q.n) : `${q.n}/${q.d}`);
const factorText = factors => factors.map(([p, e]) => (e > 1 ? `${p}${String(e).split("").map(c => SUP[c]).join("")}` : String(p))).join(" · ");
const approxText = v => M.formatFloat(approx(v), 6);

/* Bitta ildizni soddalashtirish qadamining matni */
function rootStep(ev) {
  const { n, radicand, result, simplified } = ev;
  const sign = rootSign(n);
  if (radicand.d !== 1n) {
    return [`${sign}(${qText(radicand)}) ni soddalashtiramiz`, <>
      Kasrdan ildiz: maxrajda ildiz qolmasligi uchun surat va maxrajni {n === 2n ? "maxrajga" : `maxrajning ${n - 1n}-darajasiga`} ko'paytiramiz:<br />
      <Rad n={n}>{qText(radicand)}</Rad> = <RadValue v={result} />
    </>];
  }
  if (simplified && simplified.r === 1n) {
    return [`${sign}${radicand.n} — butun chiqadi`, <>
      {String(radicand.n)} = {String(simplified.k)}{SUP[String(n)] ?? `^${n}`}, demak <Rad n={n}>{String(radicand.n)}</Rad> = <b>{String(simplified.k)}</b>
    </>];
  }
  const { k, r, factors } = simplified;
  const kn = `${k}${n === 2n ? "²" : n === 3n ? "³" : `^${n}`}`;
  return [`${sign}${radicand.n} ni soddalashtiramiz`, <>
    Tub ko'paytuvchilarga ajratamiz: {String(radicand.n)} = {factorText(factors)}<br />
    Har {n === 2n ? "juft" : `${n} ta bir xil`} ko'paytuvchini ildizdan chiqaramiz: {String(radicand.n)} = {kn} · {String(r)}<br />
    <Rad n={n}>{String(radicand.n)}</Rad> = <Rad n={n}>{kn} · {String(r)}</Rad> = <b><RadValue v={result} /></b>
    <div className="step-hint">{n === 2n ? "√(a²·b) = a√b" : `${sign}(aⁿ·b) = a${sign}b`} — kvadrat (daraja) qismi ildizdan butun son bo'lib chiqadi.</div>
  </>];
}

/* Hisoblash izidan (trace) bosqichma-bosqich tushuntirish */
export function radicalSteps(result) {
  const { value, trace, groups } = result;
  const steps = [];
  const seen = new Set();
  for (const ev of trace) {
    if (ev.kind === "root") {
      const id = `${ev.n}|${qText(ev.radicand)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      steps.push(rootStep(ev));
    } else if (ev.kind === "mul") {
      steps.push(["Ildizlarni ko'paytiramiz", <>
        (<RadValue v={ev.left} />) · (<RadValue v={ev.right} />) = <b><RadValue v={ev.result} /></b>
        <div className="step-hint">√a · √b = √(a·b), so'ng natija soddalashtiriladi. Qavslar bo'lsa — har bir had har bir hadga ko'paytiriladi.</div>
      </>]);
    } else if (ev.kind === "div") {
      const how = ev.how;
      steps.push(how?.conjugate
        ? ["Maxrajni ildizdan qutqaramiz (qo'shma ifoda)", <>
            Maxraj <RadValue v={ev.right} /> — surat va maxrajni qo'shma ifoda <b><RadValue v={how.factor} /></b> ga ko'paytiramiz.<br />
            Maxraj: (<RadValue v={ev.right} />)(<RadValue v={how.factor} />) = {qText(how.den)} — ildiz yo'qoladi.<br />
            Natija: <b><RadValue v={ev.result} /></b>
            <div className="step-hint">(a + b)(a − b) = a² − b² formulasi: ildizlar kvadratga ko'tarilib, oddiy songa aylanadi.</div>
          </>]
        : ["Maxrajni ildizdan qutqaramiz", <>
            Surat va maxrajni <b><RadValue v={how.factor} /></b> ga ko'paytiramiz — maxrajda ildiz qolmaydi.<br />
            <RadValue v={ev.left} /> : <RadValue v={ev.right} /> = <b><RadValue v={ev.result} /></b>
            <div className="step-hint">Masalan: 1/√3 = √3/(√3·√3) = √3/3.</div>
          </>]);
    } else if (ev.kind === "pow") {
      const square = ev.exp.n === 2n && ev.exp.d === 1n && ev.base.size === 2;
      if (square) {
        // (a + b)² = a² + 2ab + b² — har bir qismini alohida ko'rsatamiz
        const [A, B] = displayTerms(ev.base).map(t => fromTerms([t]));
        const two = fromTerms([{ n: 1n, r: 1n, c: { n: 2n, d: 1n } }]);
        steps.push(["Yig'indining kvadrati formulasi", <>
          (a + b)² = a² + 2ab + b², bu yerda a = <RadValue v={A} />, b = <RadValue v={B} /><br />
          a² = <RadValue v={mul(A, A)} />, {" "} 2ab = <RadValue v={mul(two, mul(A, B))} />, {" "} b² = <RadValue v={mul(B, B)} /><br />
          (<RadValue v={ev.base} />)² = <RadValue v={mul(A, A)} /> + <RadValue v={mul(two, mul(A, B))} /> + <RadValue v={mul(B, B)} /> = <b><RadValue v={ev.result} /></b>
          <div className="step-hint">√a ning kvadrati — a ning o'zi: (√5)² = 5.</div>
        </>]);
      } else {
        steps.push(["Darajaga ko'taramiz", <>
          (<RadValue v={ev.base} />){ev.exp.d === 1n ? String(ev.exp.n).split("").map(c => SUP[c] ?? c).join("") : `^(${qText(ev.exp)})`} = <b><RadValue v={ev.result} /></b>
        </>]);
      }
    }
  }
  for (const g of groups) {
    const radical = g.n === 1n ? "" : `${rootSign(g.n)}${g.r}`;
    const coefs = g.items.map((t, i) => {
      const c = t.c, text = qText({ n: babs(c.n), d: c.d });
      return i === 0 ? (c.n < 0n ? `−${text}` : text) : c.n < 0n ? ` − ${text}` : ` + ${text}`;
    }).join("");
    steps.push([radical ? `O'xshash ildizlarni qo'shamiz (${radical})` : "Oddiy sonlarni qo'shamiz", <>
      {g.items.map((t, i) => <TermView key={i} t={t} first={i === 0} />)} = {radical ? <>({coefs}){radical}</> : coefs} = <b><TermView t={{ n: g.n, r: g.r, c: g.total }} first /></b>
      {radical && <div className="step-hint">Ildiz ostidagi son bir xil bo'lsa, faqat oldidagi koeffitsiyentlar qo'shiladi: a√c + b√c = (a + b)√c.</div>}
    </>]);
  }
  const unlike = displayTerms(value).filter(t => t.n !== 1n).length;
  steps.push(["Javob", <>
    <b><RadValue v={value} /></b>
    {!isRational(value) && <> ≈ {approxText(value)}</>}
    {unlike > 1 && <div className="step-hint">Ildiz ostidagi sonlar har xil — bunday hadlarni qo'shib bo'lmaydi, javob shu ko'rinishda qoladi.</div>}
  </>]);
  return steps;
}

/* Soddalashtirish bo'limi uchun: k·ⁿ√a ni to'liq tushuntirish */
export function simplifyExplain(n, a, coef = 1n) {
  const s = simplifyRoot(n, a);
  const steps = [];
  const sign = rootSign(n);
  const kn = `${s.k}${n === 2n ? "²" : n === 3n ? "³" : `^${n}`}`;
  steps.push(["Tub ko'paytuvchilarga ajratamiz", <>{String(a)} = {factorText(s.factors) || "1"}</>]);
  if (s.k > 1n) {
    steps.push([`${n === 2n ? "Juftlarni" : `${n} talik guruhlarni`} ajratamiz`, <>
      {String(a)} = {kn} · {String(s.r)}<br />
      <Rad n={n}>{String(a)}</Rad> = <Rad n={n}>{kn}</Rad> · <Rad n={n}>{String(s.r)}</Rad> = {String(s.k)}{s.r !== 1n && <Rad n={n}>{String(s.r)}</Rad>}
      <div className="step-hint">Har {n === 2n ? "ikkita" : `${n} ta`} bir xil ko'paytuvchidan bittasi ildizdan chiqadi.</div>
    </>]);
  } else {
    steps.push(["Chiqariladigan ko'paytuvchi yo'q", <>{String(a)} ning tub ko'paytuvchilarida {n === 2n ? "juft" : `${n} ta`} takrorlanuvchi yo'q — <Rad n={n}>{String(a)}</Rad> soddalashmaydi.</>]);
  }
  if (coef !== 1n && s.k > 1n) {
    steps.push(["Oldidagi koeffitsiyentga ko'paytiramiz", <>{String(coef)} · {String(s.k)} = <b>{String(coef * s.k)}</b></>]);
  }
  const k = coef * s.k;
  steps.push(["Javob", <><b>{s.r === 1n ? String(k) : <>{k !== 1n && String(k)}<Rad n={n}>{String(s.r)}</Rad></>}</b> ≈ {M.formatFloat(Number(k) * Math.pow(Number(s.r), 1 / Number(n)), 6)}</>]);
  return { steps, k, r: s.r, text: s.r === 1n ? String(k) : `${k === 1n ? "" : k}${sign}${s.r}` };
}

export { formatRadical, asRational };
