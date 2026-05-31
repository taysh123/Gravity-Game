import { PHYSICS } from './physics.config';

// Cross-cutting design system ("Modern Dark / Cinema Mobile"). Look-and-feel
// tokens — fonts, easing, radius, glass surfaces, text colors — reused by every
// scene, button, HUD, and overlay. Gameplay numbers stay in physics.config.ts;
// splash/menu timings stay in splash.config.ts.
export const THEME = {
  // Typography (self-hosted woff2 — see styles/fonts.css)
  FONT_DISPLAY: '"Orbitron", system-ui, sans-serif', // wordmarks, titles, HUD
  FONT_BODY: '"Exo 2", system-ui, sans-serif', // UI, body, hints, buttons

  // Motion — premium "expo out" feel. Phaser ease strings.
  EASE: 'Expo.easeOut', // big moves, reveals, transitions
  EASE_POP: 'Back.easeOut', // satisfying scale-in pops
  EASE_SOFT: 'Sine.easeInOut', // breathing / idle loops
  PRESS_SCALE: 0.97, // press feedback

  // Shape
  RADIUS: 16,
  RADIUS_SM: 12,

  // Glass surfaces (Phaser fills: color + alpha)
  PANEL_FILL: 0x0c0e1a, // frosted panel base
  PANEL_ALPHA: 0.82,
  SCRIM_ALPHA: 0.55, // dim behind modals
  GLASS_FILL: 0xffffff, // subtle top-surface sheen
  GLASS_ALPHA: 0.05,
  HAIRLINE: 0xffffff, // 1px borders
  HAIRLINE_ALPHA: 0.1,

  // Accents (reuse the gameplay palette so the whole app is one world)
  ACCENT_PRIMARY: PHYSICS.COLOR_GOAL, // green — primary CTAs
  ACCENT_VIOLET: PHYSICS.COLOR_ATTRACTOR,
  ACCENT_CYAN: PHYSICS.COLOR_ATTRACTOR_PULSE,
  ACCENT_GOLD: PHYSICS.COLOR_BALL_GLOW,

  // Text
  TEXT_PRIMARY: '#EDEDF2',
  TEXT_MUTED: '#8A8F98',
  TEXT_ON_PRIMARY: '#06231a', // dark text on bright green
} as const;
