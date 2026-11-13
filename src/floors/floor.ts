import Matter from 'matter-js';
import { Container, Graphics, Sprite } from 'pixi.js';
import { G, gateBottom, gateFloor, gateTop, TRAP_SIDE, trapSpan } from '../engine/game';
import { glowDot, vGradient } from '../engine/textures';
import { sfx } from '../engine/audio';
import type { Critter } from '../critters/critter';

const { Bodies, Composite, Constraint } = Matter;

export const CAT_WORLD = 0x0001;
export const CAT_CRITTER = 0x0002;
export const CAT_TOOL = 0x0004;
export const CAT_PROP = 0x0008;

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerpColor = (a: number, b: number, t: number) => {
  const ar = a >> 16, ag = (a >> 8) & 255, ab = a & 255;
  const br = b >> 16, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};

export interface PlaqueEntry {
  tag: 'q' | 'h' | 't' | 'n'; // Qur'an, hadith, tafsir, note
  head: string;
  body: string;
}
export interface Plaque {
  title: string;
  lead: string;
  entries: PlaqueEntry[];
}

export interface PointerHit {
  move(x: number, y: number): void;
  up(x: number, y: number, tapped: boolean): void;
}

/** One storey of the dollhouse. Coordinates are world pixels. */
export abstract class Floor {
  abstract readonly index: number;
  abstract readonly name: string;
  abstract readonly top: number;
  abstract readonly bottom: number;
  abstract readonly plaque: Plaque;
  /** world y the camera centres on for this floor */
  abstract readonly focusY: number;

  /** props the pointer can grab/tap. Return a handler to claim the gesture. */
  pointerDown(_x: number, _y: number): PointerHit | null { return null; }
  /** fixed-step physics hook */
  step(): void {}
  /** per-frame visuals; `near` is false when the camera is far away (skip particle spam) */
  update(_dt: number, _camY: number, _near: boolean): void {}
  /** a collision involving a body of this floor (or a critter on it) */
  onCollide(_a: Matter.Body, _b: Matter.Body, _speed: number): void {}
  /** where a critter dropped in from the tray appears */
  spawnPoint(): { x: number; y: number } { return { x: rnd(200, 1000), y: this.top + 140 }; }
  /** tongs tapped a critter on this floor; return true if the floor handled it */
  onTongs(_c: Critter): boolean { return false; }

  crits() { return G.critters.filter((c) => c.y >= this.top && c.y < this.bottom); }

  // ---- helpers ----
  protected wall(x: number, y: number, w: number, h: number, opts: Matter.IChamferableBodyDefinition = {}) {
    const b = Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 0.5, restitution: 0.2, label: 'world', collisionFilter: { category: CAT_WORLD }, ...opts });
    Composite.add(G.engine.world, b);
    return b;
  }
  /** a static bar from (x0,y0) to (x1,y1) */
  protected segment(x0: number, y0: number, x1: number, y1: number, thick: number, opts: Matter.IChamferableBodyDefinition = {}) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    return this.wall((x0 + x1) / 2, (y0 + y1) / 2, len, thick, { angle: Math.atan2(y1 - y0, x1 - x0), ...opts });
  }
  protected glow(x: number, y: number, size: number, tint: number, alpha = 0.6) {
    const s = new Sprite(glowDot());
    s.anchor.set(0.5);
    s.position.set(x, y);
    s.width = s.height = size;
    s.tint = tint;
    s.alpha = alpha;
    G.layers.glow.addChild(s);
    return s;
  }
}

/** Drag any dynamic body with a soft spring (fruit, mallet, ...). */
export function dragBody(body: Matter.Body, x: number, y: number, stiffness = 0.12, onUp?: (tapped: boolean) => void): PointerHit {
  const con = Constraint.create({
    pointA: { x, y },
    bodyB: body,
    pointB: { x: x - body.position.x, y: y - body.position.y },
    stiffness,
    damping: 0.08,
    length: 0,
  });
  Composite.add(G.engine.world, con);
  return {
    move(mx, my) { con.pointA = { x: mx, y: my }; },
    up(_x, _y, tapped) {
      Composite.remove(G.engine.world, con);
      onUp?.(tapped);
    },
  };
}

/** Little juice helper: a value that springs back to 0 after a poke. */
export class Wobble {
  v = 0;
  a = 0;
  constructor(public k = 90, public d = 6) {}
  kick(n: number) { this.v += n; }
  update(dt: number) {
    this.v += (-this.k * this.a - this.d * this.v) * dt;
    this.a += this.v * dt;
    return this.a;
  }
}

