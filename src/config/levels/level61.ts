import type { LevelConfig } from '../../types';

// World 8 — Convergence · gates + portal + hazard. Commit up through the gate,
// rift across the sealed wall, then dodge the saw guarding the goal.
export const level61: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 26 },
  obstacles: [
    { x: 180, y: 360, width: 360, height: 16 }, // sealed wall
  ],
  gates: [
    { x: 180, y: 540, width: 360, height: 16, dir: { x: 0, y: -1 } },
  ],
  portals: [
    { a: { x: 180, y: 450 }, b: { x: 180, y: 250 } },
  ],
  hazards: [
    { x: 90, y: 190, radius: 22, to: { x: 270, y: 190 }, durationMs: 1100 },
  ],
  collectible: { x: 300, y: 450 }, // off-route beside the lower mouth
  hint:      'Commit, rift, then dodge the saw',
  parTimeMs: 18000,
};
