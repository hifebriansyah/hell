import Matter from 'matter-js';
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { G } from '../engine/game';
import { sfx } from '../engine/audio';
import { GATE_PLAQUES } from '../data/plaques';
import { drawLantern, GateFloor, rnd, Wobble, type PointerHit } from './floor';
import type { Critter } from '../critters/critter';

const { Body } = Matter;
const SPEEDS = [1, 2, 3, -1, 0];
const SPEED_LABEL = ['▶', '▶▶', '▶▶▶', '◀', '■'];

/** Gate 5 · Saqar: a slanted ember conveyor that drags critters face-first into a roaring grate. */
export class Gate5 extends GateFloor {
  readonly name = 'Gate 5 · Saqar';
  readonly plaque = GATE_PLAQUES[5];

  private b0: { x: number; y: number };
  private b1: { x: number; y: number };
  private dir: { x: number; y: number };
  private up: { x: number; y: number };
  private len: number;
  private ang: number;
  private belt = new Graphics();
  private phase = 0;
  private speedIdx = 0;
  private marks: { t: number; kind: 'claw' | 'slime'; life: number }[] = [];
  private markT = new Map<Critter, number>();
  private koSeen = new Set<Critter>();
  private grate = new Graphics();
  private grateGlow: Sprite;
  private crank = new Container();
  private crankW = new Wobble(100, 6);
  private crankLabel: Text;
  private lanterns: { c: Container; glow: Sprite; w: Wobble }[] = [];
  private flicker = 0;
  private ticket: Text;

  constructor() {
    super(5, { wall: [[0, '#220c22'], [0.6, '#4e1530'], [1, '#8a2430']], floor: 0x2e1028, lip: 0x7a3048, brick: 0.035 });
    const L = G.layers;
    const fy = this.floorY;
    this.b0 = { x: 110, y: this.top + 300 };
    this.b1 = { x: 930, y: fy - 190 };
    const dx = this.b1.x - this.b0.x, dy = this.b1.y - this.b0.y;
    this.len = Math.hypot(dx, dy);
    this.dir = { x: dx / this.len, y: dy / this.len };
    this.up = { x: this.dir.y, y: -this.dir.x };
    this.ang = Math.atan2(dy, dx);

    // nineteen quiet lanterns overhead
    for (let i = 0; i < 19; i++) {
      const x = 70 + i * (1060 / 18);
      const lan = drawLantern(0xffe2a0, 0x6a2a4e);
      lan.scale.set(0.55);
      lan.pivot.set(0, -60);
      lan.position.set(x, this.top + 10);
      L.back.addChild(lan);
      const glow = this.glow(x, this.top + 52, 130, 0xffd88a, 0.4);
      this.lanterns.push({ c: lan, glow, w: new Wobble(30, 2) });
    }

    // take-a-number machine
    const tk = new Graphics();
    tk.roundRect(520, this.top + 150, 190, 92, 16).fill(0x2a1230);
    tk.roundRect(532, this.top + 162, 166, 50, 8).fill(0x120812);
    tk.roundRect(600, this.top + 220, 30, 34, 6).fill(0xfff4e6);
    L.bg.addChild(tk);
    this.ticket = new Text({ text: 'NOW SERVING  ∞', style: { fontFamily: 'Baloo 2, system-ui', fontWeight: '800', fontSize: 22, fill: 0xff6f61 } });
    this.ticket.anchor.set(0.5);
    this.ticket.position.set(615, this.top + 188);
    L.bg.addChild(this.ticket);

    // belt physics + rollers
    this.segment(this.b0.x, this.b0.y + 22, this.b1.x, this.b1.y + 22, 40, { friction: 0.9, label: 'belt', chamfer: { radius: 18 } });
    // support legs
    const legs = new Graphics();
    for (const k of [0.15, 0.5, 0.85]) {
      const x = this.b0.x + dx * k, y = this.b0.y + dy * k + 40;
      legs.roundRect(x - 10, y, 20, fy - y, 6).fill(0x2a1230);
    }
    L.back.addChild(legs, this.belt);

    // the grate
    L.back.addChild(this.grate);
    this.grateGlow = this.glow(1060, fy - 60, 700, 0xff6a3c, 0.7);
    this.wall(950, fy - 60, 20, 120, { label: 'grate-lip' });

    // crank on the right wall
    const cg = new Graphics();
    cg.circle(0, 0, 50).fill(0x4a4670);
    cg.circle(0, 0, 36).fill(0x6a66a0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      cg.roundRect(Math.cos(a) * 30 - 6, Math.sin(a) * 30 - 6, 12, 12, 4).fill(0x3a3660);
    }
    cg.roundRect(-6, -78, 12, 78, 6).fill(0x9a6a48);
    cg.circle(0, -80, 14).fill(0xff6f61);
    this.crank.addChild(cg);
    this.crank.position.set(1110, this.top + 330);
    L.back.addChild(this.crank);
    this.crankLabel = new Text({ text: SPEED_LABEL[0], style: { fontFamily: 'Baloo 2, system-ui', fontWeight: '800', fontSize: 26, fill: 0xffd36e } });
    this.crankLabel.anchor.set(0.5);
    this.crankLabel.position.set(1110, this.top + 420);
    L.back.addChild(this.crankLabel);
  }

