import type { LevelConfig } from '../../types';

// World 14 — Singularity · precision 3: two repel wells force a tight slalom to a
// pinpoint goal. Over-steer either push and you're flung off the line.
export const level146: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 110, radius: 22 },
  obstacles: [],
  magnets: [
    { x: 120, y: 480, polarity: 'repel' },
    { x: 240, y: 340, polarity: 'repel' },
  ],
  collectible: { x: 300, y: 560 },
  hint:      'Weave the pushes — tiny target',
  parTimeMs: 17000,
};
