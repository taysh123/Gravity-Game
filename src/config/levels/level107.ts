import type { LevelConfig } from '../../types';

// World 10 — Binary · develop 2: a repel well hovers just above the only gap in the
// wall. Thread the gap, then steer offset so the push doesn't shove you back down.
export const level107: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 130, radius: 32 },
  obstacles: [
    { x: 80, y: 440, width: 120, height: 16 },  // x20..140
    { x: 280, y: 440, width: 120, height: 16 }, // x220..340 — centre gap 140..220
  ],
  magnets: [
    { x: 180, y: 330, polarity: 'repel' }, // guards above the gap
  ],
  collectible: { x: 300, y: 560 },
  hint:      'Thread the gap, slip past the push',
  parTimeMs: 15000,
};
