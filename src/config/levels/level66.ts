import type { LevelConfig } from '../../types';

// World 1 · L10 — BOSS "FOUNDATION COLLAPSE": three escalating sections — a weave,
// then a weave guarded by a spike, then a tight gap under a spike into a small
// goal. The capstone of Foundations; tight par.
export const level66: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 90, radius: 24 },
  obstacles: [
    { x: 110, y: 600, width: 200, height: 14 }, // §1 gap right
    { x: 250, y: 500, width: 200, height: 14 }, // §1 gap left
    { x: 110, y: 400, width: 200, height: 14 }, // §2 gap right
    { x: 250, y: 280, width: 200, height: 14 }, // §3 gap left
    { x: 110, y: 170, width: 200, height: 14 }, // §3 gap right (under the goal)
  ],
  hazards: [
    { x: 300, y: 450, radius: 24 }, // §2 spike near the right gap
    { x: 90, y: 230, radius: 24 },  // §3 spike near the right gap
  ],
  collectible: { x: 300, y: 600 }, // off-route, bottom
  title:     'THE COLLAPSE',
  boss:      true,
  hint:      'Survive all three sections',
  parTimeMs: 26000,
};
