import type { LevelConfig } from '../../types';

// World 5 — Wells · master: a repeller and a spike guard the way up; an attract
// well near the goal reels you home once past them. The gem is tucked by the
// danger — the greediest line in the world. Small goal, tight margins.
export const level40: LevelConfig = {
  ball:      { x: 70, y: 660 },
  goal:      { x: 300, y: 120, radius: 24 },
  obstacles: [
    { x: 120, y: 480, width: 200, height: 16 }, // low wall, gap on the right
  ],
  magnets: [
    { x: 200, y: 360, polarity: 'repel' },   // guards the centre
    { x: 300, y: 230, polarity: 'attract' }, // reels you into the goal
  ],
  hazards: [
    { x: 120, y: 300, radius: 24 }, // spike on the left route
  ],
  collectible: { x: 120, y: 235 }, // tucked by the spike + repeller — greedy
  hint:      'Past the push and the spike, into the pull',
  parTimeMs: 18000,
};
