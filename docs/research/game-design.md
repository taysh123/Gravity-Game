# Gravity Flow: Game-Design Research Decision Log

Written 2026-10-07. Covers level design, difficulty, fail/retry, bosses, campaign, bot QA, endless and daily design.
Each finding has a label: **[DOC]** is a first-party developer statement (talk, postmortem, official docs). **[ACAD]** is a paper. **[IND]** is third-party journalism or analysis. **[OPINION]** is my own recommendation. **[REPO]** is something I checked in the repo myself.

---

## 0. Read first: two root causes in the code (REPO-verified)

1. **Zones are stronger than the attractor at every distance.** [REPO] The attractor applies `2.6/d²` with d clamped to at least 75 px. That gives 4.6e-4 at 75 px, 1.16e-4 at 150 px and 2.7e-5 at 310 px. `GRAVITY_ZONE_STRENGTH` is a flat **6.0e-4**, and 47 zones use it at full strength. A standard zone beats the player's *maximum* pull by 1.3×, beats it about 5× at 150 px, and about 22× at the edge of reach. That is the mechanical cause of "zones out-muscle the attractor" and of self-solving lift levels. Magnets are fine: their peak is 2.2/95² ≈ 2.4e-4, about half the attractor's peak.
   **Rule:** reference zone strength should be about the attractor's force at 120–140 px (≈1.3–1.8e-4, roughly 0.25–0.3× today's value). The player can then fight a current by holding close, and must ride it when holding far. A bot "fight test" checks this: holding 100 px against the zone must make net progress.
2. **Physics speed depends on the display's refresh rate.** [REPO] `main.ts` sets no `fps.limit`. Phaser's Matter world uses its default `getDelta = update60Hz`, a fixed 16.67 ms per `Engine.update`, and calls it **once per animation frame**. On a 90/120 Hz device, physics runs 1.5–2× faster in real time. Meanwhile `parTimeMs`, `timeLimitMs`, moving platforms and moving hazards (`scene.tweens`) all run on the wall clock. So par and timers get easier on fast screens, hazard timing drifts out of sync with the ball, and Weekly/Run leaderboards are unfair across devices.
   **Rule:** switch to a fixed-step accumulator (`autoUpdate:false`, then step 1000/60 N times per frame based on real elapsed time). Drive moving platforms and hazards from the **sim step index**, not tweens. Measure all scored times in sim steps. Until this is fixed, par cannot be calibrated, whether by bot or by human.

---

## 1. Level design for physics / indirect-control puzzles

**Sources**
- Hayashida on kishōtenketsu. Game Developer, 2012-04-13, https://www.gamedeveloper.com/design/the-secret-to-i-mario-i-level-design [DOC]
- Mark Brown (GMTK) on Super Mario 3D World's 4 steps. 2015-03-16, https://www.mcvuk.com/development/video-nintendos-level-design-secrets-in-four-steps [IND]
- Ken Wong, Monument Valley, GDC 2015. https://gamedeveloper.com/design/designing-the-surprise-mobile-game-hit-i-monument-valley-i- [DOC]
- Portal postmortem, GDC 2008. https://www.gamedeveloper.com/pc/best-of-gdc-the-secrets-of-i-portal-i-s-huge-success [DOC]
- Jeppe Carlsen (Limbo), GDC Europe, 2010-08-16. https://www.gamedeveloper.com/game-platforms/gdc-europe-i-limbo-i-s-carlsen-on-making-players-your-worst-enemy-and-your-best-friend [DOC]
- Arvi Teikari (Baba Is You): MCV, 2019-08-08, https://mcvuk.com/when-we-made-baba-is-you/ and the Road to the IGF interview, https://www.gamedeveloper.com/business/road-to-the-igf-hempuli-oy-s-i-baba-is-you-i- [DOC]
- Juul, "Fear of Failing?", 2009. https://jesperjuul.net/text/fearoffailing/ [ACAD]
- Smith, Butler & Popović, "Quantifying over Play", FDG 2013. https://grail.cs.washington.edu/wp-content/uploads/2015/08/smith2013qop.pdf [ACAD]

