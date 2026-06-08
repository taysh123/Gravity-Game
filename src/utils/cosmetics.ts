// Cosmetic catalog — pure data across three categories (skin / trail / arrival),
// with rarity, collection, and an acquire path. Owned/equipped state lives in
// CosmeticStore; pure economy helpers in cosmeticsLogic. Purely visual — cosmetics
// NEVER affect gameplay (no pay-to-win). `fill`/`glow` on skins are read by Ball.ts.
import type { Rarity, CollectionId } from '../config/cosmetics.config';

export type Category = 'skin' | 'trail' | 'arrival';
// How an item is obtained. 'stardust'/'fragments' = directly purchasable for that
// currency; 'bundle' = only via an IAP bundle; 'achievement' = unlocked by a reward.
export type Acquire = 'free' | 'stardust' | 'fragments' | 'bundle' | 'achievement';

export type SkinStyle = 'solid' | 'dualtone' | 'ringed' | 'void' | 'animated';
export type TrailStyleName = 'comet' | 'fire' | 'ice' | 'lightning' | 'galaxy' | 'void';
export type ArrivalPattern = 'burst' | 'implode' | 'nova' | 'bolt' | 'bloom';

export interface TrailStyle {
  colors: number[]; // empty => reuse the equipped skin's glow (the classic comet)
  style: TrailStyleName;
}
export interface ArrivalStyle {
  particle: number;
  flash: number;
  count: number;
  pattern: ArrivalPattern;
}

export interface Cosmetic {
  id: string;
  name: string;
  category: Category;
  rarity: Rarity;
  collection: CollectionId;
  acquire: Acquire;
  cost?: number; // stardust (acquire='stardust') or fragments (acquire='fragments')
  bundleId?: string; // if acquire='bundle'
  unlockHint?: string; // shown on locked previews
  // skin visuals (Ball.ts reads fill/glow; M2 adds accent/skinStyle)
  fill?: number;
  glow?: number;
  accent?: number;
  skinStyle?: SkinStyle;
  // trail / arrival visuals (M3 / M4 rendering)
  trail?: TrailStyle;
  arrival?: ArrivalStyle;
}

// --- SKINS ----------------------------------------------------------------
const SKINS: Cosmetic[] = [
  { id: 'default', name: 'Comet', category: 'skin', rarity: 'common', collection: 'classic', acquire: 'free', fill: 0xf0f0ff, glow: 0xffd166, skinStyle: 'solid' },
  { id: 'ember', name: 'Ember', category: 'skin', rarity: 'common', collection: 'classic', acquire: 'stardust', cost: 40, fill: 0xff7a4d, glow: 0xffb04d, skinStyle: 'solid' },
  { id: 'mint', name: 'Mint', category: 'skin', rarity: 'common', collection: 'classic', acquire: 'stardust', cost: 40, fill: 0x9affe0, glow: 0x4dffd0, skinStyle: 'solid' },
  { id: 'ion', name: 'Ion', category: 'skin', rarity: 'rare', collection: 'classic', acquire: 'stardust', cost: 70, fill: 0xa8eaff, glow: 0x33e1ff, skinStyle: 'ringed' },
  { id: 'pulsar', name: 'Pulsar', category: 'skin', rarity: 'rare', collection: 'classic', acquire: 'stardust', cost: 70, fill: 0xc9a8ff, glow: 0xb46bff, skinStyle: 'ringed' },
  { id: 'solar', name: 'Solar', category: 'skin', rarity: 'rare', collection: 'classic', acquire: 'stardust', cost: 110, fill: 0xffe9a8, glow: 0xffd166, accent: 0xff8a3d, skinStyle: 'ringed' },
  // Cosmic Collection
  { id: 'cosmic_nova', name: 'Nova Core', category: 'skin', rarity: 'epic', collection: 'cosmic', acquire: 'fragments', cost: 30, fill: 0xffd27a, glow: 0xff8a3d, accent: 0xffecc0, skinStyle: 'animated' },
  { id: 'cosmic_blackhole', name: 'Black Hole', category: 'skin', rarity: 'legendary', collection: 'cosmic', acquire: 'bundle', bundleId: 'premium_collection', unlockHint: 'Premium Collection Pack', fill: 0x130d1f, glow: 0x7c5cff, accent: 0xb46bff, skinStyle: 'void' },
  { id: 'cosmic_pulsar', name: 'Pulsar Star', category: 'skin', rarity: 'epic', collection: 'cosmic', acquire: 'fragments', cost: 35, fill: 0xc9a8ff, glow: 0xb46bff, accent: 0xffffff, skinStyle: 'animated' },
  { id: 'cosmic_supernova', name: 'Supernova', category: 'skin', rarity: 'legendary', collection: 'cosmic', acquire: 'fragments', cost: 65, fill: 0xfff0c0, glow: 0xff5a3d, accent: 0xffd166, skinStyle: 'animated' },
  // Cyber Collection
  { id: 'cyber_neon', name: 'Neon Core', category: 'skin', rarity: 'rare', collection: 'cyber', acquire: 'stardust', cost: 140, fill: 0x1affd5, glow: 0x00ffc8, accent: 0xff2bd6, skinStyle: 'dualtone' },
  { id: 'cyber_glitch', name: 'Glitch Orb', category: 'skin', rarity: 'epic', collection: 'cyber', acquire: 'fragments', cost: 35, fill: 0xff2bd6, glow: 0x2bd6ff, accent: 0xffffff, skinStyle: 'dualtone' },
  { id: 'cyber_quantum', name: 'Quantum Sphere', category: 'skin', rarity: 'epic', collection: 'cyber', acquire: 'fragments', cost: 45, fill: 0xa8eaff, glow: 0x6b8bff, accent: 0xffffff, skinStyle: 'ringed' },
  // Mythic Collection
  { id: 'mythic_phoenix', name: 'Phoenix Core', category: 'skin', rarity: 'mythic', collection: 'mythic', acquire: 'bundle', bundleId: 'founders', unlockHint: "Founder's Pack", fill: 0xff6a2d, glow: 0xffd166, accent: 0xff2b2b, skinStyle: 'animated' },
  { id: 'mythic_titan', name: 'Titan Eye', category: 'skin', rarity: 'legendary', collection: 'mythic', acquire: 'fragments', cost: 90, fill: 0xcfe8ff, glow: 0x33e1ff, accent: 0xffffff, skinStyle: 'ringed' },
  { id: 'mythic_dragon', name: 'Dragon Heart', category: 'skin', rarity: 'mythic', collection: 'mythic', acquire: 'bundle', bundleId: 'founders', unlockHint: "Founder's Pack", fill: 0x2d1020, glow: 0xff2b5a, accent: 0xff8a3d, skinStyle: 'void' },
];

