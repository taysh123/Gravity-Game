import type { LevelConfig } from '../../types';

// World 9 — Gauntlet · develop: two bars sweep in opposite phase, opening
// alternating gaps. Catch the lower window, then the upper, in one flowing rise.
export const level96: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 110, radius: 32 },
  obstacles: [],
  movingPlatforms: [
    { x: 110, y: 480, width: 150, height: 16, to: { x: 250, y: 480 }, durationMs: 1100 }, // lower
    { x: 250, y: 300, width: 150, height: 16, to: { x: 110, y: 300 }, durationMs: 1100 }, // upper (opposite phase)
  ],
  collectible: { x: 180, y: 390 }, // between the bars
  hint:      'Read both bars — one window, then the next',
  parTimeMs: 16000,
};
