import type { LevelConfig } from '../../types';

// World 7 — Gates · teach: a full-width one-way gate. The ball passes UP through
// it, but can't come back down — so grab the gem below before you commit upward.
export const level49: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 140, radius: 42 },
  obstacles: [],
  gates: [
    { x: 180, y: 400, width: 360, height: 16, dir: { x: 0, y: -1 } }, // passable upward only
  ],
  collectible: { x: 300, y: 560 }, // below the gate — grab before ascending
  hint:      'Pass up through the gate — no going back',
  parTimeMs: 13000,
};
