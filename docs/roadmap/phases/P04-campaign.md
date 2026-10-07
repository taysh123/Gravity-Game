# P04 — Campaign Redesign & Content Quality

**Status:** PLANNED, in two parts:
- **P4-α** = EXECUTION-ORDER **step 13** (Worlds 1–3 + zone retune + `FORCE_SCALE` final). Needs steps 10 (P3), 11 (bot A4–A6 + par) and 12 (P5-A). Required for **M1**.
- **P4 waves** = **step 15** (Worlds 4–15, boss phases, finale). Needs **M1** closed-test telemetry. Required for **M2**.

Baseline `master @ d3c6aab` · 2026-10-07.

> **Conforms to:**
> - D-04: zone rebalance, bot-verified, never a blind constant edit.
> - D-05: stable ids, `idea`/`role`/`teaches`/`uses`/`relief`/`boss.phases`/`variants`, worlds as explicit id lists.
> - D-06: gates, with fast agents blocking in CI.
> - D-07: par withheld on assisted clears; frontier.
> - D-01: `FORCE_SCALE` finalised here; kinematics as functions of `simMs`.
> - D-02, D-03: A0 defined under the armed sim; goal–hazard rule G-03.
> - D-26: no formula change; anti-gravity not adopted.
> - D-27: cut, replace or relabel; worlds 8–12; count is an outcome.
>
> **Design source:** [`../../design/GAMEPLAY-DESIGN.md`](../../design/GAMEPLAY-DESIGN.md) Parts B–F (template, sawtooth, teaching order, world bible, triage).
> **Visual tokens:** [`../../design/UX-UI-MOTION.md`](../../design/UX-UI-MOTION.md) §1.9 (`WORLD_TOKENS`, delivered by P05-T10).
> **Obstacle angle render fix:** inherited from P5-A (P05 conflict C6).
> **Post-game modes** that consume the REMIX pool: P6 (RETENTION §10).

## 1. Summary
P4 rebuilds the campaign against machine-checked quality gates. It has two parts.

**P4-α (first hour, for M1).**
- Worlds 1–3 are re-slotted into the 10-slot template (TEACH → … → BOSS). Every self-solving, one-nudge, wall-hug and debut-in-boss defect in L1–L30 is fixed.
- Zones are converted to the D-04 tiers, starting with W2/W3, while other worlds keep a legacy constant until their wave.
- Par is written from the bot formula. W1–3 hints are rewritten. `FORCE_SCALE` is finalised from the M0 owner A/B.
- Exit gate: **0 bot-gate failures in W1–3** plus a human device check.

**P4 waves (data-informed, for M2).**
- Wave A covers W4–W8 and adds boss phases and checkpoints. L80 becomes ALMOST HOME.
- Wave B covers W9–W12 with the back-half rules: launch starts, orbital and flipping wells, beat-toggled currents, and the owner-gated switch-doors.
- Wave C covers W13–W15: darkness, the attractor budget, and the synthesis finale THE LONG WAY HOME.
- Closed-test FASR/APS/QAF decide the order inside each wave.
- 18 levels are replaced: 12 literal copies go to a labelled REMIX pool and 6 template bosses or remakes are archived.

**One workflow for every level:** bot report → design card → data edit → bot gates → human check → commit → telemetry check.

## 2. Scope
| Aspect | Detail |
|---|---|
| **Systems** | All level data (`src/config/levels/`); `worlds.ts` (id lists from P2 + rule/tone); `worldThemes.ts` (subtitles, motif keys; colours via P05 `WORLD_TOKENS`); zone constants (D-04); `FORCE_SCALE`; boss-phase runtime; 5 core variants (orbital well, polarity flip, beat-toggled zone, darkness, attractor budget) + 1 stretch (switch → door); validators and gates G1–G21; route artifacts; progress migration for replaced or reworked levels; world music layers and backdrop motifs |
| **Dependencies** | **P2:** LevelConfig v2, content hash, validators framework, levelsim A0–A6 + ablation + par + route export, nightly report. **P3:** armed sim, relief/assisted, frontier, ResultPanel (missed-star copy relies on par semantics). **P5-A:** HudScene (HUD rects for G11), obstacle angle fix, luminance-safe render. **P1:** kinematics functions and `FORCE_SCALE`. **M0:** owner `FORCE_SCALE` A/B. **M1:** closed-test telemetry for wave ordering |
| **Difficulty** | Engineering **M** · design **XH** · QA **H** (bot + human) |
| **Risk** | High (largest content effort, about 95–100 dev-days in total). Mitigated by: P4-α first and alone for M1; data-only edits wherever possible; gates in CI so regressions are caught at commit; waves shippable independently; a world drops to 9 levels rather than slipping a wave (D-27) |
| **Upside** | Very high. "Plays itself" stops being the first impression. A real sawtooth; meaningful par and gems; bosses as climaxes; a back half that feels different; a finale that pays off "bring the star home" |
| **Success metrics** (MASTER P4) | 0 levels failing CI bot gates · duplicate score < 0.85 for every non-remix pair (bosses < 0.70) · bot-derived par puts 3★ at 25–40% of clearers (refit with closed-test data) · every boss ≥ its world's hardest non-boss · per-slot FASR targets (GAMEPLAY B.2) met in closed test |
| **Must NOT do yet** | Increase the level count · new worlds · Expert packs or authoring hidden mastery levels (P6+; P4 only routes cut levels into REMIX/ARCHIVE) · the anti-gravity field (D-26, owner) · camera-follow tall levels · any change to the attractor formula · Phaser 4 or custom render-pipeline work (D-28, D-13) · the switch-door variant before an owner yes (§G of GAMEPLAY-DESIGN) |

