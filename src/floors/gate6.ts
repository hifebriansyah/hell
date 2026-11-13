import Matter from 'matter-js';
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { G } from '../engine/game';
import { sfx } from '../engine/audio';
import { GATE_PLAQUES } from '../data/plaques';
import { buildGate6Depth } from './depth-gates';
import { CAT_PROP, CAT_WORLD, CAT_CRITTER, dragBody, GateFloor, rnd, type PointerHit } from './floor';
import type { Critter } from '../critters/critter';

const { Bodies, Body, Composite, Constraint } = Matter;
const PILLAR = { x: 330, w: 90, h: 520 };
const VENT = 620;
const PIVOT = { x: 720, len: 690 };

interface Tongue { c: Critter; con: Matter.Constraint; ax: number; ay: number; t: number; }
interface Icicle { g: Graphics; x: number; body: Matter.Body | null; regrow: number; }

/** Gate 6 · al-Jahim / Zamharir: the freezing half. Tongue-to-pillar, ice cubes, a giant mallet, icicles. */
export class Gate6 extends GateFloor {
  readonly name = 'Gate 6 · al-Jahim';
  readonly plaque = GATE_PLAQUES[6];
  private depth: ReturnType<typeof buildGate6Depth>;

  private tongues: Tongue[] = [];
  private tongueG = new Graphics();
  private vent = new Graphics();
  private blast = 0;
  private mallet: Matter.Body;
  private malletG = new Container();
  private rope = new Graphics();
  private icicles: Icicle[] = [];
  private snow: Sprite[] = [];
  private pillarTop: number;

  constructor() {
    super(6, { wall: [[0, '#1a2a58'], [0.4, '#3e6698'], [0.75, '#8cc0e4'], [1, '#e2f4ff']], floor: 0x6a8fb8, lip: 0xdff3ff, brick: 0, tiles: false });
    this.depth = buildGate6Depth(this.top, this.floorY, this.focusY);
    const L = G.layers;
    const fy = this.floorY;
    this.pillarTop = fy - PILLAR.h;

    // thermometer: −∞°
    const th = new Graphics();
    th.roundRect(1040, this.top + 120, 36, 300, 18).fill(0xe6f6ff);
    th.circle(1058, this.top + 430, 34).fill(0xe6f6ff);
    th.circle(1058, this.top + 430, 24).fill(0x5fb8ff);
    th.roundRect(1050, this.top + 380, 16, 50, 8).fill(0x5fb8ff);
    for (let i = 0; i < 8; i++) th.roundRect(1080, this.top + 140 + i * 30, 14, 4, 2).fill(0xe6f6ff);
    L.bg.addChild(th);
    const tt = new Text({ text: '−∞°', style: { fontFamily: 'Baloo 2, system-ui', fontWeight: '800', fontSize: 40, fill: 0xe6f6ff } });
    tt.anchor.set(0.5);
    tt.position.set(1058, this.top + 90);
    L.bg.addChild(tt);

    // the glacial pillar
    const p = new Graphics();
    p.moveTo(PILLAR.x - PILLAR.w / 2 - 20, fy).lineTo(PILLAR.x - PILLAR.w / 2, this.pillarTop + 30)
      .bezierCurveTo(PILLAR.x - 30, this.pillarTop - 10, PILLAR.x + 30, this.pillarTop - 10, PILLAR.x + PILLAR.w / 2, this.pillarTop + 30)
      .lineTo(PILLAR.x + PILLAR.w / 2 + 20, fy).closePath().fill(0xbdefff);
    p.poly([PILLAR.x - 30, this.pillarTop + 40, PILLAR.x - 10, this.pillarTop + 40, PILLAR.x - 22, fy - 20, PILLAR.x - 42, fy - 20]).fill({ color: 0xffffff, alpha: 0.6 });
    p.poly([PILLAR.x + 14, this.pillarTop + 90, PILLAR.x + 24, this.pillarTop + 90, PILLAR.x + 28, fy - 120, PILLAR.x + 18, fy - 120]).fill({ color: 0xffffff, alpha: 0.4 });
    L.back.addChild(p);
    this.glow(PILLAR.x, fy - 260, 520, 0x9fe8ff, 0.35);
    this.wall(PILLAR.x, fy - PILLAR.h / 2, PILLAR.w + 20, PILLAR.h, { label: 'pillar', friction: 0.02 });
    L.front.addChild(this.tongueG);

    // the breath vent
    L.back.addChild(this.vent);
    this.glow(VENT, fy - 40, 360, 0xbdefff, 0.5);

    // mallet on a rope from the ceiling
    L.back.addChild(this.rope);
    const mg = new Graphics();
    mg.roundRect(-110, -60, 220, 120, 34).fill(0xb0784a);
    mg.roundRect(-110, -60, 30, 120, 14).fill(0x8a5634);
    mg.roundRect(80, -60, 30, 120, 14).fill(0x8a5634);
    mg.roundRect(-90, -48, 120, 16, 8).fill({ color: 0xffffff, alpha: 0.2 });
    this.malletG.addChild(mg);
    L.front.addChild(this.malletG);
    this.mallet = Bodies.rectangle(PIVOT.x, this.top + PIVOT.len, 220, 120, {
      label: 'mallet', density: 0.006, frictionAir: 0.004, chamfer: { radius: 30 },
      collisionFilter: { category: CAT_PROP, mask: CAT_WORLD | CAT_CRITTER },
    });
    Composite.add(G.engine.world, [this.mallet, Constraint.create({
      pointA: { x: PIVOT.x, y: this.top + 10 }, bodyB: this.mallet, pointB: { x: 0, y: -40 }, length: PIVOT.len - 40, stiffness: 1,
    })]);

    // icicles along the ceiling
    for (const x of [200, 480, 560, 720, 980, 1100]) {
      const g = new Graphics();
      G.layers.front.addChild(g);
      this.icicles.push({ g, x, body: null, regrow: 0 });
    }
  }

