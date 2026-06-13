import type { LevelConfig } from '../../types';

// World 11 — Labyrinth · develop 2: a descent through a one-way down-gate. Commit
// downward — you can't climb back — into the bottom pocket where home waits.
export const level117: LevelConfig = {
  ball:      { x: 180, y: 140 },
  goal:      { x: 180, y: 680, radius: 32 },
  obstacles: [],
  gates: [
    { x: 180, y: 400, width: 360, height: 16, dir: { x: 0, y: 1 } }, // passable downward only
  ],
  collectible: { x: 300, y: 250 }, // up top — grab before committing down
  hint:      'Commit down through the gate',
  parTimeMs: 14000,
};