/** hanging lantern (fanous style) */
export function drawLantern(color = 0xffc46b, body = 0xa64b5e) {
  const c = new Container();
  const g = new Graphics();
  g.rect(-2, -60, 4, 46).fill(0x3a2240);
  g.circle(0, -60, 6).fill(0x3a2240);
  g.moveTo(-24, -14).bezierCurveTo(-24, -30, 24, -30, 24, -14).closePath().fill(body);
  g.circle(0, -30, 5).fill(body);
  g.moveTo(-22, -12).lineTo(22, -12).lineTo(28, 22).bezierCurveTo(20, 46, -20, 46, -28, 22).closePath().fill(color);
  g.moveTo(-9, -10).lineTo(9, -10).lineTo(10, 38).lineTo(-10, 38).closePath().fill({ color: 0xffffff, alpha: 0.35 });
  g.rect(-26, -14, 52, 6).fill(body);
  g.moveTo(-26, 22).lineTo(26, 22).lineTo(16, 30).lineTo(-16, 30).closePath().fill({ color: body, alpha: 0.85 });
  g.moveTo(-10, 44).bezierCurveTo(-6, 54, 6, 54, 10, 44).closePath().fill(body);
  g.circle(0, 58, 5).fill(body);
  c.addChild(g);
  return c;
}

/** Trapdoor in a gate's floor plus the lever that opens it. Drops critters to the gate below. */
export class Trapdoor {
  readonly x0: number;
  readonly x1: number;
  readonly lever = new Container();
  readonly leverX: number;
  private g = new Graphics();
  private body: Matter.Body;
  private openT = 0;
  private angle = 0;
  private leverAngle = -0.55;

  constructor(private floorY: number, private side: 'left' | 'right') {
    const s = trapSpan(side);
    this.x0 = s.x0;
    this.x1 = s.x1;
    this.leverX = side === 'left' ? s.x1 + 50 : s.x0 - 50;
    const L = G.layers;
    // the shaft through the floor slab
    const shaft = new Sprite(vGradient('trap-shaft', [[0, '#12060f'], [1, '#3b1440']]));
    shaft.position.set(this.x0, floorY);
    shaft.width = this.x1 - this.x0;
    shaft.height = 100;
    L.bg.addChild(shaft);
    L.front.addChild(this.g);
    this.body = Bodies.rectangle((this.x0 + this.x1) / 2, floorY + 14, this.x1 - this.x0, 28, {
      isStatic: true, label: 'trapdoor', friction: 0.5, collisionFilter: { category: CAT_WORLD },
    });
    Composite.add(G.engine.world, this.body);
    const lv = new Graphics();
    lv.roundRect(-8, -120, 16, 120, 8).fill(0x5a3a2a);
    lv.circle(0, -124, 20).fill(0xff6f61);
    lv.circle(-6, -130, 6).fill({ color: 0xffffff, alpha: 0.5 });
    this.lever.addChild(lv);
    this.lever.position.set(this.leverX, floorY - 6);
    const base = new Graphics().roundRect(this.leverX - 30, floorY - 18, 60, 20, 10).fill(0x3a2240);
    L.back.addChild(this.lever, base);
  }

  open() {
    if (this.openT > 0) { this.openT = Math.max(this.openT, 2.5); return; }
    this.openT = 3;
    sfx.creak();
    this.body.collisionFilter.mask = 0;
  }

  pointerDown(x: number, y: number): PointerHit | null {
    if (Math.abs(x - this.leverX) < 60 && y > this.floorY - 170 && y < this.floorY + 10) {
      const y0 = y;
      let pulled = false;
      return {
        move: (_mx, my) => { if (!pulled && my - y0 > 30) { pulled = true; this.open(); } },
        up: () => { if (!pulled) this.open(); },
      };
    }
    return null;
  }

  update(dt: number) {
    if (this.openT > 0) {
      this.openT -= dt;
      if (this.openT <= 0) {
        this.body.collisionFilter.mask = 0xffffffff;
        sfx.thud(0.6);
      }
    }
    const open = this.openT > 0;
    const dir = this.side === 'left' ? 1 : -1;
    this.angle += ((open ? 1.45 : 0) - this.angle) * Math.min(1, dt * 10);
    this.leverAngle += ((open ? 0.65 : -0.55) - this.leverAngle) * Math.min(1, dt * 12);
    this.lever.rotation = this.leverAngle * dir;
    const g = this.g;
    g.clear();
    const len = this.x1 - this.x0;
    const hx = this.side === 'left' ? this.x0 : this.x1; // hinge
    const a = this.angle * dir;
    const ca = Math.cos(a), sa = Math.sin(a);
    const p = (lx: number, ly: number) => {
      const X = lx * dir;
      return [hx + X * ca - ly * sa, this.floorY + X * sa + ly * ca];
    };
    g.poly([...p(0, 0), ...p(len, 0), ...p(len, 26), ...p(0, 26)]).fill(0x9a6a48);
    for (const k of [0.25, 0.5, 0.75]) g.poly([...p(len * k - 2, 2), ...p(len * k + 2, 2), ...p(len * k + 2, 24), ...p(len * k - 2, 24)]).fill(0x7a4e34);
    g.poly([...p(len - 30, 6), ...p(len - 10, 6), ...p(len - 10, 18), ...p(len - 30, 18)]).fill(0xffd36e);
  }
}

