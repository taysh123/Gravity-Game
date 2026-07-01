// Retention rewards — achievements, collection completion, and total-stars
// milestones grant currency (and make those systems meaningful). All cosmetic
// economy; never affects gameplay. Idempotent: one-time rewards are gated by
// RewardStore so they grant exactly once.
import { CurrencyStore } from './CurrencyStore';
import { FragmentStore } from './FragmentStore';
import { CosmeticStore } from './CosmeticStore';
import { RewardStore } from './RewardStore';
import { collectionComplete } from './cosmeticsLogic';
import { COLLECTIONS, type CollectionId } from '../config/cosmetics.config';
import { Analytics } from './Analytics';
import { fragmentEarned, collectionComplete as collectionCompleteEvent, loginBonus } from './analyticsEvents';
import { streakMilestone } from './streak';
import { loginBonusFor } from './loginBonus';

// Per-achievement reward (Stardust + Fragments). Bigger milestones grant more.
const ACH_REWARD: Record<string, { sd: number; fr: number }> = {
  first_win: { sd: 10, fr: 1 },
  ten_done: { sd: 20, fr: 2 },
  half_done: { sd: 40, fr: 4 },
  all_done: { sd: 100, fr: 12 },
  stars_30: { sd: 30, fr: 3 },
  stars_90: { sd: 60, fr: 6 },
  stars_all: { sd: 150, fr: 20 },
  perfect_10: { sd: 40, fr: 4 },
  gems_25: { sd: 40, fr: 4 },
  master_world: { sd: 50, fr: 5 },
  portal_50: { sd: 25, fr: 2 },
  deaths_25: { sd: 15, fr: 1 },
  streak_3: { sd: 25, fr: 2 },
  streak_7: { sd: 50, fr: 5 },
};
const DEFAULT_ACH = { sd: 15, fr: 2 };

const COLLECTION_REWARD_FR = 20;
const STAR_MILESTONES: { stars: number; fr: number }[] = [
  { stars: 30, fr: 10 }, { stars: 60, fr: 15 }, { stars: 100, fr: 25 }, { stars: 150, fr: 40 },
];

export function grantAchievementRewards(ids: string[]): void {
  for (const id of ids) {
    const r = ACH_REWARD[id] ?? DEFAULT_ACH;
    if (r.sd) CurrencyStore.add(r.sd);
    if (r.fr) { FragmentStore.add(r.fr); Analytics.track(fragmentEarned(r.fr, 'achievement')); }
  }
}

// Grant a one-time Fragment bonus for each newly-completed collection. Same
// RewardStore.claimedEver gate + FragmentStore grant as before; now also
// returns the ids of collections that completed for the FIRST TIME this call
// (empty if none did) so the caller (GameScene.triggerWin) can celebrate it.
export function claimCollectionRewards(): CollectionId[] {
  const owned = CosmeticStore.ownedIds();
  const newlyCompleted: CollectionId[] = [];
  (Object.keys(COLLECTIONS) as CollectionId[]).forEach((cid) => {
    const key = `collection:${cid}`;
    if (collectionComplete(owned, cid) && !RewardStore.claimedEver(key)) {
      RewardStore.claim(key);
      FragmentStore.add(COLLECTION_REWARD_FR);
      Analytics.track(collectionCompleteEvent(cid));
      Analytics.track(fragmentEarned(COLLECTION_REWARD_FR, 'collection'));
      newlyCompleted.push(cid);
    }
  });
  return newlyCompleted;
}

// Grant one-time Fragment bonuses as total-stars thresholds are crossed. Same
// RewardStore.claimedEver gate + FragmentStore grant as before; now also
// returns the milestone crossed so the caller can celebrate it. If several
// thresholds cross in the same call, every one is still claimed + granted
// (no reward is ever silently dropped) — but since STAR_MILESTONES is
// ascending, only the HIGHEST is returned (the win overlay shows at most one
// milestone toast per win, and the highest is the most meaningful one).
export function claimMilestoneRewards(totalStars: number): { stars: number; fr: number } | null {
  let crossed: { stars: number; fr: number } | null = null;
  for (const m of STAR_MILESTONES) {
    const key = `stars:${m.stars}`;
    if (totalStars >= m.stars && !RewardStore.claimedEver(key)) {
      RewardStore.claim(key);
      FragmentStore.add(m.fr);
      Analytics.track(fragmentEarned(m.fr, 'milestone'));
      crossed = { stars: m.stars, fr: m.fr };
    }
  }
  return crossed;
}

// Grant the win-streak milestone Stardust bonus (else a no-op, returns 0).
//
// Deliberately WITHOUT a RewardStore.claimedEver guard — unlike every other
// reward in this file. Why that's still correct (not a P2W/duplication bug):
// the caller, GameScene.triggerWin, calls `StreakStore.win()` to get `count`
// exactly once per genuine win (triggerWin is guarded by `this.isWon` and only
// ever runs on a real goal-reach, never on `scene.restart()`), so `count`
// itself already carries a once-per-win guarantee — there is no replay path
// that can hand this function the same milestone count twice for one win.
// It is INTENTIONALLY repeatable ACROSS separate streaks (a momentum reward
// for current skill, not a one-time lifetime unlock): reaching a 5-win streak
// again next week must pay out again, or the "one more" loop this exists to
// support would die after its first payout. A `claimedEver` guard here would
// silently turn every streak milestone into a single lifetime grant — wrong.
export function grantStreakReward(count: number): number {
  const bonus = streakMilestone(count);
  if (bonus > 0) CurrencyStore.add(bonus);
  return bonus;
}

// Grant the daily login bonus for the Nth consecutive login day (Stardust +
// Fragments only — never a purchase; see Global Constraints, no P2W).
//
// Deliberately WITHOUT its own RewardStore guard, like grantAchievementRewards
// above: idempotency (once per calendar day) is the CALLER's responsibility.
// The sole caller, DailyStore.claimLoginBonus, gates via
// RewardStore.claimedToday('login:'+dateKey) BEFORE it ever calls this, so
// this function must never be called more than once for the same day's claim.
export function grantLoginBonus(loginDay: number): { sd: number; fr: number } {
  const reward = loginBonusFor(loginDay);
  if (reward.sd) CurrencyStore.add(reward.sd);
  if (reward.fr) FragmentStore.add(reward.fr);
  Analytics.track(loginBonus(loginDay));
  return reward;
}
