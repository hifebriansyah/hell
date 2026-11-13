export type CritterId = 'boba' | 'mochi' | 'pebble' | 'gloop' | 'toto';

export interface CritterDef {
  id: CritterId;
  name: string;
  mischief: string;
  /** physics shape: circle radius, or a rounded box */
  shape: { kind: 'circle'; r: number } | { kind: 'box'; w: number; h: number; round: number };
  /** half-height of the drawn body, used to place hats, steam, etc. */
  r: number;
  // the five shared traits (0..1 scales, tuned per critter)
  mass: number; // kg-ish, fed to Matter.Body.setMass
  windDrag: number; // frictionAir, plus how much wind pushes it
  bounce: number; // restitution
  thermal: number; // how fast it heats and cools
  grip: number; // friction
  /** spins easily in vortices / tumbles in wind */
  spin: number;
  deadpan?: boolean;
  colors: { body: number; belly: number; accent: number; accent2: number; cheek: number };
  quips: string[];
  regenLine: string;
}

export const CRITTERS: CritterDef[] = [
  {
    id: 'boba',
    name: 'Boba the Cat',
    mischief: 'Snack hoarding',
    shape: { kind: 'circle', r: 78 },
    r: 78,
    mass: 9,
    windDrag: 0.02,
    bounce: 0.35,
    thermal: 1,
    grip: 0.15,
    spin: 0.7,
    colors: { body: 0xc6b0ff, belly: 0xf3ebff, accent: 0xffb0cf, accent2: 0x9a84e0, cheek: 0xff9fc4 },
    quips: [
      'Hoarded every midnight snack',
      'Licked the butter and put it back',
      'Hid the last cookie under a cushion',
      'Ate the snack labelled "not yours"',
    ],
    regenLine: 'Not again!',
  },
  {
    id: 'mochi',
    name: 'Mochi the Duckling',
    mischief: 'Queue cutting',
    shape: { kind: 'circle', r: 58 },
    r: 58,
    mass: 3,
    windDrag: 0.045,
    bounce: 0.5,
    thermal: 1.2,
    grip: 0.4,
    spin: 1.3,
    colors: { body: 0xffde5c, belly: 0xfff1a8, accent: 0xff9a3c, accent2: 0xf2bf2e, cheek: 0xffa48c },
    quips: [
      'Cut the bread line. Twice.',
      'Pretended to be "just asking a question"',
      'Saved six seats with one sock',
      'Merged at the very last cone',
    ],
    regenLine: 'Not agaaain!',
  },
  {
    id: 'pebble',
    name: 'Pebble the Capybara',
    mischief: 'Unbothered stubbornness',
    shape: { kind: 'box', w: 186, h: 136, round: 58 },
    r: 68,
    mass: 18,
    windDrag: 0.008,
    bounce: 0.12,
    thermal: 0.45,
    grip: 0.6,
    spin: 0.25,
    deadpan: true,
    colors: { body: 0xc08455, belly: 0xe2b083, accent: 0x8a5634, accent2: 0xa86e44, cheek: 0xe79a7a },
    quips: [
      'Refused to move off the couch',
      'Stood in the doorway. All day.',
      'Replied "k" to everything',
      'Would not budge for the escalator',
    ],
    regenLine: '-_-',
  },
  {
    id: 'gloop',
    name: 'Gloop the Jelly-Pup',
    mischief: 'Sticky mischief',
    shape: { kind: 'circle', r: 66 },
    r: 66,
    mass: 6,
    windDrag: 0.025,
    bounce: 0.88,
    thermal: 0.9,
    grip: 0.9,
    spin: 0.8,
    colors: { body: 0x7debc3, belly: 0xc6fbe6, accent: 0x4fcfa3, accent2: 0x5fd9b0, cheek: 0xff9fb5 },
    quips: [
      'Left fingerprints on every window',
      'Licked the remote control',
      'Glued the TV remote to the ceiling',
      'Stuck gum under every table',
    ],
    regenLine: 'Blorp! Not again!',
  },
  {
    id: 'toto',
    name: 'Toto the Bat',
    mischief: 'Midnight gossip',
    shape: { kind: 'circle', r: 50 },
    r: 50,
    mass: 1.6,
    windDrag: 0.08,
    bounce: 0.4,
    thermal: 1.1,
    grip: 0.3,
    spin: 1.6,
    colors: { body: 0x9ea8ff, belly: 0xd5daff, accent: 0xffbfdc, accent2: 0x7883e6, cheek: 0xff9fc4 },
    quips: [
      'Spread a rumour at 3 a.m.',
      'Read everyone’s group chat',
      'Whispered spoilers at the cinema',
      'Told the cat what the dog said',
    ],
    regenLine: 'Eek! Not again!',
  },
];

export const byId = (id: CritterId) => CRITTERS.find((c) => c.id === id)!;
