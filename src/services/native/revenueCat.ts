import { registerPlugin } from '@capacitor/core';

// Local proxy to the native @revenuecat/purchases-capacitor plugin via the Capacitor
// bridge — by NAME ('PurchasesPlugin'), so the web build never imports the package
// (kept in package.json deps only for the synced Android module). Only the raw
// methods we use are declared. Native behavior is a device-verification gate.
type Entitlements = { active: Record<string, unknown> };
type CustomerInfoResult = { customerInfo: { entitlements: Entitlements } };
type Pkg = { identifier: string; product: { identifier: string } };

export interface PurchasesPlugin {
  configure(options: { apiKey: string }): Promise<void>;
  getCustomerInfo(): Promise<CustomerInfoResult>;
  getOfferings(): Promise<{ current?: { availablePackages: Pkg[] } }>;
  purchasePackage(options: { aPackage: Pkg }): Promise<CustomerInfoResult>;
  restorePurchases(): Promise<CustomerInfoResult>;
}

export const Purchases = registerPlugin<PurchasesPlugin>('PurchasesPlugin');
