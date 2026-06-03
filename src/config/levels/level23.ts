import type { LevelConfig } from '../../types';

// World 5 — Wells · teach: a single attract well sits on the climb. As the ball
// rises into its reach, the well accelerates it upward; near the top the well's
// pull fades and you finish into a generous goal. Aha: "wells pull you in."
export const level23: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 130, radius: 44 },
  obstacles: [],
  magnets: [
    { x: 180, y: 400, polarity: 'attract' },
  ],
  collectible: { x: 290, y: 320 },
  hint:      'The blue well pulls you in — ride it upward',
  parTimeMs: 10000,
};
