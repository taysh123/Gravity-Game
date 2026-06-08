// Cosmetic meta — rarity + collection display data (constants, no logic). The
// cosmetic catalog itself lives in utils/cosmetics.ts; pure helpers in
// utils/cosmeticsLogic.ts.

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const RARITY: Record<Rarity, { label: string; color: number; order: number }> = {
  common: { label: 'Common', color: 0x9ad0ff, order: 0 },
  rare: { label: 'Rare', color: 0x4dffd0, order: 1 },
  epic: { label: 'Epic', color: 0xb46bff, order: 2 },
  legendary: { label: 'Legendary', color: 0xffd166, order: 3 },
  mythic: { label: 'Mythic', color: 0xff5a6a, order: 4 },
};

export type CollectionId = 'classic' | 'cosmic' | 'cyber' | 'mythic' | 'trails' | 'arrivals';

export const COLLECTIONS: Record<CollectionId, { label: string }> = {
  classic: { label: 'Classic' },
  cosmic: { label: 'Cosmic Collection' },
  cyber: { label: 'Cyber Collection' },
  mythic: { label: 'Mythic Collection' },
  trails: { label: 'Trails' },
  arrivals: { label: 'Arrivals' },
};
