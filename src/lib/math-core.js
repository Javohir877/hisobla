"use strict";
/* Hisobla — matematik yadro.
   Barcha + − × ÷ amallari BigInt asosidagi aniq oddiy kasrlar bilan bajariladi,
   shuning uchun 0.1 + 0.2 = 0.3, 1/3 × 3 = 1 kabi natijalar mutlaqo aniq chiqadi. */

const MAX_DIGITS = 600; // bundan katta son/kasrlar o'nli (float) ko'rinishga o'tadi

function mathError(message) {
  const error = new Error(message);
  error.isMath = true;
  return error;
}

function bAbs(a) { return a < 0n ? -a : a; }
function bGcd(a, b) {
  a = bAbs(a); b = bAbs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}
function bLcm(a, b) {
  if (a === 0n || b === 0n) return 0n;
  return bAbs(a / bGcd(a, b) * b);
}
function digitCount(a) { return bAbs(a).toString().length; }

/* ---------- Qiymatlar: aniq kasr yoki taqribiy son ---------- */

function rat(n, d = 1n) {
  if (d === 0n) throw mathError("Nolga bo'lish mumkin emas");
  if (d < 0n) { n = -n; d = -d; }
  const g = bGcd(n, d) || 1n;
  n /= g; d /= g;
  if (digitCount(n) > MAX_DIGITS || digitCount(d) > MAX_DIGITS) return flt(ratToNumber(n, d));
  return { exact: true, n, d };
}

function flt(x) {
  if (!Number.isFinite(x)) throw mathError("Natija juda katta yoki aniqlanmagan");
  return { exact: false, x: Object.is(x, -0) ? 0 : x };
}

function ratToNumber(n, d) {
  if (n === 0n) return 0;
  const nl = digitCount(n), dl = digitCount(d);
  if (nl < 300 && dl < 300) return Number(n) / Number(d);
  const k = 20 - (nl - dl);
  const q = k >= 0 ? n * 10n ** BigInt(k) / d : n / (d * 10n ** BigInt(-k));
  return parseFloat(q.toString() + "e" + (-k));
}

function toNum(v) { return v.exact ? ratToNumber(v.n, v.d) : v.x; }
function isZero(v) { return v.exact ? v.n === 0n : v.x === 0; }
function isInt(v) { return v.exact && v.d === 1n; }

function add(a, b) { return a.exact && b.exact ? rat(a.n * b.d + b.n * a.d, a.d * b.d) : flt(toNum(a) + toNum(b)); }
function sub(a, b) { return a.exact && b.exact ? rat(a.n * b.d - b.n * a.d, a.d * b.d) : flt(toNum(a) - toNum(b)); }
function mul(a, b) { return a.exact && b.exact ? rat(a.n * b.n, a.d * b.d) : flt(toNum(a) * toNum(b)); }
function div(a, b) {
  if (isZero(b)) throw mathError("Nolga bo'lish mumkin emas");
  return a.exact && b.exact ? rat(a.n * b.d, a.d * b.n) : flt(toNum(a) / toNum(b));
}
function neg(a) { return a.exact ? { exact: true, n: -a.n, d: a.d } : flt(-a.x); }

/* Butun k-darajali ildiz (floor) */
function iroot(a, k) {
  if (a < 2n) return a;
  const K = BigInt(k);
  let x = 1n << BigInt(Math.ceil(a.toString(2).length / k));
  for (;;) {
    const y = ((K - 1n) * x + a / x ** (K - 1n)) / K;
    if (y >= x) return x;
    x = y;
  }
}

/* Aniq ildiz: agar a/b to'liq k-darajali bo'lsa, aniq kasr qaytaradi */
function exactRoot(v, k) {
  if (!v.exact || k > 64) return null;
  const negative = v.n < 0n;
  if (negative && k % 2 === 0) return null;
  const rn = iroot(bAbs(v.n), k), rd = iroot(v.d, k);
  const K = BigInt(k);
  if (rn ** K === bAbs(v.n) && rd ** K === v.d) return rat(negative ? -rn : rn, rd);
  return null;
}

