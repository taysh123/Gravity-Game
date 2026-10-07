# Feature Matrix & Decision Matrix

> **Status:** plan of record from 2026-10-07 (baseline `master @ d3c6aab`). This file holds the scoring that [`MASTER-ROADMAP.md`](MASTER-ROADMAP.md) §2 points to.
> **It conforms to** [`DECISIONS.md`](DECISIONS.md). Where a row recommends something DECISIONS.md does not yet say, it is marked as a **proposal** in §6–§7. Under DECISIONS.md's own rule, the decision register must be edited before the code changes.
> **Evidence:** research briefs in [`../research/`](../research/) (condensed in [`../research/RESEARCH-SUMMARY.md`](../research/RESEARCH-SUMMARY.md)), the naming screen [`../launch/NAMING-STUDY.md`](../launch/NAMING-STUDY.md), and the baseline audit [`../audit/2026-10-07/STATE-AUDIT.md`](../audit/2026-10-07/STATE-AUDIT.md).

## 1. How to read this file

**Value columns (1–5).** How much the feature moves each outcome *for this game*, not in general.
- **Player:** understanding, enjoyment, fairness, mastery.
- **Ret.:** D1/D7/D30 return.
- **Mon.:** ARPDAU or payer conversion.
- **Viral:** installs from sharing, ratings or store conversion.

| Value | Meaning |
|---|---|
| 1 | negligible or indirect |
| 3 | clear, measurable lift on one outcome |
| 5 | transformative, or a precondition for the outcome to exist at all |

**Effort columns (1–5), solo developer.** These follow the audit's sizing (§Q: S ≤ 2 days, M 3–5 days, L 1–2 weeks, XL > 2 weeks).

| Effort | Meaning |
|---|---|
| 1 | ≤ 1 day |
| 2 | 2–3 days |
| 3 | about 1 week |
| 4 | about 2 weeks |
| 5 | more than 2 weeks |

QA effort counts device-only verification heavily, because that time is calendar-bound and owner-dependent.

**Risk (L/M/H).** The chance the feature regresses something or breaks a policy, trust or brand promise.

**Recommendation:**
- **Build:** in the plan, at the phase shown.
- **Build later:** wanted, but only after its dependencies *and* data justify it.
- **Defer:** not planned; revisit when [`SUCCESS-METRICS.md`](SUCCESS-METRICS.md) shows a trigger (D-30).
- **Reject:** conflicts with a decision or a guardrail.

**Class** follows MASTER-ROADMAP §2:
- **P0:** correctness, security, compliance, launch blockers.
- **P1:** foundational player value (physics, loop, level quality, render, durability).
- **P2:** retention, monetization, growth.
- **P3:** experiments and optional future systems.

**Phase** is the MASTER-ROADMAP §4 phase plus its step in [`EXECUTION-ORDER.md`](EXECUTION-ORDER.md).

**Evidence shorthand:**

| Shorthand | File |
|---|---|
| physics | `docs/research/physics-rendering.md` |
| android | `docs/research/android-capacitor.md` |
| monetization | `docs/research/monetization.md` |
| game-design | `docs/research/game-design.md` |
| retention | `docs/research/retention-analytics-liveops.md` |
| UX | `docs/research/ux-visual-motion.md` |
| launch | `docs/research/play-launch-compliance-aso.md` |
| NAMING-STUDY | `docs/launch/NAMING-STUDY.md` |
| audit | `docs/audit/2026-10-07/STATE-AUDIT.md` |

`§`, `Q` and `#` point at sections, questions and list items in those files.

## 2. Scoring formula (MASTER-ROADMAP §2, made explicit)

```
Score = (Player + Retention + Monetization + Virality) × Confidence ÷ Effort × RiskFactor
Effort      = mean(Eng, Design, QA)                       (1.00 – 5.00)
Confidence  = 1.0  verified in source / simulation / official documentation
              0.8  industry or academic precedent (IND / ACAD)
              0.6  opinion or analogy only
              0.5  speculative; only matters once DAU exists
RiskFactor  = L 1.00 · M 0.85 · H 0.70                    (the "risk penalty")
```

**Worked example (F21, result screen):** (5 + 4 + 2 + 1) = 12 × 1.0 ÷ mean(2, 2, 2) = 2.00 × 1.00 = **6.00**.

Scores were computed by script from the matrix below, so the arithmetic matches the tables exactly.

**Ranking rules:**
- Rank **within a class**, and finish a class before relying on the next one. Nothing ships with an open P0.
- **Tie-breaker:** the item that unblocks the most downstream items wins.
- Excitement is never a criterion.
- §6 lists every place where execution order deliberately departs from score order.

## 3. The matrix

101 candidate features. IDs are stable; cite them as `F##` in plans.

### P0: Foundation & launch-blocker correctness

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F01 | Purchases correctness: entitlement-as-truth, non-consumable flags, pending/restore, store prices | 3 | 2 | 5 | 1 | 2 | 1 | 4 | M | Step 1 deps bump; owner RevenueCat + Play products, license testers | monetization §0, Q1–Q2; audit F.1, H.2#2; D-09 | Build | P0 | P0 (step 3) |
| F02 | Ads plumbing: preload, event-driven rewarded + 5 s watchdog, awaited interstitial, busy guards | 4 | 3 | 5 | 1 | 2 | 1 | 3 | M | Step 1; consent-first boot | monetization §0, Q3, Q6; audit F.1, O#2; D-24 | Build | P0 | P0 (step 4) |
| F03 | Consent-first boot + privacy entry points (UMP before AdMob init, Firebase defaults denied, policy link, reset analytics) | 2 | 1 | 4 | 1 | 2 | 1 | 3 | M | Step 1; owner AdMob GDPR + US-states messages | monetization Q3–Q4; retention Q1; launch §2, §4; audit I.3; D-10 | Build | P0 | P0 (step 4) |
| F04 | Android platform contract: back router, pause/foreground + audio suspend, portrait + appCategory, VIBRATE, singleTop, SystemBars, minWebView 87, renderer-crash recovery | 4 | 3 | 2 | 1 | 3 | 1 | 4 | M | Step 1 (Capacitor 8.5.2, @capacitor/app 8.1.2) | android "Fix first" 1–4, Q1–Q6, Q12; audit H.3; D-11 | Build | P0 | P0 (step 2) |
| F05 | Durable saves: Preferences mirror, shape validation, last-good backup key, backup rules | 4 | 4 | 2 | 1 | 2 | 1 | 3 | M | Platform contract (manifest); Step 1 | android Q10; audit H.4, K#10; D-12 | Build | P0 | P0 (step 2) |
| F06 | Security dependency bump (Capacitor 8.5.2 + plugins; AdMob 8.2.x in a separate soak commit) | 1 | 1 | 2 | 1 | 1 | 1 | 2 | L | Step 0 | android Q11; audit B.4, H.2#5; D-11 | Build | P0 | P0 (step 1) |
| F07 | Error boundary ("tap to restart") + Crashlytics stack traces and custom keys | 3 | 3 | 1 | 1 | 2 | 1 | 2 | L | Platform contract | audit H.3 (uncaught exception = freeze); retention Q1 (keys) | Build | P0 | P0 (step 5) |
| F08 | Analytics hygiene: drop reserved session_start, pre-consent queue, manual screen_view, name/param lint | 1 | 3 | 2 | 1 | 1 | 1 | 2 | L | Consent-first boot | retention Q1; audit G.3; D-14 | Build | P0 | P0 (step 5) |
| F09 | Versioning & release engineering: versionCode scheme, proguard-optimize, Play App Signing, keystore backed up ×2 | 1 | 1 | 2 | 1 | 1 | 1 | 1 | L | none | launch §7, D3; audit I.4, K#9; D-20 | Build | P0 | P0 (step 0) |
| F10 | Docs SSOT: STATUS.md + facts script + archive stale docs | 1 | 1 | 1 | 1 | 2 | 1 | 1 | L | none | audit J.1–J.2, T | Build | P0 | P0 (step 0) |
| F11 | Honest store copy (no "leaderboard" claim, offline wording, title case) | 2 | 1 | 2 | 2 | 1 | 1 | 1 | L | none | launch §5 deltas; audit I.2; D-17 copy rule | Build | P0 | P0 (step 5) |
| F12 | Developer website + app-ads.txt at the domain root (also hosts assetlinks.json + policy) | 1 | 1 | 5 | 2 | 1 | 2 | 1 | M | Owner domain choice (user site vs custom domain; tied to D-19) | launch §0.4, A4; monetization Q4; android Q8; audit I.1 | Build | P0 | P11 (live before production) |

