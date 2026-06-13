import type { LevelConfig } from '../../types';

// World 14 — Singularity · BOSS "THE SINGULARITY": the deepest well in the cosmos,
// an arm whirling close around its core and a saw raking the floor. Ride the pull
// into a tight orbit, break free at the apex, and carry the star to the goal above.
export const level153: LevelConfig = {
  ball:      { x: 180, y: 710 },
  goal:      { x: 180, y: 100, radius: 24 },
  obstacles: [],
  magnets: [
    { x: 180, y: 430, polarity: 'attract' }, // the singularity core
  ],
  hazards: [
    { x: 120, y: 430, radius: 20, pivot: { x: 180, y: 430 }, durationMs: 1800 }, // arm whirling the core
    { x: 60, y: 600, radius: 22, to: { x: 300, y: 600 }, durationMs: 1100 },     // floor saw
  ],
  collectible: { x: 300, y: 560 }, // off-route, low-right
  boss:      true,
  title:     'THE SINGULARITY',
  hint:      'Ride the pull, break at the apex — bring the star home',
  camera:    { introZoom: 1.7 },
  parTimeMs: 22000,
};
