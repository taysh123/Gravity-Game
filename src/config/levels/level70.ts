import type { LevelConfig } from '../../types';

// World 3 · L21 — BOSS "THE MACHINE" (mechanic-turned): the gears you learned to
// ride now turn on you — sweeping saw-teeth thread the moving bars, so timing the
// platforms is no longer safe, it's survival. Ride the gears, slip the teeth, reach
// the core. The Clockwork capstone: the helpful mechanic, weaponised.
export const level70: LevelConfig = {
  ball:      { x: 180, y: 710 },
  goal:      { x: 180, y: 90, radius: 24 },
  obstacles: [],
  movingPlatforms: [
    { x: 120, y: 600, width: 150, height: 14, to: { x: 240, y: 600 }, durationMs: 1200 }, // gear you ride/time
    { x: 240, y: 400, width: 150, height: 14, to: { x: 120, y: 400 }, durationMs: 1100 },
    { x: 120, y: 220, width: 150, height: 14, to: { x: 240, y: 220 }, durationMs: 1000 },
  ],
  hazards: [
    { x: 300, y: 500, radius: 20, to: { x: 60,  y: 500 }, durationMs: 1100 }, // saw-tooth threading the gears
    { x: 60,  y: 310, radius: 20, to: { x: 300, y: 310 }, durationMs: 1000 },
    { x: 90,  y: 150, radius: 20, to: { x: 270, y: 150 }, durationMs: 1100 }, // guards the core
  ],
  camera:    { introZoom: 1.9 }, // reveal the whole machine before it turns
  collectible: { x: 300, y: 600 }, // off-route, low
  title:     'THE MACHINE',
  boss:      true,
  hint:      'Ride the gears, slip the teeth — reach the core',
  parTimeMs: 28000,
};