### P1: Core physics determinism

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F13 | Fixed-step physics: FixedStepper, autoUpdate:false, half-step bias, ≤4 steps/frame, render interpolation | 5 | 4 | 2 | 2 | 5 | 2 | 4 | H | Platform-contract pause hooks | physics Q1, Q3, Q5; game-design §0.2; audit H.2#1; D-01 | Build | P1 | P1 (step 6) |
| F14 | Armed simulation on first touch | 4 | 3 | 1 | 1 | 2 | 1 | 2 | L | Fixed-step physics | audit C.2 (L11/L12 self-solve), C.2 fix (f); D-02 | Build | P1 | P1/P3 (steps 6, 10) |
| F15 | Per-step gameplay checks + win-over-hazard precedence + queued side effects | 4 | 3 | 1 | 1 | 2 | 1 | 2 | M | Fixed-step physics | physics Q2; audit C.2 (L74: 47% deaths); D-03 | Build | P1 | P1 (step 6) |
| F16 | Multi-rate harness + input-log replay determinism + wall-clock lint | 2 | 2 | 1 | 1 | 3 | 1 | 2 | L | Fixed-step physics | physics Q1 validation, Q4; D-01 acceptance | Build | P1 | P1 (step 7) |
| F17 | FORCE_SCALE calibration + owner device A/B (1.0 / 1.5 / 2.08) | 5 | 3 | 1 | 1 | 1 | 2 | 3 | H | Harness; a 120 Hz and a 60 Hz device | physics Q1 (2.08× simulated vs 2.2× field); D-01 calibration | Build | P1 | P1 → final in P4-α (step 13) |

### P2: Level engine & QA

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F18 | Level data model v2: stable ids, idea/role/teaches/uses, explicit world lists, id migration | 2 | 3 | 1 | 1 | 3 | 2 | 3 | M | M0 | game-design §1, §5; audit C.0, C.4; D-05 | Build | P1 | P2 (step 8) |
| F19 | Shared pure sim + level-QA bot A0–A3 + static validators v2 + CI gate | 4 | 4 | 1 | 1 | 4 | 2 | 3 | M | Fixed-step physics, harness, data model v2 | game-design §6; physics Q4; audit C.0 (sim.cjs), C.4 (validator gaps); D-06 | Build | P1 | P2 (step 9) |
| F20 | Bot A4–A6 + mechanic ablation + par formula + nightly report | 4 | 3 | 1 | 1 | 4 | 2 | 3 | M | QA bot A0–A3 | game-design §2 (par), §6; D-06 | Build | P1 | P2 (step 11) |

### P3: Core "one more try" loop

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F21 | Result screen NEXT / RETRY / LEVELS, no auto-advance, interstitial only after NEXT | 5 | 4 | 2 | 1 | 2 | 2 | 2 | L | Ads plumbing | UX §3; game-design §3; audit E.1#4, G.5#1; D-08 | Build | P1 | P3 (step 10) |
| F22 | Death cause stamp (≤600 ms to control) + title card / intro zoom once per session | 4 | 4 | 1 | 1 | 2 | 2 | 1 | L | Armed simulation | game-design §3 (McMillen); UX §3; audit D, E.1#6; D-08 | Build | P1 | P3 (step 10) |
| F23 | Fail-relief ladder: notice-hint → "Show me" route ghost → "Skip for now" | 5 | 5 | 2 | 1 | 3 | 4 | 3 | M | Bot route (A5), armed sim, relief field in data model v2 | game-design §2 (Super Guide, Celeste); monetization Q7; audit G.5#3, K#4; D-07 | Build | P1 | P3 (step 10) |
| F24 | Open-frontier unlock (2 levels ahead; next world at 8/10 or a star threshold) | 4 | 4 | 1 | 1 | 2 | 2 | 2 | L | Data model v2 (ids) | game-design §2; audit G.4#2; D-07 | Build | P1 | P3 (step 10) |
| F25 | Hint rewrite as questions + hint chip (Exo 2, wrapped, first attempt only) | 4 | 3 | 1 | 1 | 1 | 3 | 1 | L | none (chip ships in P5-A) | game-design §1 (Carlsen); UX §1a; audit E.1#3, C.2 fix (g) | Build | P1 | P3/P5-A (steps 10, 12) |

### P4: Campaign redesign

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F26 | P4-α: Worlds 1–3 rework against bot gates (par from formula, no debut in a boss) | 5 | 5 | 2 | 2 | 2 | 5 | 4 | M | Bot A0–A6, result screen, relief ladder, P5-A render | audit C.2 (first 10 minutes), R; game-design §1–2; D-27 | Build | P1 | P4 (step 13) |
| F27 | Zone strength retune to ≈ attractor force at 120–140 px | 4 | 3 | 1 | 1 | 1 | 3 | 3 | M | Bot fight test; FORCE_SCALE decision | game-design §0.1; audit C.2 fact 1; D-04 | Build | P1 | P4 (step 13) |
| F28 | Campaign waves W4–15: bypass fixes, copies → labelled remixes or cut | 5 | 5 | 2 | 2 | 2 | 5 | 5 | H | M1 telemetry; P4-α | audit C.2–C.4, K#5; game-design §5; D-27 | Build | P1 | P4 (step 15) |
| F29 | Boss phases + finale synthesis (3-act L150, rename L80) | 5 | 4 | 1 | 3 | 3 | 5 | 4 | M | Data model v2 boss metadata; QA bot | game-design §4; audit C.3 weakest #1, D (emotional payoff) | Build | P1 | P4 (step 15) |
| F30 | Cheap mechanic variants: moving wells, polarity flip, anti-gravity field, limited presses | 4 | 4 | 1 | 2 | 3 | 4 | 3 | M | QA bot; data model v2; D-26 (formula unchanged) | audit C.6; game-design §5 twist list | Build later | P1 | P4 (step 15 waves) |

