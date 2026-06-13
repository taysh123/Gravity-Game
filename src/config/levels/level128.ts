import type { LevelConfig } from '../../types';

// World 12 — Tempest · twist: two saws sweep in opposite phase, the gap forever
// shifting. There's no single safe moment — keep moving and ride the rhythm up.
export const level128: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 120, radius: 28 },
  obstacles: [],
  hazards: [
    { x: 60, y: 460, radius: 22, to: { x: 300, y: 460 }, durationMs: 1200 },  // lower
    { x: 300, y: 300, radius: 22, to: { x: 60, y: 300 }, durationMs: 1200 },  // upper (opposite phase)
  ],
  collectible: { x: 180, y: 385 }, // between the saws
  hint:      'Two saws, opposite beats — keep moving',
  parTimeMs: 16000,
};
