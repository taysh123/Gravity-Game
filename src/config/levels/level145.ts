import type { LevelConfig } from '../../types';

// World 14 — Singularity · precision 2: a tiny goal guarded by a fast saw. The
// window is brief and the target unforgiving — commit the instant it opens.
export const level145: LevelConfig = {
  ball:      { x: 80, y: 690 },
  goal:      { x: 300, y: 120, radius: 24 },
  obstacles: [],
  hazards: [
    { x: 300, y: 240, radius: 22, to: { x: 160, y: 240 }, durationMs: 1000 },
  ],
  collectible: { x: 80, y: 260 },
  hint:      'Slip the saw to the small goal',
  parTimeMs: 14000,
};
