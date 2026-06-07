import type { LevelConfig } from '../../types';

// World 3 · rhythm: two bars sweep in opposite phase, opening alternating gaps.
// Read the beat and thread both in one flowing rise.
export const level16: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 32 },
  obstacles: [],
  movingPlatforms: [
    { x: 120, y: 470, width: 150, height: 16, to: { x: 240, y: 470 }, durationMs: 1100 }, // lower
    { x: 240, y: 300, width: 150, height: 16, to: { x: 120, y: 300 }, durationMs: 1100 }, // upper (opposite phase)
  ],
  collectible: { x: 180, y: 385 }, // between the bars
  hint:      'Read the rhythm — thread both gaps',
  parTimeMs: 16000,
};
