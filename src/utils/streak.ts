// Pure win-streak math (consecutive campaign wins). No storage here —
// StreakStore wraps this with localStorage, mirroring daily.ts/DailyStore. A
// streak breaks ONLY on a death (see GameScene.triggerDeath); a manual
// restart or leaving a level is a player choice, not a loss.
import { RETENTION } from '../config/retention.config';

export interface StreakTier {
  label: string; // e.g. '×5 BLAZE' — empty below the first tier
  level: number; // 0 (none) .. 3 (NOVA)
}

// Escalating momentum tier for the win-overlay flourish.
export function streakTier(count: number): StreakTier {
  if (count >= RETENTION.STREAK_NOVA_MIN) {
    return { label: `×${count} ${RETENTION.STREAK_NOVA_LABEL}`, level: 3 };
  }
  if (count >= RETENTION.STREAK_BLAZE_MIN) {
    return { label: `×${count} ${RETENTION.STREAK_BLAZE_LABEL}`, level: 2 };
  }
  if (count >= RETENTION.STREAK_FLOW_MIN) {
    return { label: `×${count} ${RETENTION.STREAK_FLOW_LABEL}`, level: 1 };
  }
  return { label: '', level: 0 };
}

// One-time-per-streak Stardust bonus at exact milestone counts (else 0).
// Mirrors daily.ts's streakReward in spirit, but fires at fixed counts (not a
// modulo repeat) since a win-streak resets on the very next death rather than
// rolling forward like a daily-login streak.
export function streakMilestone(count: number): number {
  const hit = RETENTION.STREAK_MILESTONES.find((m) => m.count === count);
  return hit ? hit.stardust : 0;
}
