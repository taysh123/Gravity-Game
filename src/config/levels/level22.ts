import type { LevelConfig } from '../../types';

// World 4 — Peril · master capstone: weave a zigzag, dodge a sweeping saw near
// the goal, and beat the clock. Everything at once.
export const level22: LevelConfig = {
  ball:      { x: 70, y: 660 },
  goal:      { x: 300, y: 120, radius: 32 },
  obstacles: [
    { x: 130, y: 440, width: 220, height: 16 }, // gap on the right
    { x: 250, y: 290, width: 220, height: 16 }, // gap on the left
  ],
  hazards: [
    { x: 180, y: 175, radius: 26, to: { x: 320, y: 175 }, durationMs: 1300 }, // saw guarding the goal
  ],
  collectible: { x: 70, y: 250 },
  hint:      'Weave, dodge the saw, beat the clock',
  parTimeMs: 11000,
  timeLimitMs: 16000,
};
