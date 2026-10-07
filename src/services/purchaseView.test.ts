import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bundleValueLine,
  entitlementLabel,
  purchaseCardView,
  purchaseFeedback,
  restoreFeedback,
  type CardInput,
  type StoreStatus,
} from './purchaseView';
import { PURCHASE_COPY } from '../config/monetization.config';

// P00-T17 (MONETIZATION.md A.4, A.5, A.6, A.12, A.13): the shop / Settings purchase UI as pure data. Prices come from the
// store only, a pending product never offers a second Buy, the web build never offers a purchase, and every outcome has
// exactly the copy the spec gives it (a cancel has none).

const base: CardInput = { owned: false, pending: false, store: 'ready', price: '₪7.90', noAdsOwned: false };
const card = (over: Partial<CardInput> = {}) => purchaseCardView({ ...base, ...over });

describe('purchaseCardView: one card state from (owned, pending, price, store, noAdsOwned)', () => {
  it('ready: the store priceString verbatim, and a tap buys', () => {
    expect(card()).toMatchObject({ visible: true, label: '₪7.90', action: 'buy', tone: 'price', note: null });
    expect(card({ price: '1,99 €' }).label).toBe('1,99 €');
  });

  it('owned: OWNED and no action, whatever else is true', () => {
    for (const store of ['web', 'loading', 'unavailable', 'ready'] as StoreStatus[]) {
      expect(card({ owned: true, store })).toMatchObject({ visible: true, label: 'OWNED', action: 'none', tone: 'owned', note: null });
    }
    expect(card({ owned: true, pending: true }).action).toBe('none');
  });

  it('pending: "unlocks automatically" + "Check status", never a Buy', () => {
    const v = card({ pending: true });
    expect(v).toMatchObject({
      visible: true,
      label: PURCHASE_COPY.PENDING_TAG,
      note: 'Payment pending — unlocks automatically',
      action: 'check',
      actionLabel: 'Check status',
      tone: 'pending',
    });
    expect(card({ pending: true, store: 'loading', price: null }).action).toBe('check');
    expect(card({ pending: true, store: 'unavailable', price: null }).action).toBe('check');
  });

  it('web: "Available in the Android app" instead of a buy button, and the price is never shown', () => {
    const v = card({ store: 'web', price: '₪7.90' });
    expect(v).toMatchObject({ visible: true, label: '', note: 'Available in the Android app', action: 'none', tone: 'muted' });
  });

  it('loading (offerings not answered yet): "…" and the button is disabled', () => {
    expect(card({ store: 'loading', price: null })).toMatchObject({ label: '…', action: 'none', tone: 'muted', note: null });
    expect(card({ store: 'loading', price: '₪7.90' }).label).toBe('…'); // a price from a stale read is never shown early
  });

  it('unavailable (no package / unconfigured): "Unavailable", no action', () => {
    expect(card({ store: 'unavailable', price: null })).toMatchObject({ label: 'Unavailable', action: 'none', tone: 'muted' });
  });

  it('ready but the package has no usable price: "Unavailable", never an empty or invented price', () => {
    expect(card({ price: null })).toMatchObject({ label: 'Unavailable', action: 'none' });
    expect(card({ price: '' })).toMatchObject({ label: 'Unavailable', action: 'none' });
  });

  it('Starter (hideWithNoAds): hidden once no_ads is owned, shown otherwise (D-09)', () => {
    expect(card({ hideWithNoAds: true, noAdsOwned: true })).toMatchObject({ visible: false, action: 'none' });
    expect(card({ hideWithNoAds: true, noAdsOwned: false })).toMatchObject({ visible: true, action: 'buy' });
    // A card that never hides is unaffected by no_ads (Founder's, Premium Collection, Remove Ads).
    expect(card({ noAdsOwned: true })).toMatchObject({ visible: true, action: 'buy' });
  });

  it('Starter that the player really owns still reads OWNED (hidden is for the offer, not for what they bought)', () => {
    expect(card({ hideWithNoAds: true, noAdsOwned: true, owned: true })).toMatchObject({ visible: true, label: 'OWNED', action: 'none' });
  });

  it('a hidden card offers nothing, even with a stale pending marker', () => {
    expect(card({ hideWithNoAds: true, noAdsOwned: true, pending: true })).toMatchObject({ visible: false, action: 'none' });
  });

  it('exhaustive invariants: Buy only when nothing owns, pends or blocks it; Check only for a pending product', () => {
    const bools = [false, true];
    const stores: StoreStatus[] = ['web', 'loading', 'unavailable', 'ready'];
    for (const owned of bools) for (const pending of bools) for (const noAdsOwned of bools) for (const hide of bools) for (const store of stores) {
      for (const price of ['₪7.90', null]) {
        const v = purchaseCardView({ owned, pending, store, price, noAdsOwned, hideWithNoAds: hide });
        const key = JSON.stringify({ owned, pending, noAdsOwned, hide, store, price });
        const hidden = hide && noAdsOwned && !owned;
        if (v.action === 'buy') {
          expect(!owned && !pending && !hidden && store === 'ready' && price !== null, key).toBe(true);
        }
        if (v.action === 'check') expect(pending && !owned && !hidden, key).toBe(true);
        if (store === 'web') expect(v.action === 'buy', key).toBe(false); // web never grants or sells
        if (v.visible === false) expect(v.action, key).toBe('none');
        // A price is only ever shown for a ready, unowned, unpending, visible card, and only the store's own string.
        if (v.label.includes('₪')) expect(v.action, key).toBe('buy');
      }
    }
  });

  it('no label or note ever carries a hard-coded currency amount', () => {
    const texts = new Set<string>();
    for (const store of ['web', 'loading', 'unavailable'] as StoreStatus[]) {
      for (const pending of [false, true]) {
        const v = card({ store, pending, price: null });
        texts.add(v.label);
        if (v.note) texts.add(v.note);
        if (v.actionLabel) texts.add(v.actionLabel);
      }
    }
    for (const t of [...texts, ...Object.values(PURCHASE_COPY)]) expect(t).not.toMatch(/[$€£₪¥]\s?\d|\d\s?[$€£₪¥]/);
  });
});

