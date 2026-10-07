# Gravity Flow — Gameplay Design (deliverable #5)

> **Status:** plan of record, 2026-10-07 (baseline `master @ d3c6aab`). Implemented by [`P03-core-loop.md`](../roadmap/phases/P03-core-loop.md) (execution step 10) and [`P04-campaign.md`](../roadmap/phases/P04-campaign.md) (steps 13 and 15).
> **Conforms to:** D-01 (sim clock), D-02 (armed sim), D-03 (win precedence), D-04 (zone rebalance), D-05 (level model v2), D-06 (bot gates), D-07 (relief + frontier), D-08 (result screen), D-21 (Daily), D-24 (ads), D-26 (formula unchanged), D-27 (quality before count). Where this document needs an owner decision, it says so in §G. It does not silently override anything.
> **Evidence:** `docs/research/game-design.md` (primary), `ux-visual-motion.md` §3 and §6, `retention-analytics-liveops.md` Q2, `docs/audit/2026-10-07/STATE-AUDIT.md` §C, §D and §G, and `inventory/{levels,flags,duplicates}.json`. Visual tokens come from [`UX-UI-MOTION.md`](UX-UI-MOTION.md). Post-game unlocks and meta come from [`RETENTION.md`](RETENTION.md) §10. Hint economy comes from [`MONETIZATION.md`](MONETIZATION.md).
> **Coordinates** are play-area pixels (360×780, origin top-left). The ball is 16 px in radius (32 px diameter). Attractor reach is 310 px. "Attempt" means one armed run, from the first press to win or fail.

---

## Part A — The core loop

