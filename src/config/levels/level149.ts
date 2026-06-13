import type { LevelConfig } from '../../types';

// World 14 — Singularity · combine: a well slingshots you up, you commit through a
// gate, then slip a saw guarding a pinpoint goal. Three exact beats, no slack.
export const level149: LevelConfig = {
  ball:      { x: 70, y: 690 },
  goal:      { x: 300, y: 110, radius: 22 },
  obstacles: [],
  magnets: [
    { x: 180, y: 430, polarity: 'attract' },
  ],
  gates: [
    { x: 300, y: 280, width: 160, height: 16, dir: { x: 0, y: -1 } },
  ],
  hazards: [
    { x: 300, y: 180, radius: 20, to: { x: 180, y: 180 }, durationMs: 1000 },
  ],
  collectible: { x: 70, y: 300 },
  hint:      'Swing, commit, slip the saw',
  parTimeMs: 19000,
};