describe('bundleValueLine (A.6 interim honesty)', () => {
  it('a premium bundle says it includes Remove Ads', () => {
    expect(bundleValueLine('2 Mythic items', true, false)).toBe('2 Mythic items + Remove Ads');
  });

  it('a premium bundle for a player who already has no_ads says "Remove Ads ✓ already yours"', () => {
    const line = bundleValueLine('2 Mythic items', true, true);
    expect(line).toContain('Remove Ads ✓ already yours');
    expect(line).toContain('2 Mythic items');
  });

  it('a bundle without Remove Ads is just its items, whatever the player owns', () => {
    expect(bundleValueLine('2 Legendary items', false, false)).toBe('2 Legendary items');
    expect(bundleValueLine('2 Legendary items', false, true)).toBe('2 Legendary items');
  });
});

describe('entitlementLabel', () => {
  it('names every entitlement a restore can list', () => {
    expect(entitlementLabel('no_ads')).toBe('Remove Ads');
    expect(entitlementLabel('pack_starter')).toBe('Starter Pack');
    expect(entitlementLabel('pack_premium_collection')).toBe('Premium Collection');
    expect(entitlementLabel('pack_founders')).toBe("Founder's Pack");
    expect(entitlementLabel('nope')).toBeNull();
  });
});

describe('purchaseFeedback (A.4 outcome table)', () => {
  it('cancelled is silent: no message, no refresh (P2)', () => {
    expect(purchaseFeedback('cancelled', false)).toEqual({ kind: 'none', message: null, refresh: false });
  });

  it('purchased celebrates (the unlock fanfare) and refreshes, with no error copy', () => {
    expect(purchaseFeedback('purchased', false)).toEqual({ kind: 'celebrate', message: null, refresh: true });
  });

  it('pending: the "unlocks automatically" message, and the card refreshes to its pending state', () => {
    expect(purchaseFeedback('pending', false)).toEqual({ kind: 'info', message: 'Payment pending — unlocks automatically', refresh: true });
  });

  it('network: the friendly "No connection" message (P12)', () => {
    expect(purchaseFeedback('network', false)).toEqual({ kind: 'info', message: "No connection — try again when you're online.", refresh: false });
  });

  it('error: the clear "didn\'t go through" message, honest about charging (P3)', () => {
    const fb = purchaseFeedback('error', false);
    expect(fb.kind).toBe('error');
    expect(fb.message).toBe("Purchase didn't go through. You were not charged unless Google Play says so.");
    expect(fb.refresh).toBe(false);
  });

  it('unavailable: "Available in the Android app" on web, a store-down message on a device', () => {
    expect(purchaseFeedback('unavailable', true).message).toBe('Available in the Android app');
    const device = purchaseFeedback('unavailable', false);
    expect(device.kind).toBe('error');
    expect(device.message).toBe(PURCHASE_COPY.STORE_DOWN);
  });
});

