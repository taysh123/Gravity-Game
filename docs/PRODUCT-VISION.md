# Gravity Flow: Product Vision

> **What this document is for.** This document is the authority on **why** the game and the business exist and **what** they are.
> - [MASTER-ROADMAP](roadmap/MASTER-ROADMAP.md) (with [EXECUTION-ORDER](roadmap/EXECUTION-ORDER.md)) says **when and in what order** things happen.
> - [STATUS](STATUS.md) says **where the project is** (task state, gates, counts).
> - [DECISIONS](roadmap/DECISIONS.md) wins any conflict, and its Amendments override entry bodies. If this document disagrees with it, fix this document.
>
> "Gravity Flow" is the working title by True Story Labs (D-19). The name is undecided: see [NAMING-STUDY](launch/NAMING-STUDY.md) and OA-07.

**Labels used on every claim**
- **[Decided]**: an accepted decision. It cites a D-xx or A-xx in DECISIONS, or the plan of record (MASTER-ROADMAP §1–§7, adopted 2026-10-07 together with D-01–D-30).
- **[Built]**: exists in code today. It cites a file that was opened while writing this document.
- **[Proposed]**: backed by research but not approved. It cites the [research audit](research/2026-10-14-gravity-flow-research-audit.md) section and the owner action.
- **[Owner input needed]**: only the owner can settle it. It is listed here and never answered.
- *Assumption (source)*: a working assumption taken from the planning text. The owner never stated it and no data has measured it. Each one also appears in §12.

Design documents that are not confirmed in code are called **design intent**, never [Built].

---

## 1. Mission

**[Decided]** *"You don't move the star — you are gravity."* Gravity Flow is a one-touch, analog, skill-based physics puzzler with a premium cosmic identity. It is built for short sessions and monetized in fair, honest, cosmetic-only ways. It optimizes for players who understand the game instantly, enjoy the core pull, return tomorrow, master levels, share, and *choose* optional ads and purchases. It does not optimize for feature count or level count (MASTER-ROADMAP §1).

The player-facing promise is the store hook *"Hold to pull a lost star home"*, with *"Bring the lost star home"* as the tagline (`docs/store/listing.md:11`, `docs/store/aso.md:18-19,81`). P00-T25 keeps this hook (MASTER-ROADMAP §9.2).

## 2. Target players

**Decided**
- **[Decided]** The audience is 13+ and general. The content rating stays "Everyone", there is no Families policy, and there are no global child-directed tags. Marketing art stays non-childish (D-25). The AdMob ceiling is `ParentalGuidance` (A-07). **[Built]** `src/config/monetization.config.ts:61-63`.
- **[Decided]** Android ships first. iOS waits until the Android launch is stable (D-29, DEFERRED; P12 "must not do yet").
- **[Decided]** A Play Age Signals plugin is planned before 2027-01-01 for CA AB 1043 (D-25; scheduled as OA-11).

**Assumed (no data yet)**
- *Assumption (MASTER-ROADMAP §1; RETENTION §1):* sessions last 3–8 minutes. Telemetry from P00-T23 and the closed test will measure this for the first time.
- *Assumption (Play category "Games › Puzzle", `docs/store/listing.md:4`):* the players are casual puzzle players.
- *Assumption (baseline audit [STATE-AUDIT §L.3](audit/2026-10-07/STATE-AUDIT.md)):* the core player is an adult aged 18–44 who likes premium-feeling puzzlers (Monument Valley, Alto, Mini Metro), with score chasers as a secondary group. This is an audit recommendation. It was never recorded as a decision.
- *Assumption (MASTER-ROADMAP §12, §14):* there is no paid user-acquisition (UA) budget, and growth is organic.

**Not stated by the owner** (§12): the primary launch countries (CT-08) and the listing and in-game languages. STORE-LAUNCH-PLAN gives a localization order and marks "English-only game text for 1.0" as an opinion (`docs/launch/STORE-LAUNCH-PLAN.md:280-284`). There is also no confirmed persona and no stated mood (relaxing or challenging; §5).

