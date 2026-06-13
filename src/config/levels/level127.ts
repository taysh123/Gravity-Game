import type { LevelConfig } from '../../types';

// World 12 — Tempest · develop 2: a pulsing laser beam bars the way. It telegraphs
// before each burst — wait for the rail to go dim, then cross in the gap.
export const level127: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 120, radius: 30 },
  obstacles: [],
  hazards: [
    { x: 180, y: 400, width: 360, height: 14, pulseMs: 1600 }, // horizontal beam, on/off cycle
  ],
  collectible: { x: 300, y: 540 },
  hint:      'Cross when the beam goes dark',
  parTimeMs: 14000,
};
