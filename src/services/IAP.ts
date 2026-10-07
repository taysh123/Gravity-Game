// In-app purchases (D-09; docs/design/MONETIZATION.md A.1, A.4, A.5, A.11-A.13). RevenueCat entitlements are the
// truth: every answer the SDK gives (getCustomerInfo, a purchase, a restore, the customer-info listener) is applied to
// the `entitlements:v1` snapshot through the pure model in ./entitlements.ts, and everything the game reads is derived
// from that snapshot synchronously: isPremium() (`no_ads`) and bundle-cosmetic ownership (CosmeticStore). Nothing is
// ever granted locally on a device.
//
// Native: the official `@revenuecat/purchases-capacitor` package (native plugin name "Purchases") is loaded by a
// dynamic import() INSIDE the Capacitor.isNativePlatform() guard, so the web build never loads it. The plugin object is
// a thenable Capacitor proxy: it is only ever held in a variable and called, never returned from an async function or
// awaited itself.
//
// Init (A.1, started from main.ts after Saves.hydrate(), never blocks boot):
//   configure({ apiKey }) (anonymous) -> addCustomerInfoUpdateListener -> getCustomerInfo() applied explicitly (the
//   Android listener does not replay current state) -> getOfferings() cached (the exact package objects).
//   An empty key leaves IAP "unconfigured" (every purchase/restore resolves 'unavailable'); a failed load or configure
//   is "failed" and retried on the next foreground or the next tap.
// A-06: on Android, ONE silent restorePurchases() runs per RevenueCat identity (a fresh install, or a reinstall restored
//   from backup: RevenueCat's own storage is not backed up, D-11), whatever that identity already reports. Until it has
//   answered, every answer is MERGED into the snapshot and nothing is revoked (review M3). A failing restore backs off
//   exponentially across launches, is capped per session, and gives up after a maximum (review M4). A network failure
//   (RevenueCat 10 / 35) lengthens the backoff but never counts toward that maximum (P00-T17 review).
// Never revoke without a successful answer: offline, a failed call or a malformed answer leaves the snapshot as it is
//   (A.12), so a migrated or offline player stays ad-free with their cosmetics. The first successful answer replaces
//   the migration-2 seed with the store truth and deletes the legacy `premium` key (P00-foundation.md §5, §9).
//
// buy(packageId) follows the A.4 state machine: exact package from the offering (never [0]) -> purchasePackage with
// the external-flow flag raised around the Play sheet -> 'purchased' ONLY when the target entitlement is active (after
// one re-read 2 s later: "Verifying"). Codes: 1 cancelled (silent), 20 pending (marker + the listener completes it),
// 6 already owned (restore), 10/35 network, 42 and anything else error. A purchase that resolved but whose entitlement
// is still not visible after the re-read is 'pending' with a marker too (review M5): the store took the payment.
// Pending markers are cleared per product only: when the product turns owned, after the TTL, or by an explicit
// "Check status" restore of that product (review M2). Never a blanket clear.
// Web: production resolves 'unavailable' and grants nothing (A.13); DEV keeps a stub that writes the snapshot.
import { Capacitor } from '@capacitor/core';
import type { CustomerInfo, LOG_LEVEL, MakePurchaseResult, PurchasesOfferings, PurchasesPlugin } from '@revenuecat/purchases-capacitor';
import { PURCHASE_FLOW, REVENUECAT } from '../config/monetization.config';
import { setExternalFlowActive } from '../platform/externalFlow';
import { onAppForeground } from '../platform/foreground';
import { Saves } from '../platform/saves';
import { Analytics } from './Analytics';
import {
  firstPurchase,
  purchaseCompleted,
  purchaseFailed,
  purchaseInitiated,
  purchasePending,
  restore as restoreEvent,
  type AnalyticsEvent,
} from './analyticsEvents';
import { Crash } from './Crash';
import { EntitlementStore } from './EntitlementStore';
import {
  LEGACY_PREMIUM_KEY,
  activeEntitlements,
  classifyPurchaseError,
  deriveOwnership,
  errorCode,
  findPackage,
  isPendingFor,
  ownsProduct,
  parseSilentRestoreRecord,
  productByPackage,
  reconcileSnapshot,
  silentRestoreDecision,
  afterSilentRestore,
  withPending,
  withoutPendingFor,
  type CustomerInfoLike,
  type Entitlement,
  type EntitlementSnapshot,
  type ProductRow,
  type ReconcileMode,
  type SilentRestoreLimits,
  type SilentRestoreResult,
} from './entitlements';
import type { StoreStatus } from './purchaseView';

