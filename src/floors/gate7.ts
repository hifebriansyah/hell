import Matter from 'matter-js';
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { G, gateTop, G7_ROOM, SCENE_X0, SCENE_X1, TRAP_SIDE, trapSpan } from '../engine/game';
import { sfx } from '../engine/audio';
import { vGradient } from '../engine/textures';
import { GATE_PLAQUES } from '../data/plaques';
import { buildGate7Depth } from './depth-gates';
import { clamp, Floor, rnd, type PointerHit } from './floor';

const { Body } = Matter;

/** Gate 7 · al-Hawiyah: the bottomless pit. Critters fall forever, heat up, burn up like meteors, regrow mid-fall. */
export class Gate7 extends Floor {
  readonly index = 7;
  readonly name = 'Gate 7 · al-Hawiyah';
  readonly plaque = GATE_PLAQUES[7];
  readonly top = gateTop(7);
  readonly bottom = gateTop(7) + G7_ROOM;
  readonly focusY = gateTop(7) + G7_ROOM / 2 - 60;

  private streaks = new Graphics();
  private scroll = 0;
  private boost = false;
  private lever = new Container();
  private leverGlow: Sprite;
  private rack = new Graphics();
  private depth: Text;
  private depthM = 0;
  private hole = trapSpan(TRAP_SIDE[6]);
  private scenery: ReturnType<typeof buildGate7Depth>;
  private fall = 0;

  constructor() {
    super();
    const L = G.layers;
    const bg = new Sprite(vGradient('abyss', [[0, '#2a0c2a'], [0.5, '#170818'], [1, '#08030a']]));
    bg.position.set(SCENE_X0, this.top);
    bg.width = SCENE_X1 - SCENE_X0;
    bg.height = G7_ROOM;
    L.bg.addChild(bg);
    this.scenery = buildGate7Depth(this.top, this.bottom, this.focusY);
    L.bg.addChild(this.streaks);
    // no shaft walls drawn: the abyss carries on sideways, edge to edge

    // rock ledges to bounce off
    const ledges = new Graphics();
    for (const [x0, x1, y] of [[0, 210, this.top + 420], [990, 1200, this.top + 820], [0, 250, this.top + 1180]]) {
      ledges.roundRect(x0 - 20, y - 22, x1 - x0 + 20, 44, 20).fill(0x4a2244);
      ledges.roundRect(x0 - 20, y - 22, x1 - x0 + 20, 12, 6).fill(0x7a3a58);
      this.wall((x0 + x1) / 2, y, x1 - x0, 44, { chamfer: { radius: 20 }, label: 'ledge', restitution: 0.5 });
    }
    L.front.addChild(ledges);

    // walls of the shaft

    // depth odometer
    const od = new Graphics();
    od.roundRect(430, this.top + 140, 340, 70, 14).fill(0x120812);
    L.back.addChild(od);
    this.depth = new Text({ text: '', style: { fontFamily: 'Baloo 2, system-ui', fontWeight: '800', fontSize: 30, fill: 0xff8a4c, letterSpacing: 2 } });
    this.depth.anchor.set(0.5);
    this.depth.position.set(600, this.top + 176);
    L.back.addChild(this.depth);

    // aghlal weight rack on the left wall
    const r = this.rack;
    r.roundRect(30, this.top + 230, 150, 18, 8).fill(0x3a3a4e);
    for (let i = 0; i < 4; i++) {
      r.rect(52 + i * 34, this.top + 248, 4, 40).fill(0x5a5a6e);
      r.circle(54 + i * 34, this.top + 304, 18).fill(0x3d3d4e);
      r.circle(48 + i * 34, this.top + 298, 5).fill({ color: 0xffffff, alpha: 0.25 });
    }
    L.back.addChild(r);

    // gravity boost lever on the right wall
    const lv = new Graphics();
    lv.roundRect(-30, -10, 60, 20, 8).fill(0x3a2240);
    lv.roundRect(-7, -100, 14, 100, 7).fill(0x5a3a2a);
    lv.circle(0, -104, 20).fill(0xff6f61);
    this.lever.addChild(lv);
    this.lever.position.set(1120, this.top + 560);
    this.lever.rotation = -0.5;
    L.back.addChild(this.lever);
    this.leverGlow = this.glow(1120, this.top + 470, 220, 0xff4f4f, 0);
  }

  spawnPoint() { return { x: rnd(this.hole.x0 + 60, this.hole.x1 - 60), y: this.top + 80 }; }

  pointerDown(x: number, y: number): PointerHit | null {
    // gravity boost
    if (Math.abs(x - 1120) < 60 && y > this.top + 420 && y < this.top + 580) {
      return { move() {}, up: () => {
        this.boost = !this.boost;
        sfx.creak();
        sfx.thud(0.6);
      } };
    }
    // drag an iron weight off the rack and drop it onto someone
    if (x > 20 && x < 200 && y > this.top + 220 && y < this.top + 330) {
      const g = new Graphics();
      g.circle(0, 0, 26).fill(0x3d3d4e).circle(-8, -8, 7).fill({ color: 0xffffff, alpha: 0.25 });
      g.rect(-3, -50, 6, 30).fill(0x5a5a6e);
      g.position.set(x, y);
      G.layers.over.addChild(g);
      sfx.clink();
      return {
        move: (mx, my) => g.position.set(mx, my),
        up: (ux, uy, tapped) => {
          g.destroy();
          if (tapped) {
            // tap the rack: unclip everyone
            for (const c of this.crits()) c.setWeighted(false);
            return;
          }
          const c = this.crits().find((k) => k.hits(ux, uy) || Math.hypot(k.x - ux, k.y - uy) < k.def.r + 60);
          if (c) {
            c.setWeighted(true);
            G.discover('g7-lead', c);
          }
        },
      };
    }
    return null;
  }

