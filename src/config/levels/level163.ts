import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 15 — Homecoming · FINALE BOSS "THE LONG WAY HOME": the last journey. Lift
// off, breach the wall by rift, commit up through the final gate, slip the last saw —
// and the well cradles the lost star home at last. Every mechanic the cosmos taught,
// one flowing run, against the clock. Bring the star home.
export const level163: LevelConfig = {
  ball:      { x: 180, y: 710 },
  goal:      { x: 180, y: 90, radius: 28 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 16 }, // sealed wall — the rift is the only way
  ],
  gravityZones: [
    { x: 180, y: 610, width: 140, height: 150, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH }, // lift off
  ],
  portals: [
    { a: { x: 180, y: 520 }, b: { x: 300, y: 330 } }, // breach across the wall
  ],
  gates: [
    { x: 300, y: 270, width: 160, height: 16, dir: { x: 0, y: -1 } }, // the last commit (x220..360)
  ],
  magnets: [
    { x: 180, y: 150, polarity: 'attract' }, // the well that cradles the star home
  ],
  hazards: [
    { x: 300, y: 200, radius: 22, to: { x: 120, y: 200 }, durationMs: 1100 }, // one last saw
  ],
  collectible: { x: 300, y: 520 }, // off-route, beside the breach
  boss:      true,
  title:     'THE LONG WAY HOME',
  hint:      'Lift, breach, commit, slip the saw — bring the star home',
  camera:    { introZoom: 1.7 },
  parTimeMs: 16000,
  timeLimitMs: 24000,
};