**Key findings**
- Nintendo's per-level arc: learn the mechanic, a more complicated scenario, "something crazy happens that makes you think about it in a way you weren't expecting", then demonstrate mastery. Brown adds that each stage teaches a mechanic, develops it, twists it and then "throws it away" in about 5 minutes. [DOC/IND]
- Ken Wong: "We only added a level if we had something new to say." [DOC]
- Carlsen: "the correct solution is fairly easy to execute". If players fail to execute the right idea a few times, they stop trying it. Wrong ideas should fail obviously. Design the puzzle as if the player were your enemy, then add clues as if they were your friend. [DOC]
- Portal simplified its visuals so mechanics read clearly. A shimmery force field confused testers and became glass. "Sit down and watch people play." [DOC]
- Teikari builds a level backwards from an interesting interaction. He then hunts for unintended solutions and blocks them, or keeps one only if it "still showcases the interesting bits". [DOC]
- Juul's experiment (n=85): players who **never failed rated the game lower** than players who failed some and then won. Players prefer to feel responsible for their failure. [ACAD] Self-solving levels are therefore actively harmful, not neutral.
- Refraction research treats "solvable, and admits no undesirable solutions" as a constraint the generator must enforce. Banning shortcuts is a first-class design requirement. [ACAD]

**Implications for Gravity Flow.** The audit failures (self-solve, one-nudge wins, wall-hug bypass, hazards that are only decoration) are all "undesirable solutions". They need checking by machine, not by eye. On analog touch input, Carlsen's execution rule matters double: the idea should be the hard part, not the finger precision.

**Recommended rules** [OPINION]
- **Each level gets one written "idea sentence"** (a new `idea` field in LevelConfig, e.g. "drop out of the lift early to reach the side current"). The bot's ablation test (§6) must show the idea is **required**: remove that mechanic and the level either can't be solved or takes ≥1.5× longer.
- **World template (10 levels):**

  | Levels | Role |
  |---|---|
  | L1 | Sandbox teach. No hazards, no timer, cannot fail. The mechanic is shown alone, and the goal is reachable *only* through it. |
  | L2–3 | Experiment, then develop. |
  | L4 | Breather or expressive level with several routes. |
  | L5 | Twist: a parameter or context change. |
  | L6 | Combine with one earlier mechanic. |
  | L7 | Develop the twist. |
  | L8 | Breather or spectacle. |
  | L9 | Mastery: hardest non-boss level. |
  | L10 | Boss (§4). |

- **No element debuts in a boss or a mastery level.** Every hazard type, and every new parameter of a mechanic, first appears in a low-risk level at least 3 levels earlier.
- **Anti-cheese geometry.** Interior routes need hazards or "bumper" segments on the walls. No goal within 2 ball diameters of a wall unless the wall is the idea. The wall-hug bot must fail every level whose idea is hazard routing.
- **Route-shape quota.** At most 4 of 10 levels per world share a dominant direction (today 72 of the first 80 climb bottom-to-top). Every world needs at least one each of: descent, lateral, return trip (gem behind the start), and moving goal.
- **Precision windows.** Gaps of at least 2 ball diameters (32 px) and timing windows of at least 300 ms in W1–4. In W12–15, at least 1.5 diameters and 150 ms. Check these by "noisy-bot success" (§6), not by guesswork.
- **Red herrings only from L5 onward,** and they must be quick to test (fail within about 3 s). Before that, every object on screen should be part of the solution, as in Portal and Limbo.

**Risks.** Over-constraining removes expressive play. Keep one or two multi-route "toy" levels per world (Teikari tolerates alternatives when they teach the same lesson).

---

## 2. Difficulty curves, measurement, stars and fail relief

