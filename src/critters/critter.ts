import Matter from 'matter-js';
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { floorAt, G } from '../engine/game';
import { sfx } from '../engine/audio';
import { glowDot } from '../engine/textures';
import { ledger } from '../data/discoveries';
import type { CritterDef } from './defs';
import { buildRig, INK, type Expr, type HatId, type Rig } from './rig';

const { Bodies, Body, Composite } = Matter;

export type KoCause = 'boil' | 'impact' | 'lid' | 'poke' | 'roast' | 'crush' | 'zaqqum' | 'scorch' | 'shatter' | 'meteor';

/** the rubber stamp that slams down on every KO */
const STAMP: Record<KoCause, string> = {
  boil: 'BOILED', lid: 'CORKED', impact: 'SPLAT', poke: 'POKED', roast: 'ROASTED', crush: 'PANCAKED',
  zaqqum: 'SPICY POP', scorch: 'SCORCHED', shatter: 'SHATTERED', meteor: 'BURNT UP',
};

/** what each critter mutters as it snaps back together (darker the more it has died) */
const REGEN: Record<string, string[]> = {
  boba: ['Not again!', 'I had plans.', 'My nine lives ran out ages ago.', 'Still hungry, though.'],
  mochi: ['Not agaaain!', 'I want a manager.', 'Is this line even moving?', 'I was here first!'],
  pebble: ['-_-', 'k.', '...', 'mm.'],
  gloop: ['Blorp! Not again!', 'I reformed. Literally.', 'Sticky situation.', 'Still in one piece. Mostly.'],
  toto: ['Eek! Not again!', 'Did everyone see that?', 'Don’t tell anyone.', 'You didn’t hear it from me.'],
};