// --- TRAILS ---------------------------------------------------------------
const TRAILS: Cosmetic[] = [
  { id: 'trail_default', name: 'Comet Trail', category: 'trail', rarity: 'common', collection: 'trails', acquire: 'free', trail: { colors: [], style: 'comet' } },
  { id: 'trail_fire', name: 'Fire Trail', category: 'trail', rarity: 'epic', collection: 'trails', acquire: 'fragments', cost: 25, trail: { colors: [0xff7a1a, 0xffd24d], style: 'fire' } },
  { id: 'trail_ice', name: 'Ice Trail', category: 'trail', rarity: 'epic', collection: 'trails', acquire: 'fragments', cost: 25, trail: { colors: [0x9fdcff, 0xe6f7ff], style: 'ice' } },
  { id: 'trail_lightning', name: 'Lightning Trail', category: 'trail', rarity: 'legendary', collection: 'trails', acquire: 'fragments', cost: 50, trail: { colors: [0xfff36b, 0x8ad0ff], style: 'lightning' } },
  { id: 'trail_galaxy', name: 'Galaxy Trail', category: 'trail', rarity: 'legendary', collection: 'trails', acquire: 'bundle', bundleId: 'starter', unlockHint: 'Starter Pack', trail: { colors: [0xb46bff, 0x33e1ff, 0xff6bd0], style: 'galaxy' } },
  { id: 'trail_void', name: 'Void Trail', category: 'trail', rarity: 'mythic', collection: 'trails', acquire: 'fragments', cost: 90, trail: { colors: [0x2a1a4a, 0x7c5cff], style: 'void' } },
];

// --- ARRIVAL EFFECTS ------------------------------------------------------
const ARRIVALS: Cosmetic[] = [
  { id: 'arrival_default', name: 'Stardust', category: 'arrival', rarity: 'common', collection: 'arrivals', acquire: 'free', arrival: { particle: 0x00e676, flash: 0xc9ffd6, count: 24, pattern: 'burst' } },
  { id: 'arrival_starburst', name: 'Star Burst', category: 'arrival', rarity: 'epic', collection: 'arrivals', acquire: 'fragments', cost: 25, arrival: { particle: 0xffd166, flash: 0xfff0c0, count: 30, pattern: 'burst' } },
  { id: 'arrival_portal', name: 'Portal Collapse', category: 'arrival', rarity: 'epic', collection: 'arrivals', acquire: 'fragments', cost: 25, arrival: { particle: 0x33e1ff, flash: 0xa8eaff, count: 28, pattern: 'implode' } },
  { id: 'arrival_nova', name: 'Nova Explosion', category: 'arrival', rarity: 'legendary', collection: 'arrivals', acquire: 'fragments', cost: 50, arrival: { particle: 0xff7a3d, flash: 0xffd166, count: 36, pattern: 'nova' } },
  { id: 'arrival_bolt', name: 'Lightning Strike', category: 'arrival', rarity: 'legendary', collection: 'arrivals', acquire: 'bundle', bundleId: 'premium_collection', unlockHint: 'Premium Collection Pack', arrival: { particle: 0xfff36b, flash: 0xffffff, count: 26, pattern: 'bolt' } },
  { id: 'arrival_bloom', name: 'Cosmic Bloom', category: 'arrival', rarity: 'mythic', collection: 'arrivals', acquire: 'fragments', cost: 90, arrival: { particle: 0xb46bff, flash: 0xff6bd0, count: 40, pattern: 'bloom' } },
];

export const COSMETICS: Cosmetic[] = [...SKINS, ...TRAILS, ...ARRIVALS];

// Default (free) item per category — the equipped fallback.
export const DEFAULT_IDS: Record<Category, string> = {
  skin: 'default',
  trail: 'trail_default',
  arrival: 'arrival_default',
};

export function cosmeticById(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id);
}

// Resolve an id to a cosmetic, falling back to the category default if missing.
export function cosmeticOr(id: string, category: Category): Cosmetic {
  return cosmeticById(id) ?? cosmeticById(DEFAULT_IDS[category])!;
}

export function cosmeticsByCategory(category: Category): Cosmetic[] {
  return COSMETICS.filter((c) => c.category === category);
}
