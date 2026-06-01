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
  { id: 2, name: 'CURRENTS', theme: PHYSICS.COLOR_ATTRACTOR_PULSE, from: 7, to: 8 },
  { id: 3, name: 'CLOCKWORK', theme: PHYSICS.COLOR_ATTRACTOR, from: 9, to: 10 },
  // Ranges extended as more levels are authored in the content pass.
];