### P5: UX/UI, visual & motion

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F31 | P5-A render: remove camera bloom + ball postFX glow; additive glow sprites; baked static layers; pre-rendered vignette | 4 | 2 | 2 | 3 | 2 | 3 | 3 | M | M0 | physics Q6; UX §0.1–0.2, §5; audit E.1#1; D-13 | Build | P1 | P5-A (step 12) |
| F32 | HudScene / FX-free HUD camera | 3 | 2 | 1 | 1 | 3 | 1 | 2 | M | P5-A render | physics Q6.5; UX §5.3; audit E.1#1; D-13 | Build | P1 | P5-A (step 12) |
| F33 | Quality tiers (Low/Mid/High) + persisted FPS watchdog + render scale | 4 | 3 | 1 | 1 | 3 | 2 | 4 | M | P5-A render | UX §5; physics Q6 budget; audit H.4, H.6; D-13 | Build | P1 | P5-A (step 12) |
| F34 | Design tokens v2 + component kit (Button variants, Modal, Toast queue, ScrollView, text factory) | 3 | 2 | 2 | 1 | 3 | 4 | 2 | M | ResultPanel from step 10 | UX §1, §8 (P0-1 … P1-12); audit E.2–E.3 | Build | P2 | P5 (step 16) |
| F35 | Accessibility: Hold/Toggle attractor, Large text, shake slider, high-contrast gameplay, flash toggle | 4 | 2 | 1 | 1 | 2 | 2 | 2 | L | Settings v2 (component kit) | UX §6 (GAG, XAG 102/117); MASTER §5 accessibility track | Build | P1 | P5 (step 16) |
| F36 | Level select constellation path (LevelNode, current/boss/lock markers, auto-centre) | 3 | 3 | 1 | 1 | 2 | 3 | 1 | L | ScrollView | UX §4; audit E.1#7 | Build | P2 | P5 (step 16) |
| F37 | Shop v2: preview-stage try-on, sticky action bar, bundle art, store-sourced prices | 3 | 2 | 4 | 1 | 3 | 3 | 2 | L | Component kit; purchases correctness | UX §4 (shop); audit E.1#9 | Build | P2 | P5/P7 (steps 16, 18) |
| F38 | Splash fast path (full intro on first launch only) | 3 | 3 | 1 | 1 | 1 | 1 | 1 | L | Remote Config fetch window (activate-cached strategy) | UX §8 P2-16; audit E.1#13, G.4#3 | Build | P1 | P5 (step 16) |
| F39 | EndScene finale ceremony: reunion vignette, stats card, credits, next-goal CTA | 4 | 3 | 1 | 3 | 2 | 3 | 1 | L | Finale synthesis | UX §3 (EndScene); audit E.1#11, D | Build | P2 | P5 (step 16) |
| F40 | World/boss completion ceremony + world cosmetics on the Star Map | 4 | 4 | 1 | 2 | 2 | 3 | 1 | L | Currency merge (rewards); component kit | audit G.5#9, D#5 | Build | P2 | P5/P6 (steps 16–17) |
| F41 | Audio identity: ambient soundtrack or Zen mode, UI tap sounds, distinct fail sounds | 4 | 3 | 1 | 1 | 2 | 4 | 1 | L | none | audit D#8, E.2; UX §6 (audio cues) | Build later | P2 | P5 (post-M2) |
| F42 | Assist: game speed 70/85/100% (par star off while active) | 3 | 2 | 1 | 1 | 2 | 2 | 3 | M | Fixed-step sim (time scale), bot par | UX §6 (Celeste Assist Mode) | Build later | P2 | P5 (post-M2) |

### P6: Retention & meta

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F43 | Analytics taxonomy v2 + 10 user properties (level_start / level_end{attempt,success,cause,…}) | 1 | 4 | 3 | 1 | 2 | 2 | 2 | L | Analytics hygiene; consent; level_id from data model v2 | retention Q2; audit G.3, P#8; D-14 | Build | P2 | P6 (step 17; subset pulled into step 10) |
| F44 | Remote Config: activate cached → 3 s fetch during splash; clamped rcConfig.ts | 1 | 3 | 4 | 1 | 2 | 1 | 2 | L | Consent-first boot | retention Q3; audit G.5#5; D-14 | Build | P2 | P6 (step 17) |
| F45 | Daily v2: bot-verified pool, dated RC schedule, unlimited attempts, one payout/day, gated after W1 | 4 | 5 | 2 | 3 | 3 | 3 | 2 | M | QA bot; Remote Config; data model v2 | game-design §8; retention Q3 (determinism risk); audit C.5, G.2; D-21 | Build | P2 | P6 (step 17) |
| F46 | Local notifications: pre-prompt after 2nd Daily win / streak 3, ≤1/day, inexact, quiet hours | 2 | 5 | 2 | 1 | 2 | 2 | 3 | M | Daily v2; consent; SCHEDULE_EXACT_ALARM removed | retention Q5; android Q7; audit G.5#2, K#6; D-15 | Build | P2 | P6 (step 17) |
| F47 | Login calendar pauses (no reset) + comeback gift (7+ days, once per lapse) + visible calendar | 3 | 4 | 1 | 1 | 1 | 2 | 1 | L | none | retention Q4 (EU DFA); audit G.2, G.5#8/#14; D-18 | Build | P2 | P6 (step 17) |
| F48 | Missions / weekly personal milestone track | 3 | 4 | 2 | 1 | 2 | 3 | 2 | M | Currency merge; taxonomy v2 | retention Q4 (milestone tracks); audit G.5#4 | Build | P2 | P6 (step 17) |
| F49 | Achievements v2: ≥15, 5 earnable early, progress bars, PGS-mappable | 3 | 3 | 1 | 2 | 2 | 2 | 1 | L | none (PGS mapping with the plugin) | retention Q7–Q8 (PGS blog, Level Up); audit G.2 | Build | P2 | P6 (step 17) |
| F50 | Cloud save: PGS Saved Games snapshot + pure mergeSave() | 4 | 3 | 2 | 1 | 3 | 1 | 3 | M | Local PGS plugin; durable saves | android Q9; retention Q7; audit K#10; D-12 | Build | P1 | P6 per D-12 (plugin lands P8: see overrides) |
| F51 | Remix mode: mirrored layout + one Prankster-style modifier, bot-verified | 4 | 4 | 1 | 2 | 2 | 3 | 3 | M | Data model v2 variants; QA bot; campaign waves | game-design §5; audit C.6 | Build later | P2 | P6 (post-campaign) |
| F52 | Boss Rush (15 bosses, cumulative sim time) | 3 | 3 | 1 | 2 | 2 | 2 | 2 | L | Boss phases; harness (sim time) | game-design §5; audit C.6, G.5#13 | Build later | P2 | P6 (post-campaign) |
| F53 | Time Attack vs the bot "author ghost" | 3 | 3 | 1 | 2 | 2 | 2 | 2 | L | Bot A5 routes; replay determinism | game-design §5 (Trackmania); audit G.5#11 | Build later | P2 | P6 (post-campaign) |

