import type { LevelConfig } from '../../types';

// World 7 — Gates · combine: commit up through the gate, then time a sweeping saw
// to reach the goal — no dropping back to reset your approach.
export const level55: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 140, radius: 28 },
  obstacles: [],
  gates: [
    { x: 180, y: 520, width: 360, height: 16, dir: { x: 0, y: -1 } }, // full-width up-gate
  ],
  hazards: [
    { x: 90, y: 320, radius: 24, to: { x: 270, y: 320 }, durationMs: 1200 }, // sweeping saw above the gate
  ],
  collectible: { x: 300, y: 440 }, // off-route between gate and saw
  hint:      'Through the gate, then time the saw',
  parTimeMs: 17000,
};
