import { Container, Graphics } from 'pixi.js';
import type { CritterDef, CritterId } from './defs';

// Articulated flat-vector rigs. Lineless: every part is a filled Bézier shape.
// Local space: body centre at (0,0), y down, the critter faces +x.

export const INK = 0x3a2240;
export type Expr = 'normal' | 'surprised' | 'squint' | 'dizzy' | 'ko' | 'happy' | 'sleep' | 'worried' | 'deadpan' | 'blush' | 'shy' | 'sour';
export type HatId = 'party' | 'chef' | 'cork' | 'beanie' | 'propeller' | 'crown' | 'paper' | 'chili' | 'hardhat' | 'earmuffs' | 'antenna';

interface Eye {
  root: Container;
  white: Graphics;
  pupil: Container;
  lid: Graphics;
  rx: number;
  ry: number;
}

export interface Rig {
  root: Container;
  squash: Container;
  flip: Container;
  skin: Container[]; // tinted for heat
  eyes: Eye[];
  eyeAlt: Graphics;
  mouth: Graphics;
  mouthAt: { x: number; y: number };
  flappers: { g: Container; base: number; amp: number; speed: number }[];
  tail?: Container;
  tuft?: Container;
  wear: Graphics;
  soot: Graphics;
  hatAnchor: Container;
  steamPts: { x: number; y: number }[];
  spots: { band: [number, number, number][]; bump: [number, number] };
  expr: Expr;
  setExpr(e: Expr): void;
  setWear(level: number): void;
  setSoot(v: number): void;
  setHat(h: HatId | null): void;
  /** coat peeled off (Gate 2): every critter has its own embarrassing under-layer */
  setPeeled(on: boolean): void;
  /** look: direction in local space; blink: 0 open .. 1 closed */
  pose(look: { x: number; y: number }, blink: number, lidBase: number): void;
}

const P = (g: Graphics, pts: number[], color: number, alpha = 1) => {
  // pts: x0 y0 then triples of control points (c1x c1y c2x c2y x y)
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 6) g.bezierCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]);
  g.closePath();
  g.fill({ color, alpha });
  return g;
};

function makeEye(x: number, y: number, rx: number, ry: number, lidColor: number): Eye {
  const root = new Container();
  root.position.set(x, y);
  const white = new Graphics().ellipse(0, 0, rx, ry).fill(0xffffff);
  const mask = new Graphics().ellipse(0, 0, rx, ry).fill(0xffffff);
  const inner = new Container();
  inner.mask = mask;
  const pupil = new Container();
  const pr = Math.min(rx, ry) * 0.62;
  pupil.addChild(new Graphics().circle(0, 0, pr).fill(INK));
  pupil.addChild(new Graphics().circle(-pr * 0.35, -pr * 0.38, pr * 0.32).fill(0xffffff));
  pupil.addChild(new Graphics().circle(pr * 0.35, pr * 0.3, pr * 0.13).fill(0xffffff));
  // lid: a body-coloured slab hinged at the top of the eye
  const lid = new Graphics().rect(-rx - 2, 0, rx * 2 + 4, ry * 2 + 4).fill(lidColor);
  lid.y = -ry - 2;
  lid.scale.y = 0;
  inner.addChild(pupil, lid);
  root.addChild(white, inner, mask);
  return { root, white, pupil, lid, rx, ry };
}

// ---------- per-critter bodies ----------

/** body silhouettes (same paths the builders draw), reused for the peeled look */
const BODY_PTS: Record<CritterId, number[]> = {
  boba: [0, -72, 52, -72, 86, -40, 86, 8, 86, 54, 56, 76, 0, 76, -56, 76, -86, 54, -86, 8, -86, -40, -52, -72, 0, -72],
  mochi: [0, -58, 36, -58, 62, -30, 62, 6, 62, 40, 36, 60, 0, 60, -38, 60, -62, 40, -62, 6, -62, -30, -36, -58, 0, -58],
  pebble: [-80, -50, -80, -70, -40, -72, 10, -70, 60, -68, 96, -46, 98, -8, 100, 36, 78, 68, 22, 68, -10, 68, -30, 68, -52, 68, -88, 68, -98, 40, -96, 0, -95, -26, -88, -44, -80, -50],
  gloop: [0, -64, 44, -64, 72, -30, 72, 10, 72, 40, 62, 62, 46, 62, 38, 62, 40, 72, 30, 72, 20, 72, 24, 62, 12, 62, 0, 62, -10, 62, -20, 62, -28, 62, -28, 74, -40, 74, -52, 74, -48, 62, -58, 60, -68, 56, -72, 34, -72, 10, -72, -30, -44, -64, 0, -64],
  toto: [0, -50, 32, -50, 54, -26, 54, 4, 54, 34, 30, 52, 0, 52, -30, 52, -54, 34, -54, 4, -54, -26, -32, -50, 0, -50],
};