### P7: Monetization design

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F54 | Currency merge: Fragments → Stardust ×10 (value-neutral, idempotent migration) | 3 | 3 | 3 | 1 | 2 | 3 | 3 | M | Currency events in taxonomy v2; durable saves | monetization Q5; audit F.2; D-23 (PROPOSED) | Build | P2 | P7 (step 18) |
| F55 | Spotlight shop rotation (Stardust-only discount, honest schedule, no countdown) | 3 | 3 | 3 | 1 | 2 | 2 | 1 | L | Currency merge; shop v2 | monetization Q5 (sinks); D-23 | Build | P2 | P7 (step 18) |
| F56 | Daily Star Chest rewarded (50 SD/day; replaces the free-Fragments ad) | 2 | 3 | 3 | 1 | 1 | 1 | 2 | L | Currency merge; ads plumbing | monetization Q5–Q6 (Unity placements) | Build | P2 | P7 (step 18) |
| F57 | Route-ghost hint token: earned tokens + optional rewarded, never sold | 4 | 4 | 3 | 1 | 2 | 3 | 2 | M | Relief ladder; ads plumbing | monetization Q7 (CrazyGames; Unity 38.1% context); D-07, D-24 | Build | P2 | P7 (step 18) |
| F58 | Ad caps via Remote Config (L12 grace, ≥180 s + 3 completions, ≤4/session, ≤10/day) | 3 | 3 | 4 | 1 | 1 | 1 | 2 | L | Remote Config; ads plumbing | monetization Q4, Q6; D-24 | Build | P2 | P7 (step 18) |
| F59 | No-Ads+ perk: rewarded rewards without the ad, same caps | 3 | 2 | 4 | 1 | 2 | 2 | 3 | M | Purchases; ads plumbing; ad caps | monetization Q5.3; audit F.4#6 | Build | P2 | P7 (step 18) |
| F60 | Supporter pack $9.99 (exclusive set + no_ads) | 2 | 1 | 4 | 1 | 1 | 2 | 2 | L | Purchases correctness | monetization Q5.3; audit F.2 (no whale outlet), F.4#9 | Build | P2 | P7 (step 18) |
| F61 | Starter offer after the W1 boss (non-modal card, 7 days, hidden once no_ads owned) | 2 | 1 | 4 | 1 | 1 | 2 | 2 | M | Purchases; result screen | MASTER P7; monetization Q5.4 (after first win); audit Q Phase 4 (after L10 boss) | Build | P2 | P7 (step 18) |
| F62 | Soft Remove-Ads card after the 3rd lifetime interstitial | 1 | 1 | 3 | 1 | 1 | 1 | 1 | M | Ad caps; Remote Config | audit Q Phase 4 | Build later | P2 | P7 (RC experiment) |
| F63 | Regional PPP price tuning (IN, BR, ID, MX, TR, PH, EG) | 2 | 1 | 3 | 1 | 1 | 1 | 1 | L | Purchases; owner Play pricing | monetization Q5.5 | Build later | P2 | P7/P12 |
| F64 | Seasonal cosmetic packs ($2.99 each) | 2 | 2 | 3 | 1 | 1 | 3 | 2 | M | Seasonal palettes; purchases | monetization Q5.3; audit F.4#11 | Build later | P2 | P10 |

### P8: Gravity Run 2.0 & competition

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F65 | Gravity Run 2.0 chunk pipeline: authored + x-mirror + bot-verified jitter, ≥40 chunks, seam pair-check | 4 | 4 | 3 | 2 | 4 | 4 | 3 | M | QA bot; fixed-step physics | game-design §7; audit C.5, D#6, L.1#3; D-22 | Build | P2 | P8 (step 20) |
| F66 | Biome phases + composition escalation + rest chunks | 3 | 4 | 1 | 1 | 2 | 3 | 2 | L | Chunk pipeline | game-design §7 (Isaksen survival curves); audit C.5 (plateau after ~50 s); D-22 | Build | P2 | P8 (step 20) |
| F67 | Endless pause button + Run Over hierarchy (scrim tap inert, RETRY primary) | 4 | 3 | 1 | 1 | 1 | 1 | 1 | L | Platform contract | UX §3 (Run Over); audit E.1#10, H.3; D-22 | Build | P1 | P8 per D-22 (pull into step 2: see overrides) |
| F68 | PB ghost race (animated, sim-timestamped) | 3 | 3 | 1 | 2 | 2 | 2 | 1 | L | Replay determinism | game-design §3; audit C.6, G.5#11; D-22 | Build | P2 | P8 (step 20) |
| F69 | PGS v2 leaderboards via local plugin (Weekly + Endless) + weekKey → Sunday 07:00 UTC | 3 | 4 | 1 | 3 | 4 | 1 | 3 | M | Fixed-step physics (fairness); deps bump; owner PGS console setup | retention Q8; android Q9; audit G.5#7; D-17 | Build | P2 | P8 (step 20) |

### P9: Social & viral

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F70 | Daily share card (spoiler-free image + text via Share + Filesystem) | 3 | 3 | 1 | 5 | 2 | 2 | 2 | L | Daily v2 | retention Q6 (Wordle); game-design §8; android Q8; D-16 | Build | P2 | P9 (step 21) |
| F71 | In-app review at positive moments (no pre-question, quota-aware) | 1 | 1 | 2 | 3 | 1 | 1 | 1 | L | Result screen | retention Q6; launch §5, F2; D-16 | Build | P2 | P9 per D-16 (pull to M2: see overrides) |
| F72 | Weekly-seed challenge links: App Links + web landing + Install Referrer | 3 | 3 | 1 | 5 | 3 | 2 | 3 | M | Developer website/domain; PGS Weekly board; chunk pipeline | retention Q6; android Q8; audit G.5#6; D-16 | Build | P2 | P9 (step 21) |
| F73 | Creator-friendly features: visible seed codes, custom seed, clean-HUD capture toggle | 2 | 1 | 1 | 3 | 1 | 1 | 1 | L | Chunk pipeline | retention Q6 #5; audit L.2 (short-form video) | Build later | P2 | P9 |

### P10: Live-ops seams

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F74 | event_calendar Remote Config schema + resolver (unknown kinds ignored) | 2 | 3 | 2 | 1 | 2 | 1 | 1 | L | Remote Config | retention Q7; D-14 | Build | P2 | P10 (step 22) |
| F75 | Weekly modifier rotation on the Weekly seed | 3 | 4 | 1 | 2 | 1 | 2 | 2 | L | event_calendar; chunk pipeline | retention Q7; game-design §5, §8; audit G.5#10 | Build | P2 | P10 (step 22) |
| F76 | Seasonal palettes (4 per year via worldThemes) | 2 | 2 | 1 | 2 | 1 | 2 | 1 | L | event_calendar | retention Q7.4 | Build | P2 | P10 (step 22) |
| F77 | Monthly earned cosmetic + vault return (never permanently missable) | 3 | 3 | 2 | 1 | 1 | 3 | 1 | M | event_calendar; currency merge | retention Q7.3; D-23 (seasonal drops) | Build | P2 | P10 (step 22) |

### P11: Brand, ASO & store

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F78 | Naming decision + BRAND config + attorney knockout (see NAMING-STUDY.md) | 2 | 1 | 2 | 3 | 1 | 3 | 1 | H | Owner choice (USER-GATED) | launch §6; NAMING-STUDY §1, §4; audit I.5, K#7; D-19 | Build | P0 | P11 (before step 14) |
| F79 | Store creative v1: 9:16 1080×1920 captioned shots, icon re-export, feature graphic | 1 | 1 | 4 | 3 | 1 | 4 | 1 | M | P5-A render; hint chip; P4-α content; naming | UX §7; launch §5; audit I.2 | Build | P2 | P11 (step 14) |
| F80 | Promo video (20–30 s portrait, gameplay in the first 3 s, readable muted) | 1 | 1 | 3 | 4 | 1 | 4 | 1 | L | Store creative v1 | UX §7; launch §5; audit L.3 (trailer) | Build | P2 | P11 (step 14 or M2) |
| F81 | Localization: listing first (es-419, pt-BR, de, fr, ja, ko, id, tr, ru, hi), then in-game | 2 | 2 | 3 | 2 | 2 | 2 | 3 | M | Store creative v1; textFit for Orbitron | launch §5 (Gemini pre-fill); audit Q Phase 7 | Build later | P2 | P11/P12 |
| F82 | Custom store listings + store listing experiments (icon first, then screenshot 1) | 1 | 1 | 3 | 2 | 1 | 2 | 1 | L | Store creative v1; ≳1,000 listing visitors/week | launch §5 (S24, S25) | Build later | P2 | P12 |

