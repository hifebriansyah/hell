import { Texture } from 'pixi.js';

// Small canvas-made textures: gradients, glows and particle shapes.

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

const cache = new Map<string, Texture>();
function memo(key: string, make: () => HTMLCanvasElement) {
  let t = cache.get(key);
  if (!t) {
    t = Texture.from(make());
    cache.set(key, t);
  }
  return t;
}

/** Vertical gradient, stretched by a sprite. stops: [offset, css colour] */
export function vGradient(key: string, stops: [number, string][]) {
  return memo('vg:' + key, () => {
    const { c, g } = canvas(4, 256);
    const gr = g.createLinearGradient(0, 0, 0, 256);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 256);
    return c;
  });
}

/** Soft radial dot: white centre to transparent. Tint it. */
export function softDot() {
  return memo('soft', () => {
    const { c, g } = canvas(64, 64);
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  });
}

/** Wide glow for lanterns and fire, softer falloff. */
export function glowDot() {
  return memo('glow', () => {
    const { c, g } = canvas(128, 128);
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.4)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return c;
  });
}

/** Solid round puff with a soft rim (steam / smoke / soot). */
export function puffDot() {
  return memo('puff', () => {
    const { c, g } = canvas(64, 64);
    const gr = g.createRadialGradient(32, 30, 4, 32, 32, 31);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.75, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(32, 32, 31, 0, Math.PI * 2);
    g.fill();
    return c;
  });
}

/** Bubble: translucent disc with a highlight. */
export function bubbleDot() {
  return memo('bubble', () => {
    const { c, g } = canvas(64, 64);
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.beginPath();
    g.arc(32, 32, 28, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.ellipse(22, 21, 8, 5, -0.6, 0, Math.PI * 2);
    g.fill();
    return c;
  });
}

export function featherShape() {
  return memo('feather', () => {
    const { c, g } = canvas(32, 64);
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(16, 2);
    g.bezierCurveTo(30, 18, 28, 46, 16, 62);
    g.bezierCurveTo(4, 46, 2, 18, 16, 2);
    g.fill();
    return c;
  });
}

export function starShape() {
  return memo('star', () => {
    const { c, g } = canvas(64, 64);
    g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 9 : 31;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    return c;
  });
}

/** Little "z" for napping critters. */
export function zShape() {
  return memo('z', () => {
    const { c, g } = canvas(48, 48);
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(8, 8); g.lineTo(40, 8); g.lineTo(40, 15); g.lineTo(19, 34); g.lineTo(40, 34);
    g.lineTo(40, 41); g.lineTo(8, 41); g.lineTo(8, 34); g.lineTo(29, 15); g.lineTo(8, 15);
    g.closePath();
    g.fill();
    return c;
  });
}