**Sources**
- King at GDC 2024 (Wedekind & Guardiola). mobilegamer.biz, 2024-03-27, https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/ [DOC]
- Gudmundsson et al. (King), CIG 2018. https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf [ACAD]
- Roohi et al. (Rovio/Aalto), CHI PLAY 2020. https://arxiv.org/abs/2008.12937 [ACAD]
- Hunicke, "The Case for DDA", ACE 2005. https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf [ACAD]
- Chen's flOw thesis, 2006. https://en.wikipedia.org/wiki/Flow_(video_game) [ACAD/IND]
- Celeste Assist Mode. Vice, 2018-02-07, https://www.vice.com/en/article/celeste-difficulty-assist-mode [DOC]
- NSMB Wii Super Guide (Iwata Asks, 2009). https://www.mariowiki.com/Super_Guide [DOC]
- Candy Crush sawtooth analysis. https://riptidelab.com/candy-crush-saga-review/ [IND/OPINION]

**Key findings**
- King defines difficulty as **success rate = successes ÷ attempts**. It tracks *time to pass* and *time to abandon* separately, because difficulty and fun are different measures. "The longer the level is, the less likely it is to be fun", and hard levels should be short. King repeatedly finds and fixes its 100 least-fun levels. [DOC]
- Rovio data from 168 levels: the overall link between pass rate and churn is weak (Spearman −0.14). But the link with *churn before completing the level* is strong (−0.59). Less persistent players drop out early, so later levels can be harder without extra churn. [ACAD]
- Sawtooth pacing: a spike, then a run of easy levels, so "fun is always one level away". [IND]
- Flow channel: challenge should track skill. Chen's flOw built difficulty adjustment into the game itself, with the player choosing to dive deeper or retreat. That is player-chosen difficulty, not hidden adjustment. Hunicke's Hamlet adjusts in the background. For puzzles, opt-in relief fits better than invisible tuning. [ACAD]
- Fail relief precedents: Super Guide appears after **8** failures. It was first set at 3, then raised. The player can watch a CPU clear the level and then retry or move on. [DOC] Celeste lets players change speed, stamina and invincibility at any time, with a non-judgmental warning ("Cheat Mode" was renamed "Assist Mode"). [DOC]

**Implication.** The campaign is flat at about 2/10 and 3★ is nearly free. You need (a) a target curve, (b) measured difficulty per level, (c) relief that doesn't break strict unlock.

**Recommended rules** [OPINION]
- **Target per world** (median attempts to clear, by slot L1–L10): 1, 1–2, 2, 1–2, 3, 2–3, 4, 2, 5–6, 6–10 (boss). Each world's baseline rises about 10%. Each world's L1 drops back below the previous boss (the sawtooth).
- **Telemetry per level:** first-try clear %, attempts per clear, time to pass, time to abandon, session-ended-on-level %, and the share of players earning each star. Flag a level when its abandon rate is more than 2× its neighbors'.
- **Stars:** ★1 cleared by ≥95% of players who start it, eventually. ★2 (gem) worth a 2–4 s detour or a real risk. ★3 (par) earned by **25–40% of players who clear the level**.
- **Par formula** (initial; refit later from human data): `par = ceil_to_0.5s( max(1.30 × T_noisyExpert_median, T_best + 1.5 s) )`, where T_best is the beam-search best time and T_noisyExpert is that route replayed with human motor noise (§6). Once live data arrives, refit the multiplier per world so the 3★ rate lands in 25–40%.
- **Fail relief ladder.** No shame, and never sold.

  | Trigger | Relief |
  |---|---|
  | 3 consecutive fails | Tier-1 hint: what to *notice*, never the route |
  | 6 fails | Optional "show me": the bot's ghost route plays once (Super Guide model) |
  | 10 fails, or 4 minutes on the level | "Skip for now": opens the next level, and this level shows a hollow badge |

- **Loosen strict sequential unlock.** Keep 2 levels open ahead of the furthest cleared one. Open the next world at 8 of 10 levels cleared, or at N stars (the Cut the Rope / Baba-style open frontier).

