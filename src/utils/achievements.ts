// Pure achievement definitions + evaluation (no storage/Phaser) so it's testable.
// A snapshot of aggregate player stats is assembled by StatsStore.collectSnapshot()
// and passed to evaluate().

export interface StatsSnapshot {
  levelsCompleted: number; // distinct levels with >= 1 star
  totalLevels: number;
  totalStars: number;
  perfectLevels: number; // levels at 3 stars
  gemsOwned: number; // distinct levels whose gem was collected
  worldsMastered: number; // worlds with every level at 3 stars
  portalJumps: number; // lifetime
  deaths: number; // lifetime
  bestDailyStreak: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  predicate: (s: StatsSnapshot) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_win', name: 'First Flow', desc: 'Complete your first level', predicate: (s) => s.levelsCompleted >= 1 },
  { id: 'ten_done', name: 'Finding Your Footing', desc: 'Complete 10 levels', predicate: (s) => s.levelsCompleted >= 10 },
  { id: 'half_done', name: 'Halfway There', desc: 'Complete half the levels', predicate: (s) => s.totalLevels > 0 && s.levelsCompleted >= Math.ceil(s.totalLevels / 2) },
  { id: 'all_done', name: 'The Long Haul', desc: 'Complete every level', predicate: (s) => s.totalLevels > 0 && s.levelsCompleted >= s.totalLevels },
  { id: 'stars_30', name: 'Rising Star', desc: 'Earn 30 stars', predicate: (s) => s.totalStars >= 30 },
  { id: 'stars_90', name: 'Star Collector', desc: 'Earn 90 stars', predicate: (s) => s.totalStars >= 90 },
  { id: 'stars_all', name: 'Perfectionist', desc: 'Earn every star', predicate: (s) => s.totalLevels > 0 && s.totalStars >= s.totalLevels * 3 },
  { id: 'perfect_10', name: 'Flawless', desc: 'Get 3 stars on 10 levels', predicate: (s) => s.perfectLevels >= 10 },
  { id: 'gems_25', name: 'Gem Hunter', desc: 'Collect 25 gems', predicate: (s) => s.gemsOwned >= 25 },
  { id: 'master_world', name: 'World Master', desc: '3-star every level in a world', predicate: (s) => s.worldsMastered >= 1 },
  { id: 'portal_50', name: 'Rift Walker', desc: 'Travel through 50 rifts', predicate: (s) => s.portalJumps >= 50 },
  { id: 'deaths_25', name: 'Persistence', desc: 'Wipe out 25 times — it happens', predicate: (s) => s.deaths >= 25 },
  { id: 'streak_3', name: 'Daily Devotee', desc: 'Reach a 3-day daily streak', predicate: (s) => s.bestDailyStreak >= 3 },
  { id: 'streak_7', name: 'Weeklong', desc: 'Reach a 7-day daily streak', predicate: (s) => s.bestDailyStreak >= 7 },
];

// Ids of every achievement whose predicate is satisfied by the snapshot.
export function evaluate(s: StatsSnapshot): string[] {
  return ACHIEVEMENTS.filter((a) => a.predicate(s)).map((a) => a.id);
}
