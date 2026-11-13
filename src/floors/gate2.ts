import Matter from 'matter-js';
import { Container, Graphics, Sprite } from 'pixi.js';
import { G } from '../engine/game';
import { sfx } from '../engine/audio';
import { GATE_PLAQUES } from '../data/plaques';
import { GateFloor, rnd, Wobble, type PointerHit } from './floor';
import type { Critter } from '../critters/critter';

const { Body } = Matter;
const PX = 600; // the flame pit
const PIT = 150; // half-width of the pit mouth

/**
 * Gate 2 · Laza: a leaping flame in a pit that calls back whoever runs away,
 * and peels off coats like a banana skin. Peeled + too close = a little ash pile with eyes.
 */
export class Gate2 extends GateFloor {
  readonly name = 'Gate 2 · Laza';
  readonly plaque = GATE_PLAQUES[2];

  private flame = new Graphics();
  private tendrils = new Graphics();
  private flameGlow: Sprite;
  private gust = 0;
  private bellows = new Container();
  private bellowsW = new Wobble(120, 8);
  private fleeT = new Map<Critter, number>();
  private yankT = new Map<Critter, number>();
  private touchT = new Map<Critter, number>();
  private pulls: { c: Critter; t: number }[] = [];
  private rack = new Container();

  constructor() {
    super(2, { wall: [[0, '#3d1436'], [0.6, '#7a2440'], [1, '#c2453e']], floor: 0x4a1e3a, lip: 0x9a4050, brick: 0.04 });
    const L = G.layers;
    const fy = this.floorY;

    // lost & found: a coat rack with everyone's spare coats (they will need them)
    const rack = new Graphics();
    rack.roundRect(150, fy - 380, 12, 380, 6).fill(0x3a2240);
    rack.roundRect(100, fy - 390, 112, 12, 6).fill(0x3a2240);
    rack.ellipse(156, fy, 50, 10).fill(0x3a2240);
    const coats = [0xc6b0ff, 0xffde5c, 0xc08455, 0x7debc3, 0x9ea8ff];
    coats.forEach((col, i) => {
      const x = 104 + (i % 3) * 52, y = fy - 372 + Math.floor(i / 3) * 120;
      rack.moveTo(x, y).bezierCurveTo(x - 26, y + 10, x - 30, y + 80, x - 18, y + 100).lineTo(x + 18, y + 100)
        .bezierCurveTo(x + 30, y + 80, x + 26, y + 10, x, y).closePath().fill(col);
      rack.circle(x, y, 5).fill(0xffd36e);
    });
    this.rack.addChild(rack);
    L.back.addChild(this.rack);

    // the pit: a sunken bowl of coals in the floor
    const pit = new Graphics();
    pit.ellipse(PX, fy + 6, PIT + 40, 30).fill(0x2a0e22);
    pit.ellipse(PX, fy + 2, PIT + 10, 20).fill(0x8a2a2e);
    for (let i = 0; i < 9; i++) pit.ellipse(PX - PIT + 20 + i * 32, fy + rnd(-4, 6), 18, 9).fill(i % 2 ? 0xff8a4c : 0xffb36b);
    L.back.addChild(pit, this.flame);
    L.front.addChild(this.tendrils);
    this.flameGlow = this.glow(PX, fy - 160, 900, 0xff7a3c, 0.6);

    // bellows on the left, pointing at the pit
    const bl = new Graphics();
    bl.moveTo(-80, -30).lineTo(40, -14).lineTo(40, 14).lineTo(-80, 30).closePath().fill(0x9a6a48);
    bl.moveTo(-80, -30).lineTo(40, -14).lineTo(40, -4).lineTo(-80, -10).closePath().fill(0xb8875e);
    bl.roundRect(40, -8, 60, 16, 6).fill(0x5a5a6e);
    bl.roundRect(-150, -8, 74, 16, 8).fill(0x7a4e34);
    bl.circle(-20, 0, 9).fill(0xffd36e);
    this.bellows.addChild(bl);
    this.bellows.position.set(330, fy - 40);
    L.front.addChild(this.bellows);
  }

  pointerDown(x: number, y: number): PointerHit | null {
    const base = super.pointerDown(x, y);
    if (base) return base;
    if (Math.abs(x - 300) < 140 && Math.abs(y - (this.floorY - 40)) < 60) {
      return { move() {}, up: () => this.puff() };
    }
    if (Math.abs(x - PX) < PIT && y > this.floorY - 300 && y < this.floorY + 20) {
      return { move() {}, up: () => {
        this.gust = Math.max(this.gust, 0.6);
        sfx.roar();
        G.fx.emit('spark', PX, this.floorY - 60, 20, { spread: 1.4 });
      } };
    }
    return null;
  }

  /** the heat-gust: a blast from the bellows that peels everyone in its path */
  private puff() {
    this.bellowsW.kick(-6);
    this.gust = 1;
    sfx.whoosh();
    sfx.roar();
    G.fx.emit('smoke', 420, this.floorY - 40, 10, { vx: 320, tint: 0xffb08a, spread: 1.5 });
    for (const c of this.crits()) {
      if (c.x > 360 && c.x < 980 && c.y > this.floorY - 320) {
        this.peel(c);
        Body.setVelocity(c.body, { x: c.body.velocity.x + 6, y: -8 });
      }
    }
  }