function pow(base, exp) {
  if (exp.exact && exp.d === 1n) {
    const e = exp.n;
    if (base.exact) {
      if (base.n === 0n && e < 0n) throw mathError("Nolga bo'lish mumkin emas");
      if (e === 0n) return rat(1n);
      const absE = bAbs(e);
      const size = Math.max(digitCount(base.n), digitCount(base.d)) * Number(absE);
      if (absE <= 100000n && size <= MAX_DIGITS) {
        const n = base.n ** absE, d = base.d ** absE;
        return e > 0n ? rat(n, d) : rat(d, n);
      }
    }
    return flt(Math.pow(toNum(base), Number(e)));
  }
  // Kasr daraja: x^(p/q) — aniq ildiz olishga urinib ko'ramiz
  if (exp.exact && base.exact) {
    const q = exp.d;
    if (base.n < 0n && q % 2n === 0n) throw mathError("Manfiy sondan juft darajali ildiz chiqarib bo'lmaydi");
    if (q <= 64n) {
      const root = exactRoot(base, Number(q));
      if (root) return pow(root, rat(exp.n));
    }
    if (base.n < 0n) { // toq ildiz: (-8)^(1/3) = -2
      const r = Math.pow(-toNum(base), toNum(exp));
      return flt(exp.n % 2n === 0n ? r : -r);
    }
  }
  const b = toNum(base), x = toNum(exp);
  if (b < 0) throw mathError("Manfiy sonning kasr darajasi aniqlanmagan");
  if (b === 0 && x < 0) throw mathError("Nolga bo'lish mumkin emas");
  return flt(Math.pow(b, x));
}

function factorial(v) {
  if (!isInt(v) || v.n < 0n) throw mathError("Faktorial faqat manfiy bo'lmagan butun son uchun");
  if (v.n > 170n) throw mathError("Faktorial uchun son 170 dan oshmasin");
  let r = 1n;
  for (let i = 2n; i <= v.n; i++) r *= i;
  return rat(r);
}

/* ---------- Matn ↔ kasr ---------- */

/* "12.5", "0,75", "1.2(36)" (davriy), ".5" → aniq kasr */
function parseDecimal(text) {
  const m = String(text).trim().replace(/\s+/g, "")
    .match(/^([+-]?)(\d*)(?:[.,](\d*)(?:\((\d+)\))?)?$/);
  if (!m || (m[2] === "" && !m[3] && !m[4])) return null;
  const sign = m[1] === "-" ? -1n : 1n;
  const intPart = m[2] || "0", fracPart = m[3] || "", rep = m[4] || "";
  let value;
  if (rep) {
    const all = BigInt(intPart + fracPart + rep), head = BigInt(intPart + fracPart);
    const den = BigInt("9".repeat(rep.length) + "0".repeat(fracPart.length));
    value = rat(all - head, den);
  } else {
    value = rat(BigInt(intPart + fracPart), 10n ** BigInt(fracPart.length));
  }
  return sign < 0n ? neg(value) : value;
}

/* Kasrni o'nli ko'rinishga: davriy qismni aniqlaydi */
function decimalExpansion(n, d, maxDigits = 120) {
  const negative = n < 0n;
  const a = bAbs(n);
  const intPart = a / d;
  let r = a % d;
  const digits = [];
  const seen = new Map();
  let repeatStart = -1;
  while (r !== 0n && digits.length < maxDigits) {
    if (seen.has(r)) { repeatStart = seen.get(r); break; }
    seen.set(r, digits.length);
    r *= 10n;
    digits.push(String(r / d));
    r %= d;
  }
  const truncated = r !== 0n && repeatStart < 0;
  return {
    negative: negative && n !== 0n,
    intPart,
    nonRepeat: repeatStart >= 0 ? digits.slice(0, repeatStart).join("") : digits.join(""),
    repeat: repeatStart >= 0 ? digits.slice(repeatStart).join("") : "",
    truncated
  };
}

/* ---------- Formatlash ---------- */

const numberFormat = new Intl.NumberFormat("uz-UZ", { useGrouping: true });
const DEC_SEP = (() => {
  try { return numberFormat.formatToParts(1.5).find(p => p.type === "decimal").value; }
  catch { return ","; }
})();
const SUPERSCRIPT = { "-": "⁻", "+": "", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

function groupInt(big) { return numberFormat.format(big); }

function formatFloat(x, maxFrac = 10) {
  if (!Number.isFinite(x)) return "Natija aniqlanmadi";
  if (Object.is(x, -0) || Math.abs(x) < 1e-300) x = 0;
  const ax = Math.abs(x);
  if (ax !== 0 && (ax >= 1e21 || ax < 1e-9)) {
    const [mant, exp] = x.toExponential(9).split("e");
    const m = new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 9 }).format(Number(mant));
    return `${m} × 10${exp.split("").map(c => SUPERSCRIPT[c]).join("")}`;
  }
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: maxFrac }).format(x);
}

