import Matter from 'matter-js';
import { Container, Graphics, Sprite } from 'pixi.js';
import { G, HOLE, RIM_GROUND, G1_TOP, SCENE_X0, SCENE_X1 } from '../engine/game';
import { sfx } from '../engine/audio';
import { softDot, vGradient } from '../engine/textures';
import { drawLantern, Floor, Wobble, type Plaque, type PointerHit } from './floor';
import { RIM_PLAQUE } from '../data/plaques';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface Pokeable {
  x: number;
  y: number;
  r: number;
  poke(): void;
}

/** The Rim: the arrivals ledge on top of the dollhouse, with the mouth down to Gate 1. */
export class Rim extends Floor {
  readonly index = 0;
  readonly name = 'The Rim';
  readonly top = -1600;
  readonly bottom = G1_TOP;
  readonly focusY = 470;
  readonly plaque: Plaque = RIM_PLAQUE;

  private far = new Container();
  private near = new Container();
  private stars: { s: Sprite; ph: number }[] = [];
  private lanterns: { c: Container; w: Wobble; glow: Sprite; x: number; y: number }[] = [];
  private coins!: Container;
  private coinW = new Wobble(160, 7);
  private embers: { glow: Sprite; flare: number } = { glow: null!, flare: 0 };
  private clouds: { c: Graphics; x: number; y: number; v: number; gone: number }[] = [];
  private vent = { x: 400, blast: 0, t: 0 };
  private pokeables: Pokeable[] = [];

  constructor() {
    super();
    const L = G.layers;
    // sky
    const sky = new Sprite(vGradient('rim-sky', [
      [0, '#1d1b45'],
      [0.45, '#3d2560'],
      [0.72, '#86406f'],
      [0.88, '#e7766a'],
      [1, '#ffb27a'],
    ]));
    sky.position.set(SCENE_X0, -1700);
    sky.width = SCENE_X1 - SCENE_X0;
    sky.height = RIM_GROUND + 1700;
    L.bg.addChild(sky);
    // stars
    for (let i = 0; i < 90; i++) {
      const s = new Sprite(softDot());
      s.anchor.set(0.5);
      s.position.set(rnd(-900, 2100), rnd(-1600, 420));
      s.width = s.height = rnd(5, 13);
      s.tint = Math.random() < 0.3 ? 0xffe2a8 : 0xffffff;
      L.bg.addChild(s);
      this.stars.push({ s, ph: rnd(0, 6) });
    }
    // crescent moon
    // crescent = disc minus an offset disc (arcs meet where the two circles cross)
    const moon = new Graphics().arc(0, 0, 70, 1.147, 5.136).arc(34, 0, 64, 4.631, 1.652, true).closePath().fill(0xfff1d6);
    moon.position.set(1010, 60);
    moon.rotation = -0.3;
    L.bg.addChild(moon);
    const mg = new Sprite(softDot());
    mg.anchor.set(0.5);
    mg.position.set(990, 70);
    mg.width = mg.height = 360;
    mg.alpha = 0.18;
    mg.tint = 0xffe6c0;
    L.bg.addChild(mg);

    // far + near silhouettes (parallax)
    const farG = new Graphics();
    farG.moveTo(SCENE_X0, 860);
    let x = SCENE_X0;
    while (x < SCENE_X1) {
      const w = rnd(160, 320);
      farG.bezierCurveTo(x + w * 0.2, rnd(430, 560), x + w * 0.8, rnd(430, 560), x + w, rnd(560, 640));
      x += w;
    }
    farG.lineTo(SCENE_X1, 900).lineTo(SCENE_X0, 900).closePath().fill(0x6c3a78);
    this.far.addChild(farG);
    const nearG = new Graphics();
    for (const [sx, h, w] of [[-700, 360, 120], [-300, 300, 90], [60, 250, 70], [1240, 280, 80], [1560, 360, 110], [1900, 300, 90]]) {
      nearG.moveTo(sx - w, 900).bezierCurveTo(sx - w * 0.6, 900 - h * 0.6, sx - w * 0.3, 900 - h, sx, 900 - h)
        .bezierCurveTo(sx + w * 0.3, 900 - h, sx + w * 0.6, 900 - h * 0.6, sx + w, 900).closePath().fill(0x84436f);
    }
    this.near.addChild(nearG);
    L.bg.addChild(this.far, this.near);

    // horizon glow above the mouth
    this.glow(700, RIM_GROUND, 1100, 0xff8a5c, 0.55);

    // mouth shaft (seen through the hole): dark top, ember-lit bottom
    const shaft = new Sprite(vGradient('shaft', [[0, '#2b1330'], [0.6, '#6a2338'], [1, '#ff8a4c']]));
    shaft.position.set(HOLE.x0 - 10, RIM_GROUND);
    shaft.width = HOLE.x1 - HOLE.x0 + 20;
    shaft.height = G1_TOP - RIM_GROUND;
    L.bg.addChild(shaft);

    // the arch over the mouth
    const arch = new Graphics();
    const cx = (HOLE.x0 + HOLE.x1) / 2;
    const L0 = HOLE.x0 - 50, R0 = HOLE.x1 + 50;
    arch.moveTo(L0 - 20, RIM_GROUND).lineTo(L0 - 20, 600)
      .bezierCurveTo(L0 - 20, 470, cx - 90, 420, cx, 340)
      .bezierCurveTo(cx + 90, 420, R0 + 20, 470, R0 + 20, 600)
      .lineTo(R0 + 20, RIM_GROUND).lineTo(R0 - 30, RIM_GROUND).lineTo(R0 - 30, 610)
      .bezierCurveTo(R0 - 30, 500, cx + 70, 460, cx, 400)
      .bezierCurveTo(cx - 70, 460, L0 + 30, 500, L0 + 30, 610)
      .lineTo(L0 + 30, RIM_GROUND).closePath().fill(0x5b2856);
    // inner trim
    arch.moveTo(L0 + 30, RIM_GROUND).lineTo(L0 + 30, 610)
      .bezierCurveTo(L0 + 30, 500, cx - 70, 460, cx, 400)
      .bezierCurveTo(cx + 70, 460, R0 - 30, 500, R0 - 30, 610)
      .lineTo(R0 - 30, RIM_GROUND).lineTo(R0 - 44, RIM_GROUND).lineTo(R0 - 44, 612)
      .bezierCurveTo(R0 - 44, 512, cx + 62, 474, cx, 418)
      .bezierCurveTo(cx - 62, 474, L0 + 44, 512, L0 + 44, 612)
      .lineTo(L0 + 44, RIM_GROUND).closePath().fill(0xe48a6a);
    // eight-point star medallion
    const star = (r: number) => {
      const pts: number[] = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.62 : r;
        pts.push(cx + Math.cos(a) * rr, 372 + Math.sin(a) * rr);
      }
      return pts;
    };
    arch.poly(star(30)).fill(0xffd36e);
    arch.circle(cx, 372, 10).fill(0xe48a6a);
    // pillar bands
    for (const px of [L0 + 5, R0 - 5]) {
      arch.roundRect(px - 34, 700, 68, 14, 6).fill(0x7a3a6a);
      arch.roundRect(px - 34, 820, 68, 14, 6).fill(0x7a3a6a);
    }
    L.back.addChild(arch);

