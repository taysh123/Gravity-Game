import type { LevelConfig } from '../../types';

// World 15 — Homecoming · reprise 2: an old friend — a single attract well, offset,
// curving your path home. Let it carry you the way it first taught you to fly.
export const level155: LevelConfig = {
  ball:      { x: 70, y: 680 },
  goal:      { x: 300, y: 140, radius: 30 },
  obstacles: [],
  magnets: [
    { x: 200, y: 430, polarity: 'attract' },
  ],
  collectible: { x: 150, y: 300 },
  hint:      'Let the well carry you',
  parTimeMs: 14000,
};