function formatExact(n, d, maxFrac = 10) {
  const negative = n < 0n;
  let q = bAbs(n) / d;
  const r = bAbs(n) % d;
  const scale = 10n ** BigInt(maxFrac);
  let f = r * scale / d;
  if ((r * scale % d) * 2n >= d) f += 1n;
  if (f === scale) { q += 1n; f = 0n; }
  if ((q === 0n && f === 0n && n !== 0n) || digitCount(q) > 21) return formatFloat(ratToNumber(n, d), maxFrac);
  const fs = f === 0n ? "" : f.toString().padStart(maxFrac, "0").replace(/0+$/, "");
  return (negative ? "-" : "") + groupInt(q) + (fs ? DEC_SEP + fs : "");
}

function formatValue(v, maxFrac = 10) {
  return v.exact ? formatExact(v.n, v.d, maxFrac) : formatFloat(v.x, maxFrac);
}

/* Davriy ko'rinish: 1/3 → 0,(3) */
function formatRepeating(n, d) {
  const e = decimalExpansion(n, d, 60);
  let s = (e.negative ? "-" : "") + groupInt(e.intPart);
  if (e.nonRepeat || e.repeat) s += DEC_SEP + e.nonRepeat + (e.repeat ? `(${e.repeat})` : "") + (e.truncated ? "…" : "");
  return s;
}

/* 7/3 → { improper: "7/3", mixed: "2 1/3" } */
function fractionText(v) {
  if (!v.exact || v.d === 1n) return null;
  const sign = v.n < 0n ? "-" : "";
  const a = bAbs(v.n);
  const whole = a / v.d, rest = a % v.d;
  return {
    improper: `${v.n}/${v.d}`,
    mixed: whole > 0n ? `${sign}${whole} ${rest}/${v.d}` : null
  };
}

/* ---------- Ifoda tahlili (tokenizer + Pratt parser) ---------- */

const FUNCTION_NAMES = ["sqrt", "cbrt", "sin", "cos", "tan", "log", "ln", "abs"];
const KNOWN_NAMES = [...FUNCTION_NAMES, "pi", "e"].sort((a, b) => b.length - a.length);