  get speed() { return SPEEDS[this.speedIdx]; }

  pointerDown(x: number, y: number): PointerHit | null {
    const base = super.pointerDown(x, y);
    if (base) return base;
    if (Math.hypot(x - 1110, y - (this.top + 320)) < 90) {
      return { move() {}, up: () => {
        this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
        this.crankLabel.text = SPEED_LABEL[this.speedIdx];
        this.crankW.kick(5);
        sfx.crank();
        sfx.creak();
      } };
    }
    if (y < this.top + 110) {
      return { move() {}, up: () => { this.flicker = 1.6; sfx.gong(); this.lanterns.forEach((l) => l.w.kick(rnd(-3, 3))); } };
    }
    return null;
  }

  private onBelt(c: Critter) {
    const px = c.x - this.b0.x, py = c.y - this.b0.y;
    const t = (px * this.dir.x + py * this.dir.y) / this.len;
    const d = px * this.up.x + py * this.up.y;
    return { t, on: t > -0.02 && t < 1.02 && d > -10 && d < c.def.r + 46 };
  }

  step() {
    const sp = this.speed;
    const target = sp * 4.2;
    this.phase += target;
    const heat = G.tinker.heat;
    const fy = this.floorY;
    for (const c of this.crits()) {
      if (c.held) continue;
      const b = c.body;
      const { t, on } = this.onBelt(c);
      if (on && c.state === 'live') {
        const va = b.velocity.x * this.dir.x + b.velocity.y * this.dir.y;
        const nv = va + (target - va) * 0.12;
        Body.setVelocity(b, { x: b.velocity.x + (nv - va) * this.dir.x, y: b.velocity.y + (nv - va) * this.dir.y });
        const f = sp >= 0 ? 1 : -1;
        if (sp !== 0 && !c.frozen) {
          c.targetAngle = this.ang + f * Math.PI / 2;
          c.facing = f;
          c.mood = c.def.id === 'boba' ? 'squint' : c.def.id === 'gloop' ? 'worried' : 'worried';
          // claw skid marks / slime smears
          const mt = (this.markT.get(c) ?? 0) - 1 / 60;
          this.markT.set(c, mt);
          if (mt <= 0 && (c.def.id === 'boba' || c.def.id === 'gloop')) {
            this.markT.set(c, 0.12);
            this.marks.push({ t, kind: c.def.id === 'boba' ? 'claw' : 'slime', life: 3 });
          }
          // Mochi back-paddles (it does not help)
          if (c.def.id === 'mochi') Body.setVelocity(b, { x: b.velocity.x - f * this.dir.x * 0.25, y: b.velocity.y });
        }
        // run backwards long enough and someone gets flung off the top
        if (sp < 0 && t < 0.04) {
          Body.setVelocity(b, { x: -9, y: -16 });
          G.discover('g5-reverse', c);
        }
      }
      // the grate
      if (c.x > 950 && c.y > fy - 170) {
        if (c.state === 'live') {
          c.hurt((24 + heat * 30) / 60, 'scorch');
          c.soot = Math.min(1, c.soot + 0.01);
          c.mood = 'squint';
          c.targetAngle = 0;
          if (Math.random() < 0.15) G.fx.emit('spark', c.x, c.y + 20, 2);
        }
      }
      if (c.state === 'ko') this.koSeen.add(c);
      else if (this.koSeen.has(c)) {
        this.koSeen.delete(c);
        if (c.x > 900) {
          // back to the top of the belt. Again.
          Body.setPosition(b, { x: this.b0.x + 60, y: this.b0.y - 120 });
          Body.setVelocity(b, { x: 2, y: 0 });
        }
      }
    }
  }

