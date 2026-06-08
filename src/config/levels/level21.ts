import type { LevelConfig } from '../../types';

// World 4 — Peril · develop: a saw spins on an arm across the middle (a rotating
// hazard, not another linear sweep — Peril's threat vocabulary stays varied).
// Read the spin and climb the centre when the arm is swung aside.
export const level21: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 36 },
  obstacles: [],
  hazards: [
    { x: 180, y: 295, radius: 26, pivot: { x: 180, y: 390 }, durationMs: 2400 }, // spinning gear-arm
  ],
  collectible: { x: 180, y: 228 }, // just above the arm's reach — slip past as it swings away
  hint:      'Read the spin — climb when the arm swings aside',
  parTimeMs: 13000,
};
