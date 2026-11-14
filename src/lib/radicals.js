/* Hisobla — ildizlar dvigateli (React'dan mustaqil, testlanadi).
   Har bir qiymat aniq saqlanadi: c₁·ⁿ¹√r₁ + c₂·ⁿ²√r₂ + … (c — oddiy kasr, r — soddalashtirilgan butun son).
   Shuning uchun √8 + √18 = 5√2, 1/(1+√2) = √2 − 1 kabi natijalar mutlaqo aniq chiqadi.
   Hisoblash davomida "trace" ro'yxatiga qadamlar yoziladi — ular sahifada tushuntirish sifatida ko'rsatiladi. */
import M from "./math-core.js";

const fail = message => { const e = new Error(message); e.isMath = true; return e; };
const babs = a => (a < 0n ? -a : a);

/* ---------- Kichik kasr arifmetikasi (BigInt) ---------- */
export function Q(n, d = 1n) {
  if (d === 0n) throw fail("Nolga bo'lish mumkin emas");
  if (d < 0n) { n = -n; d = -d; }
  const g = M.bGcd(n, d) || 1n;
  return { n: n / g, d: d / g };
}
const qadd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const qmul = (a, b) => Q(a.n * b.n, a.d * b.d);
const qdiv = (a, b) => Q(a.n * b.d, a.d * b.n);
const qneg = a => ({ n: -a.n, d: a.d });
const qzero = a => a.n === 0n;
const qnum = a => Number(a.n) / Number(a.d);
const qeq = (a, b) => a.n === b.n && a.d === b.d;

/* ---------- ⁿ√a ni soddalashtirish: a = kⁿ · r ---------- */
export function simplifyRoot(n, a) {
  if (a === 0n) return { k: 0n, r: 1n, factors: [] };
  let factors = M.primeFactors(a);
  if (!factors) {
    // Juda katta son: kichik tub sonlar bo'yicha qisman ajratamiz
    factors = [];
    let rest = a;
    for (let p = 2n; p < 100000n && p * p <= rest; p += p === 2n ? 1n : 2n) {
      let e = 0;
      while (rest % p === 0n) { rest /= p; e++; }
      if (e) factors.push([Number(p), e]);
    }
    if (rest > 1n) factors.push([rest, 1]);
  }
  let k = 1n, r = 1n;
  const N = Number(n);
  for (const [p, e] of factors) {
    const P = BigInt(p);
    k *= P ** BigInt(Math.floor(e / N));
    r *= P ** BigInt(e % N);
  }
  return { k, r, factors };
}

/* ---------- Qiymat: hadlar xaritasi ---------- */
const key = (n, r) => `${n}|${r}`;

function make(terms) {
  const map = new Map();
  for (const t of terms) {
    const k = key(t.n, t.r);
    const prev = map.get(k);
    const c = prev ? qadd(prev.c, t.c) : t.c;
    if (qzero(c)) map.delete(k);
    else map.set(k, { n: t.n, r: t.r, c });
  }
  return map;
}

export const rational = q => make([{ n: 1n, r: 1n, c: q }]);
export const fromTerms = terms => make(terms);
export const termsOf = v => [...v.values()].sort((a, b) => (a.n === b.n ? (a.r < b.r ? -1 : 1) : a.n < b.n ? -1 : 1));

/* Ko'rsatish tartibi: birinchi had manfiy bo'lsa, birinchi musbat hadni oldinga — "√2 − 1" */
export function displayTerms(v) {
  const terms = termsOf(v);
  if (terms.length > 1 && terms[0].c.n < 0n) {
    const i = terms.findIndex(t => t.c.n > 0n);
    if (i > 0) terms.unshift(...terms.splice(i, 1));
  }
  return terms;
}
export const isRational = v => v.size === 0 || (v.size === 1 && v.has("1|1"));
export const asRational = v => (v.size === 0 ? Q(0n) : v.get("1|1").c);
export const isIrrational = v => !isRational(v);

export const add = (a, b) => make([...a.values(), ...b.values()]);
export const neg = a => make([...a.values()].map(t => ({ ...t, c: qneg(t.c) })));
export const sub = (a, b) => add(a, neg(b));

/* Bitta had ⁿ√r ni L-darajali ildizga o'tkazish: ⁿ√r = ᴸ√(r^(L/n)) */
function lift(t, L) { return t.n === L ? t.r : t.r ** (L / t.n); }

function mulTerm(t1, t2) {
  if (t1.n === 1n) return { ...t2, c: qmul(t1.c, t2.c) };
  if (t2.n === 1n) return { ...t1, c: qmul(t1.c, t2.c) };
  const L = M.bLcm(t1.n, t2.n);
  const s = simplifyRoot(L, lift(t1, L) * lift(t2, L));
  const c = qmul(qmul(t1.c, t2.c), Q(s.k));
  return s.r === 1n ? { n: 1n, r: 1n, c } : reduceIndex({ n: L, r: s.r, c });
}

