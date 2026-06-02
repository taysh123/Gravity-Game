import type { LevelConfig } from '../../types';

// World 5 — Wells · develop: the goal is offset up-right. An attract well set off
// the straight line curves your climb toward it — slingshot past the well rather
// than straight up.
export const level24: LevelConfig = {
  ball:      { x: 80, y: 660 },
  goal:      { x: 300, y: 150, radius: 44 },
  obstacles: [],
  magnets: [
    { x: 220, y: 420, polarity: 'attract' },
  ],
  collectible: { x: 150, y: 300 },
  hint:      'Let the well swing you toward the goal',
  parTimeMs: 15000,
};
