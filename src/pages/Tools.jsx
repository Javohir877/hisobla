import { useMemo, useState } from "react";
import M from "../lib/math-core.js";

/* "12 500,5" yoki "12500.5" → 12500.5; noto'g'ri bo'lsa NaN */
export function parseNum(text) {
  const clean = String(text).trim().replace(/[\s  ]/g, "").replace(",", ".");
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(clean) ? Number(clean) : NaN;
}
const fmt = (x, digits = 10) => M.formatFloat(Number(x.toPrecision(14)), digits);

function Card({ title, label, intro, children }) {
  return (
    <section className="card tool-card">
      <div className="card-heading"><h2>{title}</h2><span className="subtle-label">{label}</span></div>
      <p className="tool-intro">{intro}</p>
      {children}
    </section>
  );
}

function NumberField({ id, label, unit, value, onChange, placeholder, numeric }) {
  const input = (
    <input id={id} type="text" inputMode={numeric ? "numeric" : "decimal"} autoComplete="off"
      placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />
  );
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {unit ? <div className="input-with-unit">{input}<span className="input-unit">{unit}</span></div> : input}
    </div>
  );
}

/* =================== KONVERTOR =================== */
const UNITS = {
  length: { label: "Uzunlik", units: {
    "Millimetr (mm)": 0.001, "Santimetr (sm)": 0.01, "Detsimetr (dm)": 0.1, "Metr (m)": 1, "Kilometr (km)": 1000,
    "Dyuym (in)": 0.0254, "Fut (ft)": 0.3048, "Yard (yd)": 0.9144, "Mil (mi)": 1609.344, "Dengiz mili": 1852 } },
  mass: { label: "Og'irlik", units: {
    "Milligramm (mg)": 1e-6, "Gramm (g)": 0.001, "Kilogramm (kg)": 1, "Sentner (s)": 100, "Tonna (t)": 1000,
    "Unsiya (oz)": 0.028349523125, "Funt (lb)": 0.45359237 } },
  temperature: { label: "Harorat", units: { "Selsiy (°C)": "c", "Farengeyt (°F)": "f", "Kelvin (K)": "k" } },
  area: { label: "Maydon", units: {
    "Kv. millimetr (mm²)": 1e-6, "Kv. santimetr (sm²)": 1e-4, "Kv. metr (m²)": 1, "Sotix (ar)": 100,
    "Gektar (ga)": 1e4, "Kv. kilometr (km²)": 1e6, "Akr (ac)": 4046.8564224 } },
  volume: { label: "Hajm", units: {
    "Millilitr (ml)": 0.001, "Litr (l)": 1, "Kub metr (m³)": 1000, "Choy qoshiq (US)": 0.00492892159375, "Gallon (US)": 3.785411784 } },
  time: { label: "Vaqt", units: {
    "Millisekund (ms)": 0.001, "Sekund (s)": 1, "Daqiqa (min)": 60, "Soat (h)": 3600, "Kun": 86400, "Hafta": 604800, "Yil (365 kun)": 31536000 } },
  speed: { label: "Tezlik", units: { "m/s": 1, "km/soat": 1 / 3.6, "Mil/soat (mph)": 0.44704, "Tugun (kn)": 1852 / 3600 } },
  data: { label: "Ma'lumot hajmi", units: {
    "Bit (b)": 0.125, "Bayt (B)": 1, "Kilobayt (KB)": 1e3, "Megabayt (MB)": 1e6, "Gigabayt (GB)": 1e9,
    "Terabayt (TB)": 1e12, "Kibibayt (KiB)": 1024, "Mebibayt (MiB)": 1048576, "Gibibayt (GiB)": 1073741824 } }
};

const defaultUnits = category => {
  const keys = Object.keys(UNITS[category].units);
  return category === "length" ? ["Metr (m)", "Santimetr (sm)"] : [keys[0], keys[Math.min(2, keys.length - 1)]];
};
const toCelsius = (v, u) => (u === "c" ? v : u === "f" ? (v - 32) * 5 / 9 : v - 273.15);
const fromCelsius = (v, u) => (u === "c" ? v : u === "f" ? v * 9 / 5 + 32 : v + 273.15);