/* ⁶√8 = √2 kabi: daraja va ildiz ostidagi sonni qisqartirish */
function reduceIndex(t) {
  if (t.n === 1n) return t;
  const factors = M.primeFactors(t.r);
  if (!factors) return t;
  let g = t.n;
  for (const [, e] of factors) g = M.bGcd(g, BigInt(e));
  if (g <= 1n) return t;
  let r = 1n;
  for (const [p, e] of factors) r *= BigInt(p) ** (BigInt(e) / g);
  return { n: t.n / g, r, c: t.c };
}

export function mul(a, b) {
  const out = [];
  for (const x of a.values()) for (const y of b.values()) out.push(mulTerm(x, y));
  return make(out);
}

/* ⁿ√(p/q) — faqat oddiy son (kasr) dan ildiz olinadi */
export function rootOf(n, v) {
  if (!isRational(v)) throw fail("Ichma-ich ildizlar (masalan √(2+√3)) bu bo'limda soddalashtirilmaydi");
  const q = asRational(v);
  if (q.n === 0n) return rational(Q(0n));
  let sign = 1n, p = q.n;
  if (p < 0n) {
    if (n % 2n === 0n) throw fail("Manfiy sondan juft darajali ildiz chiqarib bo'lmaydi");
    sign = -1n; p = -p;
  }
  // ⁿ√(p/q) = ⁿ√(p·qⁿ⁻¹) / q — maxrajda ildiz qolmasin
  const s = simplifyRoot(n, p * q.d ** (n - 1n));
  const c = Q(sign * s.k, q.d);
  return make([s.r === 1n ? { n: 1n, r: 1n, c } : reduceIndex({ n, r: s.r, c })]);
}

/* Teskari qiymat: maxrajni ildizdan qutqarish */
export function inverse(v, trace) {
  const terms = termsOf(v);
  if (terms.length === 0) throw fail("Nolga bo'lish mumkin emas");
  if (terms.length === 1) {
    const t = terms[0];
    if (t.n === 1n) return rational(qdiv(Q(1n), t.c));
    // 1/(c·ⁿ√r) = ⁿ√(rⁿ⁻¹) / (c·r)
    const factor = make([{ n: t.n, r: t.r ** (t.n - 1n), c: Q(1n) }]);
    const fixed = rootOf(t.n, rational(Q(t.r ** (t.n - 1n))));
    const den = qmul(t.c, Q(t.r));
    trace?.push({ kind: "rationalize", conjugate: false, factor: fixed, raw: factor, den });
    return mul(fixed, rational(qdiv(Q(1n), den)));
  }
  if (terms.length === 2 && terms.every(t => t.n <= 2n)) {
    // (A + B)(A − B) = A² − B² — ildizsiz son
    const [A, B] = terms;
    const conj = make([A, { ...B, c: qneg(B.c) }]);
    const product = mul(v, conj);
    if (!isRational(product)) throw fail("Maxrajni soddalashtirib bo'lmadi");
    const d = asRational(product);
    if (qzero(d)) throw fail("Nolga bo'lish mumkin emas");
    trace?.push({ kind: "rationalize", conjugate: true, factor: conj, den: d, original: v });
    return mul(conj, rational(qdiv(Q(1n), d)));
  }
  throw fail("Maxrajda ikkitadan ko'p ildizli had bor — bunday maxrajni qutqarish bu bo'limda yo'q");
}

export function pow(v, e) {
  if (e.d === 1n) {
    const k = e.n < 0n ? -e.n : e.n;
    if (k > 40n) throw fail("Daraja juda katta");
    let result = rational(Q(1n));
    for (let i = 0n; i < k; i++) result = mul(result, v);
    return e.n < 0n ? inverse(result) : result;
  }
  // a^(p/q) = ᵠ√(aᵖ)
  if (!isRational(v)) throw fail("Ildizli ifodaning kasr darajasi bu bo'limda hisoblanmaydi");
  return rootOf(e.d, pow(v, Q(e.n)));
}

export const approx = v => termsOf(v).reduce((sum, t) => sum + qnum(t.c) * Math.pow(Number(t.r), 1 / Number(t.n)), 0);
export const equal = (a, b) => sub(a, b).size === 0;

