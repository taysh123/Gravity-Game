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
  // Combination / tension / mastery worlds (reuse the 7 mechanics; no new engine code).
  { id: 9, name: 'GAUNTLET', theme: 0xff8a3d, from: 81, to: 90 },
  { id: 10, name: 'BINARY', theme: 0x6a8cff, from: 91, to: 100 },
  { id: 11, name: 'LABYRINTH', theme: 0x33e1ff, from: 101, to: 110 },
  { id: 12, name: 'TEMPEST', theme: 0xff5a6a, from: 111, to: 120 },
  { id: 13, name: 'ASCENSION', theme: 0x7affb0, from: 121, to: 130 },
  { id: 14, name: 'SINGULARITY', theme: 0xc04cff, from: 131, to: 140 },
];