## 3. Core gameplay loop

**The verb: press → pull → release.**

| | Today | After P1/P3 |
|---|---|---|
| World gravity | **[Built]** zero (`src/main.ts:41`) | Unchanged |
| Input | **[Built]** A press spawns the attractor under the finger, a drag moves it, and a release removes it. Pointer only (`src/scenes/GameScene.ts:509-541`) | Input is latched once per sim step (D-01). The first press also **arms** the level (D-02, A-01) |
| Force | **[Built]** Inverse-square, clamped at `ATTRACTOR_MIN_DIST`, zero beyond `ATTRACTOR_MAX_DIST` (`GameScene.ts:965-982`, `src/config/physics.config.ts:5-7`). It is applied once per *render frame* (`GameScene.ts:949`), which D-01 measured as frame-rate dependent | **[Decided]** The formula never changes (D-26). It is applied per fixed 60 Hz sim step (D-01). One uniform `FORCE_SCALE` is chosen by the owner's on-device A/B (A-19, OA-08) |
| Fail | **[Built]** A hazard, a timeout or leaving the bounds triggers `triggerDeath`, which restarts the same level after `RESTART_DELAY_MS`, with no ad (`GameScene.ts:1664-1697`, `physics.config.ts:135`) | **[Decided]** Outcomes are checked per step, and a win beats timeout, hazard and out-of-bounds in the same step (D-03, A-02). A cause stamp of ≤ 600 ms is followed by a return to the frozen, readable preview (D-08, GAMEPLAY-DESIGN A.3–A.4) |
| Win | **[Built]** The win overlay auto-advances after a fixed delay (`GameScene.ts:1178`) | **[Decided]** NEXT / RETRY / LEVELS with no auto-advance. Title cards play once per session (D-08) |
| When stuck | **[Built]** Each level file carries a one-line hint, shown on entry (`src/types/index.ts:87`, `GameScene.ts:270,856`), plus the Level 1 CoachMark (§5) | **[Decided]** A relief ladder: a hint after 3 fails, a "Show me" route ghost after 6, and "Skip for now" after 10 fails or 4 minutes. An assisted clear withholds **only** the par star (D-07, A-05). Hints are never sold (D-07, D-24) |

The full beat sheet is in [GAMEPLAY-DESIGN A.1](design/GAMEPLAY-DESIGN.md) (design intent until P3).

## 4. Differentiation and competitive position

The source is the [research audit](research/2026-10-14-gravity-flow-research-audit.md) §4–§6. Store data was captured 2026-10-14. **Every revenue or download figure is a third-party estimate**, never an audited actual.

| Tier (audit §4) | Who | What it means for Gravity Flow |
|---|---|---|
| **A**: same control idea | **Gravity Pull** (iOS only, 2026, unrated, "tap and hold to create a gravity well", endless runs, Remove Ads $3.99). **Gravity Well** (2009, criticized because "errors feel unfair"). **Orbit** (2015, a small premium-leaning success; iOS 4.8). **Glide** (2015, gravity toggles toward fixed orbs) | The mechanic sits where **nothing has broken out commercially**. Gravity Pull is the nearest rival. Gravity Flow differs through its campaign, bosses and stars |
| **B**: 2025–26 physics one-gesture hits | **Royal Smash** (10M+ band, 4.65; an ad-ROAS business with heavy paid UA; about 38 clones within weeks). **Marble Sort** (10M+, 4.70, IAP-leaning; about $10.8M IAP, an AppMagic estimate). Also Knock Out and All in Hole | The closest **structural** comparables: one gesture, many short levels, light ads. They show that physics games can hold 4.6–4.7 ratings with few ad complaints (audit §5) |
| **C**: flow, sort and traffic wave | Pixel Flow, Yarn Loop, Colony Flow, Magic Sort, Food Hunt, Loop Sort, Bus Traffic Fever | Useful only as **behaviour**: how they onboard, where they place ads, what players punish. Their revenue rests on paid UA and point-of-loss sales |
| **D**: incumbents | Candy Crush, Royal Match, Toon Blast, Gossip Harbor | Context only. They are not targets for a no-UA, cosmetic-only, 13+ indie |

