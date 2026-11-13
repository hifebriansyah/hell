import { Container, Graphics, Sprite } from 'pixi.js';
import { G, SCENE_X0, SCENE_X1 } from '../engine/game';
import { DepthStack, hazeBand, layerGlow } from './depth';

// Layered backgrounds for Gates 2-6 (Gate 1 lives in depth.ts, Gate 7 below).
// Same recipe everywhere: glowing backdrop (the GateFloor wall gradient) → far (d 1, close to the haze,
// flat, low contrast) → mid (d 0.55) → near (d 0.25, ceiling details only). No foreground layer.
// Nothing here is physical; the gameplay props are all drawn in front of these layers.

const X0 = SCENE_X0, X1 = SCENE_X1; // the hall carries on past the room, as far as any monitor can see
type Depth = { update(dt: number, near: boolean): void };

function glowSet() {
  const list: { s: Sprite; base: number; ph: number; speed: number }[] = [];
  return {
    add(c: Container, x: number, y: number, size: number, tint: number, alpha: number, speed = 2.2) {
      list.push({ s: layerGlow(c, x, y, size, tint, alpha), base: alpha, ph: Math.random() * 6, speed });
    },
    update() {
      const t = G.time;
      for (const g of list) g.s.alpha = g.base * (0.78 + Math.sin(t * g.speed + g.ph) * 0.22);
    },
  };
}

