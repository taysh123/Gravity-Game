import type { LevelConfig } from '../../types';

// World 3 — Clockwork · twist: two barriers slide in opposite phase, opening
// alternating gaps. Read the rhythm and thread both.
export const level14: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 34 },
  obstacles: [],
  movingPlatforms: [
    { x: 120, y: 470, width: 150, height: 18, to: { x: 240, y: 470 }, durationMs: 1200 }, // lower
    { x: 270, y: 300, width: 150, height: 18, to: { x: 150, y: 300 }, durationMs: 1200 }, // upper (opposite phase)
  ],
  collectible: { x: 180, y: 390 },
  hint:      'Read the rhythm — thread both gaps',
  parTimeMs: 16000,
};