- **Honest reading (audit §4, §6).** The absence of a hit in Tier A is consistent with an open niche *and* with a niche that players do not want. The "gap for a force-based press-hold puzzle with a campaign" is labelled *speculation (plausible)*: a positioning opportunity, not evidence of demand.
- **What is defensible (audit §5 "Gameplay", §6).** Mechanics are cloned within weeks (the Royal Smash clones, the Colony Flow copycat lawsuit), so the attractor idea alone is not a moat. What can be defended:
  - **Feel**: identical, fair force on every phone (D-01).
  - **Level design**: legible constraints built from reach, falloff and momentum, proven by the bot (D-06, D-27).
  - **Identity**: "bring the lost star home", a premium cosmic look, and an honest store.
- **Fights not to pick (audit §6).** Hybrid-casual block, sort and hole games scaled by paid UA. The audit's last word on positioning is high ratings plus a distinctive gravity identity, discovered organically, not chart scale.

## 5. Intended player experience

- **The three pillars (GAMEPLAY-DESIGN A.0, design of record):**
  1. *The idea is the hard part, not the finger.* Execution windows stay generous.
  2. *Every failure is yours and readable.* **[Decided]** D-01 (deterministic timing) and D-08 (cause stamp, retry in under a second).
  3. *Mastery is optional, honest and visible.* **[Decided]** ★1 is for everyone, eventually, with relief (D-07). ★2 and ★3 are real skill targets (D-34: stars are counted per run, and the tension between gem and par is intended).
- **Fairness at every refresh rate.** **[Decided]** P1's objective is identical play at 30/60/90/120/144 Hz and deterministic replays (D-01). Its metrics are ≤ 1 px trajectory divergence at t = 2 s and 100% replay determinism (MASTER-ROADMAP §4 P1). The audit names this the core risk of indirect control and its differentiator (§7a A7).
- **Elegant, subtle juice.** Feedback is felt, never loud, and stays under the particle ceiling (CLAUDE.md "Win feel", performance ceiling). **[Built]** Particle and shake constants: `physics.config.ts:22-27`. **[Decided]** The render stays bright and readable, with no darkening bloom and quality tiers for low-end Android (D-13).
- **Instant understanding.** **[Built]** The Level 1 CoachMark shows once and is persisted. With reduced motion it becomes a static arrow (`GameScene.ts:873-892`, `src/entities/CoachMark.ts:5-9`). A "sonar ping" shows the attractor's reach on every press (`physics.config.ts:39-40`). The first-minute payoff is validated by EXP-01 (§11).
- **Respect.** Session 1 is pure game: no IAP prompts, no interstitials and no rewarded offers on the result screen (MONETIZATION B.1, B.6, design of record; D-24 for the no-ads part). There are no dark patterns and no guilt copy (RETENTION §15).
- **[Owner input needed]** The mood. The store copy promises "relaxing or thrilling, your pace" and lists "relaxing puzzle game" as a keyword (`docs/store/listing.md:45`, `docs/store/aso.md:11`). The pillars and P4 instead promise a real difficulty curve. The baseline audit says "mastery is the hook, zen is the mood" (STATE-AUDIT §L.3).

## 6. Progression

**Built**
- **[Built]** A world-structured campaign, defined in `src/config/worlds.ts:14-34` over the flat `LEVELS[]`. Each world's arc ends in a signature level and a boss, and Homecoming closes with "the long way home" (`src/config/levels/index.ts:159-214`).
- **[Built]** Three stars per level: complete, gem, par (`src/utils/scoring.ts:19-24`).
- **[Built]** Sequential unlock (`src/utils/ProgressStore.ts:76-79`).
- **[Built]** The Star Map (`src/scenes/WorldMapScene.ts`).
- The live level and world counts are in the [STATUS facts block](STATUS.md).
- **Design intent, not verified in play:** the "teach → develop → twist → combine → master" arc per world (CLAUDE.md). The baseline audit found difficulty flat at about 2/10 across Worlds 1–8, with duplicate and self-solving levels (audit §5 "Progression", citing STATE-AUDIT §C).

