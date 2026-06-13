import type { LevelConfig } from '../../types';

// World 9 — Gauntlet · combine 3: a zigzag of shelves forces a weave, and a saw
// patrols the final lane to the goal. Precise routing, then a clean dodge.
export const level101: LevelConfig = {
  ball:      { x: 70, y: 690 },
  goal:      { x: 300, y: 130, radius: 28 },
  obstacles: [
    { x: 130, y: 460, width: 220, height: 16 }, // gap on the right
    { x: 250, y: 300, width: 220, height: 16 }, // gap on the left
  ],
  hazards: [
    { x: 180, y: 185, radius: 24, to: { x: 320, y: 185 }, durationMs: 1200 }, // saw near the goal
  ],
  collectible: { x: 70, y: 260 },
  hint:      'Weave the shelves, dodge the saw',
  parTimeMs: 16000,
};