// Once-per-device "first purchase" analytics flag (measure only).
export const FIRST_PURCHASE_KEY = 'gravity-flow:firstPurchase';
// The A-06 silent-restore record (entitlements.ts SilentRestoreRecord): identity, done, attempts, backoff.
export const SILENT_RESTORE_KEY = 'gravity-flow:iap:silentRestore';

const SILENT_RESTORE_LIMITS: SilentRestoreLimits = {
  maxPerSession: PURCHASE_FLOW.SILENT_RESTORE_MAX_PER_SESSION,
  maxAttempts: PURCHASE_FLOW.SILENT_RESTORE_MAX_ATTEMPTS,
  backoffBaseMs: PURCHASE_FLOW.SILENT_RESTORE_BACKOFF_BASE_MS,
  backoffMaxMs: PURCHASE_FLOW.SILENT_RESTORE_BACKOFF_MAX_MS,
};

type PurchasesApi = Pick<
  PurchasesPlugin,
  | 'setLogLevel'
  | 'configure'
  | 'addCustomerInfoUpdateListener'
  | 'getCustomerInfo'
  | 'getOfferings'
  | 'purchasePackage'
  | 'restorePurchases'
  | 'getAppUserID'
>;

// What the dynamic import provides (a plain object wrapping the plugin, safe to resolve from an async function).
export interface PurchasesModule {
  readonly Purchases: PurchasesApi;
  readonly LOG_LEVEL: { readonly DEBUG: LOG_LEVEL };
}

export type IAPState = 'unconfigured' | 'initializing' | 'ready' | 'failed';
// TECHNICAL-ARCHITECTURE §4.3. 'cancelled' is also the answer to a second tap while a purchase is in flight.
export type PurchaseOutcome = 'purchased' | 'pending' | 'cancelled' | 'network' | 'unavailable' | 'error';
export type RestoreOutcome = 'restored' | 'none' | 'network' | 'error' | 'unavailable' | 'busy';
export interface RestoreResult {
  outcome: RestoreOutcome;
  restored: Entitlement[]; // every entitlement active after the restore (what the toast lists)
}

export interface IAPDeps {
  native: boolean;
  platform: string; // Capacitor.getPlatform()
  dev: boolean; // import.meta.env.DEV: SDK debug logging, and the web purchase stub
  apiKey: string;
  loadPurchases(): Promise<PurchasesModule>;
  store: { read(): EntitlementSnapshot; write(snapshot: EntitlementSnapshot): void };
  kv: { get(key: string): string | null; write(key: string, value: string): void; remove(key: string): Promise<boolean> };
  track(event: AnalyticsEvent): void;
  report(error: unknown, context: string): void;
  now(): number;
  sleep(ms: number): Promise<void>;
  onForeground(listener: () => void): void;
  setExternalFlow(active: boolean): void;
}

export interface IAPApi {
  init(): Promise<void>; // memoized; never rejects
  state(): IAPState;
  isPremium(): boolean; // `no_ads` active in the snapshot (synchronous)
  isPending(packageId: string): boolean; // a payment-pending marker is live for this package's product
  price(packageId: string): string | null; // store priceString of the cached package; null until offerings load
  // What a purchase card can offer right now (A.6, A.12, A.13): 'web' (no purchases on this build), 'loading' (the store
  // has not answered: init running or failed, offerings missing), 'unavailable' (not configured, or the package is not
  // in the offering), 'ready' (a priceString exists).
  storeStatus(packageId: string): StoreStatus;
  owns(packageId: string): boolean; // every entitlement of the package's product is active in the snapshot
  buy(packageId: string): Promise<PurchaseOutcome>; // never rejects
  // Never rejects. `recheck`: the package whose "Check status" asked for this restore; only its pending marker is
  // cleared when it is still not owned (other products' markers are never touched).
  restore(options?: { recheck?: string }): Promise<RestoreResult>;
  // A surface that sells something just opened (shop, Settings): retry a failed init and load missing offerings now
  // instead of waiting for the next foreground, so a "..." card is never a dead end. Never rejects; a no-op on web and
  // while a purchase or restore is running.
  refresh(): Promise<void>;
  inFlight(): boolean; // a purchase or restore is running (buttons render disabled)
}