    // ground slabs with a lit lip
    const ground = new Graphics();
    const lip = (x0: number, x1: number) => {
      ground.moveTo(x0, RIM_GROUND + 6);
      for (let gx = x0; gx < x1; gx += 60) ground.quadraticCurveTo(gx + 30, RIM_GROUND - 6, Math.min(x1, gx + 60), RIM_GROUND + 2);
      ground.lineTo(x1, G1_TOP).lineTo(x0, G1_TOP).closePath().fill(0x5a2a4c);
      ground.rect(x0, RIM_GROUND + 4, x1 - x0, 20).fill(0x8c4560);
    };
    lip(SCENE_X0, HOLE.x0);
    lip(HOLE.x1, SCENE_X1);
    // ember cracks
    const cracks = new Graphics();
    for (const [x0, y0] of [[120, 930], [300, 990], [960, 940], [1110, 1000], [60, 1020]]) {
      cracks.moveTo(x0, y0).lineTo(x0 + 40, y0 + 6).lineTo(x0 + 70, y0 - 4).lineTo(x0 + 72, y0 + 2).lineTo(x0 + 40, y0 + 12).lineTo(x0, y0 + 5).closePath().fill(0xff8a4c);
    }
    L.front.addChild(ground);
    const crackGlow = new Container();
    crackGlow.addChild(cracks);
    L.glow.addChild(crackGlow);

