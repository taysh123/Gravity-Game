// The entitlement model (D-09, docs/design/MONETIZATION.md A.2, A.4, A.5): pure data + pure functions, no SDK, no
// storage. RevenueCat entitlements are the only source of truth for what a player owns. Bundle cosmetics are DERIVED
// from the active entitlements on every read and never written into CosmeticStore, so a refund removes them and a
// restore brings them back with no extra code path. services/IAP.ts feeds RevenueCat answers through these functions
// and keeps the result in the `entitlements:v1` snapshot, which keeps every read synchronous.
//
// Adding a product is a data change: its ids in config/monetization.config.ts, a PRODUCTS row here, and (for a new
// pack) an ENTITLEMENT_COSMETICS row. Nothing else branches on product ids.
//
// This module must stay free of runtime imports from '@revenuecat/purchases-capacitor': it is in the web bundle, and
// the SDK may only be loaded behind the native guard in services/IAP.ts. RevenueCat shapes are described structurally.
import { ENTITLEMENTS, PACKAGES, type Entitlement, type PackageId } from '../config/monetization.config';

export type { Entitlement, PackageId } from '../config/monetization.config';

// ---- D-09 / A.2 table -----------------------------------------------------------------------------------------

export interface ProductRow {
  readonly productId: string; // Play Console product id (permanent, never reused)
  readonly packageId: PackageId; // RevenueCat package id in the current offering
  readonly entitlements: readonly Entitlement[]; // everything one purchase unlocks
}

// | Play product id           | RC package           | Entitlements                       |
export const PRODUCTS: readonly ProductRow[] = [
  { productId: 'remove_ads', packageId: PACKAGES.REMOVE_ADS, entitlements: [ENTITLEMENTS.NO_ADS] },
  { productId: 'starter_pack', packageId: PACKAGES.STARTER, entitlements: [ENTITLEMENTS.NO_ADS, ENTITLEMENTS.PACK_STARTER] },
  {
    productId: 'premium_collection_pack',
    packageId: PACKAGES.PREMIUM_COLLECTION,
    entitlements: [ENTITLEMENTS.PACK_PREMIUM_COLLECTION],
  },
  { productId: 'founders_pack', packageId: PACKAGES.FOUNDERS, entitlements: [ENTITLEMENTS.NO_ADS, ENTITLEMENTS.PACK_FOUNDERS] },
];

// The cosmetics each entitlement derives (ids from utils/cosmetics.ts, all `acquire: 'bundle'`).
export const ENTITLEMENT_COSMETICS: Readonly<Record<Entitlement, readonly string[]>> = {
  no_ads: [],
  pack_starter: ['trail_galaxy'],
  pack_premium_collection: ['cosmic_blackhole', 'arrival_bolt'],
  pack_founders: ['mythic_phoenix', 'mythic_dragon'],
};

// Canonical order (the order of ENTITLEMENTS); every list this module returns is sorted this way.
export const ENTITLEMENT_IDS: readonly Entitlement[] = Object.values(ENTITLEMENTS);

const DERIVED_COSMETICS: ReadonlySet<string> = new Set(ENTITLEMENT_IDS.flatMap((e) => ENTITLEMENT_COSMETICS[e]));

export function isEntitlement(id: unknown): id is Entitlement {
  return typeof id === 'string' && (ENTITLEMENT_IDS as readonly string[]).includes(id);
}

// Known ids only, deduplicated, canonical order.
function canonical(ids: Iterable<unknown>): Entitlement[] {
  const set = new Set<unknown>(ids);
  return ENTITLEMENT_IDS.filter((e) => set.has(e));
}

export function productById(productId: string): ProductRow | undefined {
  return PRODUCTS.find((p) => p.productId === productId);
}

export function productByPackage(packageId: string): ProductRow | undefined {
  return PRODUCTS.find((p) => p.packageId === packageId);
}

// A cosmetic that only an entitlement can grant. Its ownership is read from the snapshot alone.
export function isEntitlementCosmetic(id: string): boolean {
  return DERIVED_COSMETICS.has(id);
}

export interface Ownership {
  noAds: boolean;
  bundleCosmetics: string[];
}

export function deriveOwnership(active: readonly string[]): Ownership {
  const known = canonical(active);
  return {
    noAds: known.includes(ENTITLEMENTS.NO_ADS),
    bundleCosmetics: known.flatMap((e) => ENTITLEMENT_COSMETICS[e]),
  };
}

