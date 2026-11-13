import Matter from 'matter-js';
import { Container, Graphics, Sprite } from 'pixi.js';
import { G, G1_FLOOR, G1_TOP, HOLE } from '../engine/game';
import { setSimmer, sfx } from '../engine/audio';
import { CAT_CRITTER, CAT_TOOL, CAT_WORLD, drawLantern, GateFloor, Wobble, type Plaque, type PointerHit } from './floor';
import { GATE1_PLAQUE } from '../data/plaques';
import { buildGate1Depth } from './depth';
import type { Critter } from '../critters/critter';

const { Bodies, Body, Composite } = Matter;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerpColor = (a: number, b: number, t: number) => {
  const ar = a >> 16, ag = (a >> 8) & 255, ab = a & 255;
  const br = b >> 16, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};

// Cauldron geometry (world px). Cut away like a dollhouse so you see inside.
const CX = (HOLE.x0 + HOLE.x1) / 2; // 700, right under the Rim's mouth
const RIM = 1430;
const IN_TOP = { l: CX - 300, r: CX + 300 };
const IN_BOT = { l: CX - 260, r: CX + 260, y: 1760 };
const LEVEL = 1478; // resting soup surface
const PARK = { x: 1128, y: 1575, rot: -Math.PI / 2 }; // lid leaning on the right wall
const SHUT = { x: CX, y: RIM - 18, rot: 0 };
const LADLE_REST = { x: CX + 170, y: 1560 };

type LidState = 'parked' | 'swing' | 'shut' | 'fly' | 'return';

export class Gate1 extends GateFloor {
  readonly name = 'Gate 1 · Jahannam';
  readonly plaque: Plaque = GATE1_PLAQUE;

  /** live temperature of the soup: below 0 means frozen solid */
  heatEff = 0.7;
  frozen = false;
  private swirl = 0;
  private fireBoost = 0;
  private soupBack = new Graphics();
  private soupFront = new Graphics();
  private potShell = new Container();
  private fire = new Container();
  private flames: { g: Graphics; ph: number; x: number; s: number }[] = [];
  private fireGlow!: Sprite;
  private potGlow!: Sprite;
  private shake = 0;
  private waveKick = 0;
  private ice: Matter.Body | null = null;

  // lid
  private lid = new Container();
  private lidState: LidState = 'parked';
  private lidT = 0;
  private lidBody: Matter.Body | null = null;
  private pressure = 0;
  private rattleT = 0;
  private lidFrom = { x: 0, y: 0, rot: 0 };

  // ladle
  private ladle = new Container();
  private ladleBody: Matter.Body;
  private ladleHead = { ...LADLE_REST };
  private ladleTarget = { ...LADLE_REST };
  private ladleHeld = false;
  private autoStir = 0;
  private lastAng = 0;
  private ladleVx = 0;


  private lanterns: { c: Container; w: Wobble; glow: Sprite; x: number }[] = [];
  private steamT = 0;
  private spinFound = new Set<string>();
  private depth: ReturnType<typeof buildGate1Depth>;

