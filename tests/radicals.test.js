import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateRadical, formatRadical, exactRadicalForm, approx, simplifyRoot } from "../src/lib/radicals.js";

const R = expr => formatRadical(evaluateRadical(expr).value);

test("ildizni soddalashtirish", () => {
  assert.equal(R("√72"), "6√2");
  assert.equal(R("√50"), "5√2");
  assert.equal(R("√49"), "7");
  assert.equal(R("∛54"), "3∛2");
  assert.equal(R("∛-8"), "-2");
  assert.equal(R("√(1/2)"), "√2/2");
  assert.deepEqual(simplifyRoot(2n, 72n).k, 6n);
});

test("o'xshash ildizlarni qo'shish va ayirish", () => {
  assert.equal(R("√8 + √18"), "5√2");
  assert.equal(R("3√12 − √27"), "3√3");
  assert.equal(R("√2 + √3"), "√2 + √3");
  assert.equal(R("√50 - √32 - √2"), "0");
  assert.equal(R("2√5 + 3 - √20 + 1"), "4");
});

test("ko'paytirish va darajaga ko'tarish", () => {
  assert.equal(R("√6 · √3"), "3√2");
  assert.equal(R("√2 * √8"), "4");
  assert.equal(R("(√5 + 1)^2"), "6 + 2√5");
  assert.equal(R("(√3)^2"), "3");
  assert.equal(R("(√3 - √2)(√3 + √2)"), "1");
  assert.equal(R("√2 * ∛2"), "⁶√32");
});

test("maxrajni ildizdan qutqarish", () => {
  assert.equal(R("2/√3"), "2√3/3");
  assert.equal(R("1/(1+√2)"), "√2 − 1");
  assert.equal(R("6/(√5 - √2)"), "2√2 + 2√5");
  assert.equal(R("1/∛2"), "∛4/2");
});

test("xatolar tushunarli", () => {
  assert.throws(() => R("√(-4)"), /Manfiy/);
  assert.throws(() => R("1/(√2-√2)"), /Nolga/);
  assert.throws(() => R("√(2+√3)"), /Ichma-ich/);
  assert.throws(() => R("sin(30)"), /bu bo'limda/);
});

test("kalkulyator uchun aniq ko'rinish va taqribiy qiymat", () => {
  assert.equal(exactRadicalForm("√8+√18"), "5√2");
  assert.equal(exactRadicalForm("1/2+1/3"), null);
  assert.ok(Math.abs(approx(evaluateRadical("5√2").value) - 7.0710678) < 1e-6);
});