/** a row of flame tongues standing on a baseline, as one Graphics that can flicker */
function flameRow(c: Container, y: number, h: number, step: number, color: number, alpha: number, off = 0) {
  const g = new Graphics();
  for (let x = X0 + off; x < X1 + step; x += step) {
    const hh = h * (0.6 + ((x * 7919) % 100) / 250);
    const w = step * 0.62;
    g.moveTo(x - w, y).bezierCurveTo(x - w, y - hh * 0.4, x - w * 0.3, y - hh * 0.7, x + w * 0.1, y - hh)
      .bezierCurveTo(x + w * 0.4, y - hh * 0.6, x + w, y - hh * 0.35, x + w, y).closePath().fill({ color, alpha });
  }
  g.rect(X0, y - 2, X1 - X0, 40).fill({ color, alpha });
  g.pivot.y = y;
  g.y = y;
  c.addChild(g);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Gate 2 · Laza: open flame fields rolling away to a red horizon.
// ---------------------------------------------------------------------------------------------
export function buildGate2Depth(top: number, floor: number, focusY: number): Depth {
  const st = new DepthStack(top, floor, focusY);
  const glows = glowSet();
  const far = st.layer(1);
  // smoke columns on the horizon
  const smoke = new Graphics();
  for (let x = X0 + 80; x < X1; x += 260) smoke.ellipse(x, top + 260, 46, 240).fill({ color: 0x5a1c3c, alpha: 0.35 });
  far.addChild(smoke);
  const rows = [
    flameRow(far, floor - 360, 70, 60, 0xf0906a, 0.45, 10),
    flameRow(far, floor - 290, 110, 90, 0xd8604e, 0.65, 40),
  ];
  for (let x = X0 + 60; x < X1; x += 150) glows.add(far, x, floor - 330, 220, 0xffa060, 0.35);
  hazeBand(far, 'g2-far', X0, X1, floor - 420, floor - 200, 'rgba(255,150,100,0.4)');
  // mid: jagged rock spires, lit on the side that faces the pit
  const mid = st.layer(0.55);
  const mg = new Graphics();
  for (const [x, h, w] of [[90, 470, 110], [330, 330, 90], [880, 380, 100], [1130, 520, 120]] as const) {
    mg.moveTo(x - w, floor).bezierCurveTo(x - w * 0.6, floor - h * 0.5, x - w * 0.2, floor - h * 0.9, x, floor - h)
      .bezierCurveTo(x + w * 0.25, floor - h * 0.85, x + w * 0.6, floor - h * 0.45, x + w, floor).closePath().fill(0x5a1a36);
    const lit = x < 600 ? 1 : -1;
    mg.moveTo(x, floor - h).bezierCurveTo(x + lit * w * 0.25, floor - h * 0.85, x + lit * w * 0.6, floor - h * 0.45, x + lit * w, floor)
      .lineTo(x + lit * w * 0.8, floor).bezierCurveTo(x + lit * w * 0.45, floor - h * 0.45, x + lit * w * 0.15, floor - h * 0.8, x, floor - h).closePath().fill({ color: 0xe0644a, alpha: 0.7 });
  }
  // meat-hook rail along the ceiling (empty hooks, waiting)
  mg.rect(X0, top + 70, X1 - X0, 14).fill(0x4a1630);
  for (let x = X0 + 60; x < X1; x += 140) {
    mg.rect(x - 2, top + 84, 4, 50).fill(0x4a1630);
    mg.moveTo(x, top + 134).bezierCurveTo(x - 4, top + 160, x + 22, top + 166, x + 22, top + 146).lineTo(x + 16, top + 146).bezierCurveTo(x + 16, top + 156, x + 4, top + 154, x + 5, top + 134).closePath().fill(0x4a1630);
  }
  mid.addChild(mg);
  hazeBand(mid, 'g2-mid', X0, X1, floor - 200, floor, 'rgba(240,110,80,0.3)');
  const near = st.layer(0.25);
  near.addChild(new Graphics().rect(X0, top - 10, X1 - X0, 40).fill(0x2a0a22));
  st.motesAt(far, 1, 24, { tint: 0xffc890, size: [3, 6], alpha: 0.4, rise: 18 });
  return {
    update(dt, near) {
      st.update(dt, near);
      if (!near) return;
      const t = G.time;
      rows.forEach((r, i) => (r.scale.y = 1 + Math.sin(t * (3 + i) + i) * 0.08));
      glows.update();
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Gate 3 · al-Hutamah: a factory hall of distant presses stomping in rows, big gears turning.
// ---------------------------------------------------------------------------------------------
export function buildGate3Depth(top: number, floor: number, focusY: number): Depth {
  const st = new DepthStack(top, floor, focusY);
  const glows = glowSet();
  const far = st.layer(1);
  const heads: { g: Graphics; base: number; ph: number; amp: number }[] = [];
  const pressRow = (y: number, scale: number, color: number, alpha: number, step: number, off: number) => {
    const g = new Graphics();
    for (let x = X0 + off; x < X1; x += step) {
      g.rect(x - 8 * scale, top, 16 * scale, y - top - 120 * scale).fill({ color, alpha });
      g.rect(x - 60 * scale, y - 6, 120 * scale, 40 * scale).fill({ color, alpha }); // anvil
      const h = new Graphics().roundRect(-50 * scale, -60 * scale, 100 * scale, 60 * scale, 10 * scale).fill({ color, alpha });
      h.position.set(x, y - 20 * scale);
      far.addChild(h);
      heads.push({ g: h, base: y - 20 * scale, ph: Math.random() * 6, amp: 90 * scale });
      glows.add(far, x, y + 10, 120 * scale, 0xff8a5c, 0.35 * alpha);
    }
    far.addChildAt(g, 0);
  };
  pressRow(floor - 330, 0.5, 0xa86070, 0.6, 130, 30);
  pressRow(floor - 250, 0.75, 0x86405e, 0.8, 190, 100);
  hazeBand(far, 'g3-far', X0, X1, floor - 420, floor - 180, 'rgba(210,120,100,0.45)');
  // mid: two big gears and a pipe run
  const mid = st.layer(0.55);
  const gear = (r: number, teeth: number, color: number) => {
    const g = new Graphics();
    const pts: number[] = [];
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const rr = i % 2 ? r : r * 1.16;
      pts.push(Math.cos(a - 0.12) * rr, Math.sin(a - 0.12) * rr, Math.cos(a + 0.12) * rr, Math.sin(a + 0.12) * rr);
    }
    g.poly(pts).fill(color);
    g.circle(0, 0, r * 0.62).fill(0x3a1432);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.roundRect(Math.cos(a) * r * 0.3 - 10, Math.sin(a) * r * 0.3 - 10, 20, 20, 6).fill(color);
    }
    g.circle(0, 0, r * 0.16).fill(0x7a3a5a);
    mid.addChild(g);
    return g;
  };
  const g1 = gear(150, 12, 0x54214a);
  g1.position.set(140, top + 260);
  const g2 = gear(95, 9, 0x54214a);
  g2.position.set(1090, top + 420);
  const pipes = new Graphics();
  pipes.roundRect(X0, top + 120, X1 - X0, 30, 15).fill(0x4a1c40);
  pipes.roundRect(980, top + 120, 30, 320, 15).fill(0x4a1c40);
  for (let x = X0 + 100; x < X1; x += 220) pipes.roundRect(x, top + 112, 22, 46, 6).fill(0x5e2a50);
  mid.addChild(pipes);
  hazeBand(mid, 'g3-mid', X0, X1, floor - 220, floor, 'rgba(200,100,90,0.28)');
  const near = st.layer(0.25);
  near.addChild(new Graphics().rect(X0, top - 10, X1 - X0, 40).fill(0x220c22));
  st.motesAt(far, 1, 22, { tint: 0xe8b0a0, size: [3, 6], alpha: 0.35, rise: 10 });
  return {
    update(dt, near) {
      st.update(dt, near);
      if (!near) return;
      const t = G.time;
      for (const h of heads) {
        // slow lift, sudden stomp
        const p = (t * 0.45 + h.ph) % 1;
        h.g.y = h.base - (p < 0.85 ? (p / 0.85) * h.amp : (1 - (p - 0.85) / 0.15) * h.amp);
      }
      g1.rotation = t * 0.15;
      g2.rotation = -t * 0.15 * (150 / 95);
      glows.update();
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Gate 4 · al-Sa'ir: a whole forest of Zaqqum trees fading into hot haze.
// ---------------------------------------------------------------------------------------------
export function buildGate4Depth(top: number, floor: number, focusY: number): Depth {
  const st = new DepthStack(top, floor, focusY);
  const glows = glowSet();
  const far = st.layer(1);
  const tree = (g: Graphics, x: number, base: number, h: number, color: number, alpha: number) => {
    g.moveTo(x - 10, base).bezierCurveTo(x + 6, base - h * 0.4, x - 14, base - h * 0.7, x, base - h).lineTo(x + 8, base - h)
      .bezierCurveTo(x - 4, base - h * 0.7, x + 18, base - h * 0.4, x + 12, base).closePath().fill({ color, alpha });
    for (const [dx, dy, len] of [[-1, 0.7, 0.5], [1, 0.6, 0.55], [-1, 0.9, 0.35], [1, 0.85, 0.4]] as const) {
      const bx = x + 4, by = base - h * dy, ex = bx + dx * h * len, ey = by - h * 0.2;
      g.poly([bx, by - 4, ex, ey, bx, by + 4]).fill({ color, alpha });
    }
    g.ellipse(x + 4, base - h * 0.85, h * 0.5, h * 0.22).fill({ color, alpha: alpha * 0.7 });
  };
  const back = new Graphics();
  for (let x = X0 + 20; x < X1; x += 95) tree(back, x, floor - 300, 170 + ((x * 31) % 60), 0xb0566a, 0.5);
  far.addChild(back);
  hazeBand(far, 'g4-far', X0, X1, floor - 420, floor - 260, 'rgba(230,120,96,0.45)');
  const front = new Graphics();
  for (let x = X0 + 70; x < X1; x += 150) tree(front, x, floor - 230, 250 + ((x * 17) % 80), 0x86364e, 0.8);
  far.addChild(front);
  for (let x = X0 + 70; x < X1; x += 150) for (let k = 0; k < 2; k++) glows.add(far, x + (k ? 50 : -40), floor - 400 + k * 40, 50, 0xff7a3c, 0.6, 3);
  hazeBand(far, 'g4-far2', X0, X1, floor - 300, floor - 120, 'rgba(240,130,90,0.4)');
  // mid: thorny vines hanging from the ceiling and creeping up the edges
  const mid = st.layer(0.55);
  const mg = new Graphics();
  const vine = (x0: number, y0: number, x1: number, y1: number, sag: number) => {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const t = i / n, t2 = (i + 1) / n;
      const p = (u: number) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag];
      const [ax, ay] = p(t), [bx, by] = p(t2);
      mg.poly([ax, ay - 7, bx, by - 6, bx, by + 6, ax, ay + 7]).fill(0x4e1834);
      if (i % 2) mg.poly([bx, by - 5, bx + 6, by - 20, bx + 10, by - 4]).fill(0x4e1834);
    }
  };
  vine(X0, top + 60, 520, top + 40, 120);
  vine(300, top + 40, X1, top + 90, 150);
  vine(60, floor, 160, top + 260, -40);
  vine(1140, floor, 1060, top + 300, 40);
  mid.addChild(mg);
  hazeBand(mid, 'g4-mid', X0, X1, floor - 200, floor, 'rgba(220,100,80,0.28)');
  const near = st.layer(0.25);
  near.addChild(new Graphics().rect(X0, top - 10, X1 - X0, 40).fill(0x220a1c));
  st.motesAt(far, 1, 26, { tint: 0xffb080, size: [3, 6], alpha: 0.4, rise: 16 });
  return { update(dt, near) { st.update(dt, near); if (near) glows.update(); } };
}

// ---------------------------------------------------------------------------------------------
// Gate 5 · Saqar: the conveyors never end. Rows of distant belts, each carrying tiny round someones.
// ---------------------------------------------------------------------------------------------
export function buildGate5Depth(top: number, floor: number, focusY: number): Depth {
  const st = new DepthStack(top, floor, focusY);
  const glows = glowSet();
  const far = st.layer(1);
  const belts: { x0: number; y0: number; x1: number; y1: number; g: Graphics; color: number; alpha: number; r: number; spd: number; ph: number }[] = [];
  const beltRow = (y: number, len: number, rise: number, step: number, color: number, alpha: number, r: number, off: number) => {
    const g = new Graphics();
    for (let x = X0 + off; x < X1; x += step) {
      g.poly([x, y - rise, x + len, y, x + len, y + 8, x, y - rise + 8]).fill({ color, alpha });
      g.rect(x + len - 4, y + 8, 6, floor - y).fill({ color, alpha: alpha * 0.8 });
      glows.add(far, x + len + 14, y + 6, 70 * (r / 6), 0xff6a3c, 0.6 * alpha, 4);
      const blobs = new Graphics();
      far.addChild(blobs);
      belts.push({ x0: x, y0: y - rise, x1: x + len, y1: y, g: blobs, color, alpha, r, spd: 0.08 + Math.random() * 0.05, ph: Math.random() });
    }
    far.addChildAt(g, 0);
  };
  beltRow(floor - 360, 150, 50, 210, 0xb05a6c, 0.55, 5, 0);
  beltRow(floor - 280, 220, 70, 300, 0x8e3c58, 0.8, 7, 120);
  hazeBand(far, 'g5-far', X0, X1, floor - 440, floor - 160, 'rgba(230,100,80,0.42)');
  // mid: flues with glowing vents, and soot-stained chimney stacks
  const mid = st.layer(0.55);
  const mg = new Graphics();
  for (const [x, w] of [[60, 110], [1150, 120], [640, 90]] as const) {
    mg.rect(x - w / 2, top - 10, w, floor - top + 10).fill(0x46142e);
    mg.rect(x - w / 2, top - 10, 16, floor - top + 10).fill(0x5e1e3c);
    for (let y = top + 180; y < floor - 80; y += 170) {
      mg.roundRect(x - w * 0.3, y, w * 0.6, 26, 8).fill(0x2a0a1e);
      glows.add(mid, x, y + 13, 90, 0xff7a3c, 0.45, 3);
    }
  }
  mid.addChild(mg);
  hazeBand(mid, 'g5-mid', X0, X1, floor - 200, floor, 'rgba(210,80,70,0.28)');
  const near = st.layer(0.25);
  near.addChild(new Graphics().rect(X0, top - 10, X1 - X0, 40).fill(0x1a0618));
  st.motesAt(far, 1, 22, { tint: 0xffa070, size: [3, 6], alpha: 0.35, rise: 14 });
  return {
    update(dt, near) {
      st.update(dt, near);
      if (!near) return;
      const t = G.time;
      // tiny round silhouettes riding every distant belt into its glow
      for (const b of belts) {
        b.g.clear();
        for (let k = 0; k < 4; k++) {
          const u = (t * b.spd + b.ph + k / 4) % 1;
          b.g.circle(b.x0 + (b.x1 - b.x0) * u, b.y0 + (b.y1 - b.y0) * u - b.r, b.r).fill({ color: b.color, alpha: b.alpha });
        }
      }
      glows.update();
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Gate 6 · al-Jahim / Zamharir: glacier ridges under a pale cold glow, giant icicles, snow.
// ---------------------------------------------------------------------------------------------
export function buildGate6Depth(top: number, floor: number, focusY: number): Depth {
  const st = new DepthStack(top, floor, focusY);
  const far = st.layer(1);
  const ridge = (y: number, amp: number, color: number, alpha: number, seed: number) => {
    const g = new Graphics();
    g.moveTo(X0, floor);
    for (let x = X0; x <= X1; x += 60) {
      const h = amp * (0.55 + 0.45 * Math.sin(x * 0.011 + seed) * Math.sin(x * 0.027 + seed * 2));
      g.lineTo(x, y - Math.abs(h));
    }
    g.lineTo(X1, floor).closePath().fill({ color, alpha });
    far.addChild(g);
    return g;
  };
  ridge(floor - 380, 160, 0xb4d8f0, 0.7, 1);
  hazeBand(far, 'g6-far', X0, X1, floor - 470, floor - 300, 'rgba(214,240,255,0.5)');
  ridge(floor - 260, 200, 0x8ab6dc, 0.85, 4);
  hazeBand(far, 'g6-far2', X0, X1, floor - 330, floor - 150, 'rgba(200,232,255,0.45)');
  // mid: giant stalactites from the ceiling and two ice columns
  const mid = st.layer(0.55);
  const mg = new Graphics();
  for (let x = X0 + 30; x < X1; x += 120) {
    const h = 90 + ((x * 37) % 150);
    mg.poly([x - 34, top - 10, x + 34, top - 10, x + 4, top + h]).fill(0x4a6ea4);
    mg.poly([x - 34, top - 10, x - 18, top - 10, x, top + h - 10]).fill({ color: 0xcfeeff, alpha: 0.6 });
  }
  for (const x of [130, 1090]) {
    mg.roundRect(x - 40, top, 80, floor - top, 30).fill(0x4a6ea4);
    mg.roundRect(x - 40, top, 18, floor - top, 9).fill({ color: 0xcfeeff, alpha: 0.55 });
  }
  mid.addChild(mg);
  hazeBand(mid, 'g6-mid', X0, X1, floor - 220, floor, 'rgba(190,226,255,0.3)');
  const near = st.layer(0.25);
  near.addChild(new Graphics().rect(X0, top - 10, X1 - X0, 40).fill(0x101c40));
  st.motesAt(far, 1, 40, { tint: 0xffffff, size: [3, 6], alpha: 0.6, rise: -30 });
  return { update(dt, near) { st.update(dt, near); } };
}

// ---------------------------------------------------------------------------------------------
// Gate 7 · al-Hawiyah: the walls rush upward forever. Far away, other meteors are falling too.
// Layers scroll with the fall at different speeds (far slow, mid faster).
// ---------------------------------------------------------------------------------------------
export function buildGate7Depth(top: number, bottom: number, focusY: number) {
  const st = new DepthStack(top, bottom, focusY);
  const H = bottom - top;
  const far = st.layer(1);
  const mid = st.layer(0.55);
  // far: tiny meteors with tails, drifting down slowly (they're very far away)
  const meteors: { g: Container; x: number; y: number; v: number }[] = [];
  for (let i = 0; i < 26; i++) {
    const c = new Container();
    const tail = new Graphics().moveTo(-3, 0).lineTo(3, 0).lineTo(0, -60 - Math.random() * 50).closePath().fill({ color: 0xff9a5c, alpha: 0.35 });
    c.addChild(tail);
    layerGlow(c, 0, 0, 34, 0xffb36b, 0.7);
    far.addChild(c);
    meteors.push({ g: c, x: X0 + Math.random() * (X1 - X0), y: top + Math.random() * H, v: 40 + Math.random() * 80 });
  }
  hazeBand(far, 'g7-far', X0, X1, bottom - 500, bottom, 'rgba(60,16,50,0.6)');
  // mid: rock outcrops that rush upward past the camera
  const rocks: { g: Graphics; x: number; y: number; k: number }[] = [];
  const rock = (layer: Container, x: number, w: number, h: number, color: number, k: number) => {
    const g = new Graphics();
    g.moveTo(-w, 0).bezierCurveTo(-w * 0.9, -h * 0.6, -w * 0.3, -h, 0, -h).bezierCurveTo(w * 0.4, -h * 0.9, w, -h * 0.4, w, 0)
      .bezierCurveTo(w * 0.8, h * 0.6, -w * 0.6, h * 0.7, -w, 0).closePath().fill(color);
    g.moveTo(-w * 0.6, -h * 0.5).bezierCurveTo(-w * 0.3, -h * 0.85, w * 0.1, -h * 0.9, w * 0.3, -h * 0.75).lineTo(w * 0.2, -h * 0.6).bezierCurveTo(-w * 0.1, -h * 0.7, -w * 0.3, -h * 0.6, -w * 0.5, -h * 0.35).closePath().fill({ color: 0xff8a4c, alpha: 0.25 });
    layer.addChild(g);
    rocks.push({ g, x, y: top + Math.random() * H, k });
  };
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side < 0 ? -40 - Math.random() * 1500 : 1240 + Math.random() * 1500;
    rock(mid, i < 4 ? (side < 0 ? 40 : 1160) : x, 90 + Math.random() * 90, 120 + Math.random() * 120, 0x2e0e2c, 1.1);
  }
  st.motesAt(far, 1, 24, { tint: 0xffa070, size: [3, 6], alpha: 0.35, rise: 60 });
  return {
    update(dt: number, near: boolean, fallSpeed: number) {
      st.update(dt, near);
      if (!near) return;
      for (const m of meteors) {
        m.y += m.v * dt;
        if (m.y > bottom + 40) { m.y = top - 40; m.x = X0 + Math.random() * (X1 - X0); }
        m.g.position.set(m.x, m.y);
      }
      // walls rush up in proportion to how fast the critters are falling
      for (const r of rocks) {
        r.y -= fallSpeed * r.k * 60 * dt;
        if (r.y < top - 200) r.y += H + 400;
        r.g.position.set(r.x, r.y);
      }
    },
  };
}