**Decided direction**
- **[Decided]** Quality before count. D-27 calls the existing levels raw material: copies are replaced or relabelled as remixes, and self-solving or bypassed levels are reworked. Worlds may hold 8–12 levels, and **the level count is an outcome, not a goal**. P4 must not grow the level count, add worlds or add Expert packs (MASTER-ROADMAP §4 P4).
- **[Decided]** The engine behind the rework: stable level ids and v2 data (D-05, A-03), a headless QA bot with blocking CI gates (D-06, A-04, A-23), and a zone-strength rebalance (D-04, *PROPOSED*, confirmed by the bot fight-test).
- **[Decided]** An open frontier replaces strict sequential unlock: the next two levels are always open, and the next world opens at 80% of world size (D-07, A-23).
- **The P4 rework (design intent):**
  - A 10-slot template, TEACH → EXPERIMENT → DEVELOP → TWIST → COMBINE → MASTER, with a sawtooth difficulty curve and bosses as climaxes (GAMEPLAY-DESIGN B.1–B.5).
  - Par refit so that 25–40% of clearers earn 3★ (MASTER-ROADMAP §4 P4).
  - P4-α (Worlds 1–3) ships first, for M1.
- **[Owner input needed]** The anti-gravity field mechanic stays USER-GATED (A-21).

## 7. Replayability

**[Built] today**
- Three-star mastery (§6).
- A **Daily Challenge**: a date-seeded level and modifier (`src/utils/daily.ts:51`), a streak protected by an **earned-only** freeze that is never purchasable (`src/utils/DailyStore.ts:110-134`), and a separate once-a-day login bonus (`DailyStore.ts:74-78`).
- A **Weekly** seeded run in Gravity Run: one seed per week (`src/utils/endless.ts:29-34`), surfaced in `src/scenes/RunSelectScene.ts:49-57`. Its best score is stored on the device only (`src/utils/Leaderboard.ts:1-4,63`).
- **Gravity Run Endless**, a fresh run each attempt (`RunSelectScene.ts:41-47`).

**[Decided] planned**
- **P6, retention:**
  - Daily v2: unlimited attempts, one payout a day, a share card, gated after World 1, and three tiers per date (D-21, A-16).
  - A login calendar that pauses instead of resetting (D-18).
  - Opt-in local notifications, at most one a day (D-15, A-11).
  - The Weekly reset aligned to Sunday 07:00 UTC (A-13).
  - Missions, the Weekly Orbit, mastery collections, and post-game Remix, Boss Rush and Time Attack (design intent: [RETENTION](design/RETENTION.md) §2–§10; GAMEPLAY-DESIGN Part E).
- **P8, Gravity Run 2.0:**
  - Curated chunks × mirror × bot-verified jitter (D-22, A-17). Shipped chunks are frozen (D-33).
  - Real Play Games Services boards (D-17, A-13).
  - Gravity Run unlocks after World 1 (D-31). Custom seeds never post scores (D-32).
- **P10, live ops as data, not a platform** (D-14, D-30): an event calendar, weekly modifiers, seasonal palettes, and earned cosmetics that return in a vault ([LIVE-OPS](design/LIVE-OPS.md) §1–§6).

**[Proposed]** under OA-14c, as P4–P6 design inputs only (audit §7b, §8 recommendation 11; A-27):
- **B11.** A world-completion reveal built from the game's own fiction, a constellation that fills in. It is never a copy of pixel art.
- **B13.** An optional pull or trajectory preview as an assist. Under A-05 it would withhold only the par star.

## 8. Monetization philosophy

