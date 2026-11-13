import { Container, Graphics, Sprite } from 'pixi.js';
import { G, SCENE_X0, SCENE_X1 } from '../engine/game';
import { glowDot, softDot, vGradient } from '../engine/textures';

/**
 * Layered backgrounds with depth, in the style of a hand-painted side-scroller:
 * several flat layers, each pushed back by colour (far = closer to the haze, low contrast, little detail;
 * near = darker, saturated, detailed), overlapping each other, and shifting by different amounts
 * when the viewer "moves their head" (mouse / idle sway) or the camera glides between gates.
 *
 * depth d: +1 far away … 0 the play plane (physics; never moves).
 */
export interface DepthLayer { c: Container; d: number; }

interface Mote { g: Sprite; x: number; y: number; vy: number; vx: number; ph: number; }

export class DepthStack {
  readonly back = new Container(); // everything behind the play plane, masked to the room's height
  private layers: DepthLayer[] = [];
  private motes: { m: Mote[]; layer: Container; d: number }[] = [];

  /** room's vertical span (scenery spans SCENE_X0..SCENE_X1 sideways); focusY = where the camera rests */
  constructor(private y0: number, private y1: number, private focusY: number) {
    const mb = new Graphics().rect(SCENE_X0, y0, SCENE_X1 - SCENE_X0, y1 - y0).fill(0xffffff);
    this.back.mask = mb;
    this.back.addChild(mb);
    G.layers.bg.addChild(this.back);
  }

  /** add a background layer (d > 0: the bigger, the farther away) */
  layer(d: number) {
    const c = new Container();
    this.back.addChild(c);
    this.layers.push({ c, d });
    return c;
  }

  /** floating dust/embers drifting at a given depth */
  /** rise > 0 drifts up (embers, dust); rise < 0 falls (snow, ash) */
  motesAt(layer: Container, d: number, n: number, opts: { tint: number; size: [number, number]; alpha: number; rise: number }) {
    const m: Mote[] = [];
    for (let i = 0; i < n; i++) {
      const g = new Sprite(softDot());
      g.anchor.set(0.5);
      const s = opts.size[0] + Math.random() * (opts.size[1] - opts.size[0]);
      g.width = g.height = s;
      g.tint = opts.tint;
      g.alpha = opts.alpha * (0.5 + Math.random() * 0.5);
      layer.addChild(g);
      m.push({ g, x: SCENE_X0 + Math.random() * (SCENE_X1 - SCENE_X0), y: this.y0 + Math.random() * (this.y1 - this.y0), vy: -opts.rise * (0.5 + Math.random()), vx: (Math.random() - 0.5) * 8, ph: Math.random() * 6 });
    }
    this.motes.push({ m, layer, d });
  }

  update(dt: number, near: boolean) {
    if (!near) return;
    const px = G.parallax.x, py = G.parallax.y;
    // background lags behind the camera when gliding between gates; foreground rushes ahead
    const glide = G.camY - this.focusY;
    for (const l of this.layers) {
      l.c.x = px * 30 * l.d;
      l.c.y = py * 16 * l.d + glide * l.d * 0.3;
    }
    const t = G.time;
    for (const set of this.motes) {
      for (const m of set.m) {
        m.y += m.vy * dt;
        m.x += (m.vx + Math.sin(t * 0.8 + m.ph) * 6) * dt;
        if (m.vy < 0 && m.y < this.y0 - 20) { m.y = this.y1 + 10; m.x = SCENE_X0 + Math.random() * (SCENE_X1 - SCENE_X0); }
        if (m.vy > 0 && m.y > this.y1 + 20) { m.y = this.y0 - 10; m.x = SCENE_X0 + Math.random() * (SCENE_X1 - SCENE_X0); }
        m.g.position.set(m.x, m.y);
      }
    }
  }
}

/** a soft horizontal fog band (transparent → colour → transparent) */
export function hazeBand(c: Container, key: string, x0: number, x1: number, y0: number, y1: number, rgba: string) {
  const s = new Sprite(vGradient('haze-' + key, [[0, 'rgba(0,0,0,0)'], [0.6, rgba], [1, rgba]]));
  s.position.set(x0, y0);
  s.width = x1 - x0;
  s.height = y1 - y0;
  c.addChild(s);
  return s;
}

/** an additive glow dot living inside a depth layer (so it parallaxes with it) */
export function layerGlow(c: Container, x: number, y: number, size: number, tint: number, alpha: number) {
  const s = new Sprite(glowDot());
  s.anchor.set(0.5);
  s.position.set(x, y);
  s.width = s.height = size;
  s.tint = tint;
  s.alpha = alpha;
  s.blendMode = 'add';
  c.addChild(s);
  return s;
}

// ---------------------------------------------------------------------------------------------
// Gate 1 · the cauldron hall: an endless kitchen of boiling pots receding into hot haze.
// ---------------------------------------------------------------------------------------------

