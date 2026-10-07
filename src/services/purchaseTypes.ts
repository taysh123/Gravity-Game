// The vocabulary the purchase service (./IAP) and the pure purchase view model (./purchaseView) share, as types only. It is
// a leaf: it imports nothing from either, so the dependency stays one way (IAP -> purchaseTypes <- purchaseView) and the
// view model never reaches up into the SDK-facing service (P00-T17 review m10a).
import type { Entitlement } from '../config/monetization.config';

// What the store can do for one package right now (IAP.storeStatus).
export type StoreStatus = 'web' | 'loading' | 'unavailable' | 'ready';

// TECHNICAL-ARCHITECTURE §4.3. 'cancelled' is also the answer to a second tap while a purchase is in flight.
export type PurchaseOutcome = 'purchased' | 'pending' | 'cancelled' | 'network' | 'unavailable' | 'error';
export type RestoreOutcome = 'restored' | 'none' | 'network' | 'error' | 'unavailable' | 'busy';
export interface RestoreResult {
  outcome: RestoreOutcome;
  restored: Entitlement[]; // every entitlement active after the restore (what the toast lists)
}
