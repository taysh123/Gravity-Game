import type { LevelConfig } from '../../types';

// World 5 — Wells · twist: two repel wells stagger the centre. Slalom between the
// pushes to climb. The gem sits in the squeeze between them — the greedy line.
export const level38: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 180, y: 110, radius: 34 },
  obstacles: [],
  magnets: [
    { x: 110, y: 480, polarity: 'repel' },
    { x: 250, y: 320, polarity: 'repel' },
  ],
  collectible: { x: 180, y: 400 }, // in the squeeze between the two repellers
  hint:      'Slalom between the pushes',
  parTimeMs: 14000,
};