## 3. Architecture plan

### 3.1 Per-level rework workflow (mandatory for every level touched)
| Step | Action | Artifact | Time-box |
|---|---|---|---|
| 1. **Bot report** | Run the levelsim full suite on the level id (A0–A6 + ablation + duplicates + clearances; P2 subcommand) | The level's entry in `level-quality-report.json` (flags, T_best, T_noisy median/p90, noisy success, random-solve curve, ablation ratios, gem detour, route families, dup scores, hold-point histogram) | 5 min (nightly cache) |
| 2. **Design card** | Fill the card in the world sheet `docs/design/worlds/WNN-<slug>.md`: slot, role, `idea` sentence, `teaches`/`uses`, route shape, target attempts and FASR (B.2), precision band (B.6), gem intent (detour s / risk px), T0/T1 copy, title | One table row + the D-05 fields | 20–40 min |
| 3. **Edit** | Data only in the level file (D-05 fields + geometry + variant fields). New layouts go in a new file named by the new id | Diff | 1–3 h |
| 4. **Bot gates** | Quick-check while editing (A0–A3 + beam width 16, < 30 s), then the full suite. Apply the par formula (write `parTimeMs`). Export the route artifact (P3 T2) | Updated report entry; `parTimeMs`; `src/config/routes/<id>.json` | 10–30 min |
| 5. **Human check** | Designer on the reference Android: 3 runs (blind, informed, par attempt), noting attempts and confusion points. Bosses and signatures also get 5–8 watched testers per world (no coaching) at wave exit | Notes in the world sheet | 15 min/level; 1 session/world |
| 6. **Commit** | Level + report diff + card + route in one commit per level (or per small batch), message `content(wNN): <id> <verdict>` | Git history | — |
| 7. **Telemetry check** (after M1) | Compare FASR/APS/QAF to the B.2 target. Flag if FASR < 0.6 × target, APS > 1.75 × target or QAF > 2 × world median; flagged levels go back to step 2 | STATUS "content flags" table | Weekly |

### 3.2 Gates
"CI" means blocking on every PR (D-06 fast agents + static). "Nightly" means slow agents, which become blocking at wave exit.

| ID | Gate | Fails when | Agent / check | Stage |
|---|---|---|---|---|
| G1 | Self-solve | A0 wins. A0 = one arming tap ≥ 320 px from the ball (zero force under D-02), then no input for 30 s | A0 | CI |
| G2 | One-nudge | A1 wins in slots S3–S10 | A1 | CI |
| G3 | Wall-hug | A3 wins on a level tagged `hazard-idea` | A3 | CI |
| G4 | Decorative mechanic | Ablating the world mechanic (or any `teaches` element) leaves it solvable at ≤ 1.1 × T_best. Warn at 1.1–1.5× | Ablation + A5 | Nightly |
| G5 | Weak boss | Boss random-solve rate isn't the world's lowest, T_best ≤ world median, or it's easier than S9 | A4, A5 | Nightly |
| G6 | Noisy band | A6 success outside the role band (GAMEPLAY B.1; sandbox/breather have no upper bound) | A6 | Nightly |
| G7 | Duplicate | Score ≥ 0.85 against any non-remix level; ≥ 0.70 for bosses (12×26 mirror-aware raster + route polyline) | Static + A5 | CI |
| G8 | Goal–hazard | Any hazard sweep within 24 px of the goal disc (D-03 G-03) | Static | CI |
| G9 | Portal exit | Exit within 48 px of a kill band, or into geometry for > 2/16 approach directions | Static | CI |
| G10 | Gem | Detour < 1.5 s with no risk (≤ 24 px clearance), or the pickup is inside a sweep. W1 S1 exempt | A5 gem/no-gem | Nightly |
| G11 | HUD exclusion | Goal, gem, mouths or required holds intersect HUD rects at a 47 px inset (GAMEPLAY F.1) | Static + A5 holds | CI |
| G12 | Precision | Gap or timing window below the band (B.6) | A5 route analysis | Nightly |
| G13 | Timer | Limit < 1.25 × T_noisy p90 (fail); limit > 2.0 × T_noisy median (warn: remove the timer) | A6 | Nightly |
| G14 | Par | `parTimeMs` ≠ formula ± 0.5 s | Report | CI |
| G15 | No-debut | An element or parameter first used in boss or mastery, or debuting < 3 levels before one | Static (`teaches`/`uses` + order) | CI |
| G16 | Route quota | A world breaks B.4 (≤ 4 same dominant direction; ≥ 1 descent, lateral, return trip, moving goal from W2) | Cached A5 routes | CI (world) |
| G17 | Budget | ≥ 20 bodies in any phase, or particle spec over the tier budget | Static | CI |
| G18 | Well near kill band | Well core + 24 px within 24 px of any saw or beam band | Static | CI |
| G19 | Edge holds | > 5% of A5 hold samples within 32 px of the side edges or 48 px above the bottom inset | A5 | Nightly (warn) |
| G20 | Copy | Missing, too long or duplicate `relief.notice`/`rule`, duplicate title, lint hits (needs human ack) | Static | CI |
| G21 | Route freshness | Route artifact `levelHash` ≠ the current content hash | Static | CI |

