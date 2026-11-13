import { Container, type Application } from 'pixi.js';
import { buildRig } from '../critters/rig';
import { byId } from '../critters/defs';

/**
 * Renders the app icons and favicons from Mochi's real vector rig (the same one the tray uses),
 * square 1:1, and saves them into public/ through the dev server's /__save-public hook.
 *
 * Run in the dev page console:  await (await import('/src/tools/icons.ts')).makeIcons(__hell.app)
 */

interface Spec {
  name: string;
  size: number;
  duck: number; // how much of the square the duck's longest side fills
  round: number; // corner radius as a fraction of size (0 = full-bleed square)
  glow: boolean;
}

const SPECS: Spec[] = [
  { name: 'icon-512.png', size: 512, duck: 0.74, round: 0.22, glow: true },
  { name: 'icon-192.png', size: 192, duck: 0.74, round: 0.22, glow: true },
  // maskable: full bleed, duck kept inside the 80% safe circle
  { name: 'icon-maskable-512.png', size: 512, duck: 0.6, round: 0, glow: true },
  // iOS rounds the corners itself and dislikes transparency
  { name: 'apple-touch-icon.png', size: 180, duck: 0.7, round: 0, glow: true },
  // favicons: tiny, so the duck fills nearly everything
  { name: 'favicon-48.png', size: 48, duck: 0.9, round: 0.22, glow: false },
  { name: 'favicon-32.png', size: 32, duck: 0.92, round: 0.22, glow: false },
];

/** the duck, transparent, rendered big and crisp */
function renderDuck(app: Application): HTMLCanvasElement {
  const rig = buildRig(byId('mochi'));
  rig.setExpr('happy');
  rig.pose({ x: 0.6, y: 0.1 }, 0, 0);
  const holder = new Container();
  holder.addChild(rig.root);
  const cv = app.renderer.extract.canvas({ target: holder, resolution: 8, antialias: true }) as HTMLCanvasElement;
  holder.destroy({ children: true });
  return cv;
}

function compose(duck: HTMLCanvasElement, s: Spec): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = s.size;
  const g = c.getContext('2d')!;
  const n = s.size;
  // background shape
  g.save();
  const r = s.round * n;
  g.beginPath();
  g.roundRect(0, 0, n, n, r);
  g.clip();
  const bg = g.createLinearGradient(0, 0, 0, n);
  bg.addColorStop(0, '#3b2150');
  bg.addColorStop(1, '#23224e');
  g.fillStyle = bg;
  g.fillRect(0, 0, n, n);
  if (s.glow) {
    // the warm cauldron glow rising from below
    const gl = g.createRadialGradient(n / 2, n * 1.02, 0, n / 2, n * 1.02, n * 0.78);
    gl.addColorStop(0, 'rgba(255,111,97,0.85)');
    gl.addColorStop(0.55, 'rgba(255,159,90,0.25)');
    gl.addColorStop(1, 'rgba(255,159,90,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, n, n);
  }
  // duck, centred (nudged down a touch so the tuft has headroom), with a soft contact shadow
  const k = (s.duck * n) / Math.max(duck.width, duck.height);
  const w = duck.width * k, h = duck.height * k;
  const x = (n - w) / 2, y = (n - h) / 2 + n * 0.02;
  if (s.size >= 128) {
    g.fillStyle = 'rgba(20,8,30,0.35)';
    g.beginPath();
    g.ellipse(n / 2, y + h * 0.97, w * 0.34, h * 0.06, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.imageSmoothingQuality = 'high';
  g.drawImage(duck, x, y, w, h);
  g.restore();
  return c;
}

export async function makeIcons(app: Application) {
  const duck = renderDuck(app);
  const saved: string[] = [];
  for (const s of SPECS) {
    const url = compose(duck, s).toDataURL('image/png');
    const res = await fetch(`/__save-public?name=${s.name}`, { method: 'POST', body: url.split(',')[1] });
    saved.push(`${s.name}: ${res.status === 200 ? 'saved' : 'FAILED ' + res.status}`);
  }
  return saved;
}

/** preview sheet of all sizes (for eyeballing), returned as a data URL */
export function preview(app: Application) {
  const duck = renderDuck(app);
  const sheet = document.createElement('canvas');
  sheet.width = 1100;
  sheet.height = 560;
  const g = sheet.getContext('2d')!;
  g.fillStyle = '#ddd';
  g.fillRect(0, 0, sheet.width, sheet.height);
  let x = 20;
  for (const s of SPECS) {
    g.drawImage(compose(duck, s), x, 20);
    x += s.size + 20;
    if (x > 900) x = 20;
  }
  return sheet.toDataURL();
}
