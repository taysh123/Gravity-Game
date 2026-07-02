// In-app-purchase seam. Web build = localStorage stub; native build = RevenueCat,
// dynamically imported + guarded by isNativePlatform() so the web bundle never loads
// the plugin. Premium = "Remove Ads" (cosmetics are bought via CosmeticStore, funded
// by Stardust now). isPremium() stays SYNCHRONOUS by caching the RevenueCat
// entitlement to localStorage (refreshed on init / purchase / restore), so callers
// (e.g. Ads.maybeInterstitial) are unchanged.
import { Capacitor } from '@capacitor/core';
import { REVENUECAT, bundleById } from '../config/monetization.config';
import { Analytics } from './Analytics';
import {
  purchaseInitiated,
  purchaseCompleted,
  purchaseFailed,
  firstPurchase,
  restore as restoreEvent,
} from './analyticsEvents';
import { CosmeticStore } from './CosmeticStore';
import type { PurchasesPlugin } from './native/revenueCat';

const PREMIUM_KEY = 'gravity-flow:premium';
const FIRST_PURCHASE_KEY = 'gravity-flow:firstPurchase';

function setCachedPremium(v: boolean): void {
  try {
    localStorage.setItem(PREMIUM_KEY, v ? '1' : '0');
  } catch {
    // storage disabled — premium not persisted
  }
}

// Fires purchaseCompleted, and — the first time this device ever completes a
// purchase — firstPurchase too (measure-only, no reward; mirrors the
// SettingsStore.seenFirstWin one-time-flag pattern but persisted directly in
// localStorage like PREMIUM_KEY, since IAP has no SettingsStore dependency).
// If storage is unavailable we can't dedupe, so we skip firstPurchase
// attribution rather than risk re-firing it on every purchase.
function trackPurchaseCompleted(product: string): void {
  Analytics.track(purchaseCompleted(product));
  try {
    if (localStorage.getItem(FIRST_PURCHASE_KEY) === '1') return;
    localStorage.setItem(FIRST_PURCHASE_KEY, '1');
    Analytics.track(firstPurchase(product));
  } catch {
    // storage disabled — skip first-purchase attribution
  }
}

function hasEntitlement(info: { customerInfo: { entitlements: { active: Record<string, unknown> } } }): boolean {
  return Boolean(info?.customerInfo?.entitlements?.active?.[REVENUECAT.premiumEntitlementId]);
}

let rc: PurchasesPlugin | null = null;
let configured = false;
// Resolves true once the native plugin is available. Does NOT return the proxy —
// a Capacitor registerPlugin() proxy is thenable, and returning it would invoke
// proxy.then -> "PurchasesPlugin.then is not implemented on android". Callers use
// the module-scoped `rc`.
async function ensureRC(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (configured) return rc !== null;
  configured = true;
  try {
    const m = await import('./native/revenueCat');
    const p = m.Purchases;
    if (REVENUECAT.apiKey) await p.configure({ apiKey: REVENUECAT.apiKey }); // a method CALL is fine
    rc = p;
  } catch {
    rc = null; // plugin unavailable — fall back to the cached value
  }
  return rc !== null;
}

export const IAP = {
  isPremium(): boolean {
    try {
      return localStorage.getItem(PREMIUM_KEY) === '1';
    } catch {
      return false;
    }
  },

  // Native: configure RevenueCat + refresh the cached entitlement. No-op on web.
  async initNative(): Promise<void> {
    if (!(await ensureRC()) || !rc) return;
    try {
      setCachedPremium(hasEntitlement(await rc.getCustomerInfo()));
    } catch {
      // leave the cached value as-is (e.g. RevenueCat key not set yet)
    }
  },

  // Resolves true on a successful purchase. Web stub grants it immediately.
  async buyRemoveAds(): Promise<boolean> {
    const product = REVENUECAT.removeAdsProductId;
    Analytics.track(purchaseInitiated(product));
    if (!Capacitor.isNativePlatform()) {
      setCachedPremium(true);
      trackPurchaseCompleted(product);
      return true;
    }
    if (!(await ensureRC()) || !rc) {
      Analytics.track(purchaseFailed(product, 'rc_unavailable'));
      return false;
    }
    try {
      const offerings = await rc.getOfferings();
      const pkg =
        offerings.current?.availablePackages.find(
          (a) => a.product.identifier === product,
        ) ?? offerings.current?.availablePackages[0];
      if (!pkg) {
        Analytics.track(purchaseFailed(product, 'no_package'));
        return false;
      }
      const ok = hasEntitlement(await rc.purchasePackage({ aPackage: pkg }));
      setCachedPremium(ok);
      if (ok) trackPurchaseCompleted(product);
      else Analytics.track(purchaseFailed(product, 'not_entitled'));
      return ok;
    } catch {
      Analytics.track(purchaseFailed(product, 'cancelled_or_failed')); // user cancelled or purchase failed
      return false;
    }
  },

  // Buy a premium bundle: grants its cosmetics (+ premium if included). Web stub
  // grants immediately. Returns true on success. Cosmetic-only — no pay-to-win.
  async buyBundle(id: string): Promise<boolean> {
    const bundle = bundleById(id);
    if (!bundle) return false;
    const product = bundle.productId;
    Analytics.track(purchaseInitiated(product));
    if (!Capacitor.isNativePlatform()) {
      CosmeticStore.grant(bundle.grants);
      if (bundle.premium) setCachedPremium(true);
      trackPurchaseCompleted(product);
      return true;
    }
    if (!(await ensureRC()) || !rc) {
      Analytics.track(purchaseFailed(product, 'rc_unavailable'));
      return false;
    }
    try {
      const offerings = await rc.getOfferings();
      const pkg = offerings.current?.availablePackages.find((a) => a.product.identifier === product);
      if (!pkg) {
        Analytics.track(purchaseFailed(product, 'no_package'));
        return false;
      }
      const result = await rc.purchasePackage({ aPackage: pkg });
      CosmeticStore.grant(bundle.grants); // entitlement also gates re-grant on restore
      if (bundle.premium) setCachedPremium(hasEntitlement(result) || true);
      // Bundle completion = the purchase resolved (RevenueCat throws on cancel/failure).
      // Unlike buyRemoveAds we deliberately do NOT gate on hasEntitlement: bundles grant
      // cosmetics, and a non-premium bundle never activates the `premium` entitlement —
      // gating on it would wrongly mark a successful cosmetic-bundle purchase as failed.
      trackPurchaseCompleted(product);
      return true;
    } catch {
      Analytics.track(purchaseFailed(product, 'cancelled_or_failed'));
      return false;
    }
  },

  // Restore a prior purchase (required by stores). Returns the resulting premium state.
  async restorePurchases(): Promise<boolean> {
    // restore() is outcome-agnostic by design (fires whether or not an
    // entitlement was actually found) — out of scope for this task's
    // completed/failed split, which is specifically about buy-flow taps vs
    // revenue. Restore has no "attempt vs completed" ambiguity to fix.
    Analytics.track(restoreEvent());
    if (!Capacitor.isNativePlatform()) return this.isPremium();
    if (!(await ensureRC()) || !rc) return this.isPremium();
    try {
      const ok = hasEntitlement(await rc.restorePurchases());
      setCachedPremium(ok);
      return ok;
    } catch {
      return this.isPremium();
    }
  },
};
