// The persisted entitlement snapshot `gravity-flow:entitlements:v1` (D-09, MONETIZATION.md A.1). It keeps
// IAP.isPremium() and bundle-cosmetic ownership synchronous; RevenueCat is the truth and services/IAP.ts is the only
// writer (migration 2 seeds it once from the legacy flag). Reads are cheap: the raw string is compared and only
// re-parsed when it changed, so a value restored by Saves.hydrate() or written by the migration ladder is picked up
// without a cache hook. Writes go through Saves.write (localStorage now, the Preferences mirror after hydrate).
import { Saves } from '../platform/saves';
import { EMPTY_SNAPSHOT, ENTITLEMENTS_KEY, parseSnapshot, serializeSnapshot, type EntitlementSnapshot } from './entitlements';

let lastRaw: string | null = null;
let parsed: EntitlementSnapshot = EMPTY_SNAPSHOT;
// The last snapshot written this session: what reads return when localStorage is unavailable (private mode), so a
// purchase is still honoured for the rest of the session.
let written: EntitlementSnapshot | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(ENTITLEMENTS_KEY);
  } catch {
    return null;
  }
}

export const EntitlementStore = {
  // EMPTY_SNAPSHOT when nothing is stored (or the stored value is not a v1 snapshot).
  read(): EntitlementSnapshot {
    const raw = readRaw();
    if (raw === null) return written ?? EMPTY_SNAPSHOT;
    if (raw !== lastRaw) {
      lastRaw = raw;
      parsed = parseSnapshot(raw) ?? EMPTY_SNAPSHOT;
    }
    return parsed;
  },

  write(snapshot: EntitlementSnapshot): void {
    const raw = serializeSnapshot(snapshot);
    const next = parseSnapshot(raw) ?? EMPTY_SNAPSHOT;
    written = next;
    lastRaw = raw;
    parsed = next;
    Saves.write(ENTITLEMENTS_KEY, raw);
  },
};