### P12: Launch, platforms & post-launch

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F83 | iOS port: Xcode 26, ATT, SKAdNetwork, privacy manifests, StoreKit via RevenueCat | 3 | 2 | 4 | 3 | 4 | 2 | 4 | H | Stable Android launch; macOS | launch §8; audit I.6; D-29 | Build later | P3 | P12 (step 23) |
| F84 | Play Age Signals plugin (before 2027-01-01, CA AB 1043) | 1 | 1 | 2 | 1 | 2 | 1 | 2 | M | Consent-first boot | launch §3; D-25 | Build | P0 | P12 (date-driven) |
| F85 | @capacitor/haptics (VibrationEffect amplitudes; also required for iOS) | 3 | 1 | 1 | 1 | 1 | 1 | 2 | L | VIBRATE in platform contract | android Q5; UX §6; audit I.6 | Build later | P2 | P12 (or P5) |
| F86 | "60 fps battery" refresh-rate setting (native plugin, best effort) | 2 | 1 | 1 | 1 | 2 | 1 | 3 | M | Fixed-step physics | physics Q5 | Defer | P3 | P12 |
| F87 | R8 / minify | 1 | 1 | 1 | 1 | 2 | 1 | 4 | M | Versioning | launch §7 (DEX vital applies to games only >50 MB) | Defer | P3 | P12 |
| F88 | Phaser 4 migration (behind the src/sim boundary) | 1 | 1 | 1 | 1 | 5 | 1 | 4 | H | src/sim extraction; post-launch | physics Q7; audit H.8; D-28 | Defer | P3 | post-launch |

### Deferred and rejected (D-30 and guardrails)

| ID | Feature | Player | Ret. | Mon. | Viral | Eng | Design | QA | Risk | Dependencies | Research evidence | Recommendation | Class | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F89 | Level editor / UGC share codes | 4 | 4 | 2 | 4 | 5 | 4 | 5 | H | QA bot gating; backend for browsing | audit L.2, Q Phase 8; MASTER P9 must-not (UGC browsing) | Defer | P3 | — |
| F90 | Battle pass / Star Pass | 2 | 3 | 4 | 1 | 3 | 4 | 3 | H | Content pipeline + DAU | retention Q7; audit F.4 ("not justified now"); D-30 | Defer | P3 | — |
| F91 | Event currency (a third currency) | 1 | 2 | 2 | 1 | 2 | 3 | 2 | H | D-23 outcome | retention Q7; monetization Q5 (EU CPC); D-30 | Defer | P3 | — |
| F92 | Friend ghosts via link + Firestore leaderboards | 3 | 3 | 1 | 4 | 4 | 2 | 3 | H | Backend, moderation, Data-safety changes | retention Q6 #6, Q8; D-30 | Defer | P3 | — |
| F93 | Incentivized referral rewards | 1 | 1 | 1 | 2 | 3 | 2 | 3 | H | Fraud controls | retention Q6 #7 ("skip"); D-30 | Defer | P3 | — |
| F94 | FCM announcement campaigns (≤2/month) | 1 | 2 | 1 | 1 | 2 | 1 | 2 | M | Local notifications | retention Q5.7; D-30 | Defer | P3 | — |
| F95 | Play Games Level Up full compliance (Sidekick, PC, reward offers) | 1 | 2 | 2 | 2 | 5 | 2 | 4 | H | PGS boards, cloud save, achievements v2 | retention Q7 (cheap subset only) | Defer | P3 | — |
| F96 | Playable ads / paid UA tests in cheap geos | 1 | 1 | 3 | 2 | 2 | 3 | 1 | M | M3 data | audit L.2; MASTER P11 must-not (paid UA at scale) | Defer | P3 | — |
| F97 | Expert pack (13 retired levels → post-game set) | 2 | 2 | 1 | 1 | 1 | 3 | 3 | L | QA bot; campaign waves | audit C.5, F.4#12; D-27 | Defer | P3 | — |
| F98 | New mechanic worlds (SWITCHBACK, SHATTER, VORTEX, ECLIPSE, ZERO-PRESS) | 4 | 4 | 1 | 2 | 4 | 5 | 5 | H | Campaign waves complete | audit C.6, Q Phase 8; MASTER P4 must-not (new worlds) | Defer | P3 | — |
| F99 | Subscriptions | 1 | 1 | 3 | 1 | 2 | 2 | 3 | H | — | audit F.4 ("would read as predatory"); MASTER P7 must-not | Reject | P3 | — |
| F100 | Repel attractor (inverts the core verb) | 3 | 2 | 1 | 2 | 2 | 4 | 3 | H | Owner ruling on D-26 | game-design §5 (owner decides); D-26 | Reject | P3 | — |
| F101 | Streak repair via rewarded ad | 2 | 3 | 2 | 1 | 1 | 1 | 1 | H | — | audit G.5#8 vs F.3; retention Q4 ("avoid purchasable freezes or repairs") | Reject | P3 | — |

## 4. Ranked lists by class (score order)

The rank is the order of value per unit of effort *within* a class. The actual order of work is EXECUTION-ORDER.md, adjusted by the overrides in §6.
### Class P0 (14 items)

| Rank | ID | Feature | Value sum | Conf. | Effort (mean) | Risk × | **Score** | Rec. |
|---|---|---|---|---|---|---|---|---|
| 1 | F11 | Honest store copy | 7 | 1.0 | 1.00 | 1.00 | **7.00** | Build |
| 2 | F12 | Developer website + app-ads.txt at the domain root | 9 | 1.0 | 1.33 | 0.85 | **5.74** | Build |
| 3 | F02 | Ads plumbing | 13 | 1.0 | 2.00 | 0.85 | **5.52** | Build |
| 4 | F08 | Analytics hygiene | 7 | 1.0 | 1.33 | 1.00 | **5.25** | Build |
| 5 | F09 | Versioning & release engineering | 5 | 1.0 | 1.00 | 1.00 | **5.00** | Build |
| 6 | F07 | Error boundary | 8 | 1.0 | 1.67 | 1.00 | **4.80** | Build |
| 7 | F05 | Durable saves | 11 | 1.0 | 2.00 | 0.85 | **4.67** | Build |
| 8 | F01 | Purchases correctness | 11 | 1.0 | 2.33 | 0.85 | **4.01** | Build |
| 9 | F06 | Security dependency bump | 5 | 1.0 | 1.33 | 1.00 | **3.75** | Build |
| 10 | F03 | Consent-first boot + privacy entry points | 8 | 1.0 | 2.00 | 0.85 | **3.40** | Build |
| 11 | F78 | Naming decision + BRAND config + attorney knockout | 8 | 1.0 | 1.67 | 0.70 | **3.36** | Build |
| 12 | F04 | Android platform contract | 10 | 1.0 | 2.67 | 0.85 | **3.19** | Build |
| 13 | F10 | Docs SSOT | 4 | 0.8 | 1.33 | 1.00 | **2.40** | Build |
| 14 | F84 | Play Age Signals plugin | 5 | 0.8 | 1.67 | 0.85 | **2.04** | Build |

### Class P1 (25 items)

