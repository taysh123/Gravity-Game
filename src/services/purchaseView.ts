// The purchase UI as pure data (P00-T17; docs/design/MONETIZATION.md A.4, A.5, A.6, A.12, A.13). The shop and Settings
// render whatever this module says, so the rules are testable without Phaser:
//   - a price is only ever the store's own priceString, and only on a card that can really be bought;
//   - an owned product reads OWNED, a pending one "unlocks automatically" with a Check-status control and NEVER a second
//     Buy, the web build never sells or grants anything, and a card the store has not answered for is disabled;
//   - every purchase / restore outcome has exactly the copy of the spec (a cancel has none).
// No SDK, no Phaser, no storage: the scenes read IAP and hand the answers in. This module sits below the IAP service: its
// shared types come from the leaf ./purchaseTypes, never from ./IAP (review m10a).
import { BUNDLES, ENTITLEMENTS, PURCHASE_COPY } from '../config/monetization.config';
import type { PurchaseOutcome, RestoreResult, StoreStatus } from './purchaseTypes';

export type { StoreStatus } from './purchaseTypes';

export type CardAction = 'buy' | 'check' | 'none';
export type CardTone = 'price' | 'owned' | 'pending' | 'muted';

export interface CardInput {
  owned: boolean; // IAP.owns(pkg)
  pending: boolean; // IAP.isPending(pkg)
  store: StoreStatus; // IAP.storeStatus(pkg)
  price: string | null; // IAP.price(pkg): the store's localized priceString, null until offerings load
  noAdsOwned: boolean; // IAP.isPremium()
  hideWithNoAds?: boolean; // BundleDef.hideWhenNoAds (Starter)
}

export interface CardView {
  visible: boolean;
  label: string; // the right-hand tag: the store price, '…', OWNED, PENDING, Unavailable, or '' on web
  tone: CardTone;
  note: string | null; // a secondary line (pending / web), shown under the card text
  action: CardAction; // what a tap on the card does: buy it, re-check a pending payment, or nothing
  actionLabel: string | null; // text of the Check-status control (action 'check' only)
}

const view = (label: string, tone: CardTone, over: Partial<CardView> = {}): CardView => ({
  visible: true,
  label,
  tone,
  note: null,
  action: 'none',
  actionLabel: null,
  ...over,
});

export function purchaseCardView(i: CardInput): CardView {
  // An owned product is always shown as owned, even a Starter that the player really bought.
  if (i.owned) return view(PURCHASE_COPY.OWNED, 'owned');
  // D-09 / A-24: Starter is not offered to a player who already has no_ads from another product (owned Starter returned above).
  if (i.hideWithNoAds && i.noAdsOwned) return { ...view('', 'muted'), visible: false };
  if (i.pending) {
    return view(PURCHASE_COPY.PENDING_TAG, 'pending', {
      note: PURCHASE_COPY.PENDING_NOTE,
      action: 'check',
      actionLabel: PURCHASE_COPY.CHECK_STATUS,
    });
  }
  switch (i.store) {
    case 'web':
      return view('', 'muted', { note: PURCHASE_COPY.WEB_ONLY });
    case 'loading':
      return view(PURCHASE_COPY.LOADING, 'muted');
    case 'unavailable':
      return view(PURCHASE_COPY.UNAVAILABLE, 'muted');
    case 'ready':
      // The store's own string, verbatim. A package without a usable one is unavailable, never a guessed amount.
      return i.price ? view(i.price, 'price', { action: 'buy' }) : view(PURCHASE_COPY.UNAVAILABLE, 'muted');
  }
}

// A.6 interim honesty: a premium bundle's value line tells a player who already has no_ads that its Remove Ads part is
// already theirs, so they know exactly what the price buys.
export function bundleValueLine(items: string, premium: boolean, noAdsOwned: boolean): string {
  if (!premium) return items;
  return noAdsOwned ? `${items} + ${PURCHASE_COPY.ADS_ALREADY_YOURS}` : `${items} + ${PURCHASE_COPY.REMOVE_ADS}`;
}

