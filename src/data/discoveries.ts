import type { HatId } from '../critters/rig';

export type GateKey = 'rim' | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7' | 'any';

export interface Discovery {
  id: string;
  gate: GateKey;
  name: string;
  how: string; // shown once found
  hint: string; // shown while locked
  hat?: HatId;
}

export const GATE_LABEL: Record<GateKey, string> = {
  rim: 'The Rim',
  g1: 'Gate 1 · Jahannam',
  g2: 'Gate 2 · Laza',
  g3: 'Gate 3 · al-Hutamah',
  g4: 'Gate 4 · al-Sa’ir',
  g5: 'Gate 5 · Saqar',
  g6: 'Gate 6 · al-Jahim',
  g7: 'Gate 7 · al-Hawiyah',
  any: 'Anywhere',
};

export const DISCOVERIES: Discovery[] = [
  { id: 'rim-full', gate: 'rim', name: 'Full House', hat: 'party', how: 'All five critters out at once.', hint: 'Invite the whole gang.' },
  { id: 'rim-splat', gate: 'rim', name: 'Rim Splat', how: 'A hard landing flattened someone like a rug.', hint: 'What goes up…' },
  { id: 'g1-boil', gate: 'g1', name: 'Boiled Cork-Pop', hat: 'chef', how: 'Simmered pink until they popped out like a cork.', hint: 'Let someone soak a little too long.' },
  { id: 'g1-champagne', gate: 'g1', name: 'Champagne Lid-Pop', hat: 'cork', how: 'The lid blew three or more critters sky-high at once.', hint: 'A full pot, a shut lid, and patience.' },
  { id: 'g1-spin', gate: 'g1', name: 'Soup Spin Cycle', hat: 'beanie', how: 'Stirred until their eyes turned to spirals.', hint: 'That ladle is not just for show.' },
  { id: 'g1-hatch', gate: 'any', name: 'Down the Hatch', hat: 'propeller', how: 'Dropped through a trapdoor into the gate below.', hint: 'Every floor has a lever.' },
  { id: 'g2-roast', gate: 'g2', name: 'Peeled & Roasted', hat: 'crown', how: 'Coat off, then too close to the flame. A tidy ash pile with eyes.', hint: 'It calls back whoever runs.' },
  { id: 'g2-boxers', gate: 'g2', name: 'Polka-Dot Reveal', how: 'Pebble’s fur came off. The boxers did not.', hint: 'Some coats hide more than others.' },
  { id: 'g2-full-peel', gate: 'g2', name: 'Clothing Optional', how: 'All five peeled at the same time.', hint: 'Peel the whole gang.' },
  { id: 'g3-pancake', gate: 'g3', name: 'Pancaked Flat', hat: 'paper', how: 'Pressed into a paper rug and still technically alive. Then not.', hint: 'Pull the stomp lever. Repeatedly.' },
  { id: 'g3-stack', gate: 'g3', name: 'Short Stack', how: 'Two or more flattened in one stomp.', hint: 'Line them up.' },
  { id: 'g4-fireball', gate: 'g4', name: 'Zaqqum Fireball Pop', hat: 'chili', how: 'Fed one fruit too many. Exited as a fireball.', hint: 'They clamp their mouths. Push harder.' },
  { id: 'g4-burp', gate: 'g4', name: 'Polite Smoke Burp', how: 'Pebble ate it without complaint and said pardon.', hint: 'Someone here has no reaction to anything.' },
  { id: 'g5-scorch', gate: 'g5', name: 'Conveyor Scorched', hat: 'hardhat', how: 'Dragged face-first into the grate. Ash, then “Not again!”', hint: 'Crank it faster.' },
  { id: 'g5-reverse', gate: 'g5', name: 'Wrong Way Round', how: 'Ran the belt backwards and flung someone off the top.', hint: 'Cranks turn both ways.' },
  { id: 'g6-shatter', gate: 'g6', name: 'Mallet-Shattered Ice Cube', hat: 'earmuffs', how: 'Frozen solid, then whacked into shards.', hint: 'Ice first, then the mallet.' },
  { id: 'g6-tongue', gate: 'g6', name: 'Triple-Dog Dare', how: 'Tongue stuck to the frozen pillar.', hint: 'Get someone close to the pillar.' },
  { id: 'g7-meteor', gate: 'g7', name: 'Blazing Meteor Pop', hat: 'antenna', how: 'Fell so fast they burned up. Regrew mid-fall. Still falling.', hint: 'Just wait. Or add weight.' },
  { id: 'g7-lead', gate: 'g7', name: 'Lead Balloon', how: 'Clipped a heavy iron weight onto a falling critter.', hint: 'The rack on the wall.' },
  { id: 'any-splat', gate: 'any', name: 'Wall Splat', how: 'Flung hard enough to flatten against a gate.', hint: 'Fling harder.' },
];

const KEY = 'hell.found';
type Store = Record<string, number>;

function load(key: string): Store {
  try { return JSON.parse(localStorage.getItem(key) || '{}') as Store; } catch { return {}; }
}
function save(key: string, s: Store) {
  try { localStorage.setItem(key, JSON.stringify(s)); } catch { /* private mode */ }
}
let found = load(KEY);
const listeners: (() => void)[] = [];

export const discoveries = {
  isFound: (id: string) => (found[id] ?? 0) > 0,
  count: (id: string) => found[id] ?? 0,
  /** returns true the first time */
  bump(id: string) {
    const first = !found[id];
    found[id] = (found[id] ?? 0) + 1;
    save(KEY, found);
    listeners.forEach((f) => f());
    return first;
  },
  hats(): HatId[] {
    return DISCOVERIES.filter((d) => d.hat && found[d.id]).map((d) => d.hat!);
  },
  total: () => DISCOVERIES.filter((d) => found[d.id]).length,
  reset() {
    found = {};
    ledgerStore = {};
    try { localStorage.removeItem(KEY); localStorage.removeItem(LEDGER); } catch { /* ignore */ }
    listeners.forEach((f) => f());
  },
  onChange(f: () => void) { listeners.push(f); },
};

// The eternity ledger: how many times each critter has popped, ever.
const LEDGER = 'hell.ledger';
let ledgerStore = load(LEDGER);
export const ledger = {
  bump(id: string) {
    ledgerStore[id] = (ledgerStore[id] ?? 0) + 1;
    save(LEDGER, ledgerStore);
    return ledgerStore[id];
  },
  count: (id: string) => ledgerStore[id] ?? 0,
  total: () => Object.values(ledgerStore).reduce((a, b) => a + b, 0),
};
