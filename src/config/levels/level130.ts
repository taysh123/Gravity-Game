import type { LevelConfig } from '../../types';

// World 12 — Tempest · combine 2: rift across the wall, then a saw guards the
// goal — and the clock is running. No time to second-guess the jump.
export const level130: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 120, radius: 28 },
  obstacles: [
    { x: 180, y: 440, width: 360, height: 16 }, // sealed wall
  ],
  portals: [
    { a: { x: 90, y: 540 }, b: { x: 300, y: 330 } },
  ],
  hazards: [
    { x: 90, y: 220, radius: 22, to: { x: 300, y: 220 }, durationMs: 1100 },
  ],
  collectible: { x: 300, y: 540 },
  hint:      'Rift, dodge, beat the clock',
  parTimeMs: 12000,
  timeLimitMs: 17000,
};