function buildPeel(id: CritterId): Container {
  const c = new Container();
  const g = new Graphics();
  const pts = BODY_PTS[id];
  switch (id) {
    case 'boba': // hairless and mortified
      P(g, pts, 0xffc9d2);
      g.ellipse(14, 34, 40, 28).fill(0xffd9df);
      g.ellipse(-40, -20, 10, 6).fill({ color: 0xff9fb2, alpha: 0.6 });
      g.ellipse(-20, 40, 8, 5).fill({ color: 0xff9fb2, alpha: 0.6 });
      g.circle(-60, 20, 3).fill(0xe8a0b0).circle(-54, 28, 3).fill(0xe8a0b0);
      break;
    case 'mochi': // plucked: one sad feather left, otherwise a bath duck
      P(g, pts, 0xffe23a);
      g.ellipse(-26, -30, 16, 10).fill({ color: 0xffffff, alpha: 0.55 });
      g.ellipse(6, 26, 34, 24).fill(0xfff07a);
      P(g, [0, -56, -4, -72, 2, -86, 8, -84, 8, -72, 6, -62, 2, -56], 0xf2bf2e);
      break;
    case 'pebble': // fur off, polka-dot boxers on
      P(g, pts, 0xf0b39a);
      g.roundRect(-96, 14, 196, 56, 22).fill(0x5b7bd6);
      for (let x = -80; x < 96; x += 26) for (const y of [26, 50]) g.circle(x + (y === 50 ? 13 : 0), y, 6).fill(0xffffff);
      g.roundRect(-96, 10, 196, 10, 5).fill(0xffffff);
      g.ellipse(-30, -30, 8, 5).fill({ color: 0xe0907a, alpha: 0.7 });
      break;
    case 'gloop': // only the gummy core is left
      g.ellipse(-4, 8, 50, 52).fill({ color: 0x3fbf92, alpha: 0.95 });
      g.ellipse(-22, -18, 12, 7).fill({ color: 0xffffff, alpha: 0.6 });
      g.circle(14, 30, 6).fill({ color: 0xc6fbe6, alpha: 0.7 });
      break;
    case 'toto': { // bald, with one dandelion-puff tuft
      P(g, pts, 0xe8c4ec);
      g.ellipse(4, 22, 26, 20).fill(0xf4dcf4);
      const puff = new Graphics();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        puff.circle(Math.cos(a) * 12, -58 + Math.sin(a) * 12, 7).fill({ color: 0xffffff, alpha: 0.9 });
      }
      puff.circle(0, -58, 8).fill(0xfff4e6);
      c.addChild(g, puff);
      return c;
    }
  }
  c.addChild(g);
  return c;
}

interface Built {
  back: Container;
  body: Container;
  front: Container;
  eyes: Eye[];
  mouthAt: { x: number; y: number };
  hat: { x: number; y: number };
  flappers: Rig['flappers'];
  tail?: Container;
  tuft?: Container;
  steamPts: { x: number; y: number }[];
  spots: Rig['spots'];
  extraFace?: Graphics; // nose, cheeks
}

