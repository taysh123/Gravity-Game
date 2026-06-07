// Per-world visual identity — palette, atmosphere, and journey subtitle so each
// world reads as a distinct *place*. Keyed by world id (1-8). Consumed by
// CosmicBackground (bg/nebula/stars) and GameScene (title card / accents).
export interface WorldTheme {
  id: number;
  roman: string;     // shown on the world title card
  subtitle: string;  // the "bring the lost star home" journey beat
  bgColor: number;   // deep-space fill
  nebulaTints: number[]; // additive nebula glow colors (mood)
  starTint: number;  // tint applied to the star layers
  starAlpha: number; // star brightness multiplier
  accent: number;    // world accent (title card + signature/boss highlights)
}

export const WORLD_THEMES: WorldTheme[] = [
  { id: 1, roman: 'I',    subtitle: 'The launch',        bgColor: 0x0d0d1a, nebulaTints: [0x2a3f7a, 0x1f6f6f], starTint: 0xffffff, starAlpha: 1.0,  accent: 0x00e676 },
  { id: 2, roman: 'II',   subtitle: 'Ride the winds',    bgColor: 0x07171f, nebulaTints: [0x00d4ff, 0x1f8fae], starTint: 0xcfeeff, starAlpha: 1.05, accent: 0x00d4ff },
  { id: 3, roman: 'III',  subtitle: 'Mind the gears',    bgColor: 0x171206, nebulaTints: [0xffb04d, 0x8a5a2a], starTint: 0xffe9c0, starAlpha: 0.95, accent: 0xffb04d },
  { id: 4, roman: 'IV',   subtitle: 'Into the dark',     bgColor: 0x190a0c, nebulaTints: [0xff5a6a, 0x7a2330], starTint: 0xffd6d6, starAlpha: 0.9,  accent: 0xff5a6a },
  { id: 5, roman: 'V',    subtitle: "Gravity's grip",    bgColor: 0x130a1f, nebulaTints: [0xc04cff, 0x6a2a9a], starTint: 0xe9d0ff, starAlpha: 1.0,  accent: 0xc04cff },
  { id: 6, roman: 'VI',   subtitle: 'Through the rifts',  bgColor: 0x06121a, nebulaTints: [0x33e1ff, 0xffa64d], starTint: 0xd0f5ff, starAlpha: 1.1,  accent: 0x33e1ff },
  { id: 7, roman: 'VII',  subtitle: 'One way only',      bgColor: 0x07170f, nebulaTints: [0x2ee6c0, 0x1f8f6a], starTint: 0xd0ffe9, starAlpha: 1.0,  accent: 0x2ee6c0 },
  { id: 8, roman: 'VIII', subtitle: 'Almost home',       bgColor: 0x16120a, nebulaTints: [0xffe9a8, 0xffd166], starTint: 0xfff4d0, starAlpha: 1.15, accent: 0xffd166 },
];

export function themeForWorld(id: number): WorldTheme {
  return WORLD_THEMES.find((t) => t.id === id) ?? WORLD_THEMES[0];
}
