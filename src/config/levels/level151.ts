import type { LevelConfig } from '../../types';

// World 14 — Singularity · combine 3: rift across the wall into a well that reels
// you up, then slip a saw to the pinpoint goal. Every tool, every margin tight.
export const level151: LevelConfig = {
  ball:      { x: 80, y: 690 },
  goal:      { x: 300, y: 120, radius: 22 },
  obstacles: [
    { x: 180, y: 470, width: 360, height: 16 }, // sealed wall
  ],
  portals: [
    { a: { x: 90, y: 560 }, b: { x: 300, y: 340 } },
  ],
  magnets: [
    { x: 300, y: 210, polarity: 'attract' },
  ],
  hazards: [
    { x: 180, y: 240, radius: 20, to: { x: 320, y: 240 }, durationMs: 1000 },
  ],
  collectible: { x: 90, y: 320 },
  hint:      'Rift, well, slip the saw',
  parTimeMs: 19000,
};