| Rank | ID | Feature | Value sum | Conf. | Effort (mean) | Risk × | **Score** | Rec. |
|---|---|---|---|---|---|---|---|---|
| 1 | F67 | Endless pause button + Run Over hierarchy | 9 | 1.0 | 1.00 | 1.00 | **9.00** | Build |
| 2 | F38 | Splash fast path | 8 | 1.0 | 1.00 | 1.00 | **8.00** | Build |
| 3 | F21 | Result screen NEXT / RETRY / LEVELS, no auto-advance, interstitial only after NEXT | 12 | 1.0 | 2.00 | 1.00 | **6.00** | Build |
| 4 | F14 | Armed simulation on first touch | 9 | 1.0 | 1.67 | 1.00 | **5.40** | Build |
| 5 | F25 | Hint rewrite as questions + hint chip | 9 | 1.0 | 1.67 | 1.00 | **5.40** | Build |
| 6 | F22 | Death cause stamp | 10 | 0.8 | 1.67 | 1.00 | **4.80** | Build |
| 7 | F15 | Per-step gameplay checks + win-over-hazard precedence + queued side effects | 9 | 1.0 | 1.67 | 0.85 | **4.59** | Build |
| 8 | F24 | Open-frontier unlock | 10 | 0.8 | 2.00 | 1.00 | **4.00** | Build |
| 9 | F35 | Accessibility | 8 | 1.0 | 2.00 | 1.00 | **4.00** | Build |
| 10 | F50 | Cloud save | 10 | 1.0 | 2.33 | 0.85 | **3.64** | Build |
| 11 | F31 | P5-A render | 11 | 1.0 | 2.67 | 0.85 | **3.51** | Build |
| 12 | F27 | Zone strength retune to ≈ attractor force at 120–140 px | 9 | 1.0 | 2.33 | 0.85 | **3.28** | Build |
| 13 | F26 | P4-α | 14 | 1.0 | 3.67 | 0.85 | **3.25** | Build |
| 14 | F16 | Multi-rate harness + input-log replay determinism + wall-clock lint | 6 | 1.0 | 2.00 | 1.00 | **3.00** | Build |
| 15 | F32 | HudScene / FX-free HUD camera | 7 | 1.0 | 2.00 | 0.85 | **2.98** | Build |
| 16 | F19 | Shared pure sim + level-QA bot A0–A3 + static validators v2 + CI gate | 10 | 1.0 | 3.00 | 0.85 | **2.83** | Build |
| 17 | F17 | FORCE_SCALE calibration + owner device A/B | 10 | 0.8 | 2.00 | 0.70 | **2.80** | Build |
| 18 | F23 | Fail-relief ladder | 13 | 0.8 | 3.33 | 0.85 | **2.65** | Build |
| 19 | F13 | Fixed-step physics | 13 | 1.0 | 3.67 | 0.70 | **2.48** | Build |
| 20 | F29 | Boss phases + finale synthesis | 13 | 0.8 | 4.00 | 0.85 | **2.21** | Build |
| 21 | F20 | Bot A4–A6 + mechanic ablation + par formula + nightly report | 9 | 0.8 | 3.00 | 0.85 | **2.04** | Build |
| 22 | F33 | Quality tiers | 9 | 0.8 | 3.00 | 0.85 | **2.04** | Build |
| 23 | F28 | Campaign waves W4–15 | 14 | 0.8 | 4.00 | 0.70 | **1.96** | Build |
| 24 | F18 | Level data model v2 | 7 | 0.8 | 2.67 | 0.85 | **1.79** | Build |
| 25 | F30 | Cheap mechanic variants | 11 | 0.6 | 3.33 | 0.85 | **1.68** | Build later |

### Class P2 (45 items)

| Rank | ID | Feature | Value sum | Conf. | Effort (mean) | Risk × | **Score** | Rec. |
|---|---|---|---|---|---|---|---|---|
| 1 | F71 | In-app review at positive moments | 7 | 1.0 | 1.00 | 1.00 | **7.00** | Build |
| 2 | F58 | Ad caps via Remote Config | 11 | 0.8 | 1.33 | 1.00 | **6.60** | Build |
| 3 | F47 | Login calendar pauses | 9 | 0.8 | 1.33 | 1.00 | **5.40** | Build |
| 4 | F56 | Daily Star Chest rewarded | 9 | 0.8 | 1.33 | 1.00 | **5.40** | Build |
| 5 | F44 | Remote Config | 9 | 1.0 | 1.67 | 1.00 | **5.40** | Build |
| 6 | F49 | Achievements v2 | 9 | 1.0 | 1.67 | 1.00 | **5.40** | Build |
| 7 | F70 | Daily share card | 12 | 0.8 | 2.00 | 1.00 | **4.80** | Build |
| 8 | F74 | event_calendar Remote Config schema + resolver | 8 | 0.8 | 1.33 | 1.00 | **4.80** | Build |
| 9 | F75 | Weekly modifier rotation on the Weekly seed | 10 | 0.8 | 1.67 | 1.00 | **4.80** | Build |
| 10 | F43 | Analytics taxonomy v2 + 10 user properties | 9 | 1.0 | 2.00 | 1.00 | **4.50** | Build |
| 11 | F85 | @capacitor/haptics | 6 | 1.0 | 1.33 | 1.00 | **4.50** | Build later |
| 12 | F39 | EndScene finale ceremony | 11 | 0.8 | 2.00 | 1.00 | **4.40** | Build |
| 13 | F63 | Regional PPP price tuning | 7 | 0.6 | 1.00 | 1.00 | **4.20** | Build later |
| 14 | F73 | Creator-friendly features | 7 | 0.6 | 1.00 | 1.00 | **4.20** | Build later |
| 15 | F46 | Local notifications | 10 | 1.0 | 2.33 | 0.85 | **3.64** | Build |
| 16 | F80 | Promo video | 9 | 0.8 | 2.00 | 1.00 | **3.60** | Build |
| 17 | F55 | Spotlight shop rotation | 10 | 0.6 | 1.67 | 1.00 | **3.60** | Build |
| 18 | F45 | Daily v2 | 14 | 0.8 | 2.67 | 0.85 | **3.57** | Build |
| 19 | F69 | PGS v2 leaderboards via local plugin | 11 | 1.0 | 2.67 | 0.85 | **3.51** | Build |
| 20 | F57 | Route-ghost hint token | 12 | 0.8 | 2.33 | 0.85 | **3.50** | Build |
| 21 | F40 | World/boss completion ceremony + world cosmetics on the Star Map | 11 | 0.6 | 2.00 | 1.00 | **3.30** | Build |
| 22 | F68 | PB ghost race | 9 | 0.6 | 1.67 | 1.00 | **3.24** | Build |
| 23 | F36 | Level select constellation path | 8 | 0.8 | 2.00 | 1.00 | **3.20** | Build |
| 24 | F76 | Seasonal palettes | 7 | 0.6 | 1.33 | 1.00 | **3.15** | Build |
| 25 | F82 | Custom store listings + store listing experiments | 7 | 0.6 | 1.33 | 1.00 | **3.15** | Build later |
| 26 | F66 | Biome phases + composition escalation + rest chunks | 9 | 0.8 | 2.33 | 1.00 | **3.09** | Build |
| 27 | F72 | Weekly-seed challenge links | 12 | 0.8 | 2.67 | 0.85 | **3.06** | Build |
| 28 | F79 | Store creative v1 | 9 | 0.8 | 2.00 | 0.85 | **3.06** | Build |
| 29 | F37 | Shop v2 | 10 | 0.8 | 2.67 | 1.00 | **3.00** | Build |
| 30 | F60 | Supporter pack $9.99 | 8 | 0.6 | 1.67 | 1.00 | **2.88** | Build |
| 31 | F51 | Remix mode | 11 | 0.8 | 2.67 | 0.85 | **2.81** | Build later |
| 32 | F77 | Monthly earned cosmetic + vault return | 9 | 0.6 | 1.67 | 0.85 | **2.75** | Build |
| 33 | F52 | Boss Rush | 9 | 0.6 | 2.00 | 1.00 | **2.70** | Build later |
| 34 | F53 | Time Attack vs the bot "author ghost" | 9 | 0.6 | 2.00 | 1.00 | **2.70** | Build later |
| 35 | F54 | Currency merge | 10 | 0.8 | 2.67 | 0.85 | **2.55** | Build |
| 36 | F62 | Soft Remove-Ads card after the 3rd lifetime interstitial | 6 | 0.5 | 1.00 | 0.85 | **2.55** | Build later |
| 37 | F61 | Starter offer after the W1 boss | 8 | 0.6 | 1.67 | 0.85 | **2.45** | Build |
| 38 | F65 | Gravity Run 2.0 chunk pipeline | 13 | 0.8 | 3.67 | 0.85 | **2.41** | Build |
| 39 | F41 | Audio identity | 9 | 0.6 | 2.33 | 1.00 | **2.31** | Build later |
| 40 | F48 | Missions / weekly personal milestone track | 10 | 0.6 | 2.33 | 0.85 | **2.19** | Build |
| 41 | F59 | No-Ads+ perk | 10 | 0.6 | 2.33 | 0.85 | **2.19** | Build |
| 42 | F42 | Assist | 7 | 0.8 | 2.33 | 0.85 | **2.04** | Build later |
| 43 | F64 | Seasonal cosmetic packs | 8 | 0.6 | 2.00 | 0.85 | **2.04** | Build later |
| 44 | F81 | Localization | 9 | 0.6 | 2.33 | 0.85 | **1.97** | Build later |
| 45 | F34 | Design tokens v2 + component kit | 8 | 0.8 | 3.00 | 0.85 | **1.81** | Build |

