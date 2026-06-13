import type { LevelConfig } from '../../types';

// World 13 — Ascension · stage 2: a well slingshots you up the left, then you must
// commit up through a gate and slip a saw guarding the goal. Three beats, one climb.
export const level135: LevelConfig = {
  ball:      { x: 70, y: 690 },
  goal:      { x: 300, y: 130, radius: 30 },
  obstacles: [],
  magnets: [
    { x: 180, y: 430, polarity: 'attract' }, // swing up
  ],
  gates: [
    { x: 300, y: 300, width: 160, height: 16, dir: { x: 0, y: -1 } }, // commit (x220..360)
  ],
  hazards: [
    { x: 300, y: 200, radius: 22, to: { x: 180, y: 200 }, durationMs: 1100 },
  ],
  collectible: { x: 70, y: 300 },
  hint:      'Swing, commit, slip the saw',
  parTimeMs: 18000,
};