export function createIAP(deps: IAPDeps): IAPApi {
  const ttl = PURCHASE_FLOW.PENDING_TTL_MS;
  let state: IAPState = 'unconfigured';
  let mod: PurchasesModule | null = null;
  let rc: PurchasesApi | null = null; // set only once configure() resolved
  let listening = false;
  let hooked = false;
  let initRun: Promise<void> | null = null;
  let offerings: PurchasesOfferings | null = null;
  // The current identity's A-06 silent restore has answered (or is not needed): answers are applied with 'replace'.
  // Until then they are merged and nothing is revoked (review M3). Always true off Android.
  let freshChecked = deps.platform !== 'android';
  let silentAttempts = 0; // silent restores tried in this session (review M4 cap)
  let busy = false;
  let refreshing = false;
  let legacyDropping = false;
  const reported = new Set<string>();

  // Offline is expected, not a defect: network codes are never reported. One report per context AND error code per
  // session, so a failure that repeats on every foreground cannot flood Crashlytics (review M4), while a different
  // error under the same context still gets through (P00-T17 review).
  function report(error: unknown, context: string): void {
    const code = errorCode(error);
    if (classifyPurchaseError(code) === 'network') return;
    const key = `${context}|${code ?? ''}`;
    if (reported.has(key)) return;
    reported.add(key);
    try {
      deps.report(error, context);
    } catch {
      // reporting must never break a purchase
    }
  }

  function trackCompleted(productId: string): void {
    deps.track(purchaseCompleted(productId));
    if (deps.kv.get(FIRST_PURCHASE_KEY) === '1') return;
    deps.kv.write(FIRST_PURCHASE_KEY, '1');
    // Only attribute when the flag really persisted, so a storage-less device cannot re-fire it on every purchase.
    if (deps.kv.get(FIRST_PURCHASE_KEY) === '1') deps.track(firstPurchase(productId));
  }

  function dropLegacyPremium(): void {
    if (legacyDropping || deps.kv.get(LEGACY_PREMIUM_KEY) === null) return;
    legacyDropping = true;
    deps.kv.remove(LEGACY_PREMIUM_KEY).then(
      (ok) => {
        if (!ok) legacyDropping = false; // retried on the next answer
      },
      () => {
        legacyDropping = false;
      },
    );
  }

  // Apply one RevenueCat answer. A missing or malformed CustomerInfo is ignored (it must never read as "nothing
  // active"). The mode defaults to 'replace' once the identity's silent restore has answered, 'merge' before. Returns
  // whether it was applied.
  function apply(info: CustomerInfoLike | null | undefined, mode: ReconcileMode = freshChecked ? 'replace' : 'merge'): boolean {
    const active = info?.entitlements?.active;
    if (!active || typeof active !== 'object') return false;
    const r = reconcileSnapshot(deps.store.read(), activeEntitlements(info), deps.now(), ttl, mode);
    deps.store.write(r.next);
    for (const productId of r.resolved) trackCompleted(productId); // a pending purchase completed
    if (mode === 'replace') dropLegacyPremium(); // §5: only once the store truth has replaced the seed
    return true;
  }

  async function appUserId(api: PurchasesApi): Promise<string | null> {
    try {
      const r = await api.getAppUserID();
      return typeof r?.appUserID === 'string' ? r.appUserID : null;
    } catch {
      return null;
    }
  }

  function recordSilentRestore(id: string | null, result: SilentRestoreResult): void {
    const next = afterSilentRestore(parseSilentRestoreRecord(deps.kv.get(SILENT_RESTORE_KEY)), id, result, deps.now(), SILENT_RESTORE_LIMITS);
    deps.kv.write(SILENT_RESTORE_KEY, JSON.stringify(next));
  }

  // getCustomerInfo -> (A-06 silent restore) -> apply. false = no store answer was applied (retried on the next
  // foreground).
  async function reconcile(): Promise<boolean> {
    const api = rc;
    if (!api) return false;
    let info: CustomerInfo;
    try {
      info = (await api.getCustomerInfo()).customerInfo;
    } catch (error) {
      report(error, 'iap.getCustomerInfo');
      return false;
    }
    if (!freshChecked) {
      const id = await appUserId(api);
      const decision = silentRestoreDecision({
        platform: deps.platform,
        appUserId: id,
        record: parseSilentRestoreRecord(deps.kv.get(SILENT_RESTORE_KEY)),
        now: deps.now(),
        sessionAttempts: silentAttempts,
        limits: SILENT_RESTORE_LIMITS,
      });
      if (decision === 'restore') {
        silentAttempts++;
        let restored: CustomerInfo | undefined;
        let failure: SilentRestoreResult = 'error';
        try {
          restored = (await api.restorePurchases()).customerInfo;
        } catch (error) {
          if (classifyPurchaseError(errorCode(error)) === 'network') failure = 'network'; // offline: backs off, never gives up
          report(error, 'iap.silentRestore');
        }
        if (restored && apply(restored, 'replace')) {
          recordSilentRestore(id, 'ok');
          freshChecked = true;
          return true;
        }
        recordSilentRestore(id, failure); // backs off; meanwhile take what the store says without revoking
        return apply(info, 'merge');
      }
      if (decision === 'skip') freshChecked = true;
    }
    return apply(info);
  }

  async function loadOfferings(): Promise<void> {
    const api = rc;
    if (!api) return;
    try {
      offerings = await api.getOfferings();
    } catch (error) {
      report(error, 'iap.getOfferings');
    }
  }

  function onCustomerInfo(info: CustomerInfo): void {
    try {
      apply(info); // merged (never revoking) until this identity's silent restore has answered
    } catch (error) {
      report(error, 'iap.listener');
    }
  }

  // App back in the foreground (D-11): pending completions, refunds and another Play account land here, and a failed
  // init is retried. RevenueCat caches customer info for up to 5 minutes, so this is cheap.
  function onForeground(): void {
    if (busy || refreshing) return;
    refreshing = true;
    void (async () => {
      try {
        if (state === 'failed') {
          initRun = null;
          await init();
          return;
        }
        if (state !== 'ready') return;
        await reconcile();
        if (!offerings?.current) await loadOfferings();
      } catch (error) {
        report(error, 'iap.foreground');
      } finally {
        refreshing = false;
      }
    })();
  }

  async function runInit(): Promise<void> {
    if (!deps.native) return; // web: the SDK is never loaded
    if (!deps.apiKey) {
      state = 'unconfigured'; // the release guard (P00-T20) refuses an empty key in release builds
      return;
    }
    if (!hooked) {
      hooked = true;
      try {
        deps.onForeground(onForeground);
      } catch {
        // no foreground refresh: the listener and user actions still reconcile
      }
    }
    state = 'initializing';
    try {
      if (!rc) {
        mod ??= await deps.loadPurchases();
        const api = mod.Purchases;
        if (deps.dev) {
          try {
            await api.setLogLevel({ level: mod.LOG_LEVEL.DEBUG });
          } catch {
            // logging only
          }
        }
        await api.configure({ apiKey: deps.apiKey });
        rc = api;
      }
      if (!listening) {
        await rc.addCustomerInfoUpdateListener(onCustomerInfo);
        listening = true;
      }
    } catch (error) {
      state = 'failed';
      report(error, 'iap.init');
      return;
    }
    state = 'ready';
    await reconcile();
    await loadOfferings();
  }

  function init(): Promise<void> {
    initRun ??= runInit().catch((error: unknown) => {
      state = 'failed';
      report(error, 'iap.init');
    });
    return initRun;
  }

  // A user action retries a failed init once before giving up.
  async function ensureReady(): Promise<void> {
    await init();
    if (state === 'failed') {
      initRun = null;
      await init();
    }
  }

  // Restore and apply: shared by restore() and the code-6 path. The answer is authoritative ('replace') and counts as
  // this identity's silent restore. Pending markers resolve per product through apply(); only `recheckProductId`
  // ("Check status" on that card, A.5) is additionally cleared when still not owned. Never a blanket clear (review M2).
  async function restoreWith(api: PurchasesApi, recheckProductId?: string): Promise<'ok' | 'network' | 'error'> {
    let info: CustomerInfo;
    try {
      info = (await api.restorePurchases()).customerInfo;
    } catch (error) {
      if (classifyPurchaseError(errorCode(error)) === 'network') return 'network';
      report(error, 'iap.restore');
      return 'error';
    }
    if (!apply(info, 'replace')) return 'error';
    if (recheckProductId) deps.store.write(withoutPendingFor(deps.store.read(), recheckProductId));
    if (deps.platform === 'android') recordSilentRestore(await appUserId(api), 'ok'); // this identity is restored
    freshChecked = true;
    return 'ok';
  }

  async function onPurchaseError(
    api: PurchasesApi,
    row: ProductRow,
    error: unknown,
    fail: (reason: string, outcome: PurchaseOutcome) => PurchaseOutcome,
  ): Promise<PurchaseOutcome> {
    const product = row.productId;
    switch (classifyPurchaseError(errorCode(error))) {
      case 'cancelled':
        return fail('cancelled', 'cancelled');
      case 'pending':
        // No grant until Play reports PURCHASED; RevenueCat pushes the completion through the listener (A.5).
        deps.store.write(withPending(deps.store.read(), product, deps.now()));
        deps.track(purchasePending(product));
        return 'pending';
      case 'network':
        return fail('network', 'network');
      case 'already_owned': {
        deps.track(purchaseFailed(product, 'already_owned'));
        deps.track(restoreEvent());
        const restored = await restoreWith(api);
        if (restored === 'network') return 'network';
        return ownsProduct(deps.store.read().active, product) ? 'purchased' : 'error';
      }
      default:
        report(error, 'iap.purchase');
        return fail('error', 'error');
    }
  }

  // DEV web only: simulate a store answer that adds the product's entitlements.
  function devGrant(row: ProductRow): void {
    const prev = deps.store.read();
    deps.store.write(reconcileSnapshot(prev, [...prev.active, ...row.entitlements], deps.now(), ttl).next);
  }

  async function buy(packageId: string): Promise<PurchaseOutcome> {
    const row = productByPackage(packageId);
    if (!row) return 'unavailable';
    if (busy) return 'cancelled';
    const product = row.productId;
    const fail = (reason: string, outcome: PurchaseOutcome): PurchaseOutcome => {
      deps.track(purchaseFailed(product, reason));
      return outcome;
    };
    if (!deps.native) {
      // Production web never grants paid items and is not a purchase attempt: no funnel events (A.13).
      if (!deps.dev) return 'unavailable';
      deps.track(purchaseInitiated(product));
      devGrant(row);
      trackCompleted(product);
      return 'purchased';
    }
    busy = true;
    try {
      await ensureReady();
      const owned = (): boolean => ownsProduct(deps.store.read().active, product);
      if (owned()) return 'purchased';
      if (isPendingFor(deps.store.read(), product, deps.now(), ttl)) return 'pending'; // never a second sheet
      deps.track(purchaseInitiated(product)); // a real attempt (not an owned / pending short-circuit)
      const api = rc;
      if (!api || state !== 'ready') return fail('unavailable', 'unavailable');
      let aPackage = findPackage(offerings, packageId, product);
      if (!aPackage) {
        await loadOfferings();
        aPackage = findPackage(offerings, packageId, product);
      }
      if (!aPackage) return fail('no_package', 'unavailable');

      // The Play sheet backgrounds the WebView: the flag keeps the lifecycle from opening the pause overlay (D-11).
      let result: MakePurchaseResult | undefined;
      let failure: unknown = null;
      let failed = false;
      deps.setExternalFlow(true);
      try {
        result = await api.purchasePackage({ aPackage });
      } catch (error) {
        failed = true;
        failure = error;
      } finally {
        deps.setExternalFlow(false);
      }
      if (failed) return await onPurchaseError(api, row, failure, fail);

      apply(result?.customerInfo);
      if (owned()) {
        trackCompleted(product);
        return 'purchased';
      }
      // Verifying: resolved, but the target entitlement is not active yet. Re-read once.
      await deps.sleep(PURCHASE_FLOW.VERIFY_DELAY_MS);
      try {
        apply((await api.getCustomerInfo()).customerInfo);
      } catch (error) {
        report(error, 'iap.verify');
      }
      if (owned()) {
        trackCompleted(product);
        return 'purchased';
      }
      // The store took the payment (purchasePackage resolved) but the entitlement is still not visible: pending, not a
      // failure (review M5). The marker lets the listener / foreground refresh complete it (firing purchase_completed
      // once) and the card show "unlocks automatically". A persistent case points at the dashboard (a product not
      // attached to its entitlement), hence the report.
      deps.store.write(withPending(deps.store.read(), product, deps.now()));
      deps.track(purchasePending(product));
      report(new Error(`purchase of ${product} resolved but its entitlements are not active`), 'iap.notEntitled');
      return 'pending';
    } catch (error) {
      report(error, 'iap.buy');
      return fail('error', 'error');
    } finally {
      busy = false;
    }
  }

  async function restore(options: { recheck?: string } = {}): Promise<RestoreResult> {
    if (busy) return { outcome: 'busy', restored: [] };
    if (!deps.native && !deps.dev) return { outcome: 'unavailable', restored: [] }; // production web (A.13)
    deps.track(restoreEvent());
    const recheckProductId = options.recheck ? productByPackage(options.recheck)?.productId : undefined;
    if (!deps.native) {
      if (recheckProductId) deps.store.write(withoutPendingFor(deps.store.read(), recheckProductId));
      const active = [...deps.store.read().active];
      return { outcome: active.length ? 'restored' : 'none', restored: active };
    }
    busy = true;
    try {
      await ensureReady();
      const api = rc;
      if (!api || state !== 'ready') return { outcome: 'unavailable', restored: [] };
      const r = await restoreWith(api, recheckProductId);
      if (r !== 'ok') return { outcome: r, restored: [] };
      const active = [...deps.store.read().active];
      return { outcome: active.length ? 'restored' : 'none', restored: active };
    } catch (error) {
      report(error, 'iap.restore');
      return { outcome: 'error', restored: [] };
    } finally {
      busy = false;
    }
  }

  async function refresh(): Promise<void> {
    if (!deps.native || busy || refreshing) return;
    refreshing = true;
    try {
      await ensureReady(); // a failed init is retried once
      if (state === 'ready' && !offerings?.current) await loadOfferings();
    } catch (error) {
      report(error, 'iap.refresh');
    } finally {
      refreshing = false;
    }
  }

  return {
    init,
    state: () => state,
    isPremium: () => deriveOwnership(deps.store.read().active).noAds,
    isPending(packageId) {
      const row = productByPackage(packageId);
      return !!row && isPendingFor(deps.store.read(), row.productId, deps.now(), ttl);
    },
    price(packageId) {
      const row = productByPackage(packageId);
      if (!row) return null;
      return findPackage(offerings, packageId, row.productId)?.product?.priceString ?? null;
    },
    storeStatus(packageId) {
      if (!deps.native) return 'web'; // production AND DEV web: purchases live in the Android app (A.13)
      const row = productByPackage(packageId);
      if (!row) return 'unavailable';
      if (!initRun || state === 'initializing' || state === 'failed') return 'loading';
      if (state === 'unconfigured') return 'unavailable';
      if (!offerings) return 'loading'; // ready, but getOfferings has not answered (offline): refresh / foreground retries
      return findPackage(offerings, packageId, row.productId)?.product?.priceString ? 'ready' : 'unavailable';
    },
    owns(packageId) {
      const row = productByPackage(packageId);
      return !!row && ownsProduct(deps.store.read().active, row.productId);
    },
    buy,
    restore,
    refresh,
    inFlight: () => busy,
  };
}

// ---- The app instance ---------------------------------------------------------------------------------------------

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const IAP: IAPApi = createIAP({
  native: Capacitor.isNativePlatform(),
  platform: Capacitor.getPlatform(),
  dev: import.meta.env.DEV,
  apiKey: REVENUECAT.apiKey,
  // Native only (runInit returns before this on web). A plain object is returned, never the thenable plugin proxy.
  loadPurchases: async () => {
    const m = await import('@revenuecat/purchases-capacitor');
    return { Purchases: m.Purchases, LOG_LEVEL: m.LOG_LEVEL };
  },
  store: EntitlementStore,
  kv: { get: readLocal, write: (key, value) => Saves.write(key, value), remove: (key) => Saves.remove(key) },
  track: (event) => Analytics.track(event),
  report: (error, context) => Crash.recordError(error, context),
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  // platform/lifecycle.ts owns foreground detection (visibility + native resume) and notifies subscribers.
  onForeground: (listener) => void onAppForeground(listener),
  setExternalFlow: (active) => setExternalFlowActive(active, PURCHASE_FLOW.EXTERNAL_FLOW_SOURCE),
});