export interface GateStyle {
  wall: [number, string][]; // vertical gradient stops for the back wall
  floor: number;
  lip: number;
  brick?: number; // alpha of the faint wall pattern
}

/** Shared shell for Gates 1-6 (Gate 7 has no floor): back wall, cutaway earth, floor slab, trapdoor. */
export abstract class GateFloor extends Floor {
  readonly top: number;
  readonly bottom: number;
  readonly floorY: number;
  readonly focusY: number;
  readonly trap: Trapdoor | null;
  /** where the trapdoor of the gate above opens into this ceiling */
  readonly ceilingHole: { x0: number; x1: number } | null;

  constructor(readonly index: number, style: GateStyle) {
    super();
    const n = index;
    this.top = gateTop(n);
    this.floorY = gateFloor(n);
    this.bottom = gateBottom(n);
    this.focusY = (this.top + this.floorY) / 2 + 20;
    this.ceilingHole = n > 1 ? trapSpan(TRAP_SIDE[n - 1]) : null;
    const L = G.layers;

    const wallBg = new Sprite(vGradient('wall-' + n, style.wall));
    wallBg.position.set(0, this.top);
    wallBg.width = 1200;
    wallBg.height = this.floorY - this.top;
    L.bg.addChild(wallBg);
    const bricks = new Graphics();
    const a = style.brick ?? 0.05;
    for (let row = 0; row < 15; row++) {
      const y = this.top + 30 + row * 56;
      const off = row % 2 ? 0 : 60;
      for (let x = -60 + off; x < 1200; x += 120) {
        if (Math.random() < 0.35) continue;
        bricks.roundRect(x + 4, y, 112, 48, 14).fill({ color: 0xffffff, alpha: a + Math.random() * a * 0.6 });
      }
    }
    L.bg.addChild(bricks);

    // cutaway earth on both sides of the dollhouse
    const earth = new Graphics();
    earth.rect(-1400, this.top, 1400, this.bottom - this.top).fill(0x2a1230);
    earth.rect(1200, this.top, 1400, this.bottom - this.top).fill(0x2a1230);
    earth.rect(-22, this.top, 22, this.bottom - this.top).fill(0x5a2a4c);
    earth.rect(1200, this.top, 22, this.bottom - this.top).fill(0x5a2a4c);
    for (let i = 0; i < 16; i++) {
      const x = Math.random() < 0.5 ? rnd(-1300, -60) : rnd(1260, 2500);
      earth.ellipse(x, rnd(this.top + 40, this.bottom - 20), rnd(14, 40), rnd(8, 20)).fill({ color: 0x3e1c42, alpha: 0.8 });
    }
    L.front.addChild(earth);
    this.wall(-40, (this.top + this.bottom) / 2, 80, this.bottom - this.top + 40);
    this.wall(1240, (this.top + this.bottom) / 2, 80, this.bottom - this.top + 40);

    // floor slab, leaving the trapdoor gap open
    const side = n <= 6 ? TRAP_SIDE[n] : null;
    const span = side ? trapSpan(side) : null;
    const floor = new Graphics();
    const slab = (x0: number, x1: number) => {
      floor.rect(x0, this.floorY, x1 - x0, 100).fill(style.floor);
      floor.rect(x0, this.floorY, x1 - x0, 16).fill(style.lip);
      for (let x = x0 + 40; x < x1 - 60; x += 110) floor.roundRect(x, this.floorY + 36, 80, 12, 6).fill({ color: 0xffffff, alpha: 0.05 });
    };
    if (span) {
      slab(0, span.x0);
      slab(span.x1, 1200);
      this.wall(span.x0 / 2 - 20, this.floorY + 50, span.x0 + 40, 100);
      this.wall((span.x1 + 1240) / 2, this.floorY + 50, 1240 - span.x1, 100);
      this.trap = new Trapdoor(this.floorY, side!);
    } else {
      slab(0, 1200);
      this.wall(600, this.floorY + 50, 1280, 100);
      this.trap = null;
    }
    L.front.addChild(floor);
  }

  spawnPoint() {
    const h = this.ceilingHole;
    return h ? { x: rnd(h.x0 + 70, h.x1 - 70), y: this.top - 60 } : { x: rnd(200, 1000), y: this.top + 140 };
  }

  pointerDown(x: number, y: number): PointerHit | null {
    return this.trap?.pointerDown(x, y) ?? null;
  }

  update(dt: number, _camY: number, _near: boolean) {
    this.trap?.update(dt);
  }

  /** ambient warmth for critters standing in this room (0..1) */
  protected setAmbient(v: number) {
    for (const c of this.crits()) if (c.soak < 0.1) c.ambient = v;
  }
}
