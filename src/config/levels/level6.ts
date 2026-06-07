import type { LevelConfig } from '../../types';

// World 1 — Foundations · FIRST STAKES (optional risk): a lone spike guards the
// gem off to the right. The straight path up the centre to a generous goal is
// completely clear, so 1★ never touches red — this teaches "red = fail" safely
// (learn → risk → recover → improve), with the gem as the opt-in challenge.
export const level6: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 160, radius: 46 }, // generous — the centre lane is open
  obstacles: [],
  hazards: [
    { x: 300, y: 420, radius: 30 }, // off to the right, away from the ball→goal line
  ],
  collectible: { x: 300, y: 300 }, // the gem sits past the spike — optional risk/reward
  hint:      'Red is dangerous — the gem past it is optional',
  parTimeMs: 12000,
};
