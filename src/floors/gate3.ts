import Matter from 'matter-js';
import { Container, Graphics, Text } from 'pixi.js';
import { G } from '../engine/game';
import { sfx } from '../engine/audio';
import { GATE_PLAQUES } from '../data/plaques';
import { clamp, GateFloor, Wobble, type PointerHit } from './floor';
import type { Critter } from '../critters/critter';

const { Body } = Matter;
const X0 = 420, X1 = 880; // the press head
const CX = (X0 + X1) / 2;
const HEAD_H = 130;

type PressState = 'up' | 'slam' | 'down' | 'rise' | 'drag';

/** Gate 3 · al-Hutamah, the Crusher: an ornate press that stomps critters into paper rugs. */
export class Gate3 extends GateFloor {
  readonly name = 'Gate 3 · al-Hutamah';
  readonly plaque = GATE_PLAQUES[3];

  private head = new Container();
  private rod = new Graphics();
  private body: Matter.Body;
  private state: PressState = 'up';
  private y: number; // head bottom
  private upY: number;
  private downY: number;
  private v = 0;
  private holdT = 0;
  private squashed = new Set<Critter>();
  private walls: { g: Graphics; w: Wobble; x: number; dir: number; body: Matter.Body }[] = [];
  private stomp = new Container();
  private stompW = new Wobble(140, 8);
  private sign: Text;
  private signW = new Wobble(60, 4);
  private shake = 0;
  private days = 0;
  private dayT = 0;

  constructor() {
    super(3, { wall: [[0, '#2e1838'], [0.6, '#5a2844'], [1, '#8a3c48']], floor: 0x3e1c38, lip: 0x8a4a58, brick: 0.06 });
    const L = G.layers;
    const fy = this.floorY;
    this.upY = this.top + 330;
    this.downY = fy - 54;
    this.y = this.upY;

    // "days without a pancake" board
    const board = new Graphics();
    board.roundRect(90, this.top + 70, 360, 120, 18).fill(0x2a1230);
    board.roundRect(102, this.top + 82, 336, 96, 12).fill(0x3e1c42);
    L.bg.addChild(board);
    const cap = new Text({ text: 'DAYS WITHOUT A PANCAKE', style: { fontFamily: 'Baloo 2, system-ui', fontWeight: '800', fontSize: 22, fill: 0xffd36e, letterSpacing: 1 } });
    cap.anchor.set(0.5);
    cap.position.set(270, this.top + 108);
    this.sign = new Text({ text: '0', style: { fontFamily: 'Baloo 2, system-ui', fontWeight: '800', fontSize: 52, fill: 0xff6f61 } });
    this.sign.anchor.set(0.5);
    this.sign.position.set(270, this.top + 150);
    L.bg.addChild(cap, this.sign);

    // press: rod + ornate terracotta head with gold bands
    L.back.addChild(this.rod);
    const hg = new Graphics();
    const w = X1 - X0;
    hg.roundRect(-w / 2, -HEAD_H, w, HEAD_H, 22).fill(0xc8643c);
    hg.roundRect(-w / 2, -HEAD_H + 14, w, 18, 8).fill(0xffd36e);
    hg.roundRect(-w / 2, -26, w, 26, 12).fill(0x9a4a2e);
    for (let i = 0; i < 7; i++) {
      const x = -w / 2 + 34 + i * ((w - 68) / 6);
      const star: number[] = [];
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const r = k % 2 ? 9 : 16;
        star.push(x + Math.cos(a) * r, -66 + Math.sin(a) * r);
      }
      hg.poly(star).fill(0xffd36e);
      hg.circle(x, -66, 5).fill(0xc8643c);
    }
    hg.roundRect(-60, -HEAD_H - 30, 120, 34, 12).fill(0x8a3a2a);
    this.head.addChild(hg);
    L.front.addChild(this.head);
    this.body = this.wall(CX, this.y - HEAD_H / 2, w, HEAD_H, { label: 'press', friction: 0.6 });

    // springy accordion side walls
    for (const [x, dir] of [[48, 1], [1152, -1]] as const) {
      const g = new Graphics();
      L.back.addChild(g);
      const body = this.wall(x - dir * 18, fy - 210, 36, 420, { label: 'accordion', restitution: 1.05, friction: 0.02 });
      this.walls.push({ g, w: new Wobble(160, 7), x, dir, body });
    }