  pointerDown(x: number, y: number): PointerHit | null {
    const base = super.pointerDown(x, y);
    if (base) return base;
    const m = this.mallet.position;
    if (Math.abs(x - m.x) < 130 && Math.abs(y - m.y) < 80) return dragBody(this.mallet, x, y, 0.06);
    for (const ic of this.icicles) {
      if (!ic.body && ic.regrow <= 0 && Math.abs(x - ic.x) < 30 && y < this.top + 110) {
        return { move() {}, up: () => this.dropIcicle(ic) };
      }
    }
    if (Math.abs(x - VENT) < 90 && y > this.floorY - 120) {
      return { move() {}, up: () => {
        this.blast = 1;
        sfx.freeze();
        sfx.whoosh();
        for (const c of this.crits()) if (Math.abs(c.x - VENT) < 160 && c.y > this.floorY - 520) c.freeze(9);
      } };
    }
    return null;
  }

  private dropIcicle(ic: Icicle) {
    const b = Bodies.rectangle(ic.x, this.top + 60, 22, 80, {
      label: 'icicle', density: 0.004, chamfer: { radius: 8 },
      collisionFilter: { category: CAT_PROP, mask: CAT_WORLD | CAT_CRITTER },
    });
    Composite.add(G.engine.world, b);
    ic.body = b;
    sfx.clink();
  }

  onCollide(a: Matter.Body, b: Matter.Body, speed: number) {
    const crit = (x: Matter.Body) => (x.parent as Matter.Body & { critter?: Critter }).critter;
    for (const [m, o] of [[a, b], [b, a]] as const) {
      if (m === this.mallet) {
        const c = crit(o);
        if (!c || speed < 4) continue;
        if (c.frozen) c.shatter();
        else {
          c.hurt(speed * 1.6, 'impact');
          G.fx.emit('star', c.x, c.y - c.def.r, 5);
        }
        sfx.thud(1);
      }
      const ic = this.icicles.find((k) => k.body === m);
      if (ic && speed > 2) {
        const c = crit(o);
        if (c) {
          c.hurt(12, 'impact');
          c.chill = 1;
          c.cold = Math.min(1, c.cold + 0.5);
          if (Math.random() < 0.4 + G.tinker.frost * 0.4) c.freeze(6);
        }
        sfx.shatter();
        G.fx.emit('glint', m.position.x, m.position.y, 8, { tint: 0xd9f6ff, spread: 2 });
        Composite.remove(G.engine.world, m);
        ic.body = null;
        ic.regrow = 5;
      }
    }
  }

  step() {
    const fy = this.floorY;
    const frost = G.tinker.frost;
    for (const c of this.crits()) {
      c.chill = 0.55 + frost * 0.45;
      c.ambient = 0;
      if (c.state !== 'live' || c.frozen) continue;
      // the vent breathes frost: stand over it too long and you're an ice cube
      if (Math.abs(c.x - VENT) < 120 && c.y > fy - 420) {
        c.cold = Math.min(1, c.cold + (0.006 + frost * 0.01));
        if (c.cold > 0.9) c.freeze(8);
        Body.setVelocity(c.body, { x: c.body.velocity.x, y: c.body.velocity.y - 0.25 });
      }
      // tongue meets pillar
      if (!c.tongue && !c.frozen) {
        const m = c.mouth();
        const side = m.x < PILLAR.x ? -1 : 1;
        const edge = PILLAR.x + side * (PILLAR.w / 2 + 6);
        if (Math.abs(m.x - edge) < 34 && m.y > this.pillarTop + 20 && m.y < fy - 10) this.stick(c, edge, m.y);
      }
    }
    // stretchy tongues: snap when pulled too far
    for (const tg of [...this.tongues]) {
      tg.t += 1 / 60;
      const m = tg.c.mouth();
      const d = Math.hypot(m.x - tg.ax, m.y - tg.ay);
      if (!tg.c.tongue || d > 430 || tg.t > 14 || tg.c.state === 'ko' || !G.critters.includes(tg.c)) this.unstick(tg, tg.c.tongue && d > 430);
      else if (d > 60) tg.c.mood = 'worried';
    }
  }

