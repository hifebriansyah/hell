// Procedural Web Audio sound effects. Nothing is loaded from files.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = (() => {
  try { return localStorage.getItem('hell.muted') === '1'; } catch { return false; }
})();

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('hell.muted', m ? '1' : '0'); } catch { /* private mode */ }
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.05);
}

// throttle per sound so physics pile-ups don't machine-gun
const last: Record<string, number> = {};
function ok(key: string, gap = 0.05) {
  if (!ctx || muted) return false;
  const t = ctx.currentTime;
  if (last[key] && t - last[key] < gap) return false;
  last[key] = t;
  return true;
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol = 0.3, delay = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, filter: BiquadFilterType, f0: number, f1 = f0, q = 1, delay = 0) {
  if (!ctx || !master || !noiseBuf) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const bq = ctx.createBiquadFilter();
  bq.type = filter;
  bq.Q.value = q;
  bq.frequency.setValueAtTime(f0, t);
  bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bq).connect(g).connect(master);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export const sfx = {
  boing(pitch = 1) { if (ok('boing', 0.07)) tone('sine', 220 * pitch, 520 * pitch, 0.22, 0.28); },
  thud(v = 1) { if (ok('thud', 0.06)) { tone('sine', 140, 50, 0.18, 0.35 * v); noise(0.08, 0.12 * v, 'lowpass', 600); } },
  pop() { if (ok('pop', 0.03)) { tone('sine', rnd(500, 700), 1400, 0.07, 0.25); } },
  bubble() { if (ok('bubble', 0.04)) tone('sine', rnd(300, 600), rnd(900, 1300), 0.09, 0.08); },
  splash() { if (ok('splash', 0.12)) { noise(0.35, 0.3, 'bandpass', 1800, 500, 0.8); tone('sine', 300, 120, 0.2, 0.15); } },
  cork() {
    if (!ok('cork', 0.06)) return;
    tone('square', 900, 180, 0.08, 0.12);
    noise(0.12, 0.35, 'highpass', 2500, 1200);
    tone('sine', 1200, 2600, 0.15, 0.14, 0.04);
  },
  clang() {
    if (!ok('clang', 0.1)) return;
    [1, 2.76, 5.4].forEach((m, i) => tone('triangle', 260 * m, 255 * m, 0.9 - i * 0.2, 0.18 / (i + 1)));
    noise(0.05, 0.3, 'highpass', 3000);
  },
  rattle() { if (ok('rattle', 0.07)) { tone('square', rnd(160, 220), 140, 0.05, 0.06); noise(0.04, 0.12, 'bandpass', 2400, 2400, 4); } },
  whistle(level = 1) {
    if (!ok('whistle', 0.9)) return;
    const f = 1600 + level * 900;
    tone('sine', f * 0.9, f * 1.15, 0.7, 0.07);
    noise(0.7, 0.05, 'bandpass', f, f * 1.1, 12);
  },
  steam() { if (ok('steam', 0.15)) noise(0.6, 0.18, 'highpass', 4000, 2500); },
  whoosh() { if (ok('whoosh', 0.1)) noise(0.45, 0.25, 'bandpass', 300, 2600, 1.2); },
  regen() {
    if (!ok('regen', 0.1)) return;
    noise(0.5, 0.18, 'bandpass', 400, 3000, 1.5);
    [523, 659, 784].forEach((f, i) => tone('sine', f, f * 1.01, 0.25, 0.1, 0.25 + i * 0.06));
  },
  creak() { if (ok('creak', 0.2)) { tone('sawtooth', 90, 70, 0.35, 0.05); noise(0.3, 0.08, 'bandpass', 700, 400, 6); } },
  swish() { if (ok('swish', 0.12)) noise(0.2, 0.16, 'bandpass', 800, 2200, 2); },
  jingle() { if (ok('jingle', 0.1)) [1900, 2500, 3100].forEach((f, i) => tone('triangle', f, f, 0.18, 0.06, i * 0.05)); },
  crackle() { if (ok('crackle', 0.08)) for (let i = 0; i < 4; i++) noise(0.03, 0.18, 'highpass', 2000, 2000, 1, i * rnd(0.02, 0.06)); },
  chime() { if (ok('chime', 0.1)) [660, 990].forEach((f, i) => tone('sine', f, f, 0.6, 0.08, i * 0.08)); },
  unlock() {
    if (!ok('unlock', 0.3)) return;
    [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.3, 0.12, i * 0.09));
  },
  ko() { if (ok('ko', 0.15)) { tone('sine', 700, 120, 0.5, 0.2); tone('sine', 705, 125, 0.5, 0.1, 0.02); } },
  clink() { if (ok('clink', 0.08)) [2600, 3900].forEach((f, i) => tone('triangle', f, f * 0.98, 0.15, 0.07, i * 0.02)); },
  freeze() {
    if (!ok('freeze', 0.2)) return;
    noise(0.5, 0.2, 'highpass', 6000, 3000);
    [1800, 2400, 3000].forEach((f, i) => tone('sine', f, f * 1.05, 0.2, 0.05, i * 0.07));
  },
  shatter() {
    if (!ok('shatter', 0.1)) return;
    noise(0.35, 0.4, 'highpass', 5000, 2000);
    for (let i = 0; i < 6; i++) tone('triangle', rnd(2000, 4500), rnd(1500, 3000), 0.12, 0.06, i * 0.03);
  },
  burp() { if (ok('burp', 0.3)) { tone('sawtooth', 110, 70, 0.35, 0.12); noise(0.3, 0.08, 'lowpass', 300); } },
  sizzle() { if (ok('sizzle', 0.15)) noise(0.6, 0.18, 'highpass', 5000, 4000); },
  crunch() { if (ok('crunch', 0.1)) { noise(0.18, 0.4, 'lowpass', 1200, 200); tone('sine', 90, 40, 0.3, 0.35); } },
  roar() { if (ok('roar', 0.4)) noise(0.9, 0.22, 'lowpass', 300, 900, 1.5); },
  crank() { if (ok('crank', 0.09)) { tone('square', 300, 260, 0.04, 0.05); noise(0.03, 0.1, 'bandpass', 2000, 2000, 6); } },
  gong() {
    if (!ok('gong', 0.4)) return;
    [1, 1.48, 2.1].forEach((m, i) => tone('sine', 110 * m, 108 * m, 1.6 - i * 0.3, 0.16 / (i + 1)));
  },
  voice(kind: string) {
    if (!ok('voice-' + kind, 0.35)) return;
    switch (kind) {
      case 'boba': tone('sine', 520, 820, 0.12, 0.12); tone('sine', 820, 420, 0.22, 0.12, 0.11); break; // mew
      case 'mochi': tone('square', 700, 500, 0.08, 0.06); tone('square', 640, 420, 0.1, 0.06, 0.1); break; // quack-quack
      case 'pebble': tone('sine', 120, 95, 0.25, 0.22); break; // hmph
      case 'gloop': tone('sine', 180, 520, 0.18, 0.2); noise(0.1, 0.1, 'lowpass', 400); break; // splort
      case 'toto': tone('sine', 2400, 3200, 0.06, 0.08); tone('sine', 2600, 3400, 0.06, 0.08, 0.08); break; // eek
    }
  },
};

// A soft looping simmer whose loudness follows the cauldron.
let simmer: { gain: GainNode } | null = null;
export function setSimmer(level: number) {
  if (!ctx || !master || !noiseBuf) return;
  if (!simmer) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0;
    s.connect(lp).connect(g).connect(master);
    s.start();
    simmer = { gain: g };
  }
  simmer.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.16, ctx.currentTime, 0.3);
}