**Decided**
- **Cosmetic-only.** Money buys items, never currency, hints, progress or energy. This rests on:
  - the guardrail "No pay-to-win. Never sell currency, hints or progress" (MASTER-ROADMAP §7);
  - **[Decided]** D-07 (hints are never sold for money);
  - **[Decided]** D-24 ("never sell hints for money, gate progress, or use fake urgency");
  - the P7 must-not list: subscriptions, gacha, energy, paid currency (MASTER-ROADMAP §4).
- **One earn-only currency.** **D-23 is PROPOSED, not ACCEPTED.** DECISIONS defines PROPOSED as "implement unless data contradicts it", and no amendment changes it. D-23 merges Fragments into Stardust at ×10. Its rule "real money buys items, never currency" keeps the game outside the EU CPC virtual-currency regime.
- **[Decided] The ads policy (D-24).**
  - Rewarded ads are opt-in and hidden when no ad is loaded.
  - The interstitial is gated: never after a death or a failure streak, and never at level start. P7 tunes the caps through Remote Config: none before lifetime level 12, at least 180 s **and** 3 completions apart, at most 4 a session and 10 a day.
  - Once P3 lands, the interstitial shows only after NEXT (D-08, A-22).
- **[Decided] Remove Ads and its bundles.** The `no_ads` entitlement is granted by `remove_ads`, `starter_pack` and `founders_pack`. Entitlements are the source of truth, and prices come only from the store (D-09). Cosmetic-only "twin" SKUs mean nobody pays twice for Remove Ads, and Supporter and seasonal packs come later (A-06, A-24).
- **[Owner input needed]** "No-Ads+" stays USER-GATED and off by default (D-37).

**Built**
- **[Built]** Four store products and their entitlements (`src/services/entitlements.ts:25-42`). No product sells currency.
- **[Built]** Earn-only Stardust and Fragments (`src/utils/CurrencyStore.ts:1-2`, `src/utils/FragmentStore.ts:1-3`). Cosmetics are free, Stardust, Fragments or bundle (`src/utils/cosmetics.ts:33-35`).
- **[Built]** Rewarded placements through one flow: campaign 2×, Endless revive, Endless 2× and free Fragments. The flow disables the button before the await and grants nothing if the scene has gone (`src/ui/adOffer.ts:35-64`; call sites `GameScene.ts:1448`, `EndlessScene.ts:529,553`, `CosmeticsScene.ts:359`).
- **[Built]** A conservative interstitial gate: `no_ads` owners skip it (`IAP.isPremium()`, `src/services/IAP.ts:133`), plus a session grace, a minimum gap and protection for boss, 3★ and streak wins (`src/services/interstitial.ts:27-35`, `monetization.config.ts:69-73`). It is shown only on the win-advance path (`GameScene.ts:1196-1203`). The lifetime-L12 grace and the daily caps are P7 tuning.

**Research context** (audit §1, §5; MASTER-ROADMAP §14)
- Revenue is modest by design (R-51). About **1.83%** of mobile users make any IAP, and Gravity Flow sells nothing at the point of loss.
- The hits sell Remove Ads at $7.99–$10 *because* their interstitials are intrusive, and their "converts extremely well" comes from that irritation. Expect lower conversion here. No source measures conversion when ads are light (audit §11 Q7).
- Modeled ad ARPDAU runs from about $0.006 to $0.061 depending on geography. These are model outputs from third-party eCPMs, not forecasts.
- The repo's payer-conversion target of ≥ 1.5% (MASTER-ROADMAP P7) is a heuristic (MONETIZATION B.10).

**[Owner input needed]** Any revenue goal, break-even line or price stance. Remove Ads at $1.99–$2.99 is a heuristic, and EXP-09 cannot test it below about 10,000 installs.

## 9. Long-term goals

- **[Decided] Milestones** (MASTER-ROADMAP §3; tags A-15):
  - **M0 Truthful Build**: P0 + P1, on the internal track.
  - **M1 Closed Beta**: adds P2, P3, P4-α and P5-A. It may run under the working title (A-14).
  - **M2 Launch Candidate**: the full campaign plus P5, the P6/P7 cores and P11. The rename is applied here (D-19, A-14).
  - **M3 Live 1.x**: P8–P10, P12 optimization and the iOS track.
