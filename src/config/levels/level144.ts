import type { LevelConfig } from '../../types';

// World 14 — Singularity · precision: a narrow channel splits the arena. Thread the
// needle straight up the slot — the smallest steering error clips a wall.
export const level144: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 120, radius: 26 },
  obstacles: [
    { x: 150, y: 400, width: 14, height: 300 }, // slot ~46px wide
    { x: 210, y: 400, width: 14, height: 300 },
  ],
  collectible: { x: 180, y: 400 }, // inside the channel — reward for the clean line
  hint:      'Thread the needle',
  parTimeMs: 14000,
};