  step() {
    const gs = G.engine.gravity.y * G.engine.gravity.scale;
    let fallSum = 0, n = 0;
    for (const c of this.crits()) {
      const b = c.body;
      if (c.held) continue;
      if (this.boost) Body.applyForce(b, b.position, { x: 0, y: b.mass * gs * 0.9 });
      // slow-motion terminal velocity, so the burn-up is watchable:
      // draggy Toto drifts (~5 px/step), dense Pebble sinks faster, weights and the boost speed it up
      const drag = clamp(c.def.windDrag / 0.08, 0, 1);
      const speed = 0.4 + G.tinker.fall * 2.4; // Tinker slider: 0.4x slow-mo … 2.8x plummet (1x at the default)
      const vt = speed * (4.5 + 5 * (1 - drag)) * (c.weighted ? 1.5 : 1) * (this.boost ? 1.4 : 1);
      if (b.velocity.y > vt) Body.setVelocity(b, { x: b.velocity.x * 0.97, y: b.velocity.y + (vt - b.velocity.y) * 0.18 });
      // the longer they fall at full speed, the hotter they get: smoulder → glow → blazing meteor
      const falling = b.velocity.y > vt * 0.75;
      const rate = 0.0022 * speed * (c.weighted ? 1.6 : 1) * (this.boost ? 1.6 : 1) * (0.6 + c.def.thermal * 0.4);
      c.meteor = clamp(c.meteor + (falling ? rate : -0.01), 0, 1);
      if (c.meteor > 0.55 && c.state === 'live') c.hurt((c.meteor - 0.45) * 0.3, 'meteor');
      // smoke while smouldering, before the flames take over
      if (c.meteor > 0.15 && c.meteor < 0.5 && Math.random() < 0.15) G.fx.emit('smoke', c.x + rnd(-20, 20), c.y - c.def.r * 0.6, 1, { tint: 0x7a6a7e, vy: -60 });
      if (c.meteor > 0.2) c.temp = Math.max(c.temp, c.meteor);
      // Toto panics upside down
      if (c.def.id === 'toto') c.targetAngle = Math.PI;
      c.mood = c.meteor > 0.3 ? 'squint' : 'surprised';
      // nobody gets to rest on a ledge: a nudge back into the void
      if (Math.abs(b.velocity.y) < 0.4 && Math.abs(b.velocity.x) < 0.4) Body.setVelocity(b, { x: Math.sign(600 - b.position.x) * 5, y: -3 });
      fallSum += Math.max(0, b.velocity.y);
      n++;
    }
    // endless: out of the bottom, back in at the top (checked for everyone, even the very fast)
    for (const c of G.critters) {
      if (c.held || c.y < this.top) continue;
      if (c.y > this.bottom - 40) Body.setPosition(c.body, { x: c.x, y: this.top + 120 + c.def.r + ((c.y - this.bottom) % 200 + 200) % 200 });
    }
    // the walls still rush past fast, so it reads as a plunge even in slow motion
    this.fall = n ? fallSum / n : 2;
    this.scroll += this.fall * 3.5;
    this.depthM += (n ? fallSum / n : 0) * 0.18;
  }

  update(dt: number, _camY: number, near: boolean) {
    const t = G.time;
    this.scenery.update(dt, near, this.fall);
    // speed streaks rushing up the walls
    const g = this.streaks;
    g.clear();
    if (near) {
      const span = G7_ROOM;
      for (let i = 0; i < 26; i++) {
        const x = (i * 97) % 1200 + 20;
        const len = 80 + (i % 5) * 50;
        const y = this.top + ((((i * 211 - this.scroll * 2.4) % span) + span) % span);
        g.roundRect(x, y, i % 3 ? 4 : 7, len, 3).fill({ color: i % 4 ? 0x5a2a5a : 0xff8a4c, alpha: i % 4 ? 0.45 : 0.25 });
      }
      for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1170 : 30;
        const y = this.top + ((((i * 389 - this.scroll * 1.6) % span) + span) % span);
        g.ellipse(side, y, 46, 70).fill({ color: 0x3a1838, alpha: 0.9 });
      }
    }
    this.lever.rotation += ((this.boost ? 0.6 : -0.5) - this.lever.rotation) * Math.min(1, dt * 10);
    this.leverGlow.alpha = this.boost ? 0.5 + Math.sin(t * 8) * 0.2 : 0;
    this.depth.text = `DEPTH ${Math.floor(this.depthM).toString().padStart(9, '0')} m`;
    if (near) {
      const fast = this.crits().some((c) => c.meteor > 0.4);
      if (fast && Math.random() < dt * 1.2) sfx.whoosh();
    }
    for (const c of this.crits()) { c.ambient = 0.2; c.chill = 0; }
  }
}
