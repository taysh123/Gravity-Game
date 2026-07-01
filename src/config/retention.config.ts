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
  STREAK_LABEL_BASE_PX: 12,  // streak label font size at tier 0…
  STREAK_LABEL_STEP_PX: 2,   // …+this per tier level (→ 14/16/18 for FLOW/BLAZE/NOVA)

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

  // ── Task 4: milestone / collection-complete celebrations (win overlay) ───
  // Total-stars milestones (30/60/100/150★) and collection-completion Fragment
  // grants (Rewards.claimMilestoneRewards / claimCollectionRewards) used to
  // land silently — Fragments just appeared in the balance. These surface
  // them as a rarer-tier toast than the generic achievement toast (same glass
  // pattern, stacked below it — see GameScene.showWinOverlay), plus a
  // celebrationFlash tint. Flavor names for each star tier — purely cosmetic
  // display text, no gameplay meaning.
  MILESTONE_LABEL: { 30: 'Voyager', 60: 'Luminary', 100: 'Ascendant', 150: 'Celestial' } as Record<number, string>,
  MILESTONE_HEAD: '★ MILESTONE',
  COLLECTION_HEAD: '◆ COLLECTION',
  COLLECTION_TEXT_PREFIX: 'Collection complete: ',
  MILESTONE_TOAST_COLOR: '#ffd166', // gold — matches PHYSICS.COLOR_STAR / the star row above
  COLLECTION_TOAST_COLOR: '#c9a8ff', // violet — matches the Fragments accent (CosmeticsScene FRAGMENT)
  MILESTONE_FLASH_COLOR: 0xffd166, // celebrationFlash tint (numeric) — gold
  COLLECTION_FLASH_COLOR: 0xc9a8ff, // celebrationFlash tint (numeric) — violet

  // ── Task 5: daily login bonus (escalating-then-cyclic ladder) ───────────
  // A free Stardust/Fragments reward for opening the app, keyed to a
  // CONSECUTIVE-LOGIN-DAY counter (DailyStore.claimLoginBonus) — separate
  // from the daily-CHALLENGE streak above (a player can open the app without
  // playing the daily). Climbs day 1 → day 7 (the best reward), then cycles
  // (day 8 repeats day 1, …) so a very long login streak keeps paying out.
  // Currency/Fragments only — never a purchase, never gameplay-affecting.
  LOGIN_BONUS_LADDER: [
    { sd: 10, fr: 0 }, // day 1
    { sd: 12, fr: 0 }, // day 2
    { sd: 15, fr: 1 }, // day 3
    { sd: 18, fr: 0 }, // day 4
    { sd: 22, fr: 1 }, // day 5
    { sd: 28, fr: 1 }, // day 6
    { sd: 40, fr: 3 }, // day 7 — best; day 8 cycles back to day 1
  ] as Array<{ sd: number; fr: number }>,

  // ── Task 5: earned-only streak-freeze ("streak protection") ─────────────
  // +1 freeze token every Nth CONSECUTIVE daily-streak day (DailyStore.recordWin),
  // capped so tokens can't stockpile unboundedly. NEVER purchasable — the hard
  // no-P2W line for this feature. A held token silently forgives exactly one
  // missed day (daily.ts#nextStreakWithFreeze) so a long streak survives.
  STREAK_FREEZE_GRANT_EVERY: 7,
  STREAK_FREEZE_MAX: 3,

  // ── Task 5: MainMenu DAILY REWARD chest + streak-protection surfacing ───
  // Gold while claimable, dim once claimed today (DailyStore.loginBonusClaimedToday).
  // Numeric hexes for Graphics tint/stroke; CSS-hex strings for Text color.
  LOGIN_CHEST_GOLD: 0xffd166,
  LOGIN_CHEST_DIM: 0x6b7080,
  LOGIN_CHEST_GOLD_TEXT: '#ffd166',
  LOGIN_CHEST_DIM_TEXT: THEME.TEXT_MUTED,
  LOGIN_CHEST_CLAIM_POP_MS: 260, // claim flourish enter (scale+fade in)
  LOGIN_CHEST_EXIT_MS: 170, // claim flourish exit — ~65% of enter (timing-token rhythm)
  LOGIN_CHEST_HOLD_MS: 700, // how long the granted-amount text holds before exiting
  LOGIN_CHEST_FLOURISH_RISE_PX: 22, // px the granted-amount text floats up on exit
  PROTECTED_SUFFIX: ' · protected', // appended to the DAILY caption while a freeze is held
} as const;