const lerpColor = (a: number, b: number, t: number) => {
  const ar = a >> 16, ag = (a >> 8) & 255, ab = a & 255;
  const br = b >> 16, bg = (b >> 8) & 255, bb = b & 255;
  t = Math.max(0, Math.min(1, t));
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export class Critter {
  readonly def: CritterDef;
  readonly rig: Rig;
  readonly body: Matter.Body;
  health = 100;
  temp = 0; // 0 cool .. 1 lobster
  soot = 0;
  dizzy = 0;
  state: 'live' | 'ko' = 'live';
  koT = 0;
  koCause: KoCause = 'impact';
  held = false;
  facing = 1;
  hat: HatId | null = null;
  /** set by floors every step */
  soak = 0;
  soupHeat = 0;
  ambient = 0.1;
  chill = 0; // ambient cold 0..1 (Gate 6)
  /** a floor can ask for a lying angle (conveyor) or a mood face, refreshed every step */
  targetAngle: number | null = null;
  mood: Expr | null = null;

  // statuses that stack across floors
  peeledT = 0;
  flatT = 0;
  frozenT = 0;
  shiverT = 0;
  spice = 0;
  meteor = 0;
  weighted = false;
  tongue = false;
  cold = 0;

  private flatScaled = false;
  private sq = 0;
  private sqv = 0;
  private blinkT = rnd(1, 4);
  private blink = 0;
  private idleT = 0;
  private happyT = 0;
  private wearLevel = 0;
  private sootDrawn = -1;
  private whistleT = 0;
  private bubble: Container | null = null;
  private bubbleT = 0;
  private ghost: Container | null = null;
  private ghostT = 0;
  private stamp: Container | null = null;
  private flap = Math.random() * 10;
  private pancake = 0;
  private spawnFlash = 0;
  private hopT = 0;
  private cube = new Graphics();
  private icicle = new Graphics();
  private aura: Sprite;
  private ash = new Graphics();
  private weight = new Graphics();
  private chatterT = 0;

  constructor(def: CritterDef, x: number, y: number) {
    this.def = def;
    this.rig = buildRig(def);
    const opts: Matter.IChamferableBodyDefinition = {
      restitution: def.bounce,
      friction: def.grip,
      frictionStatic: def.grip * 1.5,
      frictionAir: def.windDrag * 0.4 + 0.004,
      label: 'critter:' + def.id,
      collisionFilter: { category: 0x0002, mask: 0xffffffff }, // CAT_CRITTER: props and the ladle look for this
    };
    this.body =
      def.shape.kind === 'circle'
        ? Bodies.circle(x, y, def.shape.r, opts)
        : Bodies.rectangle(x, y, def.shape.w, def.shape.h, { ...opts, chamfer: { radius: def.shape.round } });
    Body.setMass(this.body, def.mass);
    (this.body as Matter.Body & { critter?: Critter }).critter = this;
    Composite.add(G.engine.world, this.body);

    // ice cube around the whole critter (rotates with it)
    const hw = def.shape.kind === 'box' ? def.shape.w / 2 + 18 : def.r + 20;
    const hh = def.shape.kind === 'box' ? def.shape.h / 2 + 18 : def.r + 20;
    this.cube.roundRect(-hw, -hh, hw * 2, hh * 2, 22).fill({ color: 0xbdefff, alpha: 0.42 });
    this.cube.roundRect(-hw + 10, -hh + 10, hw * 2 - 20, 18, 9).fill({ color: 0xffffff, alpha: 0.55 });
    this.cube.poly([-hw + 14, -hh + 40, -hw + 34, -hh + 34, -hw + 22, hh - 30, -hw + 12, hh - 36]).fill({ color: 0xffffff, alpha: 0.35 });
    this.cube.roundRect(-hw, hh - 16, hw * 2, 16, 8).fill({ color: 0x7fd3f0, alpha: 0.4 });
    this.cube.visible = false;
    this.rig.root.addChild(this.cube);
    // runny-nose icicle while shivering
    const m = this.rig.mouthAt;
    this.icicle.moveTo(m.x - 6, m.y - 14).lineTo(m.x + 6, m.y - 14).lineTo(m.x, m.y + 22).closePath().fill({ color: 0xd9f6ff, alpha: 0.9 });
    this.icicle.visible = false;
    this.rig.flip.addChild(this.icicle);
    // meteor aura
    this.aura = new Sprite(glowDot());
    this.aura.anchor.set(0.5);
    this.aura.tint = 0xff8a3c;
    this.aura.visible = false;
    G.layers.glow.addChild(this.aura);
    // ash heap (shown instead of the critter after a roasting KO)
    this.ash.ellipse(0, 0, def.r * 0.9, def.r * 0.42).fill(0x5d4a5e);
    this.ash.ellipse(-def.r * 0.3, -def.r * 0.2, def.r * 0.45, def.r * 0.3).fill(0x6e5a6e);
    this.ash.ellipse(def.r * 0.25, -def.r * 0.18, def.r * 0.4, def.r * 0.28).fill(0x7a667a);
    this.ash.visible = false;
    G.layers.over.addChild(this.ash, this.weight);

    G.layers.critters.addChild(this.rig.root);
    this.sync();
    this.spawnFlash = 1;
  }

  get x() { return this.body.position.x; }
  get y() { return this.body.position.y; }
  get peeled() { return this.peeledT > 0; }
  get frozen() { return this.frozenT > 0; }
  get flat() { return this.flatT > 0; }
  get floor() { return floorAt(this.y); }

  /** rough hit test, a bit generous for small fingers */
  hits(px: number, py: number) {
    const dx = px - this.x, dy = py - this.y;
    if (this.def.shape.kind === 'box' || this.flat) {
      const w = this.def.shape.kind === 'box' ? this.def.shape.w : this.def.r * 2;
      const h = this.def.shape.kind === 'box' ? this.def.shape.h : this.def.r * 2;
      const fw = this.flat ? w * 1.45 : w, fh = this.flat ? h * 0.32 : h;
      const c = Math.cos(-this.body.angle), s = Math.sin(-this.body.angle);
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      return Math.abs(lx) < fw / 2 + 14 && Math.abs(ly) < fh / 2 + 24;
    }
    return dx * dx + dy * dy < (this.def.r + 18) ** 2;
  }

  /** world position of a point given in the rig's local space */
  local(lx: number, ly: number) {
    const a = this.body.angle;
    const x = lx * this.facing, y = ly;
    return { x: this.x + x * Math.cos(a) - y * Math.sin(a), y: this.y + x * Math.sin(a) + y * Math.cos(a) };
  }
  mouth() { return this.local(this.rig.mouthAt.x, this.rig.mouthAt.y); }

  impact(speed: number) {
    const k = this.def.id === 'gloop' ? 0.05 : 0.026;
    this.sqv += Math.min(speed * k * 8, 9);
    if (speed > 9) {
      const pitch = this.def.id === 'gloop' ? 0.7 : this.def.id === 'toto' ? 1.6 : 1;
      if (this.frozen) sfx.clink();
      else if (this.def.bounce > 0.6) sfx.boing(pitch);
      else sfx.thud(Math.min(1, speed / 25));
    }
    const dmg = Math.max(0, speed - 15) * 2.2;
    if (dmg > 0) this.hurt(dmg, 'impact');
  }

  hurt(n: number, cause: KoCause) {
    if (this.state === 'ko') return;
    this.health -= n;
    if (this.health <= 0) {
      this.health = 0;
      this.ko(cause);
    }
  }

  boop() {
    this.happyT = 1.2;
    this.sqv += 4;
    this.idleT = 0;
    sfx.voice(this.def.id);
  }

  say(text: string, dur = 1.4) {
    if (!this.bubble) {
      const c = new Container();
      const bg = new Graphics();
      const t = new Text({ text: '', style: { fontFamily: 'Baloo 2, system-ui, sans-serif', fontWeight: '800', fontSize: 30, fill: INK } });
      t.anchor.set(0.5);
      c.addChild(bg, t);
      G.layers.over.addChild(c);
      this.bubble = c;
    }
    const [bg, t] = this.bubble.children as [Graphics, Text];
    t.text = text;
    const w = t.width + 34, h = 50;
    bg.clear();
    bg.roundRect(-w / 2, -h / 2, w, h, 25).fill(0xfff4e6);
    bg.poly([-10, h / 2 - 2, 10, h / 2 - 2, -4, h / 2 + 16]).fill(0xfff4e6);
    this.bubble.visible = true;
    this.bubble.scale.set(0.2);
    this.bubbleT = dur;
  }

  // ---------- statuses ----------

  peel(dur = 7) {
    if (this.state === 'ko') return false;
    const first = !this.peeled;
    this.peeledT = Math.max(this.peeledT, dur);
    if (first) {
      this.rig.setPeeled(true);
      const tint = { boba: 0xc6b0ff, mochi: 0xffde5c, pebble: 0xc08455, gloop: 0x7debc3, toto: 0x9ea8ff }[this.def.id];
      G.fx.emit(this.def.id === 'mochi' ? 'feather' : 'smoke', this.x, this.y - 10, 14, { tint, spread: 3, size: 1.1 });
      sfx.pop();
      this.sqv += 5;
    }
    return first;
  }

  flatten(dur = 1.8) {
    if (this.flatScaled) { this.flatT = Math.max(this.flatT, dur); return; }
    const b = this.body;
    Body.setAngle(b, 0);
    Body.setAngularVelocity(b, 0);
    Body.scale(b, 1.45, 0.32);
    Body.setMass(b, this.def.mass * (this.weighted ? 3 : 1));
    this.flatScaled = true;
    this.flatT = dur;
  }

  private unflatten() {
    if (!this.flatScaled) return;
    const b = this.body;
    Body.setAngle(b, 0);
    Body.scale(b, 1 / 1.45, 1 / 0.32);
    Body.setMass(b, this.def.mass * (this.weighted ? 3 : 1));
    Body.setPosition(b, { x: b.position.x, y: b.position.y - this.def.r * 0.7 });
    Body.setVelocity(b, { x: rnd(-2, 2), y: -9 });
    this.flatScaled = false;
    this.flatT = 0;
    this.sqv -= 8;
    sfx.pop();
    sfx.boing(1.3);
  }

  freeze(dur = 8) {
    if (this.state === 'ko') return;
    if (!this.frozen) {
      sfx.freeze();
      G.fx.emit('glint', this.x, this.y, 8, { spread: 4, tint: 0xd9f6ff });
      this.body.friction = 0.01;
      this.body.restitution = 0.15;
    }
    this.frozenT = Math.max(this.frozenT, dur);
  }

  private thaw() {
    this.frozenT = 0;
    this.body.friction = this.def.grip;
    this.body.restitution = this.def.bounce;
  }

  /** smashed out of the ice cube (Gate 6 mallet) */
  shatter() {
    if (!this.frozen) return false;
    this.thaw();
    sfx.shatter();
    G.fx.emit('glint', this.x, this.y, 16, { spread: 6, tint: 0xd9f6ff, size: 1.4 });
    G.fx.emit('drop', this.x, this.y, 14, { spread: 3, tint: 0xbdefff });
    this.shiverT = 7;
    this.cold = 1;
    G.discover('g6-shatter', this);
    this.hurt(34, 'shatter');
    return true;
  }

  /** a burning Zaqqum fruit, forced down */
  feed() {
    if (this.state === 'ko') return;
    if (this.def.deadpan) {
      this.spice = Math.min(0.6, this.spice + 0.2);
      setTimeout(() => {
        const m = this.mouth();
        G.fx.emit('smoke', m.x, m.y, 6, { vx: this.facing * 60, tint: 0x9c8aa0 });
        sfx.burp();
        this.say(Math.random() < 0.5 ? '*burp*' : 'pardon.');
      }, 700);
      G.discover('g4-burp', this);
      return;
    }
    this.spice += 0.42;
    this.hopT = 2.6;
    sfx.sizzle();
    this.sqv += 6;
    if (this.spice >= 1) {
      this.spice = 1;
      this.hurt(999, 'zaqqum');
    } else this.hurt(10, 'zaqqum');
  }

  setWeighted(on: boolean) {
    if (this.weighted === on) return;
    this.weighted = on;
    Body.setMass(this.body, this.def.mass * (on ? 3 : 1));
    this.weight.clear();
    if (on) {
      this.weight.rect(-3, 0, 6, 70).fill(0x5a5a6e);
      this.weight.circle(0, 92, 30).fill(0x3d3d4e);
      this.weight.circle(-9, 82, 8).fill({ color: 0xffffff, alpha: 0.25 });
      this.weight.roundRect(-16, 58, 32, 10, 4).fill(0x5a5a6e);
      sfx.clink();
    }
  }

  // ---------- KO + regen ----------

  ko(cause: KoCause) {
    this.state = 'ko';
    this.koT = 1.6;
    this.koCause = cause;
    sfx.ko();
    const n = ledger.bump(this.def.id);
    const p = this.local(0, -this.def.r * 0.6);
    switch (cause) {
      case 'boil':
      case 'lid':
        sfx.cork();
        Body.setVelocity(this.body, { x: rnd(-4, 4), y: -rnd(26, 32) });
        Body.setAngularVelocity(this.body, rnd(-0.4, 0.4));
        G.fx.emit('steam', this.x, this.y - 20, 10, { spread: 3, size: 1.6 });
        G.fx.emit('drop', this.x, this.y, 10, { tint: 0xff9b7a });
        break;
      case 'roast':
      case 'scorch':
        this.rig.root.visible = false;
        this.ash.visible = true;
        G.fx.emit('soot', this.x, this.y, 18, { spread: 3, size: 1.4 });
        G.fx.emit('spark', this.x, this.y, 14);
        break;
      case 'meteor':
        this.rig.root.visible = false;
        G.fx.emit('spark', this.x, this.y, 30, { spread: 2, size: 1.5 });
        G.fx.emit('star', this.x, this.y, 12, { spread: 2, tint: 0xffb36b });
        G.fx.emit('smoke', this.x, this.y, 10, { tint: 0x6e5a6e, spread: 3, size: 1.5 });
        break;
      case 'zaqqum': {
        const m = this.mouth();
        for (let i = 0; i < 24; i++) G.fx.emit('spark', m.x, m.y, 1, { vx: this.facing * rnd(200, 700), vy: rnd(-200, 100), tint: i % 2 ? 0xff6f61 : 0xffd36e, size: 1.6 });
        G.fx.emit('smoke', this.x, this.y - 20, 8, { tint: 0x6e5a6e, spread: 3 });
        Body.setVelocity(this.body, { x: -this.facing * 14, y: -16 });
        break;
      }
      case 'crush':
        this.flatten(1.6);
        break;
      case 'shatter':
        break;
      default:
        this.pancake = 1;
        G.fx.emit('star', p.x, p.y, 6);
    }
    if (this.def.id === 'mochi' && !this.peeled) G.fx.emit('feather', this.x, this.y, 10);
    if (this.def.id === 'boba') G.fx.emit('soot', this.x, this.y, 8);
    this.spawnGhost();
    this.showStamp(`${STAMP[cause]} · #${n}`);
    const d = this.koDiscovery(cause);
    if (d) G.discover(d, this);
  }

  private koDiscovery(cause: KoCause): string | null {
    switch (cause) {
      case 'boil': case 'lid': return 'g1-boil';
      case 'roast': return 'g2-roast';
      case 'crush': return 'g3-pancake';
      case 'zaqqum': return 'g4-fireball';
      case 'scorch': return 'g5-scorch';
      case 'meteor': return 'g7-meteor';
      case 'impact': return this.floor === 0 ? 'rim-splat' : 'any-splat';
      default: return null;
    }
  }

  private showStamp(text: string) {
    if (!this.stamp) {
      const c = new Container();
      const bg = new Graphics();
      const t = new Text({ text: '', style: { fontFamily: 'Baloo 2, system-ui, sans-serif', fontWeight: '800', fontSize: 26, fill: 0xfff4e6, letterSpacing: 2 } });
      t.anchor.set(0.5);
      c.addChild(bg, t);
      G.layers.over.addChild(c);
      this.stamp = c;
    }
    const [bg, t] = this.stamp.children as [Graphics, Text];
    t.text = text;
    bg.clear();
    bg.roundRect(-t.width / 2 - 14, -22, t.width + 28, 44, 8).fill({ color: 0xc2364a, alpha: 0.92 });
    this.stamp.rotation = rnd(-0.18, 0.08);
    this.stamp.scale.set(2.2);
    this.stamp.alpha = 1;
    this.stamp.visible = true;
  }

  private spawnGhost() {
    if (!this.ghost) {
      const c = new Container();
      const g = new Graphics();
      g.moveTo(0, -38).bezierCurveTo(24, -38, 30, -16, 30, 4).lineTo(30, 26)
        .bezierCurveTo(24, 20, 20, 32, 14, 26).bezierCurveTo(8, 20, 4, 32, 0, 26)
        .bezierCurveTo(-4, 32, -8, 20, -14, 26).bezierCurveTo(-20, 32, -24, 20, -30, 26)
        .lineTo(-30, 4).bezierCurveTo(-30, -16, -24, -38, 0, -38).closePath().fill({ color: 0xffffff, alpha: 0.9 });
      const ink = { width: 3.5, color: INK, cap: 'round' as const };
      for (const ex of [-10, 10]) {
        g.moveTo(ex - 5, -14).lineTo(ex + 5, -4).stroke(ink);
        g.moveTo(ex + 5, -14).lineTo(ex - 5, -4).stroke(ink);
      }
      g.ellipse(0, 8, 5, 4).fill(INK);
      c.addChild(g);
      G.layers.over.addChild(c);
      this.ghost = c;
    }
    this.ghost.visible = true;
    this.ghost.position.set(this.x, this.y - this.def.r);
    this.ghostT = 1.4;
  }

  private regen() {
    this.state = 'live';
    this.health = 100;
    this.temp = 0;
    this.soot = 0;
    this.dizzy = 0;
    this.pancake = 0;
    this.spice = 0;
    this.meteor = 0;
    this.shiverT = 0;
    this.cold = 0;
    if (this.peeled) { this.peeledT = 0; this.rig.setPeeled(false); }
    if (this.frozen) this.thaw();
    if (this.flatScaled) this.unflatten();
    this.rig.root.visible = true;
    this.ash.visible = false;
    this.spawnFlash = 1;
    sfx.regen();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      G.fx.emit('ember', this.x + Math.cos(a) * this.def.r, this.y + Math.sin(a) * this.def.r, 1, { vx: -Math.cos(a) * 120, vy: -Math.sin(a) * 120, tint: 0xffb36b, size: 1.6 });
    }
    const n = ledger.count(this.def.id);
    const lines = REGEN[this.def.id];
    // the first few times it is shock; later it is resignation
    this.say(n < 3 ? lines[0] : lines[Math.floor(Math.random() * lines.length)]);
    this.sqv -= 6;
  }

  remove() {
    Composite.remove(G.engine.world, this.body);
    this.rig.root.destroy({ children: true });
    this.bubble?.destroy({ children: true });
    this.ghost?.destroy({ children: true });
    this.stamp?.destroy({ children: true });
    this.aura.destroy();
    this.ash.destroy();
    this.weight.destroy();
  }

  /** called once per physics step for forces that need the fixed step */
  step() {
    const b = this.body;
    const target = this.targetAngle;
    this.targetAngle = null;
    if (this.held) return;
    if (this.flat || this.frozen) {
      if (this.flat) {
        Body.setAngularVelocity(b, 0);
        Body.setAngle(b, 0);
      }
    } else {
      // self-righting (or lying the way a floor wants), lighter critters wobble more
      const a = wrapAngle(b.angle - (target ?? 0));
      const right = target !== null ? 0.02 : this.soak > 0.1 ? 0.002 : 0.006 / this.def.spin;
      if (Math.abs(a) > 0.001) Body.setAngularVelocity(b, b.angularVelocity * 0.985 - a * right);
    }
    // wind gusts: push light, draggy critters about
    const w = G.tinker.wind;
    if (w > 0.01 && !this.weighted) {
      const t = G.time;
      const gust = (Math.sin(t * 0.7) * 0.6 + Math.sin(t * 1.9 + 1.3) * 0.4) * w;
      const f = gust * this.def.windDrag * 0.0016 * b.mass;
      Body.applyForce(b, b.position, { x: f, y: -Math.abs(f) * 0.3 });
    }
    // Zaqqum: frantic hopping
    if (this.hopT > 0 && this.state === 'live' && Math.abs(b.velocity.y) < 1.5 && Math.random() < 0.08) {
      Body.setVelocity(b, { x: rnd(-7, 7), y: -rnd(9, 14) });
      this.facing = b.velocity.x >= 0 ? 1 : -1;
    }
  }

  update(dt: number) {
    const b = this.body;
    const speed = Math.hypot(b.velocity.x, b.velocity.y);

    // heat: soup sets the target, air cools it back down
    const target = this.soak > 0.2 ? this.soupHeat : this.ambient;
    this.temp += (target - this.temp) * Math.min(1, dt * 0.6 * this.def.thermal);
    this.temp = Math.max(0, Math.min(1, this.temp));
    if (this.state === 'live' && this.soak > 0.2 && this.soupHeat > 0.15) {
      this.hurt((this.soupHeat - 0.1) * 13 * this.def.thermal * dt, 'boil');
    }
    this.cold += (Math.max(this.chill, this.frozen ? 1 : 0, this.shiverT > 0 ? 0.8 : 0) - this.cold) * Math.min(1, dt * 0.8 * this.def.thermal);
    this.dizzy = Math.max(0, this.dizzy - dt * 0.35);
    this.spice = Math.max(0, this.spice - dt * 0.06);
    if (this.floor !== 7) this.meteor = Math.max(0, this.meteor - dt * 0.8);
    this.hopT = Math.max(0, this.hopT - dt);

    // timers
    if (this.peeledT > 0) {
      this.peeledT -= dt;
      if (this.peeledT <= 0) {
        this.rig.setPeeled(false);
        G.fx.emit('smoke', this.x, this.y, 8, { tint: 0xf6d6e6, spread: 3 });
        sfx.pop();
      }
    }
    if (this.flatT > 0 && this.state === 'live') {
      this.flatT -= dt;
      if (this.flatT <= 0) this.unflatten();
    }
    if (this.frozenT > 0) {
      this.frozenT -= dt;
      if (Math.random() < dt * 3) G.fx.emit('drop', this.x + rnd(-30, 30), this.y + this.def.r, 1, { tint: 0xbdefff, vy: 60, spread: 0.2 });
      if (this.frozenT <= 0) { this.thaw(); this.shiverT = 4; sfx.splash(); }
    }
    if (this.shiverT > 0) {
      this.shiverT -= dt;
      this.chatterT -= dt;
      if (this.chatterT < 0) { this.chatterT = rnd(0.3, 0.8); sfx.rattle(); }
    }

    // facing follows horizontal motion
    if (!this.held && !this.frozen && Math.abs(b.velocity.x) > 1.2) this.facing = Math.sign(b.velocity.x);
    else if (this.held && G.pointer.active) this.facing = G.pointer.x >= this.x ? 1 : -1;

    // idle → nap (Boba) / restless (Toto, Mochi)
    if (speed < 0.4 && !this.held && this.soak < 0.1) this.idleT += dt;
    else this.idleT = 0;
    const free = this.state === 'live' && !this.frozen && !this.flat;
    const napping = this.def.id === 'boba' && this.idleT > 6 && free && this.chill < 0.3;
    if (napping && Math.random() < dt * 0.6) {
      const p = this.local(30, -this.def.r);
      G.fx.emit('z', p.x, p.y);
    }
    if (free && this.def.id === 'toto' && this.idleT > 4 && Math.random() < dt * 0.5) {
      Body.setVelocity(b, { x: rnd(-3, 3), y: -rnd(6, 9) });
      this.idleT = 0;
    }
    if (free && this.def.id === 'mochi' && this.idleT > 5 && Math.random() < dt * 0.3) {
      Body.setVelocity(b, { x: rnd(2, 4) * (Math.random() < 0.5 ? -1 : 1), y: -5 });
      this.idleT = 0;
    }

    // blinking (not inside an ice cube)
    this.blinkT -= dt;
    if (this.blinkT < 0 && !this.frozen) {
      this.blink = 1;
      this.blinkT = rnd(1.8, 4.5);
    }
    this.blink = Math.max(0, this.blink - dt * 8);

    // expression
    this.happyT = Math.max(0, this.happyT - dt);
    const dead = this.def.deadpan;
    let e: Expr = dead ? 'deadpan' : 'normal';
    let lidBase = dead ? 0.45 : 0;
    if (this.state === 'ko') e = 'ko';
    else if (this.frozen) e = dead ? 'deadpan' : 'surprised';
    else if (this.flat) e = dead ? 'deadpan' : 'dizzy';
    else if (this.dizzy > 0.6) e = 'dizzy';
    else if (this.held) e = dead ? 'deadpan' : 'surprised';
    else if (this.mood) e = dead ? 'deadpan' : this.mood;
    else if (this.spice > 0.25) e = dead ? 'deadpan' : 'squint';
    else if (this.peeled) e = dead ? 'deadpan' : this.def.id === 'boba' ? 'shy' : 'worried';
    else if (this.soak > 0.2 && this.temp > 0.45) e = dead ? 'deadpan' : 'squint';
    else if (this.happyT > 0) e = dead ? 'deadpan' : 'happy';
    else if (napping) { e = 'sleep'; lidBase = 1; }
    else if (this.shiverT > 0) { e = dead ? 'deadpan' : 'worried'; lidBase = dead ? 0.5 : 0.2; }
    else if (this.health < 35) { e = dead ? 'deadpan' : 'worried'; lidBase = dead ? 0.5 : 0.15; }
    else if (this.temp > 0.5) e = dead ? 'deadpan' : 'blush';
    this.mood = null;
    this.rig.setExpr(e);

    // look at the pointer when it is near, else straight ahead
    let lx = 0.6, ly = 0.1;
    if (G.pointer.active && !this.frozen) {
      const dx = (G.pointer.x - this.x) * this.facing, dy = G.pointer.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 700 && d > 1) { lx = dx / d; ly = dy / d; }
    }
    this.rig.pose({ x: lx, y: ly }, this.blink, lidBase);

    // wear marks + soot
    const lvl = this.health > 60 ? 0 : this.health > 30 ? 1 : 2;
    if (lvl !== this.wearLevel) { this.wearLevel = lvl; this.rig.setWear(lvl); }
    const sootQ = Math.round(this.soot * 10) / 10;
    if (sootQ !== this.sootDrawn) { this.sootDrawn = sootQ; this.rig.setSoot(sootQ); }

    // tint: pastel → lobster (heat) → chilli red (spice) → icy blue (cold) → meteor orange, flash on respawn
    this.spawnFlash = Math.max(0, this.spawnFlash - dt * 2);
    let tint = lerpColor(0xffffff, 0xff6f6f, this.temp * 0.85);
    tint = lerpColor(tint, 0xff3b30, this.spice * 0.9);
    tint = lerpColor(tint, 0x9fd8ff, this.cold * 0.75);
    tint = lerpColor(tint, 0xff9a3c, this.meteor * 0.8);
    tint = lerpColor(tint, 0xffe7b0, this.spawnFlash);
    for (const s of this.rig.skin) s.tint = tint;

    // ear-steam whistles; Boba puffs soot when hot
    if (this.temp > 0.55 && this.state === 'live') {
      this.whistleT -= dt;
      if (Math.random() < dt * 14 * this.temp) {
        const p = this.rig.steamPts[Math.random() < 0.5 ? 0 : 1];
        const w = this.local(p.x, p.y);
        G.fx.emit('steam', w.x, w.y, 1, { vy: -120, size: 0.8 });
      }
      if (this.whistleT < 0) { sfx.whistle(this.temp); this.whistleT = rnd(1.4, 2.6); }
      if (this.def.id === 'boba' && Math.random() < dt * 1.5) G.fx.emit('soot', this.x, this.y - 30, 3, { size: 0.7 });
    }
    // flame breath after Zaqqum
    if (this.spice > 0.25 && this.state === 'live' && !this.def.deadpan && Math.random() < dt * 30 * this.spice) {
      const m = this.mouth();
      G.fx.emit('spark', m.x, m.y, 1, { vx: this.facing * rnd(250, 520), vy: rnd(-80, 40), tint: Math.random() < 0.5 ? 0xff6f61 : 0xffd36e, size: 1.3, spread: 0.3 });
    }

    // squash & stretch spring
    const K = 220, D = this.def.id === 'gloop' ? 7 : 12;
    this.sqv += (-K * this.sq - D * this.sqv) * dt;
    this.sq += this.sqv * dt;
    this.sq = Math.max(-0.35, Math.min(0.55, this.sq));
    this.pancake = Math.max(0, this.pancake - dt * 0.8);
    const stretch = this.held ? 0.1 : Math.min(0.16, Math.abs(b.velocity.y) * 0.006);
    let sy = 1 - this.sq + stretch;
    let sx = 1 + this.sq * 0.75 - stretch * 0.6;
    if (this.pancake > 0) {
      const p = Math.min(1, this.pancake * 1.6);
      sy = sy * (1 - p * 0.68);
      sx = sx * (1 + p * 0.6);
    }
    if (napping) sy *= 1 + Math.sin(G.time * 2) * 0.02;
    if (this.frozen) { sx = 1; sy = 1; }
    if (this.flatScaled) {
      this.rig.squash.scale.set(1.45, 0.32);
      this.rig.squash.y = 0;
    } else {
      this.rig.squash.scale.set(sx, sy);
      this.rig.squash.y = this.def.r * (1 - sy);
    }
    this.rig.flip.x = this.shiverT > 0 ? Math.sin(G.time * 70) * 3 : 0;
    this.cube.visible = this.frozen;
    this.icicle.visible = this.shiverT > 0;

    // flappy bits (still inside ice)
    const excite = this.frozen ? 0 : this.held || speed > 6 || this.soak > 0.2 || this.hopT > 0 ? 3 : 1;
    this.flap += dt * excite;
    for (const f of this.rig.flappers) f.g.rotation = f.base + Math.sin(this.flap * f.speed * Math.PI * 2) * f.amp * (excite > 1 ? 1.6 : 1);
    if (this.rig.tail && !this.frozen) this.rig.tail.rotation = Math.sin(G.time * 2.4) * 0.18;
    const blades = this.rig.hatAnchor.getChildByLabel('blades', true);
    if (blades) blades.scale.x = Math.cos(G.time * (speed > 3 ? 30 : 6));

    // meteor aura + trail
    this.aura.visible = this.meteor > 0.05 && this.rig.root.visible;
    if (this.aura.visible) {
      this.aura.position.set(this.x, this.y - this.def.r * 0.3);
      this.aura.width = this.aura.height = this.def.r * (3 + this.meteor * 2.5);
      this.aura.alpha = this.meteor * (0.75 + Math.sin(G.time * 30) * 0.1);
      if (Math.random() < dt * 60 * this.meteor) {
        G.fx.emit(Math.random() < 0.6 ? 'spark' : 'ember', this.x + rnd(-this.def.r, this.def.r) * 0.6, this.y - this.def.r * 0.6, 1, { vy: -rnd(300, 700), vx: rnd(-60, 60), tint: Math.random() < 0.5 ? 0xff8a3c : 0xffd36e, size: 1.4, spread: 0.2 });
      }
    }
    // weight hangs below
    if (this.weighted) this.weight.position.set(this.x, this.y + this.def.r * 0.7);
    this.weight.visible = this.weighted;

    // ko / regen timers
    if (this.state === 'ko') {
      this.koT -= dt;
      if (this.ash.visible) {
        this.ash.position.set(this.x, this.y + this.def.r * 0.5);
        this.ash.clear();
        const r = this.def.r;
        this.ash.ellipse(0, 0, r * 0.9, r * 0.42).fill(0x5d4a5e);
        this.ash.ellipse(-r * 0.3, -r * 0.2, r * 0.45, r * 0.3).fill(0x6e5a6e);
        this.ash.ellipse(r * 0.25, -r * 0.18, r * 0.4, r * 0.28).fill(0x7a667a);
        // two eyes blinking out of the ash pile
        if (Math.sin(G.time * 5) > -0.7) this.ash.circle(-12, -r * 0.18, 6).fill(0xffffff).circle(12, -r * 0.18, 6).fill(0xffffff).circle(-11, -r * 0.16, 3).fill(INK).circle(13, -r * 0.16, 3).fill(INK);
        if (Math.random() < dt * 4) G.fx.emit('smoke', this.x + rnd(-20, 20), this.y, 1, { tint: 0x8a7a8e });
      }
      if (this.koT <= 0) this.regen();
    }
    if (this.ghost && this.ghost.visible) {
      this.ghostT -= dt;
      this.ghost.y -= dt * 90;
      this.ghost.x += Math.sin(G.time * 6) * 0.6;
      this.ghost.alpha = Math.min(1, this.ghostT * 1.5);
      if (this.ghostT <= 0) this.ghost.visible = false;
    }
    if (this.stamp && this.stamp.visible) {
      const s = Math.max(1, this.stamp.scale.x - dt * 12);
      this.stamp.scale.set(s);
      this.stamp.position.set(this.x, this.y - this.def.r - 30);
      if (this.state === 'live') this.stamp.alpha -= dt * 3;
      if (this.stamp.alpha <= 0) this.stamp.visible = false;
    }
    if (this.bubble && this.bubble.visible) {
      this.bubbleT -= dt;
      const s = Math.min(1, this.bubble.scale.x + dt * 8);
      this.bubble.scale.set(s);
      this.bubble.position.set(this.x, this.y - this.def.r - 60);
      if (this.bubbleT <= 0) this.bubble.visible = false;
    }
    this.sync();
  }

  private sync() {
    const r = this.rig;
    r.root.position.set(this.body.position.x, this.body.position.y);
    r.root.rotation = this.body.angle;
    r.flip.scale.x = this.facing;
  }
}