// A product is owned only when EVERY entitlement it grants is active (Remove Ads alone does not own the Starter Pack:
// its target is `pack_starter`). This is the A.4 "Success" test.
export function ownsProduct(active: readonly string[], productId: string): boolean {
  const row = productById(productId);
  return !!row && row.entitlements.every((e) => active.includes(e));
}

// ---- RevenueCat shapes (structural) --------------------------------------------------------------------------

export interface CustomerInfoLike {
  readonly entitlements?: { readonly active?: Readonly<Record<string, { readonly isActive?: boolean } | undefined>> };
}

export interface PackageLike {
  readonly identifier: string;
  readonly product: { readonly identifier: string; readonly priceString?: string };
}

export interface OfferingsLike<P extends PackageLike> {
  readonly current?: { readonly availablePackages?: readonly P[] } | null;
}

// The active entitlements in a CustomerInfo (`entitlements.active`), known ids only.
export function activeEntitlements(info: CustomerInfoLike | null | undefined): Entitlement[] {
  const active = info?.entitlements?.active;
  if (!active || typeof active !== 'object') return [];
  return canonical(Object.keys(active).filter((k) => active[k] && active[k]!.isActive !== false));
}

// A.4 lookup: the package with the expected package id, else any package of the expected product. It returns the
// EXACT object from getOfferings() (native purchasePackage rejects a package without its presentedOfferingContext).
// Never the first package as a fallback, and never a package of another product, even when its package id matches
// (a dashboard mix-up must surface as "Unavailable", not as a charge for the wrong product).
export function findPackage<P extends PackageLike>(
  offerings: OfferingsLike<P> | null | undefined,
  packageId: string,
  productId: string,
): P | null {
  const list = offerings?.current?.availablePackages ?? [];
  const sameProduct = list.filter((p) => p?.product?.identifier === productId);
  return sameProduct.find((p) => p.identifier === packageId) ?? sameProduct[0] ?? null;
}

// ---- Error codes (A.4 table) ---------------------------------------------------------------------------------

// RevenueCat PURCHASES_ERROR_CODE values handled explicitly (strings on the bridge; checked against the SDK enum in
// entitlements.test.ts). 42 is the Test Store's simulated failure: a failure like any other.
export const PURCHASE_ERROR_CODES = {
  CANCELLED: '1',
  ALREADY_PURCHASED: '6',
  NETWORK: '10',
  PAYMENT_PENDING: '20',
  OFFLINE: '35',
  TEST_STORE_FAILURE: '42',
} as const;

export type PurchaseErrorKind = 'cancelled' | 'already_owned' | 'pending' | 'network' | 'error';

export function classifyPurchaseError(code: string | number | undefined): PurchaseErrorKind {
  switch (code === undefined ? '' : String(code)) {
    case PURCHASE_ERROR_CODES.CANCELLED:
      return 'cancelled';
    case PURCHASE_ERROR_CODES.ALREADY_PURCHASED:
      return 'already_owned';
    case PURCHASE_ERROR_CODES.PAYMENT_PENDING:
      return 'pending';
    case PURCHASE_ERROR_CODES.NETWORK:
    case PURCHASE_ERROR_CODES.OFFLINE:
      return 'network';
    default:
      return 'error';
  }
}

// The code of a rejected SDK call. purchases-capacitor normalizes it onto `code`; older bridges nest it.
export function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { code?: unknown; data?: { code?: unknown }; userInfo?: { code?: unknown } };
  const raw = e.code ?? e.data?.code ?? e.userInfo?.code;
  return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : undefined;
}

// ---- Snapshot (`gravity-flow:entitlements:v1`) ---------------------------------------------------------------

export const ENTITLEMENTS_KEY = 'gravity-flow:entitlements:v1';
// Pre-D-09 Remove-Ads flag ('1' | '0'). Read once by migration 2, deleted by IAP after the first successful reconcile.
export const LEGACY_PREMIUM_KEY = 'gravity-flow:premium';

// A purchase that returned code 20 (payment pending). Advisory: it never grants anything; it only drives the
// "Payment pending — unlocks automatically" state until the entitlement turns active or the TTL passes (A.5).
export interface PendingMarker {
  productId: string;
  at: number;
}

export interface EntitlementSnapshot {
  v: 1;
  active: Entitlement[];
  // When RevenueCat last answered (epoch ms). 0 = never: the snapshot was seeded from legacy local data (migration 2)
  // and has not been confirmed by the store yet.
  at: number;
  pending: PendingMarker[];
}

export const EMPTY_SNAPSHOT: EntitlementSnapshot = Object.freeze({ v: 1, active: [], at: 0, pending: [] }) as EntitlementSnapshot;