  onTongs(c: Critter) {
    // BBQ tongs pluck the coat right off
    if (c.peeled) return false;
    this.peel(c);
    sfx.pop();
    return true;
  }

  private peel(c: Critter) {
    if (c.peel()) {
      if (c.def.id === 'pebble') G.discover('g2-boxers', c);
      const all = G.critters.length === 5 && G.critters.every((k) => k.peeled);
      if (all) G.discover('g2-full-peel', c);
    }
  }

  step() {
    const heat = G.tinker.heat;
    const fy = this.floorY;
    for (const c of this.crits()) {
      if (c.held || c.state === 'ko' || c.frozen) continue;
      const b = c.body;
      const dx = PX - c.x;
      const dist = Math.abs(dx);
      const grounded = c.y > fy - c.def.r * 1.6;
      // they try to run away from the flame...
      const ft = (this.fleeT.get(c) ?? rnd(1, 3)) - 1 / 60;
      this.fleeT.set(c, ft);
      if (ft <= 0 && grounded && dist < 380) {
        this.fleeT.set(c, rnd(2.5, 5));
        const away = dx > 0 ? -1 : 1;
        Body.setVelocity(b, { x: away * rnd(7, 11), y: -rnd(4, 7) });
        c.facing = away;
      }
      if (dist < 420) c.mood = 'worried';
      // ...and it calls them back: a flame tongue reaches out and yanks
      const yt = (this.yankT.get(c) ?? 1.5) - 1 / 60;
      this.yankT.set(c, yt);
      if (yt <= 0 && dist > 260 && heat > 0.05) {
        this.yankT.set(c, rnd(1.6, 3));
        Body.setVelocity(b, { x: Math.sign(dx) * (6 + heat * 8), y: -rnd(7, 10) });
        this.pulls.push({ c, t: 0.45 });
        sfx.whoosh();
      } else if (grounded) {
        Body.setVelocity(b, { x: b.velocity.x + Math.sign(dx) * (0.12 + c.def.grip * 0.4) * heat, y: b.velocity.y });
      }
      // inside the flame: coat first, then roasting
      const tt = (this.touchT.get(c) ?? 0) - 1 / 60;
      this.touchT.set(c, tt);
      if (dist < PIT && c.y > fy - 120 - c.def.r && tt <= 0) {
        this.touchT.set(c, 0.6);
        if (!c.peeled) this.peel(c);
        else c.hurt(18 + heat * 14, 'roast');
        c.soot = Math.min(1, c.soot + 0.25);
        Body.setVelocity(b, { x: (dx > 0 ? -1 : 1) * rnd(6, 10), y: -rnd(14, 19) });
        G.fx.emit('spark', c.x, c.y + c.def.r * 0.5, 12, { spread: 1.2 });
        sfx.sizzle();
      }
    }
  }

  update(dt: number, camY: number, near: boolean) {
    super.update(dt, camY, near);
    const t = G.time;
    const heat = G.tinker.heat;
    const fy = this.floorY;
    this.gust = Math.max(0, this.gust - dt * 1.2);
    const h = (180 + heat * 220) * (1 + this.gust * 0.6);
    // the leaping flame: three layered tongues that lick sideways
    const f = this.flame;
    f.clear();
    const lick = Math.sin(t * 2.3) * 60 + Math.sin(t * 5.1) * 20;
    const tongue = (w: number, hh: number, col: number) => {
      f.moveTo(PX - w, fy).bezierCurveTo(PX - w * 1.1, fy - hh * 0.4, PX - w * 0.3 + lick * 0.4, fy - hh * 0.7, PX + lick, fy - hh)
        .bezierCurveTo(PX + w * 0.4 + lick * 0.4, fy - hh * 0.7, PX + w * 1.1, fy - hh * 0.4, PX + w, fy).closePath().fill(col);
    };
    tongue(PIT + 10, h, 0xff5a4f);
    tongue(PIT * 0.72, h * 0.75, 0xff9f5a);
    tongue(PIT * 0.42, h * 0.48, 0xffd36e);
    this.flameGlow.alpha = 0.4 + heat * 0.4 + this.gust * 0.3 + Math.sin(t * 9) * 0.04;
    if (near && Math.random() < dt * 20 * (0.3 + heat)) G.fx.emit('ember', PX + rnd(-PIT, PIT), fy - rnd(20, h * 0.6), 1);

    // tendrils reaching for runaways
    const tg = this.tendrils;
    tg.clear();
    this.pulls = this.pulls.filter((p) => (p.t -= dt) > 0 && p.c.body);
    for (const p of this.pulls) {
      const k = p.t / 0.45;
      const sx = PX + lick * 0.5, sy = fy - h * 0.6;
      const mx = (sx + p.c.x) / 2, my = Math.min(sy, p.c.y) - 120;
      tg.moveTo(sx, sy).quadraticCurveTo(mx, my, p.c.x, p.c.y).stroke({ width: 26 * k + 4, color: 0xff7a4c, alpha: 0.85, cap: 'round' });
      tg.moveTo(sx, sy).quadraticCurveTo(mx, my, p.c.x, p.c.y).stroke({ width: 10 * k + 2, color: 0xffd36e, alpha: 0.9, cap: 'round' });
    }
    this.bellows.scale.y = 1 + this.bellowsW.update(dt) * 0.05;
    this.rack.rotation = 0;
    this.setAmbient(0.2 + heat * 0.25);
  }
}
