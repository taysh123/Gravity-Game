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
  { id: 1, name: 'FOUNDATIONS', theme: PHYSICS.COLOR_GOAL, from: 1, to: 6 },
  { id: 2, name: 'CURRENTS', theme: PHYSICS.COLOR_ATTRACTOR_PULSE, from: 7, to: 11 },
  { id: 3, name: 'CLOCKWORK', theme: PHYSICS.COLOR_ATTRACTOR, from: 12, to: 16 },
  { id: 4, name: 'PERIL', theme: PHYSICS.COLOR_DEATH, from: 17, to: 22 },
  { id: 5, name: 'WELLS', theme: PHYSICS.COLOR_MAGNET_ATTRACT, from: 23, to: 27 },
];
