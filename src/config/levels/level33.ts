import type { LevelConfig } from '../../types';

// World 3 · AHA (patience): a wide barrier slides across the only gap, briefly
// opening it. Chasing it fails; the trick is to hold steady below and dart up the
// instant it clears. Timing through stillness, not motion.
export const level33: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 28 },
  obstacles: [
    { x: 60, y: 400, width: 120, height: 16 },  // left wall (x 0..120)
    { x: 300, y: 400, width: 120, height: 16 },  // right wall (x 240..360) — centre gap covered by the slider
  ],
  movingPlatforms: [
    { x: 180, y: 400, width: 130, height: 16, to: { x: 70, y: 400 }, durationMs: 1400 }, // slides aside to open the centre
  ],
  collectible: { x: 300, y: 300 }, // above the right, off-route
  hint:      'Patience — wait for the opening',
  parTimeMs: 17000,
};
