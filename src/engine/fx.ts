import { Container, Sprite, Texture } from 'pixi.js';
import { bubbleDot, featherShape, puffDot, softDot, starShape, zShape } from './textures';

export type FxKind = 'steam' | 'smoke' | 'soot' | 'spark' | 'ember' | 'bubble' | 'feather' | 'star' | 'drop' | 'z' | 'glint';

interface P {
  s: Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
  g: number;
  drag: number;
  spin: number;
  s0: number;
  s1: number;
  a0: number;
  alive: boolean;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** One pooled particle layer. Two of these exist: normal and additive glow. */
export class Fx {
  readonly view = new Container();
  readonly glow = new Container();
  private pool: P[] = [];

  constructor() {
    this.glow.blendMode = 'add';
  }

  private get(tex: Texture, glow: boolean) {
    let p = this.pool.find((q) => !q.alive && (q.s.parent === (glow ? this.glow : this.view)));
    if (!p) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      (glow ? this.glow : this.view).addChild(s);
      p = { s, vx: 0, vy: 0, life: 0, max: 1, g: 0, drag: 0, spin: 0, s0: 1, s1: 1, a0: 1, alive: false };
      this.pool.push(p);
    }
    p.s.texture = tex;
    p.s.visible = true;
    p.alive = true;
    p.s.rotation = 0;
    return p;
  }

  emit(kind: FxKind, x: number, y: number, n = 1, opts: { vx?: number; vy?: number; spread?: number; tint?: number; size?: number } = {}) {
    const k = opts.size ?? 1;
    for (let i = 0; i < n; i++) {
      const sp = opts.spread ?? 1;
      let p: P;
      switch (kind) {
        case 'steam':
          p = this.get(puffDot(), false);
          p.s.tint = opts.tint ?? 0xfff6ee;
          p.vx = rnd(-30, 30) * sp + (opts.vx ?? 0);
          p.vy = rnd(-120, -60) + (opts.vy ?? 0);
          p.max = rnd(1.0, 1.8); p.g = -20; p.drag = 0.6; p.s0 = 0.5 * k; p.s1 = 1.6 * k; p.a0 = 0.55;
          break;
        case 'smoke':
          p = this.get(puffDot(), false);
          p.s.tint = opts.tint ?? 0x8a6f8e;
          p.vx = rnd(-20, 20) * sp + (opts.vx ?? 0);
          p.vy = rnd(-60, -30) + (opts.vy ?? 0);
          p.max = rnd(1.6, 2.6); p.g = -10; p.drag = 0.4; p.s0 = 0.6 * k; p.s1 = 2.2 * k; p.a0 = 0.45;
          break;
        case 'soot':
          p = this.get(puffDot(), false);
          p.s.tint = opts.tint ?? 0x4a3550;
          p.vx = rnd(-160, 160) * sp + (opts.vx ?? 0);
          p.vy = rnd(-200, -40) + (opts.vy ?? 0);
          p.max = rnd(0.5, 0.9); p.g = 60; p.drag = 2.5; p.s0 = 0.7 * k; p.s1 = 1.4 * k; p.a0 = 0.85;
          break;
        case 'spark':
          p = this.get(softDot(), true);
          p.s.tint = opts.tint ?? 0xffc46b;
          p.vx = rnd(-260, 260) * sp + (opts.vx ?? 0);
          p.vy = rnd(-420, -120) * sp + (opts.vy ?? 0);
          p.max = rnd(0.4, 0.8); p.g = 700; p.drag = 0.8; p.s0 = 0.45 * k; p.s1 = 0.05; p.a0 = 1;
          break;
        case 'ember':
          p = this.get(softDot(), true);
          p.s.tint = opts.tint ?? 0xff8a4c;
          p.vx = rnd(-20, 20) * sp + (opts.vx ?? 0);
          p.vy = rnd(-90, -40) + (opts.vy ?? 0);
          p.max = rnd(1.2, 2.4); p.g = -15; p.drag = 0.3; p.s0 = 0.3 * k; p.s1 = 0.05; p.a0 = 1;
          break;
        case 'glint':
          p = this.get(starShape(), true);
          p.s.tint = opts.tint ?? 0xffe9a8;
          p.vx = rnd(-40, 40) * sp; p.vy = rnd(-60, -10);
          p.max = rnd(0.5, 0.9); p.g = 0; p.drag = 1; p.s0 = 0.5 * k; p.s1 = 0; p.a0 = 1;
          break;
        case 'bubble':
          p = this.get(bubbleDot(), false);
          p.s.tint = opts.tint ?? 0xffffff;
          p.vx = rnd(-10, 10) * sp; p.vy = rnd(-80, -40);
          p.max = rnd(0.5, 1.1); p.g = -60; p.drag = 0.5; p.s0 = rnd(0.25, 0.6) * k; p.s1 = p.s0 * 1.3; p.a0 = 0.9;
          break;
        case 'feather':
          p = this.get(featherShape(), false);
          p.s.tint = opts.tint ?? 0xffe27a;
          p.vx = rnd(-220, 220) * sp + (opts.vx ?? 0);
          p.vy = rnd(-320, -80) + (opts.vy ?? 0);
          p.max = rnd(1.6, 2.6); p.g = 140; p.drag = 2.2; p.s0 = 0.6 * k; p.s1 = 0.5 * k; p.a0 = 1;
          p.spin = rnd(-5, 5);
          break;
        case 'star':
          p = this.get(starShape(), true);
          p.s.tint = opts.tint ?? 0xffe9a8;
          p.vx = rnd(-300, 300) * sp + (opts.vx ?? 0);
          p.vy = rnd(-380, -80) * sp + (opts.vy ?? 0);
          p.max = rnd(0.6, 1.1); p.g = 300; p.drag = 1.2; p.s0 = 0.6 * k; p.s1 = 0.1; p.a0 = 1;
          p.spin = rnd(-6, 6);
          break;
        case 'drop':
          p = this.get(softDot(), false);
          p.s.tint = opts.tint ?? 0xffb08a;
          p.vx = rnd(-160, 160) * sp + (opts.vx ?? 0);
          p.vy = rnd(-360, -140) + (opts.vy ?? 0);
          p.max = rnd(0.5, 0.9); p.g = 900; p.drag = 0.2; p.s0 = 0.35 * k; p.s1 = 0.25 * k; p.a0 = 0.95;
          break;
        case 'z':
          p = this.get(zShape(), false);
          p.s.tint = opts.tint ?? 0xd9ccff;
          p.vx = rnd(10, 30); p.vy = rnd(-50, -35);
          p.max = 1.8; p.g = 0; p.drag = 0; p.s0 = 0.35 * k; p.s1 = 0.8 * k; p.a0 = 0.9;
          break;
      }
      p.s.x = x + rnd(-8, 8) * sp;
      p.s.y = y + rnd(-8, 8) * sp;
      p.life = 0;
      if (kind !== 'feather' && kind !== 'star') p.spin = rnd(-1, 1);
      p.s.scale.set(p.s0);
      p.s.alpha = p.a0;
    }
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life += dt;
      const t = p.life / p.max;
      if (t >= 1) {
        p.alive = false;
        p.s.visible = false;
        continue;
      }
      p.vy += p.g * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.spin * dt;
      p.s.scale.set(p.s0 + (p.s1 - p.s0) * t);
      p.s.alpha = p.a0 * (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
    }
  }
}