  constructor() {
    // the back wall is now a glowing haze; the layered hall (depth.ts) is painted in front of it
    super(1, { wall: [[0, '#4a1c48'], [0.4, '#8a3e62'], [0.75, '#c85a62'], [1, '#f08a66']], floor: 0x4a2244, lip: 0x8a4058, brick: 0, tiles: false });
    const L = G.layers;
    this.depth = buildGate1Depth(this.top, this.floorY, this.focusY);

    // ----- lanterns -----
    for (const lx of [260, 1120]) {
      const chain = new Graphics().rect(lx - 2, G1_TOP, 4, 70).fill(0x3a2240);
      L.back.addChild(chain);
      const lan = drawLantern(0xffb86b, 0x8a3a5e);
      lan.pivot.set(0, -60);
      lan.position.set(lx, G1_TOP + 70);
      L.back.addChild(lan);
      const glow = this.glow(lx, G1_TOP + 130, 320, 0xffb86b, 0.5);
      this.lanterns.push({ c: lan, w: new Wobble(30, 1.6), glow, x: lx });
    }

    // ----- hearth, logs, fire -----
    const hearth = new Graphics();
    hearth.ellipse(CX, G1_FLOOR + 4, 300, 26).fill(0x3a1834);
    for (let i = -3; i <= 3; i++) hearth.ellipse(CX + i * 80, G1_FLOOR - 4, 44, 22).fill(i % 2 ? 0x6a3050 : 0x5a2a4c);
    L.back.addChild(hearth);
    this.fireGlow = this.glow(CX, 1840, 760, 0xff7a3c, 0.75);
    this.potGlow = this.glow(CX, 1600, 900, 0xff8a5c, 0.25);
    for (let i = 0; i < 7; i++) {
      const x = CX - 180 + i * 60 + rnd(-10, 10);
      const g = new Graphics();
      const flame = (w: number, h: number, c: number) =>
        g.moveTo(0, 0).bezierCurveTo(-w, -h * 0.25, -w * 0.5, -h * 0.7, 0, -h).bezierCurveTo(w * 0.5, -h * 0.7, w, -h * 0.25, 0, 0).closePath().fill(c);
      flame(46, 120, 0xff6f61);
      flame(32, 88, 0xff9f5a);
      flame(18, 52, 0xffd36e);
      g.position.set(x, 1882);
      this.fire.addChild(g);
      this.flames.push({ g, ph: rnd(0, 6), x, s: rnd(0.8, 1.15) });
    }
    const logs = new Graphics();
    logs.roundRect(CX - 220, 1858, 440, 36, 18).fill(0x7a4a3a);
    logs.roundRect(CX - 170, 1870, 340, 30, 15).fill(0x8f5a44);
    logs.ellipse(CX - 210, 1876, 14, 16).fill(0xd9a07a);
    logs.ellipse(CX + 210, 1876, 14, 16).fill(0xd9a07a);
    logs.ellipse(CX - 160, 1886, 12, 13).fill(0xe6b48c);
    this.fire.addChild(logs);
    L.front.addChild(this.fire);
    this.wall(CX, 1876, 440, 48, { label: 'logs', chamfer: { radius: 18 } });

    // ----- the cauldron (cutaway) -----
    // inside back wall + soup depth
    const inside = new Graphics();
    inside.moveTo(IN_TOP.l, RIM - 10).lineTo(IN_BOT.l, IN_BOT.y).lineTo(IN_BOT.r, IN_BOT.y).lineTo(IN_TOP.r, RIM - 10).closePath().fill(0x1f1c46);
    inside.ellipse(CX, RIM - 6, 300, 26).fill(0x16143a);
    L.back.addChild(inside, this.soupBack);
    // shell: thick U with a lip, iron-indigo
    const shell = new Graphics();
    const OUT = [IN_TOP.l - 46, RIM - 6, IN_TOP.l - 96, 1640, IN_BOT.l - 20, IN_BOT.y + 44, CX, IN_BOT.y + 44];
    shell.moveTo(OUT[0], OUT[1]).bezierCurveTo(OUT[2], 1520, OUT[2], OUT[3], OUT[4], OUT[5])
      .lineTo(IN_BOT.r + 20, IN_BOT.y + 44).bezierCurveTo(IN_TOP.r + 96, 1640, IN_TOP.r + 96, 1520, IN_TOP.r + 46, RIM - 6)
      .lineTo(IN_TOP.r, RIM - 6).lineTo(IN_BOT.r, IN_BOT.y).lineTo(IN_BOT.l, IN_BOT.y).lineTo(IN_TOP.l, RIM - 6).closePath().fill(0x2f2c62);
    // shine on the left flank
    shell.moveTo(IN_TOP.l - 30, RIM + 30).bezierCurveTo(IN_TOP.l - 70, 1540, IN_TOP.l - 70, 1640, IN_BOT.l - 6, IN_BOT.y + 20)
      .lineTo(IN_BOT.l + 4, IN_BOT.y + 6).bezierCurveTo(IN_TOP.l - 40, 1640, IN_TOP.l - 40, 1540, IN_TOP.l - 12, RIM + 30).closePath().fill({ color: 0x6a66c0, alpha: 0.7 });
    // lip
    shell.roundRect(IN_TOP.l - 62, RIM - 24, 92, 34, 17).fill(0x4a46a0);
    shell.roundRect(IN_TOP.r - 30, RIM - 24, 92, 34, 17).fill(0x4a46a0);
    // handles
    shell.circle(IN_TOP.l - 104, 1500, 30).fill(0x2f2c62).circle(IN_TOP.l - 104, 1500, 16).cut();
    shell.circle(IN_TOP.r + 104, 1500, 30).fill(0x2f2c62).circle(IN_TOP.r + 104, 1500, 16).cut();
    // legs
    shell.roundRect(IN_BOT.l + 10, IN_BOT.y + 30, 40, G1_FLOOR - IN_BOT.y - 26, 14).fill(0x26234f);
    shell.roundRect(IN_BOT.r - 50, IN_BOT.y + 30, 40, G1_FLOOR - IN_BOT.y - 26, 14).fill(0x26234f);
    // star rivets
    for (const [x, y] of [[IN_TOP.l - 60, 1560], [IN_TOP.r + 60, 1560], [CX, IN_BOT.y + 24]]) shell.circle(x, y, 7).fill(0xffd36e);
    this.potShell.addChild(shell);
    L.front.addChild(this.soupFront, this.potShell);

    // pot physics: inner faces + outer flanks + bottom + legs
    const T = 36;
    this.segment(IN_TOP.l - T / 2, RIM - 10, IN_BOT.l - T / 2, IN_BOT.y, T, { friction: 0.1 });
    this.segment(IN_TOP.r + T / 2, RIM - 10, IN_BOT.r + T / 2, IN_BOT.y, T, { friction: 0.1 });
    this.wall(CX, IN_BOT.y + 20, IN_BOT.r - IN_BOT.l + 40, 44);
    this.segment(IN_TOP.l - 40, RIM - 8, IN_TOP.l - 92, 1620, 30);
    this.segment(IN_TOP.l - 92, 1620, IN_BOT.l - 10, IN_BOT.y + 40, 30);
    this.segment(IN_TOP.r + 40, RIM - 8, IN_TOP.r + 92, 1620, 30);
    this.segment(IN_TOP.r + 92, 1620, IN_BOT.r + 10, IN_BOT.y + 40, 30);
    this.wall(IN_BOT.l + 30, 1850, 40, 100);
    this.wall(IN_BOT.r - 30, 1850, 40, 100);
    // rounded lip caps so critters roll over the rim
    this.wall(IN_TOP.l - 16, RIM - 8, 44, 44, { chamfer: { radius: 21 } });
    this.wall(IN_TOP.r + 16, RIM - 8, 44, 44, { chamfer: { radius: 21 } });

    // ----- lid -----
    const lg = new Graphics();
    lg.moveTo(-330, 14).bezierCurveTo(-320, -40, -180, -78, 0, -80).bezierCurveTo(180, -78, 320, -40, 330, 14).closePath().fill(0x3b3784);
    lg.moveTo(-290, -2).bezierCurveTo(-260, -40, -150, -62, -40, -66).lineTo(-40, -50).bezierCurveTo(-140, -46, -240, -28, -270, 4).closePath().fill({ color: 0x7a76d0, alpha: 0.6 });
    lg.roundRect(-340, 4, 680, 22, 11).fill(0x4a46a0);
    lg.roundRect(-34, -112, 68, 38, 16).fill(0xffd36e);
    lg.circle(0, -116, 16).fill(0xffd36e);
    this.lid.addChild(lg);
    this.lid.position.set(PARK.x, PARK.y);
    this.lid.rotation = PARK.rot;
    L.front.addChild(this.lid);

    // ----- ladle -----
    const ld = new Graphics();
    ld.roundRect(-14, -400, 28, 380, 14).fill(0xd69a62);
    ld.roundRect(-6, -396, 8, 360, 4).fill({ color: 0xffffff, alpha: 0.25 });
    ld.circle(0, -390, 20).fill(0xb87a4a).circle(0, -390, 8).cut();
    ld.ellipse(0, 18, 70, 46).fill(0xb87a4a);
    ld.ellipse(0, 6, 56, 30).fill(0x8f5a36);
    ld.ellipse(-18, 0, 16, 8).fill({ color: 0xffffff, alpha: 0.3 });
    this.ladle.addChild(ld);
    L.front.addChild(this.ladle);
    this.ladleBody = Bodies.circle(LADLE_REST.x, LADLE_REST.y, 52, {
      label: 'ladle', frictionAir: 0, friction: 0.2, inertia: Infinity,
      collisionFilter: { category: CAT_TOOL, mask: CAT_CRITTER },
    });
    Body.setMass(this.ladleBody, 60);
    Composite.add(G.engine.world, this.ladleBody);

  }

