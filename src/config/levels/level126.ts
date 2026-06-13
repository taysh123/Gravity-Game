import type { LevelConfig } from '../../types';

// World 12 — Tempest · develop: clock plus a saw across the climb. Commit to the
// window the moment it opens — there's no time to wait for a second pass.
export const level126: LevelConfig = {
  ball:      { x: 80, y: 680 },
  goal:      { x: 300, y: 130, radius: 30 },
  obstacles: [],
  hazards: [
    { x: 280, y: 300, radius: 24, to: { x: 160, y: 300 }, durationMs: 1100 },
  ],
  collectible: { x: 80, y: 260 },
  hint:      'Beat the clock, dodge the saw',
  parTimeMs: 11000,
  timeLimitMs: 15000,
};
