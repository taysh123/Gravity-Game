import type { LevelConfig } from '../../types';

// World 14 — Singularity · SIGNATURE "THE EVENT HORIZON": a powerful well sits at
// the centre with an arm orbiting it. Skirt the edge of its pull — close enough to
// curve your path, never so close it swallows you — and slip up to the goal.
export const level152: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 110, radius: 22 },
  obstacles: [],
  magnets: [
    { x: 180, y: 400, polarity: 'attract' }, // the horizon
  ],
  hazards: [
    { x: 180, y: 250, radius: 20, pivot: { x: 180, y: 400 }, durationMs: 2000 }, // orbiting arm
  ],
  collectible: { x: 300, y: 300 }, // out in the dangerous orbit
  title:     'THE EVENT HORIZON',
  hint:      "Skirt the horizon — don't fall in",
  camera:    { introZoom: 1.6 },
  parTimeMs: 20000,
};
