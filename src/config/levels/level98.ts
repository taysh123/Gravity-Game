import type { LevelConfig } from '../../types';

// World 9 — Gauntlet · twist: a descent. The star starts high and home is a
// bottom pocket — drop it through a staggered field of spikes, controlling speed
// so it never drifts onto one. Falling carefully is its own skill.
export const level98: LevelConfig = {
  ball:      { x: 180, y: 120 },
  goal:      { x: 180, y: 690, radius: 30 },
  obstacles: [],
  hazards: [
    { x: 120, y: 360, radius: 24 }, // staggered spikes
    { x: 250, y: 500, radius: 24 },
  ],
  collectible: { x: 60, y: 650 }, // off the descent line
  hint:      'Descend carefully between the spikes',
  parTimeMs: 15000,
};