  // ---------- interaction ----------

  pointerDown(x: number, y: number): PointerHit | null {
    // lid
    if (this.lidState === 'parked' && Math.abs(x - PARK.x) < 70 && Math.abs(y - PARK.y) < 340) {
      return { move() {}, up: () => this.slamLid() };
    }
    if (this.lidState === 'shut' && Math.abs(x - CX) < 340 && y > RIM - 140 && y < RIM + 10) {
      return { move() {}, up: () => { this.shake = Math.max(this.shake, 0.4); sfx.rattle(); this.pressure += 0.12; } };
    }
    // ladle: anywhere along the handle or the bowl
    if (this.onLadle(x, y)) {
      const off = { x: this.ladleHead.x - x, y: this.ladleHead.y - y };
      this.ladleHeld = true;
      this.autoStir = 0;
      const start = { x, y };
      let moved = false;
      return {
        move: (mx, my) => {
          if (Math.hypot(mx - start.x, my - start.y) > 10) moved = true;
          this.ladleTarget = { x: mx + off.x, y: my + off.y };
        },
        up: (_ux, _uy, tapped) => {
          this.ladleHeld = false;
          if (tapped && !moved) { this.autoStir = 2.6; sfx.swish(); }
        },
      };
    }
    const base = super.pointerDown(x, y);
    if (base) return base;
    // logs / fire
    if (Math.abs(x - CX) < 240 && y > 1800 && y < G1_FLOOR + 10) {
      return { move() {}, up: () => {
        this.fireBoost = 1;
        sfx.crackle();
        G.fx.emit('spark', x, 1850, 18, { spread: 1.3 });
      } };
    }
    // lanterns
    for (const l of this.lanterns) {
      if (Math.abs(x - l.x) < 50 && y > G1_TOP + 80 && y < G1_TOP + 200) {
        return { move() {}, up: () => {
          l.w.kick(rnd(2.5, 4) * (Math.random() < 0.5 ? -1 : 1));
          sfx.chime();
        } };
      }
    }
    // soup: splash
    if (!this.frozen && x > IN_TOP.l && x < IN_TOP.r && y > LEVEL - 30 && y < IN_BOT.y) {
      return { move() {}, up: () => {
        this.waveKick = 1;
        sfx.splash();
        G.fx.emit('drop', x, LEVEL, 10, { tint: this.soupColor() });
        G.fx.emit('bubble', x, LEVEL + 30, 6, { spread: 3 });
      } };
    }
    return null;
  }

