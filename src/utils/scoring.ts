// Pure star scoring. Three independent achievements per level:
//   ★ complete · ★ collect the gem · ★ finish at/under par time.
// Gem and efficiency only count if the level was completed.

export interface StarInput {
  completed: boolean;
  gem: boolean;
  timeMs: number;
  parMs?: number;
}

export interface StarResult {
  stars: number; // 0..3
  completed: boolean;
  gem: boolean;
  underPar: boolean;
}

export function computeStars({ completed, gem, timeMs, parMs }: StarInput): StarResult {
  const gemStar = completed && gem;
  const underPar = completed && parMs !== undefined && parMs > 0 && timeMs <= parMs;
  const stars = (completed ? 1 : 0) + (gemStar ? 1 : 0) + (underPar ? 1 : 0);
  return { stars, completed, gem: gemStar, underPar };
}
