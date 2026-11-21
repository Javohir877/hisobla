/* Tugma ovozlari — fayl yuklanmaydi, hammasi Web Audio'da shu yerning o'zida sintez qilinadi.
   Uchta to'plam: "deep" (chuqur, yumshoq "tok"), "bubble" (pufak), "wood" (yog'och marimba). */

export const SOUND_PACKS = [
  ["deep", "Chuqur", "Yumshoq, past «tok»"],
  ["bubble", "Pufak", "Suv tomchisidek"],
  ["wood", "Yog'och", "Musiqiy marimba"]
];

const config = { on: true, pack: "deep", volume: 0.7 };
let ctx = null, master = null, wet = null, noiseBuf = null;

export function configureSound({ sound, soundPack, soundVolume }) {
  config.on = sound !== false;
  config.pack = soundPack || "deep";
  config.volume = soundVolume ?? 0.7;
  if (master) master.gain.value = config.volume;
}

function setup() {
  if (ctx) return ctx.state === "suspended" ? (ctx.resume(), ctx) : ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC({ latencyHint: "interactive" });

  // Yakuniy zanjir: yumshatuvchi filtr → kompressor → karnay
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 6000;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master = ctx.createGain();
  master.gain.value = config.volume;
  master.connect(soften).connect(comp).connect(ctx.destination);

  // Kichik xona aks-sadosi — ovozga "chuqurlik" beradi
  const rate = ctx.sampleRate, len = Math.floor(rate * 0.7);
  const ir = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const reverb = ctx.createConvolver();
  reverb.buffer = ir;
  wet = ctx.createGain();
  wet.gain.value = 0.22;
  wet.connect(reverb).connect(master);

  // Shovqin (tugma "chertilishi" uchun)
  noiseBuf = ctx.createBuffer(1, Math.floor(rate * 0.2), rate);
  const n = noiseBuf.getChannelData(0);
  for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  return ctx;
}

const jitter = (x, amount = 0.04) => x * (1 + (Math.random() - 0.5) * amount);

function out(gainNode, reverbAmount) {
  gainNode.connect(master);
  if (reverbAmount) {
    const send = ctx.createGain();
    send.gain.value = reverbAmount;
    gainNode.connect(send).connect(wet);
  }
}

/* Ton: chastota sirpanishi va yumshoq so'nish bilan */
function tone(t, { freq, to = freq, type = "sine", gain = 0.5, attack = 0.004, decay = 0.12, glide = decay * 0.6, reverb = 1 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + glide);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(g);
  out(g, reverb);
  osc.start(t);
  osc.stop(t + decay + 0.05);
}

/* Qisqa shovqin — tugmaning "chertilishi" */
function click(t, { freq = 1200, q = 0.9, gain = 0.25, decay = 0.025, type = "bandpass", reverb = 0.5 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f).connect(g);
  out(g, reverb);
  src.start(t, Math.random() * 0.1);
  src.stop(t + decay + 0.02);
}

/* Pentatonik nota: raqamlar musiqiy, quloqqa yoqimli eshitiladi */
const PENTA = [0, 2, 4, 7, 9];
const note = (base, step) => base * Math.pow(2, (PENTA[step % 5] + 12 * Math.floor(step / 5)) / 12);