    // the stomp lever (big red mushroom button on a post)
    const st = new Graphics();
    st.roundRect(-14, -110, 28, 110, 10).fill(0x3a2240);
    st.ellipse(0, -112, 46, 18).fill(0xa8323c);
    st.ellipse(0, -122, 42, 22).fill(0xff4f5a);
    st.ellipse(-12, -130, 12, 6).fill({ color: 0xffffff, alpha: 0.5 });
    this.stomp.addChild(st);
    this.stomp.position.set(1040, fy);
    L.back.addChild(this.stomp);
  }

  pointerDown(x: number, y: number): PointerHit | null {
    const base = super.pointerDown(x, y);
    if (base) return base;
    if (Math.abs(x - 1040) < 60 && y > this.floorY - 160 && y < this.floorY) {
      return { move() {}, up: () => { this.stompW.kick(-8); this.slam(); } };
    }
    if (x > X0 && x < X1 && y > this.y - HEAD_H - 40 && y < this.y + 10) {
      const off = this.y - y;
      let moved = false;
      return {
        move: (_mx, my) => {
          moved = true;
          this.state = 'drag';
          this.drag(clamp(my + off, this.upY - 120, this.downY));
        },
        up: () => {
          if (!moved) this.slam();
          else { this.state = 'rise'; this.v = 0; }
        },
      };
    }
    return null;
  }

  slam() {
    if (this.state === 'slam' || this.state === 'down') return;
    this.state = 'slam';
    this.v = 0;
    this.squashed.clear();
    sfx.whoosh();
  }

  private drag(ny: number) {
    if (ny > this.y) this.crushBetween(this.y, ny);
    this.y = ny;
    if (this.y >= this.downY - 1) this.landed();
  }

  /** any critter whose top the head passes through gets pressed flat */
  private crushBetween(_y0: number, y1: number) {
    for (const c of this.crits()) {
      if (c.held || c.flat || c.state === 'ko' && c.flat) continue;
      const half = c.def.shape.kind === 'box' ? c.def.shape.h / 2 : c.def.r;
      if (c.x < X0 - 10 || c.x > X1 + 10) continue;
      if (c.y - half < y1 && c.y > y1 - half * 2 - 40) {
        c.flatten(2.2);
        Body.setPosition(c.body, { x: clamp(c.x, X0 + 30, X1 - 30), y: this.floorY - half * 0.32 - 2 });
        Body.setVelocity(c.body, { x: 0, y: 0 });
        c.hurt(34, 'crush');
        this.squashed.add(c);
        G.fx.emit('star', c.x, this.floorY - 30, 6, { size: 0.8 });
        sfx.crunch();
      }
    }
  }

  private landed() {
    if (this.state === 'down') return;
    this.state = 'down';
    this.holdT = 0.7;
    this.shake = 1;
    sfx.thud(1);
    sfx.crunch();
    G.fx.emit('smoke', X0, this.floorY - 20, 8, { vx: -200, tint: 0xb08a9a, spread: 1.5 });
    G.fx.emit('smoke', X1, this.floorY - 20, 8, { vx: 200, tint: 0xb08a9a, spread: 1.5 });
    if (this.squashed.size) {
      this.days = 0;
      this.dayT = 0;
      this.sign.text = '0';
      this.signW.kick(6);
    }
    if (this.squashed.size >= 2) G.discover('g3-stack', [...this.squashed][0]);
  }

  onCollide(a: Matter.Body, b: Matter.Body, speed: number) {
    for (const w of this.walls) {
      if ((a === w.body || b === w.body) && speed > 3) {
        w.w.kick(Math.min(10, speed * 0.6));
        sfx.boing(0.8);
      }
    }
  }

  step() {
    if (this.state === 'slam') {
      this.v = Math.min(this.v + 3.2, 60);
      const ny = Math.min(this.downY, this.y + this.v);
      this.crushBetween(this.y, ny);
      this.y = ny;
      if (this.y >= this.downY) this.landed();
    } else if (this.state === 'rise') {
      this.y = Math.max(this.upY, this.y - 7);
      if (this.y <= this.upY) this.state = 'up';
    } else if (this.state === 'up') {
      this.y = this.upY + Math.sin(G.time * 1.2) * 4;
    }
    Body.setPosition(this.body, { x: CX, y: this.y - HEAD_H / 2 });
  }

  update(dt: number, camY: number, near: boolean) {
    super.update(dt, camY, near);
    if (this.state === 'down') {
      this.holdT -= dt;
      if (this.holdT <= 0) { this.state = 'rise'; sfx.creak(); }
    }
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const sx = Math.sin(G.time * 60) * this.shake * 8;
    this.head.position.set(CX + sx, this.y);
    const r = this.rod;
    r.clear();
    r.roundRect(CX - 30, this.top, 60, this.y - HEAD_H - this.top - 20, 12).fill(0x4a4670);
    r.roundRect(CX - 14, this.top, 28, this.y - HEAD_H - this.top - 20, 8).fill(0x6a66a0);
    r.roundRect(CX - 70, this.top, 140, 30, 10).fill(0x3a3660);
    for (const w of this.walls) {
      const sq = w.w.update(dt);
      const g = w.g;
      g.clear();
      const depth = 40 * (1 - clamp(sq * 0.08, -0.4, 0.6));
      const n = 9, top = this.floorY - 420, h = 420 / n;
      for (let i = 0; i < n; i++) {
        const y = top + i * h;
        const x0 = w.dir > 0 ? 0 : 1200;
        g.poly([x0, y, x0 + w.dir * depth, y + h / 2, x0, y + h]).fill(i % 2 ? 0xd9a07a : 0xc8643c);
      }
    }
    this.stomp.scale.y = 1 + this.stompW.update(dt) * 0.03;
    this.sign.scale.set(1 + this.signW.update(dt) * 0.05);
    // a "day" here is twenty seconds; the record is not long
    this.dayT += dt;
    if (this.dayT > 20) { this.dayT = 0; this.days++; this.sign.text = String(this.days); this.signW.kick(3); }
    this.setAmbient(0.15);
  }
}