function tokenize(source) {
  const s = String(source)
    .replace(/\*\*/g, "^")
    .replace(/[×·∙]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/[−–—]/g, "-");
  const tokens = [];
  let depth = 0;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.,]/.test(c)) {
      const rest = s.slice(i);
      const m = rest.match(/^(?:\d+[.,]\d*\(\d+\)|[.,]\d*\(\d+\))/) || rest.match(/^(?:\d+(?:[.,]\d*)?|[.,]\d+)/);
      if (!m) throw mathError("Son formatini tekshiring");
      tokens.push({ type: "num", v: parseDecimal(m[0]) });
      i += m[0].length;
      if (/^[.,]\d/.test(s.slice(i))) throw mathError("Sonda bir nechta kasr belgisi bor");
      continue;
    }
    if (c === "π") { tokens.push({ type: "name", v: "pi" }); i++; continue; }
    if (c === "√") { tokens.push({ type: "name", v: "sqrt" }); i++; continue; }
    if (c === "∛") { tokens.push({ type: "name", v: "cbrt" }); i++; continue; }
    if (c === "²" || c === "³") {
      tokens.push({ type: "op", v: "^" }, { type: "num", v: rat(c === "²" ? 2n : 3n) });
      i++; continue;
    }
    if (/[a-z]/i.test(c)) {
      let word = s.slice(i).match(/^[a-z]+/i)[0];
      i += word.length;
      word = word.toLowerCase();
      while (word) { // "2pi", "epi" kabi qo'shilib yozilganlarni ajratamiz
        const name = KNOWN_NAMES.find(k => word.startsWith(k));
        if (!name) throw mathError(`Noma'lum belgi: ${word}`);
        tokens.push({ type: "name", v: name });
        word = word.slice(name.length);
      }
      continue;
    }
    if ("+-*/^()%!".includes(c)) {
      if (c === "(") depth++;
      if (c === ")" && --depth < 0) throw mathError("Ortiqcha yopuvchi qavs bor");
      tokens.push({ type: "op", v: c });
      i++; continue;
    }
    throw mathError(`Noma'lum belgi: ${c}`);
  }
  while (depth-- > 0) tokens.push({ type: "op", v: ")" }); // yopilmagan qavslarni avtomatik yopamiz
  return tokens;
}

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  const isOp = (t, v) => t && t.type === "op" && t.v === v;
  const startsPrimary = t => t && (t.type === "num" || t.type === "name" || isOp(t, "("));

  function expr(minBp) {
    const t = take();
    if (!t) throw mathError("Ifoda tugallanmagan");
    let left;
    if (t.type === "num") left = { type: "num", v: t.v };
    else if (isOp(t, "+") || isOp(t, "-")) {
      const a = expr(25);
      left = t.v === "-" ? { type: "neg", a } : a;
    } else if (isOp(t, "(")) {
      if (isOp(peek(), ")")) throw mathError("Qavs ichi bo'sh");
      left = { type: "paren", a: expr(0) };
      if (!isOp(take(), ")")) throw mathError("Qavslarni tekshiring");
    } else if (t.type === "name") {
      if (FUNCTION_NAMES.includes(t.v)) {
        if (!peek()) throw mathError("Funksiya argumenti yo'q");
        left = { type: "fn", name: t.v, a: expr(35) };
      } else left = { type: "const", name: t.v };
    } else throw mathError("Ifodani tekshiring");

    for (;;) {
      const next = peek();
      if (!next) break;
      if (isOp(next, "%") || isOp(next, "!")) {
        if (40 < minBp) break;
        take();
        left = { type: next.v === "%" ? "pct" : "fact", a: left };
        continue;
      }
      let op, lbp, rbp;
      if (isOp(next, "+") || isOp(next, "-")) [op, lbp, rbp] = [next.v, 10, 11];
      else if (isOp(next, "*") || isOp(next, "/")) [op, lbp, rbp] = [next.v, 20, 21];
      else if (isOp(next, "^")) [op, lbp, rbp] = ["^", 30, 30];
      else if (startsPrimary(next)) [op, lbp, rbp] = ["*", 20, 21]; // 2π, 3(4+1)
      else break;
      if (lbp < minBp) break;
      if (next.type === "op" && next.v === op) take();
      left = { type: "bin", op, l: left, r: expr(rbp) };
    }
    return left;
  }

  if (!tokens.length) throw mathError("Ifoda bo'sh");
  const tree = expr(0);
  if (pos !== tokens.length) throw mathError("Ifodaning bir qismini tushunib bo'lmadi");
  return tree;
}

/* Gradusdagi maxsus burchaklar uchun aniq qiymatlar: sin 30° = 1/2 */
const SIN_EXACT = { 0: [0n, 1n], 30: [1n, 2n], 90: [1n, 1n], 150: [1n, 2n], 180: [0n, 1n], 210: [-1n, 2n], 270: [-1n, 1n], 330: [-1n, 2n] };
const TAN_EXACT = { 0: [0n, 1n], 45: [1n, 1n], 135: [-1n, 1n], 180: [0n, 1n], 225: [1n, 1n], 315: [-1n, 1n] };

function trig(name, v, degrees) {
  if (degrees && isInt(v)) {
    const deg = Number(((v.n % 360n) + 360n) % 360n);
    if (name === "sin" && SIN_EXACT[deg]) return rat(...SIN_EXACT[deg]);
    if (name === "cos" && SIN_EXACT[(deg + 90) % 360]) return rat(...SIN_EXACT[(deg + 90) % 360]);
    if (name === "tan") {
      if (deg === 90 || deg === 270) throw mathError("Bu burchak tangensi aniqlanmagan");
      if (TAN_EXACT[deg]) return rat(...TAN_EXACT[deg]);
    }
  }
  const x = toNum(v);
  const angle = degrees ? x * Math.PI / 180 : x;
  if (name === "sin") return flt(Math.sin(angle));
  if (name === "cos") return flt(Math.cos(angle));
  if (Math.abs(Math.cos(angle)) < 1e-12) throw mathError("Bu burchak tangensi aniqlanmagan");
  return flt(Math.tan(angle));
}