### 3.3 P4-α slot plans (W1–3)
Verdicts and ideas follow GAMEPLAY C.2 and D. Geometry numbers marked † are starting points that the bot and human check confirm or move.

**W1 FOUNDATIONS** (m = 0.20)

| Slot | Source | Verdict | Change | `idea` |
|---|---|---|---|---|
| S1 sandbox | L1 `level1.ts` | KEEP | Gem to a short visible detour (~1 s); T0 "Hold near the star. Drag to steer." | One hold near the star pulls it home |
| S2 experiment | L2 `level4.ts` | REWORK | A wall lip near the goal† so a held pull snags, while an early release coasts home. Breaks the L1/L2 near-duplicate | Let go early and the star keeps going |
| S3 develop | L4 `level2.ts` | KEEP | T1 copy | Two gaps; only one leads past the gem |
| S4 breather | L3 `level91.ts` | KEEP | — | Gather the stars in any order |
| S5 twist | L5 `level3.ts` | REWORK | First static spark in the fast centre channel (side lanes ≥ 64 px); T0 "Red sparks end the run." | The fast channel is guarded; the slow sides are safe |
| S6 combine | L6 `level5.ts` | KEEP | Gem detour 9.9 px → ≥ 1.5 s; T1 "Where is the chamber open?" | The chamber opens on one side only |
| S7 develop | L9 `level29.ts` | KEEP | Spark beside the bait gem (a risky ★2); T1 rewrite | The inviting gap leads nowhere |
| S8 spectacle | L7 `level28.ts` | REWORK | Descent with two shelves; goal radius 34 → 30; braking required; T0 "Hold below the star to slow it." | Hold below the star to slow its fall |
| S9 mastery | L8 `level65.ts` | REWORK | Title THE SERPENTINE (pending D-19 scope; otherwise only the L89 collision is fixed); sparks at 2 turns; geometry diverges from L10 (G7 < 0.85) | A winding climb where overshooting a turn ends the run |
| S10 boss | L10 `level66.ts` | REWORK | Two sections in one arena (phases retrofitted in Wave A). Spark moved off the overshoot point beside the §1 gap exit; section 2 = brake into a 30 px home between two sparks | Descend the shaft, then stop the star in a tight home |

**W2 CURRENTS** (m = 0.25; all zones converted to tiers)

| Slot | Source | Verdict | Change | `idea` |
|---|---|---|---|---|
| S1 sandbox | L11 `level7.ts` | REWORK | Goal moved off the spawn column (to ~(290, 150)†); Current tier; spawn below the zone; gem off the surf line; T0 "Currents push. You still pull." | Currents carry you; you still choose where |
| S2 experiment | L12 `level11.ts` | REWORK | Breeze tier; goal moved upwind of the carry line | A breeze drifts you; small pulls correct it |
| S3 develop | L13 `level9.ts` | KEEP (retune) | Current crosswind; T0 "Hold close and the wind gives way…" | Fight the crosswind from close |
| S4 breather | **new** (replaces L16 `level93.ts` → REMIX) | REPLACE | Lateral river (Current) + drifting home (`goal.to`, 2400 ms) | Ride the river to meet the drifting home |
| S5 twist | L17 `level8.ts` THE WHIRLPOOL | KEEP (retune) | Four loops at Torrent tier; gem moved off the ring | Too strong to fight: choose when to leave the loop |
| S6 combine | L15 `level10.ts` | KEEP (retune) | Lift Strong, wind Current, walls | The lift hands you to the wind |
| S7 develop | L18 `level32.ts` | REWORK | Strong lifts with ≤ 200 px carry (no overshoot) | Leave each current at the right height |
| S8 spectacle | L14 `level30.ts` | REWORK | Down-current descent; return-trip gem behind the start | Ride the downdraft, then climb back for the gem |
| S9 mastery | L19 `level67.ts` THE EYE | KEEP (retune) | — | Find the calm between opposing winds |
| S10 boss | L20 `level68.ts` THE MAELSTROM | REWORK | Sections ride (Torrent lift) → fight (Strong downdraft from close) → thread crosswinds to the drifting eye; **saw removed** (W3 debut); wall stubs close the left lane | Ride, fight, then thread the storm |

**W3 CLOCKWORK** (m = 0.30)