function buildBoba(c: CritterDef['colors']): Built {
  const back = new Container();
  const body = new Container();
  const front = new Container();
  // tail, hinged at the rump
  const tail = new Container();
  tail.position.set(-74, 34);
  tail.addChild(P(new Graphics(), [0, 6, -54, 8, -66, -52, -40, -74, -32, -80, -22, -74, -28, -64, -46, -42, -40, -10, 2, -12], c.body));
  tail.addChild(P(new Graphics(), [-38, -70, -32, -80, -22, -74, -28, -64, -32, -62, -36, -64, -38, -70], c.accent2));
  back.addChild(tail);
  // back ear
  const earB = new Container();
  earB.position.set(-42, -52);
  earB.addChild(P(new Graphics(), [-22, 14, -24, -14, -22, -40, -14, -52, -6, -44, 10, -30, 22, -10], c.body));
  earB.addChild(P(new Graphics(), [-14, 4, -15, -14, -14, -30, -10, -38, -4, -32, 6, -22, 12, -8], c.accent));
  back.addChild(earB);
  // body blob
  const g = new Graphics();
  P(g, [0, -72, 52, -72, 86, -40, 86, 8, 86, 54, 56, 76, 0, 76, -56, 76, -86, 54, -86, 8, -86, -40, -52, -72, 0, -72], c.body);
  g.ellipse(14, 34, 46, 34).fill(c.belly);
  g.ellipse(-34, 72, 18, 10).fill(c.belly);
  g.ellipse(36, 72, 18, 10).fill(c.belly);
  // forehead stripes
  P(g, [-8, -71, -6, -60, 2, -56, 4, -50, 8, -58, 6, -66, 4, -72], c.accent2, 0.8);
  P(g, [12, -70, 14, -62, 18, -60, 20, -54, 24, -60, 22, -66, 20, -70], c.accent2, 0.8);
  body.addChild(g);
  // front ear
  const earF = new Container();
  earF.position.set(40, -56);
  earF.addChild(P(new Graphics(), [-22, 10, -10, -12, 4, -40, 14, -50, 22, -40, 24, -14, 22, 14], c.body));
  earF.addChild(P(new Graphics(), [-12, 4, -4, -14, 6, -30, 12, -36, 16, -28, 16, -12, 14, 6], c.accent));
  front.addChild(earF);
  const face = new Graphics();
  face.ellipse(-2, 6, 13, 8).fill({ color: c.cheek, alpha: 0.65 });
  face.ellipse(74, 4, 10, 8).fill({ color: c.cheek, alpha: 0.65 });
  P(face, [40, -2, 46, -2, 50, 0, 48, 4, 45, 8, 41, 8, 38, 4, 36, 0, 40, -2], 0xff86b0);
  return {
    back, body, front,
    eyes: [makeEye(14, -20, 14, 17, c.body), makeEye(58, -22, 13, 16, c.body)],
    mouthAt: { x: 43, y: 14 },
    hat: { x: 6, y: -70 },
    flappers: [
      { g: earB, base: 0, amp: 0.12, speed: 1.3 },
      { g: earF, base: 0, amp: 0.12, speed: 1.1 },
    ],
    tail,
    steamPts: [{ x: -54, y: -98 }, { x: 56, y: -104 }],
    spots: { band: [[-50, 6, 0.5], [30, 44, -0.4]], bump: [-18, -70] },
    extraFace: face,
  };
}

function buildMochi(c: CritterDef['colors']): Built {
  const back = new Container();
  const body = new Container();
  const front = new Container();
  const g = new Graphics();
  // feet
  g.ellipse(-18, 58, 14, 7).fill(c.accent);
  g.ellipse(20, 58, 14, 7).fill(c.accent);
  P(g, [0, -58, 36, -58, 62, -30, 62, 6, 62, 40, 36, 60, 0, 60, -38, 60, -62, 40, -62, 6, -62, -30, -36, -58, 0, -58], c.body);
  g.ellipse(4, 26, 38, 28).fill(c.belly);
  // tail feathers
  P(g, [-58, -2, -74, -8, -82, -2, -78, 6, -72, 12, -64, 12, -58, 10], c.accent2);
  body.addChild(g);
  const tuft = new Container();
  tuft.position.set(-2, -56);
  tuft.addChild(P(new Graphics(), [0, 2, -6, -10, -4, -24, 2, -28, 4, -20, 6, -10, 4, 2], c.accent2));
  tuft.addChild(P(new Graphics(), [2, 2, 6, -8, 12, -18, 18, -18, 16, -10, 10, -2, 6, 4], c.accent2));
  body.addChild(tuft);
  // beak: upper + lower (lower hinges for the mouth)
  const beak = new Graphics();
  P(beak, [38, -8, 54, -14, 80, -8, 86, 0, 82, 6, 58, 8, 38, 6], c.accent);
  front.addChild(beak);
  const wing = new Container();
  wing.position.set(-12, 2);
  wing.addChild(P(new Graphics(), [8, -8, -26, -18, -52, 8, -40, 30, -28, 42, -6, 26, 8, -8], c.accent2));
  front.addChild(wing);
  const face = new Graphics();
  face.ellipse(8, 12, 10, 6).fill({ color: c.cheek, alpha: 0.6 });
  face.ellipse(58, 14, 7, 5).fill({ color: c.cheek, alpha: 0.6 });
  return {
    back, body, front,
    eyes: [makeEye(14, -18, 11, 13, c.body), makeEye(42, -20, 10, 12, c.body)],
    mouthAt: { x: 66, y: 8 },
    hat: { x: 0, y: -58 },
    flappers: [{ g: wing, base: 0, amp: 0.15, speed: 2.2 }],
    tuft,
    steamPts: [{ x: -14, y: -54 }, { x: 22, y: -58 }],
    spots: { band: [[-36, 14, 0.4], [22, 40, -0.5]], bump: [-20, -54] },
    extraFace: face,
  };
}

