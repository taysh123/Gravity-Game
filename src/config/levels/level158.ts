import type { LevelConfig } from '../../types';

// World 15 — Homecoming · twist: a grand descent — the star drifting gently down
// past a sweeping guard into a low, waiting home. Bring it down softly.
export const level158: LevelConfig = {
  ball:      { x: 180, y: 110 },
  goal:      { x: 180, y: 690, radius: 30 },
  obstacles: [
    { x: 180, y: 360, width: 240, height: 16 }, // shelf (x60..300), gaps on the sides
  ],
  hazards: [
    { x: 120, y: 540, radius: 22, to: { x: 300, y: 540 }, durationMs: 1300 },
  ],
  collectible: { x: 300, y: 250 },
  hint:      'Bring it gently down',
  parTimeMs: 16000,
};