  private onLadle(x: number, y: number) {
    const h = this.ladleHead;
    if (Math.hypot(x - h.x, y - h.y) < 80) return true;
    // distance to the handle segment
    const a = this.ladle.rotation;
    const ex = h.x + Math.sin(a) * 400, ey = h.y - Math.cos(a) * 400;
    const vx = ex - h.x, vy = ey - h.y;
    const t = clamp(((x - h.x) * vx + (y - h.y) * vy) / (vx * vx + vy * vy), 0, 1);
    return Math.hypot(x - (h.x + vx * t), y - (h.y + vy * t)) < 34;
  }

  slamLid() {
    if (this.lidState !== 'parked') return;
    this.lidState = 'swing';
    this.lidT = 0;
    this.lidFrom = { x: this.lid.x, y: this.lid.y, rot: this.lid.rotation };
    sfx.whoosh();
  }

  pullLever() { this.trap?.open(); }

  // ---------- physics ----------

  step() {
    const g = G.engine.gravity;
    const gs = g.y * g.scale;
    const t = G.time;

    // ladle: a heavy kinematic spoon that only bumps critters
    if (this.autoStir > 0) {
      const a = t * 3.2;
      this.ladleTarget = { x: CX + Math.cos(a) * 200, y: LEVEL + 90 + Math.sin(a) * 70 };
    } else if (!this.ladleHeld) {
      this.ladleTarget = { ...LADLE_REST, y: LADLE_REST.y + Math.sin(t * 1.3) * 6 };
    }
    const tgt = { x: clamp(this.ladleTarget.x, 60, 1140), y: clamp(this.ladleTarget.y, G1_TOP + 60, G1_FLOOR - 40) };
    if (tgt.x > IN_BOT.l - 40 && tgt.x < IN_BOT.r + 40) tgt.y = Math.min(tgt.y, IN_BOT.y - 46);
    const lb = this.ladleBody;
    const dx = clamp(tgt.x - lb.position.x, -40, 40), dy = clamp(tgt.y - lb.position.y, -40, 40);
    Body.setVelocity(lb, { x: dx * 0.5, y: dy * 0.5 });
    this.ladleHead = { x: lb.position.x, y: lb.position.y };
    this.ladleVx = dx * 0.5;
    // stirring: angle swept around the soup centre turns into swirl
    const inSoup = !this.frozen && lb.position.y > LEVEL - 40 && lb.position.x > IN_TOP.l && lb.position.x < IN_TOP.r;
    const ang = Math.atan2(lb.position.y - (LEVEL + 100), lb.position.x - CX);
    let dA = ang - this.lastAng;
    dA = Math.atan2(Math.sin(dA), Math.cos(dA));
    this.lastAng = ang;
    if (inSoup) {
      this.swirl = clamp(this.swirl + dA * 0.9 + Math.sign(dA) * Math.abs(this.ladleVx) * 0.004, -3, 3);
      if (Math.abs(this.ladleVx) > 6 && Math.random() < 0.2) sfx.swish();
    }
    this.swirl *= 0.985;

    // soup: buoyancy, drag, boil-bobbing, swirl
    const level = this.levelAt(CX);
    for (const c of G.critters) {
      if (c.y < G1_TOP - 100 || c.y > this.bottom) continue;
      const b = c.body;
      const inside = c.x > IN_TOP.l - 10 && c.x < IN_TOP.r + 10 && c.y > RIM - 260 && c.y < IN_BOT.y + 20;
      if (!inside || this.frozen || c.held) {
        c.soak = 0;
        continue;
      }
      const depth = c.y + c.def.r * 0.5 - this.levelAt(c.x);
      const soak = clamp(depth / (c.def.r * 1.4), 0, 1);
      c.soak = soak;
      c.soupHeat = clamp(this.heatEff, 0, 1);
      if (soak <= 0) continue;
      const buoy = c.def.id === 'pebble' ? 1.85 : 2.15;
      const bob = Math.sin(t * 5 + c.def.r) * this.heatEff * 0.6;
      Body.applyForce(b, b.position, { x: 0, y: -b.mass * gs * soak * (buoy + bob) });
      const drag = 1 - 0.05 * soak;
      let vx = b.velocity.x * drag, vy = b.velocity.y * drag;
      if (Math.abs(this.swirl) > 0.05) {
        const ox = c.x - CX, oy = c.y - (level + 110);
        const d = Math.hypot(ox, oy) || 1;
        vx += (-oy / d) * this.swirl * 0.42 * soak;
        vy += (ox / d) * this.swirl * 0.42 * soak;
        Body.setAngularVelocity(b, b.angularVelocity + this.swirl * 0.006 * c.def.spin * soak);
        c.dizzy = Math.min(2, c.dizzy + Math.abs(this.swirl) * 0.0045 * c.def.spin * soak);
        if (c.dizzy > 1 && !this.spinFound.has(c.def.id)) {
          this.spinFound.add(c.def.id);
          G.discover('g1-spin', c);
        }
      }
      Body.setVelocity(b, { x: vx, y: vy });
      Body.setAngularVelocity(b, b.angularVelocity * (1 - 0.03 * soak));
    }

  }