    // physics: ground on both sides of the mouth, the edges, a lid on the sky
    this.wall((SCENE_X0 + HOLE.x0) / 2, RIM_GROUND + 100, HOLE.x0 - SCENE_X0, 200);
    this.wall((HOLE.x1 + SCENE_X1) / 2, RIM_GROUND + 100, SCENE_X1 - HOLE.x1, 200);
    this.wall((SCENE_X0 + SCENE_X1) / 2, -1700, SCENE_X1 - SCENE_X0, 80);

    // ----- pokeable props -----
    // lantern posts
    for (const px of [150, 1050]) {
      const post = new Graphics();
      const dir = px < 600 ? 1 : -1;
      post.roundRect(px - 7, 560, 14, RIM_GROUND - 560, 6).fill(0x3a2240);
      post.roundRect(Math.min(px, px + dir * 70) - 2, 560, 74, 10, 5).fill(0x3a2240);
      post.ellipse(px, RIM_GROUND, 26, 8).fill(0x3a2240);
      L.back.addChild(post);
      const lan = drawLantern();
      const lx = px + dir * 64, ly = 640;
      lan.pivot.set(0, -60);
      lan.position.set(lx, ly - 70);
      L.back.addChild(lan);
      const glow = this.glow(lx, 640, 300, 0xffc46b, 0.55);
      const item = { c: lan, w: new Wobble(30, 1.6), glow, x: lx, y: 640 };
      this.lanterns.push(item);
      this.pokeables.push({ x: lx, y: 640, r: 50, poke: () => {
        item.w.kick(rnd(2.5, 4) * (Math.random() < 0.5 ? -1 : 1));
        sfx.chime();
        G.fx.emit('ember', lx, 660, 6, { spread: 2 });
      } });
    }
    // coin pile (snack-money of a certain cat)
    this.coins = new Container();
    const cg = new Graphics();
    const coin = (x: number, y: number) => {
      cg.ellipse(x, y + 3, 17, 7).fill(0xd9a03a);
      cg.ellipse(x, y, 17, 7).fill(0xffd36e);
      cg.ellipse(x - 3, y - 1, 6, 2).fill({ color: 0xffffff, alpha: 0.5 });
    };
    for (let i = 0; i < 5; i++) coin(-48 + i * 24, -6);
    for (let i = 0; i < 4; i++) coin(-36 + i * 24, -18);
    for (let i = 0; i < 3; i++) coin(-24 + i * 24, -30);
    coin(-12, -42); coin(12, -42); coin(0, -54);
    this.coins.addChild(cg);
    this.coins.position.set(310, RIM_GROUND + 2);
    L.back.addChild(this.coins);
    this.pokeables.push({ x: 310, y: RIM_GROUND - 28, r: 70, poke: () => {
      this.coinW.kick(rnd(3, 5));
      sfx.jingle();
      G.fx.emit('glint', 310, RIM_GROUND - 40, 6, { spread: 3 });
      G.fx.emit('star', 310, RIM_GROUND - 40, 4, { tint: 0xffd36e, size: 0.6 });
    } });
    // ember stones
    const eg = new Graphics();
    eg.ellipse(-30, -16, 34, 22).fill(0x6a2c44);
    eg.ellipse(24, -14, 30, 18).fill(0x7a3048);
    eg.ellipse(0, -30, 26, 18).fill(0x5c2640);
    eg.ellipse(-30, -22, 14, 6).fill(0xff8a4c);
    eg.ellipse(22, -18, 12, 5).fill(0xffb36b);
    eg.ellipse(2, -36, 10, 4).fill(0xff8a4c);
    eg.position.set(990, RIM_GROUND + 4);
    L.back.addChild(eg);
    this.embers.glow = this.glow(990, RIM_GROUND - 20, 260, 0xff7a4c, 0.55);
    this.wall(990, RIM_GROUND - 14, 100, 30, { chamfer: { radius: 14 }, label: 'embers' });
    this.pokeables.push({ x: 990, y: RIM_GROUND - 20, r: 70, poke: () => {
      this.embers.flare = 1;
      sfx.crackle();
      G.fx.emit('spark', 990, RIM_GROUND - 30, 16, { spread: 1.2 });
    } });
    // smoke vent
    const vg = new Graphics();
    vg.ellipse(0, 0, 44, 10).fill(0x3a1a34);
    vg.ellipse(0, -2, 30, 5).fill(0xff8a4c);
    vg.position.set(this.vent.x, RIM_GROUND + 6);
    L.front.addChild(vg);
    this.pokeables.push({ x: this.vent.x, y: RIM_GROUND - 30, r: 60, poke: () => this.blast() });
    // drifting smoke puffs
    for (let i = 0; i < 3; i++) {
      const c = new Graphics();
      c.circle(-34, 6, 26).fill(0xf6d6e6).circle(0, -8, 36).fill(0xf6d6e6).circle(36, 6, 26).fill(0xf6d6e6)
        .roundRect(-56, 4, 112, 28, 14).fill(0xf6d6e6);
      c.alpha = 0.85;
      L.bg.addChild(c);
      const cl = { c, x: rnd(0, 1200), y: rnd(-80, 260), v: rnd(10, 22), gone: 0 };
      this.clouds.push(cl);
    }
  }

  private blast() {
    this.vent.blast = 1;
    sfx.whoosh();
    sfx.steam();
    G.fx.emit('smoke', this.vent.x, RIM_GROUND - 10, 14, { vy: -160, spread: 1.5, tint: 0xd8b6cc, size: 1.4 });
    for (const c of G.critters) {
      if (Math.abs(c.x - this.vent.x) < 120 && c.y > RIM_GROUND - 260 && c.y < RIM_GROUND) {
        Matter.Body.setVelocity(c.body, { x: c.body.velocity.x + rnd(-2, 2), y: -22 - 18 * (1 - c.def.mass / 20) });
        c.boop();
      }
    }
  }

  pointerDown(x: number, y: number): PointerHit | null {
    for (const c of this.clouds) {
      if (c.gone <= 0 && Math.abs(x - c.x) < 70 && Math.abs(y - c.y) < 45) {
        return { move() {}, up: () => {
          c.gone = 6;
          sfx.pop();
          G.fx.emit('smoke', c.x, c.y, 10, { tint: 0xf6d6e6, spread: 3, size: 1.2 });
        } };
      }
    }
    for (const p of this.pokeables) {
      if ((x - p.x) ** 2 + (y - p.y) ** 2 < p.r * p.r) {
        return { move() {}, up: (_x, _y, tapped) => { if (tapped) p.poke(); } };
      }
    }
    return null;
  }

  update(dt: number, camY: number) {
    const t = G.time;
    this.far.y = (camY - this.focusY) * 0.25;
    this.near.y = (camY - this.focusY) * 0.12;
    for (const s of this.stars) s.s.alpha = 0.55 + Math.sin(t * 1.7 + s.ph) * 0.35;
    for (const l of this.lanterns) {
      l.c.rotation = l.w.update(dt) * 0.12 + Math.sin(t * 0.9 + l.x) * 0.03;
      l.glow.alpha = 0.5 + Math.abs(l.w.v) * 0.08 + Math.sin(t * 3 + l.x) * 0.04;
    }
    const cw = this.coinW.update(dt);
    this.coins.scale.set(1 - cw * 0.04, 1 + cw * 0.06);
    this.embers.flare = Math.max(0, this.embers.flare - dt * 0.8);
    this.embers.glow.alpha = 0.45 + Math.sin(t * 5) * 0.06 + this.embers.flare * 0.5;
    if (Math.random() < dt * 3) G.fx.emit('ember', 990 + rnd(-30, 30), RIM_GROUND - 30, 1);
    // vent: lazy puffs, big blast on poke
    this.vent.t -= dt;
    if (this.vent.t < 0) {
      this.vent.t = rnd(0.5, 1.2);
      G.fx.emit('smoke', this.vent.x, RIM_GROUND - 6, 1, { tint: 0xc9a2bc });
    }
    this.vent.blast = Math.max(0, this.vent.blast - dt * 2);
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x > 1500) c.x = -300;
      if (c.gone > 0) {
        c.gone -= dt;
        c.c.alpha = 0;
      } else c.c.alpha = Math.min(0.85, c.c.alpha + dt);
      c.c.position.set(c.x, c.y + Math.sin(t * 0.6 + c.v) * 6);
    }
  }

  /** ember stones warm and soot critters that sit on them; the Rim is cool otherwise */
  affect() {
    for (const c of G.critters) {
      if (c.y > G1_TOP) continue;
      c.ambient = 0.06;
      if (Math.abs(c.x - 990) < 90 && c.y > RIM_GROUND - 200 && c.y < RIM_GROUND) {
        c.ambient = 0.45;
        c.soot = Math.min(1, c.soot + 0.004);
      }
    }
  }
}
