import type { LevelConfig } from '../../types';

// World 12 — Tempest · teach (nerve): a saw sweeps the only lane up. No clock yet —
// just read its rhythm and send the star through on the back-swing.
export const level124: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 130, radius: 32 },
  obstacles: [],
  hazards: [
    { x: 90, y: 400, radius: 26, to: { x: 270, y: 400 }, durationMs: 1200 },
  ],
  collectible: { x: 300, y: 300 },
  hint:      'Time the sweeping saw',
  parTimeMs: 13000,
};