  update(dt: number, camY: number, near: boolean) {
    super.update(dt, camY, near);
    const t = G.time;
    const heat = G.tinker.heat;
    const fy = this.floorY;
    // belt
    const g = this.belt;
    g.clear();
    const { b0, b1, dir, up } = this;
    const th = 40;
    g.poly([b0.x, b0.y, b1.x, b1.y, b1.x - up.x * th, b1.y - up.y * th, b0.x - up.x * th, b0.y - up.y * th]).fill(0x3a1a2e);
    g.circle(b0.x - up.x * th / 2, b0.y - up.y * th / 2, 24).fill(0x5a5a6e);
    g.circle(b1.x - up.x * th / 2, b1.y - up.y * th / 2, 24).fill(0x5a5a6e);
    const gap = 46;
    const off = ((this.phase % gap) + gap) % gap;
    for (let s = off; s < this.len - 10; s += gap) {
      const x = b0.x + dir.x * s, y = b0.y + dir.y * s;
      const a = 12;
      g.poly([x - dir.x * a + up.x * 2, y - dir.y * a + up.y * 2, x + dir.x * a * 0.4, y + dir.y * a * 0.4, x - dir.x * a - up.x * 14, y - dir.y * a - up.y * 14]).fill({ color: 0xff8a4c, alpha: 0.7 + Math.sin(s * 0.1 + t * 4) * 0.2 });
    }
    // skid marks travel with the belt
    const step = (this.speed * 4.2 * 60 * dt) / this.len;
    this.marks = this.marks.filter((m) => (m.life -= dt) > 0 && (m.t += step) < 1.05 && m.t > -0.05);
    for (const m of this.marks) {
      const x = b0.x + dir.x * m.t * this.len, y = b0.y + dir.y * m.t * this.len;
      const a = Math.min(1, m.life);
      if (m.kind === 'claw') {
        for (let k = -1; k <= 1; k++) {
          const ox = up.x * k * 7, oy = up.y * k * 7;
          g.moveTo(x + ox - dir.x * 16, y + oy - dir.y * 16).lineTo(x + ox + dir.x * 16, y + oy + dir.y * 16).stroke({ width: 3, color: 0x1a0812, alpha: a * 0.8 });
        }
      } else g.ellipse(x, y - 2, 26, 7).fill({ color: 0x7debc3, alpha: a * 0.7 });
    }
    // grate + flames
    const gr = this.grate;
    gr.clear();
    gr.rect(950, fy - 30, 250, 30).fill(0x2a0e1e);
    const fh = 90 + heat * 110;
    for (let i = 0; i < 6; i++) {
      const x = 975 + i * 40;
      const h = fh * (0.8 + Math.sin(t * 9 + i * 1.7) * 0.2);
      gr.moveTo(x - 22, fy - 20).bezierCurveTo(x - 24, fy - 20 - h * 0.4, x - 6, fy - 20 - h * 0.7, x + Math.sin(t * 5 + i) * 8, fy - 20 - h)
        .bezierCurveTo(x + 6, fy - 20 - h * 0.7, x + 24, fy - 20 - h * 0.4, x + 22, fy - 20).closePath().fill(i % 2 ? 0xff6f61 : 0xff9f5a);
    }
    for (let i = 0; i < 7; i++) gr.roundRect(960 + i * 36, fy - 36, 12, 36, 4).fill(0x1e1e2e);
    gr.roundRect(950, fy - 40, 250, 12, 5).fill(0x2e2e40);
    this.grateGlow.alpha = 0.45 + heat * 0.4 + Math.sin(t * 11) * 0.05;
    if (near && Math.random() < dt * 12) G.fx.emit('ember', rnd(970, 1180), fy - 60, 1);
    if (near && Math.random() < dt * 0.6 * heat) sfx.roar();
    // crank turns with the belt
    this.crank.rotation += this.speed * dt * 2.4 + this.crankW.update(dt) * 0.02;
    // lanterns: steady, then a flicker when poked
    this.flicker = Math.max(0, this.flicker - dt);
    for (const [i, l] of this.lanterns.entries()) {
      l.c.rotation = l.w.update(dt) * 0.1;
      l.glow.alpha = 0.35 + (this.flicker > 0 ? Math.abs(Math.sin(t * 20 + i * 1.3)) * 0.6 : Math.sin(t * 1.5 + i) * 0.05);
    }
    this.ticket.alpha = 0.75 + Math.sin(t * 3) * 0.25;
    this.setAmbient(0.25 + heat * 0.2);
  }
}
