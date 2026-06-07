import type { LevelConfig } from '../../types';

// World 3 · BOSS "THE MACHINE": four sections of synced bars, accelerating toward
// the top, with a saw guarding the core. Time every gear in turn. The Clockwork
// capstone.
export const level70: LevelConfig = {
  ball:      { x: 180, y: 710 },
  goal:      { x: 180, y: 90, radius: 24 },
  obstacles: [],
  movingPlatforms: [
    { x: 120, y: 600, width: 150, height: 14, to: { x: 240, y: 600 }, durationMs: 1200 }, // §1
    { x: 240, y: 470, width: 150, height: 14, to: { x: 120, y: 470 }, durationMs: 1000 }, // §2
    { x: 120, y: 340, width: 150, height: 14, to: { x: 240, y: 340 }, durationMs: 850 },  // §3 fast
    { x: 240, y: 220, width: 150, height: 14, to: { x: 120, y: 220 }, durationMs: 850 },  // §3 fast (opposite)
  ],
  hazards: [
    { x: 90, y: 160, radius: 22, to: { x: 270, y: 160 }, durationMs: 1100 }, // saw at the core
  ],
  collectible: { x: 300, y: 600 }, // off-route, low
  title:     'THE MACHINE',
  boss:      true,
  hint:      'Time every gear to the core',
  parTimeMs: 28000,
};
