import type { LevelConfig } from '../../types';

// World 11 — Labyrinth · BOSS "THE WARDEN": the maze's keeper. Commit up through
// the gate, rift across the sealed wall, slip the saw guarding the goal, and let
// the well cradle the star home. A locked, one-way puzzle — solve it in order.
export const level123: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 100, radius: 28 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 16 }, // sealed wall — rift required
  ],
  gates: [
    { x: 180, y: 600, width: 360, height: 16, dir: { x: 0, y: -1 } }, // commit up first
  ],
  portals: [
    { a: { x: 180, y: 520 }, b: { x: 300, y: 300 } }, // across the wall
  ],
  magnets: [
    { x: 180, y: 160, polarity: 'attract' }, // reels the star home
  ],
  hazards: [
    { x: 90, y: 200, radius: 22, to: { x: 300, y: 200 }, durationMs: 1100 }, // saw guarding the goal
  ],
  collectible: { x: 300, y: 520 }, // off-route, beside the portal mouth
  boss:      true,
  title:     'THE WARDEN',
  hint:      'Commit, rift, slip the saw — the well brings you home',
  camera:    { introZoom: 1.6 },
  parTimeMs: 22000,
};
