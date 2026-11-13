import type Matter from 'matter-js';
import type { Container } from 'pixi.js';
import type { Fx } from './fx';
import type { Critter } from '../critters/critter';

// World constants (pixels; y grows downward, like matter-js).
// The dollhouse is one tall cross-section: the Rim on top, then Gates 1-7 stacked below.
export const W = 1200;
export const RIM_GROUND = 860; // the Rim's walking surface
export const SLAB = 200; // thickness of the crust between the Rim and Gate 1
export const ROOM = 840; // height of one gate's room
export const PITCH = 940; // room + the 100px floor slab under it
export const G7_ROOM = 1500; // the bottomless pit is taller

/** ceiling, walking surface and bottom (end of floor slab) of gate n (1..7) */
export const gateTop = (n: number) => RIM_GROUND + SLAB + (n - 1) * PITCH;
export const gateFloor = (n: number) => gateTop(n) + ROOM;
export const gateBottom = (n: number) => (n === 7 ? gateTop(7) + G7_ROOM : gateTop(n) + PITCH);
export const WORLD_BOTTOM = gateBottom(7);

export const G1_TOP = gateTop(1); // 1060
export const G1_FLOOR = gateFloor(1); // 1900
export const HOLE = { x0: 530, x1: 870 }; // the mouth in the Rim, right above the cauldron
export const STEP = 1000 / 60;

/** which side of the floor each gate's trapdoor sits on (gate n+1's ceiling has the matching hole) */
export const TRAP_SIDE: Record<number, 'left' | 'right'> = { 1: 'left', 2: 'right', 3: 'left', 4: 'left', 5: 'left', 6: 'right' };
export const trapSpan = (side: 'left' | 'right') => (side === 'left' ? { x0: 60, x1: 280 } : { x0: 920, x1: 1140 });

/** 0 = Rim, 1..7 = gates */
export function floorAt(y: number) {
  if (y < G1_TOP) return 0;
  for (let n = 1; n <= 7; n++) if (y < gateBottom(n)) return n;
  return 7;
}

export interface Tinker {
  heat: number; // 0..1
  frost: number; // 0..1
  wind: number; // 0..1
  gravity: number; // 0.15..1.6
  fall: number; // Gate 7 fall speed: 0 slow-mo .. 1 plummet
}
export const TINKER_DEFAULT: Tinker = { heat: 0.7, frost: 0, wind: 0.15, gravity: 1, fall: 0.25 };

export type Tool = 'hand' | 'tongs';

export interface Layers {
  bg: Container; // far backgrounds (parallax handled by floors)
  back: Container; // props behind critters
  critters: Container;
  front: Container; // props in front of critters
  fx: Container;
  glow: Container;
  over: Container; // speech, ghosts
}

export interface Game {
  engine: Matter.Engine;
  fx: Fx;
  layers: Layers;
  tinker: Tinker;
  tool: Tool;
  time: number;
  critters: Critter[];
  /** a discovery happened (id from data/discoveries) */
  discover(id: string, who?: Critter): void;
  /** which floor the camera is centred on: 0 = Rim, 1..7 = gates */
  viewFloor: number;
  /** pointer in world space (for eyes that follow it) */
  pointer: { x: number; y: number; active: boolean };
  /** the camera's visible world rectangle */
  view: { top: number; bottom: number };
}

// Filled in by main.ts before anything else runs.
export const G = {} as Game;
