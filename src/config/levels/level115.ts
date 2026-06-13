import type { LevelConfig } from '../../types';

// World 11 — Labyrinth · teach 2: a full-width one-way gate. You pass up through
// it but can't drop back — so grab the gem below before you commit upward.
export const level115: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 140, radius: 34 },
  obstacles: [],
  gates: [
    { x: 180, y: 400, width: 360, height: 16, dir: { x: 0, y: -1 } },
  ],
  collectible: { x: 300, y: 540 }, // below the gate — grab before ascending
  hint:      'Up through the gate — no going back',
  parTimeMs: 13000,
};