describe('restoreFeedback (A.5)', () => {
  const ctx = { web: false, recheck: false, ownedNow: false };

  it('restored: "Purchases restored" and what came back', () => {
    const fb = restoreFeedback({ outcome: 'restored', restored: ['no_ads', 'pack_founders'] }, ctx);
    expect(fb.kind).toBe('info');
    expect(fb.message).toBe("Purchases restored: Remove Ads, Founder's Pack");
    expect(fb.refresh).toBe(true);
  });

  it('restored with nothing nameable: just "Purchases restored"', () => {
    expect(restoreFeedback({ outcome: 'restored', restored: [] }, ctx).message).toBe('Purchases restored');
  });

  it('none: "No purchases found for this Google account" (P17)', () => {
    expect(restoreFeedback({ outcome: 'none', restored: [] }, ctx).message).toBe('No purchases found for this Google account');
  });

  it('network and error have their own copy; neither claims anything was restored', () => {
    expect(restoreFeedback({ outcome: 'network', restored: [] }, ctx).message).toBe("No connection — try again when you're online.");
    const err = restoreFeedback({ outcome: 'error', restored: [] }, ctx);
    expect(err.kind).toBe('error');
    expect(err.message).toBe("Couldn't restore purchases. Please try again.");
  });

  it('busy (a purchase or restore is already running) is silent', () => {
    expect(restoreFeedback({ outcome: 'busy', restored: [] }, ctx)).toEqual({ kind: 'none', message: null, refresh: false });
  });

  it('unavailable: web or a store that is down', () => {
    expect(restoreFeedback({ outcome: 'unavailable', restored: [] }, { ...ctx, web: true }).message).toBe('Available in the Android app');
    expect(restoreFeedback({ outcome: 'unavailable', restored: [] }, ctx).message).toBe(PURCHASE_COPY.STORE_DOWN);
  });

  it('"Check status" that finds the product: the restored message', () => {
    const fb = restoreFeedback({ outcome: 'restored', restored: ['no_ads'] }, { web: false, recheck: true, ownedNow: true });
    expect(fb.message).toBe('Purchases restored: Remove Ads');
  });

  it('"Check status" that still finds nothing for that product: honest "not unlocked yet", and the card refreshes', () => {
    for (const outcome of ['none', 'restored'] as const) {
      const fb = restoreFeedback({ outcome, restored: outcome === 'restored' ? ['pack_founders'] : [] }, { web: false, recheck: true, ownedNow: false });
      expect(fb.message).toBe(PURCHASE_COPY.STILL_PENDING);
      expect(fb.refresh).toBe(true);
    }
  });

  it('"Check status" while offline keeps the pending state and says why', () => {
    const fb = restoreFeedback({ outcome: 'network', restored: [] }, { web: false, recheck: true, ownedNow: false });
    expect(fb.message).toBe("No connection — try again when you're online.");
    expect(fb.refresh).toBe(false);
  });
});

// P00-T17 done-when: prices come from the store only, so no price label or hard-coded amount exists anywhere in src.
describe('source guard: no hard-coded prices (P00-T17 done-when grep)', () => {
  const srcRoot = fileURLToPath(new URL('../', import.meta.url));
  function files(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...files(full));
      else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
    }
    return out;
  }
  const app = files(srcRoot);
  const rel = (f: string): string => relative(srcRoot, f).replace(/\\/g, '/');

  it('the done-when grep finds nothing in src: no price label, no dollar amount (comments included)', () => {
    // Built from pieces so this file does not itself match the grep it guards.
    const forbidden = new RegExp([['price', 'Label'].join(''), ['REMOVE_ADS_PRICE', 'LABEL'].join('_'), '\\$[0-9]'].join('|'));
    const offenders = app.filter((f) => forbidden.test(readFileSync(f, 'utf8'))).map(rel);
    expect(offenders).toEqual([]);
  });

  it('no currency amount is typed in any app source file', () => {
    const amount = /[€£₪¥]\s?\d|\d\s?[€£₪¥]/;
    expect(app.filter((f) => amount.test(readFileSync(f, 'utf8'))).map(rel)).toEqual([]);
  });
});