**Risks.** Skips can hollow out learning, which is why skips are limited to 1 per world when the twist level matters. Hidden DDA in a puzzle game feels patronizing and can be gamed, so make relief opt-in and visible.

---

## 3. Fail/retry UX

**Sources**
- McMillen. Game Developer, 2010-04-21, https://www.gamedeveloper.com/game-platforms/-i-super-meat-boy-i-s-mcmillen-explains-why-so-hard- [DOC]
- Super Meat Boy postmortem, 2011-04-14. https://www.gamedeveloper.com/audio/postmortem-team-meat-s-i-super-meat-boy-i- [DOC]
- Limbo (Carlsen, above) [DOC]
- Game Accessibility Guidelines. https://gameaccessibilityguidelines.com/full-list/ (accessed 2026-10-07) [DOC]
- Clark et al., Neuron, 2009-02-12. https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737/ [ACAD]
- Juul 2009 (above) [ACAD]

**Key findings**
- McMillen: "The player never waits to get back into the game." His recipe: "Remove lives, reduce respawn time, keep the levels short and keep the goal always in sight." The end-of-level replay of all deaths "shows a timeline of how he learned and got better." [DOC]
- Limbo: "you don't ever really get penalized for dying." Checkpoints cap lost progress at about 20 s. [DOC]
- Game Accessibility Guidelines: let players bypass elements outside the core mechanic, and include practice without failure. [DOC]
- Near-misses raise the desire to play again, but only when the player had personal control. [ACAD] Use this to give honest skill feedback, never to fake near-misses (an ethical line).
- Players have to feel responsible for failure (Juul). Showing the cause of death serves this. [ACAD]

**Recommended rules** [OPINION]
- **Death to control in ≤ 600 ms**: a 150 ms freeze-frame that highlights the hazard that killed you, a 250 ms puff, then respawn. **Restart is never more than one tap away.**
- **Title cards and boss intros play once per session per level.** Retries skip straight to play. Camera intro zoom also runs only on first entry.
- **Win screen never auto-advances.** Show NEXT (primary) and RETRY (secondary). When a star was missed, show the gap ("Par 9.5 s · you 11.2 s · +1.7"). If 3★ was earned, NEXT may pulse.
- **Ghost of the last attempt:** a faint trail of the previous run, recorded at 10 Hz. On a win, an optional SMB-style overlay of every attempt (cap 30). This is cheap and teaches the route.
- **Timeout shows the progress made:** "You were 40 px away."

**Risks.** Instant retry can feed tilt loops. Pair it with the relief ladder in §2.

---

## 4. Boss design in puzzle games

**Sources**
- Hayashida (above), with the twist leading into a mastery beat [DOC]
- Ramachandran, "Boss Design: Trial & Punishment". Game Developer, 2008-06-17, https://www.gamedeveloper.com/design/opinion-boss-design---trial-punishment [IND/OPINION]
- Mario Galaxy Prankster Comets. https://www.mariowiki.com/Prankster_Comet [DOC]

**Key findings**
- A boss is the world's final exam. It uses the tools the player gathered, rewards lateral thinking over paint-by-numbers cues, and should not carry a punishing retry cost. [IND]
- Public sources on *puzzle* bosses are thin, so the rest is my analysis of well-known games. [OPINION] Portal's GLaDOS finale reuses an earlier technique (redirecting rockets) under escalating pressure. Zelda bosses test the dungeon's item. Celeste chapter climaxes are chases built from skills already learned. The pattern: **same verb, higher stakes, new composition, theatrical framing.**