function buildPebble(c: CritterDef['colors']): Built {
  const back = new Container();
  const body = new Container();
  const front = new Container();
  const g = new Graphics();
  // stubby legs
  for (const x of [-62, -30, 30, 62]) g.roundRect(x - 13, 50, 26, 26, 11).fill(c.accent);
  P(g, [-80, -50, -80, -70, -40, -72, 10, -70, 60, -68, 96, -46, 98, -8, 100, 36, 78, 68, 22, 68, -10, 68, -30, 68, -52, 68, -88, 68, -98, 40, -96, 0, -95, -26, -88, -44, -80, -50], c.body);
  g.ellipse(-12, 46, 66, 18).fill(c.belly);
  // snout
  P(g, [52, -40, 80, -46, 104, -30, 106, -6, 108, 16, 92, 26, 72, 24, 54, 22, 46, 4, 46, -14, 46, -30, 48, -38, 52, -40], c.accent2);
  g.ellipse(98, -16, 4, 6).fill(INK);
  g.ellipse(104, -4, 3, 5).fill({ color: INK, alpha: 0.7 });
  // fur tufts on back
  P(g, [-60, -66, -56, -78, -46, -80, -40, -70, -36, -78, -26, -78, -22, -68], c.accent2, 0.9);
  body.addChild(g);
  const earB = new Container();
  earB.position.set(8, -66);
  earB.addChild(new Graphics().ellipse(0, -6, 12, 12).fill(c.accent));
  back.addChild(earB);
  const earF = new Container();
  earF.position.set(34, -68);
  earF.addChild(new Graphics().ellipse(0, -6, 12, 12).fill(c.accent));
  earF.addChild(new Graphics().ellipse(0, -5, 6, 6).fill(c.cheek));
  front.addChild(earF);
  const face = new Graphics();
  face.ellipse(30, 0, 11, 7).fill({ color: c.cheek, alpha: 0.5 });
  return {
    back, body, front,
    eyes: [makeEye(38, -32, 11, 11, c.body), makeEye(64, -36, 10, 10, c.body)],
    mouthAt: { x: 90, y: 16 },
    hat: { x: 18, y: -70 },
    flappers: [
      { g: earB, base: 0, amp: 0.08, speed: 0.6 },
      { g: earF, base: 0, amp: 0.08, speed: 0.7 },
    ],
    steamPts: [{ x: 8, y: -84 }, { x: 34, y: -86 }],
    spots: { band: [[-56, -10, 0.4], [-10, 26, -0.4]], bump: [-30, -70] },
    extraFace: face,
  };
}

function buildGloop(c: CritterDef['colors']): Built {
  const back = new Container();
  const body = new Container();
  const front = new Container();
  const earB = new Container();
  earB.position.set(-34, -44);
  earB.addChild(P(new Graphics(), [6, -6, -18, -14, -40, 4, -42, 30, -44, 48, -30, 54, -24, 40, -20, 20, -8, 8, 6, 6], c.accent2));
  back.addChild(earB);
  const g = new Graphics();
  P(g, [0, -64, 44, -64, 72, -30, 72, 10, 72, 40, 62, 62, 46, 62, 38, 62, 40, 72, 30, 72, 20, 72, 24, 62, 12, 62, 0, 62, -10, 62, -20, 62, -28, 62, -28, 74, -40, 74, -52, 74, -48, 62, -58, 60, -68, 56, -72, 34, -72, 10, -72, -30, -44, -64, 0, -64], c.body, 0.94);
  g.ellipse(-6, 14, 34, 28).fill({ color: c.accent, alpha: 0.45 });
  g.ellipse(-8, 10, 12, 10).fill({ color: c.belly, alpha: 0.6 });
  g.ellipse(-32, -38, 15, 8).fill({ color: 0xffffff, alpha: 0.75 });
  g.circle(-14, -48, 4).fill({ color: 0xffffff, alpha: 0.7 });
  body.addChild(g);
  const earF = new Container();
  earF.position.set(40, -46);
  earF.addChild(P(new Graphics(), [-6, -6, 18, -14, 40, 4, 42, 30, 44, 48, 30, 54, 24, 40, 20, 20, 8, 8, -6, 6], c.accent2));
  front.addChild(earF);
  const face = new Graphics();
  face.ellipse(4, 8, 10, 6).fill({ color: c.cheek, alpha: 0.6 });
  face.ellipse(58, 6, 8, 6).fill({ color: c.cheek, alpha: 0.6 });
  face.ellipse(36, 0, 6, 4).fill(0x2f7a64);
  return {
    back, body, front,
    eyes: [makeEye(14, -16, 13, 15, c.body), makeEye(48, -18, 12, 14, c.body)],
    mouthAt: { x: 34, y: 14 },
    hat: { x: 0, y: -64 },
    flappers: [
      { g: earB, base: 0, amp: 0.25, speed: 1.6 },
      { g: earF, base: 0, amp: 0.25, speed: 1.4 },
    ],
    steamPts: [{ x: -40, y: -40 }, { x: 46, y: -42 }],
    spots: { band: [[-40, 4, 0.5], [30, 36, -0.4]], bump: [-12, -62] },
    extraFace: face,
  };
}

