import { PHYSICS } from './physics.config';

// Chapter grouping over the flat LEVELS[] (which stays the source of truth).
// `from`/`to` are 1-based level numbers, inclusive. New worlds are appended as
// their levels are authored.
export interface World {
  id: number;
  name: string;
  theme: number; // accent tint for the chapter
  from: number;
  to: number;
}

export const WORLDS: World[] = [
  // Worlds 1-3 overhauled to 10 levels each (Gameplay Overhaul Sprint); later worlds 8.
  { id: 1, name: 'FOUNDATIONS', theme: PHYSICS.COLOR_GOAL, from: 1, to: 10 },
  { id: 2, name: 'CURRENTS', theme: PHYSICS.COLOR_ATTRACTOR_PULSE, from: 11, to: 20 },
  { id: 3, name: 'CLOCKWORK', theme: PHYSICS.COLOR_ATTRACTOR, from: 21, to: 30 },
  { id: 4, name: 'PERIL', theme: PHYSICS.COLOR_DEATH, from: 31, to: 38 },
  { id: 5, name: 'WELLS', theme: PHYSICS.COLOR_MAGNET_ATTRACT, from: 39, to: 46 },
  { id: 6, name: 'RIFTS', theme: PHYSICS.COLOR_PORTAL_A, from: 47, to: 54 },
  { id: 7, name: 'GATES', theme: PHYSICS.COLOR_GATE, from: 55, to: 62 },
  { id: 8, name: 'CONVERGENCE', theme: PHYSICS.COLOR_BALL_GLOW, from: 63, to: 70 },
];