**Recommended rules** [OPINION]
- **The boss tests only that world's mechanic plus the L5 twist.** No debuts (the audit found hazards first appearing in bosses).
- **2–3 phases.** Each demands a *different use* of the mechanic (e.g. ride the current, then fight it, then thread between currents). Put a **checkpoint between phases**; King's "harder means shorter" applies per phase. Each phase should take ≤ 20 s at par.
- **Earned spectacle:** music layer swell, camera pull-back, and the arena visibly changing between phases (geometry shifts or the star dims). Keep it within the <20 bodies / <50 particles budget.
- **Bot gates:** the boss must have the world's lowest random-search solve rate, a T_best above the world median, and no one-nudge win. Its near-duplicate score against every other level must be below 0.7.
- **The finale (W15) is a synthesis, not a remake.** Phases draw on 3–4 worlds' mechanics in new combinations, ending on a callback to Level 1 (one close pull home). The current finale copies the midpoint boss, which breaks this rule.

**Risks.** Multi-phase bosses on a 360×780 screen get crowded. Prefer swapping the arena between phases over cramming everything into one screen.

---

## 5. Campaign structure, avoiding repetition, post-game

**Sources**
- Ken Wong (above) [DOC]
- World of Goo, Road to the IGF. 2007-12-31, https://www.gamedeveloper.com/game-platforms/road-to-the-igf-i-world-of-goo-i-s-suggested-emotional-journey-to-wii [DOC]
- Where's My Water Cranky challenges, 2012. https://www.pocketgamer.com/articles/037305/r/ [IND]
- Prankster Comets (above) [DOC]
- Super Meat Boy A+ unlocks Dark World levels. https://en.wikipedia.org/wiki/Super_Meat_Boy [IND]
- Celeste B/C-sides. https://en.wikipedia.org/wiki/Celeste_(video_game) [IND]

**Key findings**
- World of Goo gave each chapter its own theme and an "emotional journey", with optional OCD goals for mastery. [DOC]
- Remix by constraint is a proven way to reuse layouts:
  - Where's My Water replays existing levels with Cranky ducks, "no ducks" or "Mystery Duck" rules. [IND]
  - Mario Galaxy re-runs galaxies with Speedy (timer), Daredevil (1 HP), Cosmic (race a clone), Fast-Foe (sped-up obstacles) and Purple-coin modifiers. [DOC]
  - Super Meat Boy gates its harder Dark World levels behind par (A+). Celeste unlocks optional B- and C-sides. [IND]

**Implication.** With only 7 mechanics, worlds 9–15 must find novelty by **changing a parameter or adding a constraint on the core verb**, not by adding more primitives. Near-copies should become *labelled* remixes or be cut.

**Recommended rules** [OPINION]
- **Every world gets four things:** one new rule (a parameter twist or an input constraint), one emotional tone word, a palette plus backdrop plus music layer, and one signature set-piece level.
- **Twist candidates that keep the inverse-square formula:**
  - hold-energy budget
  - "anchor" touches that can't be dragged
  - a limited number of presses
  - zones that toggle on a beat
  - magnets that flip polarity
  - portals that rotate their exit
  - gates that close behind you
  - a goal that drifts
  - darkness (the attractor ring lights the way)

  A repel attractor would be a strong inversion twist, but it touches the "never change the formula" rule. The owner decides.
- **Duplicate gate:** rasterize each level (walls, hazards, zones) on a 12×26 grid, mirror-aware, and compare the best-route polylines. Cosine similarity above 0.85 means redesign it, or reframe it as an explicit remix.
- **Post-game, cheap and high-retention:**
  - *Remix* mode: mirrored layout plus one Prankster-style modifier
  - *Time Attack* against the bot's "author ghost" (Trackmania-style)
  - *Boss Rush*
  - a *Mastery* badge for 3★ on a whole world, unlocking a hidden hard level per world (SMB / Celeste model)
- If content time is limited, **150 good levels beat 150 levels padded with copies.** Consider replacing 10–20 near-copies with remixes rather than new primitives.

**Risks.** Remix and post-game modes don't fix the main campaign. Do the duplicate gate first.

---

## 6. Automated level QA and playtesting bots

