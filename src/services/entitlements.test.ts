import { describe, it, expect } from 'vitest';
import { PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';
import {
  ENTITLEMENT_COSMETICS,
  ENTITLEMENT_IDS,
  EMPTY_SNAPSHOT,
  ENTITLEMENTS_KEY,
  LEGACY_PREMIUM_KEY,
  PRODUCTS,
  activeEntitlements,
  classifyPurchaseError,
  deriveOwnership,
  errorCode,
  findPackage,
  freshInstallAction,
  isEntitlementCosmetic,
  isPendingFor,
  legacySeed,
  ownsProduct,
  parseSnapshot,
  productByPackage,
  productById,
  reconcileSnapshot,
  serializeSnapshot,
  withPending,
  withoutPending,
  type EntitlementSnapshot,
  type PackageLike,
} from './entitlements';
import { BUNDLES, ENTITLEMENTS, PACKAGES, REVENUECAT } from '../config/monetization.config';
import { COSMETICS, cosmeticById } from '../utils/cosmetics';

// P00-T15 (D-09, MONETIZATION.md A.2/A.4/A.5): the entitlement model as pure, tested data. RevenueCat entitlements
// are the only source of truth; bundle cosmetics are derived from them, never stored as local grants.

const HOUR = 60 * 60 * 1000;
const TTL = 72 * HOUR;

// The D-09 / A.2 table, verbatim. Every row: Play product -> RC package -> entitlements -> derived cosmetics.
const D09 = [
  { productId: 'remove_ads', packageId: 'remove_ads', entitlements: ['no_ads'], cosmetics: [] },
  { productId: 'starter_pack', packageId: 'starter', entitlements: ['no_ads', 'pack_starter'], cosmetics: ['trail_galaxy'] },
  {
    productId: 'premium_collection_pack',
    packageId: 'premium_collection',
    entitlements: ['pack_premium_collection'],
    cosmetics: ['cosmic_blackhole', 'arrival_bolt'],
  },
  { productId: 'founders_pack', packageId: 'founders', entitlements: ['no_ads', 'pack_founders'], cosmetics: ['mythic_phoenix', 'mythic_dragon'] },
] as const;

describe('D-09 ids', () => {
  it('entitlement ids are exactly the D-09 set (premium renamed to no_ads)', () => {
    expect(ENTITLEMENTS).toEqual({
      NO_ADS: 'no_ads',
      PACK_STARTER: 'pack_starter',
      PACK_PREMIUM_COLLECTION: 'pack_premium_collection',
      PACK_FOUNDERS: 'pack_founders',
    });
    expect([...ENTITLEMENT_IDS].sort()).toEqual(['no_ads', 'pack_founders', 'pack_premium_collection', 'pack_starter']);
    expect(ENTITLEMENT_IDS).not.toContain('premium');
  });

  it('package ids are the custom ids of the current offering (A.14 R7)', () => {
    expect(PACKAGES).toEqual({ REMOVE_ADS: 'remove_ads', STARTER: 'starter', PREMIUM_COLLECTION: 'premium_collection', FOUNDERS: 'founders' });
  });

  it('REVENUECAT no longer carries the old premium entitlement id', () => {
    expect(REVENUECAT).not.toHaveProperty('premiumEntitlementId');
    expect(REVENUECAT.removeAdsProductId).toBe('remove_ads');
  });
});

describe('product -> entitlement -> cosmetic (every D-09 row)', () => {
  it('the catalog is exactly the D-09 table, in order', () => {
    expect(PRODUCTS.map((p) => ({ productId: p.productId, packageId: p.packageId, entitlements: [...p.entitlements] }))).toEqual(
      D09.map((r) => ({ productId: r.productId, packageId: r.packageId, entitlements: [...r.entitlements] })),
    );
  });

  for (const row of D09) {
    describe(row.productId, () => {
      it(`is found by product id and by package id "${row.packageId}"`, () => {
        expect(productById(row.productId)?.packageId).toBe(row.packageId);
        expect(productByPackage(row.packageId)?.productId).toBe(row.productId);
      });

      it(`grants ${row.entitlements.join(' + ')}`, () => {
        expect([...productById(row.productId)!.entitlements]).toEqual([...row.entitlements]);
      });

      it(`owning it derives ${row.cosmetics.length ? row.cosmetics.join(' + ') : 'no cosmetics'}${(row.entitlements as readonly string[]).includes('no_ads') ? ' + no ads' : ''}`, () => {
        const own = deriveOwnership(row.entitlements);
        expect(own.noAds).toBe((row.entitlements as readonly string[]).includes('no_ads'));
        expect([...own.bundleCosmetics].sort()).toEqual([...row.cosmetics].sort());
        expect(ownsProduct(row.entitlements, row.productId)).toBe(true);
      });
    });
  }

  it('each pack entitlement derives exactly its D-09 cosmetics; no_ads derives none', () => {
    expect(ENTITLEMENT_COSMETICS).toEqual({
      no_ads: [],
      pack_starter: ['trail_galaxy'],
      pack_premium_collection: ['cosmic_blackhole', 'arrival_bolt'],
      pack_founders: ['mythic_phoenix', 'mythic_dragon'],
    });
  });

  it('owning everything derives every bundle cosmetic and no ads', () => {
    const own = deriveOwnership(ENTITLEMENT_IDS);
    expect(own.noAds).toBe(true);
    expect([...own.bundleCosmetics].sort()).toEqual(['arrival_bolt', 'cosmic_blackhole', 'mythic_dragon', 'mythic_phoenix', 'trail_galaxy']);
  });

  it('nothing active derives nothing; unknown ids (the old "premium") are ignored', () => {
    expect(deriveOwnership([])).toEqual({ noAds: false, bundleCosmetics: [] });
    expect(deriveOwnership(['premium', 'pack_supporter', ''])).toEqual({ noAds: false, bundleCosmetics: [] });
  });

  it('a product counts as owned only when ALL of its entitlements are active', () => {
    // Remove Ads alone does not make the Starter Pack owned (its target entitlement is pack_starter).
    expect(ownsProduct(['no_ads'], 'starter_pack')).toBe(false);
    expect(ownsProduct(['pack_starter'], 'starter_pack')).toBe(false);
    expect(ownsProduct(['no_ads', 'pack_starter'], 'starter_pack')).toBe(true);
    expect(ownsProduct(['no_ads'], 'remove_ads')).toBe(true);
    expect(ownsProduct(['no_ads'], 'not_a_product')).toBe(false);
  });

  it('every derived cosmetic exists in the catalog as a bundle-only item of the matching bundle', () => {
    for (const bundle of BUNDLES) {
      for (const id of ENTITLEMENT_COSMETICS[bundle.entitlement]) {
        const c = cosmeticById(id);
        expect(c, id).toBeDefined();
        expect(c!.acquire, id).toBe('bundle');
        expect(c!.bundleId, id).toBe(bundle.id);
      }
    }
  });

  it('every bundle-only catalog item is derived from exactly one entitlement (none is unreachable)', () => {
    const bundleOnly = COSMETICS.filter((c) => c.acquire === 'bundle').map((c) => c.id);
    expect(bundleOnly.length).toBeGreaterThan(0);
    for (const id of bundleOnly) {
      const sources = ENTITLEMENT_IDS.filter((e) => ENTITLEMENT_COSMETICS[e].includes(id));
      expect(sources, id).toHaveLength(1);
      expect(isEntitlementCosmetic(id), id).toBe(true);
    }
    expect(isEntitlementCosmetic('default')).toBe(false);
    expect(isEntitlementCosmetic('ember')).toBe(false);
  });

  it('BUNDLES agree with the D-09 table (package, entitlement, grants, Remove-Ads flag)', () => {
    expect(BUNDLES.map((b) => b.productId)).toEqual(['starter_pack', 'premium_collection_pack', 'founders_pack']);
    for (const b of BUNDLES) {
      const row = productById(b.productId)!;
      expect(row, b.id).toBeDefined();
      expect(b.packageId, b.id).toBe(row.packageId);
      expect(row.entitlements, b.id).toContain(b.entitlement);
      expect([...b.grants], b.id).toEqual([...ENTITLEMENT_COSMETICS[b.entitlement]]);
      expect(b.premium, b.id).toBe(row.entitlements.includes('no_ads'));
    }
    expect(productById(REVENUECAT.removeAdsProductId)?.packageId).toBe(PACKAGES.REMOVE_ADS);
  });
});

describe('activeEntitlements(customerInfo)', () => {
  const info = (active: Record<string, { isActive?: boolean }>) => ({ entitlements: { active } });

  it('reads the active entitlement map in canonical order, known ids only', () => {
    expect(activeEntitlements(info({ pack_founders: { isActive: true }, no_ads: { isActive: true }, premium: { isActive: true } }))).toEqual([
      'no_ads',
      'pack_founders',
    ]);
  });

  it('drops an entry the SDK marks inactive', () => {
    expect(activeEntitlements(info({ no_ads: { isActive: false }, pack_starter: {} }))).toEqual(['pack_starter']);
  });

  it('a missing or malformed info is "nothing active"', () => {
    expect(activeEntitlements(null)).toEqual([]);
    expect(activeEntitlements(undefined)).toEqual([]);
    expect(activeEntitlements({} as never)).toEqual([]);
    expect(activeEntitlements({ entitlements: {} } as never)).toEqual([]);
  });
});

describe('findPackage (A.4 lookup: never [0])', () => {
  const pkg = (identifier: string, product: string, extra: Record<string, unknown> = {}): PackageLike & Record<string, unknown> => ({
    identifier,
    product: { identifier: product, priceString: '₪7.90' },
    presentedOfferingContext: { offeringIdentifier: 'default', placementIdentifier: null, targetingContext: null },
    ...extra,
  });
  const offerings = (list: Array<PackageLike & Record<string, unknown>>) => ({ current: { availablePackages: list } });

  it('returns the exact package object (identity), so presentedOfferingContext reaches purchasePackage', () => {
    const starter = pkg('starter', 'starter_pack');
    const found = findPackage(offerings([pkg('remove_ads', 'remove_ads'), starter]), 'starter', 'starter_pack');
    expect(found).toBe(starter);
    expect(found).toHaveProperty('presentedOfferingContext');
  });

  it('falls back to the product id when the package id differs', () => {
    const founders = pkg('$rc_lifetime', 'founders_pack');
    expect(findPackage(offerings([pkg('remove_ads', 'remove_ads'), founders]), 'founders', 'founders_pack')).toBe(founders);
  });

  it('never returns the first package when nothing matches', () => {
    const list = [pkg('remove_ads', 'remove_ads'), pkg('starter', 'starter_pack')];
    expect(findPackage(offerings(list), 'founders', 'founders_pack')).toBeNull();
  });

  it('never charges for another product: a package id match with a different product is rejected', () => {
    expect(findPackage(offerings([pkg('starter', 'founders_pack')]), 'starter', 'starter_pack')).toBeNull();
  });

  it('no offerings, no current offering, or an empty one -> null', () => {
    expect(findPackage(null, 'starter', 'starter_pack')).toBeNull();
    expect(findPackage({ current: null }, 'starter', 'starter_pack')).toBeNull();
    expect(findPackage({}, 'starter', 'starter_pack')).toBeNull();
    expect(findPackage(offerings([]), 'starter', 'starter_pack')).toBeNull();
  });
});

describe('purchase error codes (A.4 table)', () => {
  it('maps every handled RevenueCat code to its outcome', () => {
    expect(classifyPurchaseError('1')).toBe('cancelled');
    expect(classifyPurchaseError('6')).toBe('already_owned');
    expect(classifyPurchaseError('20')).toBe('pending');
    expect(classifyPurchaseError('10')).toBe('network');
    expect(classifyPurchaseError('35')).toBe('network');
    expect(classifyPurchaseError('42')).toBe('error'); // Test Store simulated failure: a failure, never a success
  });

  it('accepts numeric codes as well as the bridge strings', () => {
    expect(classifyPurchaseError(1)).toBe('cancelled');
    expect(classifyPurchaseError(6)).toBe('already_owned');
    expect(classifyPurchaseError(20)).toBe('pending');
    expect(classifyPurchaseError(10)).toBe('network');
    expect(classifyPurchaseError(35)).toBe('network');
    expect(classifyPurchaseError(42)).toBe('error');
  });

  it('any other code, a plugin-level name, or no code is a generic failure', () => {
    for (const code of ['0', '2', '3', '5', '7', '15', '23', '33', 'UNIMPLEMENTED', '', undefined]) {
      expect(classifyPurchaseError(code), String(code)).toBe('error');
    }
  });

  it('agrees with the installed SDK enum (purchases-capacitor 13.7.0)', () => {
    expect(classifyPurchaseError(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)).toBe('cancelled');
    expect(classifyPurchaseError(PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR)).toBe('already_owned');
    expect(classifyPurchaseError(PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR)).toBe('pending');
    expect(classifyPurchaseError(PURCHASES_ERROR_CODE.NETWORK_ERROR)).toBe('network');
    expect(classifyPurchaseError(PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR)).toBe('network');
    expect(classifyPurchaseError(PURCHASES_ERROR_CODE.TEST_STORE_SIMULATED_PURCHASE_ERROR)).toBe('error');
  });

  it('errorCode() reads the code wherever the bridge put it', () => {
    expect(errorCode({ code: '20' })).toBe('20');
    expect(errorCode({ code: 6 })).toBe('6');
    expect(errorCode({ data: { code: '1' } })).toBe('1');
    expect(errorCode({ userInfo: { code: 35 } })).toBe('35');
    expect(errorCode(new Error('boom'))).toBeUndefined();
    expect(errorCode('boom')).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
    expect(classifyPurchaseError(errorCode({ code: '1' }))).toBe('cancelled');
  });
});

describe('entitlement snapshot', () => {
  const snap = (over: Partial<EntitlementSnapshot> = {}): EntitlementSnapshot => ({ ...EMPTY_SNAPSHOT, ...over });

  it('keys: entitlements:v1 replaces the legacy premium flag', () => {
    expect(ENTITLEMENTS_KEY).toBe('gravity-flow:entitlements:v1');
    expect(LEGACY_PREMIUM_KEY).toBe('gravity-flow:premium');
  });

  it('round-trips through serialize/parse', () => {
    const s = snap({ active: ['no_ads', 'pack_founders'], at: 1_700_000_000_000, pending: [{ productId: 'starter_pack', at: 5 }] });
    expect(parseSnapshot(serializeSnapshot(s))).toEqual(s);
    expect(JSON.parse(serializeSnapshot(s))).toMatchObject({ v: 1 });
  });

  it('parse: absent or corrupt -> null; unknown ids and bad markers are dropped', () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot('')).toBeNull();
    expect(parseSnapshot('not json')).toBeNull();
    expect(parseSnapshot('null')).toBeNull();
    expect(parseSnapshot('[]')).toBeNull();
    expect(parseSnapshot('{"v":2,"active":[],"at":0,"pending":[]}')).toBeNull();
    expect(parseSnapshot('{"v":1,"active":"no_ads","at":0}')).toBeNull();
    expect(parseSnapshot('{"v":1,"active":[],"at":-1}')).toBeNull();
    expect(
      parseSnapshot('{"v":1,"active":["premium","no_ads","no_ads",3],"at":7,"pending":[{"productId":"remove_ads","at":1},{"at":2},"x"]}'),
    ).toEqual({ v: 1, active: ['no_ads'], at: 7, pending: [{ productId: 'remove_ads', at: 1 }] });
  });

  it('parse accepts the P0 plan shape without a version or pending list', () => {
    expect(parseSnapshot('{"active":["no_ads"],"at":0}')).toEqual(snap({ active: ['no_ads'] }));
  });

  describe('reconcileSnapshot (apply a RevenueCat answer)', () => {
    it('the store answer replaces the active list and stamps the time', () => {
      const r = reconcileSnapshot(snap({ active: ['no_ads'], at: 0 }), ['no_ads', 'pack_starter'], 1000, TTL);
      expect(r.next).toEqual(snap({ active: ['no_ads', 'pack_starter'], at: 1000 }));
      expect(r.granted).toEqual(['pack_starter']);
      expect(r.revoked).toEqual([]);
    });

    it('refund / revocation: a lost entitlement removes no_ads and the derived cosmetics', () => {
      const prev = snap({ active: ['no_ads', 'pack_founders', 'pack_premium_collection'], at: 500 });
      const r = reconcileSnapshot(prev, ['pack_premium_collection'], 1000, TTL);
      expect(r.revoked).toEqual(['no_ads', 'pack_founders']);
      expect(r.next.active).toEqual(['pack_premium_collection']);
      const own = deriveOwnership(r.next.active);
      expect(own.noAds).toBe(false);
      expect(own.bundleCosmetics).not.toContain('mythic_phoenix');
      expect(own.bundleCosmetics).not.toContain('mythic_dragon');
      expect([...own.bundleCosmetics].sort()).toEqual(['arrival_bolt', 'cosmic_blackhole']);
    });

    it('a full refund leaves nothing derived', () => {
      const r = reconcileSnapshot(snap({ active: ['no_ads', 'pack_starter'], at: 500 }), [], 1000, TTL);
      expect(r.next.active).toEqual([]);
      expect(deriveOwnership(r.next.active)).toEqual({ noAds: false, bundleCosmetics: [] });
    });

    it('resolves a pending marker once its product is owned, and keeps the others', () => {
      const prev = snap({ pending: [{ productId: 'starter_pack', at: 100 }, { productId: 'founders_pack', at: 100 }] });
      const r = reconcileSnapshot(prev, ['no_ads', 'pack_starter'], 1000, TTL);
      expect(r.resolved).toEqual(['starter_pack']);
      expect(r.next.pending).toEqual([{ productId: 'founders_pack', at: 100 }]);
    });

    it('a pending marker is not resolved by a partial grant (Remove Ads alone does not complete Starter)', () => {
      const r = reconcileSnapshot(snap({ pending: [{ productId: 'starter_pack', at: 100 }] }), ['no_ads'], 1000, TTL);
      expect(r.resolved).toEqual([]);
      expect(r.next.pending).toHaveLength(1);
    });

    it('expires pending markers after the TTL (72 h, A.5)', () => {
      const prev = snap({ pending: [{ productId: 'starter_pack', at: 0 }, { productId: 'founders_pack', at: 1000 }] });
      const r = reconcileSnapshot(prev, [], TTL + 1, TTL);
      expect(r.resolved).toEqual([]);
      expect(r.next.pending).toEqual([{ productId: 'founders_pack', at: 1000 }]);
    });

    it('ignores ids it does not know (never stores them)', () => {
      expect(reconcileSnapshot(EMPTY_SNAPSHOT, ['premium', 'no_ads'] as never, 1, TTL).next.active).toEqual(['no_ads']);
    });
  });

  describe('pending markers', () => {
    it('withPending adds (or refreshes) one marker per product', () => {
      const a = withPending(EMPTY_SNAPSHOT, 'starter_pack', 10);
      expect(a.pending).toEqual([{ productId: 'starter_pack', at: 10 }]);
      const b = withPending(a, 'starter_pack', 20);
      expect(b.pending).toEqual([{ productId: 'starter_pack', at: 20 }]);
      expect(withPending(b, 'founders_pack', 30).pending).toHaveLength(2);
    });

    it('withoutPending clears every marker (Check status ran a restore)', () => {
      const s = withPending(withPending(EMPTY_SNAPSHOT, 'starter_pack', 1), 'founders_pack', 2);
      expect(withoutPending(s).pending).toEqual([]);
      expect(withoutPending(s).active).toEqual(s.active);
    });

    it('isPendingFor: live marker, not expired, product not owned yet', () => {
      const s = withPending(EMPTY_SNAPSHOT, 'starter_pack', 1000);
      expect(isPendingFor(s, 'starter_pack', 2000, TTL)).toBe(true);
      expect(isPendingFor(s, 'founders_pack', 2000, TTL)).toBe(false);
      expect(isPendingFor(s, 'starter_pack', 1000 + TTL, TTL)).toBe(false);
      expect(isPendingFor({ ...s, active: ['no_ads', 'pack_starter'] }, 'starter_pack', 2000, TTL)).toBe(false);
    });
  });
});

