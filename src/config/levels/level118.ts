import type { LevelConfig } from '../../types';

// World 11 — Labyrinth · twist: two rifts pierce the wall, but only one lands you
// near the goal — the other strands you on the far side. Read the exits, then choose.
export const level118: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 300, y: 130, radius: 30 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 16 }, // sealed wall
  ],
  portals: [
    { a: { x: 90, y: 540 }, b: { x: 90, y: 280 } },   // lands far-left (wrong side)
    { a: { x: 270, y: 540 }, b: { x: 300, y: 280 } }, // lands by the goal
  ],
  collectible: { x: 90, y: 200 }, // rewards exploring the decoy mouth
  hint:      'Two rifts — which lands you home?',
  parTimeMs: 15000,
};
