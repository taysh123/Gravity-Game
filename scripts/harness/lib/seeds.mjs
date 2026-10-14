// localStorage seeds a check can start from (written before the app boots, only where a key is absent).
// Shapes are the real ones the stores read (ProgressStore: { [level]: { stars, bestTimeMs, gem } }), so they stay valid under
// the store validators P00-T22 adds. seeds.test.mjs fails if a key here stops matching the source.

export const KEYS = {
  progress: 'gravity-flow:progress:v9',
  currency: 'gravity-flow:currency:v1',
  storeNudge: 'gravity-flow:storeNudge:v1',
  settings: 'gravity-flow:settings',
  cosmetics: 'gravity-flow:cosmetics:v2',
  entitlements: 'gravity-flow:entitlements:v1',
  premium: 'gravity-flow:premium',
};

const cleared = (count) =>
  JSON.stringify(Object.fromEntries(Array.from({ length: count }, (_, i) => [i + 1, { stars: 3, bestTimeMs: 20000, gem: true }])));

/** A returning player: the first 40 levels cleared with 3 stars (worlds 1-4 done, several planets live on the map). */
export const RETURNING_PLAYER = { [KEYS.progress]: cleared(40) };

/** Every one of the 150 levels cleared: every world is unlocked, so every planet on the map is live. */
export const ALL_WORLDS_UNLOCKED = { [KEYS.progress]: cleared(150) };

/** 5000 Stardust: a stray tap on a shop row WOULD buy something, so an unchanged balance proves no row was tapped. */
export const RICH = { [KEYS.currency]: '5000' };
