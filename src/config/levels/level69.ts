import type { LevelConfig } from '../../types';

// World 3 · SIGNATURE "THE GEARWORKS": four bars sweep in alternating phase like a
// machine's teeth. Find the rhythm and flow up through the gears. The Clockwork
// poster level.
export const level69: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 110, radius: 28 },
  obstacles: [],
  movingPlatforms: [
    { x: 100, y: 560, width: 130, height: 14, to: { x: 260, y: 560 }, durationMs: 1000 },
    { x: 260, y: 430, width: 130, height: 14, to: { x: 100, y: 430 }, durationMs: 1000 },
    { x: 100, y: 300, width: 130, height: 14, to: { x: 260, y: 300 }, durationMs: 1000 },
    { x: 260, y: 190, width: 130, height: 14, to: { x: 100, y: 190 }, durationMs: 1000 },
  ],
  collectible: { x: 300, y: 495 }, // off to the side in the machine
  title:     'THE GEARWORKS',
  hint:      'Time the machine',
  parTimeMs: 20000,
};
