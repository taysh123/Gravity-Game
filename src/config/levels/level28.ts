import type { LevelConfig } from '../../types';

// World 1 — Foundations · route choice: a central wall leaves a gap on each side.
// The left gap is the safe, longer way; the right gap is quicker but a spike
// guards it (and the gem). 1★ via the safe side — the risk is opt-in.
export const level28: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 150, radius: 40 },
  obstacles: [
    { x: 180, y: 400, width: 200, height: 16 }, // spans x80..280; gaps: left 0..80, right 280..360
  ],
  hazards: [
    { x: 315, y: 400, radius: 24 }, // beside the right (quicker) gap
  ],
  collectible: { x: 315, y: 250 }, // up the risky right side
  hint:      'Two ways up — the right is quicker but guarded',
  parTimeMs: 14000,
};