const PACKS = {
  deep: {
    digit: (t, d) => {
      const f = jitter(150 + d * 5);
      tone(t, { freq: f * 1.9, to: f, gain: 0.55, decay: 0.16, glide: 0.05 });
      tone(t, { freq: f * 3.2, to: f * 2, type: "triangle", gain: 0.06, decay: 0.05 });
      click(t, { freq: jitter(1100), gain: 0.16, type: "lowpass", decay: 0.02 });
    },
    op: t => {
      const f = jitter(105);
      tone(t, { freq: f * 2.1, to: f, gain: 0.6, decay: 0.22, glide: 0.07 });
      click(t, { freq: 700, gain: 0.14, type: "lowpass", decay: 0.03 });
    },
    fn: t => {
      tone(t, { freq: jitter(240), to: 170, gain: 0.32, decay: 0.1 });
      click(t, { freq: 2200, q: 0.6, gain: 0.12, decay: 0.035 });
    },
    tap: t => tone(t, { freq: jitter(320), to: 230, gain: 0.16, decay: 0.07, reverb: 0.4 }),
    equals: t => {
      PACKS.deep.op(t);
      [196, 293.66, 392].forEach((f, i) => tone(t + 0.05 + i * 0.045, { freq: f, gain: 0.22, attack: 0.012, decay: 0.9, reverb: 1.6 }));
    }
  },
  bubble: {
    digit: (t, d) => {
      const f = jitter(note(330, d));
      tone(t, { freq: f * 0.7, to: f * 1.6, gain: 0.45, attack: 0.002, decay: 0.09, glide: 0.06 });
    },
    op: t => tone(t, { freq: jitter(200), to: 480, gain: 0.5, attack: 0.002, decay: 0.13, glide: 0.09 }),
    fn: t => tone(t, { freq: jitter(520), to: 260, gain: 0.32, attack: 0.002, decay: 0.09, glide: 0.07 }),
    tap: t => tone(t, { freq: jitter(420), to: 700, gain: 0.14, attack: 0.002, decay: 0.06, reverb: 0.4 }),
    equals: t => {
      [0, 1, 2].forEach(i => tone(t + i * 0.07, { freq: 260 * (1 + i * 0.5), to: 520 * (1 + i * 0.5), gain: 0.38, attack: 0.002, decay: 0.12, glide: 0.08 }));
      tone(t + 0.22, { freq: 784, gain: 0.12, attack: 0.01, decay: 0.8, reverb: 1.6 });
    }
  },
  wood: {
    digit: (t, d) => {
      const f = note(262, d);
      tone(t, { freq: f, gain: 0.45, attack: 0.002, decay: 0.32 });
      tone(t, { freq: f * 3.93, type: "sine", gain: 0.08, attack: 0.001, decay: 0.05 });
      click(t, { freq: 3000, q: 2, gain: 0.05, decay: 0.012 });
    },
    op: t => {
      tone(t, { freq: 131, gain: 0.55, attack: 0.002, decay: 0.38 });
      tone(t, { freq: 131 * 3.93, gain: 0.07, attack: 0.001, decay: 0.05 });
    },
    fn: t => {
      tone(t, { freq: 880, gain: 0.18, attack: 0.001, decay: 0.08 });
      click(t, { freq: 2500, q: 2, gain: 0.08, decay: 0.015 });
    },
    tap: t => tone(t, { freq: 660, gain: 0.12, attack: 0.001, decay: 0.08, reverb: 0.4 }),
    equals: t => [262, 330, 392, 523].forEach((f, i) => {
      tone(t + i * 0.06, { freq: f, gain: 0.32, attack: 0.002, decay: 0.7, reverb: 1.4 });
      tone(t + i * 0.06, { freq: f * 3.93, gain: 0.04, attack: 0.001, decay: 0.05 });
    })
  }
};

/* Xato: past, yumshoq "ikki zarba" — hamma to'plamda bir xil */
function error(t) {
  tone(t, { freq: 150, to: 95, gain: 0.5, decay: 0.16 });
  tone(t + 0.12, { freq: 120, to: 75, gain: 0.45, decay: 0.22 });
}

/* Mashqda to'g'ri javob: iliq akkord */
function success(t) {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(t + i * 0.07, { freq: f, gain: 0.18, attack: 0.01, decay: 1, reverb: 1.8 }));
}

/* kind: "digit" | "op" | "fn" | "tap" | "equals" | "error" | "success" */
export function playSound(kind, digit = 5) {
  if (!config.on || config.volume <= 0) return;
  if (!setup()) return;
  try {
    const t = ctx.currentTime + 0.005;
    if (kind === "error") return error(t);
    if (kind === "success") return success(t);
    const pack = PACKS[config.pack] || PACKS.deep;
    (pack[kind] || pack.tap)(t, digit);
  } catch { /* ovozsiz davom etamiz */ }
}

/* Tugma elementidan qaysi ovoz chalinishini aniqlaymiz */
export function soundForElement(el) {
  const key = el.closest?.(".key, .symbol-key, .op-button, .frac-sign, .tab-btn, .tool-tile, .frac-tab, .primary-button, .chip-button, .mode-button, .theme-option, .practice-cta, .settings-row, .sound-pack");
  if (!key || key.disabled) return null;
  if (key.classList.contains("key")) {
    if (key.classList.contains("equals")) return null; // natija ovozi hisobdan keyin chalinadi
    if (key.classList.contains("operator")) return ["op"];
    if (key.classList.contains("function")) return ["fn"];
    const d = Number(key.textContent);
    return ["digit", Number.isNaN(d) ? 10 : d];
  }
  if (key.classList.contains("symbol-key") || key.classList.contains("op-button") || key.classList.contains("frac-sign")) return ["op"];
  if (key.classList.contains("sound-pack") || key.matches("label.settings-row")) return null;
  return ["tap"];
}

/* Klaviaturadagi tugma uchun */
export function soundForKey(k) {
  if (/^[0-9]$/.test(k)) return ["digit", Number(k)];
  if (/^[+\-*/^:]$/.test(k)) return ["op"];
  return ["fn"];
}