function convert(category, raw, from, to) {
  if (!raw.trim()) return { title: "Qiymat kiriting" };
  const value = parseNum(raw);
  if (!Number.isFinite(value)) return { title: "Son noto'g'ri", note: "Masalan: 12,5 yoki 1500" };
  const units = UNITS[category].units;
  let result;
  if (category === "temperature") {
    const c = toCelsius(value, units[from]);
    if (c < -273.15 - 1e-10) return { title: "Noto'g'ri harorat", note: "Harorat mutlaq noldan (−273,15 °C) past bo'lishi mumkin emas." };
    result = fromCelsius(c, units[to]);
  } else {
    result = value * units[from] / units[to];
  }
  if (!Number.isFinite(result)) return { title: "Qiymat juda katta" };
  const out = fmt(Number(result.toPrecision(12)), 8);
  return { output: out, title: `${out} ${to}`, note: `${fmt(value, 8)} ${from} = ${out} ${to}` };
}

export function Converter() {
  const [category, setCategory] = useState("length");
  const [[from, to], setPair] = useState(defaultUnits("length"));
  const [value, setValue] = useState("1");
  const result = convert(category, value, from, to);
  const unitOptions = Object.keys(UNITS[category].units).map(u => <option key={u} value={u}>{u}</option>);

  return (
    <Card title="O'lchov birliklari konvertori" label={`${Object.keys(UNITS).length} ta yo'nalish`}
      intro="Miqdorni kiriting va kerakli birliklarni tanlang — natija darhol hisoblanadi.">
      <div className="field" style={{ maxWidth: 360, marginBottom: 19 }}>
        <label htmlFor="convert-category">O'lchov turi</label>
        <select id="convert-category" value={category}
          onChange={event => { setCategory(event.target.value); setPair(defaultUnits(event.target.value)); }}>
          {Object.entries(UNITS).map(([key, u]) => <option key={key} value={key}>{u.label}</option>)}
        </select>
      </div>
      <div className="converter-fields">
        <div className="convert-side">
          <label htmlFor="convert-value">Qiymat</label>
          <input id="convert-value" type="text" inputMode="decimal" autoComplete="off" value={value} onChange={event => setValue(event.target.value)} />
          <select aria-label="Boshlang'ich birlik" value={from} onChange={event => setPair([event.target.value, to])}>{unitOptions}</select>
        </div>
        <button type="button" className="swap-button" aria-label="Birliklarni almashtirish" title="Almashtirish" onClick={() => setPair([to, from])}>⇄</button>
        <div className="convert-side">
          <label htmlFor="convert-result">Natija</label>
          <input id="convert-result" type="text" readOnly value={result.output ?? ""} />
          <select aria-label="Natija birligi" value={to} onChange={event => setPair([from, event.target.value])}>{unitOptions}</select>
        </div>
      </div>
      <div className="result-panel converter-result" aria-live="polite">
        <div><div className="result-label">O'TKAZILGAN QIYMAT</div><div className="result-value">{result.title}</div></div>
        <div className="result-note">{result.note}</div>
      </div>
    </Card>
  );
}

/* =================== FOIZ =================== */
const PERCENT_MODES = {
  of: { label: "Sonning foizini topish", a: ["Son", "Masalan, 250"], b: ["Foiz (%)", "Masalan, 15"] },
  what: { label: "A son B ning necha foizi?", a: ["A son (qism)", "Masalan, 30"], b: ["B son (butun)", "Masalan, 120"] },
  change: { label: "Foiz o'zgarishini topish", a: ["Boshlang'ich qiymat", "Masalan, 100"], b: ["Yangi qiymat", "Masalan, 125"] },
  add: { label: "Songa foiz qo'shish / ayirish", a: ["Son", "Masalan, 80 000"], b: ["Foiz (%) — ayirish uchun minus", "Masalan, 12 yoki -12"] }
};