**Sources**
- King CIG 2018 (above): a CNN beat MCTS on mean absolute error (4.0% vs 5.4%). Difficulty estimates for a new level take "less than a minute" instead of "7 days needed with human playtesting" per 15-level episode, and the agent was used on more than 1,000 new levels. [ACAD]
- Roohi et al. (Rovio), 2020 and 2021. https://arxiv.org/abs/2107.12061 [ACAD]
- Kristensen et al. (Tactile, Lily's Garden), 2023. https://arxiv.org/abs/2306.14626 [ACAD]
- EA SEED, CoG 2020. https://arxiv.org/abs/2103.15819 [ACAD]
- Shaker et al., Cut the Rope, AIIDE 2013. https://ojs.aaai.org/index.php/AIIDE/article/view/12690 [ACAD]
- AIBIRDS 2017. https://arxiv.org/abs/1803.05156 [ACAD]
- Stephenson & Renz, AIIDE 2016. https://users.cecs.anu.edu.au/~jrenz/papers/stephenson-renz-aiide16.pdf [ACAD]
- PHYRE, NeurIPS 2019. https://arxiv.org/abs/1908.05656 [ACAD]
- Isaksen et al., FDG 2015 / IEEE ToG 2018. https://cs.ubc.ca/event/2015/10/exploring-game-space-using-survival-analysis-talk-aaron-isaksen-1 [ACAD]
- Snellman's Snakebird solver, 2018-07-23. https://snellman.net/blog/archive/2018-07-23-optimizing-breadth-first-search [IND]
- matter-js 0.20 release notes: fixed timestep makes it deterministic, but not guaranteed across platforms. https://code.fosterhangdaan.com/foster/liabru-matter-js/raw/branch/master/RELEASE.md [DOC]

**Key findings**
- **An agent's best-case performance predicts humans better than its average.** Rovio's 2021 paper found this, and Tactile found "the ~5% best runs" of the agent was the strongest predictor of completion rate. [ACAD]
- Combining DRL with MCTS works best on the hardest levels. Rovio calibrates bots against a small amount of human data with a "sim2real" population model. [ACAD]
- The Cut the Rope solver works because a "sensible move" generator prunes the search enough for plain DFS. [ACAD]
- AIBIRDS agents struggle because they lack the exact physics. Gravity Flow's bot *has* the exact simulator, which is a far easier problem. [ACAD]
- PHYRE: deterministic 2D puzzles with one action can need up to 10k random attempts. Its AUCCESS metric weights the first 10 attempts at about 50%, a usable "how findable is the solution" score. [ACAD]
- Isaksen models humans by adding **motor-skill noise** to automated play and fits survival curves. [ACAD]

**Recommended architecture** [OPINION]
1. **Shared pure sim (`src/sim/`).** Move the force, portal, gate, hazard, win and death functions out of GameScene into pure functions, and have GameScene call them. The bot is the "second caller" CLAUDE.md requires before extracting. Use the **same Matter 0.20 build** Phaser ships (`node_modules/phaser/src/physics/matter-js/lib`, CommonJS, runs in Node). Moving objects are functions of the step index (this needs the fix in §0.2).
2. **Cheap state snapshots.** Only the ball is dynamic, so state is: ball position, velocity, angle and angular velocity; step index; gem/orb/gate/portal-cooldown flags. That makes beam search cheap. Always re-verify a found solution from a cold start.
3. **Input model.** One macro-action every 250 ms (15 steps): hold at polar (r ∈ {60,100,150,220,300} px, θ ∈ 16 directions) relative to the ball, or release. Human limits: drag ≤ 1,500 px/s and a 200 ms reaction delay. The noisy variant adds σ = 8 px position noise and σ = 40 ms timing noise.
4. **Agents:**

   | Agent | What it does | What it reveals |
   |---|---|---|
   | A0 none | No input for 30 s | Self-solving level |
   | A1 nudge | Every 24-px grid point × hold {0.25, 0.5, 1 s}, about 1.5k rollouts | One-nudge win |
   | A2 pursuit | Holds 150 px ahead along the straight line to the goal | What a naive player can do |
   | A3 wall-hug | Pursuit along the nearest wall | Wall-lane bypass |
   | A4 random | 2,000 random sequences, AUCCESS-style curve | How findable a solution is |
   | A5 beam | Width 64, 24 branches; heuristic = distance to goal around walls (BFS flow field), with a hazard-proximity penalty | T_best and the route |
   | A6 noisy expert | Replays A5's route with noise, 50 runs | How hard it is to execute |

5. **Metrics per level:**
   - flags: self_solve, one_nudge, naive_solve, wall_hug_solve
   - random solve rate
   - T_best and T_noisy (which feed par)
   - noisy success %
   - hazard exposure: minimum clearance along the route, and time spent within 2 radii of a hazard
   - **mechanic ablation:** neutralize each mechanic in turn and re-run A5. If it is still solvable in ≤1.1× T_best, flag it "decorative / bypassable"
   - gem detour cost
   - route diversity: route families clustered from A4 successes
   - near-duplicate score
6. **CI gates** (a level fails if any of these hold):
   - A0 wins (unless flagged sandbox)
   - A1 wins after slot L2
   - A3 wins on a hazard-idea level
   - the world's own mechanic is decorative under ablation
   - the boss is easier than the world's L9
   - noisy success falls outside 40–90%
7. **Cost estimate** (benchmark first): roughly 20–60 µs per step for 10–20 bodies in Node. Per level, about 7M steps (A1 0.5M, A4 1.8M, A5 1–2M, ablation about 3.5M), so 3–7 core-minutes. All 150 levels take about 9–18 core-hours, roughly 1–2.5 h on 8 cores, which fits a nightly job. A designer quick-check (A0–A3 plus beam width 16) runs in under 30 s.
8. **Bots plus humans.** Bots gate the structural problems. Then 5–8 watched human playtesters per world, Portal-style. Then live telemetry (§2), with bot metrics regressed against human pass rate the way Rovio does, using best-5% agent features.

**Risks.**
- Matter determinism isn't guaranteed across platforms, so replay validation needs a tolerance.
- Bots find exploits humans never would, so triage the flags.
- Restoring snapshots can drift slightly from a cold-start run. Hence the re-verification step.

---

## 7. Endless and chunk-based design (Gravity Run)

**Sources**
- Spelunky generator lessons (Derek Yu's system, explained by Darius Kazemi). https://tinysubversions.com/spelunkyGen2/ [IND]
- Ojiro Fumoto, GDC 2016. https://gdcvault.com/play/1023533/Polishing-the-Boots-Designing-Downwell [DOC]
- Bleed 2 endless mode, 2018-01-14. https://bootdiskrevolution.com/2021Blog/?p=2316 [DOC]
- Spelunky scoring critique, 2014-06-23. https://theludite.com/2014/06/23/spelunky-when-scoring-goes-bad/ [OPINION]
- Alto's goals. https://en.wikipedia.org/wiki/Alto%27s_Adventure [IND]
- Isaksen (above) [ACAD]

**Key findings**
- Spelunky guarantees a critical path, then builds rooms from hand-made templates plus random "mutations". Players spot the repeating landmarks, but templates combined with mutation keep it varied. [IND]
- Downwell strings hand-made chunks together along a difficulty progression. [IND]
- Bleed 2 designs chunks to be as asymmetric as possible, so that mirroring doubles the variety. [DOC]
- Alto gives an endless game structure with 180 goals, three active at a time. [IND]
- Isaksen fits score histograms to exponential survival curves. Under constant difficulty, the chance of dying in the next stretch never changes, so a skilled player's run can go on almost indefinitely. Escalation is what bounds session length. [ACAD]
- Scores that reward maximum risk or luck turn a mode into seed-hunting. [OPINION]

**Recommended rules** [OPINION]
- Have **20 chunks × mirror × bot-verified jitter** (±10% hazard speed, ±12 px placement) **× 3 tiers**. That gives about 120 felt variants. Grow to 40+ authored chunks within 3 months of launch.
- Use a **weighted bag with a cooldown**: no chunk repeats within the last 4.
- Use **biome phases** every 6 chunks, each favouring one mechanic, with a palette and music shift. Insert a **rest chunk after every 3 hard ones** (sawtooth).
- After the speed cap, escalate by **composition** (combining 2 mechanics), tighter windows and fewer rest chunks. Don't raise speed further.
- Aim for a median run of 60–180 s.
- **Fairness:** each chunk has a neutral "seam" with an entry/exit velocity envelope. The bot checks all chunk pairs: 20×20×2 = 800 pairs, cheap to run.
- **Score = height**, plus small bonuses for gems and clean seams. Add Alto-style 3-active goals for meta-progression.

---

## 8. Daily and weekly challenges

**Sources**
- "The 24-hour ticket", Game Developer, 2017-10-23. https://www.gamedeveloper.com/design/the-24-hour-ticket-examining-daily-runs- [DOC]
- Trackmania Track of the Day: https://doc.trackmania.com/play/what-is-totd/ and Weekly Shorts guidelines: https://doc.trackmania.com/create/map-review/weekly-shorts-guidelines/ [DOC]
- Josh Wardle on Wordle, Jan 2022. https://www.wionews.com/technology/he-made-wordle-for-his-partner-now-its-an-online-hit-442289 [DOC]
- Duolingo, 2020-11-19. https://blog.duolingo.com/improving-the-streak/ [DOC]

**Key findings**
- The only invariants of a daily run are a **shared seed** and a **daily reset**. [DOC] Attempt models differ:
  - Caveblazers and Spelunky allow one attempt.
  - OlliOlli allowed unlimited practice plus one live attempt.
  - Dead Cells allows unlimited attempts with the best one counting. Its designer argued single attempts reward people who watched someone else play it first.
- Trackmania Weekly Shorts: author time ≤ 20 s, "readable, easy to finish", and one style per slot (Wide, Slow, Puzzle, Fast, LOL). [DOC]
- Wordle asks for about "three minutes a day". Its emoji grid is spoiler-free, and Wardle deliberately left the link off the share text. [DOC]
- Duolingo made it easier to keep a streak (one lesson counts) and got +3.3% D14 retention and +10.5% more learners on a streak. [DOC]

**Recommended rules** [OPINION]
- **Daily:** unlimited attempts. Record first-try clear, best time (in sim steps) and attempt count.
- **Share card,** spoiler-free: `GRAVITY FLOW Daily #212 · ★★☆ · 8.5 s · 3 tries`, plus a 5-cell "route" emoji strip.
- **Streak:** one clear (any stars) keeps it alive. Earn one streak freeze per week completed.
- **Weekly Run:** a seeded climb, unlimited practice, best counts. Validate leaderboard entries by re-simulating the input log within a tolerance (needs §0.2). Optionally add Trackmania-style weekly rotating "styles" for daily modifiers.

**Risks.** One-attempt formats suit mobile badly because calls and notifications interrupt runs. Count a run only once it has actually started.

---

## Top 10 decisions, in priority order

1. Fix the fixed-timestep problem and drive moving objects from sim time (§0.2).
2. Retune zones to ≈0.25–0.3× today's reference strength (§0.1).
3. Build the shared sim plus agents A0–A3 first (about 1–2 days). Run them as CI gates.
4. Add A5 beam and A6 noisy expert, then set par with the formula in §2.
5. Give every level an idea sentence and run mechanic ablation.
6. Apply the world template, the no-debut-in-boss rule and the route-shape quota.
7. Remove win-screen auto-advance, add Retry, and play title cards once per session.
8. Add the fail-relief ladder and open-frontier unlock.
9. Rebuild the finale as a synthesis. Turn near-copies into labelled remixes.
10. Daily: unlimited attempts, spoiler-free share card, easy-to-keep streak.
