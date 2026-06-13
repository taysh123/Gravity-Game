import type { LevelConfig } from '../../types';

// World 11 — Labyrinth · develop: the goal sits in a sealed chamber. Only the rift
// reaches inside — enter the open mouth and emerge beside the goal.
export const level116: LevelConfig = {
  ball:      { x: 90, y: 660 },
  goal:      { x: 305, y: 150, radius: 32 },
  obstacles: [
    { x: 235, y: 140, width: 16, height: 170 }, // chamber left wall
    { x: 300, y: 235, width: 150, height: 16 },  // chamber floor
  ],
  portals: [
    { a: { x: 120, y: 430 }, b: { x: 305, y: 180 } }, // B inside the chamber
  ],
  collectible: { x: 120, y: 180 },
  hint:      'The rift reaches the sealed chamber',
  parTimeMs: 14000,
};