function buildToto(c: CritterDef['colors']): Built {
  const back = new Container();
  const body = new Container();
  const front = new Container();
  // wings (flap)
  const wingB = new Container();
  wingB.position.set(-26, -4);
  wingB.addChild(P(new Graphics(), [8, -6, -30, -46, -84, -40, -98, -14, -84, -12, -80, 6, -66, 2, -58, 18, -46, 10, -30, 22, -20, 12, 8, 10], c.accent2));
  back.addChild(wingB);
  const earB = new Container();
  earB.position.set(-20, -36);
  earB.addChild(P(new Graphics(), [-16, 6, -26, -30, -30, -70, -20, -84, -10, -76, 10, -40, 12, 0], c.body));
  earB.addChild(P(new Graphics(), [-10, -2, -18, -30, -20, -58, -16, -68, -10, -62, 2, -36, 4, -4], c.accent));
  back.addChild(earB);
  const g = new Graphics();
  g.ellipse(-14, 50, 9, 6).fill(c.accent2);
  g.ellipse(14, 50, 9, 6).fill(c.accent2);
  P(g, [0, -50, 32, -50, 54, -26, 54, 4, 54, 34, 30, 52, 0, 52, -30, 52, -54, 34, -54, 4, -54, -26, -32, -50, 0, -50], c.body);
  g.ellipse(4, 22, 30, 24).fill(c.belly);
  body.addChild(g);
  const earF = new Container();
  earF.position.set(20, -38);
  earF.addChild(P(new Graphics(), [-12, 2, -6, -40, 6, -76, 20, -86, 30, -74, 30, -34, 18, 6], c.body));
  earF.addChild(P(new Graphics(), [-4, -4, 0, -36, 8, -62, 18, -70, 24, -60, 22, -32, 14, -2], c.accent));
  front.addChild(earF);
  const wingF = new Container();
  wingF.position.set(22, 0);
  wingF.addChild(P(new Graphics(), [-8, -6, 30, -46, 84, -40, 98, -14, 84, -12, 80, 6, 66, 2, 58, 18, 46, 10, 30, 22, 20, 12, -8, 10], c.accent2));
  front.addChild(wingF);
  const face = new Graphics();
  face.ellipse(-2, 4, 8, 5).fill({ color: c.cheek, alpha: 0.6 });
  face.ellipse(44, 2, 7, 5).fill({ color: c.cheek, alpha: 0.6 });
  face.ellipse(24, -2, 4, 3).fill(0x5a3a6a);
  return {
    back, body, front,
    eyes: [makeEye(8, -14, 12, 14, c.body), makeEye(36, -16, 11, 13, c.body)],
    mouthAt: { x: 24, y: 10 },
    hat: { x: 0, y: -48 },
    flappers: [
      { g: wingB, base: 0, amp: 0.35, speed: 3 },
      { g: wingF, base: 0, amp: 0.35, speed: 3 },
      { g: earB, base: 0, amp: 0.1, speed: 1.2 },
      { g: earF, base: 0, amp: 0.1, speed: 1 },
    ],
    steamPts: [{ x: -40, y: -116 }, { x: 40, y: -118 }],
    spots: { band: [[-30, 6, 0.5], [20, 32, -0.4]], bump: [-4, -48] },
    extraFace: face,
  };
}

const BUILDERS: Record<CritterId, (c: CritterDef['colors']) => Built> = {
  boba: buildBoba,
  mochi: buildMochi,
  pebble: buildPebble,
  gloop: buildGloop,
  toto: buildToto,
};

// ---------- hats ----------

