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
  // Worlds 1-4 overhauled to 10 levels each (distinct mental skill + signature +
  // boss + >=3 aha); later worlds still 8 until their overhaul milestone.
  { id: 1, name: 'FOUNDATIONS', theme: PHYSICS.COLOR_GOAL, from: 1, to: 10 },
  { id: 2, name: 'CURRENTS', theme: PHYSICS.COLOR_ATTRACTOR_PULSE, from: 11, to: 20 },
  { id: 3, name: 'CLOCKWORK', theme: PHYSICS.COLOR_ATTRACTOR, from: 21, to: 30 },
  { id: 4, name: 'PERIL', theme: PHYSICS.COLOR_DEATH, from: 31, to: 40 },
  { id: 5, name: 'WELLS', theme: PHYSICS.COLOR_MAGNET_ATTRACT, from: 41, to: 48 },
  { id: 6, name: 'RIFTS', theme: PHYSICS.COLOR_PORTAL_A, from: 49, to: 56 },
  { id: 7, name: 'GATES', theme: PHYSICS.COLOR_GATE, from: 57, to: 64 },
  { id: 8, name: 'CONVERGENCE', theme: PHYSICS.COLOR_BALL_GLOW, from: 65, to: 72 },
];