### Class P3 (17 items)

| Rank | ID | Feature | Value sum | Conf. | Effort (mean) | Risk × | **Score** | Rec. |
|---|---|---|---|---|---|---|---|---|
| 1 | F101 | Streak repair via rewarded ad | 8 | 0.6 | 1.00 | 0.70 | **3.36** | Reject |
| 2 | F83 | iOS port | 12 | 0.8 | 3.33 | 0.70 | **2.02** | Build later |
| 3 | F94 | FCM announcement campaigns | 5 | 0.6 | 1.67 | 0.85 | **1.53** | Defer |
| 4 | F96 | Playable ads / paid UA tests in cheap geos | 7 | 0.5 | 2.00 | 0.85 | **1.49** | Defer |
| 5 | F97 | Expert pack | 6 | 0.5 | 2.33 | 1.00 | **1.29** | Defer |
| 6 | F92 | Friend ghosts via link + Firestore leaderboards | 11 | 0.5 | 3.00 | 0.70 | **1.28** | Defer |
| 7 | F87 | R8 / minify | 4 | 0.8 | 2.33 | 0.85 | **1.17** | Defer |
| 8 | F91 | Event currency | 6 | 0.6 | 2.33 | 0.70 | **1.08** | Defer |
| 9 | F86 | "60 fps battery" refresh-rate setting | 5 | 0.5 | 2.00 | 0.85 | **1.06** | Defer |
| 10 | F89 | Level editor / UGC share codes | 14 | 0.5 | 4.67 | 0.70 | **1.05** | Defer |
| 11 | F90 | Battle pass / Star Pass | 10 | 0.5 | 3.33 | 0.70 | **1.05** | Defer |
| 12 | F100 | Repel attractor | 8 | 0.5 | 3.00 | 0.70 | **0.93** | Reject |
| 13 | F99 | Subscriptions | 6 | 0.5 | 2.33 | 0.70 | **0.90** | Reject |
| 14 | F98 | New mechanic worlds | 11 | 0.5 | 4.67 | 0.70 | **0.82** | Defer |
| 15 | F88 | Phaser 4 migration | 4 | 0.8 | 3.33 | 0.70 | **0.67** | Defer |
| 16 | F95 | Play Games Level Up full compliance | 7 | 0.5 | 3.67 | 0.70 | **0.67** | Defer |
| 17 | F93 | Incentivized referral rewards | 5 | 0.5 | 2.67 | 0.70 | **0.66** | Defer |

## 5. Global top 15 by raw score (for information only)

This list ignores class and dependency. It is useful for spotting cheap wins. Six of the top 15 are scheduled later than their score suggests:
- F67, F38 and F71 are proposals to pull earlier (§6 O13, O14, O17).
- F12, F58 and F56 wait on a real dependency (O4, O18, O20).

| # | ID | Feature | Score | Class |
|---|---|---|---|---|
| 1 | F67 | Endless pause button + Run Over hierarchy | 9.00 | P1 |
| 2 | F38 | Splash fast path | 8.00 | P1 |
| 3 | F11 | Honest store copy | 7.00 | P0 |
| 4 | F71 | In-app review at positive moments | 7.00 | P2 |
| 5 | F58 | Ad caps via Remote Config | 6.60 | P2 |
| 6 | F21 | Result screen NEXT / RETRY / LEVELS, no auto-advance, interstitial only after NEXT | 6.00 | P1 |
| 7 | F12 | Developer website + app-ads.txt at the domain root | 5.74 | P0 |
| 8 | F02 | Ads plumbing | 5.52 | P0 |
| 9 | F47 | Login calendar pauses | 5.40 | P2 |
| 10 | F56 | Daily Star Chest rewarded | 5.40 | P2 |
| 11 | F14 | Armed simulation on first touch | 5.40 | P1 |
| 12 | F25 | Hint rewrite as questions + hint chip | 5.40 | P1 |
| 13 | F44 | Remote Config | 5.40 | P2 |
| 14 | F49 | Achievements v2 | 5.40 | P2 |
| 15 | F08 | Analytics hygiene | 5.25 | P0 |

## 6. Where execution order overrides the score

The score measures value per unit of effort. It does not see that some low-scoring items are the foundation for others. The roadmap is built on one dependency chain:
- deterministic physics, then the QA bot, then content, then store creative;
- consent, then telemetry, then retention and monetization tuning.

Below, every departure from pure score order is listed with its reason.
- **Unblock** means it was moved earlier than its score, because of what it unblocks.
- **Dependency** means it was held later, because something it needs isn't built yet.
- **Guardrail** means a rule overrides the score.
- **Proposal** means the score argues for a schedule change that DECISIONS.md / EXECUTION-ORDER.md do not yet contain.