- **[Decided] Android launch.** A first production release cannot use a staged rollout. Country availability is the only soft-launch lever (A-28). **[Owner input needed]** Which countries (CT-08).
- **[Decided] iOS** comes after a stable Android launch (D-29, DEFERRED; MASTER-ROADMAP P12 must-not).
- **[Decided] Live ops by data, at a solo-developer cadence.**
  - Remote Config with dated, never-retroactive overrides (D-14).
  - Battle pass, event currency and server events are deferred (D-30).
  - The design budget is one 2-hour sitting a month, about 10 dev-days a year ([LIVE-OPS](design/LIVE-OPS.md) §10).
  - The North Star metric, Weekly Returning Clearers, is not measurable before M3 ([SUCCESS-METRICS](roadmap/SUCCESS-METRICS.md) §3).
- **Growth through ratings, retention and organic channels.**
  - **[Decided]** A share card and in-app review at positive moments only (D-16, A-12).
  - **[Decided]** P11 store conversion, with paid UA at scale "must not do yet" (MASTER-ROADMAP §4 P11). The owner may lift it only with First 10,000 evidence (§12).
  - The audit's reading: with no UA budget, ratings, retention and Android vitals are the discovery channel, and a short clip of real gameplay is the one creative worth making (audit §5 "Acquisition", §6).
- **No revenue or install target is owner-stated.** MASTER-ROADMAP §12 gives *planning scenarios, not forecasts*: First 20 → 100 → 1,000 → 10,000. §13's 30/60/90 plan and its continue / pivot / stop rules are proposals pending OA-14a. **[Owner input needed]** (§12).

## 10. What Gravity Flow will not do

| Will not | Basis | Label |
|---|---|---|
| Energy, lives, wait timers | D-24 "never gate progress"; P7 must-not (MASTER-ROADMAP §4); audit B8 | [Decided] |
| Paid or ad-gated continues in the campaign; ads after a death | D-24; D-07; MONETIZATION B.1. **[Built]** A death restarts with no ad (`GameScene.ts:1694-1696`). The only continue is the rewarded Gravity Run revive, and revived runs never post (D-17) | [Decided] |
| Selling currency, boosters, "star packs", hints or progress | MASTER-ROADMAP §7; D-07; D-24; D-23 (PROPOSED); audit B10 | [Decided], with D-23 PROPOSED |
| Tilt, swipe, draw-line or direct-control modes | CLAUDE.md core principle (press, drag, release; no world gravity); D-26 fixes the formula. No D-entry names control modes. Audit §7 B18 classifies them as "reject" | Plan of record + research |
| Hole, sort or block reskins | Audit §6 (saturated fields) and §7 B18; MASTER-ROADMAP §7 "no feature for its own sake" | Research classification |
| Battle or season pass for 1.0; event currency | D-30 (DEFERRED, revisit on metrics); P6/P10 must-not; MONETIZATION B.8 | [Decided] (deferred) |
| Subscriptions; gacha or loot boxes | P7 must-not; MONETIZATION B.1, B.8; audit B20 | [Decided] |
| Teams, PvP, tournaments, friend ghosts, Firestore boards | D-30; P8 must-not; audit B7 | [Decided] (deferred) / research |
| Fake urgency: countdown timers, "only N left", strikethrough prices | D-24; MONETIZATION B.4 | [Decided] |
| Login streaks that reset; notification spam | D-18; D-15 | [Decided] |
| Growing the level count before quality; a level pack every 1–2 weeks | D-27; P4 must-not; LIVE-OPS §10; audit B19 | [Decided] |
| Changing the attractor formula | D-26 | [Decided] |
| Paid UA at scale (deferred, not rejected) | P11 must-not; MASTER-ROADMAP §12 | [Decided] |

## 11. How the vision is validated

