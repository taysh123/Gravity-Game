import type { LevelConfig } from '../../types';

// World 5 — Wells · TOY opener "Swingby": the playful first taste of a well.
// The well sits off to the left, so the first rise gets caught and swung around
// its rim in a graceful slingshot arc up to the goal — wonder, not a test. No
// hazards, big goal, unloseable; the curve is the reward. Gem on the far side of
// the swing rewards committing to the arc. Aha: "the well throws me."
export const level23: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 250, y: 140, radius: 44 },
  obstacles: [],
  magnets: [
    { x: 110, y: 420, polarity: 'attract' },
  ],
  collectible: { x: 80, y: 300 }, // far side of the swing — ride the arc to earn it
  hint:      'Let the well catch you and swing you around — ride the curve home',
  parTimeMs: 11000,
};
