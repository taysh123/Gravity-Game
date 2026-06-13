import type { LevelConfig } from '../../types';
// import { PHYSICS } from '../physics.config'; // ← uncomment when using zone strength etc.

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL AUTHORING TEMPLATE  (copy this file to levelN.ts, rename the export, then
// add the import + an array slot in ./index.ts — array ORDER is the level number).
//
// Coordinates are PLAY-AREA coords: 0,0 = top-left of a 360 × 780 box. GameScene
// adds the canvas offset at spawn time — never reference canvas size here.
//
// Difficulty rubric (see docs/superpowers/plans/2026-06-14-expansion-150.md):
//   • goal.radius by role: teach 40–52 · develop 34–40 · twist 30–36 · combine 26–32 · master 22–28
//   • parTimeMs   = a clean EXPERT run (the 3rd star should require a deliberate route)
//   • collectible = ALWAYS genuinely off-route (a detour / a risk past a hazard or repeller)
//   • 1★ must always be achievable with the world's taught skill; gems/par/hazards are the skill ceiling
//
// The structural validator (levels.test.ts) will reject: out-of-bounds anything, a
// ball spawned in a wall/static-hazard, a goal buried in a wall, timeLimit ≤ par.
// It does NOT prove solvability — that needs a human device playtest.
// ─────────────────────────────────────────────────────────────────────────────
export const levelTemplate: LevelConfig = {
  ball: { x: 180, y: 660 },                 // required — usually low-centre
  goal: { x: 180, y: 140, radius: 36 },     // required — radius per role band above

  obstacles: [],                            // static walls: { x, y, width, height, angle? }

  // ── Optional mechanics (omit any you don't use) ──────────────────────────────
  // gravityZones:    [{ x, y, width, height, dir: { x:0, y:-1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH }],
  // magnets:         [{ x, y, polarity: 'attract' /* | 'repel' */ }],
  // portals:         [{ a: { x, y }, b: { x, y } }],
  // gates:           [{ x, y, width, height, dir: { x:0, y:-1 } }],
  // movingPlatforms: [{ x, y, width, height, to: { x, y }, durationMs: 1200 }],
  // hazards:         [{ x, y, radius: 24, to: { x, y }, durationMs: 1200 }],  // touch = fail

  // ── Scoring / pacing ─────────────────────────────────────────────────────────
  collectible: { x: 300, y: 300 },          // optional gem → 2nd star (keep it OFF-route)
  parTimeMs: 14000,                         // 3rd star — an expert time
  // timeLimitMs: 18000,                    // hard countdown (must be > parTimeMs)

  // ── Presentation (optional) ──────────────────────────────────────────────────
  hint: 'One-line tip shown on entry',
  // title: 'THE EYE',                      // memorable name → HUD chip (signature levels)
  // boss: true,                            // capstone identity in the HUD
  // camera: { introZoom: 1.6 },            // cinematic reveal beat (honors reduced-motion)
};
