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

// AdMob request configuration passed to AdMob.initialize() (services/Ads.ts). D-25: the audience is 13+ and the content rating stays
// Everyone, so there is NO child-directed and NO under-age-of-consent tag anywhere (neither key is ever sent). A-07: the max ad content
// rating is the plugin enum value MaxAdContentRating.ParentalGuidance, not the string 'PG'; the value is mirrored here because the web
// bundle never imports the plugin, and src/config/consentConfig.test.ts pins it to the real enum.
export const ADMOB_TARGETING = {
  MAX_AD_CONTENT_RATING: 'ParentalGuidance',
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

// Ad plumbing (D-24, P00-T19), consumed by the pure reducer in services/adState.ts and the glue in services/Ads.ts.
// A rewarded ad's outcome is read from the plugin's events, never from the showRewardVideoAd() promise (it only resolves on a
// reward and never settles when the player closes the ad early).
// If the ad has not reported `Showed` this long after the show call, the show is abandoned as unavailable.
export const AD_SHOW_WATCHDOG_MS = 5000;
// A rewarded ad's reward callback can land just after its Dismissed event: Dismissed without a reward waits this long.
export const AD_LATE_REWARD_GRACE_MS = 300;
// Reload delay after the 1st, 2nd, 3rd... failed load in a row; the last value repeats. A load success resets the sequence.
export const AD_RETRY_BACKOFF_MS = [30_000, 60_000, 120_000, 300_000] as const;
// A loaded ad expires on Google's side after about an hour; one older than this is reloaded rather than shown.
export const AD_MAX_AGE_MS = 55 * 60 * 1000;
// Safety ceiling: an ad on screen for longer than this (a lost Dismissed event) is treated as closed so nothing hangs. No real
// rewarded or interstitial ad runs this long.
export const AD_SHOWING_MAX_MS = 3 * 60 * 1000;
// The setExternalFlowActive() source raised around a native ad (src/platform/externalFlow.ts), so the pause overlay does not
// open while the ad covers the app.
export const AD_EXTERNAL_FLOW_SOURCE = 'ads';

// Plugin event names, mirrored from @capacitor-community/admob 8.0.0 because the web bundle never imports the package (same reason
// as ADMOB_TARGETING); src/config/consentConfig.test.ts pins each value to the real enum, so a plugin bump that renames one fails
// there. dist/esm/reward/reward-ad-plugin-events.enum.d.ts (RewardAdPluginEvents) and
// dist/esm/interstitial/interstitial-ad-plugin-events.enum.d.ts (InterstitialAdPluginEvents).
export const ADMOB_EVENTS = {
  REWARDED: {
    LOADED: 'onRewardedVideoAdLoaded',
    FAILED_TO_LOAD: 'onRewardedVideoAdFailedToLoad',
    SHOWED: 'onRewardedVideoAdShowed',
    FAILED_TO_SHOW: 'onRewardedVideoAdFailedToShow',
    DISMISSED: 'onRewardedVideoAdDismissed',
    REWARDED: 'onRewardedVideoAdReward',
  },
  INTERSTITIAL: {
    LOADED: 'interstitialAdLoaded',
    FAILED_TO_LOAD: 'interstitialAdFailedToLoad',
    SHOWED: 'interstitialAdShowed',
    FAILED_TO_SHOW: 'interstitialAdFailedToShow',
    DISMISSED: 'interstitialAdDismissed',
  },
} as const;

// Rewarded-offer UI (win overlay 2x, Endless revive / 2x, shop Free Fragments; ui/adOffer.ts and the three scenes).
export const AD_UI = {
  UNAVAILABLE: 'Ad unavailable', // the offer was ready when drawn but the ad failed or timed out at the tap (device row A3)
  BUSY_ALPHA: 0.55, // an offer whose ad is on screen / running (it is also disabled)
  RESULT_HOLD_MS: 900, // how long the win overlay shows "x2!" / "Ad unavailable" on the 2x button before it advances
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
  // SDK init failing this many times in a row (the boot attempt plus the one retry a shop / Settings open or a buy tap
  // makes) is definitive: the purchase cards then read "Unavailable" instead of "…" for ever. A later success (the next
  // foreground, or the next time a surface opens) clears it.
  INIT_FAIL_LIMIT: 2,
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
  // No price lives here: the only price the UI ever shows is the store's own localized `priceString`
  // (IAP.price(packageId), MONETIZATION.md A.6), so a figure can never be wrong for the player's country or currency.
  grants: string[];
  premium: boolean;
  blurb: string;
  // D-09 / A-24: the offer is hidden once `no_ads` is owned through a different product (Starter is Remove Ads plus one
  // trail; a player who already has Remove Ads or Founder's would pay for it twice). Starter itself, once owned, keeps its
  // card and reads OWNED, so it never vanishes at the moment of purchase. A bundle-only cosmetic whose bundle is hidden
  // does not cross-sell to it. P7 replaces it with a cosmetic-only twin product.
  hideWhenNoAds?: boolean;
  // ONE bundle only — an honest "BEST VALUE" tag (Wave 3 Task 4). Never fake
  // savings math: 'starter' is flagged as the best value-PER-PRICE entry deal —
  // the cheapest bundle that includes Remove Ads AND an exclusive Legendary
  // cosmetic, so the cosmetic effectively costs only a little on top of Remove
  // Ads. This is a deliberate value-for-price framing, NOT a claim it dominates
  // on every axis (Founders has higher-tier Mythic skins; Premium Collection
  // has two Legendaries) — those trade more content/rarity for a higher price.
  // The framing is written without any amount because prices differ by currency
  // and region; it holds in every one, and there is no fake discount.
  bestValue?: boolean;
}

export const BUNDLES: BundleDef[] = [
  { id: 'starter', name: 'Starter Pack', productId: 'starter_pack', packageId: PACKAGES.STARTER, entitlement: ENTITLEMENTS.PACK_STARTER, premium: true, grants: ['trail_galaxy'], blurb: 'Remove Ads + the exclusive Galaxy Trail', bestValue: true, hideWhenNoAds: true },
  { id: 'premium_collection', name: 'Premium Collection', productId: 'premium_collection_pack', packageId: PACKAGES.PREMIUM_COLLECTION, entitlement: ENTITLEMENTS.PACK_PREMIUM_COLLECTION, premium: false, grants: ['cosmic_blackhole', 'arrival_bolt'], blurb: 'Black Hole skin + Lightning Strike arrival' },
  { id: 'founders', name: "Founder's Pack", productId: 'founders_pack', packageId: PACKAGES.FOUNDERS, entitlement: ENTITLEMENTS.PACK_FOUNDERS, premium: true, grants: ['mythic_phoenix', 'mythic_dragon'], blurb: 'Remove Ads + two exclusive Mythic skins: Phoenix Core & Dragon Heart' },
];

export function bundleById(id: string): BundleDef | undefined {
  return BUNDLES.find((b) => b.id === id);
}

// Purchase-UI copy (P00-T17; MONETIZATION.md A.4 outcome table, A.5, A.6, A.13). Every string a purchase card, toast or
// restore message can show, in one place. No amount ever appears here: prices come from the store at runtime.
export const PURCHASE_COPY = {
  LOADING: '…', // a card while the store has not answered (disabled)
  UNAVAILABLE: 'Unavailable', // no package in the offering, or the store is not configured on this build
  OWNED: 'OWNED',
  PENDING_TAG: 'PENDING',
  PENDING_NOTE: 'Payment pending — unlocks automatically',
  CHECK_STATUS: 'Check status',
  WEB_ONLY: 'Available in the Android app', // A.13 / device row P20: the web build never sells or grants
  NETWORK: "No connection — try again when you're online.", // codes 10 / 35 (A.4, A.12)
  ERROR: "Purchase didn't go through. You were not charged unless Google Play says so.", // any other code
  STORE_DOWN: 'The store is not available right now. Please try again later.', // native, not configured / init failed
  RESTORED: 'Purchases restored',
  NOTHING_TO_RESTORE: 'No purchases found for this Google account', // A.5, device row P17
  RESTORE_ERROR: "Couldn't restore purchases. Please try again.",
  // "Check status" found the product still not owned. Its pending marker is cleared by that check (A.5), so the card goes
  // back to a priced Buy button: the line must read true next to a Buy card, so it says nothing was found and that trying
  // again is fine, while still telling a slow payment it will unlock by itself.
  CHECK_NOT_FOUND: 'No completed payment found yet. If a payment is still processing it will unlock automatically; otherwise you can try again.',
  // A locked bundle-only cosmetic whose bundle is not on offer (Starter once Remove Ads is owned, A-24). {bundle} = its name.
  BUNDLE_NOT_OFFERED: 'Part of the {bundle} — not offered once Remove Ads is owned',
  ADS_REMOVED: 'Ads removed — thank you!',
  ADS_ALREADY_YOURS: 'Remove Ads ✓ already yours', // A.6 interim honesty on a premium bundle card
  REMOVE_ADS: 'Remove Ads',
} as const;

// Purchase-UI layout / timing (shop + Settings), consumed by scenes/CosmeticsScene.ts and scenes/SettingsScene.ts.
export const PURCHASE_UI = {
  // While a card is loading, pending or a purchase can complete elsewhere (the listener, a foreground refresh), the open
  // surface re-reads the store this often and redraws only if what it shows changed.
  POLL_MS: 600,
  BUSY_ALPHA: 0.55, // a card / link while a purchase or restore it started is running (buttons disable on tap, A.11)
  TAG_FONT_PX: 15, // price / OWNED tag
  TAG_FONT_SMALL_PX: 12, // a long tag (PENDING, Unavailable)
  TAG_LONG_LEN: 8, // labels longer than this use the small tag font
  // The pending / web note under a card. >= 13px (review m10d). Colours: THEME.TEXT_MUTED #8A8F98 and PENDING_COLOR #ffd166
  // both keep >= 4.5:1 on the glass card over any backdrop (pinned by ui/purchaseUi.test.ts).
  NOTE_FONT_PX: 13,
  NOTE_GAP: 6, // clear space between a card's text and its note
  NOTE_BOTTOM_PAD: 14, // the note + Check-status control sit this far above the card's bottom edge
  NOTE_SLACK: 24, // room a card already has below its text before a note needs more; a note grows the card by the rest
  CARD_PAD_X: 18, // a card's left / right text margin
  CHECK_FONT_PX: 14, // the Check-status label
  CHECK_LINK_W: 120, // Check-status hit area (>=44px each way: 44x44 touch minimum)
  CHECK_LINK_H: 44,
  RESTORE_FONT_PX: 13, // the Restore Purchases link label
  RESTORE_LINK_W: 220, // its hit area (>=44px each way, review m8)
  RESTORE_LINK_H: 44,
  // Shop layout (scenes/CosmeticsScene.ts)
  CARD_GAP: 9, // between stacked cards
  BUNDLE_BLURB_TOP: 44, // a bundle card's blurb / value line, measured from the card's top edge (a note grows the bottom)
  BUNDLE_VALUE_TOP: 67,
  REMOVE_ADS_BLURB_TOP: 49,
  SHOP_TOAST_ABOVE_BACK: 48, // the shop's toasts sit this far above the Back button
  // Settings layout (scenes/SettingsScene.ts)
  SETTINGS_TOAST_BELOW_PANEL: 34, // toasts sit this far below the panel
  SETTINGS_STATUS_FONT_PX: 15, // the "Remove Ads · <status>" line when it is not a button
  SETTINGS_STATUS_TITLE_Y: 12, // that line, from the top of the row, when a note follows it
  SETTINGS_NOTE_TOP: 22, // the note's top edge, from the top of the row
  SETTINGS_CHECK_LINK_W: 160, // the Settings row's Check-status hit area (wider: the row is a full-width panel)
  SETTINGS_WEB_BOTTOM_PAD: 14, // the web build has no Restore link: keep the note clear of the panel edge
  PENDING_COLOR: '#ffd166', // gold, the store's accent (STARDUST in CosmeticsScene)
  PRICE_COLOR: '#7affb0', // green price highlight (same as STORE.BEST_VALUE_COLOR)
} as const;

// Store discoverability (Wave 3 Task 4) — an honest win-overlay spend nudge +
// truthful bundle value framing. No dark patterns: no countdowns, no fake
// urgency, no fake savings math. The BEST VALUE tag above is the only
// persuasive element anywhere in this feature, and it's an honest value-for-
// price framing (see BundleDef.bestValue), not a fabricated claim.
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
