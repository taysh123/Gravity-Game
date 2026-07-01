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

  // ── Task 3: win-streak momentum (escalating flourish + repeatable bonus) ──
  // Consecutive-campaign-win tiers — an escalating "temperature" (cool → hot →
  // white-hot) driving the win-overlay flourish. The streak breaks ONLY on a
  // death (GameScene.triggerDeath); a manual restart/leaving a level is a
  // player choice, not a loss (see StreakStore).
  STREAK_FLOW_MIN: 3,
  STREAK_BLAZE_MIN: 5,
  STREAK_NOVA_MIN: 8,
  STREAK_FLOW_LABEL: 'FLOW',
  STREAK_BLAZE_LABEL: 'BLAZE',
  STREAK_NOVA_LABEL: 'NOVA',
  STREAK_FLOW_COLOR: '#00d4ff', // cool cyan — matches THEME.ACCENT_CYAN
  STREAK_BLAZE_COLOR: '#ffa64d', // warm amber — matches COLOR_PORTAL_B
  STREAK_NOVA_COLOR: '#ffffff', // white-hot peak

  // Repeatable Stardust bonus at exact streak counts — intentionally fires
  // again on every future streak that reaches these counts (see
  // Rewards.grantStreakReward for why this skips the usual RewardStore
  // one-time-ever guard).
  STREAK_MILESTONES: [
    { count: 3, stardust: 10 },
    { count: 5, stardust: 20 },
    { count: 8, stardust: 35 },
    { count: 12, stardust: 60 },
  ],

  // ── Task 3: near-miss encouragement ("so close, try again") ──────────────
  NEAR_GOAL_PX: 60, // a death within this many px of the goal reads as "so close"
  JUST_PAR_MS: 400, // a win finishing this much (or less) OVER par reads as "just missed ★★★"
  SO_CLOSE_TEXT: 'SO CLOSE — try again',
  SO_CLOSE_COLOR: '#ffb37a', // warm encouragement — distinct from the death-red flash
  JUST_PAR_SUFFIX: 'from ★★★ — retry?', // scene composes `${fmtTime(over)} ${JUST_PAR_SUFFIX}`
  JUST_PAR_COLOR: '#ffd166', // matches the star gold
} as const;