| Slot | Source | Verdict | Change | `idea` |
|---|---|---|---|---|
| S1 sandbox | L21 `level12.ts` | KEEP | Gem off route | The gap opens on a rhythm |
| S2 experiment | L22 `level14.ts` | REWORK | Side-wall stubs at the bar's y (systemic fix b) | Fast lane or safe lane |
| S3 develop | L23 `level13.ts` | REWORK | Stubs; gem off route | Slip past the sweeping bar |
| S4 breather | **new** (replaces L26 `level92.ts` → REMIX of L3) | REPLACE | Lateral shuttle: gaps travel with the player | Cross the field as the gaps travel with you |
| S5 twist | L28 `level33.ts` | REWORK | Beam **removed** (moves to W4); first sweep saw on the slider's rhythm; T0 "Saws keep their own beat." | Wait until the gap and the saw agree |
| S6 combine | L27 `level34.ts` | REWORK | Goal off the lift line (self-run fix); lift at Current tier | Ride the lift, time the gate |
| S7 develop | L25 `level16.ts` | REWORK | Opposite-phase bars + stubs (role swap with L24, audit #5) | Two bars, opposite beats |
| S8 spectacle | L24 `level15.ts` | REWORK | Stage between same-phase bars + stubs | Rest between the bars, then go |
| S9 mastery | L29 `level69.ts` THE GEARWORKS | REWORK | The gem-guard **arm becomes a sweep saw** (arms debut in W4) | Flow up through the alternating gears |
| S10 boss | L30 `level70.ts` THE MACHINE | REWORK (light) | Saws 40↔320; goal y ≥ 120 (clears the goalDanger 24 px flag); 1000/1100/1200 ms kept; two sections | Three gears, three rhythms: find where they align |

### 3.4 Waves (step 15)
| Wave | Worlds | Engine prerequisites | Notable content | Est. dev-days |
|---|---|---|---|---|
| **A** | W4–W8 | Boss-phase runtime (E3); phase retrofit of L10/L20/L30 | W4 arm/beam/timer debut order; W6 seals and exits (L52, L53, L56, L60); W7 walls to the floor (L62, L64, L66, L68) + order (L63 → L61 → L62); W8 exits off hazards (L71, L74, L77) and **L80 → ALMOST HOME** (lift 100, mouth (110, 490), saw 120↔320, timer ≈ 12 s from the bot); L72 → REMIX | ~26 |
| **B** | W9–W12 | E4 launch arrow (from P3), E5 orbital well + flip, E6 beat zone, E9 switch-door (stretch, owner-gated; fallback content otherwise) | W9 launch starts and TERMINAL VELOCITY (replaces L90); W10 THE PULSAR kept; W11 THE WARDEN rebuilt; W12 phased beams taught at S3, THE EYE OF THE STORM rebuilt; replacements L90, L91, L97, L101, L102, L103, L106, L116 | ~27–29 |
| **C** | W13–W15 | E7 darkness, E8 attractor budget, E11 identity layers | TOTALITY (replaces L130), ONE LAST PULL (replaces L140), the synthesis **L150** (new id; old L150 archived), L149 diverged; replacements L131, L136, L142, L143 | ~25 |

**Ordering inside a wave (data-informed):**
- Score each world: `priority = 3·G + 2·Q + 2·F + 2·R`.
  - G = mean bot-gate failures per level.
  - Q = max(0, QAF_w ÷ median QAF − 1).
  - F = mean over levels of max(0, (FASR_target − FASR) ÷ FASR_target).
  - R = share of closed-test players who reached the world.
- Highest priority first.
- A world with any level flagged by the B.2 rule in telemetry jumps to the front of the current wave.
- Engine prerequisites always come before their world.

**Wave exit:** every world in the wave passes §15-B. Otherwise the world ships at 9 levels (drop S4 or S8), or the wave's flagged world rolls into the next wave with its old content still gate-green.

### 3.5 Engine and data items
| ID | Item | Design | Effort |
|---|---|---|---|
| E1 | **Zone tiers (D-04)** | `PHYSICS.ZONE_REF` = 1.5e-4 (provisional, confirmed by the P2 fight test: a 100 px hold makes ≥ 40 px/s net progress against Current and ≤ 0 against Torrent). `ZONE = {BREEZE 0.5, CURRENT 1.0, STRONG 1.6, TORRENT 3.5} × ZONE_REF`. `GRAVITY_ZONE_STRENGTH` is renamed `ZONE_LEGACY_STRENGTH` (6.0e-4) and used **only** by not-yet-reworked worlds; deleted at the end of Wave C. The `GravityZoneConfig.strength` type is unchanged (absolute force per step) | 1 d |
| E2 | **`FORCE_SCALE` final** | Apply the M0 owner A/B result (1.0 / 1.5 / 2.08), re-baseline the bot, then re-run par for all levels | 0.5 d |
| E3 | **Boss phases** | D-05 `boss.phases[]` = `{ spawn, startVelocity?, entities: Partial<LevelConfig>, exit: {x,y,radius}, parMs }`. Pure `src/sim/bossPhases.ts`: current phase, checkpoint, exit test. `LevelSim` swaps entity sets at an exit (bodies destroyed and created in one step). GameScene crossfades the arena in 300 ms (reduced motion: fade 150). Death respawns at the phase start in the armed preview. **Boss par** = Σ phase pars, compared with Σ successful-segment sim times. Relief counts per boss | 3 d |
| E4 | Launch preview arrow | Already in P3 A.3; W9 uses `startVelocity` | 0 (P3) |
| E5 | **Orbital well + polarity flip** | `MagnetConfig.orbit? {pivot, periodMs, phaseMs?}` or `to/durationMs` via `kinematics.magnetPose(simMs)`. `flipMs?`, `flipPhaseMs?` via `kinematics.magnetPolarity(simMs)`. The ring reverses 400 ms ahead (telegraph); `forces.ts` reads pose and sign | 1 d |
| E6 | **Beat-toggled zone** | `GravityZoneConfig.pulseMs?, phaseMs?, duty?` via `kinematics.zoneActive(simMs)`. Chevron dim/bright telegraph 300 ms ahead | 0.5 d |
| E7 | **Darkness** | New entity `DarknessMask` + field `darkness {ballLightPx 110, touchLightPx 130, emberAlpha 0.15}`. High-contrast mode raises ember alpha to 0.40. Flares = `collectibles` orbs with `darkness.flareLightPx` 90 that stay lit. Mid/High: one RenderTexture with two erase stamps per frame. Low: a pre-baked radial "hole" sprite following the ball plus a static dark quad (no RT) | 1.25 d |
| E8 | **Attractor budget** | New entity `AttractorBudget` + field `attractorBudget {presses?, holdMs?}`. Enforced in the P1 input latch (a press is accepted only if presses remain; the hold meter drains per armed step), so replays stay deterministic. HUD pips or a meter in HUD row 1, right of the level chip (inside the F.1 exclusion, so no gameplay goes there) | 1 d |
| E9 | **Switch → door** (stretch; owner) | New entity `Switch` + field `switches[] {x, y, r, doors: Rect[], mode: 'open'\|'close'\|'toggle', holdMs?}`. Doors are static bodies toggled by collision filter on step resolution; 250 ms telegraph | 2 d |
| E10 | Obstacle angle render | From P5-A (P05 C6) | 0 |
| E11 | Identity layers | Per-world backdrop motif (CosmicBackground, ≤ 0.035 luminance, WT-2) + one music layer per world (AudioSynth) as specified in GAMEPLAY C.2 | 1.5 d |

## 4. Files/modules affected
| Path | Action | Purpose |
|---|---|---|
| `src/config/levels/*.ts` | Modify | Rework data, D-05 fields, tiers, par, `relief` copy |
| `src/config/levels/<new-id>.ts` | Create (18) | Replacement layouts named by their D-05 id |
| `src/config/levels/remix/*.ts` | Create (move 12) | `role: 'remix'`, `variants.source = <original id>`: L16, L26, L72, L91, L97, L102, L103, L106, L116, L131, L136, L142 |
| `src/config/levels/archive/*.ts` | Create (move 6) | L90, L101, L130, L140, L143, old L150 (not shipped; future Expert) |
| `src/config/worlds.ts` | Modify | Id lists (P2) + `rule`, `tone`; renames gated by owner (§G) |
| `src/config/worldThemes.ts` | Modify | Subtitles ("Catch the falling star", …), `motif` key; colours from P05 `WORLD_TOKENS` |
| `src/config/physics.config.ts` | Modify | `ZONE_REF`, `ZONE` tiers, `ZONE_LEGACY_STRENGTH`, final `FORCE_SCALE`, telegraph and darkness/budget constants |
| `src/types/index.ts` | Modify | `MagnetConfig.orbit/flipMs/flipPhaseMs`; `GravityZoneConfig.pulseMs/phaseMs/duty`; `LevelConfig.darkness`, `attractorBudget`, `switches` (stretch) |
| `src/sim/kinematics.ts` + test | Modify | `magnetPose`, `magnetPolarity`, `zoneActive` |
| `src/sim/forces.ts` + test | Modify | Pose- and sign-aware wells; duty-gated zones (formula unchanged) |
| `src/sim/input.ts` + test | Modify | Budget enforcement in the latch |
| `src/sim/bossPhases.ts` + test | Create | Phase state machine, checkpoint, phase par |
| `src/sim/LevelSim.ts` | Modify | Phases, budget, switches (stretch), darkness flags for the bot (the bot ignores darkness; it's perception only) |
| `src/sim/validate/rules/*.ts` + fixtures | Create/Modify | G7–G21 on P2's framework (one failing fixture each) |
| `scripts/levelsim/` | Modify | Ablation for new variants; quota (G16); par write-back; route export; hold-point histogram |
| `src/entities/Magnet.ts`, `GravityZone.ts` | Modify | Orbit/flip/beat rendering + telegraphs |
| `src/entities/DarknessMask.ts`, `AttractorBudget.ts` | Create | E7, E8 |
| `src/entities/Switch.ts` | Create (stretch) | E9 |
| `src/scenes/GameScene.ts` | Modify | Spawn new entities; boss arena swap; phase checkpoint respawn |
| `src/entities/CosmicBackground.ts`, `src/utils/AudioSynth.ts` | Modify | E11 motifs and music layers |
| `src/utils/ProgressStore.ts`, `src/platform/migrations.ts` | Modify | Legacy credit for replaced ids; hash-change handling (§9) |
| `src/scenes/WorldMapScene.ts`, `LevelSelectScene.ts` | Modify | "NEW" badge on replaced levels; one-time "rebuilt world" toast |
| `src/config/routes/*.json` | Regenerate | After every gated edit |
| `docs/design/worlds/W01-foundations.md` … `W15-homecoming.md` | Create (per wave) | World sheets: slot table, cards, human-check notes |

## 5. Data-model changes
- **D-05 fields filled for every level:** `id`, `idea`, `role`, `teaches`, `uses`, `tags` (`hazard-idea`, `twist-develop`, `spectacle`, `descent`, `lateral`, `return-trip`, `moving-goal`), `relief {notice, rule?}`, `boss.phases[]` (bosses after E3), `variants.source` (remix).
- **New optional config fields** (see §4 types). Existing levels stay valid: every field is optional and defaults to today's behaviour.
- **World:** `{ id, slug, name, levels: id[], rule: string, tone: string }`. The `slug` is frozen at P2 (`w09-gauntlet-…` ids stay even if the display name becomes FREEFALL).
- **Constants:** E1/E2/E5–E8 values in `physics.config.ts` (CLAUDE.md: all constants there).
- **Progress:** legacy-credit fields (§9). Nothing else.

## 6. UI changes
- **World title cards** use the new subtitles and the P05 accent. The back half shows a "new rule" line under the subtitle for the first entry ("You see only what your gravity touches.").
- **Boss phase transition:** a 300 ms arena crossfade + a "PHASE 2/3" caption chip (≤ 800 ms, not blocking). Checkpoint respawns skip the transition.
- **Variant visuals:**
  - DarknessMask over play, under the HUD.
  - AttractorBudget pips or meter.
  - Well ring reversal (flip).
  - Zone chevron brightness (beat).
  - Switch pad and door hatch (stretch).
- **Renamed titles** in the HUD chip, title card and LevelSelect, subject to §G.
- **"NEW" badge** on replaced levels, plus a one-time "CURRENTS was rebuilt. Your stars are kept." toast per world.
- **ResultPanel copy** for L80 (ALMOST HOME) and L150 (HOME) per GAMEPLAY A.6.

## 7. Gameplay changes
- The whole campaign is re-slotted to the template, with the sawtooth targets in GAMEPLAY B.2.
- **Zones** become fightable by default; Torrent is deliberate (D-04).
- **Teaching order** follows GAMEPLAY B.3:
  - Static spark in W1 S5.
  - Saw in W3 S5.
  - Arm and beam in W4 S2/S3; timer in W4 S5.
  - Custom well in L47.
  - Phased beams in W12 S3.
- **Par** comes from the formula on the gem route (3★ = gem + par in one run).
- **Gems** are off-route or risky.
- **Precision** follows the B.6 bands.
- **Bosses** have 2 phases (W1–8) or 3 (W9–15) with checkpoints and unique archetypes.
- **The back-half rules** are launch, orbit/flip, switch-doors (stretch), beat, darkness, budget and freed-star orbs.
- **The finale** is a synthesis ending in one close pull home.
- **L80 becomes ALMOST HOME**, the story's turn.

## 8. Test strategy
| Layer | What | Where |
|---|---|---|
| Unit (TDD) | `magnetPose`/`magnetPolarity`/`zoneActive` (period, phase, telegraph window edges); budget latch (press N+1 rejected; hold drain per step; replay identical); `bossPhases` (exit → next phase; death → checkpoint; par sum); darkness light radius selection | `src/sim/*.test.ts` |
| Determinism | Multi-rate harness (P1) re-run with every variant fixture: bit-identical after N steps at 30/60/90/120/144 Hz | `src/sim/frameHarness` |
| Validators | One failing and one passing fixture per gate G7–G21 | `src/sim/validate/rules/*.test.ts` |
| Bot | CI fast gates (G1–G3, statics) on every PR; nightly A4–A6 + ablation; a wave-exit report with 0 failures | `scripts/levelsim`, CI workflow |
| Route replay | Every route wins in Node within ±1 step (shared with P3 V9) | `routes.replay.test.ts` |
| Readability | Playwright renders each level at t=0 in normal, greyscale and deutan simulation (artifacts for human review); a luminance probe confirms WT-2 | `scripts/smoke/level_renders.py` |
| Duplicates | Full pairwise matrix in the nightly report; CI fails on G7 | Report |
| Human | Designer device pass per level (step 5); 5–8 watched testers per world for bosses/signatures; the closed-test telemetry review (step 7) | World sheets, STATUS |
| Regression | Existing `levels.test.ts` structural checks stay; `chunks.test.ts` unaffected | CI |

## 9. Migration strategy
1. **Reworked level (same id).** Stars and gem are **kept** (never revoked). When the level content hash changes, the PB ghost and best time are cleared, because the old path may cross new walls. A one-time per-world toast explains this. Par stars earned under the old par are kept.
2. **Replaced level (new id).** A migration step adds legacy credit: if the replaced id had ≥ 1★, the new id gets `opened = true` and `legacyStars = old stars`, which count toward totals and world gates (D-07) until the player's first real result there. The first real result replaces them only if it's higher. Totals never drop.
3. **REMIX and ARCHIVE files** keep their ids. Old progress keys stay resolvable for P6's Remix mode and future Expert content.
4. **Reordering** within or across worlds needs no migration (explicit id lists, D-05).
5. **World renames** change display strings only; ids and slugs never change.
6. **Zones:** `ZONE_LEGACY_STRENGTH` keeps un-reworked worlds byte-identical until their wave, so M1 testers play W4–15 exactly as tuned before.

## 10. Rollback
- Each world ships as an atomic set of commits (levels + world list + routes + report). Rollback = revert that world's commits; the bot gates must still pass on the reverted state.
- **Variants:** a world can't ship without its engine item, and engine items land in separate commits before their world, so reverting a world never strands an engine change, and vice versa.
- **Progress** is forward and backward compatible: ids are stable, legacy credit is additive, and unknown fields are preserved.
- **`FORCE_SCALE`:** one constant. Reverting needs a par re-run (scripted, about 2 h nightly).

## 11. Performance
| Item | Budget |
|---|---|
| Bodies per level or phase | < 20 (G17). Today's max is 12 (L69) |
| Darkness | ≤ 2 extra draw calls; ≤ 1.5 ms GPU on Mid; Low uses sprites only, no RenderTexture |
| Orbital / flip wells, beat zones | 0 bodies; O(1) per step pure functions |
| Switch doors | Static bodies counted in the budget; toggling is a collision-filter flip, never create/destroy |
| Boss phase swap | Teardown and spawn ≤ 8 ms, hidden by the 300 ms crossfade |
| Particles | Unchanged budgets (≤ 50; tier caps from P5) |
| Route JSON | ≤ 6 KB per level, lazily loaded |

## 12. Platform
- **`FORCE_SCALE`:** finalised from the M0 device A/B on the 120 Hz dev phone and a 60 Hz mid-range phone.
- **Darkness:** checked on OLED (black crush), with high-contrast mode and Low tier. Reduced motion doesn't change brightness (D-13).
- **Telegraphs** carry an optional 8 ms haptic tick (flip, door) behind the Haptics setting.
- **Back-gesture edges** (G19) spot-checked on gesture navigation for every boss.
- **HUD exclusion** (G11) verified on a 47 px-inset device (punch-hole) and a no-inset device.

## 13. Documentation changes
- `docs/design/worlds/WNN-*.md`: one per world, created when its wave starts (slot table, cards, notes).
- `docs/design/GAMEPLAY-DESIGN.md`: updated when a threshold, tier or world rule changes.
- `docs/STATUS.md`: per-wave gate results; content flags from telemetry; level count (an outcome, D-27).
- `CHANGELOG.md`: world rebuilds and renames.
- `CLAUDE.md`: architecture only. New entities (`DarknessMask`, `AttractorBudget`, `Switch`), `bossPhases`, zone tiers, the remix/archive folders. The stale "150 levels / 7 mechanics" lines point to STATUS instead.
- **Store copy** ("150 levels") is generated from the facts script (P0/P11), never typed.
- The nightly report is archived as a CI artifact, and each wave's exit report is committed to `docs/audit/levelsim/<wave>-<date>.json`.

## 14. Validation criteria
| # | Criterion | Method | Class |
|---|---|---|---|
| V1 | `tsc`, `vitest`, `build`, multi-rate harness green | CI | VERIFIED |
| V2 | 0 CI gate failures (G1–G3, G7–G9, G11, G14–G18, G20–G21) for the shipped worlds | CI levelsim | VERIFIED |
| V3 | 0 nightly gate failures (G4–G6, G10, G12, G13) at wave exit; G19 warnings reviewed | Nightly report | VERIFIED |
| V4 | Duplicate score < 0.85 for all non-remix pairs, < 0.70 for bosses | Report matrix | VERIFIED |
| V5 | Every boss: world-lowest random-solve rate and T_best > world median | Report | VERIFIED |
| V6 | Bot-predicted 3★ share (A6 runs under par with gem) in 25–40% | Report | INFERRED (bot ≠ human) |
| V7 | Closed-test 3★ share of clearers in 25–40% after the par refit | Telemetry | INFERRED until data |
| V8 | Per-slot FASR within the B.2 flag thresholds; no level QAF > 2× world median | Telemetry | INFERRED until data |
| V9 | Readability: every level identifiable in the greyscale and deutan renders | Human review of renders | HUMAN DEVICE TEST (render review) |
| V10 | Designer device check per level; 5–8 watched testers per world on bosses and signatures | World sheets | HUMAN DEVICE TEST |
| V11 | `FORCE_SCALE` feel signed off | Owner A/B | HUMAN DEVICE TEST |
| V12 | Darkness on OLED + Low tier; p95 frame ≤ 20 ms on Mid in W13 | Device + watchdog log | HUMAN DEVICE TEST |
| V13 | Migration: totals never drop; replaced levels open; reworked keep stars | Fixture tests | VERIFIED |

## 15. Exact completion definition
**A. P4-α complete** (step 13 → M1 input):
1. W1–W3 match §3.3, and every level has D-05 fields, a card and a route.
2. V1, V2, V3, V4 and V13 hold for W1–3; "0 bot-gate failures in W1–3" (EXECUTION-ORDER).
3. E1 zone tiers live for W2/W3, with the fight test recorded in the report. E2 `FORCE_SCALE` is final (V11).
4. Par is from the formula for W1–3 (G14). No-debut holds (G15). W1–3 relief copy passes G20.
5. V10 designer device pass is done for all 30 levels, and the 5–8 tester sessions for L10, L20 and L30 are logged.
6. STATUS, CHANGELOG and world sheets W01–W03 are updated; code review passed.

**B. A wave's world complete:**
- Its slot table is implemented.
- V1–V5 hold for that world.
- Its engine items are merged with tests.
- V9 and V10 are done.
- Its replaced levels are moved to REMIX or ARCHIVE.
- The migration has run on a fixture save.

**C. P4 complete** (M2 input):
1. All 15 worlds satisfy B.
2. `ZONE_LEGACY_STRENGTH` is deleted.
3. L80 is ALMOST HOME and L150 is the new synthesis finale (dup < 0.70 against L80/L149).
4. The MASTER P4 success metrics are VERIFIED (V2–V5), and V7/V8 are reviewed against at least 14 days of closed-test data.
5. The level count is recorded in STATUS (expected 145–150).

## 16. Task breakdown
| ID | Goal | Files | Tests | Done when |
|---|---|---|---|---|
| **P04-T01** | World sheets + cards W1–3 | C `docs/design/worlds/W01–W03` | Review | 30 cards complete with `idea`, slot, targets |
| **P04-T02** | Gates G7–G21 on P2's framework | C/M `src/sim/validate/rules/*`, `scripts/levelsim` | Fixture per gate | Each gate fails its bad fixture; current W1–3 failures listed |
| **P04-T03** | E1 zone tiers + fight test | M `physics.config.ts`, `scripts/levelsim` (fight test) | Fight-test report; harness | Current ≥ 40 px/s net at 100 px; Torrent ≤ 0; legacy constant isolates W4–15 |
| **P04-T04** | E2 `FORCE_SCALE` final + bot re-baseline | M `physics.config.ts` | Harness; report diff | V11; par re-run done |
| **P04-T05** | Par write-back tool (formula, gem route) | M `scripts/levelsim` (par) | Formula unit test | `parTimeMs` written for W1–3; G14 green |
| **P04-T06** | W1 rework (§3.3) | M `level1, 4, 2, 91, 3, 5, 29, 28, 65, 66.ts` | Gates; device pass | §15-A items for W1 |
| **P04-T07** | W2 rework + new S4 | M `level7, 11, 9, 8, 10, 32, 30, 67, 68.ts`; C new S4 id; move `level93.ts` → `remix/` | Gates; device pass | §15-A items for W2 |
| **P04-T08** | W3 rework + new S4 | M `level12, 14, 13, 33, 34, 16, 15, 69, 70.ts`; C new S4 id; move `level92.ts` → `remix/` | Gates; device pass | §15-A items for W3 |
| **P04-T09** | Progress migration: legacy credit + hash-change handling | M `ProgressStore.ts`, `platform/migrations.ts` | V13 fixtures | Totals never drop on a W2/W3 fixture save |
| **P04-T10** | P4-α human sign-off + M1 handoff | World sheets, STATUS | V10 sessions | §15-A complete |
| **P04-T11** | E3 boss-phase runtime + retrofit of L10/L20/L30 | C `src/sim/bossPhases.ts`; M `LevelSim.ts`, `GameScene.ts`, 3 boss files | `bossPhases.test.ts`; harness | Checkpoint respawn ≤ 600 ms; phase par sums |
| **P04-T12** | Wave A: W4–W5 | Level files; W04–W05 sheets | Gates; device | §15-B for W4, W5 |
| **P04-T13** | Wave A: W6–W7 | Level files; W06–W07 sheets | Gates; device | §15-B for W6, W7 |
| **P04-T14** | Wave A: W8 incl. L80 → ALMOST HOME; L72 → REMIX | Level files; W08 sheet; `worlds.ts` | Gates; device | §15-B for W8 |
| **P04-T15** | E5 orbital well + flip | M `types`, `kinematics.ts`, `forces.ts`, `Magnet.ts` | Unit + harness | Telegraph 400 ms; deterministic |
| **P04-T16** | E6 beat-toggled zone | M `types`, `kinematics.ts`, `forces.ts`, `GravityZone.ts` | Unit + harness | Telegraph 300 ms |
| **P04-T17** | 👤 E9 switch-door decision → build (2 d) **or** fallback content plan | C `Switch.ts` (if yes) | Unit + harness | Owner decision recorded in DECISIONS |
| **P04-T18** | Wave B: W9–W10 (TERMINAL VELOCITY, THE PULSAR) | Level files; W09–W10 sheets; replacements | Gates; device | §15-B for W9, W10 |
| **P04-T19** | Wave B: W11–W12 (THE WARDEN, THE EYE OF THE STORM) | Level files; W11–W12 sheets; replacements | Gates; device | §15-B for W11, W12 |
| **P04-T20** | E7 darkness + E8 attractor budget | C `DarknessMask.ts`, `AttractorBudget.ts`; M `types`, `input.ts`, `LevelSim.ts` | Unit + harness; V12 | Low tier without RenderTexture; budget replay-identical |
| **P04-T21** | Wave C: W13–W14 (TOTALITY, ONE LAST PULL) | Level files; W13–W14 sheets; replacements | Gates; device | §15-B for W13, W14 |
| **P04-T22** | Wave C: W15 + finale L150 (synthesis, 3 phases, one-pull ending) | Level files; W15 sheet; old L150 → `archive/` | Gates (dup < 0.70 vs L80/L149); device; 5–8 testers | §15-B for W15 |
| **P04-T23** | E11 identity layers (motifs + music layers) | M `CosmicBackground.ts`, `AudioSynth.ts`, `worldThemes.ts` | Luminance probe (WT-2); boot smoke | All 15 worlds have a motif and layer |
| **P04-T24** | 👤 Renames (worlds W9/W13/W14; titles L8, L89, L99, L119) after the D-19 scope decision | M `worlds.ts`, level titles | G20 | Owner decision recorded; titles unique |
| **P04-T25** | Campaign-wide close-out: delete the legacy zone constant, 3★ refit with telemetry, count in STATUS | M `physics.config.ts`, par tool run, STATUS | V2–V8 | §15-C complete |

**Effort:** P4-α ≈ 17–20 dev-days. Waves A/B/C ≈ 26 / 27–29 / 25. Total ≈ 95–100 dev-days. Per-level estimates: rework 0.3–0.5 d, replacement 0.75 d, boss 1.5–2 d.