function powerOfTen(a) { return /^10*$/.test(a.toString()) ? a.toString().length - 1 : -1; }

function applyFunction(name, v, degrees) {
  if (name === "sin" || name === "cos" || name === "tan") return trig(name, v, degrees);
  if (name === "abs") return v.exact ? rat(bAbs(v.n), v.d) : flt(Math.abs(v.x));
  if (name === "sqrt") {
    if (toNum(v) < 0) throw mathError("Manfiy sonning haqiqiy kvadrat ildizi yo'q");
    return exactRoot(v, 2) || flt(Math.sqrt(toNum(v)));
  }
  if (name === "cbrt") return exactRoot(v, 3) || flt(Math.cbrt(toNum(v)));
  if (toNum(v) <= 0) throw mathError("Logarifm argumenti noldan katta bo'lishi kerak");
  if (name === "log" && v.exact) {
    if (v.d === 1n && powerOfTen(v.n) >= 0) return rat(BigInt(powerOfTen(v.n)));
    if (v.n === 1n && powerOfTen(v.d) >= 0) return rat(BigInt(-powerOfTen(v.d)));
  }
  if (name === "ln" && v.exact && v.n === 1n && v.d === 1n) return rat(0n);
  return flt(name === "log" ? Math.log10(toNum(v)) : Math.log(toNum(v)));
}

function evalNode(node, degrees) {
  switch (node.type) {
    case "num": return node.v;
    case "paren": return evalNode(node.a, degrees);
    case "neg": return neg(evalNode(node.a, degrees));
    case "const": return flt(node.name === "pi" ? Math.PI : Math.E);
    case "fn": return applyFunction(node.name, evalNode(node.a, degrees), degrees);
    case "fact": return factorial(evalNode(node.a, degrees));
    case "pct": return div(evalNode(node.a, degrees), rat(100n));
    case "bin": {
      const l = evalNode(node.l, degrees);
      // 200 + 10% = 220,  200 − 10% = 180 (oddiy kalkulyatorlardagi kabi)
      if ((node.op === "+" || node.op === "-") && node.r.type === "pct") {
        const part = mul(l, div(evalNode(node.r.a, degrees), rat(100n)));
        return node.op === "+" ? add(l, part) : sub(l, part);
      }
      const r = evalNode(node.r, degrees);
      if (node.op === "+") return add(l, r);
      if (node.op === "-") return sub(l, r);
      if (node.op === "*") return mul(l, r);
      if (node.op === "/") return div(l, r);
      return pow(l, r);
    }
  }
  throw mathError("Ifodani tekshiring");
}

function evaluate(source, degrees = true) {
  return evalNode(parse(tokenize(source)), degrees);
}

/* Natijani keyingi ifodada aniq qayta ishlatish uchun matn ko'rinishi */
function valueToExpression(v) {
  if (v.exact) {
    if (v.d === 1n) return v.n < 0n ? `(${v.n})` : String(v.n);
    return `(${v.n}/${v.d})`;
  }
  return null;
}

/* Tub ko'paytuvchilarga ajratish (kichik sonlar uchun): 60 → 2²·3·5 */
function primeFactors(a) {
  a = bAbs(a);
  if (a < 2n || a > 10n ** 12n) return null;
  let n = Number(a);
  const out = [];
  for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
    let k = 0;
    while (n % p === 0) { n /= p; k++; }
    if (k) out.push([p, k]);
  }
  if (n > 1) out.push([n, 1]);
  return out;
}

export const MathCore = {
  mathError, bAbs, bGcd, bLcm, rat, flt, toNum, isZero, isInt,
  add, sub, mul, div, neg, pow, parseDecimal, decimalExpansion,
  formatValue, formatExact, formatFloat, formatRepeating, fractionText,
  groupInt, evaluate, valueToExpression, primeFactors, DEC_SEP, SUPERSCRIPT, tokenize, parse
};

export default MathCore;
export {
  mathError, bAbs, bGcd, bLcm, rat, flt, toNum, isZero, isInt,
  add, sub, mul, div, neg, pow, parseDecimal, decimalExpansion,
  formatValue, formatExact, formatFloat, formatRepeating, fractionText,
  groupInt, evaluate, valueToExpression, primeFactors, DEC_SEP, SUPERSCRIPT, tokenize, parse
};
