// Pure early-game "carrot" logic (no Phaser), so it's testable like world.ts.
import { WORLDS } from '../config/worlds';
import { worldOf, isWorldEnd } from './world';
import { LEVELS } from '../config/levels';

// A small onboarding nudge shown on early wins: how many levels remain before
// the next world unlocks (e.g. "8 more to unlock CURRENTS"). Returns null once
// there's no "next" left to tease — a world's last level (that win unlocks the
// next world already) or the campaign's last level/world (nothing left after).
export function nextUnlockHint(level: number): string | null {
  if (level >= LEVELS.length) return null; // campaign end
  if (isWorldEnd(level)) return null; // this win unlocks the next world already
  const world = worldOf(level);
  const nextWorld = WORLDS.find((w) => w.id === world.id + 1);
  if (!nextWorld) return null; // last world — nothing further to unlock
  const remaining = world.to - level;
  return `${remaining} more to unlock ${nextWorld.name}`;
}
