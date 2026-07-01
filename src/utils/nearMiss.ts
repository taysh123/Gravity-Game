// Pure near-miss classification — turns "almost" into an encouragement rather
// than frustration. A death right next to the goal, or a win that just missed
// par, becomes a retry pull. (No 'just-gem' case: whether a missed gem was a
// "near miss" isn't cleanly definable from a single collected/not flag, so it
// is intentionally not modeled here.)
import { RETENTION } from '../config/retention.config';

export interface NearMissContext {
  outcome: 'death' | 'win';
  distToGoal?: number; // death: ball-to-goal distance at the moment of death
  timeMs?: number;      // win: this run's finish time
  parMs?: number;       // win: the level's par time
  underPar?: boolean;   // win: whether the run already earned the efficiency star
}

export type NearMissKind = 'near-goal' | 'just-par' | null;

export function nearMiss(ctx: NearMissContext): NearMissKind {
  if (ctx.outcome === 'death') {
    if (ctx.distToGoal !== undefined && ctx.distToGoal <= RETENTION.NEAR_GOAL_PX) return 'near-goal';
    return null;
  }
  // win: only a near-miss if the efficiency star was NOT already earned, and
  // the overshoot past par is small (and positive — exactly at/under par is
  // not a miss at all).
  if (!ctx.underPar && ctx.timeMs !== undefined && ctx.parMs !== undefined) {
    const over = ctx.timeMs - ctx.parMs;
    if (over > 0 && over <= RETENTION.JUST_PAR_MS) return 'just-par';
  }
  return null;
}