describe('legacySeed (migration 2 input: the old premium flag + locally granted bundle cosmetics)', () => {
  it('premium "1" seeds no_ads; "0" or missing seeds nothing', () => {
    expect(legacySeed('1', [])).toEqual(['no_ads']);
    expect(legacySeed('0', [])).toEqual([]);
    expect(legacySeed(null, [])).toEqual([]);
  });

  it('a locally owned bundle cosmetic seeds its pack entitlement', () => {
    expect(legacySeed(null, ['default', 'trail_galaxy'])).toEqual(['pack_starter']);
    expect(legacySeed('1', ['mythic_dragon', 'mythic_phoenix'])).toEqual(['no_ads', 'pack_founders']);
    expect(legacySeed(null, ['arrival_bolt'])).toEqual(['pack_premium_collection']);
  });

  it('ordinary owned cosmetics seed nothing', () => {
    expect(legacySeed(null, ['default', 'ember', 'comet'])).toEqual([]);
  });
});

describe('freshInstallAction (A-06: one silent restore on an Android fresh install)', () => {
  const base = { platform: 'android', appUserId: '$RCAnonymousID:new', restoredFor: null as string | null, active: [] as string[] };

  it('Android, a RevenueCat identity never checked before, nothing active -> restore', () => {
    expect(freshInstallAction(base)).toBe('restore');
    // a reinstall restored from backup: the old identity is recorded, RevenueCat made a new one
    expect(freshInstallAction({ ...base, restoredFor: '$RCAnonymousID:old' })).toBe('restore');
  });

  it('the identity already has entitlements -> just record it', () => {
    expect(freshInstallAction({ ...base, active: ['no_ads'] })).toBe('mark');
  });

  it('runs once per identity', () => {
    expect(freshInstallAction({ ...base, restoredFor: '$RCAnonymousID:new' })).toBe('none');
  });

  it('identity unknown (getAppUserID failed): restore, without recording', () => {
    expect(freshInstallAction({ ...base, appUserId: null })).toBe('restore');
  });

  it('never on other platforms (iOS restore can prompt for an Apple ID)', () => {
    expect(freshInstallAction({ ...base, platform: 'ios' })).toBe('none');
    expect(freshInstallAction({ ...base, platform: 'web' })).toBe('none');
  });
});