export function drawHat(h: HatId): Container {
  const c = new Container();
  const g = new Graphics();
  switch (h) {
    case 'party':
      P(g, [-26, 2, -14, -30, -6, -52, 0, -64, 6, -52, 14, -30, 26, 2], 0xff6f91);
      P(g, [-18, -14, -6, -20, 6, -20, 18, -14, 15, -6, -15, -6, -18, -14], 0xffd36e);
      P(g, [-10, -36, -3, -40, 3, -40, 10, -36, 8, -30, -8, -30, -10, -36], 0x9ff0d6);
      g.circle(0, -66, 8).fill(0xffd36e);
      g.ellipse(0, 2, 30, 7).fill(0xff4f7b);
      break;
    case 'chef':
      g.roundRect(-30, -22, 60, 26, 8).fill(0xfff8ef);
      g.circle(-22, -36, 18).fill(0xffffff);
      g.circle(0, -46, 22).fill(0xffffff);
      g.circle(22, -36, 18).fill(0xffffff);
      g.roundRect(-30, -6, 60, 9, 4).fill(0xffd9b8);
      break;
    case 'cork':
      P(g, [-30, -26, -30, -52, 30, -52, 30, -26, 30, -16, -30, -16, -30, -26], 0xd9a066);
      g.roundRect(-18, -20, 36, 24, 6).fill(0xc78d55);
      g.circle(-12, -38, 3).fill(0xa86e44);
      g.circle(10, -32, 2.5).fill(0xa86e44);
      g.circle(4, -44, 2).fill(0xa86e44);
      g.roundRect(-20, -8, 40, 5, 2).fill(0xffd36e);
      break;
    case 'beanie':
      P(g, [-32, 2, -34, -36, 34, -36, 32, 2], 0x7c86e8);
      P(g, [-32, -4, -30, -40, -14, -50, 0, -50, 14, -50, 30, -40, 32, -4], 0x9ea8ff);
      g.roundRect(-34, -8, 68, 12, 6).fill(0xff9f5a);
      // swirl
      P(g, [-6, -30, -6, -40, 8, -42, 10, -32, 12, -22, -2, -20, -4, -26, -2, -30, 4, -28, 4, -32], 0xffd36e);
      g.circle(0, -54, 9).fill(0xff9f5a);
      break;
    case 'crown': // a crown of little flames
      g.roundRect(-30, -14, 60, 16, 6).fill(0xffb347);
      for (const [x, h] of [[-22, 30], [0, 42], [22, 30]] as const) {
        P(g, [x, -12, x - 12, -18, x - 8, -h * 0.7, x, -h, x + 8, -h * 0.7, x + 12, -18, x, -12], 0xff6f61);
        P(g, [x, -12, x - 6, -16, x - 4, -h * 0.5, x, -h * 0.72, x + 4, -h * 0.5, x + 6, -16, x, -12], 0xffd36e);
      }
      break;
    case 'paper': // a paper hat, folded from a pancake
      g.poly([-40, 0, 40, 0, 0, -50]).fill(0xfff4e6);
      g.poly([-40, 0, 0, -50, -6, -6]).fill(0xe8dccb);
      g.roundRect(-42, -8, 84, 10, 3).fill(0xd6c6b0);
      break;
    case 'chili':
      P(g, [-30, -4, -36, -26, -10, -40, 18, -34, 40, -28, 46, -10, 30, -2, 0, 2, -30, -4], 0xe8413a);
      g.ellipse(-14, -26, 10, 4).fill({ color: 0xffffff, alpha: 0.35 });
      P(g, [36, -30, 44, -40, 54, -42, 52, -34, 46, -26, 36, -30], 0x5fd9b0);
      break;
    case 'hardhat':
      P(g, [-36, 0, -36, -28, -20, -46, 0, -46, 20, -46, 36, -28, 36, 0], 0xffc93c);
      g.roundRect(-44, -6, 88, 10, 5).fill(0xf2a91a);
      g.roundRect(-4, -46, 8, 40, 4).fill(0xf2a91a);
      g.circle(0, -30, 7).fill(0xfff4e6);
      break;
    case 'earmuffs':
      g.moveTo(-36, -2).bezierCurveTo(-36, -54, 36, -54, 36, -2).lineTo(28, -2).bezierCurveTo(28, -42, -28, -42, -28, -2).closePath().fill(0x7c86e8);
      g.circle(-38, 0, 16).fill(0xffffff).circle(38, 0, 16).fill(0xffffff);
      g.circle(-40, -4, 6).fill(0xe6f4ff).circle(36, -4, 6).fill(0xe6f4ff);
      break;
    case 'antenna': {
      g.roundRect(-30, -12, 60, 14, 7).fill(0x3a2240);
      g.roundRect(-3, -48, 6, 40, 3).fill(0x3a2240);
      const star: number[] = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? 7 : 16;
        star.push(Math.cos(a) * r, -58 + Math.sin(a) * r);
      }
      g.poly(star).fill(0xffd36e);
      break;
    }
    case 'propeller':
      P(g, [-30, 2, -30, -34, 30, -34, 30, 2], 0xff6f61);
      P(g, [-30, 0, -28, -30, -12, -40, 0, -40, 12, -40, 28, -30, 30, 0], 0xff6f61);
      P(g, [-30, 0, -28, -30, -12, -40, 0, -40, 0, -20, 0, 0, -30, 0], 0xffd36e);
      g.roundRect(-3, -54, 6, 16, 3).fill(0x3a2240);
      const blades = new Graphics();
      blades.ellipse(-20, 0, 20, 5).fill(0x9ff0d6);
      blades.ellipse(20, 0, 20, 5).fill(0x7debc3);
      blades.circle(0, 0, 5).fill(0xffd36e);
      blades.y = -56;
      blades.label = 'blades';
      c.addChild(g, blades);
      return c;
  }
  c.addChild(g);
  return c;
}

// ---------- the rig ----------

