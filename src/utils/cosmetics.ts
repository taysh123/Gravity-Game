// Cosmetic ball themes (fill + glow/trail color pair). Pure data — owned/equipped
// state lives in CosmeticStore; purchased with Stardust (and, later, IAP). Purely
// visual — never affects gameplay.
export interface Cosmetic {
  id: string;
  name: string;
  cost: number; // Stardust; 0 = owned by default
  fill: number; // ball body color
  glow: number; // glow ring + trail color
}

export const COSMETICS: Cosmetic[] = [
  { id: 'default', name: 'Comet', cost: 0, fill: 0xf0f0ff, glow: 0xffd166 },
  { id: 'ember', name: 'Ember', cost: 40, fill: 0xff7a4d, glow: 0xffb04d },
  { id: 'mint', name: 'Mint', cost: 40, fill: 0x9affe0, glow: 0x4dffd0 },
  { id: 'ion', name: 'Ion', cost: 60, fill: 0xa8eaff, glow: 0x33e1ff },
  { id: 'pulsar', name: 'Pulsar', cost: 60, fill: 0xc9a8ff, glow: 0xb46bff },
  { id: 'solar', name: 'Solar', cost: 100, fill: 0xffe9a8, glow: 0xffd166 },
];

export function cosmeticById(id: string): Cosmetic {
  return COSMETICS.find((c) => c.id === id) ?? COSMETICS[0];
}
