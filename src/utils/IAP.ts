// In-app-purchase seam. Web build = localStorage stub; native build = RevenueCat,
// dynamically imported + guarded by isNativePlatform() so the web bundle never loads
// the plugin. Premium = "Remove Ads" (cosmetics are bought via CosmeticStore, funded
// by Stardust now). isPremium() stays SYNCHRONOUS by caching the RevenueCat
// entitlement to localStorage (refreshed on init / purchase / restore), so callers
// (e.g. Ads.maybeInterstitial) are unchanged.
import { Capacitor } from '@capacitor/core';
import { REVENUECAT, bundleById } from '../config/monetization.config';
import { Analytics } from './Analytics';
import { purchase as purchaseEvent, restore as restoreEvent } from './analyticsEvents';
import { CosmeticStore } from './CosmeticStore';
import type { PurchasesPlugin } from './native/revenueCat';

const PREMIUM_KEY = 'gravity-flow:premium';

function setCachedPremium(v: boolean): void {
  try {
    localStorage.setItem(PREMIUM_KEY, v ? '1' : '0');
  } catch {
    // storage disabled — premium not persisted
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
    Analytics.track(purchaseEvent(REVENUECAT.removeAdsProductId));
    if (!Capacitor.isNativePlatform()) {
      setCachedPremium(true);
      return true;
    }
    if (!(await ensureRC()) || !rc) return false;
    try {
      const offerings = await rc.getOfferings();
      const pkg =
        offerings.current?.availablePackages.find(
          (a) => a.product.identifier === REVENUECAT.removeAdsProductId,
        ) ?? offerings.current?.availablePackages[0];
      if (!pkg) return false;
      const ok = hasEntitlement(await rc.purchasePackage({ aPackage: pkg }));
      setCachedPremium(ok);
      return ok;
    } catch {
      return false; // user cancelled or purchase failed
    }
  },

  // Buy a premium bundle: grants its cosmetics (+ premium if included). Web stub
  // grants immediately. Returns true on success. Cosmetic-only — no pay-to-win.
  async buyBundle(id: string): Promise<boolean> {
    const bundle = bundleById(id);
    if (!bundle) return false;
    Analytics.track(purchaseEvent(bundle.productId));
    if (!Capacitor.isNativePlatform()) {
      CosmeticStore.grant(bundle.grants);
      if (bundle.premium) setCachedPremium(true);
      return true;
    }
    if (!(await ensureRC()) || !rc) return false;
    try {
      const offerings = await rc.getOfferings();
      const pkg = offerings.current?.availablePackages.find((a) => a.product.identifier === bundle.productId);
      if (!pkg) return false;
      const result = await rc.purchasePackage({ aPackage: pkg });
      CosmeticStore.grant(bundle.grants); // entitlement also gates re-grant on restore
      if (bundle.premium) setCachedPremium(hasEntitlement(result) || true);
      return true;
    } catch {
      return false;
    }
  },

  // Restore a prior purchase (required by stores). Returns the resulting premium state.
  async restorePurchases(): Promise<boolean> {
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