function percentResult(mode, rawA, rawB) {
  if (!rawA.trim() || !rawB.trim()) return <div className="result-note">Ikkala qiymatni ham kiriting.</div>;
  const a = parseNum(rawA), b = parseNum(rawB);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return <div className="result-note">Sonlarni to'g'ri kiriting, masalan 12,5.</div>;
  const show = (label, value, note, tone = "") => <>
    <div className="result-label">{label}</div>
    <div className={`result-value ${tone}`}>{value}</div>
    <div className="result-note">{note}</div>
  </>;
  if (mode === "of") return show(`${fmt(a)} NING ${fmt(b)}%`, fmt(a * b / 100), `${fmt(a)} × ${fmt(b)} : 100 = ${fmt(a * b / 100)}`);
  if (mode === "what") {
    if (b === 0) return <div className="result-note">B son 0 bo'lishi mumkin emas.</div>;
    return show(`${fmt(a)} SONI ${fmt(b)} NING`, `${fmt(a / b * 100)}%`, `${fmt(a)} : ${fmt(b)} × 100 = ${fmt(a / b * 100)}%`);
  }
  if (mode === "change") {
    if (a === 0) return show("HISOBLAB BO'LMAYDI", "", "Boshlang'ich qiymat 0 bo'lsa, foiz o'zgarishini aniqlab bo'lmaydi.");
    const change = (b - a) / Math.abs(a) * 100;
    const sign = change > 0 ? "+" : "";
    return show("FOIZ O'ZGARISHI", `${sign}${fmt(change)}%`,
      `${fmt(a)} dan ${fmt(b)} ga ${change < 0 ? "kamayish" : change > 0 ? "o'sish" : "o'zgarish yo'q"} (farq: ${sign}${fmt(b - a)}).`,
      change < 0 ? "negative" : change > 0 ? "positive" : "");
  }
  const part = a * b / 100, op = b >= 0 ? "+" : "−";
  return show(`${fmt(a)} ${op} ${fmt(Math.abs(b))}%`, fmt(a + part), `${fmt(Math.abs(b))}% = ${fmt(Math.abs(part))}; ${fmt(a)} ${op} ${fmt(Math.abs(part))} = ${fmt(a + part)}`);
}

export function Percent() {
  const [mode, setMode] = useState("of");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const m = PERCENT_MODES[mode];
  return (
    <Card title="Foiz kalkulyatori" label="Tez va tushunarli" intro="Hisoblash turini tanlang va qiymatlarni kiriting — natija darhol chiqadi.">
      <div className="form-grid three">
        <div className="field">
          <label htmlFor="percent-mode">Hisoblash turi</label>
          <select id="percent-mode" value={mode} onChange={event => setMode(event.target.value)}>
            {Object.entries(PERCENT_MODES).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
          </select>
        </div>
        <NumberField id="percent-a" label={m.a[0]} placeholder={m.a[1]} value={a} onChange={setA} />
        <NumberField id="percent-b" label={m.b[0]} placeholder={m.b[1]} value={b} onChange={setB} />
      </div>
      <div className="result-panel" aria-live="polite">{percentResult(mode, a, b)}</div>
    </Card>
  );
}

/* =================== BMI =================== */
export function Bmi() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const w = parseNum(weight), h = parseNum(height);
  const valid = w > 0 && w <= 500 && h >= 50 && h <= 300;
  const bmi = valid ? w / ((h / 100) ** 2) : 0;
  const category = bmi < 18.5 ? "Me'yordan past vazn" : bmi < 25 ? "Me'yoriy vazn" : bmi < 30 ? "Ortiqcha vazn" : "Semizlik";
  // Shkala 10…40: chegaralar 18,5 → 28,3%, 25 → 50%, 30 → 66,7%
  const marker = Math.max(1, Math.min(99, (bmi - 10) / 30 * 100));
  const m = h / 100;
  return (
    <Card title="Tana massasi indeksi (BMI)" label="Kattalar uchun" intro="Vazn (kg) va bo'y (sm) ni kiriting. BMI — vaznning bo'y (metrda) kvadratiga nisbati.">
      <div className="form-grid">
        <NumberField id="bmi-weight" label="Vazn" unit="kg" placeholder="Masalan, 68" value={weight} onChange={setWeight} />
        <NumberField id="bmi-height" label="Bo'y" unit="sm" placeholder="Masalan, 172" value={height} onChange={setHeight} />
      </div>
      <div className="result-panel" aria-live="polite">
        {!valid ? <div className="result-note">Vaznni 1–500 kg, bo'yni 50–300 sm oralig'ida kiriting.</div> : <>
          <div className="result-label">SIZNING BMI KO'RSATKICHINGIZ</div>
          <div className="result-value">{fmt(bmi, 1)} <span className="result-tag">{category}</span></div>
          <div className="bmi-meter"><span className="bmi-marker" style={{ left: `${marker}%` }} /></div>
          <div className="bmi-legend">
            <span style={{ width: "28.3%" }}>Past</span><span style={{ width: "21.7%" }}>Me'yoriy</span>
            <span style={{ width: "16.7%" }}>Ortiqcha</span><span style={{ width: "33.3%" }}>Semizlik</span>
          </div>
          <div className="result-note">Bo'yingiz uchun me'yoriy vazn: <b>{fmt(18.5 * m * m, 1)} – {fmt(24.9 * m * m, 1)} kg</b>. BMI taxminiy ko'rsatkich bo'lib, tashxis hisoblanmaydi.</div>
        </>}
      </div>
    </Card>
  );
}

