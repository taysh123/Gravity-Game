import type { LevelConfig } from '../../types';

// World 1 — Foundations · master: weave the two gaps, then approach the goal past
// a spike set to one side of it (telegraphed, with room to round it). 1★ is
// achievable with a clean approach; the off-route gem + par carry the skill.
export const level29: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 300, y: 140, radius: 34 },
  obstacles: [
    { x: 120, y: 520, width: 220, height: 16 }, // gap on the right
    { x: 240, y: 360, width: 220, height: 16 }, // gap on the left
  ],
  hazards: [
    { x: 230, y: 230, radius: 26 }, // to the side of the goal approach — round it
  ],
  collectible: { x: 60, y: 300 }, // off-route, far left
  hint:      'Weave up, then round the spike to the goal',
  parTimeMs: 17000,
};
