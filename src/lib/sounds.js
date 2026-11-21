/* Mexanik klaviatura ovozlari — fayl yuklanmaydi, hammasi Web Audio'da sintez qilinadi.
   Har bir bosish ikki qismdan iborat: tugma pastga urilgandagi "tok" va qaytgandagi yengil "chiq".
   Har bir tugmaning o'z "xarakteri" bor (biroz boshqacha tovush), xuddi haqiqiy klaviaturadek. */

export const SOUND_PACKS = [
  ["thock", "Thock", "Chuqur, moylangan switch"],
  ["clicky", "Klik", "Ko'k switch — chiq-chiq"],
  ["creamy", "Krem", "Yumshoq, bo'g'iq"],
  ["typewriter", "Mashinka", "Eski yozuv mashinkasi"]
];

const config = { on: true, pack: "thock", volume: 0.7 };
let ctx = null, master = null, wet = null, noiseBuf = null;

export function configureSound({ sound, soundPack, soundVolume }) {
  config.on = sound !== false;
  config.pack = SOUND_PACKS.some(([k]) => k === soundPack) ? soundPack : "thock";
  config.volume = soundVolume ?? 0.7;
  if (master) master.gain.value = config.volume * 1.4;
}

function setup() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC({ latencyHint: "interactive" });

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 3;
  master = ctx.createGain();
  master.gain.value = config.volume * 1.4;
  master.connect(comp).connect(ctx.destination);

  // Kichik xona (stol ustidagi klaviatura) aks-sadosi
  const rate = ctx.sampleRate, len = Math.floor(rate * 0.25);
  const ir = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  }
  const reverb = ctx.createConvolver();
  reverb.buffer = ir;
  wet = ctx.createGain();
  wet.gain.value = 0.12;
  wet.connect(reverb).connect(master);

  noiseBuf = ctx.createBuffer(1, Math.floor(rate * 0.3), rate);
  const n = noiseBuf.getChannelData(0);
  for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  return ctx;
}

function out(node, reverb = 1) {
  node.connect(master);
  if (reverb) {
    const send = ctx.createGain();
    send.gain.value = reverb;
    node.connect(send).connect(wet);
  }
}

/* Qisqa ton (tugma korpusining rezonansi) */
function tone(t, { freq, to = freq, type = "sine", gain = 0.4, attack = 0.001, decay = 0.05, reverb = 1 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + decay * 0.7);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(g);
  out(g, reverb);
  osc.start(t);
  osc.stop(t + decay + 0.03);
}

/* Filtrlangan shovqin — plastmassa urilishi, "chiqillash" */
function noise(t, { freq = 1000, q = 1, type = "bandpass", gain = 0.3, attack = 0.0008, decay = 0.03, reverb = 1 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f).connect(g);
  out(g, reverb);
  src.start(t, Math.random() * 0.2);
  src.stop(t + decay + 0.02);
}

