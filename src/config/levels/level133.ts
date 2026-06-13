import type { LevelConfig } from '../../types';

// World 12 — Tempest · BOSS "THE EYE OF THE STORM": a central wall splits the arena;
// a rotating arm guards the eye, a saw sweeps the floor, and a beam pulses near the
// goal — all under a hard clock. Find the still centre and bring the star home.
export const level133: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 100, radius: 28 },
  obstacles: [
    { x: 180, y: 430, width: 200, height: 16 }, // central wall — climb the side lanes
  ],
  hazards: [
    { x: 180, y: 240, radius: 22, pivot: { x: 180, y: 300 }, durationMs: 2200 }, // rotating arm (the eye)
    { x: 60, y: 590, radius: 22, to: { x: 300, y: 590 }, durationMs: 1100 },     // floor saw
    { x: 180, y: 160, width: 360, height: 12, pulseMs: 1300, phaseMs: 650 },     // beam near the goal
  ],
  collectible: { x: 300, y: 560 }, // off-route, low-right
  boss:      true,
  title:     'THE EYE OF THE STORM',
  hint:      'Find the still centre — beat the clock home',
  camera:    { introZoom: 1.6 },
  parTimeMs: 18000,
  timeLimitMs: 24000,
};
