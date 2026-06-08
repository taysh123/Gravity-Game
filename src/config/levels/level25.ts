import type { LevelConfig } from '../../types';

// World 5 — Wells · twist: a repel well guards the centre, shoving the ball away.
// Route around it. The gem sits just above the repeller — brushing close to grab
// it is the risky line.
export const level25: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 130, radius: 34 },
  obstacles: [],
  magnets: [
    { x: 180, y: 410, polarity: 'repel' },
  ],
  hazards: [
    { x: 300, y: 410, radius: 22 }, // the right side is deadly — the push must route you LEFT
  ],
  collectible: { x: 180, y: 250 }, // above the repeller — push fights you on the way
  hint:      'Violet wells push — commit left, the right side bites',
  parTimeMs: 13000,
};