| Part of the vision | Test (MASTER-ROADMAP §11–§12) |
|---|---|
| "Hold to pull" is understood instantly | **EXP-01**: ≥ 16/20 testers win L1 unaided and describe "hold to pull"; otherwise the CoachMark and sonar ping are revisited before P4. **First 20**: an unprompted description of the verb |
| Fair, identical feel on every phone | **EXP-02** (`FORCE_SCALE` A/B, OA-08); **EXP-03** (bit-identical state from 30 to 144 Hz; any divergence blocks M0) |
| Honest, non-breaking monetization | **EXP-04**: every rewarded view credits, every ad close resumes the same state, `no_ads` is honoured. **EXP-09**: Remove Ads price. **EXP-10**: does the lifetime-L12 interstitial grace raise D1 without cutting ad ARPDAU by more than 10%? |
| A campaign that teaches and is fair | **EXP-05**: no World 1 level where ≥ 25% of starters stop the session. **EXP-06**: human difficulty ranks track the bot's. **First 100**: the W1 funnel |
| Identity sells the game (positioning) | **EXP-07** (an opening clip of real gameplay); **EXP-08** (a gesture-first first screenshot); **EXP-12** (clips earn tester sign-ups) |
| A sustainable business | **EXP-11** (stability and D1 on devices the developer does not own; an optional budget of about US$300). **First 1,000 / First 10,000**: retention against GameAnalytics percentiles, vitals, payer conversion |

**Retention targets**
- **[Decided]** In force: D1 ≥ 30%, D7 ≥ 8%, D30 ≥ 3% (A-18). SUCCESS-METRICS keeps the stretch values.
- **[Proposed]** OA-14a: relabel A-18 as stretch, add a median reading floor of about 22% / 4% / 1% (GameAnalytics 2026), and judge no cohort under about 1,000 installs (audit §1, §8 recommendation 8).
- Until the owner decides OA-14a, the floors are context, not gates (MASTER-ROADMAP §13). Below about 300 installs, D7 and D30 cannot separate a median game from a top-quartile one (MASTER-ROADMAP §12).

## 12. Open owner decisions that shape the vision

**Registered owner actions and gates** (their state is in [STATUS → Gates](STATUS.md))

| ID | Decision | Why it matters for the vision |
|---|---|---|
| OA-01 | Play account type and creation date | Decides whether a 12-tester, 14-day closed test stands before production (CT-01) |
| OA-07 | Product name and trademark knockout (D-19, A-14) | The identity is the moat (§4). The working title collides with a live "GRAVITY FLOW" registration (NAMING-STUDY §1) |
| OA-08 | `FORCE_SCALE` from the on-device A/B (A-19) | Decides the feel that every level is tuned against |
| OA-14a | Retention floors and minimum cohort | What counts as success or failure (§11) |
| OA-14b | Closed test at M0 if OA-01 says the rule applies | Sets the calendar to first players |
| OA-14c | Adopt B11 and B13 as design inputs | The payoff beat and the assist philosophy (§7) |
| OA-16 | AdMob age treatment (TFAT TEEN vs unspecified), with counsel | How the 13+ audience meets ads |
| OA-09, OA-12 | Crashlytics without consent; Data Safety and privacy sign-off | The "honest, lawful" promise |
| OA-15 | The source screen recording (optional) | No finding may claim to come from it until it is provided |
| CT-08 | First countries | The only soft-launch lever (A-28) |
| D-37, A-21 | No-Ads+; the anti-gravity field | Both USER-GATED |
| Other | Display scale mode (STATUS B-12); in-game Weekly copy "Same run for everyone" (P00-T25 records it for an owner/UX decision); RETENTION §17 questions; a cheap-geo test budget (EXP-11); lifting the paid-UA must-not | Smaller product calls the plan defers to the owner |

