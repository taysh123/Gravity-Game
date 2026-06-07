import type { LevelConfig } from '../../types';

// World 3 · L15 — TOY "Gearslip": a barrier slides fully aside with a satisfying
// clunk, opening a wide path home — a hidden-path reveal you simply slip through as
// it clears. Forgiving and tactile: meet the clockwork as a toy before it becomes a
// test. (The route is "hidden" until the gear moves.)
export const level12: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 140, radius: 46 },
  obstacles: [
    { x: 70,  y: 390, width: 120, height: 18 }, // left wall  (x 10..130)
    { x: 290, y: 390, width: 120, height: 18 }, // right wall (x 230..350)
  ],
  movingPlatforms: [
    { x: 180, y: 390, width: 110, height: 18, to: { x: 55, y: 390 }, durationMs: 1500 }, // slides fully aside
  ],
  collectible: { x: 180, y: 250 }, // on the path once the gear opens
  hint:      'The gear slides aside — slip through as it opens',
  parTimeMs: 12000,
};
