// Pure cosmetic economy helpers (no Phaser/stores) so they're testable. The
// CosmeticStore uses these to route purchases (Stardust vs Fragments) and the store
// UI uses collection progress for the retention layer.
import { COSMETICS, cosmeticsByCategory, type Cosmetic } from './cosmetics';
import type { CollectionId } from '../config/cosmetics.config';

export type Currency = 'stardust' | 'fragments';

// The direct purchase cost of an item, or null if it isn't directly purchasable
// (free, or bundle/achievement-locked).
export function purchaseCost(c: Cosmetic): { currency: Currency; cost: number } | null {
  if (c.acquire === 'stardust') return { currency: 'stardust', cost: c.cost ?? 0 };
  if (c.acquire === 'fragments') return { currency: 'fragments', cost: c.cost ?? 0 };
  return null;
}

export function itemsInCollection(collection: CollectionId): Cosmetic[] {
  return COSMETICS.filter((c) => c.collection === collection);
}

export function collectionProgress(ownedIds: string[], collection: CollectionId): { owned: number; total: number } {
  const items = itemsInCollection(collection);
  const owned = items.filter((c) => ownedIds.includes(c.id)).length;
  return { owned, total: items.length };
}

export function collectionComplete(ownedIds: string[], collection: CollectionId): boolean {
  const { owned, total } = collectionProgress(ownedIds, collection);
  return total > 0 && owned === total;
}

// Re-export for store UI convenience.
export { cosmeticsByCategory };