  // ---------- per frame ----------

  private levelAt(x: number) {
    if (this.frozen) return LEVEL;
    const t = G.time;
    const amp = 3 + Math.max(0, this.heatEff) * 7 + Math.abs(this.swirl) * 6 + this.waveKick * 14;
    return LEVEL + Math.sin(x * 0.018 + t * 3.2) * amp + Math.sin(x * 0.041 - t * 2.1) * amp * 0.5 + this.swirl * (x - CX) * 0.03;
  }

  private soupColor() {
    if (this.frozen) return 0xbdefff;
    const h = clamp(this.heatEff, 0, 1);
    return lerpColor(0x8fd6b0, 0xff8a5c, h);
  }

  update(dt: number, camY: number, near: boolean) {
    super.update(dt, camY, near);
    this.depth.update(dt, near);
    const t = G.time;
    const tk = G.tinker;
    this.fireBoost = Math.max(0, this.fireBoost - dt * 0.5);
    this.heatEff = tk.heat + this.fireBoost * 0.3 - tk.frost * 1.1;
    const wasFrozen = this.frozen;
    this.frozen = this.heatEff < -0.12;
    if (this.frozen !== wasFrozen) this.setFrozen(this.frozen);
    this.waveKick = Math.max(0, this.waveKick - dt * 1.5);
    const heat = clamp(this.heatEff, 0, 1);

    // fire
    const fireH = Math.max(0.12, tk.heat + this.fireBoost * 0.5);
    for (const f of this.flames) {
      const n = Math.sin(t * 9 + f.ph) * 0.12 + Math.sin(t * 13.7 + f.ph * 2) * 0.08;
      f.g.scale.set(f.s * (0.85 + n * 0.5), f.s * fireH * (1 + n));
      f.g.x = f.x + Math.sin(t * 4 + f.ph) * 3;
    }
    this.fireGlow.alpha = 0.3 + fireH * 0.5 + Math.sin(t * 11) * 0.04;
    this.potGlow.alpha = heat * 0.35;
    if (Math.random() < dt * 6 * fireH) G.fx.emit('ember', CX + rnd(-180, 180), 1830, 1);

    // soup
    const col = this.soupColor();
    const sb = this.soupBack, sf = this.soupFront;
    sb.clear();
    sf.clear();
    const pts: number[] = [];
    for (let x = IN_TOP.l + 4; x <= IN_TOP.r - 4; x += 20) pts.push(x, this.levelAt(x));
    const wallX = (y: number, side: 'l' | 'r') => {
      const k = (y - RIM) / (IN_BOT.y - RIM);
      return side === 'l' ? IN_TOP.l + (IN_BOT.l - IN_TOP.l) * k : IN_TOP.r + (IN_BOT.r - IN_TOP.r) * k;
    };
    const poly = (top: number[]) => {
      const p = [...top];
      p.push(wallX(IN_BOT.y, 'r'), IN_BOT.y, wallX(IN_BOT.y, 'l'), IN_BOT.y);
      p[0] = wallX(p[1], 'l');
      p[top.length - 2] = wallX(p[top.length - 1], 'r');
      return p;
    };
    sb.poly(poly(pts)).fill(lerpColor(col, 0x2a1840, 0.45));
    sf.poly(poly(pts)).fill({ color: col, alpha: this.frozen ? 0.82 : 0.5 });
    // surface band
    const band: number[] = [];
    for (let i = 0; i < pts.length; i += 2) band.push(pts[i], pts[i + 1] - 6);
    for (let i = pts.length - 2; i >= 0; i -= 2) band.push(pts[i], pts[i + 1] + 6);
    sf.poly(band).fill({ color: lerpColor(col, 0xffffff, 0.45), alpha: 0.85 });
    if (this.frozen) {
      for (const [x, y] of [[CX - 160, LEVEL + 70], [CX + 60, LEVEL + 150], [CX + 190, LEVEL + 60]]) {
        sf.poly([x, y, x + 50, y - 30, x + 60, y - 22, x + 10, y + 8]).fill({ color: 0xffffff, alpha: 0.5 });
      }
    }

    // bubbles and steam
    if (!this.frozen && heat > 0.05) {
      if (Math.random() < dt * 30 * heat) {
        const x = rnd(IN_BOT.l + 30, IN_BOT.r - 30);
        G.fx.emit('bubble', x, rnd(LEVEL + 40, IN_BOT.y - 20), 1, { size: 0.8 + heat });
      }
      if (Math.random() < dt * 8 * heat) {
        const x = rnd(IN_TOP.l + 40, IN_TOP.r - 40);
        G.fx.emit('bubble', x, this.levelAt(x), 1, { size: 1.2 });
        if (G.viewFloor === 1 && Math.random() < 0.5) sfx.bubble();
      }
      this.steamT -= dt;
      if (this.steamT < 0 && this.lidState !== 'shut') {
        this.steamT = 0.25 / heat;
        G.fx.emit('steam', rnd(IN_TOP.l + 40, IN_TOP.r - 40), LEVEL - 20, 1, { size: 1.4 });
      }
    }
    if (tk.frost > 0.05 && G.viewFloor === 1 && Math.random() < dt * 20 * tk.frost) {
      G.fx.emit('drop', rnd(0, 1200), G1_TOP + 20, 1, { tint: 0xe6fbff, vy: 200 });
    }
    setSimmer(G.viewFloor === 1 && !this.frozen ? 0.3 + heat * 0.9 : 0);

    // lanterns
    for (const l of this.lanterns) {
      l.c.rotation = l.w.update(dt) * 0.12 + Math.sin(t * 0.8 + l.x) * 0.025 + this.shake * Math.sin(t * 40) * 0.05;
      l.glow.alpha = 0.45 + Math.sin(t * 3 + l.x) * 0.04;
      l.glow.x = l.x - Math.sin(l.c.rotation) * 60;
    }

    // lid
    this.updateLid(dt, heat);

    // shake the pot
    this.shake = Math.max(0, this.shake - dt * 1.5);
    const sx = Math.sin(t * 55) * this.shake * 6;
    this.potShell.x = sx;
    this.soupFront.x = sx;

    // ladle pose: handle leans toward the upper right, sways with motion
    const lb = this.ladleBody;
    this.ladle.position.set(lb.position.x, lb.position.y);
    const lean = 0.42 + clamp(-this.ladleVx * 0.012, -0.35, 0.35);
    this.ladle.rotation += (lean - this.ladle.rotation) * Math.min(1, dt * 8);
    this.autoStir = Math.max(0, this.autoStir - dt);

    // critters outside the soup feel the room's warmth
    this.setAmbient(0.12 + heat * 0.18);
  }