/* =================== KREDIT =================== */
function schedule(amount, annualRate, months, method) {
  const r = annualRate / 1200;
  const annuity = r === 0 ? amount / months : amount * r / (1 - (1 + r) ** -months);
  const rows = [];
  let balance = amount, total = 0;
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const principal = method === "annuity" ? (m === months ? balance : annuity - interest) : amount / months;
    balance = Math.max(0, balance - principal);
    total += principal + interest;
    rows.push([m, principal + interest, principal, interest, balance]);
  }
  return { annuity, rows, total };
}

export function Loan() {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [months, setMonths] = useState("");
  const [method, setMethod] = useState("annuity");
  const A = parseNum(amount), R = parseNum(rate), N = parseNum(months);
  const valid = A > 0 && R >= 0 && R <= 1000 && Number.isInteger(N) && N >= 1 && N <= 600;
  const plan = useMemo(() => (valid ? schedule(A, R, N, method) : null), [valid, A, R, N, method]);
  const money = x => M.formatFloat(Math.round(x), 0);

  return (
    <Card title="Kredit to'lovini hisoblash" label="Annuitet / differensial"
      intro="Kredit summasi, yillik foiz stavkasi va muddatni kiriting. Summani bo'shliq bilan yozish mumkin: 50 000 000.">
      <div className="form-grid four">
        <NumberField id="loan-amount" label="Kredit summasi" unit="so'm" placeholder="50 000 000" value={amount} onChange={setAmount} />
        <NumberField id="loan-rate" label="Yillik foiz stavkasi" unit="%" placeholder="24" value={rate} onChange={setRate} />
        <NumberField id="loan-months" label="Muddat" unit="oy" placeholder="36" value={months} onChange={setMonths} numeric />
        <div className="field">
          <label htmlFor="loan-method">To'lov usuli</label>
          <select id="loan-method" value={method} onChange={event => setMethod(event.target.value)}>
            <option value="annuity">Annuitet (teng to'lov)</option>
            <option value="diff">Differensial (kamayuvchi)</option>
          </select>
        </div>
      </div>
      <div className="result-panel" aria-live="polite">
        {!plan ? <div className="result-note">Summani, foiz stavkasini (0–1000%) va muddatni (1–600 oy, butun son) kiriting.</div> : <>
          {method === "annuity"
            ? <><div className="result-label">OYLIK TO'LOV</div><div className="result-value">{money(plan.annuity)} so'm</div></>
            : <><div className="result-label">BIRINCHI / OXIRGI OY TO'LOVI</div><div className="result-value">{money(plan.rows[0][1])} → {money(plan.rows.at(-1)[1])} so'm</div></>}
          <div className="loan-summary">
            <div className="loan-stat"><span>Jami to'lov</span><strong>{money(plan.total)} so'm</strong></div>
            <div className="loan-stat"><span>Foiz xarajati</span><strong>{money(plan.total - A)} so'm</strong></div>
          </div>
          <details className="loan-schedule">
            <summary>To'lov jadvali ({N} oy)</summary>
            <div className="table-wrap"><table>
              <thead><tr><th>Oy</th><th>To'lov</th><th>Asosiy qarz</th><th>Foiz</th><th>Qoldiq</th></tr></thead>
              <tbody>{plan.rows.map(row => <tr key={row[0]}><td>{row[0]}</td>{row.slice(1).map((v, i) => <td key={i}>{money(v)}</td>)}</tr>)}</tbody>
            </table></div>
          </details>
          <div className="result-note">Bank komissiyasi, sug'urta va boshqa xarajatlar kiritilmagan.</div>
        </>}
      </div>
    </Card>
  );
}
