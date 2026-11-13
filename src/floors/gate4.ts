import Matter from 'matter-js';
import { Container, Graphics, Text } from 'pixi.js';
import { G } from '../engine/game';
import { sfx } from '../engine/audio';
import { GATE_PLAQUES } from '../data/plaques';
import { CAT_PROP, CAT_WORLD, CAT_CRITTER, dragBody, GateFloor, rnd, Wobble, type PointerHit } from './floor';
import type { Critter } from '../critters/critter';

const { Bodies, Body, Composite } = Matter;
const TX = 760; // trunk

interface Fruit {
  g: Container;
  flame: Graphics;
  body: Matter.Body | null; // null while still hanging
  slot: number;
  age: number;
  held: boolean;
}

function drawFruit() {
  const c = new Container();
  const g = new Graphics();
  const spikes: number[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const r = i % 2 ? 22 : 32;
    spikes.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.poly(spikes).fill(0x6a1830);
  g.circle(0, 0, 22).fill(0x9a2436);
  g.moveTo(-10, -6).lineTo(-2, 2).lineTo(-8, 10).stroke({ width: 3, color: 0xff8a4c });
  g.moveTo(8, -10).lineTo(4, 0).lineTo(12, 6).stroke({ width: 3, color: 0xffb36b });
  g.ellipse(-8, -10, 6, 3).fill({ color: 0xffffff, alpha: 0.3 });
  const flame = new Graphics();
  flame.moveTo(-12, 0).bezierCurveTo(-14, -12, -4, -22, 0, -34).bezierCurveTo(4, -22, 14, -12, 12, 0).closePath().fill(0xff6f61);
  flame.moveTo(-6, 0).bezierCurveTo(-7, -8, -2, -14, 0, -22).bezierCurveTo(2, -14, 7, -8, 6, 0).closePath().fill(0xffd36e);
  flame.y = -24;
  c.addChild(flame, g);
  return { c, flame };
}

/** Gate 4 · al-Sa'ir: the Zaqqum tree. Force-feed its burning fruit to critters who really, really don't want it. */
export class Gate4 extends GateFloor {
  readonly name = 'Gate 4 · al-Sa’ir';
  readonly plaque = GATE_PLAQUES[4];

  private tree = new Container();
  private treeW = new Wobble(40, 3);
  private slots: { x: number; y: number }[] = [];
  private fruits: Fruit[] = [];

  constructor() {
    super(4, { wall: [[0, '#2c1230'], [0.55, '#5e2238'], [1, '#a8403a']], floor: 0x3a1a30, lip: 0x8a4450, brick: 0.04 });
    const L = G.layers;
    const fy = this.floorY;

    // today's special
    const board = new Graphics();
    board.roundRect(300, this.top + 160, 230, 190, 16).fill(0x2a1230);
    board.roundRect(312, this.top + 172, 206, 166, 10).fill(0x23302a);
    board.roundRect(400, this.top + 140, 30, 30, 8).fill(0x3a2240);
    L.bg.addChild(board);
    const menu = new Text({
      text: 'TODAY’S SPECIAL\nZaqqum\nZaqqum\nZaqqum',
      style: { fontFamily: 'Baloo 2, system-ui', fontWeight: '800', fontSize: 24, fill: 0xfff4e6, align: 'center', lineHeight: 34 },
    });
    menu.anchor.set(0.5);
    menu.position.set(415, this.top + 256);
    L.bg.addChild(menu);

    // the tree: twisted trunk, thorny branches
    const g = new Graphics();
    const top = this.top;
    g.moveTo(TX - 60, fy).bezierCurveTo(TX - 20, fy - 200, TX - 90, fy - 380, TX - 20, top + 360)
      .lineTo(TX + 30, top + 360).bezierCurveTo(TX - 20, fy - 380, TX + 40, fy - 200, TX + 60, fy).closePath().fill(0x3e2238);
    const branch = (x0: number, y0: number, x1: number, y1: number, w: number) => {
      const nx = -(y1 - y0), ny = x1 - x0;
      const l = Math.hypot(nx, ny);
      const ox = (nx / l) * w, oy = (ny / l) * w;
      g.poly([x0 - ox, y0 - oy, x1, y1, x0 + ox, y0 + oy]).fill(0x3e2238);
      for (let k = 0.25; k < 1; k += 0.25) {
        const bx = x0 + (x1 - x0) * k, by = y0 + (y1 - y0) * k;
        g.poly([bx - 4, by, bx + 4, by, bx + ox * 1.8, by + oy * 1.8 - 12]).fill(0x5a3050);
      }
    };
    branch(TX, top + 380, TX - 280, top + 230, 18);
    branch(TX, top + 380, TX + 290, top + 210, 18);
    branch(TX, top + 370, TX - 120, top + 120, 14);
    branch(TX, top + 370, TX + 140, top + 110, 14);
    branch(TX - 150, top + 300, TX - 330, top + 380, 10);
    branch(TX + 160, top + 290, TX + 360, top + 380, 10);
    // ember-leaves
    for (let i = 0; i < 26; i++) {
      const a = rnd(-Math.PI, 0);
      const r = rnd(160, 330);
      g.ellipse(TX + Math.cos(a) * r * 1.2, top + 330 + Math.sin(a) * r * 0.8, rnd(14, 26), rnd(7, 12)).fill({ color: i % 3 ? 0x7a2a3a : 0xc2453e, alpha: 0.9 });
    }
    g.ellipse(TX, fy, 110, 16).fill(0x2a1230);
    this.tree.addChild(g);
    this.tree.pivot.set(TX, fy);
    this.tree.position.set(TX, fy);
    L.back.addChild(this.tree);
    this.glow(TX, top + 300, 800, 0xff6f4c, 0.3);
    this.wall(TX, fy - 150, 70, 300, { label: 'trunk' });

    this.slots = [
      [TX - 250, 250], [TX - 170, 205], [TX - 90, 150], [TX + 110, 140], [TX + 200, 200], [TX + 270, 245], [TX - 300, 390], [TX + 320, 390],
    ].map(([x, y]) => ({ x, y: top + y + 30 }));
    this.slots.forEach((_, i) => this.grow(i));
  }

  private grow(slot: number) {
    const { c, flame } = drawFruit();
    const s = this.slots[slot];
    c.position.set(s.x, s.y);
    c.scale.set(0.1);
    G.layers.back.addChild(c);
    this.fruits.push({ g: c, flame, body: null, slot, age: 0, held: false });
  }

  private drop(f: Fruit, vx = 0, vy = 0) {
    if (f.body) return;
    const b = Bodies.circle(f.g.x, f.g.y, 26, {
      label: 'zaqqum', restitution: 0.4, friction: 0.4, density: 0.002,
      collisionFilter: { category: CAT_PROP, mask: CAT_WORLD | CAT_CRITTER | CAT_PROP },
    });
    Body.setVelocity(b, { x: vx, y: vy });
    Composite.add(G.engine.world, b);
    f.body = b;
    f.age = 0;
    G.layers.back.removeChild(f.g);
    G.layers.front.addChild(f.g);
    setTimeout(() => this.grow(f.slot), 4500);
    // keep the floor tidy
    const loose = this.fruits.filter((k) => k.body);
    if (loose.length > 7) this.fizzle(loose[0]);
  }

  private fizzle(f: Fruit) {
    if (f.body) Composite.remove(G.engine.world, f.body);
    G.fx.emit('smoke', f.g.x, f.g.y, 6, { tint: 0x8a6f8e });
    f.g.destroy({ children: true });
    this.fruits = this.fruits.filter((k) => k !== f);
  }

  private eat(f: Fruit, c: Critter) {
    if (c.state === 'ko') return;
    c.feed();
    sfx.crunch();
    G.fx.emit('spark', f.g.x, f.g.y, 10);
    this.fizzle(f);
  }

  pointerDown(x: number, y: number): PointerHit | null {
    const base = super.pointerDown(x, y);
    if (base) return base;
    // grab a fruit (hanging or loose)
    for (const f of this.fruits) {
      if (Math.hypot(x - f.g.x, y - f.g.y) < 46 && f.g.scale.x > 0.8) {
        if (!f.body) { this.drop(f); sfx.pop(); this.treeW.kick(1.5); }
        f.held = true;
        return dragBody(f.body!, x, y, G.tool === 'tongs' ? 0.5 : 0.15, () => { f.held = false; });
      }
    }
    // shake the trunk
    if (Math.abs(x - TX) < 80 && y > this.top + 330 && y < this.floorY) {
      return { move() {}, up: () => this.shakeTree() };
    }
    return null;
  }

  private shakeTree() {
    this.treeW.kick(rnd(4, 6) * (Math.random() < 0.5 ? -1 : 1));
    sfx.creak();
    const hanging = this.fruits.filter((f) => !f.body && f.g.scale.x > 0.8);
    for (let i = 0; i < Math.min(hanging.length, 1 + Math.floor(Math.random() * 3)); i++) {
      const f = hanging.splice(Math.floor(Math.random() * hanging.length), 1)[0];
      this.drop(f, rnd(-3, 3), -2);
    }
    G.fx.emit('ember', TX + rnd(-200, 200), this.top + 300, 10, { spread: 4 });
  }

  onCollide(a: Matter.Body, b: Matter.Body, speed: number) {
    const fa = this.fruits.find((f) => f.body === a), fb = this.fruits.find((f) => f.body === b);
    const f = fa ?? fb;
    if (!f) return;
    const other = (fa ? b : a) as Matter.Body & { critter?: Critter };
    const c = other.parent && (other.parent as Matter.Body & { critter?: Critter }).critter;
    if (c && (f.held || speed > 6)) this.eat(f, c);
    else if (speed > 4) sfx.thud(0.3);
  }

  step() {
    // critters near a held fruit turn their faces away, mouths clamped
    const held = this.fruits.find((f) => f.held && f.body);
    for (const c of this.crits()) {
      if (c.held || c.state === 'ko') continue;
      if (held && Math.hypot(held.g.x - c.x, held.g.y - c.y) < 260) {
        c.mood = 'sour';
        if (!c.def.deadpan) c.facing = held.g.x > c.x ? -1 : 1;
      }
    }
  }

  update(dt: number, camY: number, near: boolean) {
    super.update(dt, camY, near);
    const t = G.time;
    const sw = this.treeW.update(dt);
    this.tree.rotation = sw * 0.02 + Math.sin(t * 0.7) * 0.004;
    for (const f of this.fruits) {
      f.age += dt;
      f.flame.scale.set(1 + Math.sin(t * 13 + f.slot) * 0.15, 1 + Math.sin(t * 17 + f.slot) * 0.2);
      if (f.body) {
        f.g.position.set(f.body.position.x, f.body.position.y);
        f.g.rotation = f.body.angle;
        if (near && Math.random() < dt * 4) G.fx.emit('ember', f.g.x, f.g.y - 30, 1);
        if (f.age > 25 && !f.held) { this.fizzle(f); break; }
      } else {
        f.g.scale.set(Math.min(1, f.g.scale.x + dt * 0.8));
        const s = this.slots[f.slot];
        f.g.position.set(s.x + this.tree.rotation * (this.floorY - s.y), s.y + Math.sin(t * 2 + f.slot) * 3);
      }
    }
    this.setAmbient(0.3 + G.tinker.heat * 0.2);
  }
}
