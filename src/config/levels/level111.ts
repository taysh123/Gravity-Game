import type { LevelConfig } from '../../types';

// World 10 — Binary · combine 3: a slalom between two repel wells offset on either
// side. Weave the pushes — overcommit to one and the other shoves you off line.
export const level111: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 120, radius: 28 },
  obstacles: [],
  magnets: [
    { x: 120, y: 460, polarity: 'repel' },
    { x: 240, y: 300, polarity: 'repel' },
  ],
  collectible: { x: 300, y: 560 },
  hint:      'Slalom between the two pushes',
  parTimeMs: 17000,
};