export function buildRig(def: CritterDef): Rig {
  const b = BUILDERS[def.id](def.colors);
  const root = new Container();
  const squash = new Container();
  const flip = new Container();
  root.addChild(squash);
  squash.addChild(flip);

  const skinBack = b.back;
  const skinBody = b.body;
  const skinFront = b.front;
  const face = new Container();
  if (b.extraFace) face.addChild(b.extraFace);
  for (const e of b.eyes) face.addChild(e.root);
  const eyeAlt = new Graphics();
  const mouth = new Graphics();
  face.addChild(eyeAlt, mouth);
  const soot = new Graphics();
  const wear = new Graphics();
  const hatAnchor = new Container();
  hatAnchor.position.set(b.hat.x, b.hat.y);

  const peel = buildPeel(def.id);
  peel.visible = false;
  flip.addChild(skinBack, skinBody, peel, soot, face, skinFront, wear, hatAnchor);

  let drawn = false;
  const rig: Rig = {
    root, squash, flip,
    skin: [skinBack, skinBody, skinFront],
    eyes: b.eyes,
    eyeAlt,
    mouth,
    mouthAt: b.mouthAt,
    flappers: b.flappers,
    tail: b.tail,
    tuft: b.tuft,
    wear,
    soot,
    hatAnchor,
    steamPts: b.steamPts,
    spots: b.spots,
    expr: 'normal',
    setExpr(e) {
      if (e === rig.expr && drawn) return;
      drawn = true;
      rig.expr = e;
      drawFace(rig, def, e);
    },
    setWear(level) {
      wear.clear();
      const [bump, band] = [rig.spots.bump, rig.spots.band];
      if (level >= 1) {
        wear.ellipse(bump[0], bump[1] - 6, 14, 12).fill(0xff8fa8);
        wear.ellipse(bump[0] - 3, bump[1] - 10, 5, 3).fill({ color: 0xffffff, alpha: 0.6 });
        bandAid(wear, band[0][0], band[0][1], band[0][2]);
      }
      if (level >= 2) bandAid(wear, band[1][0], band[1][1], band[1][2]);
      if (rig.tuft) rig.tuft.visible = level < 2;
    },
    setSoot(v) {
      soot.clear();
      if (v < 0.05) return;
      const a = Math.min(0.75, v);
      const s = def.r;
      soot.ellipse(-s * 0.35, s * 0.15, s * 0.32, s * 0.2).fill({ color: 0x3b2a44, alpha: a * 0.7 });
      soot.ellipse(s * 0.35, -s * 0.5, s * 0.2, s * 0.13).fill({ color: 0x3b2a44, alpha: a * 0.6 });
      soot.ellipse(s * 0.05, s * 0.6, s * 0.28, s * 0.14).fill({ color: 0x3b2a44, alpha: a * 0.65 });
    },
    setPeeled(on) {
      peel.visible = on;
      if (def.id === 'gloop') skinBody.alpha = on ? 0.18 : 1;
      if (def.id === 'mochi') {
        b.flappers[0].g.visible = !on;
        if (b.tuft) b.tuft.visible = !on;
      }
    },
    setHat(h) {
      hatAnchor.removeChildren();
      if (h) hatAnchor.addChild(drawHat(h));
    },
    pose(look, blink, lidBase) {
      for (const e of rig.eyes) {
        e.pupil.x = look.x * e.rx * 0.38;
        e.pupil.y = look.y * e.ry * 0.38;
        e.lid.scale.y = Math.max(lidBase, blink);
      }
    },
  };
  rig.setExpr(def.deadpan ? 'deadpan' : 'normal');
  return rig;
}

function bandAid(g: Graphics, x: number, y: number, rot: number) {
  const pts = (a: number) => {
    const c = Math.cos(a), s = Math.sin(a);
    const w = 22, h = 7;
    return [[-w, -h], [w, -h], [w, h], [-w, h]].map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]).flat();
  };
  g.poly(pts(rot + 0.7)).fill(0xffe2c4);
  g.poly(pts(rot - 0.7)).fill(0xffd2ae);
  g.circle(x, y, 4).fill(0xf0b88c);
}