// A-24: a locked bundle-only cosmetic whose bundle is hidden does not cross-sell to it; this is what the tap says instead.
export function bundleNotOfferedNote(bundleName: string): string {
  return PURCHASE_COPY.BUNDLE_NOT_OFFERED.replace('{bundle}', bundleName);
}

// The player-facing name of an entitlement (what a restore lists), or null for an id this build does not know.
export function entitlementLabel(entitlement: string): string | null {
  if (entitlement === ENTITLEMENTS.NO_ADS) return PURCHASE_COPY.REMOVE_ADS;
  return BUNDLES.find((b) => b.entitlement === entitlement)?.name ?? null;
}

// ---- Outcomes -----------------------------------------------------------------------------------------------------

// 'celebrate' = the unlock fanfare; 'info' / 'error' = a toast; 'none' = say nothing at all. `refresh`: the cards may
// have changed (owned / pending), so the surface redraws.
export interface Feedback {
  kind: 'none' | 'celebrate' | 'info' | 'error';
  message: string | null;
  refresh: boolean;
}

const SILENT: Feedback = { kind: 'none', message: null, refresh: false };

// A.4 table. `web`: IAP.storeStatus is 'web' (so 'unavailable' means "not in the browser build", not "store down").
export function purchaseFeedback(outcome: PurchaseOutcome, web: boolean): Feedback {
  switch (outcome) {
    case 'purchased':
      return { kind: 'celebrate', message: null, refresh: true };
    case 'cancelled':
      return SILENT; // no toast, no shake (device row P2)
    case 'pending':
      return { kind: 'info', message: PURCHASE_COPY.PENDING_NOTE, refresh: true };
    case 'network':
      return { kind: 'info', message: PURCHASE_COPY.NETWORK, refresh: false };
    case 'unavailable':
      return web ? { kind: 'info', message: PURCHASE_COPY.WEB_ONLY, refresh: false } : { kind: 'error', message: PURCHASE_COPY.STORE_DOWN, refresh: false };
    case 'error':
      return { kind: 'error', message: PURCHASE_COPY.ERROR, refresh: false };
  }
}

export interface RestoreContext {
  web: boolean;
  recheck: boolean; // "Check status" on one card (restore with recheck) rather than the general Restore link
  ownedNow: boolean; // the rechecked product is owned after the restore (ignored unless `recheck`)
}

// A.5: a toast that lists what came back, or says nothing was found.
export function restoreFeedback(result: RestoreResult, ctx: RestoreContext): Feedback {
  switch (result.outcome) {
    case 'busy':
      return SILENT;
    case 'unavailable':
      return ctx.web ? { kind: 'info', message: PURCHASE_COPY.WEB_ONLY, refresh: false } : { kind: 'error', message: PURCHASE_COPY.STORE_DOWN, refresh: false };
    case 'network':
      return { kind: 'info', message: PURCHASE_COPY.NETWORK, refresh: false };
    case 'error':
      return { kind: 'error', message: PURCHASE_COPY.RESTORE_ERROR, refresh: false };
    case 'restored':
    case 'none': {
      // "Check status" asked about one product: if it is still not owned, say so honestly. The recheck cleared its marker
      // (A.5), so the card redraws as a priced Buy button; the line therefore says nothing was found and that trying again
      // is fine, while still telling a slow payment it will unlock by itself (review m6).
      if (ctx.recheck && !ctx.ownedNow) return { kind: 'info', message: PURCHASE_COPY.CHECK_NOT_FOUND, refresh: true };
      if (result.outcome === 'none') return { kind: 'info', message: PURCHASE_COPY.NOTHING_TO_RESTORE, refresh: false };
      const names = result.restored.map(entitlementLabel).filter((n): n is string => n !== null);
      return { kind: 'info', message: names.length ? `${PURCHASE_COPY.RESTORED}: ${names.join(', ')}` : PURCHASE_COPY.RESTORED, refresh: true };
    }
  }
}
