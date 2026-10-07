import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createIAP, FIRST_PURCHASE_KEY, SILENT_RESTORE_KEY, type IAPDeps, type PurchasesModule } from './IAP';
import { EMPTY_SNAPSHOT, LEGACY_PREMIUM_KEY, deriveOwnership, type EntitlementSnapshot } from './entitlements';
import { PURCHASE_FLOW } from '../config/monetization.config';
import type { AnalyticsEvent } from './analyticsEvents';

// P00-T16 (D-09, MONETIZATION.md A.1, A.4, A.5, A.12, A.13; DECISIONS A-06): the IAP state machine against a fake
// RevenueCat module. Success means the target entitlement is active; nothing else counts.

const NOW = 1_800_000_000_000;

const PRODUCT_ENTITLEMENTS: Record<string, string[]> = {
  remove_ads: ['no_ads'],
  starter_pack: ['no_ads', 'pack_starter'],
  premium_collection_pack: ['pack_premium_collection'],
  founders_pack: ['no_ads', 'pack_founders'],
};

function pkg(identifier: string, product: string, priceString: string) {
  return {
    identifier,
    packageType: 'CUSTOM',
    product: { identifier: product, priceString, title: product },
    offeringIdentifier: 'default',
    presentedOfferingContext: { offeringIdentifier: 'default', placementIdentifier: null, targetingContext: null },
  };
}

const PACKAGES_ALL = [
  pkg('remove_ads', 'remove_ads', '₪7.90'),
  pkg('starter', 'starter_pack', '₪11.90'),
  pkg('premium_collection', 'premium_collection_pack', '₪19.90'),
  pkg('founders', 'founders_pack', '₪29.90'),
];

function rcError(code: string): Error & { code: string } {
  return Object.assign(new Error(`rc error ${code}`), { code });
}

function fakeRC(opts: { active?: string[]; appUserID?: string; packages?: ReturnType<typeof pkg>[] } = {}) {
  const st = {
    active: new Set<string>(opts.active ?? []),
    appUserID: opts.appUserID ?? '$RCAnonymousID:fresh',
    packages: opts.packages ?? PACKAGES_ALL,
    listener: null as null | ((info: unknown) => void),
  };
  const info = () => ({
    entitlements: { active: Object.fromEntries([...st.active].map((id) => [id, { identifier: id, isActive: true }])) },
  });
  const rc = {
    setLogLevel: vi.fn(async () => undefined),
    configure: vi.fn(async () => undefined),
    addCustomerInfoUpdateListener: vi.fn(async (l: (info: unknown) => void) => {
      st.listener = l;
      return 'listener-1';
    }),
    getCustomerInfo: vi.fn(async () => ({ customerInfo: info() })),
    getOfferings: vi.fn(async () => ({ all: {}, current: { identifier: 'default', availablePackages: st.packages } })),
    purchasePackage: vi.fn(async ({ aPackage }: { aPackage: ReturnType<typeof pkg> }) => {
      for (const e of PRODUCT_ENTITLEMENTS[aPackage.product.identifier] ?? []) st.active.add(e);
      return { productIdentifier: aPackage.product.identifier, customerInfo: info(), transaction: {} };
    }),
    restorePurchases: vi.fn(async () => ({ customerInfo: info() })),
    getAppUserID: vi.fn(async () => ({ appUserID: st.appUserID })),
  };
  return { rc, st, info, emit: () => st.listener?.(info()) };
}

