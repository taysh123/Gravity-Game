import type { LevelConfig } from '../../types';

// World 5 — Wells · master capstone: a repel well blocks the direct route while an
// attract well near the goal reels you home once you slip past. The gem is tucked
// beside the repeller — the greedy line. Both polarities, precise routing.
export const level27: LevelConfig = {
  ball:      { x: 70, y: 660 },
  goal:      { x: 300, y: 140, radius: 36 },
  obstacles: [
    { x: 120, y: 470, width: 200, height: 16 }, // low wall, gap on the right
  ],
  magnets: [
    { x: 210, y: 360, polarity: 'repel' },   // guards the way up
    { x: 300, y: 250, polarity: 'attract' }, // reels you into the goal
  ],
  collectible: { x: 130, y: 300 }, // beside the repeller — greedy line
  hint:      'Past the push, into the pull',
  parTimeMs: 22000,
};