| # | Item | Score rank | Executed at | Type | Reason |
|---|---|---|---|---|---|
| O1 | F06 Security dependency bump | P0 #9 | Step 1 (first code change) | Unblock | Every native change (F01–F05) must be tested on the final runtime. The installed Capacitor 8.4.0 carries the CVSS 9.3 advisory GHSA-rvm3-566m-v7fv (android Q11). |
| O2 | F10 Docs SSOT · F09 Versioning | P0 #13 · #5 | Step 0 | Unblock | Every later step writes to `STATUS.md` (guardrail "never trust stale docs"). No upload is possible without a versionCode ≥ 2, because an AAB with versionCode 1 is already uploaded (EXTERNAL-SERVICES-AUDIT, Play Console). |
| O3 | F04 Android platform contract | P0 #12 | Step 2, ahead of higher-scoring F11/F02 | Unblock | It provides the pause/foreground hooks that F13 (step 6) needs to freeze `simMs`. It also provides the in-flight flags that keep ad/IAP activities from opening the pause menu (android Q2). |
| O4 | F12 Developer website + app-ads.txt | P0 #2 | P11, live before production (step 19) | Dependency | The domain choice is tied to the naming decision (F78). A custom domain added later breaks App Links verification (android Q8 risk). Without it AdMob applies "limited ad serving" (monetization Q4), so it is the last item that may slip. It may not slip past production. |
| O5 | F78 Naming decision | P0 #11 | Owner decision ASAP; applied in step 14 | Unblock | Unblocks F12 (domain), F79 (creative), F72 (link domain), F70 (share-card wording). Every week of reviews and ASO under the old name raises the rename cost (launch §6, NAMING-STUDY §1). |
| O6 | F84 Play Age Signals | P0 #14 | Before 2027-01-01 | Date | Driven by the CA AB 1043 effective date (launch §3), not by score. |
| O7 | F13 Fixed-step physics | P1 #19 | Step 6, first P1 item | Unblock | It has the most downstream items of any feature: F14–F17, F19, F20, F23, F26–F29, F45, F65, F69. "Content can't be tuned until physics is deterministic" (MASTER §1). Its low score is the honest price of H risk and effort 3.67. |
| O8 | F16 Harness · F17 FORCE_SCALE | P1 #14 · #17 | Step 7 (M0 gate); A/B at M0, final in step 13 | Unblock | The harness is the M0 acceptance test (D-01). A wrong FORCE_SCALE silently invalidates every retune made afterwards (risk R-01). |
| O9 | F18 Level data model v2 | P1 #24 | Step 8 | Unblock | Stable ids are needed by F19 (bot report keyed by id), F23 (relief field), F24 (open frontier), F29 (boss metadata), F45 (Daily pool), F51 (remix variants), and analytics `level_id`. |
| O10 | F19 / F20 QA bot | P1 #16 · #21 | Steps 9 and 11, before any content work | Unblock | Prerequisite for F23 "Show me" (bot route), F26–F29 (gates), F27 (fight test), F45 (Daily pipeline), F65 (seam pair-check). MASTER P2 calls it "highest long-term leverage". |
| O11 | F27 Zone retune | P1 #12 (above F26) | Step 13, with P4-α | Dependency | D-04: "never a blind constant edit". It waits for the F19 fight test and the F17 decision. |
| O12 | F31–F33 Render slice (P5-A) | P1 #11, #15, #22 | Step 12 (pulled early) | Unblock | Closed-test playtests (F26) and every store capture (F79) need the real brightness. Bloom halves luminance (physics Q6, UX §0). |
| O13 | F67 Endless pause button | **P1 #1** | D-22 puts it in P8 (step 20, post-launch) | **Proposal** | Its only dependency is F04. The audit lists "no Endless pause (phone call = death)" as P1 (H.3). The F04 background auto-pause covers app switches, but not a player who wants to stop. **Proposal:** pull into step 2 or step 10; amend D-22. |
| O14 | F38 Splash fast path | **P1 #2** | EXECUTION-ORDER step 16 (after M1) | **Proposal** | Its only interaction is the Remote Config fetch window. First launch keeps the full splash, and returning launches use the "activate cached" strategy (retention Q3). Closed testers otherwise pay about 5.5 s on every launch (audit E.1#13). **Proposal:** pull into step 12. |
| O15 | F43 Analytics taxonomy v2 | P2 #10 | Step 17, after M1 | **Proposal (measurement dependency)** | M1's own success metrics need `attempt`, `success` and `cause`: FASR, APS and QAF per level (MASTER P3 and P4; SUCCESS-METRICS §5). **Proposal:** ship the `level_start` / `level_end{level_id, attempt, success, cause, duration_ms, assisted}` subset in step 10. The rest stays in step 17. |
| O16 | F50 Cloud save vs F69 PGS plugin | P1 #10 · P2 #19 | D-12 says P6 (step 17); the plugin lands in P8 (step 20) | **Proposal (roadmap conflict)** | Saved Games needs the local PGS plugin (android Q9). **Proposal:** build the plugin core (init, sign-in, Saved Games) in step 17 and add the boards in step 20. Alternatively, move cloud save to step 20. Either way, D-12 and D-17 must agree. |
| O17 | F71 In-app review | **P2 #1** | D-16 puts it in P9 (step 21, post-launch) | **Proposal** | It is cheap and documented (retention Q6, launch F2). The launch brief wants rating volume from the launch cohort (§5 "Reviews", "use the closed-test cohort as the first reviewers"). **Proposal:** pull into step 19, using the trigger rule in RESEARCH-SUMMARY contradiction C-12. |
| O18 | F58 Ad caps via Remote Config | P2 #2 | Step 18 | Dependency | Needs F44 (step 17). Compile-time caps from F02 ship at M0, so there is no policy gap meanwhile. |
| O19 | F70 Daily share card | P2 #7 | P9 (step 21) | Dependency | Needs F45 Daily v2: unlimited attempts and the attempt line. It could ship alongside F45 in step 17, since its only other need is `@capacitor/share` + Filesystem. |
| O20 | F55 Spotlight · F56 Daily Star Chest | P2 #17 · #4 | Step 18 | Dependency | Both are priced in merged Stardust (F54, D-23 PROPOSED). If D-23 is rejected, re-price them in Fragments and re-score. |
| O21 | F34 Tokens v2 + component kit | P2 #45 (last) | Step 16, first P5-system item | Unblock | Prerequisite for F35 (Settings v2 accessibility), F36, F37, F39, F40 and the P7 shop. That is five or more dependents, so it wins the tie-breaker despite its score. |
| O22 | F85 `@capacitor/haptics` | P2 #11 | Build later | Dependency | `VIBRATE` (F04) already fixes the dead-haptics bug (android Q5). The plugin's remaining value is amplitude control and iOS parity, so it moves with F83. |
| O23 | F63 PPP pricing · F73 creator features | P2 #13 · #14 | Build later | Data | Both scores rest on 0.6 confidence. PPP experiments need "a few hundred purchases a month" (monetization Q5.5). Creator tools need an audience to create for. |
| O24 | F101 Streak repair via ad | **P3 #1** | Rejected | **Guardrail** | A high raw score from cheap effort. It contradicts retention Q4 ("avoid purchasable freezes or repairs"), the audit's own F.3 "never monetize streak freezes", and the EU DFA target pattern (D-18). |
| O25 | F83 iOS port | P3 #2 | P12 (step 23) | Dependency | D-29: only after the Android launch is stable. It needs macOS + Xcode 26 (launch §8). |

## 7. Plan changes this matrix proposes

These are proposals, not decisions. Each one needs a DECISIONS.md / EXECUTION-ORDER.md edit before implementation.

| Proposal | Affects | Why |
|---|---|---|
| Pull F67 Endless pause into step 2 or 10 | D-22, EXECUTION-ORDER step 20 | Highest P1 score; no dependencies; audit H.3 P1 |
| Pull F38 splash fast path into step 12 | EXECUTION-ORDER step 16 | Second-highest P1 score; independent; closed-test friction |
| Ship the F43 `level_end{attempt,success,cause,…}` subset in step 10 | D-14, EXECUTION-ORDER steps 10/17 | Otherwise M1 cannot measure its own FASR/APS/QAF targets |
| Reconcile cloud save (D-12, P6) with the PGS plugin (D-17, P8) | D-12, D-17 | Saved Games cannot exist before the plugin |
| Pull F71 in-app review into step 19 | D-16 | Rating volume at launch; cheap; documented rules |
| Record the Starter-offer timing (after the W1 boss) as a decision | New D-id | Only MASTER P7 states it. The monetization brief says "after the first win" (RESEARCH-SUMMARY C-13) |
| Add `level_id` (string, D-05) to every level event | D-14, ANALYTICS-PLAN | The retention brief's int `level` breaks across reorders (D-27) |

## 8. Maintenance

- **Re-score at every milestone gate (M0–M3).** Confidence should move toward 1.0 as telemetry replaces opinion. Example: F45 Daily v2 becomes 1.0 once Daily participation is measured.
- **A new candidate feature needs:** a row with an evidence pointer; all four value scores; all three effort scores; dependencies by ID; and a class.
- **Removing a row** needs a reason in the Recommendation cell (Reject or Defer with its D-id).
- Deferred items (D-30) are revisited only when their trigger in [`SUCCESS-METRICS.md`](SUCCESS-METRICS.md) §9 fires.
