// Monetization config — ad-unit / RevenueCat / product ids. NO SECRETS in source.
// Defaults are Google's public AdMob TEST ids so a native build works before real
// ids exist; replace with the real ids (and set the RevenueCat key) before a prod
// release. Consumed by the guarded native branches in services/Ads.ts + services/IAP.ts (purchases: D-09).

export const ADMOB = {
  // Google AdMob official TEST ad units (safe for dev + internal testing).
  // Replace before production. The app id also goes in AndroidManifest.xml.
  appId: 'ca-app-pub-3940256099942544~3347511713',
  rewardedAdId: 'ca-app-pub-3940256099942544/5224354917',
  interstitialAdId: 'ca-app-pub-3940256099942544/1033173712',
} as const;

// Interstitial cadence (Wave 3 Task 1) — retention-first, deliberately
// conservative. Consumed by the pure gate in services/interstitial.ts; Ads.ts
// supplies the runtime context (now/lastShownMs/session state). Tune UP later
// from live `interstitial_suppressed` analytics, never down without data.
export const INTERSTITIAL = {
  MIN_GAP_MS: 180_000, // ≥3 min between interstitials (moved from Ads.ts)
  GRACE_LEVELS: 3, // no interstitial in a session's first N campaign level completions
  GRACE_MS: 120_000, // …or its first M ms, whichever protects longer
} as const;

export const REVENUECAT = {
  // Public Android SDK key from the RevenueCat dashboard — set before release. Empty = IAP "unconfigured": every
  // purchase/restore resolves 'unavailable' (never a crash). The release guard that refuses an empty or Test Store key
  // is P00-T20.
  apiKey: '',
  // Play Console product id of the standalone Remove-Ads purchase.
  removeAdsProductId: 'remove_ads',
} as const;

// RevenueCat entitlement ids (D-09, MONETIZATION.md A.2). They are the ONLY source of truth for what a player owns:
// `no_ads` turns interstitials off and each `pack_*` derives its bundle cosmetics (services/entitlements.ts). The
// pre-launch `premium` entitlement was renamed to `no_ads`. A new product or pack is a data change: add its id here,
// its row to services/entitlements.ts PRODUCTS / ENTITLEMENT_COSMETICS, and (for a bundle) a BUNDLES row.
export const ENTITLEMENTS = {
  NO_ADS: 'no_ads',
  PACK_STARTER: 'pack_starter',
  PACK_PREMIUM_COLLECTION: 'pack_premium_collection',
  PACK_FOUNDERS: 'pack_founders',
} as const;
export type Entitlement = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS];

// RevenueCat package ids (custom ids) in the current offering `default` (MONETIZATION.md A.14 R7).
export const PACKAGES = {
  REMOVE_ADS: 'remove_ads',
  STARTER: 'starter',
  PREMIUM_COLLECTION: 'premium_collection',
  FOUNDERS: 'founders',
} as const;
export type PackageId = (typeof PACKAGES)[keyof typeof PACKAGES];

// Purchase-flow timing (MONETIZATION.md A.4 / A.5), consumed by services/IAP.ts.
export const PURCHASE_FLOW = {
  // A payment-pending marker (code 20) is dropped after this long without the entitlement turning active. INFERRED
  // from Play's pending window; verify with device row P5 (DEVICE-CHECKLIST-M0).
  PENDING_TTL_MS: 72 * 60 * 60 * 1000,
  // "Verifying": purchasePackage resolved but the target entitlement is not active yet; re-read customer info once
  // after this delay before reporting a failure.
  VERIFY_DELAY_MS: 2000,
  // The setExternalFlowActive() source raised around the Play purchase sheet (src/platform/externalFlow.ts).
  EXTERNAL_FLOW_SOURCE: 'iap',
  // A-06 silent restore (one per new RevenueCat identity on Android). A failure backs off exponentially across
  // launches (BASE, 2xBASE, 4xBASE ... capped at MAX), at most MAX_PER_SESSION attempts run in one session, and after
  // MAX_ATTEMPTS failures it gives up: the store truth then applies and the user-facing Restore stays available.
  SILENT_RESTORE_MAX_PER_SESSION: 2,
  SILENT_RESTORE_MAX_ATTEMPTS: 8,
  SILENT_RESTORE_BACKOFF_BASE_MS: 5 * 60 * 1000,
  SILENT_RESTORE_BACKOFF_MAX_MS: 24 * 60 * 60 * 1000,
} as const;

// Premium bundles (IAP). `productId` is the Play Console product, `packageId` its RevenueCat package and
// `entitlement` the pack entitlement it grants. `grants` = the cosmetics that entitlement derives and `premium` = the
// product also grants `no_ads`; both are display data here and must match services/entitlements.ts (a test pins it).
// Ownership is never granted locally: it is derived from the active entitlements (D-09). No P2W — everything granted
// is purely cosmetic (plus the optional Remove-Ads convenience).
export interface BundleDef {
  id: string;
  name: string;
  productId: string;
  packageId: PackageId;
  entitlement: Entitlement;
  priceLabel: string; // display only — real price comes from the store at runtime
  grants: string[];
  premium: boolean;
  blurb: string;
  // ONE bundle only — an honest "BEST VALUE" tag (Wave 3 Task 4). Never fake
  // savings math: 'starter' is flagged as the best value-PER-DOLLAR entry deal —
  // the lowest-priced bundle that includes Remove Ads (a $1.99 standalone) AND an
  // exclusive Legendary cosmetic, so the cosmetic effectively costs ~$1 on top of
  // Remove Ads. This is a deliberate value-per-dollar framing, NOT a claim it
  // dominates on every axis (Founders has higher-tier Mythic skins; Premium
  // Collection has two Legendaries) — those trade more content/rarity for a
  // higher price. Every fact in the framing is true; there is no fake discount.
  bestValue?: boolean;
}

export const BUNDLES: BundleDef[] = [
  { id: 'starter', name: 'Starter Pack', productId: 'starter_pack', packageId: PACKAGES.STARTER, entitlement: ENTITLEMENTS.PACK_STARTER, priceLabel: '$2.99', premium: true, grants: ['trail_galaxy'], blurb: 'Remove Ads + the exclusive Galaxy Trail', bestValue: true },
  { id: 'premium_collection', name: 'Premium Collection', productId: 'premium_collection_pack', packageId: PACKAGES.PREMIUM_COLLECTION, entitlement: ENTITLEMENTS.PACK_PREMIUM_COLLECTION, priceLabel: '$4.99', premium: false, grants: ['cosmic_blackhole', 'arrival_bolt'], blurb: 'Black Hole skin + Lightning Strike arrival' },
  { id: 'founders', name: "Founder's Pack", productId: 'founders_pack', packageId: PACKAGES.FOUNDERS, entitlement: ENTITLEMENTS.PACK_FOUNDERS, priceLabel: '$7.99', premium: true, grants: ['mythic_phoenix', 'mythic_dragon'], blurb: 'Remove Ads + two exclusive Mythic skins: Phoenix Core & Dragon Heart' },
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
// persuasive element anywhere in this feature, and it's an honest value-per-
// dollar framing (see BundleDef.bestValue), not a fabricated claim.
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