function harness(over: Partial<IAPDeps> = {}, rcOpts: Parameters<typeof fakeRC>[0] = {}) {
  const fake = fakeRC(rcOpts);
  const storage = new Map<string, string>();
  const box = { snapshot: EMPTY_SNAPSHOT as EntitlementSnapshot, now: NOW };
  const events: AnalyticsEvent[] = [];
  const flow: boolean[] = [];
  let foreground: (() => void) | null = null;
  const mod = { Purchases: fake.rc, LOG_LEVEL: { DEBUG: 'DEBUG' } } as unknown as PurchasesModule;
  const deps: IAPDeps = {
    native: true,
    platform: 'android',
    dev: false,
    apiKey: 'goog_test_public_key',
    loadPurchases: vi.fn(async () => mod),
    store: {
      read: () => box.snapshot,
      write: (s) => {
        box.snapshot = s;
      },
    },
    kv: {
      get: (k) => storage.get(k) ?? null,
      write: (k, v) => void storage.set(k, v),
      remove: vi.fn(async (k: string) => {
        storage.delete(k);
        return true;
      }),
    },
    track: (e) => void events.push(e),
    report: vi.fn(),
    now: () => box.now,
    sleep: vi.fn(async () => undefined),
    onForeground: (l) => {
      foreground = l;
    },
    setExternalFlow: (active) => void flow.push(active),
    ...over,
  };
  const iap = createIAP(deps);
  const names = () => events.map((e) => e.name);
  const failedReasons = () => events.filter((e) => e.name === 'purchase_failed').map((e) => e.params.reason);
  return { iap, deps, fake, rc: fake.rc, storage, box, events, names, failedReasons, flow, foreground: () => foreground?.() };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

// A returning install: this RevenueCat identity's A-06 silent restore is already done.
const markRestored = (storage: Map<string, string>, id: string) =>
  storage.set(SILENT_RESTORE_KEY, JSON.stringify({ id, done: true, attempts: 1, nextAt: 0 }));
const restoreRecord = (storage: Map<string, string>) => JSON.parse(storage.get(SILENT_RESTORE_KEY) ?? 'null');
const LIMIT = {
  perSession: PURCHASE_FLOW.SILENT_RESTORE_MAX_PER_SESSION,
  attempts: PURCHASE_FLOW.SILENT_RESTORE_MAX_ATTEMPTS,
  base: PURCHASE_FLOW.SILENT_RESTORE_BACKOFF_BASE_MS,
  max: PURCHASE_FLOW.SILENT_RESTORE_BACKOFF_MAX_MS,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('init (A.1 sequence)', () => {
  it('configures anonymously, registers the listener, then reads customer info and offerings, in that order', async () => {
    const h = harness({ dev: true });
    await h.iap.init();
    expect(h.iap.state()).toBe('ready');
    expect(h.rc.configure).toHaveBeenCalledWith({ apiKey: 'goog_test_public_key' }); // no appUserID
    expect(h.rc.setLogLevel).toHaveBeenCalledWith({ level: 'DEBUG' });
    const order = [h.rc.setLogLevel, h.rc.configure, h.rc.addCustomerInfoUpdateListener, h.rc.getCustomerInfo, h.rc.getOfferings].map(
      (f) => f.mock.invocationCallOrder[0],
    );
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('debug logging only in DEV builds', async () => {
    const h = harness({ dev: false });
    await h.iap.init();
    expect(h.rc.setLogLevel).not.toHaveBeenCalled();
  });

  it('is memoized: a second init does nothing more', async () => {
    const h = harness();
    await Promise.all([h.iap.init(), h.iap.init()]);
    await h.iap.init();
    expect(h.deps.loadPurchases).toHaveBeenCalledTimes(1);
    expect(h.rc.configure).toHaveBeenCalledTimes(1);
  });

  it('applies the explicit getCustomerInfo (the Android listener does not replay current state)', async () => {
    const h = harness({}, { active: ['no_ads', 'pack_founders'], appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    await h.iap.init();
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_founders']);
    expect(h.box.snapshot.at).toBe(NOW);
    expect(h.iap.isPremium()).toBe(true);
  });

  it('an empty API key: "unconfigured", the SDK is never loaded, and nothing throws', async () => {
    const h = harness({ apiKey: '' });
    await h.iap.init();
    expect(h.iap.state()).toBe('unconfigured');
    expect(h.deps.loadPurchases).not.toHaveBeenCalled();
    expect(await h.iap.buy('remove_ads')).toBe('unavailable');
    expect(await h.iap.restore()).toEqual({ outcome: 'unavailable', restored: [] });
    expect(h.iap.price('remove_ads')).toBeNull();
  });

  it('the plugin failing to load: "failed", buy retries init once, then "unavailable"; never throws', async () => {
    const h = harness({ loadPurchases: vi.fn(async () => Promise.reject(new Error('plugin missing'))) });
    await h.iap.init();
    expect(h.iap.state()).toBe('failed');
    expect(await h.iap.buy('remove_ads')).toBe('unavailable');
    expect(h.deps.loadPurchases).toHaveBeenCalledTimes(2);
    expect(h.failedReasons()).toContain('unavailable');
  });

  it('a failed init is retried on the next foreground', async () => {
    const fake = fakeRC();
    let fail = true;
    const loadPurchases = vi.fn(async () => {
      if (fail) throw new Error('bridge not ready');
      return { Purchases: fake.rc, LOG_LEVEL: { DEBUG: 'DEBUG' } } as unknown as PurchasesModule;
    });
    const h = harness({ loadPurchases });
    await h.iap.init();
    expect(h.iap.state()).toBe('failed');
    fail = false;
    h.foreground();
    await settle();
    await settle();
    expect(h.iap.state()).toBe('ready');
  });
});

describe('the snapshot is never revoked without a successful RevenueCat answer', () => {
  const seeded: EntitlementSnapshot = { v: 1, active: ['no_ads'], at: 0, pending: [] };

  it('offline at boot: getCustomerInfo fails, the seeded no_ads stays (A.12)', async () => {
    const h = harness();
    h.box.snapshot = seeded;
    h.rc.getCustomerInfo.mockRejectedValue(rcError('10'));
    await h.iap.init();
    expect(h.iap.isPremium()).toBe(true);
    expect(h.box.snapshot).toEqual(seeded);
  });

  it('the first successful answer replaces the seed with the store truth and drops the legacy key (§9)', async () => {
    const h = harness({}, { active: [], appUserID: 'u1' });
    markRestored(h.storage, 'u1'); // not a fresh install
    h.storage.set(LEGACY_PREMIUM_KEY, '1');
    h.box.snapshot = seeded;
    await h.iap.init();
    expect(h.iap.isPremium()).toBe(false);
    expect(h.box.snapshot.at).toBe(NOW);
    expect(h.deps.kv.remove).toHaveBeenCalledWith(LEGACY_PREMIUM_KEY);
    expect(h.storage.has(LEGACY_PREMIUM_KEY)).toBe(false);
  });

  it('keeps the legacy key while RevenueCat has not answered', async () => {
    const h = harness();
    h.storage.set(LEGACY_PREMIUM_KEY, '1');
    h.rc.getCustomerInfo.mockRejectedValue(rcError('35'));
    await h.iap.init();
    expect(h.deps.kv.remove).not.toHaveBeenCalled();
  });

  it('a malformed SDK answer is ignored, never read as "nothing active"', async () => {
    const h = harness({}, { appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    h.box.snapshot = { v: 1, active: ['no_ads', 'pack_starter'], at: 5, pending: [] };
    h.rc.getCustomerInfo.mockResolvedValue({ customerInfo: undefined } as never);
    await h.iap.init();
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_starter']);
  });
});

describe('A-06: one silent restore per new RevenueCat identity on Android', () => {
  it('a new identity with nothing active runs restorePurchases once and applies it', async () => {
    const h = harness({}, { active: [], appUserID: '$RCAnonymousID:new' });
    h.rc.restorePurchases.mockImplementation(async () => {
      h.fake.st.active.add('no_ads');
      h.fake.st.active.add('pack_premium_collection');
      return { customerInfo: h.fake.info() };
    });
    await h.iap.init();
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(1);
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_premium_collection']);
    expect(restoreRecord(h.storage)).toMatchObject({ id: '$RCAnonymousID:new', done: true });
    expect(h.names()).not.toContain('restore'); // silent: no user-initiated restore event, no toast
  });

  it('runs once: the next launch with the same identity does not restore again', async () => {
    const h = harness({}, { active: [], appUserID: '$RCAnonymousID:new' });
    await h.iap.init();
    const again = harness({}, { active: [], appUserID: '$RCAnonymousID:new' });
    for (const [k, v] of h.storage) again.storage.set(k, v);
    await again.iap.init();
    expect(again.rc.restorePurchases).not.toHaveBeenCalled();
  });

  it('a reinstall restored from backup (old identity recorded, snapshot restored) restores before revoking', async () => {
    const h = harness({}, { active: [], appUserID: '$RCAnonymousID:new' });
    markRestored(h.storage, '$RCAnonymousID:old');
    h.box.snapshot = { v: 1, active: ['no_ads', 'pack_founders'], at: 123, pending: [] };
    h.rc.restorePurchases.mockImplementation(async () => {
      h.fake.st.active.add('no_ads');
      h.fake.st.active.add('pack_founders');
      return { customerInfo: h.fake.info() };
    });
    await h.iap.init();
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(1);
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_founders']);
  });

  it('M3: restores even when the new identity already reports entitlements', async () => {
    const h = harness({}, { active: ['pack_premium_collection'], appUserID: 'u2' });
    h.box.snapshot = { v: 1, active: ['no_ads', 'pack_founders'], at: 9, pending: [] }; // restored from backup
    h.rc.restorePurchases.mockImplementation(async () => {
      for (const e of ['no_ads', 'pack_founders']) h.fake.st.active.add(e);
      return { customerInfo: h.fake.info() };
    });
    await h.iap.init();
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(1);
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_premium_collection', 'pack_founders']);
    expect(restoreRecord(h.storage)).toMatchObject({ id: 'u2', done: true });
  });

  it('M3: offline first launch, then a purchase and a listener update: nothing is revoked, and the restore still runs', async () => {
    const h = harness({}, { active: [], appUserID: '$RCAnonymousID:new' });
    h.box.snapshot = { v: 1, active: ['no_ads', 'pack_founders'], at: 9, pending: [] }; // restored from backup
    h.rc.getCustomerInfo.mockRejectedValueOnce(rcError('35'));
    await h.iap.init(); // offline: no answer, no restore yet
    expect(h.rc.restorePurchases).not.toHaveBeenCalled();

    // A purchase answers with the store truth of the NEW identity only: it must not revoke the backed-up packs.
    expect(await h.iap.buy('premium_collection')).toBe('purchased');
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_premium_collection', 'pack_founders']);
    h.fake.emit(); // a non-empty listener update: still merged, never revoking
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_premium_collection', 'pack_founders']);

    // Back online: the identity's one silent restore runs (it is not skipped because entitlements now exist).
    h.rc.restorePurchases.mockImplementation(async () => {
      for (const e of ['no_ads', 'pack_founders']) h.fake.st.active.add(e);
      return { customerInfo: h.fake.info() };
    });
    h.foreground();
    await settle();
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(1);
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_premium_collection', 'pack_founders']);
    expect(h.box.snapshot.at).toBe(NOW);
    // From now on the store is authoritative: a refund revokes.
    h.fake.st.active.delete('pack_founders');
    h.fake.emit();
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_premium_collection']);
  });

  it('a failing silent restore keeps the snapshot (merge only) and retries after the backoff', async () => {
    const h = harness({}, { active: [], appUserID: '$RCAnonymousID:new' });
    h.box.snapshot = { v: 1, active: ['no_ads'], at: 123, pending: [] };
    h.rc.restorePurchases.mockRejectedValue(rcError('2'));
    await h.iap.init();
    expect(h.box.snapshot.active).toEqual(['no_ads']);
    expect(restoreRecord(h.storage)).toEqual({ id: '$RCAnonymousID:new', done: false, attempts: 1, offline: 0, nextAt: NOW + LIMIT.base });
    h.fake.emit(); // an empty update cannot revoke while the identity's restore is outstanding
    expect(h.box.snapshot.active).toEqual(['no_ads']);

    h.foreground(); // inside the backoff window: no attempt
    await settle();
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(1);

    h.rc.restorePurchases.mockImplementation(async () => ({ customerInfo: h.fake.info() }));
    h.box.now = NOW + LIMIT.base;
    h.foreground();
    await settle();
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(2);
    expect(restoreRecord(h.storage)).toMatchObject({ id: '$RCAnonymousID:new', done: true });
  });

  it('M4: a persistently failing restore is capped per session and reported once', async () => {
    const h = harness({}, { active: [], appUserID: 'u3' });
    h.rc.restorePurchases.mockRejectedValue(rcError('2'));
    await h.iap.init();
    for (let i = 1; i <= 6; i++) {
      h.box.now = NOW + i * LIMIT.max; // always past any backoff
      h.foreground();
      await settle();
    }
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(LIMIT.perSession);
    expect((h.deps.report as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[1] === 'iap.silentRestore')).toHaveLength(1);
  });

  it('M4: across launches it backs off exponentially, then gives up (the store truth applies; Restore stays)', async () => {
    const storage = new Map<string, string>();
    let now = NOW;
    let launches = 0;
    let attempts = 0;
    let last: ReturnType<typeof harness> | null = null;
    while (launches < 40) {
      const h = harness({}, { active: [], appUserID: 'u4' });
      for (const [k, v] of storage) h.storage.set(k, v);
      h.box.now = now;
      h.box.snapshot = { v: 1, active: ['no_ads'], at: 5, pending: [] };
      h.rc.restorePurchases.mockRejectedValue(rcError('2'));
      await h.iap.init();
      attempts += h.rc.restorePurchases.mock.calls.length;
      for (const [k, v] of h.storage) storage.set(k, v);
      last = h;
      launches++;
      const rec = restoreRecord(storage);
      if (rec.attempts >= LIMIT.attempts) break;
      now = rec.nextAt; // the next launch happens exactly when the backoff allows it
    }
    expect(attempts).toBe(LIMIT.attempts);
    const rec = restoreRecord(storage);
    expect(rec.done).toBe(false);
    // gave up: the next launch makes no attempt and applies the store truth (here: nothing), so no_ads is revoked
    const h = harness({}, { active: [], appUserID: 'u4' });
    for (const [k, v] of storage) h.storage.set(k, v);
    h.box.now = now + LIMIT.max * 10;
    h.box.snapshot = { v: 1, active: ['no_ads'], at: 5, pending: [] };
    await h.iap.init();
    expect(h.rc.restorePurchases).not.toHaveBeenCalled();
    expect(h.iap.isPremium()).toBe(false);
    expect(last).not.toBeNull();
  });

  // P00-T17 (T15/T16 review): a network failure lengthens the backoff but never counts toward the give-up cap, or 'replace'
  // could revoke a backup-restored snapshot after enough offline launches.
  it('network failures (10 / 35) of the silent restore never give up: the backoff grows, attempts stay 0, nothing is revoked', async () => {
    const storage = new Map<string, string>();
    let now = NOW;
    const launches = LIMIT.attempts + 4; // well past the cap that real store errors hit
    for (let launch = 0; launch < launches; launch++) {
      const h = harness({}, { active: [], appUserID: 'u5' });
      for (const [k, v] of storage) h.storage.set(k, v);
      h.box.now = now;
      h.box.snapshot = { v: 1, active: ['no_ads', 'pack_founders'], at: 5, pending: [] }; // a snapshot restored from backup
      h.rc.restorePurchases.mockRejectedValue(rcError(launch % 2 ? '35' : '10'));
      await h.iap.init();
      expect(h.rc.restorePurchases, `launch ${launch}`).toHaveBeenCalledTimes(1); // never given up
      expect(h.box.snapshot.active, `launch ${launch}`).toEqual(['no_ads', 'pack_founders']); // never revoked
      expect(h.iap.isPremium()).toBe(true);
      expect((h.deps.report as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[1] === 'iap.silentRestore')).toHaveLength(0); // offline is not a defect
      for (const [k, v] of h.storage) storage.set(k, v);
      const rec = restoreRecord(storage);
      expect(rec.attempts).toBe(0);
      expect(rec.offline).toBe(launch + 1);
      expect(rec.nextAt - now).toBe(Math.min(LIMIT.base * 2 ** launch, LIMIT.max)); // exponential, capped
      now = rec.nextAt;
    }
    // Back online at last: the one restore answers and the record is done.
    const h = harness({}, { active: [], appUserID: 'u5' });
    for (const [k, v] of storage) h.storage.set(k, v);
    h.box.now = now;
    h.box.snapshot = { v: 1, active: ['no_ads', 'pack_founders'], at: 5, pending: [] };
    h.rc.restorePurchases.mockImplementation(async () => {
      for (const e of ['no_ads', 'pack_founders']) h.fake.st.active.add(e);
      return { customerInfo: h.fake.info() };
    });
    await h.iap.init();
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_founders']);
    expect(restoreRecord(h.storage)).toMatchObject({ id: 'u5', done: true, offline: 0 });
  });

  it('a network failure of the silent restore waits for the backoff before the next attempt', async () => {
    const h = harness({}, { active: [], appUserID: 'u6' });
    h.rc.restorePurchases.mockRejectedValue(rcError('35'));
    await h.iap.init();
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(1);
    h.foreground(); // inside the backoff window
    await settle();
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(1);
    h.box.now = NOW + LIMIT.base;
    h.foreground();
    await settle();
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(2);
  });

  it('M4: an unreadable identity (getAppUserID fails) is restored once, then not every launch', async () => {
    const h = harness({}, { active: [] });
    h.rc.getAppUserID.mockRejectedValue(new Error('no id'));
    await h.iap.init();
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(1);
    expect(restoreRecord(h.storage)).toMatchObject({ id: null, done: true });
    const again = harness({}, { active: [] });
    for (const [k, v] of h.storage) again.storage.set(k, v);
    again.rc.getAppUserID.mockRejectedValue(new Error('no id'));
    await again.iap.init();
    expect(again.rc.restorePurchases).not.toHaveBeenCalled();
  });

  it('never on iOS', async () => {
    const h = harness({ platform: 'ios' }, { active: [] });
    await h.iap.init();
    expect(h.rc.restorePurchases).not.toHaveBeenCalled();
  });
});

describe('buy (A.4 state machine)', () => {
  async function ready(over: Partial<IAPDeps> = {}, rcOpts: Parameters<typeof fakeRC>[0] = {}) {
    const h = harness(over, { appUserID: 'u1', ...rcOpts });
    markRestored(h.storage, 'u1');
    await h.iap.init();
    return h;
  }

  it('Success: passes the EXACT package object from getOfferings and resolves "purchased" once the entitlement is active', async () => {
    const h = await ready();
    expect(await h.iap.buy('starter')).toBe('purchased');
    expect(h.rc.purchasePackage).toHaveBeenCalledTimes(1);
    expect(h.rc.purchasePackage.mock.calls[0][0].aPackage).toBe(PACKAGES_ALL[1]);
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_starter']);
    expect(deriveOwnership(h.box.snapshot.active).bundleCosmetics).toEqual(['trail_galaxy']);
    expect(h.names()).toEqual(['purchase_initiated', 'purchase_completed', 'first_purchase']);
    expect(h.storage.get(FIRST_PURCHASE_KEY)).toBe('1');
  });

  it('first_purchase fires once per device', async () => {
    const h = await ready();
    await h.iap.buy('remove_ads');
    await h.iap.buy('founders');
    expect(h.names().filter((n) => n === 'first_purchase')).toHaveLength(1);
    expect(h.names().filter((n) => n === 'purchase_completed')).toHaveLength(2);
  });

  it('every D-09 package buys its own product', async () => {
    for (const [packageId, i] of [['remove_ads', 0], ['starter', 1], ['premium_collection', 2], ['founders', 3]] as const) {
      const h = await ready();
      expect(await h.iap.buy(packageId)).toBe('purchased');
      expect(h.rc.purchasePackage.mock.calls[0][0].aPackage).toBe(PACKAGES_ALL[i]);
    }
  });

  it('raises the external-flow flag around the Play sheet and clears it afterwards', async () => {
    const h = await ready();
    let during: boolean | undefined;
    h.rc.purchasePackage.mockImplementationOnce(async ({ aPackage }) => {
      during = h.flow[h.flow.length - 1];
      for (const e of PRODUCT_ENTITLEMENTS[aPackage.product.identifier]) h.fake.st.active.add(e);
      return { productIdentifier: aPackage.product.identifier, customerInfo: h.fake.info(), transaction: {} };
    });
    await h.iap.buy('remove_ads');
    expect(during).toBe(true);
    expect(h.flow).toEqual([true, false]);
  });

  it('clears the external-flow flag when the sheet rejects', async () => {
    const h = await ready();
    h.rc.purchasePackage.mockRejectedValueOnce(rcError('2'));
    await h.iap.buy('remove_ads');
    expect(h.flow).toEqual([true, false]);
  });

  it('inFlight() is true for the duration of a purchase, and a second tap is a silent no-op', async () => {
    const h = await ready();
    let release!: () => void;
    h.rc.purchasePackage.mockImplementationOnce(
      ({ aPackage }) =>
        new Promise((resolve) => {
          release = () => {
            for (const e of PRODUCT_ENTITLEMENTS[aPackage.product.identifier]) h.fake.st.active.add(e);
            resolve({ productIdentifier: aPackage.product.identifier, customerInfo: h.fake.info(), transaction: {} } as never);
          };
        }),
    );
    const first = h.iap.buy('remove_ads');
    await settle();
    expect(h.iap.inFlight()).toBe(true);
    expect(await h.iap.buy('remove_ads')).toBe('cancelled');
    expect(await h.iap.restore()).toEqual({ outcome: 'busy', restored: [] });
    release();
    expect(await first).toBe('purchased');
    expect(h.iap.inFlight()).toBe(false);
    expect(h.rc.purchasePackage).toHaveBeenCalledTimes(1);
  });

  it('never [0]: a package missing from the offering is "unavailable" and no sheet opens', async () => {
    const h = await ready({}, { packages: [PACKAGES_ALL[0], PACKAGES_ALL[1]] });
    expect(await h.iap.buy('founders')).toBe('unavailable');
    expect(h.rc.purchasePackage).not.toHaveBeenCalled();
    expect(h.failedReasons()).toEqual(['no_package']);
    expect(h.rc.getOfferings).toHaveBeenCalledTimes(2); // one re-fetch before giving up
  });

  it('an unknown package id is "unavailable" without touching the SDK', async () => {
    const h = await ready();
    expect(await h.iap.buy('not_a_package')).toBe('unavailable');
    expect(h.rc.purchasePackage).not.toHaveBeenCalled();
  });

  it('offerings that failed at boot are fetched at buy time', async () => {
    const h = harness({}, { appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    h.rc.getOfferings.mockRejectedValueOnce(rcError('10'));
    await h.iap.init();
    expect(h.iap.price('remove_ads')).toBeNull();
    expect(await h.iap.buy('remove_ads')).toBe('purchased');
  });

  it('code 1 (cancelled): silent "cancelled", no grant, no completion', async () => {
    const h = await ready();
    h.rc.purchasePackage.mockRejectedValueOnce(rcError('1'));
    expect(await h.iap.buy('founders')).toBe('cancelled');
    expect(h.box.snapshot.active).toEqual([]);
    expect(h.failedReasons()).toEqual(['cancelled']);
    expect(h.names()).not.toContain('purchase_completed');
  });

  it('code 20 (pending): "pending", a persisted marker, no grant; the listener completes it later', async () => {
    const h = await ready();
    h.rc.purchasePackage.mockRejectedValueOnce(rcError('20'));
    expect(await h.iap.buy('starter')).toBe('pending');
    expect(h.box.snapshot.active).toEqual([]);
    expect(h.box.snapshot.pending).toEqual([{ productId: 'starter_pack', at: NOW }]);
    expect(h.iap.isPending('starter')).toBe(true);
    expect(h.names()).toEqual(['purchase_initiated', 'purchase_pending']);
    expect(h.names()).not.toContain('purchase_completed');

    // A pending product never opens a second sheet.
    expect(await h.iap.buy('starter')).toBe('pending');
    expect(h.rc.purchasePackage).toHaveBeenCalledTimes(1);

    // Payment clears: RevenueCat pushes the new CustomerInfo through the listener.
    h.fake.st.active.add('no_ads');
    h.fake.st.active.add('pack_starter');
    h.fake.emit();
    expect(h.box.snapshot.active).toEqual(['no_ads', 'pack_starter']);
    expect(h.box.snapshot.pending).toEqual([]);
    expect(h.iap.isPending('starter')).toBe(false);
    expect(h.names().filter((n) => n === 'purchase_completed')).toHaveLength(1);
  });

  it('pending completes on the next foreground refresh too', async () => {
    const h = await ready();
    h.rc.purchasePackage.mockRejectedValueOnce(rcError('20'));
    await h.iap.buy('remove_ads');
    h.fake.st.active.add('no_ads');
    h.foreground();
    await settle();
    expect(h.iap.isPremium()).toBe(true);
    expect(h.names()).toContain('purchase_completed');
  });

  it('a pending marker expires after the TTL', async () => {
    const h = await ready();
    h.rc.purchasePackage.mockRejectedValueOnce(rcError('20'));
    await h.iap.buy('remove_ads');
    h.box.now = NOW + PURCHASE_FLOW.PENDING_TTL_MS + 1;
    expect(h.iap.isPending('remove_ads')).toBe(false);
    h.fake.emit();
    expect(h.box.snapshot.pending).toEqual([]);
  });

  it('code 6 (already purchased): runs restore and reports "purchased" when the entitlement comes back', async () => {
    const h = await ready();
    h.rc.purchasePackage.mockRejectedValueOnce(rcError('6'));
    h.rc.restorePurchases.mockImplementationOnce(async () => {
      h.fake.st.active.add('pack_premium_collection');
      return { customerInfo: h.fake.info() };
    });
    expect(await h.iap.buy('premium_collection')).toBe('purchased');
    expect(h.rc.restorePurchases).toHaveBeenCalledTimes(1);
    expect(h.box.snapshot.active).toEqual(['pack_premium_collection']);
    expect(h.failedReasons()).toEqual(['already_owned']);
    expect(h.names()).toContain('restore');
    expect(h.names()).not.toContain('purchase_completed'); // nothing was bought now
  });

  it('code 6 with nothing found by the restore: "error"', async () => {
    const h = await ready();
    h.rc.purchasePackage.mockRejectedValueOnce(rcError('6'));
    expect(await h.iap.buy('premium_collection')).toBe('error');
  });

  it('codes 10 and 35 (network / offline): "network"', async () => {
    for (const code of ['10', '35']) {
      const h = await ready();
      h.rc.purchasePackage.mockRejectedValueOnce(rcError(code));
      expect(await h.iap.buy('remove_ads')).toBe('network');
      expect(h.failedReasons()).toEqual(['network']);
      expect(h.iap.isPremium()).toBe(false);
    }
  });

  it('code 42 (Test Store simulated failure) and any other code: "error", no grant', async () => {
    for (const code of ['42', '2', '5', 'UNIMPLEMENTED']) {
      const h = await ready();
      h.rc.purchasePackage.mockRejectedValueOnce(rcError(code));
      expect(await h.iap.buy('founders'), code).toBe('error');
      expect(h.box.snapshot.active, code).toEqual([]);
      expect(h.failedReasons(), code).toEqual(['error']);
    }
  });

  it('Verifying: resolved without the entitlement -> re-read after 2 s -> "purchased" if it is active now', async () => {
    const h = await ready();
    h.rc.purchasePackage.mockImplementationOnce(async () => ({ productIdentifier: 'founders_pack', customerInfo: h.fake.info(), transaction: {} }) as never);
    h.rc.getCustomerInfo.mockImplementationOnce(async () => {
      h.fake.st.active.add('no_ads');
      h.fake.st.active.add('pack_founders');
      return { customerInfo: h.fake.info() };
    });
    expect(await h.iap.buy('founders')).toBe('purchased');
    expect(h.deps.sleep).toHaveBeenCalledWith(PURCHASE_FLOW.VERIFY_DELAY_MS);
    expect(h.names()).toContain('purchase_completed');
  });

  it('M5: still inactive after the re-read -> "pending" with a marker (never told it failed); a late grant completes it', async () => {
    const h = await ready();
    h.rc.purchasePackage.mockImplementationOnce(async () => ({ productIdentifier: 'founders_pack', customerInfo: h.fake.info(), transaction: {} }) as never);
    expect(await h.iap.buy('founders')).toBe('pending');
    expect(h.box.snapshot.pending).toEqual([{ productId: 'founders_pack', at: NOW }]);
    expect(h.iap.isPending('founders')).toBe(true);
    expect(h.names()).toEqual(['purchase_initiated', 'purchase_pending']);
    expect(h.failedReasons()).toEqual([]);
    expect((h.deps.report as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[1])).toContain('iap.notEntitled');
    // RevenueCat catches up: the listener grants it and purchase_completed fires exactly once.
    h.fake.st.active.add('no_ads');
    h.fake.st.active.add('pack_founders');
    h.fake.emit();
    h.fake.emit();
    expect(h.iap.isPending('founders')).toBe(false);
    expect(h.names().filter((n) => n === 'purchase_completed')).toHaveLength(1);
  });

  it('Starter is "purchased" only when pack_starter is active, not because no_ads already was', async () => {
    const h = await ready({}, { active: ['no_ads'] });
    h.rc.purchasePackage.mockImplementationOnce(async () => ({ productIdentifier: 'starter_pack', customerInfo: h.fake.info(), transaction: {} }) as never);
    expect(await h.iap.buy('starter')).toBe('pending');
    expect(h.names()).not.toContain('purchase_completed');
  });

  it('M6: an expired, unpruned marker never adds a second purchase_completed to a later real purchase', async () => {
    const h = await ready();
    h.box.snapshot = { ...h.box.snapshot, pending: [{ productId: 'remove_ads', at: NOW - PURCHASE_FLOW.PENDING_TTL_MS - 1 }] };
    expect(await h.iap.buy('remove_ads')).toBe('purchased');
    expect(h.names().filter((n) => n === 'purchase_completed')).toHaveLength(1);
    expect(h.box.snapshot.pending).toEqual([]);
  });

  it('nit: purchase_initiated fires only for a real attempt (not for an owned or pending short-circuit)', async () => {
    const h = await ready({}, { active: ['no_ads'] });
    expect(await h.iap.buy('remove_ads')).toBe('purchased'); // owned
    h.box.snapshot = { ...h.box.snapshot, pending: [{ productId: 'founders_pack', at: NOW }] };
    expect(await h.iap.buy('founders')).toBe('pending'); // pending
    expect(h.names()).toEqual([]);
  });

  it('an already-owned product resolves "purchased" without opening a sheet', async () => {
    const h = await ready({}, { active: ['no_ads'] });
    expect(await h.iap.buy('remove_ads')).toBe('purchased');
    expect(h.rc.purchasePackage).not.toHaveBeenCalled();
  });

  it('a purchase result without customerInfo does not revoke what the player owns', async () => {
    const h = await ready({}, { active: ['pack_premium_collection'] });
    h.rc.purchasePackage.mockImplementationOnce(async () => ({ productIdentifier: 'remove_ads' }) as never);
    await h.iap.buy('remove_ads');
    expect(h.box.snapshot.active).toContain('pack_premium_collection');
  });
});

describe('restore (A.5: all entitlements, user-initiated)', () => {
  it('restores every entitlement, bundles included, and lists them', async () => {
    const h = harness({}, { active: [], appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    await h.iap.init();
    for (const e of ['no_ads', 'pack_starter', 'pack_premium_collection', 'pack_founders']) h.fake.st.active.add(e);
    const r = await h.iap.restore();
    expect(r).toEqual({ outcome: 'restored', restored: ['no_ads', 'pack_starter', 'pack_premium_collection', 'pack_founders'] });
    expect([...deriveOwnership(h.box.snapshot.active).bundleCosmetics].sort()).toEqual(
      ['arrival_bolt', 'cosmic_blackhole', 'mythic_dragon', 'mythic_phoenix', 'trail_galaxy'],
    );
    expect(h.names()).toContain('restore');
  });

  it('nothing to restore: "none"', async () => {
    const h = harness({}, { appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    await h.iap.init();
    expect(await h.iap.restore()).toEqual({ outcome: 'none', restored: [] });
  });

  it('offline: "network", the snapshot is kept', async () => {
    const h = harness({}, { active: ['no_ads'], appUserID: 'u1' });
    await h.iap.init();
    h.rc.restorePurchases.mockRejectedValueOnce(rcError('35'));
    expect(await h.iap.restore()).toEqual({ outcome: 'network', restored: [] });
    expect(h.iap.isPremium()).toBe(true);
  });

  async function withPendingFounders() {
    const h = harness({}, { appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    await h.iap.init();
    h.rc.purchasePackage.mockRejectedValueOnce(rcError('20'));
    await h.iap.buy('founders');
    expect(h.iap.isPending('founders')).toBe(true);
    return h;
  }

  it('M2: a plain restore (Settings / shop) keeps a still-pending marker: no second Buy button', async () => {
    const h = await withPendingFounders();
    await h.iap.restore();
    expect(h.iap.isPending('founders')).toBe(true);
  });

  it('M2: the code-6 restore of another product keeps an unrelated pending marker', async () => {
    const h = await withPendingFounders();
    h.rc.purchasePackage.mockRejectedValueOnce(rcError('6'));
    h.rc.restorePurchases.mockImplementationOnce(async () => {
      h.fake.st.active.add('no_ads');
      return { customerInfo: h.fake.info() };
    });
    expect(await h.iap.buy('remove_ads')).toBe('purchased');
    expect(h.iap.isPending('founders')).toBe(true);
  });

  it('M2: a restore clears the marker of a product it found active', async () => {
    const h = await withPendingFounders();
    h.fake.st.active.add('no_ads');
    h.fake.st.active.add('pack_founders');
    await h.iap.restore();
    expect(h.iap.isPending('founders')).toBe(false);
  });

  it('M2: "Check status" (restore with recheck) clears only that product\'s marker', async () => {
    const h = await withPendingFounders();
    h.box.snapshot = { ...h.box.snapshot, pending: [...h.box.snapshot.pending, { productId: 'starter_pack', at: NOW }] };
    expect(await h.iap.restore({ recheck: 'founders' })).toEqual({ outcome: 'none', restored: [] });
    expect(h.iap.isPending('founders')).toBe(false);
    expect(h.iap.isPending('starter')).toBe(true);
  });

  it('M2: a failed "Check status" keeps the marker', async () => {
    const h = await withPendingFounders();
    h.rc.restorePurchases.mockRejectedValueOnce(rcError('10'));
    expect((await h.iap.restore({ recheck: 'founders' })).outcome).toBe('network');
    expect(h.iap.isPending('founders')).toBe(true);
  });

  it('never calls syncPurchases (restore is restorePurchases only, A.5)', () => {
    const src = readFileSync(fileURLToPath(new URL('./IAP.ts', import.meta.url)), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/syncPurchases/);
    expect(src).toMatch(/restorePurchases\(\)/);
  });
});

describe('listener: refunds and revocations (A.5)', () => {
  it('a refund removes no_ads and the derived cosmetics on the next update', async () => {
    const h = harness({}, { active: ['no_ads', 'pack_founders'], appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    await h.iap.init();
    expect(h.iap.isPremium()).toBe(true);
    h.fake.st.active.clear();
    h.fake.emit();
    expect(h.iap.isPremium()).toBe(false);
    expect(deriveOwnership(h.box.snapshot.active).bundleCosmetics).toEqual([]);
  });

  it('a refund also lands on the next foreground refresh', async () => {
    const h = harness({}, { active: ['no_ads'], appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    await h.iap.init();
    h.fake.st.active.clear();
    h.foreground();
    await settle();
    expect(h.iap.isPremium()).toBe(false);
  });

  it('the foreground refresh is skipped while a purchase sheet is up', async () => {
    const h = harness({}, { appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    await h.iap.init();
    const calls = h.rc.getCustomerInfo.mock.calls.length;
    let release!: () => void;
    h.rc.purchasePackage.mockImplementationOnce(() => new Promise((r) => (release = () => r({ customerInfo: h.fake.info() } as never))));
    const buying = h.iap.buy('remove_ads');
    await settle();
    h.foreground();
    await settle();
    expect(h.rc.getCustomerInfo.mock.calls.length).toBe(calls);
    release();
    await buying;
  });
});

describe('prices (store priceString only)', () => {
  it('reads priceString from the cached offering package', async () => {
    const h = harness();
    expect(h.iap.price('founders')).toBeNull(); // before offerings load
    await h.iap.init();
    expect(h.iap.price('remove_ads')).toBe('₪7.90');
    expect(h.iap.price('founders')).toBe('₪29.90');
    expect(h.iap.price('nope')).toBeNull();
  });
});

describe('crash reports (P00-T17 review: dedupe by context AND error code)', () => {
  const reportsFor = (h: ReturnType<typeof harness>, context: string) =>
    (h.deps.report as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[1] === context).map((c) => (c[0] as { code?: string }).code);

  it('a different error under the same context is still reported; the same error again is not', async () => {
    const h = harness();
    h.rc.getOfferings
      .mockRejectedValueOnce(rcError('3'))
      .mockRejectedValueOnce(rcError('5'))
      .mockRejectedValueOnce(rcError('5'))
      .mockRejectedValueOnce(rcError('3'));
    await h.iap.init(); // getOfferings fails with 3
    for (let i = 0; i < 3; i++) {
      h.foreground(); // offerings still missing: fails with 5, 5, 3
      await settle();
    }
    expect(reportsFor(h, 'iap.getOfferings')).toEqual(['3', '5']); // 3 once, 5 once, the repeats dropped
  });

  it('network codes are still never reported, whatever the context', async () => {
    const h = harness();
    h.rc.getOfferings.mockRejectedValue(rcError('10'));
    await h.iap.init();
    h.foreground();
    await settle();
    expect(reportsFor(h, 'iap.getOfferings')).toEqual([]);
  });
});

describe('purchase UI inputs: storeStatus / owns / refresh (P00-T17)', () => {
  it('web, dev or production: "web" (nothing is offered), and no price', async () => {
    for (const dev of [false, true]) {
      const h = harness({ native: false, platform: 'web', dev });
      await h.iap.init();
      expect(h.iap.storeStatus('remove_ads')).toBe('web');
      expect(h.iap.price('remove_ads')).toBeNull();
    }
  });

  it('native before init, or while it runs: "loading"', async () => {
    const h = harness();
    expect(h.iap.storeStatus('remove_ads')).toBe('loading'); // init never started
    const init = h.iap.init();
    expect(h.iap.storeStatus('remove_ads')).toBe('loading'); // initializing
    await init;
    expect(h.iap.storeStatus('remove_ads')).toBe('ready');
  });

  it('an empty API key: "unavailable" (the store is not configured on this build)', async () => {
    const h = harness({ apiKey: '' });
    await h.iap.init();
    expect(h.iap.storeStatus('remove_ads')).toBe('unavailable');
  });

  it('a failed init is "loading" (retried), then "ready" after refresh()', async () => {
    const fake = fakeRC();
    let fail = true;
    const loadPurchases = vi.fn(async () => {
      if (fail) throw new Error('bridge not ready');
      return { Purchases: fake.rc, LOG_LEVEL: { DEBUG: 'DEBUG' } } as unknown as PurchasesModule;
    });
    const h = harness({ loadPurchases });
    await h.iap.init();
    expect(h.iap.state()).toBe('failed');
    expect(h.iap.storeStatus('remove_ads')).toBe('loading');
    fail = false;
    await h.iap.refresh();
    expect(h.iap.state()).toBe('ready');
    expect(h.iap.storeStatus('remove_ads')).toBe('ready');
    expect(h.iap.price('remove_ads')).toBe('₪7.90');
  });

  it('offerings that failed to load are "loading", and refresh() loads them', async () => {
    const h = harness();
    h.rc.getOfferings.mockRejectedValueOnce(rcError('35'));
    await h.iap.init();
    expect(h.iap.state()).toBe('ready');
    expect(h.iap.storeStatus('founders')).toBe('loading');
    expect(h.iap.price('founders')).toBeNull();
    await h.iap.refresh();
    expect(h.iap.storeStatus('founders')).toBe('ready');
    expect(h.iap.price('founders')).toBe('₪29.90');
  });

  it('offerings that do not contain the package (a dashboard mix-up) are "unavailable", never another package', async () => {
    const h = harness({}, { packages: [pkg('remove_ads', 'remove_ads', '₪7.90')] });
    await h.iap.init();
    expect(h.iap.storeStatus('remove_ads')).toBe('ready');
    expect(h.iap.storeStatus('founders')).toBe('unavailable');
    expect(h.iap.storeStatus('not_a_package')).toBe('unavailable');
  });

  it('an offering with no current set is "unavailable"', async () => {
    const h = harness();
    h.rc.getOfferings.mockResolvedValue({ all: {}, current: null } as never);
    await h.iap.init();
    expect(h.iap.storeStatus('remove_ads')).toBe('unavailable');
  });

  it('refresh() is a no-op on web and never rejects', async () => {
    const web = harness({ native: false, platform: 'web', dev: false });
    await web.iap.refresh();
    expect(web.deps.loadPurchases).not.toHaveBeenCalled();

    const h = harness({}, { appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    h.rc.getOfferings.mockRejectedValue(new Error('boom'));
    await h.iap.init();
    await expect(h.iap.refresh()).resolves.toBeUndefined();
    expect(h.iap.storeStatus('remove_ads')).toBe('loading');
  });

  it('refresh() does nothing while a purchase or restore is running', async () => {
    const h = harness({}, { appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    h.rc.getOfferings.mockRejectedValueOnce(rcError('35'));
    await h.iap.init();
    const offeringCalls = () => h.rc.getOfferings.mock.calls.length;
    expect(offeringCalls()).toBe(1);
    let release: () => void = () => undefined;
    h.rc.restorePurchases.mockImplementationOnce(
      () => new Promise((resolve) => {
        release = () => resolve({ customerInfo: h.fake.info() } as never);
      }),
    );
    const restoring = h.iap.restore();
    await settle();
    expect(h.iap.inFlight()).toBe(true);
    await h.iap.refresh(); // busy: skipped
    expect(offeringCalls()).toBe(1);
    release();
    await restoring;
    await h.iap.refresh();
    expect(offeringCalls()).toBe(2);
  });

  // Review m4: a surface's refresh() used to share one flag with the foreground handler, so an app-foreground event that
  // landed during a slow shop refresh returned at once and was never replayed (a pending payment that completed while the
  // app was backgrounded stayed pending). It is now queued: one trailing reconcile runs when the refresh ends.
  describe('a foreground event during an in-flight refresh() still reconciles (review m4)', () => {
    async function slowRefresh() {
      const h = harness({}, { appUserID: 'u1' });
      markRestored(h.storage, 'u1');
      h.rc.getOfferings.mockRejectedValueOnce(rcError('35')); // init leaves the offerings missing, so refresh() has work
      await h.iap.init();
      let release: () => void = () => undefined;
      h.rc.getOfferings.mockImplementationOnce(
        () => new Promise((resolve) => {
          release = () => resolve({ all: {}, current: { identifier: 'default', availablePackages: PACKAGES_ALL } } as never);
        }),
      );
      const refreshing = h.iap.refresh();
      await settle();
      expect(h.rc.getOfferings).toHaveBeenCalledTimes(2); // refresh() is now parked inside its slow getOfferings
      return { h, refreshing, release: () => release() };
    }

    it('the pending payment that completed meanwhile is applied once the refresh ends', async () => {
      const { h, refreshing, release } = await slowRefresh();
      h.fake.st.active.add('no_ads'); // Play completed the payment while the app was away
      h.foreground(); // lands during the slow refresh
      await settle();
      release();
      await refreshing;
      await settle();
      await settle();
      expect(h.iap.isPremium()).toBe(true);
      expect(h.iap.owns('remove_ads')).toBe(true);
    });

    it('several foreground events during one refresh coalesce into exactly one trailing reconcile', async () => {
      const { h, refreshing, release } = await slowRefresh();
      const before = h.rc.getCustomerInfo.mock.calls.length;
      h.foreground();
      h.foreground();
      h.foreground();
      await settle();
      expect(h.rc.getCustomerInfo.mock.calls.length).toBe(before); // never two reconciles at once
      release();
      await refreshing;
      await settle();
      await settle();
      expect(h.rc.getCustomerInfo.mock.calls.length).toBe(before + 1);
    });

    it('and the queue drains: a later foreground event reconciles again as usual', async () => {
      const { h, refreshing, release } = await slowRefresh();
      h.foreground();
      release();
      await refreshing;
      await settle();
      await settle();
      const after = h.rc.getCustomerInfo.mock.calls.length;
      h.foreground();
      await settle();
      await settle();
      expect(h.rc.getCustomerInfo.mock.calls.length).toBe(after + 1);
    });
  });

  // Review m10(c): a permanently failing init used to read "…" forever. The boot attempt plus one retry failing is
  // definitive: the store is "unavailable" (the cards read "Unavailable"), and a later success clears it.
  describe('a permanently failed init reaches a terminal state (review m10c)', () => {
    function failingPlugin() {
      const fake = fakeRC();
      let fail = true;
      const loadPurchases = vi.fn(async () => {
        if (fail) throw new Error('bridge not ready');
        return { Purchases: fake.rc, LOG_LEVEL: { DEBUG: 'DEBUG' } } as unknown as PurchasesModule;
      });
      return { loadPurchases, heal: () => void (fail = false) };
    }

    it('one failed attempt is still "loading" (a retry is coming); the retry failing too is "unavailable"', async () => {
      const p = failingPlugin();
      const h = harness({ loadPurchases: p.loadPurchases });
      await h.iap.init();
      expect(h.iap.storeStatus('remove_ads')).toBe('loading');
      await h.iap.refresh(); // the surface's retry
      expect(h.iap.state()).toBe('failed');
      expect(h.iap.storeStatus('remove_ads')).toBe('unavailable');
      expect(h.iap.storeStatus('founders')).toBe('unavailable');
      expect(h.iap.price('remove_ads')).toBeNull();
    });

    it('a buy tap retries once too, so after it the failure is terminal', async () => {
      const p = failingPlugin();
      const h = harness({ loadPurchases: p.loadPurchases });
      await h.iap.init();
      expect(await h.iap.buy('remove_ads')).toBe('unavailable');
      expect(h.iap.storeStatus('remove_ads')).toBe('unavailable');
    });

    it('stays "unavailable" while a further retry runs (no flicker back to "…"), then recovers when the plugin does', async () => {
      const fake = fakeRC();
      let mode: 'fail' | 'hang' = 'fail';
      let release: () => void = () => undefined;
      const loadPurchases = vi.fn(async () => {
        if (mode === 'fail') throw new Error('bridge not ready');
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return { Purchases: fake.rc, LOG_LEVEL: { DEBUG: 'DEBUG' } } as unknown as PurchasesModule;
      });
      const h = harness({ loadPurchases });
      await h.iap.init();
      await h.iap.refresh();
      expect(h.iap.storeStatus('remove_ads')).toBe('unavailable');
      mode = 'hang';
      const retry = h.iap.refresh();
      await settle();
      expect(h.iap.state()).toBe('initializing'); // a further retry is really running
      expect(h.iap.storeStatus('remove_ads')).toBe('unavailable'); // not "loading": the player already saw it fail
      release();
      await retry;
      expect(h.iap.state()).toBe('ready');
      expect(h.iap.storeStatus('remove_ads')).toBe('ready');
      expect(h.iap.price('remove_ads')).toBe('₪7.90');
    });

    it('the next foreground retries a terminal failure, and success resets the count', async () => {
      const p = failingPlugin();
      const h = harness({ loadPurchases: p.loadPurchases });
      await h.iap.init();
      await h.iap.refresh();
      expect(h.iap.storeStatus('remove_ads')).toBe('unavailable');
      p.heal();
      h.foreground();
      await settle();
      await settle();
      expect(h.iap.storeStatus('remove_ads')).toBe('ready');
    });
  });

  it('owns(): true only while every entitlement of the product is active (Starter is not owned because no_ads is)', () => {
    const h = harness();
    h.box.snapshot = { v: 1, active: ['no_ads'], at: 5, pending: [] };
    expect(h.iap.owns('remove_ads')).toBe(true);
    expect(h.iap.owns('starter')).toBe(false);
    expect(h.iap.owns('founders')).toBe(false);
    h.box.snapshot = { v: 1, active: ['no_ads', 'pack_starter', 'pack_premium_collection'], at: 5, pending: [] };
    expect(h.iap.owns('starter')).toBe(true);
    expect(h.iap.owns('premium_collection')).toBe(true);
    expect(h.iap.owns('nope')).toBe(false);
  });

  it('a pending product is not owned; "Check status" (restore with recheck) clears only its marker', async () => {
    const h = harness({}, { appUserID: 'u1' });
    markRestored(h.storage, 'u1');
    await h.iap.init();
    h.rc.purchasePackage.mockRejectedValueOnce(rcError('20'));
    expect(await h.iap.buy('starter')).toBe('pending');
    expect(h.iap.isPending('starter')).toBe(true);
    expect(h.iap.owns('starter')).toBe(false);
    const r = await h.iap.restore({ recheck: 'starter' });
    expect(r.outcome).toBe('none');
    expect(h.iap.isPending('starter')).toBe(false);
  });
});

describe('web build (A.13: no web build, dev included, ever grants a paid item)', () => {
  // Review m10(b): the DEV-only grant stub was unreachable from the UI (the web build shows "Available in the Android
  // app"), so it is gone. Under no circumstances may web grant anything.
  for (const dev of [false, true]) {
    it(`${dev ? 'DEV' : 'production'} web: buy and restore are "unavailable" and nothing is granted; the SDK is never loaded`, async () => {
      const h = harness({ native: false, platform: 'web', dev });
      await h.iap.init();
      expect(await h.iap.buy('founders')).toBe('unavailable');
      expect(await h.iap.buy('remove_ads')).toBe('unavailable');
      expect(await h.iap.restore()).toEqual({ outcome: 'unavailable', restored: [] });
      expect(await h.iap.restore({ recheck: 'founders' })).toEqual({ outcome: 'unavailable', restored: [] });
      expect(h.box.snapshot).toEqual(EMPTY_SNAPSHOT);
      expect(h.iap.isPremium()).toBe(false);
      expect(h.iap.owns('founders')).toBe(false);
      expect(h.deps.loadPurchases).not.toHaveBeenCalled();
      expect(h.names()).toEqual([]); // no purchase funnel events from the web build (nit)
    });
  }
});

describe('the app instance (dynamic import behind the native guard)', () => {
  afterEach(() => {
    vi.doUnmock('@revenuecat/purchases-capacitor');
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('../platform/saves');
    vi.doUnmock('./Analytics');
    vi.doUnmock('./Crash');
    vi.doUnmock('../config/monetization.config');
    vi.resetModules();
  });

  async function loadApp(native: boolean) {
    vi.resetModules();
    const fake = fakeRC({ active: ['no_ads'] });
    const factory = vi.fn(() => ({ Purchases: fake.rc, LOG_LEVEL: { DEBUG: 'DEBUG' } }));
    vi.doMock('@revenuecat/purchases-capacitor', factory);
    vi.doMock('@capacitor/core', () => ({
      Capacitor: { isNativePlatform: () => native, getPlatform: () => (native ? 'android' : 'web'), isPluginAvailable: () => false },
      registerPlugin: () => ({}),
    }));
    vi.doMock('../platform/saves', () => ({ Saves: { write: vi.fn(), remove: vi.fn(async () => true), onRestore: vi.fn() } }));
    vi.doMock('./Analytics', () => ({ Analytics: { track: vi.fn() } }));
    vi.doMock('./Crash', () => ({ Crash: { recordError: vi.fn() } }));
    vi.doMock('../config/monetization.config', async (importOriginal) => {
      const orig = await importOriginal<typeof import('../config/monetization.config')>();
      return { ...orig, REVENUECAT: { ...orig.REVENUECAT, apiKey: 'goog_test_public_key' } };
    });
    const { IAP } = await import('./IAP');
    return { IAP, fake, factory };
  }

  it('native: imports @revenuecat/purchases-capacitor, configures and reconciles', async () => {
    const { IAP, fake, factory } = await loadApp(true);
    await IAP.init();
    expect(factory).toHaveBeenCalled();
    expect(fake.rc.configure).toHaveBeenCalledWith({ apiKey: 'goog_test_public_key' });
    expect(fake.rc.getCustomerInfo).toHaveBeenCalled();
    expect(IAP.state()).toBe('ready');
  });

  it('web: never loads the package', async () => {
    const { IAP, factory } = await loadApp(false);
    await IAP.init();
    await IAP.restore();
    expect(factory).not.toHaveBeenCalled();
  });
});

describe('source guards (D-09)', () => {
  const srcRoot = fileURLToPath(new URL('../', import.meta.url));
  const rel = (f: string): string => relative(srcRoot, f).replace(/\\/g, '/');
  function files(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...files(full));
      else if (/\.ts$/.test(name)) out.push(full);
    }
    return out;
  }
  const all = files(srcRoot);
  const code = (f: string): string => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const app = all.filter((f) => !/\.test\.ts$/.test(f));

  it('the local proxy is gone; nothing registers a Purchases plugin by name', () => {
    expect(existsSync(join(srcRoot, 'services/native/revenueCat.ts'))).toBe(false);
    expect(app.filter((f) => /registerPlugin[^(]*\(\s*['"]Purchases/.test(code(f))).map(rel)).toEqual([]);
  });

  it('only services/IAP.ts loads the SDK, and only through a dynamic import()', () => {
    const PKG = String.raw`['"]@revenuecat\/purchases-capacitor['"]`;
    const staticValue = [
      new RegExp(String.raw`\bimport\s+(?!type\b)[^;'"]*?\bfrom\s*${PKG}`),
      new RegExp(String.raw`\bimport\s*${PKG}`),
      new RegExp(String.raw`\bexport\s+(?!type\b)[^;'"]*?\bfrom\s*${PKG}`),
      new RegExp(String.raw`\brequire\s*\(\s*${PKG}\s*\)`),
    ];
    expect(app.filter((f) => staticValue.some((re) => re.test(code(f)))).map(rel)).toEqual([]);
    const dynamic = new RegExp(String.raw`\bimport\s*\(\s*${PKG}\s*\)`);
    expect(app.filter((f) => dynamic.test(code(f))).map(rel)).toEqual(['services/IAP.ts']);
  });

  it('no first-package fallback and no forced-true override anywhere in src (P00-T16 done-when grep)', () => {
    const offenders = all.filter((f) => /availablePackages\[0\]|\|\| true/.test(readFileSync(f, 'utf8'))).map(rel);
    expect(offenders).toEqual([]);
  });

  it('no local bundle grant remains: IAP never calls CosmeticStore.grant', () => {
    expect(code(join(srcRoot, 'services/IAP.ts'))).not.toMatch(/CosmeticStore/);
  });
});