export function buildGate1Depth(top: number, floor: number, focusY: number) {
  const X0 = SCENE_X0, X1 = SCENE_X1; // the hall carries on past the room, as far as any monitor can see
  const stack = new DepthStack(top, floor, focusY);
  const H = floor - top;
  const glows: { s: Sprite; base: number; ph: number }[] = [];

  // --- far (d = 1): a colonnade of pointed arches and two rows of distant cauldrons ---
  const far = stack.layer(1);
  const col = new Graphics();
  const bandTop = top + 40, bandBot = floor - 300;
  col.rect(X0, bandTop, X1 - X0, bandBot - bandTop).fill({ color: 0x763258, alpha: 0.9 });
  for (let x = X0 + 40; x < X1; x += 170) {
    const w = 110, ax = x + w / 2;
    col.moveTo(x, bandBot - 26).lineTo(x, bandTop + 170).bezierCurveTo(x, bandTop + 110, ax - 20, bandTop + 80, ax, bandTop + 50)
      .bezierCurveTo(ax + 20, bandTop + 80, x + w, bandTop + 110, x + w, bandTop + 170).lineTo(x + w, bandBot - 26).closePath().cut();
  }
  far.addChild(col);
  // glowing depths seen through the arches
  for (let x = X0 + 95; x < X1; x += 170) glows.push({ s: layerGlow(far, x, bandBot - 60, 180, 0xff8a5c, 0.35), base: 0.35, ph: Math.random() * 6 });
  hazeBand(far, 'g1-far', X0, X1, floor - 470, floor - 200, 'rgba(214,104,96,0.55)');
  const pots = (y: number, scale: number, color: number, alpha: number, step: number, off: number) => {
    const g = new Graphics();
    for (let x = X0 + off; x < X1 + 60; x += step) {
      const w = 70 * scale, h = 46 * scale;
      g.moveTo(x - w, y - h).bezierCurveTo(x - w * 1.15, y - h * 0.2, x - w * 0.7, y + h * 0.35, x, y + h * 0.35)
        .bezierCurveTo(x + w * 0.7, y + h * 0.35, x + w * 1.15, y - h * 0.2, x + w, y - h).closePath().fill({ color, alpha });
      g.roundRect(x - w * 1.08, y - h - 8 * scale, w * 2.16, 12 * scale, 6 * scale).fill({ color, alpha });
      g.rect(x - w * 0.6, y + h * 0.3, 6 * scale, 22 * scale).fill({ color, alpha }).rect(x + w * 0.6 - 6 * scale, y + h * 0.3, 6 * scale, 22 * scale).fill({ color, alpha });
      // a lick of fire under each
      glows.push({ s: layerGlow(far, x, y + h * 0.7, 120 * scale, 0xff7a3c, 0.5 * alpha), base: 0.5 * alpha, ph: Math.random() * 6 });
      // a wisp of steam above
      g.ellipse(x + 6 * scale, y - h - 40 * scale, 10 * scale, 34 * scale).fill({ color: 0xffd9c8, alpha: 0.12 });
    }
    far.addChild(g);
  };
  pots(floor - 330, 0.55, 0xa8546c, 0.7, 120, 40);
  pots(floor - 255, 0.8, 0x86385c, 0.85, 170, 110);
  hazeBand(far, 'g1-far2', X0, X1, floor - 320, floor - 120, 'rgba(222,116,98,0.45)');

  // --- mid (d = 0.55): stone pillars, pointed spandrels along the ceiling, hanging chains ---
  const mid = stack.layer(0.55);
  const mg = new Graphics();
  const pillars = [-1550, -1100, -650, -200, 250, 700, 1080, 1530, 1980, 2430];
  for (const px of pillars) {
    const w = 84;
    mg.rect(px - w / 2, top, w, H).fill(0x5a1f46);
    mg.rect(px - w / 2, top, 18, H).fill(0x76305a); // lit edge, toward the fire
    mg.roundRect(px - w / 2 - 14, floor - 60, w + 28, 60, 8).fill(0x4e1a3e);
    mg.roundRect(px - w / 2 - 12, top + 150, w + 24, 26, 8).fill(0x6a2852);
  }
  // spandrels: the ceiling between pillars curving down into pointed arches
  const spans = [[X0, pillars[0]], ...pillars.slice(0, -1).map((p, i) => [p, pillars[i + 1]]), [pillars[pillars.length - 1], X1]];
  for (const [a, b] of spans) {
    const m = (a + b) / 2;
    mg.moveTo(a, top - 10).lineTo(b, top - 10).lineTo(b, top + 170)
      .bezierCurveTo(b, top + 90, m + 60, top + 70, m, top + 36)
      .bezierCurveTo(m - 60, top + 70, a, top + 90, a, top + 170).closePath().fill(0x521c42);
  }
  // chains with little hanging pots
  for (const [cx, len] of [[470, 230], [905, 300], [560, 150], [-420, 260], [-860, 180], [1760, 240], [2200, 170]] as const) {
    for (let y = top + 30; y < top + len; y += 22) mg.ellipse(cx, y, 5, 10).fill(0x45163a);
    mg.moveTo(cx - 26, top + len).bezierCurveTo(cx - 30, top + len + 34, cx + 30, top + len + 34, cx + 26, top + len).closePath().fill(0x45163a);
    mg.roundRect(cx - 30, top + len - 6, 60, 10, 5).fill(0x45163a);
  }
  mid.addChild(mg);
  hazeBand(mid, 'g1-mid', X0, X1, floor - 260, floor, 'rgba(200,86,88,0.32)');

  // --- near (d = 0.25): just the beams overhead (no wall chunks: the room stays open to the hall) ---
  const near = stack.layer(0.25);
  const ng = new Graphics();
  // beams overhead
  ng.rect(X0, top - 10, X1 - X0, 44).fill(0x2a0d26);
  for (let x = X0 + 20; x < X1; x += 210) ng.roundRect(x, top + 22, 40, 26, 6).fill(0x3a1630);
  near.addChild(ng);


  // faint dust drifting in the distance
  stack.motesAt(far, 1, 26, { tint: 0xffc8a0, size: [3, 6], alpha: 0.35, rise: 14 });

  return {
    update(dt: number, near: boolean) {
      stack.update(dt, near);
      if (!near) return;
      const t = G.time;
      for (const g of glows) g.s.alpha = g.base * (0.8 + Math.sin(t * 2.2 + g.ph) * 0.2);
    },
  };
}
