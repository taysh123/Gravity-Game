import type { LevelConfig } from '../types';
import { PHYSICS } from './physics.config';

const GZ = PHYSICS.GRAVITY_ZONE_STRENGTH;

// Curated Daily Challenge pool — distinct from the campaign so the daily feels
// fresh (the rotating modifier in daily.ts adds further variety). Medium
// difficulty, self-contained, always 1★-fair with an off-route gem.
export const DAILY_LEVELS: LevelConfig[] = [
  // D1 — walls + a hazard route choice
  {
    ball: { x: 70, y: 650 }, goal: { x: 300, y: 140, radius: 34 },
    obstacles: [{ x: 150, y: 420, width: 300, height: 16 }],
    hazards: [{ x: 320, y: 300, radius: 26 }],
    collectible: { x: 320, y: 220 },
    hint: 'Daily — pick your route to the goal', parTimeMs: 15000,
  },
  // D2 — updraft + crosswind
  {
    ball: { x: 70, y: 650 }, goal: { x: 300, y: 150, radius: 34 },
    obstacles: [],
    gravityZones: [
      { x: 70, y: 430, width: 110, height: 340, dir: { x: 0, y: -1 }, strength: GZ },
      { x: 250, y: 260, width: 220, height: 90, dir: { x: 1, y: 0 }, strength: GZ * 0.9 },
    ],
    collectible: { x: 70, y: 190 },
    hint: 'Daily — updraft then crosswind', parTimeMs: 15000,
  },
  // D3 — attract/repel slalom
  {
    ball: { x: 180, y: 660 }, goal: { x: 180, y: 120, radius: 32 },
    obstacles: [],
    magnets: [
      { x: 110, y: 470, polarity: 'repel' },
      { x: 250, y: 320, polarity: 'attract' },
    ],
    collectible: { x: 110, y: 250 },
    hint: 'Daily — weave the wells', parTimeMs: 15000,
  },
  // D4 — portal across a wall
  {
    ball: { x: 180, y: 660 }, goal: { x: 180, y: 130, radius: 34 },
    obstacles: [{ x: 180, y: 400, width: 360, height: 16 }],
    portals: [{ a: { x: 180, y: 510 }, b: { x: 180, y: 280 } }],
    collectible: { x: 300, y: 580 },
    hint: 'Daily — take the rift', parTimeMs: 14000,
  },
  // D5 — moving platform timing + hazard
  {
    ball: { x: 180, y: 660 }, goal: { x: 180, y: 120, radius: 32 },
    obstacles: [],
    movingPlatforms: [{ x: 120, y: 430, width: 150, height: 16, to: { x: 240, y: 430 }, durationMs: 1100 }],
    hazards: [{ x: 300, y: 300, radius: 24 }],
    collectible: { x: 300, y: 200 },
    hint: 'Daily — time the gap', parTimeMs: 16000,
  },
  // D6 — one-way gate + updraft
  {
    ball: { x: 110, y: 660 }, goal: { x: 110, y: 130, radius: 32 },
    obstacles: [],
    gravityZones: [{ x: 110, y: 470, width: 120, height: 300, dir: { x: 0, y: -1 }, strength: GZ }],
    gates: [{ x: 110, y: 320, width: 200, height: 16, dir: { x: 0, y: -1 } }],
    collectible: { x: 280, y: 520 },
    hint: 'Daily — lift through the gate', parTimeMs: 16000,
  },
  // D7 — multi-zone + magnet
  {
    ball: { x: 80, y: 650 }, goal: { x: 300, y: 130, radius: 30 },
    obstacles: [],
    gravityZones: [{ x: 80, y: 440, width: 110, height: 320, dir: { x: 0, y: -1 }, strength: GZ }],
    magnets: [{ x: 280, y: 280, polarity: 'attract' }],
    hazards: [{ x: 200, y: 360, radius: 24 }],
    collectible: { x: 80, y: 180 },
    hint: 'Daily — lift, swing, dodge', parTimeMs: 16000,
  },
  // D8 — portal + magnet + hazard (harder)
  {
    ball: { x: 70, y: 660 }, goal: { x: 300, y: 120, radius: 28 },
    obstacles: [{ x: 180, y: 470, width: 360, height: 16 }],
    portals: [{ a: { x: 90, y: 560 }, b: { x: 300, y: 330 } }],
    magnets: [{ x: 300, y: 210, polarity: 'attract' }],
    hazards: [{ x: 200, y: 230, radius: 22, to: { x: 330, y: 230 }, durationMs: 1100 }],
    collectible: { x: 90, y: 300 },
    hint: 'Daily — rift, dodge, and home', parTimeMs: 18000,
  },
];