### A.0 Three pillars
1. **The idea is the hard part, not the finger.** Execution windows stay generous for the band (A.13, B.6). A player who has the right idea succeeds within a few tries (Carlsen's rule).
2. **Every failure is yours and readable.** The cause is shown, the timing is deterministic (D-01), and retry costs under a second.
3. **Mastery is optional, honest and visible.** ★1 is for everyone, eventually (with relief). ★2 and ★3 are real skill targets with factual gap lines.

### A.1 Moment to moment (press → pull → release)
| Beat | Player does | Game answers (same frame) | Rule |
|---|---|---|---|
| Read | Looks at the frozen level | Armed preview (A.3): hazards at their t=0 pose with motion paths drawn faintly; the par chip reads "par 9.5 s" | No clock yet (D-02) |
| Press | Touches anywhere in play | Attractor spawns under the finger. Sonar ping to the 310 px reach, tone + hum, 10–12 ms haptic, nebula pulse. The first press also **arms** the sim | The first press both arms and pulls. There is never a separate "start" tap |
| Pull | Holds | Inverse-square pull (D-26), pull line, charge tendrils. The ball moves toward the touch point | Force applied per sim step (D-01) |
| Steer | Drags | The attractor follows the finger (≤ 1 step of latency, input latched per step) | Drag is the only steering verb |
| Release | Lifts | The attractor disappears, the hum stops, the ball keeps its momentum | Releasing is a skill. "Let go early" is taught in W1 S2 |
| Resolve | — | Win, gem, hazard, timeout or out-of-bounds, checked per step. A win beats a hazard in the same step (D-03) | Outcome is final at step resolution |

### A.2 Clarity rules
| # | Rule | Check |
|---|---|---|
| C-01 | The ball is the brightest object in play; the goal is the only green object | Luminance capture (D-13); UX WT-1/WT-2 |
| C-02 | Every gameplay entity has a unique silhouette that survives greyscale (spikes and stripes for hazards; +/− glyph and ring direction for wells; chevrons for zones; arrows for gates) | Greyscale + deutan render of every level at t=0 (P4 gate) |
| C-03 | Everything on screen is part of the solution until S5 of each world. Red herrings start at S5 and must be testable within about 3 s | Bot ablation (D-06) plus review |
| C-04 | No gameplay-relevant object is hidden by HUD chrome (F.1) | Validator G11 (HUD exclusion) |
| C-05 | Motion is telegraphed: beams charge for the last 25% of the cycle; polarity flips, beat-zones and doors telegraph 300–400 ms ahead | Entity specs (C.1) |
| C-06 | Kinematics are a pure function of `simMs` and restart at t=0 every attempt, so timing learned on attempt 1 is valid on attempt 2 (D-01) | Replay harness |
| C-07 | Text in play is Exo 2, at least 12 px, and hints wrap at 320 px | UX §2.7 |

### A.3 Agency: the armed preview (D-02)
Until the first press, the level is a **frozen, readable preview**.
- **Frozen:** no physics steps and no clock. The ball sits at spawn. Platforms, hazards, beams, wells and the goal hold their t=0 pose.
- **Readable:** each moving hazard draws its path at 0.18 alpha: a dotted line for sweeps, a dashed circle for arms, a rail for beams with the first firing window marked. A `startVelocity` ball shows its launch arrow.
- **Chrome:** the par chip shows "par 9.5 s". A timed level's countdown shows the full limit and doesn't tick. The world or boss title card may play over the preview on the first entry of the session. While the card shows, the first tap skips it and is **consumed**; the next press arms (the P05 interface rule).
- **First press:** it arms the sim (`simMs` starts at 0), starts the ghost and replay recorders, dismisses any hint chip and spawns the attractor at the touch point.
- **Presses on HUD chrome don't arm.** Display-only chips (par and countdown) stop swallowing touches (F.1).
- **Retries return to the armed preview.** The player can breathe and re-read with no clock running. That's still "straight to play" (D-08): the next press is play.

The armed preview is what makes L11/L12-class self-solving structurally impossible.

### A.4 Failure readability (D-08: cause stamp ≤ 600 ms)
**Timeline** (shared with UX-UI-MOTION §5.2):

| t (ms) | Beat | Reduced motion |
|---|---|---|
| 0 | The step resolves as a fail. Stepping stops. A cause-specific fail sound plays (hazard: falling buzz; timeout: double low tone), with the death haptic | Same |
| 0–60 | Hit-stop. The **killer is outlined**: the hazard that touched the ball flashes a 2 px white silhouette | No hit-stop; outline only |
| 60 | DeathStamp (E4 chip) pops in at the contact point, clamped to the play rectangle. Red edge vignette ≤ 0.35 for 180 ms; ≤ 16-particle puff | Fade 100; border tint |
| ≥ 200 | Any tap resets immediately | Same |
| ≤ 600 | Reset to the armed preview. No title card, no intro zoom, no hint replay | Same |

**Stamp copy:**

| Cause | Stamp | Icon | Honest second line (only when true) |
|---|---|---|---|
| `hazard` | Hazard | Killer silhouette (spark, saw, arm, beam) | "So close · 12 px from home" when the edge gap to the goal is ≤ 24 px |
| `timeout` | Time's up | Clock | "40 px from home" when the edge gap is ≤ 200 px |
| `oob` | Out of bounds | Outward arrow | — |

**Death never hides the cause.** If the killer is under the finger (thumb occlusion), the outline also draws a 24 px ring offset toward screen centre with a leader line.

### A.5 Success choreography (UX §3, tier ladder unchanged)
| t (ms) | Beat |
|---|---|
| 0 | Goal absorb (ball scales out 350 ms), goal flash, burst ≤ tier budget |
| 350 | Tier celebration: shake trauma 0.4/0.5/0.6/0.75 (normal/great/perfect/boss); punch ≤ 1.07; star tones ready |
| 450 | ResultPanel enters (280 ms, Expo out). Headline set |
| 600 / 860 / 1120 | Stars land (Back out 2, rising pitch, 10 ms haptic each) |
| 1250 | Stats row and missed-star lines fade in |
| 1300 | Buttons become live |
| ≥ 1500 | Optional reward offer, only if loaded and permitted (A.6) |

A tap during 0–1300 **fast-forwards** to the final state. It never navigates. Buttons go live 150 ms after a fast-forward, so the skipping tap can't land on NEXT.

### A.6 Result screen (D-08)
**Layout.** Geometry is owned by UX-UI-MOTION §2.6. Inside the panel, top-down: kicker badge → headline → three stars labelled HOME · GEM · PAR → missed-star lines (≤ 2) → stats row. Below the panel, top-down: reward offer (≤ 240×48) → [LEVELS 48 | RETRY 200×48] → **NEXT** 280×56 in the thumb zone.

**States:**

| State | Enters when | Interactive | Notes |
|---|---|---|---|
| Reveal | Win | Tap = fast-forward only | 0–1300 ms |
| Live | 1300 ms or fast-forward + 150 ms | NEXT, RETRY, LEVELS | NEXT idle-pulses (2400 ms) only on a 3★ result (the screen's single idle loop) |
| Offer | ≥ 1500 ms and ≥ 200 ms after Live | + reward button | Shown only if loaded, caps allow (D-24), it's not session 1, it's lifetime level ≥ 6, and **no missed-star line is shown** |
| Leaving (NEXT) | NEXT tapped | None | The interstitial decision runs here and only here, awaited and skipped if not preloaded (D-24) |
| Leaving (RETRY) | RETRY tapped | None | Straight to the armed preview, ≤ 300 ms. Never an interstitial |
| Leaving (LEVELS) | LEVELS tapped | None | LevelSelect for this world. Never an interstitial |

**Copy:**

| Context | Kicker | Headline | NEXT label |
|---|---|---|---|
| Normal clear | First-win line ("You brought your first star home ★") **or** streak tier ("×5 BLAZE"); never both | LEVEL COMPLETE | NEXT |
| 3★ | "PERFECT" badge | LEVEL COMPLETE | NEXT (pulses) |
| Boss | "World III · CLOCKWORK" | STAR FREED | NEXT WORLD |
| L80 (renamed, C.2) | "The star was flung back into the dark" | ALMOST HOME | NEXT WORLD |
| L150 | — | HOME | CONTINUE (→ finale sequence, P5) |
| Assisted clear | "Assisted clear" caption | LEVEL COMPLETE | NEXT |
| Daily | "Day streak 4" | DAILY COMPLETE | DONE (RETRY stays; one payout per day, D-21) |

**Missed-star lines** are factual, ordered gem then par, at most two:
- "☆ Gem · not collected this run"
- "☆ Par 9.5 s · you 11.2 s (+1.7 s)"
- Assisted: "☆ Par · replay without the guide to earn it"
- When the stars were already earned on an earlier run: "Best 8.9 s · ★★★ kept". No missed lines; stars are never taken away.

**Stats row:** "11.2 s · best 10.4 s · +14 ✦". A **NEW BEST** caption appears when true.

### A.7 Near-miss done right
- **Visible.** Death-side near misses live on the DeathStamp, with ≥ 400 ms on screen inside the 600 ms budget. Today "SO CLOSE" shows for about 240 ms. Win-side near misses are missed-star lines plus the RETRY button.
- **Honest.** Every number comes from the sim state at the resolving step:
  - edge gap = `dist(ball, goal) − goalR − ballR`
  - over-par = `simMs − parMs`

  The thresholds are 24 px for "So close", 200 px for timeouts and 0.5 s for "just over par".
- **Never fabricated.** The game never steers a ball toward a near miss.
- **Never sold.** A near-miss line and an ad offer never share a screen (UX ethics rule). A near miss on a cleared level never triggers relief.
- **Actionable.** On a just-over-par win, RETRY gets the gold secondary stroke and the label "RETRY ★".

### A.8 Retry-speed targets
| Path | Target | Today (audit §D) |
|---|---|---|
| Death → control | ≤ 600 ms (nominal 450) | 240 ms restart, but hint, title card and 650 ms intro zoom replay |
| Result RETRY → armed preview | 1 tap, ≤ 300 ms | No RETRY. About 4 taps across 3 scene transitions |
| HUD restart → armed preview | ≤ 250 ms | `scene.restart` plus replays |
| NEXT → next level armed (no ad) | ≤ 400 ms (fade 250 / 300 per UX) | 2.8 s auto-advance |
| Title cards / intro zoom on retry | 0 (once per level per session, D-08) | Every attempt |
| Hint chips on retry | 0, except ladder chips (A.10) | Every attempt |

Implementation prefers an in-scene `LevelSim.reset()` over `scene.restart` (P3 §3).

### A.9 Hint system v2
**Tiers:**

| Tier | Trigger | Surface | Content | Cost | Marks the clear "assisted"? |
|---|---|---|---|---|---|
| T0 Rule line | First entry of the session to a level whose `teaches` lists something new | HintChip over the armed preview; gone on first press; never on retry | The **rule** of the new thing, never the level ("Currents push. Hold close and you out-pull them.") | Free | No |
| T1 Notice | 3 consecutive fails (D-07) | A non-modal "?" chip, bottom-left above the safe area; a tap shows it for 5 s; it stays available for the rest of the visit | `relief.notice`: what to notice | Free | No |
| T2 Show me | 6 consecutive fails (D-07) | "Show me" chip in the same slot. A ghost ball **and** a ghost touch ring replay the bot route once (skippable), then the armed preview returns | Route artifact (P3) | First view per level free; afterwards 1 hint token or a rewarded ad (A.11) | **Yes**, for this visit |
| T3 Skip for now | 10 consecutive fails, or 240 s active on the level (D-07) | "Skip for now" chip | Opens the next level; this one is hollow-badged | Free | — |

**Rewrite rules (for `relief.notice` and T0):**
1. Never state the route, the order or the direction ("go left", "commit up, breach, commit right" are banned).
2. Point at something observable: where a rift exits, where a saw never reaches, which way a gate faces.
3. Use a question or a physics observation ("What happens if you let go early?").
4. One sentence, ≤ 60 characters for T1 and ≤ 70 for T0 (two lines at 15 px within 320 px).
5. T1 is about ★1. Gem and par guidance lives in the result screen's missed-star lines.
6. Use the in-world nouns consistently: spark, saw, arm, beam, current, well, rift, gate, door, home.
7. Every hint is unique across the campaign (validator; the audit found 6 duplicate pairs).
8. Players never see the `idea` sentence. Titles never describe the solution.

A lint step flags direction or sequence words ("left/right/first/then/commit/enter/take") for human review. It's a warning, not a block.

**Ten rewrites of current spoiler hints:**

| Level (file) | Current hint (spoils) | New T1 notice |
|---|---|---|
| L6 (`level5.ts`) | "Straight up is blocked — slip in from the side" | "Where is the chamber open?" |
| L9 (`level29.ts`) | "The wide centre gap is a trap — go around" | "Follow each gap with your eyes. Where does it lead?" |
| L38 (`level72.ts`) | "The open centre is a trap — find the safe gap" | "Watch the saw for a while. What does it never reach?" |
| L56 (`level80.ts`) | "To reach the goal, enter the far rift" | "Every rift has two mouths. Which one is inside the nook?" |
| L58 (`level47.ts`) | "Two rifts — pick wrong and the left one drops you on a spike" | "Before you dive, look above each exit." |
| L66 (`level84.ts`) | "The gem costs a one-way detour past a spike — plan it before you climb" | "Each gate opens one way. Which way does each face?" (gem guidance moves to the result line) |
| L70 (`level86.ts`) | "No clock — commit up, breach the wall, commit right…" | "Every door is one-way. Which must you pass last?" |
| L60 (`level82.ts`) | "No clock — the centre rift is bait. Find the chain…" | "Try a rift and watch where you land." |
| L80 (`level90.ts`) / L150 (`level163.ts`, same hint) | "Lift, breach, commit, slip the saw — bring the star home" | L80: "The saw keeps a beat. Where is it when you arrive?" · L150 gets a new hint with the new finale |
| L13 (`level9.ts`) | "Counter the crosswind as you climb" (physically impossible before D-04) | T0: "Hold close and the wind gives way. Hold far and it wins." |

### A.10 Fail-relief ladder (D-07): exact thresholds
| Parameter | Value | Definition |
|---|---|---|
| Fail | Death (`hazard`/`timeout`/`oob`), or a manual restart after ≥ 3 s of armed time | Instant restarts don't count |
| `failStreak` | Consecutive fails on this level id without a clear | Persisted per level; resets to 0 on clear |
| T1 | `failStreak ≥ 3` | — |
| T2 | `failStreak ≥ 6` | Hidden if the level has no valid route artifact |
| T3 | `failStreak ≥ 10` **or** `activeMs ≥ 240 000` | `activeMs` = armed + preview time while the scene is unpaused, since the last clear, persisted |
| Scope | Uncleared (★0) campaign levels only | Not on S1 sandbox levels (they can't fail), the Daily, Weekly, Endless or Remix. Never on L1–L3 (monetization rule) |
| Bosses | Ladder applies; T3 allowed | A skipped boss stays hollow. The next world still needs the D-07 threshold |
| Assisted | Set when T2 played during the current visit | Clears ★1 and the gem, never par. Cleared by replaying without the guide (a new visit) |
| Success metric | Relief usage < 15% of attempts in W1–4 (MASTER P3) | Telemetry from M1 |

### A.11 UX × economy interplay
| Item | Free | Earned hint token | Rewarded ad | Money |
|---|---|---|---|---|
| T0 / T1 hints | Always | — | — | **Never** |
| T2 route ghost, first view per level | ✓ (D-07) | — | — | **Never** |
| T2 repeat views | — | 1 token | ✓ 1 per attempt, 60 s cooldown, ≤ 5/day | **Never** (D-24) |
| T3 skip | ✓ | — | — | **Never** |
| Par star after an assisted clear | Unassisted replay | — | — | **Never** |
| 2× Stardust | — | — | Result Offer state only; ≤ 1 per 3 wins, ≤ 4/day (D-24) | — |
| Interstitial | Only after NEXT, D-24 caps | — | — | Removed by No-Ads |

**Token earning** (MONETIZATION §9): +1 per world completed (boss clear), +1 per 10 three-star clears, cap 5. Tokens are never sold or converted.

### A.12 Open-frontier unlock (D-07)
- **Within a world:** level *k* is open if *k* ≤ `furthestCleared + 2` (world-local index), or it was ever opened. Opening is monotonic.
- **Next world:** opens when `cleared(W) ≥ ceil(0.8 × size(W))` **or** `stars(W) ≥ 2 × size(W)`. That's 8/10 or 20★ for a 10-level world. It generalises D-07's "8/10" to D-27's 8–12-level worlds; see §G. Its S1 and S2 open together.
- **Skips:** a skipped level counts as opened, not cleared, and is hollow-badged. It adds no stars.
- **Star Map lock line** comes from the same pure function: "Clear 2 more in CLOCKWORK — or earn 4 more ★".
- **Daily gate** (D-21, RETENTION §3.1): the first clear of the World 1 boss. Opening World 2 through the frontier isn't enough.
- **Migration:** every level unlocked under today's sequential rule stays open.

### A.13 Mastery stars
| Star | Meaning | Target (share of clearers, eventually) | Rule |
|---|---|---|---|
| ★1 Home | Clear | ≥ 95% of starters (with relief) | — |
| ★2 Gem | Detour or risk | 50–75% | The gem must be **off-route**: the A5 gem route costs ≥ 1.5 s over T_best without it, **or** its approach passes within 24 px of a hazard with noisy-gem success ≤ 80%. Never inside a hazard sweep (today L58, L90, L100, L120, L130 and L139 have negative clearance). S1 of W1 is the only exemption |
| ★3 Par | Fast **and** gem in one run | **25–40%** (MASTER P4) | Stars are counted per run today (`computeStars`), so par is set on the gem route |

**Par formula** (research §2; D-06 bot):
`par = ceil_to_0.5s( max( k_w × T_noisy_median(gem route), T_best(gem route) + 1.5 s ) )`
- `k_w` = 1.30 at launch.
- After M1 the multiplier is refit per world: if 3★ > 40% of clearers, k −0.05 (floor 1.15); if < 25%, k +0.05 (cap 1.60).
- Par is from first touch (D-02) on the sim clock (D-01).
- An assisted clear can't earn par (D-07). Whether P5's game-speed assist (70/85%) also withholds par is an open owner decision (P05 conflict C1). P3's `assisted` flag is built so either answer is a one-line change.

### A.14 Removal checklist: no level ships if any box is unticked
| Category | Check (gate id → P04 §3.2) |
|---|---|
| **Plays itself** | A0 (one arm-tap outside reach, then no input for 30 s) never wins (G1) · A1 single-nudge wins only in S1–S2 (G2) · the A3 wall-hugger never wins a hazard-idea level (G3) · ablation: the world's mechanic is required, or removing it makes the level ≥ 1.5× slower (G4) · no spawn inside a zone pointing at the goal · lifts carry ≤ 200 px past the zone end |
| **Unfair** | No hazard sweep within 24 px of the goal disc (G8, D-03) · portal exits ≥ 48 px from any kill band and clear of geometry for ≥ 14/16 approach directions (G9) · no well capture radius within 24 px of a saw band (G18; L110, L128, L138, L150, D8) · no hazard within 60 px past a gap exit (L10 class) · timer ≥ 1.25 × T_noisy p90 (G13) · precision windows meet the band (G12) |
| **Spoils** | T1 passes the rewrite rules · no entry hint except T0 · the gem is not on the solution path (G10) · the title doesn't name the trick |
| **Repeats** | Duplicate score < 0.85 to every level, < 0.70 for bosses (G7) · route-shape quota met (G16) · no shared arena fingerprint · unique title and hint · ≤ 2 levels per world spawning at (180, 660–720) with the goal at (180, ≤ 130) |
| **Wastes time** | Non-boss T_best ≤ 12 s, boss phase ≤ 20 s at par · title card once per session · retry ≤ 300 ms · a timer that's never close (limit > 2 × T_noisy median) is removed, not kept as decoration · bosses checkpoint between phases |

---

## Part B — Campaign redesign

### B.1 World template: TEACH → EXPERIMENT → DEVELOP → TWIST → COMBINE → MASTER
`T` = reference median attempts. Per-world targets are in B.2. Roles use the D-05 enum.

| Slot | D-05 role | Purpose | T (ref) | A6 noisy success | Goal radius | Notes |
|---|---|---|---|---|---|---|
| S1 | `sandbox` | TEACH: the new rule alone; the goal is reachable **only** through it | 1.0 | ≥ 90% | 40–52 | No timer. Mechanic worlds: no hazards (hazard worlds: wide lanes, ≥ 90%) |
| S2 | `experiment` | Poke the rule; one variable changes | 1.5 | ≥ 80% | 34–40 | A1 nudge may win |
| S3 | `develop` | A real decision with the rule | 2.0 | 60–90% | 34–40 | First "idea" level |
| S4 | `breather` | Expressive, multi-route; moving goal or lateral | 1.5 | ≥ 80% | 36–46 | One "toy" per world |
| S5 | `twist` | A parameter or context change ("something crazy") | 3.0 | 55–85% | 30–36 | Earliest red herrings |
| S6 | `combine` | The twist plus one earlier mechanic | 2.5 | 50–85% | 26–32 | Ablation must show both mechanics are required |
| S7 | `develop` (tag `twist-develop`) | Push the twist | 4.0 | 45–80% | 26–32 | Last allowed debut slot for anything the boss uses |
| S8 | `breather` (tag `spectacle`) | Signature set piece or descent | 2.0 | ≥ 75% | 30–40 | Screenshot level |
| S9 | `mastery` | Hardest non-boss | 5.5 | 40–70% | 22–28 | No debuts |
| S10 | `boss` | Final exam: the world rule + the S5 twist | 8.0 | 40–70% per phase | 24–30 | 2–3 phases, checkpoint between, no debuts, ≥ S9 difficulty |

### B.2 Sawtooth target curve (median attempts to clear)
`target = 1 + (T − 1) × m_w`.
- W1–3 are onboarding: FASR ≥ 70% on the median level (retention Q2).
- From W4 the multiplier rises about 10% per world.
- W9 resets (the macro sawtooth at the half).

| World | m_w | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | Boss |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.20 | 1.0 | 1.1 | 1.2 | 1.1 | 1.4 | 1.3 | 1.6 | 1.2 | 1.9 | 2.4 |
| 2 | 0.25 | 1.0 | 1.1 | 1.3 | 1.1 | 1.5 | 1.4 | 1.8 | 1.3 | 2.1 | 2.8 |
| 3 | 0.30 | 1.0 | 1.2 | 1.3 | 1.2 | 1.6 | 1.5 | 1.9 | 1.3 | 2.4 | 3.1 |
| 4 | 0.40 | 1.0 | 1.2 | 1.4 | 1.2 | 1.8 | 1.6 | 2.2 | 1.4 | 2.8 | 3.8 |
| 5 | 0.45 | 1.0 | 1.2 | 1.5 | 1.2 | 1.9 | 1.7 | 2.4 | 1.5 | 3.0 | 4.2 |
| 6 | 0.50 | 1.0 | 1.3 | 1.5 | 1.3 | 2.0 | 1.8 | 2.5 | 1.5 | 3.3 | 4.5 |
| 7 | 0.55 | 1.0 | 1.3 | 1.6 | 1.3 | 2.1 | 1.8 | 2.7 | 1.6 | 3.5 | 4.9 |
| 8 | 0.60 | 1.0 | 1.3 | 1.6 | 1.3 | 2.2 | 1.9 | 2.8 | 1.6 | 3.7 | 5.2 |
| 9 | 0.55 | 1.0 | 1.3 | 1.6 | 1.3 | 2.1 | 1.8 | 2.7 | 1.6 | 3.5 | 4.9 |
| 10 | 0.65 | 1.0 | 1.3 | 1.7 | 1.3 | 2.3 | 2.0 | 3.0 | 1.7 | 3.9 | 5.6 |
| 11 | 0.72 | 1.0 | 1.4 | 1.7 | 1.4 | 2.4 | 2.1 | 3.2 | 1.7 | 4.2 | 6.0 |
| 12 | 0.80 | 1.0 | 1.4 | 1.8 | 1.4 | 2.6 | 2.2 | 3.4 | 1.8 | 4.6 | 6.6 |
| 13 | 0.88 | 1.0 | 1.4 | 1.9 | 1.4 | 2.8 | 2.3 | 3.6 | 1.9 | 5.0 | 7.2 |
| 14 | 0.97 | 1.0 | 1.5 | 2.0 | 1.5 | 2.9 | 2.5 | 3.9 | 2.0 | 5.4 | 7.8 |
| 15 | 1.05 | 1.0 | 1.5 | 2.1 | 1.5 | 3.1 | 2.6 | 4.2 | 2.1 | 5.7 | 8.4 |

**How to use it:**
- The FASR target per slot ≈ 1/target.
- A level is flagged in closed test when measured FASR < 0.6 × target FASR, when APS > 1.75 × target, or when quit-after-fail > 2× the world median.
- The retention brief's "APS ≤ 3 (≤ 6 boss)" is applied as a **world-median** flag, not per slot; see §G.
- Boss attempts with checkpoints are counted per phase, so a W15 boss at 8.4 is about 2.8 per phase.
- Every world's S1 drops back to 1.0, below the previous boss.

### B.3 Teaching order: every element debuts low-risk, ≥ 3 levels before any boss or mastery level uses it
| Element | Debut (world · slot) | Today | Fix |
|---|---|---|---|
| Release / momentum | W1 S2 | Never taught | L2 rework |
| Static spark | W1 S5 | First seen in the L10 boss | L5 rework |
| Descent / braking | W1 S8 | L7 trivial | L7 rework |
| Breeze / current / torrent zones (D-04 tiers) | W2 S1–S3 / S5 | Untiered; unfightable | Retune |
| Moving goal | W2 S4 | Debuts in the L20 boss | New S4 breather |
| Moving platforms | W3 S1 | L21 | Keep |
| Sweep saw | W3 S5 | Debuts in the L20 boss | L28 rework |
| Rotating arm | W4 S2 | L29 signature | Move; L29's arm becomes a saw |
| Beam (deterministic phase) | W4 S3 | L28, in W3 | Move |
| Countdown timer | W4 S5 | L34 (S4) | L34 rework |
| Custom-strength well | W5 S7 | Debuts in the L50 boss | Into L47 |
| Multi-pair rifts | W6 S5 | L58 (S8) | Reorder |
| Gates: up S1, side S2, down S5 | W7 | Down (L62) before up (L63) | Reorder |
| Launch start (`startVelocity`) | W9 S1 | Unused | New W9 rule |
| Orbital well / polarity flip | W10 S1 / S5 | — | New |
| Switch-door / timed door | W11 S1 / S5 | — | New (stretch) |
| Beat-toggled current / phased beams | W12 S1 / S3 | Phased beams debut in the L120 boss | New / move |
| Darkness / flares | W13 S1 / S5 | — | New |
| Attractor budget / one press | W14 S1 / S5 | — | New |
| Freed-star orbs / home well | W15 S1 / S5 | Orbs used only in L3 and L26 | Reuse |

### B.4 Route-shape quotas (per world; validator G16)
- **At most 4 of 10** levels share a dominant direction. Today 72 of the first 80 climb, and 37 go from bottom centre to top centre.
- **At least one each** of: descent; lateral; return trip (gem behind or below the start); moving goal (W2 onward).
- **No more than 2 goals** at (180, ≤ 130) per world. 45 goals sit at y ≤ 130 today.
- **No reused signature primitive** more than twice per world. The audit's repeats are the full-width wall at y = 430 (9 levels), the gem at (300, 560) (12 levels) and template-A/B boss arenas.

### B.5 Boss rules
- **No debuts in a boss** (B.3).
- **The boss tests the world rule plus the S5 twist**, with a different use of the mechanic in each phase.
- **Phases and checkpoints:** 2–3 phases in W1–8 and always 3 in W9–15. There's a checkpoint between phases: death respawns at the phase start in the armed preview. Each phase is ≤ 20 s at par. Swap the arena between phases instead of cramming one screen.
- **Bot gates:** the world's lowest random-search solve rate; T_best above the world median; no one-nudge win; duplicate score < 0.70 against every level.
- **Earned spectacle:** a music layer swells; the arena changes between phases; < 20 bodies and < 50 particles per phase.
- **Unique archetype per world** (C.2). Template A (central wall + arm + floor saw: L90, L120, L130) and template B (rift → gate → well + saw: L80, L110, L150) are retired as templates.

### B.6 Precision windows by band (A6 noisy expert checks them)
| Band | Worlds | Min gap | Min timing window | Min route clearance to hazards | Timer floor (limit ÷ T_noisy median) |
|---|---|---|---|---|---|
| Onboarding | 1–3 | 64 px (2.0 D) | 300 ms | 20 px | n/a (no timers) |
| Core | 4–8 | 56 px (1.75 D) | 250 ms | 16 px | ≥ 1.6 |
| Advanced | 9–11 | 52 px (1.6 D) | 200 ms | 12 px | ≥ 1.45 |
| Expert | 12–15 | 48 px (1.5 D) | 150 ms | 10 px | ≥ 1.35, and limit ≥ 1.25 × T_noisy p90 |

### B.7 Zone strength rebalance (D-04): design intent
**Problem.** Today `GRAVITY_ZONE_STRENGTH` = 6.0e-4 is 1.3× the attractor's clamped peak (4.62e-4 at ≤ 75 px). Every current is unfightable and every lift self-launches 350–400 px.

**Intent.** A current is a force you can **fight by holding close and must ride when holding far**. "Unbeatable" becomes a deliberate tier, not the default. The reference moves to roughly the attractor's pull at about 130 px (D-04).

| Tier | × `ZONE_REF` (provisional 1.5e-4, pre-`FORCE_SCALE`) | Equal to attractor at | Player read | Use |
|---|---|---|---|---|
| Breeze | 0.5 (7.5e-5) | ~186 px | A drift you correct from anywhere in reach | S2, ambience, W12 gust troughs |
| Current | 1.0 (1.5e-4) | ~132 px | Hold within ~130 px and you win; hold far and it wins | Default |
| Strong | 1.6 (2.4e-4) | ~104 px | Fight only from very close | Twists, bosses |
| Torrent (ride-only) | 3.5 (5.25e-4) | > peak | Can't be fought; the puzzle is when to enter and leave | L17 WHIRLPOOL, signatures |

- **Fight test** (P2 bot, gate for D-04 acceptance): holding 100 px ahead against a Current makes ≥ 40 px net progress per second, while a Torrent yields ≤ 0.
- **Lift carry:** ≤ 200 px past the zone end.
- **`FORCE_SCALE`** applies uniformly to attractor, zones and wells (D-01), so these ratios survive its final value.
- **Wells are unchanged:** the 2.2/95² peak ≈ 2.44e-4 is already "Strong".
- **Retune scope:** levels are retuned world by world with the bot (P4). It's never a blind constant edit; un-reworked worlds keep a legacy constant until their wave.

---

## Part C — World bible

### C.0 Visual-identity contract
Accent values and rules come from UX-UI-MOTION §1.9 (`WORLD_TOKENS` v2, measured ΔE).
- **Finding:** today 11 of 15 accents *equal* a gameplay colour. Each world was coloured with its own mechanic's hue, so the featured mechanic camouflages against its own world (W1 = goal green, W4/W12 = hazard red).
- **Contract:**
  - The full-chroma accent is drawn **only outside the play rectangle** (WT-1).
  - Inside play, identity comes from `bg`, a dim nebula pair (≤ 0.035 luminance), a **backdrop motif** and a **music layer**.
  - Motifs follow the same luminance cap and never use a gameplay hue, shape or motion. Example: no chevrons, because chevrons mean zones.
  - A world's identity is accent + motif + music layer + numeral glyph, never hue alone.

### C.1 Mechanic-variant catalogue (one entity / one field)
Variants never change the attractor formula (D-26).

| Variant | Kind | Data | Effort | Assigned | Status |
|---|---|---|---|---|---|
| Launch start | Existing field | `startVelocity` (+ preview arrow) | 0 engine, 0.25 d UI | W9 rule | Core |
| Drifting goal | Existing field | `goal.to/durationMs` (already supported) | 0 | W2 S4 onward | Core |
| Orbital / moving well | Param on `Magnet` | `MagnetConfig.orbit {pivot, periodMs, phaseMs}` or `to/durationMs` | 0.5 d | W10 rule | Core |
| Polarity flip | Param on `Magnet` | `flipMs`, `flipPhaseMs`; 400 ms ring-reverse telegraph | 0.5 d | W10 twist | Core |
| Beat-toggled current | Param on `GravityZone` | `pulseMs`, `phaseMs`, `duty`; 300 ms telegraph | 0.5 d | W12 rule | Core |
| Darkness | New entity `DarknessMask` + field `darkness {ballLightPx, touchLightPx, emberAlpha}` | Low tier: one pre-baked radial sprite | 1 d | W13 rule (flares = orbs that light, +0.25 d) | Core |
| Attractor budget | New entity `AttractorBudget` (owns HUD pips/meter) + field `attractorBudget {presses?, holdMs?}` | — | 0.5–1 d | W14 rule | Core |
| Switch → door | New entity `Switch` (owns its door rects) + field `switches[]` | `{x, y, r, doors[], mode: 'open'\|'close'\|'toggle', holdMs?}` | 2 d | W11 rule | **Stretch, owner-gated** (§G) |
| Rotating portal exit | Param on `Portal` | `exitSpinMs` (velocity re-aimed to the exit facing) | 1 d | Remix / Expert reserve | Reserve |
| Gate closes behind | Param on `Gate` | `closeAfterPass` | 0.5 d | Reserve | Reserve |
| Anti-gravity field | New entity | Inverts the pull inside a region | 1 d | — | **Not adopted**: it alters the attractor's output (D-26). Owner decision (§G) |

### C.2 The 15 worlds
Each entry gives focus · identity (accent from UX §1.9 · in-play motif · music layer) · tone · new rule · escalation S1→S9 · signature · boss · mastery · payoff. **Bold renames** are pending the D-19 scope check (§G).

**W1 FOUNDATIONS: "The launch"**
- **Focus:** hold, drag, release; walls; static spark.
- **Identity:** dawn blue `#9EC9FF` · sparse young starfield, one slow comet (High tier) · calm A bed plus a soft arpeggio that enters on first press.
- **Tone:** wonder.
- **Rule:** you are gravity; the star keeps whatever momentum you give it.
- **Escalation:**
  - S1 one pull home (L1)
  - S2 release and coast (L2)
  - S3 choose a gap (L4)
  - S4 constellation toy (L3)
  - S5 a spark guards the fast channel (L5)
  - S6 side entry (L6)
  - S7 decoy gap (L9)
  - S8 first descent with braking (L7)
  - S9 serpentine climb (L8)
- **Signature:** **THE SERPENTINE** (L8, renamed from THE GAUNTLET, which collides with L89).
- **Boss THE COLLAPSE** (descent):
  - Phase 1: weave down through offset gaps, with sparks *beside* the gap exits, never at the overshoot point.
  - Phase 2: brake into a 30 px home between two sparks.
  - Uses S5 and S8 skills only.
- **Mastery:** a return-trip gem behind the start, plus par.
- **Payoff:** the first freed star lights on the Star Map.

**W2 CURRENTS: "Ride the winds"**
- **Focus:** zones in four directions and four D-04 tiers; fight vs ride; drifting home.
- **Identity:** `#00D4FF` (kept off-field) · faint dust streaks drifting with the world's dominant current (never chevrons) · airy D bed plus a filtered-noise wind layer whose volume follows ball speed.
- **Tone:** buoyant.
- **Rule:** some forces are stronger than you. Hold close to out-pull a current; hold far and it wins.
- **Escalation:**
  - S1 updraft with the goal off the spawn column (L11)
  - S2 breeze lateral (L12)
  - S3 fight the crosswind (L13)
  - S4 drifting home on a river (new)
  - S5 torrent whirlpool (L17)
  - S6 lift hands you to the wind (L15)
  - S7 relay (L18)
  - S8 down-current descent with a return-trip gem (L14)
  - S9 THE EYE (L19)
- **Signature:** THE WHIRLPOOL (S5) and THE EYE (S9).
- **Boss THE MAELSTROM** (force gauntlet):
  - Phase 1: ride a torrent lift.
  - Phase 2: fight a Strong downdraft from close.
  - Phase 3: thread opposed crosswinds to a drifting eye.
  - The left-wall lane is closed; the saw is removed (it debuts in W3).
- **Mastery:** par needs deliberate torrent rides.
- **Payoff:** the currents calm and fade as the star frees.

**W3 CLOCKWORK: "Mind the gears"**
- **Focus:** moving platforms (pure functions of `simMs`) and the sweep saw.
- **Identity:** bronze `#E8A25C` · concentric gear rings turning at 1/20 speed (static on Low) · F bed plus a metronome tick at the level's base period, so the rhythm is audible.
- **Tone:** rhythmic.
- **Rule:** the world moves on a clock you can learn, identical every attempt.
- **Escalation:**
  - S1 L21
  - S2 fast/slow lanes with side stubs (L22)
  - S3 L23
  - S4 lateral shuttle (new; replaces L26)
  - S5 saw on the platform rhythm (L28; its beam moves to W4)
  - S6 currents plus platforms (L27)
  - S7 opposite-phase bars (L25)
  - S8 staging between bars (L24)
  - S9 THE GEARWORKS (L29; its arm becomes a saw)
- **Boss THE MACHINE** (polyrhythm: 1000/1100/1200 ms periods):
  - Phase 1: gears.
  - Phase 2: teeth (saws 40↔320).
  - The goal moves to y ≥ 120, clearing the goalDanger flag.
- **Mastery:** par rides phase alignment instead of waiting.
- **Payoff:** the machine stops and the tick falls silent.

**W4 PERIL: "Into the dark"**
- **Focus:** rotating arms, beams and the countdown.
- **Identity:** coral `#FF7A59` (hazards stay `#FF5A6A` + spikes) · slow rising embers · E-minor bed plus a low pulse that tightens below 3 s on timed levels.
- **Tone:** dread.
- **Rule:** stakes. Beams fire on a telegraphed beat, and some rooms have a clock.
- **Escalation:**
  - S1 wide-lane sparks (L31)
  - S2 arm debut (L32)
  - S3 beam debut (L33)
  - S4 L35
  - S5 first timer (L34, limit from the bot)
  - S6 wind toward danger (L37)
  - S7 saw patience (L36)
  - S8 decoy centre (L38)
  - S9 THE FORGE descent (L39, the world's mastery level; saws 40↔320)
- **Boss THE INFERNO** (timed escape):
  - Phase 1: beam corridor.
  - Phase 2: arm and saw crossing.
  - Each phase has its own clock segment; the right-wall lane is closed.
- **Mastery:** under-par runs need a beam window you can't wait for.
- **Payoff:** the fire dims to embers.

**W5 WELLS: "Gravity's grip"**
- **Focus:** attract and repel wells (the proven alternating arc), plus a custom-strength well.
- **Identity:** `#C04CFF` (off-field) · a faint static lensing ring around screen centre · heavy C bed plus a sub-bass swell tracking ball speed near wells.
- **Tone:** seduction.
- **Rule:** the cosmos pulls back; other gravity competes with yours.
- **Escalation:** L41 · L42 · L43 · L46 · L44 · L45 (lift + well, mirrored into a descent) · L47 (custom-strength debut) · L48 (sealed) · L49.
- **Signature:** THE BINARY STAR (L49).
- **Boss THE SINGULARITY** (orbit and slingshot):
  - Phase 1: orbit the rim.
  - Phase 2: release at the apex past the spinning disk. A spike at (180, 230) makes the slingshot necessary.
  - The gem moves off-route.
- **Mastery:** a slingshot-only gem line.
- **Payoff:** the well collapses into the freed star.

**W6 RIFTS: "Through the rifts"**
- **Focus:** portals carry velocity; multi-pair rifts; seals that are actually sealed.
- **Identity:** `#33E1FF` (off-field) · hairline tear-cracks in the starfield · G-tritone bed plus a reversed swell on each jump.
- **Tone:** curiosity.
- **Rule:** space has shortcuts, and what goes in keeps its speed.
- **Escalation:**
  - S1 L51 (sealed so the rift is required)
  - S2 L57
  - S3 L54
  - S4 L53 (top closed)
  - S5 multi-pair L58
  - S6 lift into rift (L55)
  - S7 think backwards (L56, nook sealed)
  - S8 HALL OF MIRRORS (L59, gem off the exit)
  - S9 L52 (exit off the saw)
- **Boss THE BREACH** (deduction):
  - Decoys cost about 3 s, never a life. The decoy exit moves to (40, 700) and the divider widens to 360.
  - Phase 2 chains two rifts at speed past an arm guard.
- **Mastery:** speed-carry routes.
- **Payoff:** the rifts seal behind the star.

**W7 GATES: "One way only"**
- **Focus:** up, side and down gates, with walls that reach the floor, so commitment is real.
- **Identity:** `#2EE6C0` (off-field) · dark monolith silhouettes · clean D bed plus a soft latch click on each pass.
- **Tone:** resolve.
- **Rule:** doors open only forward; every pass is a decision.
- **Escalation:**
  - S1 up (L63)
  - S2 side (L61)
  - S3 L65
  - S4 L67
  - S5 down (L62, floor-sealed)
  - S6 L64 (pit sealed)
  - S7 L66 (gate full height)
  - S8 two gates (L68)
  - S9 THE LOCKWORKS (L69)
- **Boss THE VAULT** (irreversible order): a real lock-out exists. The inner gate is full height, and one rift lands on the wrong side of the outer gate. A wrong commit is a fast respawn, not a soft-lock.
- **Mastery:** a gem that needs a one-way detour planned before the climb.
- **Payoff:** the vault opens and light floods out.

**W8 CONVERGENCE: "Almost home"**
- **Focus:** two mechanics per level, both required (ablation).
- **Identity:** apricot `#FFC2A8` · the 7 freed stars visible as a dim constellation in the backdrop (static sprites) · warm C add9 bed; each freed world's bed joins as a quiet stem.
- **Tone:** hope.
- **Rule:** everything you know, two at a time.
- **Escalation:** S1 rift past the push (L71) · S2 lift and gate (L73) · S3 push into a rift, exit off the beam (L74) · S4 many-ways-up toy (L78) · S5 gate + platform + saw (L75) · S6 lift/gate/well (L76) · S7 gate + rift + saw (L77) · S8 descent through a well and a down-current (new; replaces L72) · S9 THE CONFLUENCE.
- **Signature:** THE CONFLUENCE (L79, no longer self-playing).
- **Boss ALMOST HOME** (L80, renamed from HOMECOMING; relay):
  - Four short legs, each one mechanic: torrent lift (100 px) → rift (first mouth at (110, 490)) → gate → saw (120↔320). The timer is about 12 s, from the bot.
  - At capture, the home **slips away**. Headline "ALMOST HOME"; the star is flung into the dark.
- **Payoff:** the false ending becomes the story's turn.

**Back half (W9–15): the rules of *how* you play change, not just what exists.**

| | Front half (W1–8) | Back half (W9–15) |
|---|---|---|
| Novelty | A new object per world | A new constraint on control, time, sight or input |
| Bosses | 2–3 phases | 3 phases, arena swaps |
| Atmosphere | Single nebula mood | Dual-tone nebula, darker `bg`, a percussion music layer |
| Precision band | Onboarding / Core | Advanced / Expert |

**W9 FREEFALL** (renamed from GAUNTLET): "Catch the falling star"
- **Focus:** every level starts with the star already moving (`startVelocity`), shown frozen with a launch arrow in the preview. You catch, redirect and ride W3/W4 timing.
- **Identity:** `#FF8A3D` (re-entry fire) · streaking starfield with a vertical parallax drift (static under RM) · driving G-minor bed plus a wind-rush layer.
- **Tone:** adrenaline.
- **Rule:** you don't start the motion, you inherit it.
- **Escalation:** S1 gentle drop (L81) · S2 sideways throw (L82) · S3 catch before a spark floor (L85, descent) · S4 drifting home (L84) · S5 launched *away* from home (L86) · S6 + currents (L83) · S7 + saw timing (L88) · S8 **THE CATCH** (L89, renamed) · S9 catch-and-thread (L87).
- **Boss TERMINAL VELOCITY** (replaces template-A L90; interception):
  - Phase 1: arrest a fast fall above a spark bed.
  - Phase 2: relaunch through moving gaps.
  - Phase 3: intercept a drifting home.
- **Mastery:** par keeps the launch momentum instead of killing it.
- **Payoff:** the star stops falling.

**W10 BINARY: "Caught between stars"**
- **Focus:** orbital wells, then polarity flip.
- **Identity:** `#6A8CFF` · twin faint suns circling slowly in the backdrop · B bed plus a two-note ostinato phase-locked to the level's orbit period.
- **Tone:** hypnotic.
- **Rule:** the wells move, so gravity has a rhythm.
- **Escalation:** S1 one orbiting well · S2 a rail well · S3 two wells · S4 L94 · S5 polarity flip · S6 + rift · S7 flip + orbit · S8 binary dance · S9 counter-orbits.
- **Signature: THE DANCE** (L99, renamed from THE BINARY STAR, which duplicates L49; L49's stakes are restored).
- **Boss THE PULSAR** (L100, the audit's standout; its archetype is kept and its data reworked; periodic beacon):
  - Phase 1: ride the attract phase around the core.
  - Phase 2: break on the repel pulse.
  - Phase 3: thread twin pulsars.
  - The gem moves out of the sweep.
- **Mastery:** par needs riding a full orbit.
- **Payoff:** the dance stops and one sun is your star.

**W11 LABYRINTH: "Lost in the maze"**
- **Focus:** switches open and close doors, then timed doors (stretch variant). **Zero-engine fallback:** a real maze of floor-sealed one-way gates and rifts, with collect-all orb "keys".
- **Identity:** `#3FE0C5` · faint maze-glyph lattice · uneasy tritone bed plus a click layer per switch.
- **Tone:** cunning.
- **Rule:** the maze remembers what you touched.
- **Escalation:** S1 one switch, one door · S2 a door that closes · S3 two-switch order · S4 open hub · S5 timed door · S6 + gate · S7 timed + rift · S8 HALL OF ECHOES (L109, mouth 2a → (60, 380), with a mid-floor saw) · S9 three-room sequence.
- **Boss THE WARDEN** (sequence lock; replaces template B):
  - Phase 1: the room reveals a switch order.
  - Phase 2: a door that re-closes after 4 s.
  - Phase 3: the run home through the doors you opened.
- **Mastery:** a single run with no wasted switch.
- **Payoff:** the walls fold away.

**W12 TEMPEST: "Into the tempest"**
- **Focus:** beat-toggled currents, phased beams and real clocks (limit ≈ 1.35–1.6× T_noisy).
- **Identity:** storm magenta `#FF4FA0` · distant lightning flicker ≤ 1 per 4 s (never above 3/s; off under the Flashes setting) · tense bed plus kick-drum on the beat.
- **Tone:** urgency.
- **Rule:** the storm breathes; gusts and beams share one beat.
- **Escalation:** S1 one gust lane · S2 L111 · S3 phased beams (L113) · S4 L115 · S5 opposite-phase gust pair · S6 + saw (L114) · S7 L117 (blind exit fixed) · S8 L118 · S9 **THE SQUALL** (L119, renamed; its old title equalled the world name).
- **Boss THE EYE OF THE STORM** (rhythm survival):
  - Phase 1: cross three gust lanes on the beat.
  - Phase 2: the eye, a calm ring on a short clock with beams closing in phase. The goal is moved ≥ 38 px from the beam.
- **Mastery:** par on the beat, never against it.
- **Payoff:** the storm parts.

**W13 ECLIPSE** (renamed from ASCENSION): "The long night"
- **Focus:** darkness. The ball lights 110 px and the touch point lights 130 px. Hazards glow as embers at 0.15 alpha (0.40 in high-contrast mode), so nothing lethal is ever invisible. Then flares: orbs that permanently light an area.
- **Identity:** `#C5F56A` (off-field) · near-black `bg` with a corona rim on the frame · hushed bed with a heartbeat layer.
- **Tone:** hush.
- **Rule:** you see only what your gravity touches. Holding is also lighting, and scouting costs momentum.
- **Escalation:** S1 lit corridor · S2 L121 · S3 L123 · S4 open dark field · S5 flares · S6 + rift (L124) · S7 L127 (crosswind into a vertical saw, the audit's standout) · S8 L126 · S9 L128 (well moved out of the saw band).
- **Signature:** **BLACKOUT** (L127).
- **Boss TOTALITY** (replaces template-A L130; navigate by memory):
  - Phase 1: the arena is fully lit; learn it.
  - Phase 2: the light shrinks to 70 px.
  - Phase 3: one flare to place.
- **Mastery:** gem by memory.
- **Payoff:** the eclipse ends and the corona becomes the freed star.

**W14 LAST LIGHT** (renamed from SINGULARITY, which duplicates the L50 boss name): "Edge of the dark"
- **Focus:** the attractor budget (press pips or a hold meter), then one press.
- **Identity:** orchid `#B98CFF` · the starfield thinning toward the frame edge · deep bed that loses one partial per press spent (it is restored on win).
- **Tone:** austerity.
- **Rule:** your gravity is running out, so every pull counts.
- **Escalation:** S1 5 presses · S2 a 4 s hold meter · S3 3 presses with wells · S4 L132 · S5 one press · S6 + rift · S7 one press + launch · S8 THE EVENT HORIZON (L139, gem out of the sweep) · S9 two presses through a flip well.
- **Boss ONE LAST PULL** (replaces L140; economy puzzle):
  - Phase 1: 3 presses through wells and rifts.
  - Phase 2: 2 presses against a torrent.
  - Phase 3: a single press must carry the star home through a well slingshot.
- **Mastery:** finish with presses to spare (par).
- **Payoff:** "Your gravity returns." The pips refill.

**W15 HOMECOMING: "Bring the star home"**
- **Focus:** synthesis. The 14 freed stars return as guiding orbs (`collectibles` + `collectAllToWin`); each level pairs one front-half mechanic with one back-half rule ("memories"). Twist: the home calls, a gentle well on the goal.
- **Identity:** star-white gold `#FFF0C8` · all 14 world accents as a dim ring constellation (off-field) and a dawn gradient · the warm resolved bed; each phase adds earlier world stems.
- **Tone:** release.
- **Escalation:** each slot pairs a front-half mechanic with a back-half rule:
  - S1 gather three freed stars on a breeze (W1 + W2)
  - S2 clockwork + launch (W3 + W9)
  - S3 wells in the dark (W5 + W13)
  - S4 open toy: rifts + orbital wells (W6 + W10)
  - S5 the home calls (twist)
  - S6 gates + switch-doors or the fallback (W7 + W11)
  - S7 beat gusts + budget (W12 + W14)
  - S8 descent "bring it gently down" (L145; W4 recall)
  - S9 **THE HOMEWARD PATH** (L149, reworked to diverge from L150 and L110)
- **Finale THE LONG WAY HOME** (L150, a new layout; a synthesis, not a remake of L80):
  - Phase I "Currents & Wells": W2 + W10, beat gusts and orbital wells.
  - Phase II "Rifts in the Dark": W6 + W13 + W7, rifts and gates under darkness.
  - Phase III "Home": the arena clears and the light returns. Budget = 1 press (W14). The home sits within one reach with L1's 52 px radius: **one close pull home**, the L1 gesture with everything learned behind it.
  - Duplicate score < 0.70 against L80, L149 and every other level.
- **Mastery:** a perfect run across 3 phases.
- **Payoff:** the finale sequence (P5): reunion vignette, stats, credits and post-game unlocks (Part E).

---

## Part D — Content triage of the existing 150 (D-27)
**Categories:**
- **KEEP**: polish only. That means ≤ 3 field edits, plus mechanical changes: zone-tier conversion, `relief` copy, par from the formula, title fixes.
- **REWORK**: data-only, keeping the stable id. This includes adding a C.1 field once its engine ships.
- **REPLACE**: a new layout in the slot, with a new id. The old file goes to one of:
  - **REMIX** pool: a literal copy whose original stays in the campaign, labelled `role: remix` + `variants.source` (D-05).
  - **ARCHIVE**: template bosses and remakes. It can return as Expert content.

Verdicts below are the initial calls from audit §C. The per-level bot report confirms or overturns each one (P04 §3).

| W | KEEP | REWORK | REPLACE → destination |
|---|---|---|---|
| 1 | L1 (gem), L3, L4, L6, L9 | L2 (release; dup of L1), L5 (spark debut), L7 (descent), L8 (rename; diverge from L10), L10 (boss) | — |
| 2 | L13, L15, L17, L19 (retune) | L11, L12 (self-solve), L14 (one-nudge → descent), L18 (overshoot), L20 (wall-hug, debuts) | L16 → REMIX (of L15) |
| 3 | L21 | L22–L25 (bar stubs), L27 (self-run), L28 (saw replaces beam), L29 (arm → saw), L30 (saws 40↔320, goal y) | L26 → REMIX (of L3) |
| 4 | L31, L33, L35, L37, L39 | L32, L34, L36, L38, L40 | — |
| 5 | L41, L43, L46, L47, L49 | L42, L44, L45, L48, L50 | — |
| 6 | L59 | L51–L58, L60 (bypasses, exits, seals) | — |
| 7 | L63, L69 | L61, L62, L64–L68 (floor walls, order), L70 | — |
| 8 | L75, L78 | L71, L73, L74, L76, L77, L79, L80 | L72 → REMIX (of L55) |
| 9 | — | L81–L89 (all gain launch starts) | L90 → ARCHIVE (template A) |
| 10 | L94 | L92, L93, L95, L96, L98, L99, L100 (phases + flip; gem out of sweep) | L91 → REMIX (of L43), L97 → REMIX (of L45) |
| 11 | — | L104, L105, L107–L110 | L101 → ARCHIVE, L102 → REMIX (L63), L103 → REMIX (L53), L106 → REMIX (L67) |
| 12 | L115, L118, L119 | L111–L114, L117, L120 | L116 → REMIX (of L84) |
| 13 | — | L121–L129 (darkness) | L130 → ARCHIVE (template A) |
| 14 | L139 | L132–L135, L137, L138 | L131 → REMIX (of L5), L136 → REMIX (of L122), L140 → ARCHIVE |
| 15 | — | L141, L144–L149 | L142 → REMIX (of L43), L143 → ARCHIVE (= L101), L150 → ARCHIVE (the L80 remake) |
| **Σ** | **30** | **102** | **18** (12 REMIX, 6 ARCHIVE) |

**World size.**
- **Recommendation: keep 10 levels per world.** That's 150 at M2. The 10-slot template, Star Map path, frontier threshold and FASR targets all assume 10.
- D-27 allows 8–12. Use that latitude **only downward, and only to 9**: if a replacement isn't bot-green by its wave's exit date, drop an S4 or S8 breather.
- Never pad above 10. Growth goes to post-game.
- Expected at M2: 145–150.

---

## Part E — Post-campaign content (rules here; unlocks and meta in RETENTION §10; built in P6)
| Priority | Mode | Rules | Content source | Engine cost |
|---|---|---|---|---|
| 1 | **Time Attack** vs the author ghost | Race the A5 route ghost. Medals: Bronze = par, Silver = par − 15%, Gold = author × 1.10, Author = beat it. Sim-clock times. Available on 3★ levels | Bot routes (already produced for T2) | 1–2 d (GhostStore paths + race renderer) |
| 2 | **Remix** | X-mirror (gates and zones mirrored, bot re-verified) + one Prankster-style modifier per level. Launch set (zero engine): *Speedy* (limit = par + 3 s), *Tight Home* (goal −20%), *Gem Rush* (gem required). Later set: *Fast-Foe* (kinematics ×1.25), *Dim* (W13 darkness), *Three Pulls* (W14 budget). Id `<id>~rx`. Only curated, bot-green pairs ship | 150 campaign + 12 REMIX-pool levels | 1–2 d + bot runs |
| 3 | **Boss Rush** | Sets of 5 consecutive bosses, cumulative sim time, phase checkpoints off, local "your best" only (D-17) | The 15 reworked bosses | 1–2 d (after boss-phase runtime) |
| 4 | **Hidden mastery levels** ("Deep I–XV") | One per world, unlocked by world mastery (RETENTION §7.1); mastery band, Expert precision windows | Retired pack (13) + 6 ARCHIVE levels, reworked | 0.5 d unlock + 0.5 d/level. **Not authored in P4** (no count growth) |

---

## Part F — Readability and mobile ergonomics
| # | Rule | Numbers | Check |
|---|---|---|---|
| F.1 | **HUD exclusion.** Goal discs, gems, portal mouths and required hold points never intersect HUD rects computed at a worst-case 47 px top inset | Row 1: play y < 64, full width (level chip + toolbar). Row 2: x 130–230, y < 132 (par/countdown chip). Today 16 levels fail, including all 7 back-half bosses at (180, 90–100). Display-only chips stop being `uiBlockers` (P3) | Validator G11 (HUD exclusion) |
| F.2 | **Thumb occlusion.** The thumb covers the column below the touch point, and on a climb the ball approaches *through* that column (72 of 80 W1–8 levels are climbs) | ≤ 4 climbs per world (B.4). Decision points (gaps, hazards) are winnable from an oblique hold ≥ 30° off vertical, so the hand sits beside the ball's path. Descents never put the goal directly below the natural hold. **Proposed to P5** (not yet in P05): an occlusion pip on the attractor ring when the ball is within 70 px of the touch | A5 hold-angle histogram; human device check |
| F.3 | **Edge back-gesture zones.** Android reserves about 24–32 dp at the side edges for Back | No required hold within 32 px of the left or right screen edge, or within 48 px above the bottom inset. Wall-hug lanes are closed by systemic fixes (a)–(c) (audit C.2). ≤ 5% of A5 hold samples in these zones | Validator G19 + device test |
| F.4 | **Greyscale readable.** Silhouettes carry meaning; hue is a bonus | Deutan goal/hazard ΔE is 12.8 and protan attractor/repel is 2.2, so shapes are mandatory: spikes, stripes, +/− glyphs | t=0 greyscale and deutan renders per level |
| F.5 | **Accent off-field** | UX WT-1/WT-2 | Lint |
| F.6 | **Telegraphs** | Beam charge 25% of cycle; flip 400 ms; beat zone 300 ms; door 250 ms | Entity tests |
| F.7 | **No off-screen information** | No camera follow in the campaign; everything relevant is on the 360×780 field | Review |
| F.8 | **Targets** | Result buttons per UX; relief chips ≥ 48 px, ≥ 8 px apart, never in F.3 zones | UX audit |

---

## G. Owner decisions and reconciliations (not silently resolved)
1. **D-26 vs the anti-gravity field** (listed in MASTER P4). It isn't adopted because it changes the attractor's output inside a region. The owner may approve it as a reserve variant.
2. **MASTER P4 says "2–4 cheap variants".** This bible uses 2 new-entity variants (darkness, attractor budget), 3 parameter variants on existing entities (orbital well, polarity flip, beat zone), 1 existing field (launch) and 1 owner-gated stretch (switches → doors, W11; zero-engine fallback defined).
3. **D-19 scope.** The world renames (W9 FREEFALL, W13 ECLIPSE, W14 LAST LIGHT) and title renames (L8, L80, L89, L99, L119, plus the new boss names) assume D-19 covers only the product name. Until the owner confirms, P4 ships only the L80 rename (required) and the duplicate-title fixes. Stable ids never change (D-05).
4. **D-07 "8/10"** is generalised to `ceil(0.8 × size)` for D-27 world sizes.
5. **Retention APS thresholds** (≤ 3 / ≤ 6) are applied as world-median flags. Per-slot targets come from B.2, because the template's S9/boss targets exceed them by design.
6. **The UX brief's optional "Auto-continue" setting** isn't adopted. It would need a D-08 amendment.
