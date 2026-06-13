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
  // 150-level expansion (M2): the 8 mechanic worlds grown 7->10 each by promoting
  // the retired pre-trim levels. Total 80 (8x10). Ranges stay contiguous.
  // (Worlds 9-15 are appended in later content milestones as their levels land.)
  { id: 1, name: 'FOUNDATIONS', theme: PHYSICS.COLOR_GOAL, from: 1, to: 10 },
  { id: 2, name: 'CURRENTS', theme: PHYSICS.COLOR_ATTRACTOR_PULSE, from: 11, to: 20 },
  { id: 3, name: 'CLOCKWORK', theme: PHYSICS.COLOR_ATTRACTOR, from: 21, to: 30 },
  { id: 4, name: 'PERIL', theme: PHYSICS.COLOR_DEATH, from: 31, to: 40 },
  { id: 5, name: 'WELLS', theme: PHYSICS.COLOR_MAGNET_ATTRACT, from: 41, to: 50 },
  { id: 6, name: 'RIFTS', theme: PHYSICS.COLOR_PORTAL_A, from: 51, to: 60 },
  { id: 7, name: 'GATES', theme: PHYSICS.COLOR_GATE, from: 61, to: 70 },
  { id: 8, name: 'CONVERGENCE', theme: PHYSICS.COLOR_BALL_GLOW, from: 71, to: 80 },
];
