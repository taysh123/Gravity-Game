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

export const REVENUECAT = {
  // Public Android SDK key from the RevenueCat dashboard — set before release.
  apiKey: '',
  // Product id (Play Console) + entitlement id (RevenueCat) for Remove-Ads / premium.
  removeAdsProductId: 'remove_ads',
  premiumEntitlementId: 'premium',
} as const;
