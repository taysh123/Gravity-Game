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
import { fragmentEarned, collectionComplete as collectionCompleteEvent } from './analyticsEvents';

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

// Grant a one-time Fragment bonus for each newly-completed collection.
export function claimCollectionRewards(): void {
  const owned = CosmeticStore.ownedIds();
  (Object.keys(COLLECTIONS) as CollectionId[]).forEach((cid) => {
    const key = `collection:${cid}`;
    if (collectionComplete(owned, cid) && !RewardStore.claimedEver(key)) {
      RewardStore.claim(key);
      FragmentStore.add(COLLECTION_REWARD_FR);
      Analytics.track(collectionCompleteEvent(cid));
      Analytics.track(fragmentEarned(COLLECTION_REWARD_FR, 'collection'));
    }
  });
}

// Grant one-time Fragment bonuses as total-stars thresholds are crossed.
export function claimMilestoneRewards(totalStars: number): void {
  for (const m of STAR_MILESTONES) {
    const key = `stars:${m.stars}`;
    if (totalStars >= m.stars && !RewardStore.claimedEver(key)) {
      RewardStore.claim(key);
      FragmentStore.add(m.fr);
      Analytics.track(fragmentEarned(m.fr, 'milestone'));
    }
  }
}
