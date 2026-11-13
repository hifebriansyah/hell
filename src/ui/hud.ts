import { G, TINKER_DEFAULT, type Tinker } from '../engine/game';
import { isMuted, setMuted, unlockAudio } from '../engine/audio';
import { CRITTERS, type CritterId } from '../critters/defs';
import { DISCOVERIES, discoveries, GATE_LABEL, ledger, type GateKey } from '../data/discoveries';
import type { Plaque } from '../floors/floor';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

const SLIDERS: { key: keyof Tinker; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { key: 'heat', label: 'Heat / flame', min: 0, max: 1, step: 0.01, fmt: (v) => (v < 0.2 ? 'embers' : v < 0.6 ? 'simmer' : v < 0.9 ? 'boil' : 'inferno') },
  { key: 'frost', label: 'Zamharir frost', min: 0, max: 1, step: 0.01, fmt: (v) => (v < 0.05 ? 'off' : v < 0.5 ? 'chilly' : 'arctic') },
  { key: 'wind', label: 'Wind gusts', min: 0, max: 1, step: 0.01, fmt: (v) => (v < 0.05 ? 'still' : v < 0.5 ? 'breezy' : 'gale') },
  { key: 'fall', label: 'Abyss fall speed', min: 0, max: 1, step: 0.01, fmt: (v) => (v < 0.12 ? 'slow-mo' : v < 0.4 ? 'drift' : v < 0.7 ? 'fast' : 'plummet') },
  { key: 'gravity', label: 'Gravity', min: 0.15, max: 1.6, step: 0.01, fmt: (v) => (v < 0.4 ? 'floaty' : v < 1.2 ? 'normal' : 'heavy') },
];

const TAG = { q: "Qur'an", h: 'Hadith', t: 'Tafsir', n: 'Note' } as const;

export class Hud {
  onGoto: (floor: number) => void = () => {};
  onCritter: (id: CritterId) => void = () => {};
  private quipTimer = 0;

  constructor() {
    // rail
    document.querySelectorAll<HTMLButtonElement>('#rail button').forEach((b) => {
      b.addEventListener('click', () => {
        unlockAudio();
        this.onGoto(Number(b.dataset.floor));
      });
    });

    // corner
    const drawers: [string, string][] = [['#tinkerBtn', '#tinker'], ['#plaqueBtn', '#plaque']];
    for (const [btn, panel] of drawers) {
      $(btn).addEventListener('click', () => {
        unlockAudio();
        const p = $(panel);
        const open = p.hidden;
        for (const [b2, p2] of drawers) { $(p2).hidden = true; $(b2).classList.remove('on'); }
        p.hidden = !open;
        $(btn).classList.toggle('on', open);
      });
    }
    document.querySelectorAll('[data-close]').forEach((x) =>
      x.addEventListener('click', () => this.closeAll()),
    );
    $('#logBtn').addEventListener('click', () => { unlockAudio(); this.renderLog(); $('#logPanel').hidden = false; });
    $('#logPanel').addEventListener('click', (e) => { if (e.target === $('#logPanel')) $('#logPanel').hidden = true; });
    $('#resetLog').addEventListener('click', () => {
      if (confirm('Forget every discovery and hat?')) discoveries.reset();
    });
    const mute = $('#muteBtn');
    mute.classList.toggle('muted', isMuted());
    mute.addEventListener('click', () => {
      unlockAudio();
      setMuted(!isMuted());
      mute.classList.toggle('muted', isMuted());
    });

    // sliders
    const box = $('#sliders');
    for (const s of SLIDERS) {
      const wrap = document.createElement('div');
      wrap.className = 'slider';
      wrap.innerHTML = `<label for="s-${s.key}">${s.label} <span></span></label><input id="s-${s.key}" type="range" min="${s.min}" max="${s.max}" step="${s.step}">`;
      const input = wrap.querySelector('input')!;
      const out = wrap.querySelector('span')!;
      input.value = String(G.tinker[s.key]);
      out.textContent = s.fmt(G.tinker[s.key]);
      input.addEventListener('input', () => {
        G.tinker[s.key] = Number(input.value);
        out.textContent = s.fmt(G.tinker[s.key]);
      });
      box.appendChild(wrap);
    }
    $('#resetSliders').addEventListener('click', () => {
      Object.assign(G.tinker, TINKER_DEFAULT);
      for (const s of SLIDERS) {
        const i = $<HTMLInputElement>(`#s-${s.key}`);
        i.value = String(G.tinker[s.key]);
        i.parentElement!.querySelector('span')!.textContent = s.fmt(G.tinker[s.key]);
      }
    });

    discoveries.onChange(() => this.renderCount());
    this.renderCount();
  }

