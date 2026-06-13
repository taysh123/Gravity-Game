import { describe, it, expect } from 'vitest';
import { LEVELS } from './index';
import { WORLDS } from '../worlds';
import { PHYSICS } from '../physics.config';
import type { LevelConfig, ObstacleConfig, HazardConfig, Vec2 } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Structural level validator (M0 of the 150-level expansion).
//
// This is NOT a solver — gravity puzzles need finger input to prove solvable, so
// fairness still requires a human device playtest. What this DOES catch are the
// authoring traps that make a level *structurally* broken or impossible:
//   • ball / goal / pickups out of the play area
//   • the ball spawned inside a wall or a static hazard (instant stuck/death)
//   • the goal buried inside a wall (uncapturable)
//   • nonsensical timing (timeLimit ≤ par)
//   • world ranges that don't line up with LEVELS[] (breaks level-select / unlock)
//
// It mirrors the coordinate handling of GameScene.createFromConfig: configs are in
// play-area coords (0,0 = top-left of PLAY_WIDTH×PLAY_HEIGHT).
// ─────────────────────────────────────────────────────────────────────────────

const W = PHYSICS.PLAY_WIDTH;
const H = PHYSICS.PLAY_HEIGHT;
const R = PHYSICS.BALL_RADIUS;

// Goal capture radius sanity band (teach 40–52 … master ~22). Outside [16,60] is
// almost certainly a typo.
const GOAL_R_MIN = 16;
const GOAL_R_MAX = 60;

function inBounds(p: Vec2 | { x: number; y: number }, label: string, errs: string[]): void {
  if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
    errs.push(`${label} (${p.x},${p.y}) is outside the play area (0..${W} × 0..${H})`);
  }
}

// Axis-aligned point-in-rect test, optionally inflated by a margin. Rotated rects
// (angle set) are skipped to avoid false positives — they're rare and the AABB
// approximation would over-report.
function pointInRect(
  px: number,
  py: number,
  rect: { x: number; y: number; width: number; height: number; angle?: number },
  margin = 0,
): boolean {
  if (rect.angle) return false;
  const hw = rect.width / 2 + margin;
  const hh = rect.height / 2 + margin;
  return Math.abs(px - rect.x) <= hw && Math.abs(py - rect.y) <= hh;
}

function isStaticHazard(h: HazardConfig): boolean {
  return !h.to && !h.pivot; // moving/orbiting hazards may sweep away from spawn
}

function ballHitsHazardAtSpawn(b: Vec2, h: HazardConfig): boolean {
  if (h.radius) {
    const d = Math.hypot(b.x - h.x, b.y - h.y);
    return d < h.radius + R;
  }
  if (h.width && h.height) {
    return pointInRect(b.x, b.y, { x: h.x, y: h.y, width: h.width, height: h.height }, R);
  }
  return false;
}

function validateLevel(level: LevelConfig, n: number): string[] {
  const errs: string[] = [];
  const b = level.ball;
  const g = level.goal;

  // Core placement.
  inBounds(b, 'ball', errs);
  inBounds(g, 'goal', errs);
  if (g.radius < GOAL_R_MIN || g.radius > GOAL_R_MAX) {
    errs.push(`goal.radius ${g.radius} outside sane band [${GOAL_R_MIN},${GOAL_R_MAX}]`);
  }

  // Obstacles: positive dims, in-bounds center; ball not embedded; goal not buried.
  (level.obstacles ?? []).forEach((o: ObstacleConfig, i) => {
    if (o.width <= 0 || o.height <= 0) errs.push(`obstacle[${i}] has non-positive size`);
    inBounds(o, `obstacle[${i}]`, errs);
    if (pointInRect(b.x, b.y, o, R)) errs.push(`ball spawns inside obstacle[${i}] (stuck)`);
    if (pointInRect(g.x, g.y, o)) errs.push(`goal is buried inside obstacle[${i}] (uncapturable)`);
  });

  // Static hazards: a ball spawning on one is an instant, unavoidable death.
  (level.hazards ?? []).forEach((h: HazardConfig, i) => {
    inBounds(h, `hazard[${i}]`, errs);
    if (isStaticHazard(h) && ballHitsHazardAtSpawn(b, h)) {
      errs.push(`ball spawns on static hazard[${i}] (instant death)`);
    }
  });

  // Pickups + mechanic anchors in-bounds.
  if (level.collectible) inBounds(level.collectible, 'collectible', errs);
  (level.collectibles ?? []).forEach((c, i) => inBounds(c, `collectibles[${i}]`, errs));
  (level.magnets ?? []).forEach((m, i) => inBounds(m, `magnet[${i}]`, errs));
  (level.gravityZones ?? []).forEach((z, i) => inBounds(z, `gravityZone[${i}]`, errs));
  (level.gates ?? []).forEach((gt, i) => inBounds(gt, `gate[${i}]`, errs));
  (level.portals ?? []).forEach((p, i) => {
    inBounds(p.a, `portal[${i}].a`, errs);
    inBounds(p.b, `portal[${i}].b`, errs);
  });
  (level.movingPlatforms ?? []).forEach((p, i) => {
    inBounds(p, `movingPlatform[${i}].start`, errs);
    inBounds(p.to, `movingPlatform[${i}].to`, errs);
  });

  // Timing sanity.
  if (level.parTimeMs !== undefined && level.parTimeMs <= 0) {
    errs.push(`parTimeMs ${level.parTimeMs} must be > 0`);
  }
  if (level.timeLimitMs !== undefined) {
    if (level.timeLimitMs <= 0) errs.push(`timeLimitMs ${level.timeLimitMs} must be > 0`);
    if (level.parTimeMs !== undefined && level.timeLimitMs <= level.parTimeMs) {
      errs.push(`timeLimitMs ${level.timeLimitMs} ≤ parTimeMs ${level.parTimeMs} (unwinnable under par)`);
    }
  }

  return errs.map((e) => `L${n}: ${e}`);
}

describe('level configs are structurally valid', () => {
  it('has no broken levels', () => {
    const all: string[] = [];
    LEVELS.forEach((lvl, idx) => all.push(...validateLevel(lvl, idx + 1)));
    if (all.length) throw new Error(`\n${all.join('\n')}\n`);
    expect(all).toEqual([]);
  });

  it('every level has a goal and at least the ball + goal defined', () => {
    LEVELS.forEach((lvl, idx) => {
      expect(lvl.ball, `L${idx + 1} ball`).toBeDefined();
      expect(lvl.goal, `L${idx + 1} goal`).toBeDefined();
    });
  });
});

describe('world ranges line up with LEVELS[]', () => {
  it('starts at level 1 and is contiguous with no gaps', () => {
    expect(WORLDS[0].from).toBe(1);
    for (let i = 1; i < WORLDS.length; i++) {
      expect(WORLDS[i].from, `world ${WORLDS[i].id} should start right after the previous`).toBe(
        WORLDS[i - 1].to + 1,
      );
    }
  });

  it('the last world ends exactly at LEVELS.length (no orphan or phantom levels)', () => {
    expect(WORLDS[WORLDS.length - 1].to).toBe(LEVELS.length);
  });

  it('every world covers at least one level and from ≤ to', () => {
    for (const w of WORLDS) {
      expect(w.to, `world ${w.id} (${w.name}) from ≤ to`).toBeGreaterThanOrEqual(w.from);
    }
  });
});
