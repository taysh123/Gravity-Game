import type { LevelConfig } from '../../types';

// World 10 — Binary · teach 2: a repel well sits dead on the line home. You can't
// push straight through it — arc around the push and drop back to the goal.
export const level105: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 140, radius: 34 },
  obstacles: [],
  magnets: [
    { x: 180, y: 400, polarity: 'repel' },
  ],
  collectible: { x: 300, y: 500 }, // off to the side of the push
  hint:      'Arc around the push',
  parTimeMs: 13000,
};
