import type { LevelConfig } from '../../types';

// World 12 — Tempest · teach 2: the clock. An open climb, but a hard countdown — go
// straight and decisive. Hesitation is the only thing that fails you here.
export const level125: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 130, radius: 34 },
  obstacles: [],
  collectible: { x: 300, y: 500 },
  hint:      'Beat the clock — straight up',
  parTimeMs: 9000,
  timeLimitMs: 15000,
};
