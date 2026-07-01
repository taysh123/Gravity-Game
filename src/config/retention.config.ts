import { THEME } from './theme.config';

// Wave 2a "one more" retention-loop tuning (mirrors splash.config.ts / fx.config.ts
// — never type these numbers/strings inline in a scene). Task 2 (FTUE sharpening:
// first-win beat + early next-unlock nudge) owns this file for now; Task 3
// (win-streak momentum + near-miss encouragement) appends its own section below.
export const RETENTION = {
  // ── Task 2: one-time first-win hero beat (win overlay) ──────────────────
  // How long the hero line stays up before fading — comfortably readable, but
  // short enough that entrance + hold + fade all complete inside the ~2450ms
  // post-win auto-advance window (so the fade actually plays, not just gets wiped).
  FIRST_WIN_MS: 1600,
  FIRST_WIN_FADE_MS: 300, // fade-out tween once FIRST_WIN_MS elapses
  FIRST_WIN_TEXT: 'You brought your first star home ★',
  FIRST_WIN_COLOR: '#ffd166', // gold — distinct from the green LEVEL COMPLETE title

  // ── Task 2: next-unlock momentum nudge (win overlay, early levels only) ──
  // An onboarding aid, not permanent clutter — only surfaced through this level.
  NUDGE_MAX_LEVEL: 15,
  NUDGE_COLOR: THEME.TEXT_MUTED, // subordinate to the title/stars
} as const;