  private setFrozen(f: boolean) {
    if (f) {
      sfx.crackle();
      this.ice = Bodies.rectangle(CX, LEVEL + 150, IN_TOP.r - IN_TOP.l - 30, 300, {
        isStatic: true, friction: 0.01, label: 'ice', collisionFilter: { category: CAT_WORLD },
      });
      Composite.add(G.engine.world, this.ice);
      // whoever was swimming gets popped up onto the ice
      for (const c of G.critters) {
        if (c.x > IN_TOP.l && c.x < IN_TOP.r && c.y > LEVEL - c.def.r && c.y < IN_BOT.y + 20) {
          Body.setPosition(c.body, { x: c.x, y: LEVEL - c.def.r - 6 });
          Body.setVelocity(c.body, { x: 0, y: -4 });
        }
      }
    } else if (this.ice) {
      Composite.remove(G.engine.world, this.ice);
      this.ice = null;
      sfx.splash();
    }
  }

  private critsInPot(): Critter[] {
    return G.critters.filter((c) => c.x > IN_TOP.l - 20 && c.x < IN_TOP.r + 20 && c.y > RIM - 240 && c.y < IN_BOT.y + 20);
  }

  private updateLid(dt: number, heat: number) {
    const lid = this.lid;
    switch (this.lidState) {
      case 'parked':
        lid.position.set(PARK.x, PARK.y);
        lid.rotation = PARK.rot + Math.sin(G.time * 1.1) * 0.01;
        break;
      case 'swing': {
        this.lidT += dt / 0.5;
        const u = Math.min(1, this.lidT);
        const e = u * u * (3 - 2 * u);
        lid.x = this.lidFrom.x + (SHUT.x - this.lidFrom.x) * e;
        lid.y = this.lidFrom.y + (SHUT.y - this.lidFrom.y) * e - Math.sin(Math.PI * u) * 260;
        lid.rotation = this.lidFrom.rot + (SHUT.rot - this.lidFrom.rot) * e;
        if (u >= 1) {
          this.lidState = 'shut';
          this.pressure = 0;
          this.shake = 1;
          sfx.clang();
          G.fx.emit('steam', CX - 300, RIM - 20, 6, { vx: -120, spread: 2 });
          G.fx.emit('steam', CX + 300, RIM - 20, 6, { vx: 120, spread: 2 });
          this.lidBody = Bodies.rectangle(CX, RIM - 30, 680, 40, { isStatic: true, label: 'lid', collisionFilter: { category: CAT_WORLD } });
          Composite.add(G.engine.world, this.lidBody);
          // anything sitting on the rim gets shoved in or off
          for (const c of G.critters) {
            if (Math.abs(c.x - CX) < 360 && Math.abs(c.y - (RIM - 30)) < c.def.r + 30) {
              Body.setPosition(c.body, { x: c.x, y: c.x > IN_TOP.l && c.x < IN_TOP.r ? RIM + c.def.r * 0.4 : RIM - 30 - c.def.r - 30 });
            }
          }
        }
        break;
      }
      case 'shut': {
        this.pressure += dt * (0.22 + Math.max(0, heat) * 0.42);
        const p = this.pressure;
        this.shake = Math.max(this.shake, p * 0.7);
        const jig = p > 0.3 ? Math.sin(G.time * 48) * p * 7 : 0;
        lid.position.set(SHUT.x + jig * 0.4, SHUT.y - Math.abs(jig));
        lid.rotation = Math.sin(G.time * 37) * p * 0.02;
        if (p > 0.3) {
          this.rattleT -= dt;
          if (this.rattleT < 0) { this.rattleT = 0.28 - p * 0.2; sfx.rattle(); }
          if (Math.random() < dt * 20 * p) {
            const side = Math.random() < 0.5 ? -1 : 1;
            G.fx.emit('steam', CX + side * 320, RIM - 24, 1, { vx: side * 220, vy: -40, size: 1.1 });
          }
        }
        if (p > 0.75 && Math.random() < dt * 2) sfx.whistle(1);
        if (p >= 1) this.popLid();
        break;
      }
      case 'fly': {
        this.lidT += dt;
        const u = Math.min(1, this.lidT / 0.3);
        lid.y = SHUT.y - (SHUT.y - (G1_TOP + 90)) * (1 - (1 - u) * (1 - u));
        lid.rotation += dt * 9;
        if (u >= 1) {
          sfx.clang();
          G.fx.emit('star', lid.x, G1_TOP + 60, 8);
          this.lidState = 'return';
          this.lidT = 0;
          this.lidFrom = { x: lid.x, y: lid.y, rot: lid.rotation % (Math.PI * 2) };
        }
        break;
      }
      case 'return': {
        this.lidT += dt / 0.7;
        const u = Math.min(1, this.lidT);
        const e = u * u;
        lid.x = this.lidFrom.x + (PARK.x - this.lidFrom.x) * e;
        lid.y = this.lidFrom.y + (PARK.y - this.lidFrom.y) * e;
        lid.rotation = this.lidFrom.rot + (PARK.rot - this.lidFrom.rot) * u;
        if (u >= 1) { this.lidState = 'parked'; sfx.thud(0.7); }
        break;
      }
    }
  }

  private popLid() {
    this.lidState = 'fly';
    this.lidT = 0;
    if (this.lidBody) Composite.remove(G.engine.world, this.lidBody);
    this.lidBody = null;
    this.shake = 1.2;
    sfx.cork();
    sfx.steam();
    G.fx.emit('steam', CX, RIM - 40, 26, { spread: 6, size: 2, vy: -200 });
    G.fx.emit('drop', CX, RIM - 20, 24, { spread: 3, tint: this.soupColor() });
    const popped = this.critsInPot();
    for (const c of popped) {
      Body.setVelocity(c.body, { x: rnd(-5, 5) + (CX - c.x) * 0.01, y: -rnd(31, 38) });
      Body.setAngularVelocity(c.body, rnd(-0.35, 0.35));
      c.boop();
      c.hurt(22, 'lid');
    }
    if (popped.length >= 3) G.discover('g1-champagne', popped[0]);
  }
}