  private stick(c: Critter, x: number, y: number) {
    const m = c.mouth();
    const con = Constraint.create({
      pointA: { x, y }, bodyB: c.body, pointB: { x: m.x - c.x, y: m.y - c.y }, length: 20, stiffness: 0.006, damping: 0.02,
    });
    Composite.add(G.engine.world, con);
    c.tongue = true;
    this.tongues.push({ c, con, ax: x, ay: y, t: 0 });
    sfx.freeze();
    c.say(c.def.deadpan ? '-_-' : 'ith thtuck');
    G.discover('g6-tongue', c);
  }

  private unstick(tg: Tongue, snapped: boolean) {
    Composite.remove(G.engine.world, tg.con);
    tg.c.tongue = false;
    this.tongues = this.tongues.filter((k) => k !== tg);
    if (snapped) {
      // the rubber-band snap: thwap back toward the pillar
      const dx = tg.ax - tg.c.x, dy = tg.ay - tg.c.y;
      const d = Math.hypot(dx, dy) || 1;
      Body.setVelocity(tg.c.body, { x: (dx / d) * 22, y: (dy / d) * 22 - 4 });
      tg.c.hurt(14, 'impact');
      sfx.boing(1.6);
    }
  }

  update(dt: number, camY: number, near: boolean) {
    super.update(dt, camY, near);
    this.depth.update(dt, near);
    const t = G.time;
    const fy = this.floorY;
    // tongues
    const g = this.tongueG;
    g.clear();
    for (const tg of this.tongues) {
      const m = tg.c.mouth();
      const d = Math.hypot(m.x - tg.ax, m.y - tg.ay);
      const w = Math.max(5, 20 - d * 0.035);
      g.moveTo(tg.ax, tg.ay).quadraticCurveTo((tg.ax + m.x) / 2, (tg.ay + m.y) / 2 + 20, m.x, m.y).stroke({ width: w, color: 0xff7f9e, cap: 'round' });
      g.moveTo(tg.ax, tg.ay).quadraticCurveTo((tg.ax + m.x) / 2, (tg.ay + m.y) / 2 + 16, m.x, m.y).stroke({ width: w * 0.3, color: 0xffb3c6, cap: 'round' });
      g.ellipse(tg.ax, tg.ay, 14, 10).fill(0xff7f9e);
    }
    // vent
    this.blast = Math.max(0, this.blast - dt);
    const v = this.vent;
    v.clear();
    v.ellipse(VENT, fy + 4, 90, 14).fill(0x2e4a7a);
    v.ellipse(VENT, fy, 70, 9).fill(0xd9f6ff);
    if (near && Math.random() < dt * (14 + this.blast * 80)) {
      G.fx.emit('steam', VENT + rnd(-50, 50), fy - 10, 1, { tint: 0xe6fbff, vy: -140 - this.blast * 300, size: 1.2 });
    }
    if (near && Math.random() < dt * (6 + G.tinker.frost * 20)) G.fx.emit('drop', rnd(0, 1200), this.top + 20, 1, { tint: 0xffffff, vy: 120 });
    // mallet + rope
    const mb = this.mallet;
    this.malletG.position.set(mb.position.x, mb.position.y);
    this.malletG.rotation = mb.angle;
    const r = this.rope;
    r.clear();
    const hx = mb.position.x + Math.sin(mb.angle) * 40, hy = mb.position.y - Math.cos(mb.angle) * 40;
    r.moveTo(PIVOT.x, this.top + 10).lineTo(hx, hy).stroke({ width: 20, color: 0x8a5634, cap: 'round' });
    r.moveTo(PIVOT.x, this.top + 10).lineTo(hx, hy).stroke({ width: 6, color: 0xd69a62, cap: 'round' });
    r.circle(PIVOT.x, this.top + 10, 16).fill(0x4a4670);
    // icicles regrow
    for (const ic of this.icicles) {
      ic.g.clear();
      if (ic.body) {
        const b = ic.body;
        ic.g.position.set(b.position.x, b.position.y);
        ic.g.rotation = b.angle;
        ic.g.poly([-11, -40, 11, -40, 0, 42]).fill(0xd9f6ff);
        if (b.position.y > fy + 50) { Composite.remove(G.engine.world, b); ic.body = null; ic.regrow = 5; }
      } else {
        ic.regrow = Math.max(0, ic.regrow - dt);
        const k = 1 - ic.regrow / 5;
        ic.g.position.set(ic.x, this.top + 20);
        ic.g.rotation = 0;
        ic.g.poly([-12 * k, 0, 12 * k, 0, 0, 90 * k + Math.sin(t * 2 + ic.x) * 2]).fill(0xd9f6ff);
      }
    }
    void this.snow;
  }
}