  closeAll() {
    for (const id of ['#tinker', '#plaque', '#logPanel']) $(id).hidden = true;
    for (const id of ['#tinkerBtn', '#plaqueBtn']) $(id).classList.remove('on');
  }

  /** tray buttons; icons are data URLs rendered from the rigs */
  buildTray(icons: Record<CritterId, string>) {
    const tray = $('#trayCritters');
    tray.innerHTML = '';
    for (const d of CRITTERS) {
      const b = document.createElement('button');
      b.dataset.id = d.id;
      b.title = `${d.name} (${d.mischief.toLowerCase()})`;
      b.setAttribute('aria-label', d.name);
      b.innerHTML = `<img alt="" src="${icons[d.id]}">`;
      b.addEventListener('click', () => { unlockAudio(); this.onCritter(d.id); });
      tray.appendChild(b);
    }
  }

  setOut(id: CritterId, out: boolean) {
    const b = document.querySelector<HTMLButtonElement>(`#trayCritters [data-id="${id}"]`);
    if (!b) return;
    b.classList.toggle('out', out);
    const d = CRITTERS.find((c) => c.id === id)!;
    b.title = out ? `${d.name}: tap to bring here or send home` : `${d.name} (${d.mischief.toLowerCase()})`;
  }

  setFloor(f: number, plaque: Plaque) {
    document.querySelectorAll<HTMLButtonElement>('#rail button').forEach((b) => b.classList.toggle('on', Number(b.dataset.floor) === f));
    if ($('#plaqueBody').dataset.floor === String(f)) return;
    $('#plaqueBody').dataset.floor = String(f);
    $('#plaqueTitle').textContent = plaque.title;
    $('#plaqueBody').innerHTML =
      `<p class="lead">${plaque.lead}</p>` +
      plaque.entries.map((e) => `<h3><span class="tag ${e.tag}">${TAG[e.tag]}</span>${e.head}</h3><p>${e.body}</p>`).join('') +
      `<p class="note">Paraphrased for a general audience. For study, read the Qur’an, the hadith collections and the commentaries themselves.</p>`;
  }

  quip(name: string, line: string) {
    const q = $('#quip');
    q.innerHTML = `<em>${name}</em> · ${line}`;
    q.classList.add('show');
    clearTimeout(this.quipTimer);
    this.quipTimer = window.setTimeout(() => q.classList.remove('show'), 2600);
  }

  toast(text: string) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 3300);
  }

  private renderCount() {
    const n = discoveries.total();
    const b = $('#logCount');
    b.textContent = String(n);
    b.hidden = n === 0;
    if (!$('#logPanel').hidden) this.renderLog();
  }

  renderLog() {
    const list = $('#logList');
    let html = '';
    const total = ledger.total();
    if (total) {
      html += `<div class="gate-head">Eternity ledger</div><div class="ledger">` +
        CRITTERS.map((c) => `<span><b>${ledger.count(c.id)}</b> ${c.name.split(' ')[0]}</span>`).join('') +
        `</div><p class="sub">${total} pops so far. Nobody has learned anything.</p>`;
    }
    for (const gate of ['rim', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'any'] as GateKey[]) {
      html += `<div class="gate-head">${GATE_LABEL[gate]}</div>`;
      for (const d of DISCOVERIES.filter((x) => x.gate === gate)) {
        const n = discoveries.count(d.id);
        const hat = d.hat ? ` · unlocks the ${d.hat} hat` : '';
        html += n
          ? `<div class="disc done"><div class="ico">${HAT_EMOJI[d.hat ?? ''] ?? '✨'}</div><div><b>${d.name} ×${n}</b><small>${d.how}${hat}</small></div></div>`
          : `<div class="disc locked"><div class="ico">?</div><div><b>${d.name}</b><small>${d.hint}${hat}</small></div></div>`;
      }
    }
    html += `<p class="sub">Tip: double-tap a critter to change its hat.</p>`;
    list.innerHTML = html;
  }
}

const HAT_EMOJI: Record<string, string> = {
  party: '\u{1F389}',
  chef: '\u{1F372}',
  cork: '\u{1F37E}',
  crown: '\u{1F525}',
  paper: '\u{1F95E}',
  chili: '\u{1F336}\uFE0F',
  hardhat: '\u{1F6A7}',
  earmuffs: '\u{1F9CA}',
  antenna: '\u2604\uFE0F',
  beanie: '\u{1F300}',
  propeller: '\u{1F681}',
};
