import { test } from "node:test";
import assert from "node:assert/strict";
import M from "../src/lib/math-core.js";

// Natijani kasr ko'rinishida tekshirish: "5/6" yoki butun son "3"
const frac = expr => {
  const v = M.evaluate(expr, true);
  assert.ok(v.exact, `${expr} aniq kasr bo'lishi kerak`);
  return v.d === 1n ? String(v.n) : `${v.n}/${v.d}`;
};

test("kasrlar aniq hisoblanadi", () => {
  assert.equal(frac("1/2+1/3"), "5/6");
  assert.equal(frac("1/3+1/6"), "1/2");
  assert.equal(frac("1/3*3"), "1");
  assert.equal(frac("0.1+0.2"), "3/10");
  assert.equal(frac("2+1/3"), "7/3");
  assert.equal(frac("3:4"), "3/4");
  assert.equal(frac("12/(-4)"), "-3");
});

test("davriy kasrlar", () => {
  assert.equal(frac("0.(3)+0.(6)"), "1");
  assert.equal(frac("1.2(36)"), "68/55");
  assert.equal(M.formatRepeating(1n, 7n).replace(",", "."), "0.(142857)");
  assert.equal(M.formatRepeating(23n, 12n).replace(",", "."), "1.91(6)");
});

test("foizlar oddiy kalkulyatordagidek", () => {
  assert.equal(frac("200+10%"), "220");
  assert.equal(frac("200-10%"), "180");
  assert.equal(frac("50*10%"), "5");
});

test("darajalar, ildizlar va funksiyalar", () => {
  assert.equal(frac("2^10"), "1024");
  assert.equal(frac("2^-2"), "1/4");
  assert.equal(frac("-2^2"), "-4");
  assert.equal(frac("2^3^2"), "512");
  assert.equal(frac("(-8)^(1/3)"), "-2");
  assert.equal(frac("sqrt(16/9)"), "4/3");
  assert.equal(frac("sin(30)"), "1/2");
  assert.equal(frac("log(1000)"), "3");
  assert.equal(frac("5!"), "120");
  assert.equal(frac("2(3+4)"), "14");
});

test("xatolar tushunarli", () => {
  assert.throws(() => M.evaluate("1/0"), /Nolga/);
  assert.throws(() => M.evaluate("1+"), /tugallanmagan/);
  assert.throws(() => M.evaluate(")("), /qavs/);
  assert.throws(() => M.evaluate("abc"), /Noma'lum/);
});

test("yopilmagan qavs avtomatik yopiladi", () => {
  assert.equal(frac("(1+2"), "3");
});