export function isConfirmed(s: EntitlementSnapshot): boolean {
  return s.at > 0;
}

function isMarker(m: unknown): m is PendingMarker {
  const x = m as PendingMarker;
  return !!x && typeof x === 'object' && typeof x.productId === 'string' && typeof x.at === 'number' && Number.isFinite(x.at);
}

// null when absent or not a v1 snapshot. Unknown entitlement ids and malformed pending markers are dropped.
export function parseSnapshot(raw: string | null): EntitlementSnapshot | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const o = data as { v?: unknown; active?: unknown; at?: unknown; pending?: unknown };
  if (o.v !== undefined && o.v !== 1) return null;
  if (!Array.isArray(o.active)) return null;
  if (typeof o.at !== 'number' || !Number.isFinite(o.at) || o.at < 0) return null;
  const pending = Array.isArray(o.pending) ? o.pending.filter(isMarker).map((m) => ({ productId: m.productId, at: m.at })) : [];
  return { v: 1, active: canonical(o.active), at: o.at, pending };
}

export function serializeSnapshot(s: EntitlementSnapshot): string {
  return JSON.stringify({ v: 1, active: canonical(s.active), at: s.at, pending: s.pending });
}

export interface Reconciled {
  next: EntitlementSnapshot;
  granted: Entitlement[]; // newly active
  revoked: Entitlement[]; // no longer active (refund, chargeback, another account)
  resolved: string[]; // product ids whose pending marker completed (fire purchase_completed for these)
}

// How an answer is applied:
//   'replace': the store's list REPLACES the snapshot's (entitlements are the truth) and stamps `at`. The normal mode.
//   'merge':   the store's list is ADDED to the snapshot and nothing is revoked; `at` is kept. Used while the current
//              RevenueCat identity's A-06 silent restore has not answered (a fresh install, possibly with a snapshot
//              restored from backup): the new identity's partial answers must not revoke what the restore will return.
export type ReconcileMode = 'replace' | 'merge';

// Apply one RevenueCat answer. A pending marker expires after `pendingTtlMs` (an expired one is dropped, never
// resolved, so it cannot add a late or second purchase_completed); a live one resolves when its product is now owned.
export function reconcileSnapshot(
  prev: EntitlementSnapshot,
  active: readonly string[],
  now: number,
  pendingTtlMs: number,
  mode: ReconcileMode = 'replace',
): Reconciled {
  const nextActive = mode === 'merge' ? canonical([...prev.active, ...active]) : canonical(active);
  const resolved: string[] = [];
  const pending: PendingMarker[] = [];
  for (const m of prev.pending) {
    if (now - m.at >= pendingTtlMs) continue; // expired
    if (ownsProduct(nextActive, m.productId)) resolved.push(m.productId);
    else pending.push(m);
  }
  return {
    next: { v: 1, active: nextActive, at: mode === 'merge' ? prev.at : now, pending },
    granted: nextActive.filter((e) => !prev.active.includes(e)),
    revoked: prev.active.filter((e) => !nextActive.includes(e)),
    resolved,
  };
}

export function withPending(s: EntitlementSnapshot, productId: string, now: number): EntitlementSnapshot {
  return { ...s, pending: [...s.pending.filter((m) => m.productId !== productId), { productId, at: now }] };
}

// "Check status" on one product (A.5): its marker is dropped. Never a blanket clear: another product's payment may
// still be pending, and a cleared marker would show a second Buy button for it.
export function withoutPendingFor(s: EntitlementSnapshot, productId: string): EntitlementSnapshot {
  if (!s.pending.some((m) => m.productId === productId)) return s;
  return { ...s, pending: s.pending.filter((m) => m.productId !== productId) };
}

export function isPendingFor(s: EntitlementSnapshot, productId: string, now: number, pendingTtlMs: number): boolean {
  if (ownsProduct(s.active, productId)) return false;
  return s.pending.some((m) => m.productId === productId && now - m.at < pendingTtlMs);
}

// ---- Migration and silent-restore decisions ----------------------------------------------------------------------

// Migration 2's seed: the legacy Remove-Ads flag, plus the pack of any bundle cosmetic that an old build granted
// locally (the web stub did; on a device every old purchase failed, see MONETIZATION.md A.0 #1).
export function legacySeed(premiumRaw: string | null, ownedCosmetics: readonly string[]): Entitlement[] {
  const seed: Entitlement[] = premiumRaw === '1' ? [ENTITLEMENTS.NO_ADS] : [];
  for (const e of ENTITLEMENT_IDS) {
    if (ENTITLEMENT_COSMETICS[e].some((id) => ownedCosmetics.includes(id))) seed.push(e);
  }
  return canonical(seed);
}

