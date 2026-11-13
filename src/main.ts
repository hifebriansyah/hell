import './style.css';
import Matter from 'matter-js';
import { Application, Container, Graphics } from 'pixi.js';
import { floorAt, G, STEP, TINKER_DEFAULT, WORLD_BOTTOM, type Layers } from './engine/game';
import { Fx } from './engine/fx';
import { sfx, unlockAudio } from './engine/audio';
import { Critter } from './critters/critter';
import { byId, CRITTERS, type CritterId } from './critters/defs';
import { buildRig, type HatId } from './critters/rig';
import { Rim } from './floors/rim';
import { Gate1 } from './floors/gate1';
import { Gate2 } from './floors/gate2';
import { Gate3 } from './floors/gate3';
import { Gate4 } from './floors/gate4';
import { Gate5 } from './floors/gate5';
import { Gate6 } from './floors/gate6';
import { Gate7 } from './floors/gate7';
import type { Floor, PointerHit } from './floors/floor';
import { Hud } from './ui/hud';
import { DISCOVERIES, discoveries } from './data/discoveries';

const { Engine, Events, Body, Constraint, Composite } = Matter;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Always play in landscape: when the window is portrait, the whole #app (canvas + HUD) is rotated 90°.
const appEl = document.getElementById('app')!;
let portrait = false;
function applyOrientation() {
  portrait = window.innerHeight > window.innerWidth;
  document.body.classList.toggle('portrait', portrait);
}
applyOrientation();
/** pointer position in the (possibly rotated) app's own coordinates */
const local = (e: { clientX: number; clientY: number }) =>
  portrait ? { x: e.clientY, y: window.innerWidth - e.clientX } : { x: e.clientX, y: e.clientY };