/* p: tugmaning xarakteri (0.9–1.1), big: katta tugma ("=" — stabilizatorli), v: balandlik */
const SWITCHES = {
  thock: {
    down(t, p, big, v) {
      const b = big ? 0.72 : 1;
      tone(t, { freq: 210 * p * b, to: 120 * p * b, gain: 0.55 * v, decay: big ? 0.07 : 0.05 });
      noise(t, { freq: 850 * p * b, type: "lowpass", q: 0.7, gain: 0.55 * v, decay: 0.035 });
      noise(t, { freq: 420 * p * b, q: 5, gain: 0.4 * v, decay: big ? 0.08 : 0.055 });
      noise(t + 0.002, { freq: 2600 * p, q: 1.2, gain: 0.07 * v, decay: 0.012 });
      if (big) noise(t + 0.009, { freq: 1900, q: 3, gain: 0.1 * v, decay: 0.03 }); // stabilizator
    },
    up(t, p, big, v) {
      noise(t, { freq: 1500 * p, q: 1.5, gain: 0.13 * v, decay: 0.02 });
      tone(t, { freq: 320 * p, to: 260 * p, gain: 0.08 * v, decay: 0.025 });
      if (big) noise(t + 0.006, { freq: 2200, q: 3, gain: 0.06 * v, decay: 0.02 });
    }
  },
  clicky: {
    down(t, p, big, v) {
      // klik mexanizmi: ikki o'tkir "chiq", keyin pastga urilish
      noise(t, { freq: 4600 * p, type: "highpass", q: 0.8, gain: 0.32 * v, decay: 0.008, reverb: 0.6 });
      noise(t + 0.011, { freq: 3800 * p, q: 2, gain: 0.28 * v, decay: 0.01, reverb: 0.6 });
      noise(t + 0.02, { freq: 1700 * p * (big ? 0.8 : 1), q: 2, gain: 0.3 * v, decay: 0.03 });
      tone(t + 0.02, { freq: 340 * p, to: 210 * p, gain: 0.25 * v, decay: 0.035 });
      if (big) noise(t + 0.03, { freq: 2100, q: 3, gain: 0.1 * v, decay: 0.03 });
    },
    up(t, p, big, v) {
      noise(t, { freq: 4200 * p, q: 2, gain: 0.2 * v, decay: 0.009, reverb: 0.6 });
      noise(t + 0.004, { freq: 2000 * p, q: 1.5, gain: 0.12 * v, decay: 0.018 });
    }
  },
  creamy: {
    down(t, p, big, v) {
      const b = big ? 0.75 : 1;
      tone(t, { freq: 150 * p * b, to: 92 * p * b, gain: 0.5 * v, attack: 0.003, decay: 0.065 });
      noise(t, { freq: 560 * p * b, type: "lowpass", q: 0.6, gain: 0.5 * v, attack: 0.002, decay: 0.05 });
      noise(t, { freq: 300 * p * b, q: 3, gain: 0.32 * v, attack: 0.002, decay: 0.07 });
    },
    up(t, p, big, v) {
      noise(t, { freq: 1100 * p, type: "lowpass", gain: 0.08 * v, decay: 0.018 });
    }
  },
  typewriter: {
    down(t, p, big, v) {
      // harf bolg'achasi qog'ozga urilishi: metall jiringlashi + gumburlash
      noise(t, { freq: 2600 * p, q: 9, gain: 0.35 * v, decay: 0.07 });
      noise(t, { freq: 5200 * p, q: 6, gain: 0.12 * v, decay: 0.03 });
      noise(t, { freq: 700, type: "lowpass", gain: 0.45 * v, decay: 0.04 });
      tone(t, { freq: 180 * p, to: 120, gain: 0.3 * v, decay: 0.05 });
      if (big) { // karetka qaytishi
        noise(t + 0.03, { freq: 1300, q: 1, gain: 0.18 * v, attack: 0.04, decay: 0.32 });
        tone(t + 0.06, { freq: 2093, gain: 0.16 * v, attack: 0.002, decay: 1.2, reverb: 1.5 });
        tone(t + 0.06, { freq: 4186 * 1.003, gain: 0.05 * v, attack: 0.002, decay: 0.7 });
      }
    },
    up(t, p, big, v) {
      noise(t, { freq: 3400 * p, q: 4, gain: 0.08 * v, decay: 0.02 });
    }
  }
};

/* Xato: past "tuk-tuk" */
function error(t) {
  tone(t, { freq: 150, to: 90, gain: 0.45, decay: 0.09 });
  noise(t, { freq: 500, type: "lowpass", gain: 0.3, decay: 0.05 });
  tone(t + 0.11, { freq: 130, to: 75, gain: 0.45, decay: 0.12 });
  noise(t + 0.11, { freq: 450, type: "lowpass", gain: 0.3, decay: 0.06 });
}

/* Mashqda to'g'ri javob: yengil iliq ohang */
function success(t) {
  [523.25, 659.25, 783.99].forEach((f, i) => tone(t + i * 0.07, { freq: f, gain: 0.12, attack: 0.01, decay: 0.9, reverb: 1.6 }));
}

/* kind: "down" | "up" | "error" | "success"; key: { pitch, big, soft } */
export function playSound(kind, key = {}) {
  if (!config.on || config.volume <= 0 || !setup()) return;
  try {
    const t = ctx.currentTime + 0.003;
    if (kind === "error") return error(t);
    if (kind === "success") return success(t);
    const sw = SWITCHES[config.pack] || SWITCHES.thock;
    const p = (key.pitch ?? 1) * (1 + (Math.random() - 0.5) * 0.03);
    sw[kind]?.(t, p, !!key.big, key.soft ? 0.4 : 1);
  } catch { /* ovozsiz davom etamiz */ }
}

/* Har bir tugmaning doimiy xarakteri — matnidan hisoblanadi */
function pitchOf(text) {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 1000;
  return 0.9 + (h / 1000) * 0.2;
}
export const keyFor = (text, big = false) => ({ pitch: pitchOf(text), big });

const TARGETS = ".key, .symbol-key, .op-button, .frac-sign, .tab-btn, .tool-tile, .frac-tab, .primary-button, .secondary-button, .chip-button, .mode-button, .theme-option, .practice-cta, .nav-item, .settings-row, .sound-pack";

/* Bosilgan elementdan qaysi tugma ekanini aniqlaymiz */
export function soundForElement(el) {
  const key = el.closest?.(TARGETS);
  if (!key || key.disabled || key.matches("label.settings-row, .sound-pack")) return null;
  const text = key.textContent.trim();
  if (key.matches(".key, .symbol-key, .op-button, .frac-sign")) return keyFor(text, key.matches(".equals, .primary-button"));
  return { ...keyFor(text, key.matches(".primary-button")), soft: !key.matches(".primary-button") };
}

/* Fizik klaviatura tugmasi uchun */
export const soundForKey = k => keyFor(k === "Enter" ? "=" : k, k === "Enter" || k === "=");
