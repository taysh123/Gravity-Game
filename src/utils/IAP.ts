// In-app-purchase seam. Web build = localStorage stubs; Sprint 2 swaps in native
// IAP/RevenueCat behind this interface. Premium = "Remove Ads" (cosmetics are
// purchased via CosmeticStore, funded by Stardust now and IAP later).
const PREMIUM_KEY = 'gravity-flow:premium';

export const IAP = {
  isPremium(): boolean {
    try {
      return localStorage.getItem(PREMIUM_KEY) === '1';
    } catch {
      return false;
    }
  },

  // Resolves true on a successful purchase. Web stub grants it immediately.
  async buyRemoveAds(): Promise<boolean> {
    try {
      localStorage.setItem(PREMIUM_KEY, '1');
    } catch {
      // storage disabled — premium not persisted on web stub
    }
    return true;
  },
};
