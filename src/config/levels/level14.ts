import type { LevelConfig } from '../../types';

// World 3 — Clockwork · twist (platforms + risk): two bars slide in opposite
// phase. Thread them up the centre to the goal (1★); a spike off to the right
// guards the gem for an opt-in detour.
export const level14: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 34 },
  obstacles: [],
  movingPlatforms: [
    { x: 120, y: 470, width: 150, height: 18, to: { x: 240, y: 470 }, durationMs: 1200 }, // lower
    { x: 270, y: 300, width: 150, height: 18, to: { x: 150, y: 300 }, durationMs: 1200 }, // upper (opposite phase)
  ],
  hazards: [
    { x: 310, y: 385, radius: 24 }, // off to the right, guarding the gem
  ],
  collectible: { x: 310, y: 250 }, // up the right side, past the spike
  hint:      'Thread the bars — a spike guards the gem',
  parTimeMs: 16000,
};
