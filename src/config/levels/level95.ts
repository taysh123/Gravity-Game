import type { LevelConfig } from '../../types';

// World 9 — Gauntlet · teach 2: rise through the wall's right gap, but a saw sweeps
// the lane just above it. Time the climb so you slip through behind the blade.
export const level95: LevelConfig = {
  ball:      { x: 80, y: 690 },
  goal:      { x: 280, y: 130, radius: 34 },
  obstacles: [
    { x: 110, y: 440, width: 200, height: 16 }, // x10..210 — gap on the right (210..360)
  ],
  hazards: [
    { x: 280, y: 300, radius: 26, to: { x: 160, y: 300 }, durationMs: 1300 }, // sweeps above the gap
  ],
  collectible: { x: 80, y: 260 },
  hint:      'Up the gap — slip in behind the saw',
  parTimeMs: 14000,
};
