import type { LevelConfig } from '../../types';

// World 12 — Tempest · combine 3: a rotating arm scythes the centre on a hard
// clock. Read the spin, pick your window, and break for the goal before time runs.
export const level131: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 110, radius: 26 },
  obstacles: [],
  hazards: [
    { x: 180, y: 250, radius: 22, pivot: { x: 180, y: 380 }, durationMs: 2200 }, // rotating arm
  ],
  collectible: { x: 300, y: 560 },
  hint:      'Time the spinning arm — quickly',
  parTimeMs: 12000,
  timeLimitMs: 18000,
};