// A-06: on Android, ONE silent restorePurchases() per RevenueCat identity. RevenueCat's own storage is excluded from
// backup (D-11), so a fresh install (or a reinstall restored from backup) always starts a new anonymous identity. The
// restore runs whatever that identity already reports (review M3: a purchase or listener update made before it must
// not skip it). A failure backs off exponentially across launches, is capped per session, and gives up after
// `maxAttempts` (review M4). A NETWORK failure (RevenueCat 10 / 35) is not the restore's fault: it lengthens the
// backoff (`offline`) but never counts toward `maxAttempts`, so an offline device cannot "give up" and let 'replace'
// revoke a snapshot restored from backup (P00-T17, T15/T16 review). Persisted as `gravity-flow:iap:silentRestore`
// (services/IAP.ts).
export interface SilentRestoreRecord {
  id: string | null; // the RevenueCat app user id it is for (null: getAppUserID could not be read)
  done: boolean; // a restore answered for this identity
  attempts: number; // restores that reached the store and failed (or answered), for this identity: the give-up count
  offline: number; // restores that failed on the network: lengthens the backoff, never counted toward giving up
  nextAt: number; // epoch ms before which no new attempt is made (after a failure)
}

// How one silent-restore attempt ended: it answered, the store failed it, or the network did.
export type SilentRestoreResult = 'ok' | 'error' | 'network';

export interface SilentRestoreLimits {
  maxPerSession: number;
  maxAttempts: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
}

export interface SilentRestoreInput {
  platform: string; // Capacitor.getPlatform()
  appUserId: string | null;
  record: SilentRestoreRecord | null;
  now: number;
  sessionAttempts: number; // attempts already made in this session
  limits: SilentRestoreLimits;
}

export function parseSilentRestoreRecord(raw: string | null): SilentRestoreRecord | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<SilentRestoreRecord> | null;
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    if (o.id !== null && typeof o.id !== 'string') return null;
    if (typeof o.done !== 'boolean') return null;
    if (typeof o.attempts !== 'number' || !Number.isInteger(o.attempts) || o.attempts < 0) return null;
    if (typeof o.nextAt !== 'number' || !Number.isFinite(o.nextAt)) return null;
    // `offline` is newer than the record: absent reads as 0, a present but invalid value is junk.
    const offline = o.offline ?? 0;
    if (typeof offline !== 'number' || !Number.isInteger(offline) || offline < 0) return null;
    return { id: o.id, done: o.done, attempts: o.attempts, offline, nextAt: o.nextAt };
  } catch {
    return null;
  }
}

// 'restore' now; 'wait' (not now, still outstanding: answers are merged, nothing is revoked); 'skip' (done for this
// identity, given up, or not Android: the store truth applies).
export function silentRestoreDecision(i: SilentRestoreInput): 'restore' | 'wait' | 'skip' {
  if (i.platform !== 'android') return 'skip';
  const rec = i.record && i.record.id === i.appUserId ? i.record : null; // a record for another identity does not count
  if (rec?.done) return 'skip';
  if ((rec?.attempts ?? 0) >= i.limits.maxAttempts) return 'skip';
  if (i.sessionAttempts >= i.limits.maxPerSession) return 'wait';
  if (rec && i.now < rec.nextAt) return 'wait';
  return 'restore';
}

// The record after an attempt for `appUserId`. 'ok' = the restore answered. 'error' counts toward giving up.
// 'network' does not: it only lengthens the backoff (the exponent counts every failed try, online or not).
export function afterSilentRestore(
  record: SilentRestoreRecord | null,
  appUserId: string | null,
  result: SilentRestoreResult,
  now: number,
  limits: SilentRestoreLimits,
): SilentRestoreRecord {
  const prev = record && record.id === appUserId ? record : null;
  const attempts = (prev?.attempts ?? 0) + (result === 'network' ? 0 : 1);
  if (result === 'ok') return { id: appUserId, done: true, attempts, offline: 0, nextAt: 0 };
  const offline = (prev?.offline ?? 0) + (result === 'network' ? 1 : 0);
  const exponent = Math.min(Math.max(attempts + offline - 1, 0), 30); // 2 ** 30 is already past any sane cap
  const delay = Math.min(limits.backoffBaseMs * 2 ** exponent, limits.backoffMaxMs);
  return { id: appUserId, done: false, attempts, offline, nextAt: now + delay };
}