**Vision-level gaps the owner has not addressed** (questions, not answers)
1. What is Gravity Flow for, as a business: a portfolio piece, side income or a living? What result, in money or in players, would count as success, and what would end investment?
2. Is there a revenue goal, a break-even line against the operating costs in MASTER-ROADMAP §13, or neither?
3. How many hours a week can go into the game after launch, and for how many years?
4. Which countries and languages come first, for the listing and for the game text?
5. Who is the core player? Is STATE-AUDIT §L.3's "adults 18–44, premium-puzzler fans" right?
6. Is the mood relaxing, challenging, or explicitly both (§5)?
7. Is iOS a commitment after a stable Android launch, or conditional on Android results?
8. Is the public web build a product channel, or only a development and test target? Vercel Hobby is for non-commercial use (MASTER-ROADMAP §13).
9. Will True Story Labs ship other games, and should Gravity Flow be built to cross-promote with them (audit §11 Q2)?
10. Under what evidence and budget, if any, would paid UA be acceptable?
11. Does the long-term vision include player-made levels or a sandbox (audit §7b B14, deferred)?

## 13. Sources

- Plan of record:
  - [roadmap/MASTER-ROADMAP.md](roadmap/MASTER-ROADMAP.md): §1 north star, §2 prioritization, §3 milestones, §4 phases, §7 guardrails, §8–§15 (stages, owner actions, experiments, first players, 30/60/90, risks)
  - [roadmap/DECISIONS.md](roadmap/DECISIONS.md): D-01–D-37, A-01–A-28
  - [roadmap/EXECUTION-ORDER.md](roadmap/EXECUTION-ORDER.md)
  - [roadmap/SUCCESS-METRICS.md](roadmap/SUCCESS-METRICS.md): §3 North Star
- Design of record:
  - [design/GAMEPLAY-DESIGN.md](design/GAMEPLAY-DESIGN.md): A.0–A.14, B.1–B.5, C.2, Part E, §G
  - [design/MONETIZATION.md](design/MONETIZATION.md): B.1, B.2, B.4, B.6–B.10
  - [design/RETENTION.md](design/RETENTION.md): §0–§2, §15–§17
  - [design/GRAVITY-RUN.md](design/GRAVITY-RUN.md): §1–§2
  - [design/LIVE-OPS.md](design/LIVE-OPS.md): §1, §10
- Store and brand:
  - [store/listing.md](store/listing.md)
  - [store/aso.md](store/aso.md)
  - [launch/NAMING-STUDY.md](launch/NAMING-STUDY.md): status only
  - [launch/STORE-LAUNCH-PLAN.md](launch/STORE-LAUNCH-PLAN.md): localization order
- Evidence:
  - [research/2026-10-14-gravity-flow-research-audit.md](research/2026-10-14-gravity-flow-research-audit.md): §1, §4 (tiers A–D), §5 (reverse engineering), §6 (trends), §7 (applicability: A1–A9, B1–B20, C1–C5), §8 (recommendations), §9 (growth scenarios), §11 (unresolved questions). The audit is an evidence input, not approval to build (A-27).
  - [audit/2026-10-07/STATE-AUDIT.md](audit/2026-10-07/STATE-AUDIT.md): §L.3 positioning
- State: [STATUS.md](STATUS.md) (facts block, task board, gates)
- Code read for the [Built] claims:
  - Core loop: `src/main.ts`, `src/scenes/GameScene.ts`, `src/config/physics.config.ts`, `src/entities/CoachMark.ts`
  - Campaign and progression: `src/config/worlds.ts`, `src/config/levels/index.ts`, `src/utils/scoring.ts`, `src/utils/ProgressStore.ts`
  - Daily and Gravity Run: `src/utils/daily.ts`, `src/utils/DailyStore.ts`, `src/utils/endless.ts`, `src/scenes/RunSelectScene.ts`
  - Monetization: `src/services/entitlements.ts`, `src/services/interstitial.ts`, `src/ui/adOffer.ts`, `src/config/monetization.config.ts`, `src/utils/CurrencyStore.ts`, `src/utils/FragmentStore.ts`, `src/utils/cosmetics.ts`, `src/config/cosmetics.config.ts`
