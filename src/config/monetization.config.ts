// Monetization config — ad-unit / RevenueCat / product ids. NO SECRETS in source.
// Defaults are Google's public AdMob TEST ids so a native build works before real
// ids exist; replace with the real ids (and set the RevenueCat key) before a prod
// release. Consumed by the guarded native branches in utils/Ads.ts + utils/IAP.ts.

export const ADMOB = {
  // Google AdMob official TEST ad units (safe for dev + internal testing).
  // Replace before production. The app id also goes in AndroidManifest.xml.
  appId: 'ca-app-pub-3940256099942544~3347511713',
  rewardedAdId: 'ca-app-pub-3940256099942544/5224354917',
  interstitialAdId: 'ca-app-pub-3940256099942544/1033173712',
} as const;

// Interstitial cadence (Wave 3 Task 1) — retention-first, deliberately
// conservative. Consumed by the pure gate in utils/interstitial.ts; Ads.ts
// supplies the runtime context (now/lastShownMs/session state). Tune UP later
// from live `interstitial_suppressed` analytics, never down without data.
export const INTERSTITIAL = {
  MIN_GAP_MS: 180_000, // ≥3 min between interstitials (moved from Ads.ts)
  GRACE_LEVELS: 3, // no interstitial in a session's first N campaign level completions
  GRACE_MS: 120_000, // …or its first M ms, whichever protects longer
} as const;

export const REVENUECAT = {
  // Public Android SDK key from the RevenueCat dashboard — set before release.
  apiKey: '',
  // Product id (Play Console) + entitlement id (RevenueCat) for Remove-Ads / premium.
  removeAdsProductId: 'remove_ads',
  premiumEntitlementId: 'premium',
} as const;

// Premium bundles (IAP). `grants` = cosmetic ids unlocked; `premium` = also grants
// Remove-Ads. `productId` is the Play Console / RevenueCat product. Purchase logic
// is in utils/IAP.buyBundle (web stub grants); the store surfaces these. No P2W —
// everything granted is purely cosmetic (plus the optional Remove-Ads convenience).
export interface BundleDef {
  id: string;
  name: string;
  productId: string;
  priceLabel: string; // display only — real price comes from the store at runtime
  grants: string[];
  premium: boolean;
  blurb: string;
  // ONE bundle only — an honest "BEST VALUE" tag (Wave 3 Task 4). Never fake
  // savings math: 'starter' is flagged because it's the cheapest bundle that
  // includes Remove Ads (the same benefit 'founders' charges $5 more for),
  // plus an exclusive Legendary cosmetic — the best $/benefit of the three.
  bestValue?: boolean;
}

export const BUNDLES: BundleDef[] = [
  { id: 'starter', name: 'Starter Pack', productId: 'starter_pack', priceLabel: '$2.99', premium: true, grants: ['trail_galaxy'], blurb: 'Remove Ads + the exclusive Galaxy Trail', bestValue: true },
  { id: 'premium_collection', name: 'Premium Collection', productId: 'premium_collection_pack', priceLabel: '$4.99', premium: false, grants: ['cosmic_blackhole', 'arrival_bolt'], blurb: 'Black Hole skin + Lightning Strike arrival' },
  { id: 'founders', name: "Founder's Pack", productId: 'founders_pack', priceLabel: '$7.99', premium: true, grants: ['mythic_phoenix', 'mythic_dragon'], blurb: 'Remove Ads + two exclusive Mythic skins: Phoenix Core & Dragon Heart' },
];

export function bundleById(id: string): BundleDef | undefined {
  return BUNDLES.find((b) => b.id === id);
}

// Display-only Remove-Ads price — shared by CosmeticsScene's standalone card and
// SettingsScene's shortcut (Wave 3 Task 4) so the two never drift apart.
export const REMOVE_ADS_PRICE_LABEL = '$1.99';

// Store discoverability (Wave 3 Task 4) — an honest win-overlay spend nudge +
// truthful bundle value framing. No dark patterns: no countdowns, no fake
// urgency, no fake savings math. The BEST VALUE tag above is the only
// persuasive element anywhere in this feature, and it's genuinely true.
export const STORE = {
  // Win-overlay spend nudge: shown only when a persisted cooldown of ELIGIBLE
  // (campaign, non-first-win) wins has elapsed since it last showed, the
  // player can actually afford an unowned Stardust cosmetic, and no other
  // optional overlay line already occupies this win. GameScene owns the exact
  // gating; utils/storeNudge.ts owns the pure boundary checks.
  NUDGE_COOLDOWN_WINS: 6,
  NUDGE_TEXT_SUFFIX: 'dress up your star', // scene composes "You've earned N ✦ — {suffix}"
  NUDGE_COLOR: '#ffd166', // gold text — matches STARDUST/JUST_PAR_COLOR elsewhere; ≥4.5:1 on the glass panel
  NUDGE_BORDER: 0xffd166, // numeric twin, for Graphics.lineStyle

  // Bundle framing (CosmeticsScene.bundleCard).
  BEST_VALUE_LABEL: 'BEST VALUE',
  BEST_VALUE_COLOR: '#7affb0', // green — matches the store's price-highlight color
} as const;
