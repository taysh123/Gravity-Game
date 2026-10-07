// The persisted entitlement snapshot `gravity-flow:entitlements:v1` (D-09, MONETIZATION.md A.1). It keeps
// IAP.isPremium() and bundle-cosmetic ownership synchronous; RevenueCat is the truth and services/IAP.ts is the only
// writer (migration 2 seeds it once from the legacy flag). Reads are cheap: the raw string is compared and only
// re-parsed when it changed, so a value restored by Saves.hydrate() or written by the migration ladder is picked up
// without a cache hook. Writes go through Saves.write (localStorage now, the Preferences mirror after hydrate).
//
// Review fix M1: Saves.write never throws, so a write that did not land (quota, storage disabled) is only visible by
// reading the value back. When it did not land, the session keeps what it wrote (a charged purchase stays owned, a
// refund stays revoked) instead of re-reading the stale stored value, until a later write lands.
import { Saves } from '../platform/saves';
import { EMPTY_SNAPSHOT, ENTITLEMENTS_KEY, parseSnapshot, serializeSnapshot, type EntitlementSnapshot } from './entitlements';

export interface EntitlementStoreIO {
  readRaw(): string | null; // never throws; null = absent or storage unavailable
  writeRaw(raw: string): void; // never throws; may silently not land
}

export interface EntitlementStoreApi {
  read(): EntitlementSnapshot; // EMPTY_SNAPSHOT when nothing usable is stored
  write(snapshot: EntitlementSnapshot): void;
}

export function createEntitlementStore(io: EntitlementStoreIO): EntitlementStoreApi {
  let lastRaw: string | null = null;
  let parsed: EntitlementSnapshot = EMPTY_SNAPSHOT;
  // The last snapshot written this session, and whether storage failed to keep it.
  let written: EntitlementSnapshot | null = null;
  let unpersisted = false;

  return {
    read() {
      if (unpersisted && written) return written;
      const raw = io.readRaw();
      if (raw === null) return written ?? EMPTY_SNAPSHOT;
      if (raw !== lastRaw) {
        lastRaw = raw;
        parsed = parseSnapshot(raw) ?? EMPTY_SNAPSHOT;
      }
      return parsed;
    },

    write(snapshot) {
      const raw = serializeSnapshot(snapshot);
      const next = parseSnapshot(raw) ?? EMPTY_SNAPSHOT;
      written = next;
      io.writeRaw(raw);
      // Read it back: only a value storage really holds may be re-read later.
      unpersisted = io.readRaw() !== raw;
      if (!unpersisted) {
        lastRaw = raw;
        parsed = next;
      }
    },
  };
}

export const EntitlementStore: EntitlementStoreApi = createEntitlementStore({
  readRaw() {
    try {
      return localStorage.getItem(ENTITLEMENTS_KEY);
    } catch {
      return null;
    }
  },
  writeRaw: (raw) => Saves.write(ENTITLEMENTS_KEY, raw),
});
