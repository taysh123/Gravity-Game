import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 8 — Convergence · BOSS "HOMECOMING": the final journey. Lift off, breach the
// wall by rift, commit up through the last gate, slip the saw — and the well cradles
// the lost star home. Every mechanic the cosmos taught, one flowing run, against the
// clock. Bring the star home.
export const level90: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 90, radius: 30 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 16 }, // sealed wall — the rift is the only way through
  ],
  gravityZones: [
    { x: 180, y: 590, width: 140, height: 170, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH }, // lift off
  ],
  portals: [
    { a: { x: 180, y: 490 }, b: { x: 300, y: 360 } }, // breach across the wall
  ],
  gates: [
    { x: 300, y: 300, width: 160, height: 16, dir: { x: 0, y: -1 } }, // the last commit (x 220..360)
  ],
  magnets: [
    { x: 180, y: 150, polarity: 'attract' }, // the well that cradles the star home
  ],
  hazards: [
    { x: 300, y: 210, radius: 22, to: { x: 120, y: 210 }, durationMs: 1100 }, // one last saw
  ],
  collectible: { x: 300, y: 490 }, // off-route, beside the lower mouth
  boss:      true,
  title:     'HOMECOMING',
  hint:      'Lift, breach, commit, slip the saw — bring the star home',
  parTimeMs: 15000,
  timeLimitMs: 19000,
};
