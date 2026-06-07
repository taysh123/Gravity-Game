import type { LevelConfig } from '../../types';

// Onboarding level: ball and goal sit within a single attractor reach (~165px), and
// the goal is generous, so the very first hold near the ball pulls it straight in.
// The gem sits ON the pull line and par is generous, so a normal first clear earns
// all 3 stars — a rewarding, confidence-building start. (Mastery ramps later.)
export const level1: LevelConfig = {
  ball:      { x: 180, y: 470 },
  goal:      { x: 180, y: 305, radius: 56 },
  obstacles: [],
  collectible: { x: 180, y: 390 }, // on the ball→goal line — grabbed just by playing
  hint:      'Hold near the ball to pull it toward you',
  parTimeMs: 15000, // generous — a normal pull-in is well under, so 3★ is the default
};
