import type { LevelConfig } from '../../types';

// World 10 — Binary · twist: both polarities. A repel well blocks the centre; an
// attract well near the goal reels you home once you slip past. The gem is tucked
// beside the repeller — the greedy line.
export const level108: LevelConfig = {
  ball:      { x: 70, y: 680 },
  goal:      { x: 300, y: 140, radius: 30 },
  obstacles: [],
  magnets: [
    { x: 180, y: 400, polarity: 'repel' },   // blocks the middle
    { x: 300, y: 250, polarity: 'attract' }, // reels you home
  ],
  collectible: { x: 130, y: 320 }, // beside the repeller
  hint:      'Past the push, into the pull',
  parTimeMs: 16000,
};