/* ---------- Ifodani hisoblash (qadamlarini yozib borish bilan) ---------- */
function ev(node, trace) {
  switch (node.type) {
    case "num": {
      if (!node.v.exact) throw fail("Sonni tekshiring");
      return rational(Q(node.v.n, node.v.d));
    }
    case "paren": return ev(node.a, trace);
    case "neg": return neg(ev(node.a, trace));
    case "pct": return mul(ev(node.a, trace), rational(Q(1n, 100n)));
    case "const": throw fail("π va e bu bo'limda ishlatilmaydi — ular uchun Kalkulyatordan foydalaning");
    case "fact": throw fail("Faktorial bu bo'limda ishlatilmaydi");
    case "fn": {
      const arg = ev(node.a, trace);
      if (node.name === "sqrt" || node.name === "cbrt") {
        const n = node.name === "sqrt" ? 2n : 3n;
        const result = rootOf(n, arg);
        const q = asRational(arg);
        // Faqat haqiqatan soddalashgan (yoki butunlay chiqqan) ildizlar uchun qadam yozamiz
        const s = q.d === 1n && q.n > 0n ? simplifyRoot(n, q.n) : null;
        if (!s || s.k > 1n || s.r === 1n) trace.push({ kind: "root", n, radicand: q, result, simplified: s });
        return result;
      }
      if (node.name === "abs") return approx(arg) < 0 ? neg(arg) : arg;
      throw fail(`${node.name} bu bo'limda ishlatilmaydi — Kalkulyatordan foydalaning`);
    }
    case "bin": {
      const l = ev(node.l, trace), r = ev(node.r, trace);
      if (node.op === "+") return add(l, r);
      if (node.op === "-") return sub(l, r);
      if (node.op === "*") {
        const result = mul(l, r);
        if (isIrrational(l) && isIrrational(r)) trace.push({ kind: "mul", left: l, right: r, result });
        return result;
      }
      if (node.op === "/") {
        if (isRational(r)) return mul(l, rational(qdiv(Q(1n), asRational(r))));
        const steps = [];
        const result = mul(l, inverse(r, steps));
        trace.push({ kind: "div", left: l, right: r, result, how: steps[0] });
        return result;
      }
      // daraja
      const e = ev(node.r, []);
      if (!isRational(e)) throw fail("Daraja oddiy son bo'lishi kerak");
      const result = pow(l, asRational(e));
      if (isIrrational(l)) trace.push({ kind: "pow", base: l, exp: asRational(e), result });
      return result;
    }
  }
  throw fail("Ifodani tekshiring");
}

/* Yuqori darajadagi qo'shiluvchilar: a + b − c → [{sign, node}] */
function topTerms(node, sign = 1, out = []) {
  if (node.type === "bin" && (node.op === "+" || node.op === "-")) {
    topTerms(node.l, sign, out);
    topTerms(node.r, node.op === "-" ? -sign : sign, out);
  } else out.push({ sign, node });
  return out;
}

/* Asosiy funksiya: { value, trace, groups } */
export function evaluateRadical(source) {
  const ast = M.parse(M.tokenize(source));
  const trace = [];
  const parts = topTerms(ast).map(({ sign, node }) => {
    const v = ev(node, trace);
    return sign < 0 ? neg(v) : v;
  });
  const value = parts.reduce((acc, v) => add(acc, v), make([]));
  // O'xshash hadlarni guruhlash: bir xil ildizli hadlar 2 va undan ko'p bo'lsa
  const byKey = new Map();
  for (const part of parts) {
    for (const t of part.values()) {
      const k = key(t.n, t.r);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(t);
    }
  }
  const groups = [...byKey.values()].filter(list => list.length > 1).map(list => ({
    items: list,
    total: list.reduce((c, t) => qadd(c, t.c), Q(0n)),
    n: list[0].n,
    r: list[0].r
  }));
  return { value, trace, groups, parts };
}

/* ---------- Matn ko'rinishi ---------- */
const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
export const rootSign = n => (n === 2n ? "√" : n === 3n ? "∛" : `${String(n).split("").map(c => SUP[c]).join("")}√`);

export function termText(t, first = true) {
  const negative = t.c.n < 0n;
  const p = babs(t.c.n), q = t.c.d;
  const rad = t.n === 1n ? "" : `${rootSign(t.n)}${t.r}`;
  let body;
  if (!rad) body = q === 1n ? `${p}` : `${p}/${q}`;
  else body = `${p === 1n ? "" : p}${rad}${q === 1n ? "" : `/${q}`}`;
  if (first) return negative ? `-${body}` : body;
  return negative ? ` − ${body}` : ` + ${body}`;
}

export function formatRadical(v) {
  const terms = displayTerms(v);
  if (!terms.length) return "0";
  return terms.map((t, i) => termText(t, i === 0)).join("");
}

/* Kalkulyator uchun: ifodaning aniq ildizli ko'rinishi (bo'lmasa — null) */
export function exactRadicalForm(source) {
  try {
    const { value } = evaluateRadical(source);
    return isIrrational(value) && value.size <= 4 ? formatRadical(value) : null;
  } catch {
    return null;
  }
}

/* Taqqoslash uchun: c·√r (c > 0) → √(c²·r) */
export const underRoot = t => ({ n: t.n, inside: qmul(pow(rational(t.c), Q(t.n)).get("1|1").c, Q(t.r)) });
export { qeq, qnum, qzero };