function drawFace(rig: Rig, def: CritterDef, e: Expr) {
  const g = rig.eyeAlt;
  const m = rig.mouth;
  g.clear();
  m.clear();
  const normalEyes = e === 'normal' || e === 'surprised' || e === 'worried' || e === 'deadpan' || e === 'sleep' || e === 'blush';
  for (const eye of rig.eyes) {
    eye.root.visible = normalEyes;
    const s = e === 'surprised' ? 1.18 : 1;
    eye.root.scale.set(s);
    eye.pupil.scale.set(e === 'surprised' ? 0.7 : 1);
  }
  const ink = { width: 5, color: INK, cap: 'round' as const, join: 'round' as const };
  for (const eye of rig.eyes) {
    const { x, y } = eye.root.position;
    const r = eye.rx;
    switch (e) {
      case 'shy':
      case 'sour':
      case 'squint': // > <
        g.moveTo(x - r * 0.8, y - r * 0.7).lineTo(x + r * 0.5, y).lineTo(x - r * 0.8, y + r * 0.7).stroke(ink);
        break;
      case 'happy': // ^ ^
        g.moveTo(x - r * 0.8, y + r * 0.3).lineTo(x, y - r * 0.5).lineTo(x + r * 0.8, y + r * 0.3).stroke(ink);
        break;
      case 'ko': // X
        g.moveTo(x - r * 0.7, y - r * 0.7).lineTo(x + r * 0.7, y + r * 0.7).stroke(ink);
        g.moveTo(x + r * 0.7, y - r * 0.7).lineTo(x - r * 0.7, y + r * 0.7).stroke(ink);
        break;
      case 'dizzy': {
        g.circle(x, y, r * 1.05).fill(0xffffff);
        let first = true;
        for (let a = 0; a < Math.PI * 5; a += 0.3) {
          const rr = (a / (Math.PI * 5)) * r * 0.9;
          const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
          if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py);
        }
        g.stroke({ width: 3.5, color: INK, cap: 'round', join: 'round' });
        break;
      }
    }
  }
  if (e === 'worried') {
    for (const eye of rig.eyes) {
      const { x, y } = eye.root.position;
      g.moveTo(x - eye.rx, y - eye.ry - 4).lineTo(x + eye.rx * 0.6, y - eye.ry - 10).stroke({ width: 4, color: INK, cap: 'round' });
    }
  }
  if (e === 'blush' || e === 'shy') {
    for (const eye of rig.eyes) {
      const { x, y } = eye.root.position;
      for (let i = -1; i <= 1; i++) g.moveTo(x + i * 7 - 3, y + eye.ry + 10).lineTo(x + i * 7 + 3, y + eye.ry + 4).stroke({ width: 3, color: 0xff5f8f, cap: 'round' });
    }
  }
  // mouth
  const { x, y } = rig.mouthAt;
  const duck = def.id === 'mochi';
  const pebble = def.id === 'pebble';
  switch (e) {
    case 'sour': // clamped shut, cheeks puffed
      if (duck) m.ellipse(x - 10, y + 2, 6, 3).fill(0xd96a2a);
      else {
        m.moveTo(x - 7, y + 4).lineTo(x + 7, y + 4).stroke({ width: 4, color: INK, cap: 'round' });
        m.circle(x - 16, y - 2, 7).fill({ color: def.colors.cheek, alpha: 0.8 }).circle(x + 16, y - 2, 7).fill({ color: def.colors.cheek, alpha: 0.8 });
      }
      break;
    case 'shy':
      if (!duck) m.moveTo(x - 6, y + 4).quadraticCurveTo(x, y, x + 6, y + 4).stroke({ width: 3.5, color: INK, cap: 'round' });
      break;
    case 'surprised':
    case 'squint':
      if (duck) m.ellipse(x - 10, y + 4, 11, 7).fill(0xd96a2a);
      else m.ellipse(x, y + 4, e === 'squint' ? 9 : 7, e === 'squint' ? 7 : 9).fill(0x7a2e4a);
      break;
    case 'ko':
      if (duck) m.ellipse(x - 10, y + 4, 9, 4).fill(0xd96a2a);
      else m.moveTo(x - 9, y + 4).quadraticCurveTo(x - 4, y - 2, x, y + 4).quadraticCurveTo(x + 4, y + 10, x + 9, y + 4).stroke({ width: 3.5, color: INK, cap: 'round' });
      break;
    case 'dizzy':
    case 'worried':
      if (duck) m.ellipse(x - 10, y + 4, 8, 4).fill(0xd96a2a);
      else m.moveTo(x - 10, y + 6).quadraticCurveTo(x - 5, y, x, y + 6).quadraticCurveTo(x + 5, y + 12, x + 10, y + 6).stroke({ width: 3.5, color: INK, cap: 'round' });
      break;
    case 'deadpan':
    case 'sleep':
      if (!duck) m.moveTo(x - (pebble ? 12 : 8), y + 3).lineTo(x + (pebble ? 4 : 8), y + 3).stroke({ width: 3.5, color: INK, cap: 'round' });
      break;
    case 'happy':
    case 'normal':
    case 'blush':
    default:
      if (duck) break;
      m.moveTo(x - 9, y).quadraticCurveTo(x - 4.5, y + 7, x, y).quadraticCurveTo(x + 4.5, y + 7, x + 9, y).stroke({ width: 3.5, color: INK, cap: 'round' });
      if (def.id === 'toto') {
        m.poly([x - 7, y + 2, x - 3, y + 2, x - 5, y + 8]).fill(0xffffff);
        m.poly([x + 3, y + 2, x + 7, y + 2, x + 5, y + 8]).fill(0xffffff);
      }
  }
}