async function boot() {
  const app = new Application();
  await app.init({
    resizeTo: appEl,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2.5),
    background: 0x2a1838,
    preference: 'webgl',
  });
  document.getElementById('stage')!.appendChild(app.canvas);
  const reorient = () => { applyOrientation(); app.resize(); };
  window.addEventListener('resize', reorient);
  window.addEventListener('orientationchange', () => setTimeout(reorient, 50));
  try { await document.fonts.load('800 30px "Baloo 2"'); } catch { /* fallback font is fine */ }

  // ----- scene graph -----
  const world = new Container();
  app.stage.addChild(world);
  const layers: Layers = {
    bg: new Container(),
    back: new Container(),
    critters: new Container(),
    front: new Container(),
    fx: new Container(),
    glow: new Container(),
    over: new Container(),
  };
  layers.glow.blendMode = 'add';
  // stage blackout: hides the floors above/below the gate the camera has settled on
  const blackout = new Graphics();
  world.addChild(layers.bg, layers.back, layers.critters, layers.front, layers.fx, layers.glow, layers.over, blackout);
  const fx = new Fx();
  layers.fx.addChild(fx.view);
  layers.glow.addChild(fx.glow);

  // ----- physics -----
  const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0018 } });
  engine.positionIterations = 8;
  engine.velocityIterations = 6;

  let hud!: Hud;
  Object.assign(G, {
    engine,
    fx,
    layers,
    tinker: { ...TINKER_DEFAULT },
    tool: 'hand',
    time: 0,
    critters: [] as Critter[],
    viewFloor: 0,
    pointer: { x: 0, y: 0, active: false },
    view: { top: 0, bottom: 0 },
    discover(id: string, who?: Critter) {
      const first = discoveries.bump(id);
      if (!first) return;
      const d = DISCOVERIES.find((x) => x.id === id);
      if (!d) return;
      sfx.unlock();
      if (d.hat && who) {
        who.hat = d.hat;
        who.rig.setHat(d.hat);
        hud.toast(`New: ${d.name}! ${who.def.name.split(' ')[0]} earned the ${d.hat} hat`);
      } else hud.toast(`New: ${d.name}!`);
      fx.emit('star', who?.x ?? 600, (who?.y ?? 600) - 60, 14, { spread: 1.4 });
    },
  });

  hud = new Hud();
  const rim = new Rim();
  const gate1 = new Gate1();
  const floors: Floor[] = [rim, gate1, new Gate2(), new Gate3(), new Gate4(), new Gate5(), new Gate6(), new Gate7()];

  // ----- camera -----
  const cam = { x: 600, y: rim.focusY, ty: rim.focusY, s: 1 };
  const viewH = () => app.screen.height / cam.s;
  const viewW = () => app.screen.width / cam.s;
  const fitScale = () => { cam.s = Math.min(app.screen.height / 1060, app.screen.width / 860); };
  fitScale();
  /** the floor the camera is heading to; every scroll gesture settles on one */
  let snapFloor = 0;
  const goto = (f: number) => {
    snapFloor = clamp(Math.round(f), 0, 7);
    cam.ty = floors[snapFloor].focusY;
  };
  const nearest = (y: number) => {
    let best = 0;
    for (let i = 1; i < floors.length; i++) if (Math.abs(floors[i].focusY - y) < Math.abs(floors[best].focusY - y)) best = i;
    return best;
  };
  const m = /^#gate-(\d)$/.exec(location.hash);
  goto(m ? Number(m[1]) : 0);
  cam.y = cam.ty;
  hud.onGoto = (f) => goto(f);

  // ----- critters -----
  const spawn = (id: CritterId, quiet = false) => {
    if (G.critters.some((c) => c.def.id === id)) return;
    const def = byId(id);
    let p: { x: number; y: number };
    if (G.viewFloor === 0) {
      p = { x: Math.random() < 0.55 ? rnd(170, 450) : rnd(930, 1100), y: Math.max(-1400, cam.y - viewH() / 2 - 120) };
    } else if (G.viewFloor === 1) {
      p = { x: rnd(620, 780), y: gate1.top - 120 }; // through the Rim's mouth, straight into the pot
    } else p = floors[G.viewFloor].spawnPoint();
    const c = new Critter(def, p.x, p.y);
    Body.setVelocity(c.body, { x: 0, y: 6 });
    const hats = discoveries.hats();
    if (hats.length && Math.random() < 0.45) {
      c.hat = hats[Math.floor(Math.random() * hats.length)];
      c.rig.setHat(c.hat);
    }
    G.critters.push(c);
    lastFloor.set(c, c.floor);
    hud.setOut(id, true);
    sfx.whoosh();
    sfx.voice(id);
    if (!quiet) hud.quip(def.name.split(' ')[0], def.quips[Math.floor(Math.random() * def.quips.length)]);
    if (G.critters.length === CRITTERS.length) G.discover('rim-full', c);
  };
  const unspawn = (id: CritterId) => {
    const i = G.critters.findIndex((c) => c.def.id === id);
    if (i < 0) return;
    const c = G.critters[i];
    if (grab?.c === c) release(false);
    fx.emit('smoke', c.x, c.y, 12, { spread: 3, tint: 0xf6d6e6, size: 1.4 });
    sfx.pop();
    c.remove();
    G.critters.splice(i, 1);
    hud.setOut(id, false);
  };
  hud.onCritter = (id) => (G.critters.some((c) => c.def.id === id) ? unspawn(id) : spawn(id));
  const lastFloor = new Map<Critter, number>();

  // tray icons rendered from the rigs themselves
  const icons = {} as Record<CritterId, string>;
  for (const d of CRITTERS) {
    const r = buildRig(d);
    r.setExpr(d.deadpan ? 'deadpan' : 'happy');
    const holder = new Container();
    holder.addChild(r.root);
    const cv = app.renderer.extract.canvas({ target: holder, resolution: 0.6, antialias: true }) as HTMLCanvasElement;
    icons[d.id] = cv.toDataURL();
    holder.destroy({ children: true });
  }
  hud.buildTray(icons);

  // ----- impacts -----
  Events.on(engine, 'collisionStart', (e) => {
    for (const pair of e.pairs) {
      const a = pair.bodyA.parent, b = pair.bodyB.parent;
      const n = pair.collision.normal;
      const rv = { x: a.velocity.x - b.velocity.x, y: a.velocity.y - b.velocity.y };
      const speed = Math.abs(rv.x * n.x + rv.y * n.y);
      const ca = (a as Matter.Body & { critter?: Critter }).critter;
      const cb = (b as Matter.Body & { critter?: Critter }).critter;
      if (ca && !ca.held) ca.impact(speed);
      if (cb && !cb.held) cb.impact(speed);
      const f = floors[floorAt(a.position.y)];
      f.onCollide(a, b, speed);
      const f2 = floors[floorAt(b.position.y)];
      if (f2 !== f) f2.onCollide(a, b, speed);
    }
  });

  // ----- pointer -----
  interface Grab { c: Critter; con: Matter.Constraint; }
  let grab: Grab | null = null;
  let hit: PointerHit | null = null;
  let pan: { sx: number; sy: number; cx: number; cy: number } | null = null;
  let down = { x: 0, y: 0, t: 0, moved: false, sx: 0, sy: 0 };
  let lastTap = { c: null as Critter | null, t: 0 };
  const toWorld = (sx: number, sy: number) => ({
    x: (sx - app.screen.width / 2) / cam.s + cam.x,
    y: (sy - app.screen.height / 2) / cam.s + cam.y,
  });
  let screenPt = { x: 0, y: 0 };
  let carried = false;

  const release = (tapped: boolean) => {
    if (!grab) return;
    const c = grab.c;
    Composite.remove(engine.world, grab.con);
    c.held = false;
    const v = c.body.velocity;
    const sp = Math.hypot(v.x, v.y);
    if (sp > 42) Body.setVelocity(c.body, { x: (v.x / sp) * 42, y: (v.y / sp) * 42 });
    if (tapped) {
      const now = performance.now();
      if (lastTap.c === c && now - lastTap.t < 340) {
        cycleHat(c);
        lastTap = { c: null, t: 0 };
      } else {
        lastTap = { c, t: now };
        // a tap boops; some floors give it a meaning of their own (Gate 2: pluck the coat)
        if (!floors[c.floor].onTongs(c)) c.boop();
      }
    }
    grab = null;
  };

  const cycleHat = (c: Critter) => {
    const hats: (HatId | null)[] = [null, ...discoveries.hats()];
    if (hats.length === 1) { hud.toast('No hats yet: find new ways to pop!'); return; }
    const i = hats.indexOf(c.hat);
    c.hat = hats[(i + 1) % hats.length];
    c.rig.setHat(c.hat);
    sfx.pop();
    fx.emit('glint', c.x, c.y - c.def.r, 6);
  };

  const canvas = app.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    const q = local(e);
    unlockAudio();
    hud.closeAll();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
    const p = toWorld(q.x, q.y);
    screenPt = { x: q.x, y: q.y };
    G.pointer = { ...p, active: true };
    down = { x: p.x, y: p.y, t: performance.now(), moved: false, sx: q.x, sy: q.y };
    // critters first, front-most last in the list
    for (let i = G.critters.length - 1; i >= 0; i--) {
      const c = G.critters[i];
      if (!c.hits(p.x, p.y)) continue;
      const tongs = G.tool === 'tongs';
      const con = Constraint.create({
        pointA: { x: p.x, y: p.y },
        bodyB: c.body,
        pointB: tongs ? { x: 0, y: 0 } : { x: p.x - c.x, y: p.y - c.y },
        stiffness: tongs ? 0.5 : 0.07,
        damping: tongs ? 0.2 : 0.06,
        length: 0,
      });
      Composite.add(engine.world, con);
      c.held = true;
      grab = { c, con };
      sfx.voice(c.def.id);
      return;
    }
    const f = floors[floorAt(p.y)];
    const h = f.pointerDown(p.x, p.y);
    if (h) { hit = h; return; }
    pan = { sx: q.x, sy: q.y, cx: cam.x, cy: cam.y };
  });
  canvas.addEventListener('pointermove', (e) => {
    const q = local(e);
    const p = toWorld(q.x, q.y);
    screenPt = { x: q.x, y: q.y };
    G.pointer = { ...p, active: true };
    if (Math.hypot(q.x - down.sx, q.y - down.sy) > 8) down.moved = true;
    if (grab) grab.con.pointA = { x: p.x, y: p.y };
    else if (hit) hit.move(p.x, p.y);
    else if (pan) {
      cam.x = pan.cx - (q.x - pan.sx) / cam.s;
      cam.y = cam.ty = pan.cy - (q.y - pan.sy) / cam.s;
    }
  });
  const up = (e: PointerEvent) => {
    const q = local(e);
    const p = toWorld(q.x, q.y);
    const tapped = !down.moved && performance.now() - down.t < 350;
    if (grab) {
      release(tapped);
      if (carried) goto(nearest(cam.ty)); // carried a critter across floors: settle on a gate
    } else if (hit) hit.up(p.x, p.y, tapped);
    else if (pan) {
      // a pan always ends on a gate: drag far enough for the next one, else spring back
      const from = nearest(pan.cy);
      const dragged = q.y - pan.sy;
      goto(Math.abs(dragged) > app.screen.height * 0.12 ? from - Math.sign(dragged) : nearest(cam.y));
    }
    carried = false;
    hit = null;
    pan = null;
    if (e.pointerType !== 'mouse') G.pointer.active = false;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { G.pointer.active = false; });
  // Wheel / trackpad: scroll freely while the wheel is moving; snap to a gate only once it stops.
  // A scroll that travelled a good way toward the next gate lands there, otherwise it settles back.
  let wheelStart: number | null = null; // camera y when this scroll began
  let wheelIdle = 0;
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const k = e.deltaMode === 1 ? 30 : 1;
    const dy = (e.deltaY * k) / cam.s;
    cam.x += (e.deltaX * k) / cam.s; // sideways trackpad pan on narrow screens
    if (wheelStart === null) wheelStart = cam.ty;
    // trackpads (small pixel deltas) follow the fingers 1:1; a notched wheel glides
    const trackpad = e.deltaMode === 0 && Math.abs(e.deltaY) < 50;
    cam.ty += dy;
    if (trackpad) cam.y += dy;
    clearTimeout(wheelIdle);
    wheelIdle = window.setTimeout(() => {
      const from = nearest(wheelStart ?? cam.ty);
      const travel = cam.ty - (wheelStart ?? cam.ty);
      const near = nearest(cam.ty);
      goto(near === from && Math.abs(travel) > viewH() * 0.2 ? from + Math.sign(travel) : near);
      wheelStart = null;
    }, 160);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    unlockAudio();
    if (/^[0-7]$/.test(e.key)) { goto(Number(e.key)); return; }
    switch (e.key) {
      case 'ArrowUp': case 'PageUp': goto(snapFloor - 1); break;
      case 'ArrowDown': case 'PageDown': goto(snapFloor + 1); break;
      case 'a': case 'A': CRITTERS.forEach((d, i) => setTimeout(() => spawn(d.id, i > 0), i * 220)); break;
      case 'l': case 'L': gate1.slamLid(); break;
      case 'Escape': hud.closeAll(); break;
    }
  });

  // ----- main loop -----
  let acc = 0;
  let shownFloor = -1;
  app.ticker.add((tk) => {
    const dt = Math.min(tk.deltaMS / 1000, 0.05);
    G.time += dt;
    acc += dt * 1000;
    let steps = 0;
    while (acc >= STEP && steps < 4) {
      engine.gravity.y = G.tinker.gravity;
      for (const c of G.critters) c.chill = 0;
      for (const f of floors) f.step();
      rim.affect();
      for (const c of G.critters) c.step();
      if (grab && G.tool === 'tongs') {
        const b = grab.c.body;
        Body.setAngularVelocity(b, 0);
        Body.setAngle(b, b.angle * 0.85);
      }
      Engine.update(engine, STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === 4) acc = 0;

    for (const c of G.critters) {
      const b = c.body;
      // strays come back from the Rim's sky
      if (b.position.x < -200 || b.position.x > 1400 || b.position.y < -1750 || b.position.y > WORLD_BOTTOM + 300) {
        Body.setPosition(b, { x: rnd(200, 420), y: -300 });
        Body.setVelocity(b, { x: 0, y: 2 });
      }
      // fell through a trapdoor into the gate below
      const f = c.floor;
      const was = lastFloor.get(c) ?? f;
      if (f > was && was >= 1 && !c.held) G.discover('g1-hatch', c);
      // carried out of the abyss: weights come off
      if (was === 7 && f < 7) c.setWeighted(false);
      lastFloor.set(c, f);
      c.update(dt);
    }
    for (const f of floors) f.update(dt, cam.y, Math.abs(f.focusY - cam.y) < 1400);
    fx.update(dt);

    // carry a dragged critter across floors by holding it near the top/bottom edge
    if (grab) {
      const H = app.screen.height;
      if (screenPt.y < H * 0.1) { cam.ty -= 900 * dt; carried = true; }
      else if (screenPt.y > H * 0.9) { cam.ty += 900 * dt; carried = true; }
      grab.con.pointA = toWorld(screenPt.x, screenPt.y);
    }

    // camera
    fitScale();
    const vh = viewH(), vw = viewW();
    cam.ty = clamp(cam.ty, -700 + vh * 0.2, WORLD_BOTTOM - vh / 2 + 40);
    cam.y += (cam.ty - cam.y) * Math.min(1, dt * 7);
    cam.x = vw >= 1300 ? 600 : clamp(cam.x, vw / 2 - 40, 1240 - vw / 2);
    world.scale.set(cam.s);
    world.position.set(app.screen.width / 2 - cam.x * cam.s, app.screen.height / 2 - cam.y * cam.s);

    // blackout everything outside the settled gate; fades away while gliding between gates
    {
      const fi = nearest(cam.y);
      const fl = floors[fi];
      const k = clamp(1 - Math.abs(cam.y - fl.focusY) / 160, 0, 1);
      const b = blackout;
      b.clear();
      if (k > 0.01) {
        const x0 = cam.x - vw, w = vw * 2;
        const feather = 36, steps = 6;
        const shade = (y0: number, y1: number, a: number) => { if (y1 > y0) b.rect(x0, y0, w, y1 - y0).fill({ color: 0x140812, alpha: a * k }); };
        // above the gate (the Rim has open sky above, so nothing to hide there)
        // fully dark beyond the gate's edges; the soft edge sits just inside them, over ceiling and floor slab
        if (fi > 0) {
          shade(cam.y - vh, fl.top, 1);
          for (let i = 0; i < steps; i++) shade(fl.top + (i * feather) / steps, fl.top + ((i + 1) * feather) / steps, 1 - (i + 0.5) / steps);
        }
        shade(fl.bottom, cam.y + vh, 1);
        for (let i = 0; i < steps; i++) shade(fl.bottom - feather + (i * feather) / steps, fl.bottom - feather + ((i + 1) * feather) / steps, (i + 0.5) / steps);
      }
    }
    G.view = { top: cam.y - vh / 2, bottom: cam.y + vh / 2 };

    const floor = floorAt(cam.y);
    G.viewFloor = floor;
    if (floor !== shownFloor) {
      shownFloor = floor;
      hud.setFloor(floor, floors[floor].plaque);
      history.replaceState(null, '', floor === 0 ? '#rim' : `#gate-${floor}`);
    }
  });

  // a couple of critters arrive on their own so the world is never empty
  setTimeout(() => spawn('boba'), 500);
  setTimeout(() => spawn('mochi', true), 1300);

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__hell = { G, app, cam, floors, spawn, unspawn, goto, Matter };
  }
}

void boot();
