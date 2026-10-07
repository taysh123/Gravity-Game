# P02 — Level Engine & Level QA

**Status:** PLANNED, 2026-10-07 (baseline `master @ d3c6aab`). Starts after **M0**. This phase covers EXECUTION-ORDER **steps 8, 9 and 11**. It implements D-05 and D-06 and conforms to D-01–D-04, D-07, D-22, D-26 and D-27.
**Specs:** [`../../architecture/LEVEL-ENGINE.md`](../../architecture/LEVEL-ENGINE.md) · [`../../architecture/LEVEL-QA-SIMULATION.md`](../../architecture/LEVEL-QA-SIMULATION.md)

---

## 1. Summary

| | |
|---|---|
| **Objective** | Turn 150 index-addressed `LevelConfig` objects into a scalable content system: level data model v2 with stable ids (D-05), worlds as explicit id lists, a shared pure `LevelSim` that the game and a Node bot both run (D-06), static validators and bot gates in CI, and a machine-readable `level-quality-report.json`. |
| **Player outcome** | Indirect but decisive. Every level that ships has to prove it is solvable, does not solve itself, cannot be bypassed, and is fair and distinct. Progress survives reordering and cutting. The data that P3 ("Show me" ghost) and P4 (par, rework) depend on comes into existence. |
| **Business outcome** | Content can scale to hundreds of levels, plus Daily and Run chunks, without quality collapsing. Human playtest time goes only to flagged levels. P4's rework becomes measurable ("0 bot-gate failures in W1–3", step 13). |

## 2. Scope

| Item | Detail |
|---|---|
| **Systems** | `src/types` + new `src/content/` (schema, registry, worlds, campaign, 163 level files) · `ProgressStore`/`GhostStore` (id-keyed v10/v2) · new `src/sim/LevelSim` + `src/sim/validate/` · GameScene as a renderer · `scripts/levelsim/` CLI + agents · `scripts/content/` codemods · CI (`ci.yml` + nightly) |
| **Dependencies** | **M0**, which includes:<br>• P0's durable store layer: Preferences mirror, shape validation and backup keys (D-12)<br>• P1 steps 6–7: `FixedStepper`, `forces.ts`, kinematics as pure `f(simMs)`, per-step checks with win precedence, input latch, `FORCE_SCALE`, the multi-rate harness and replay determinism<br>[ASSUMPTION] The P1 module names are those given in D-01. If P1 lands other names, P2 adapts. |
| **Difficulty** | Engineering **H** · design M (metadata review of 150 levels) · QA M |
| **Risk** | Medium:<br>• behaviour parity during the GameScene extraction<br>• the save migration<br>• bot cost and false positives<br>Mitigated by round-trip and parity hash tests, keeping v9 untouched, the ratchet baseline, and tiered agents. |
| **Upside** | The highest long-term leverage in the plan (MASTER-ROADMAP P2). It is the quality engine for P4, the Daily pipeline (P6, D-21) and Run chunks (P8, D-22). |
| **Success metrics** | • 100% of levels (150 + 8 daily + 13 vault) have id/idea/role/teaches/uses/tags<br>• The report covers 150/150<br>• The fast tier (static + A0–A3) runs in CI in **< 3 min**<br>• Nightly A4–A6 + ablation complete for 150/150<br>• All acceptance defects reproduced (LEVEL-QA §11): L11/L12, L40, L60, L74, L80, W3 L22–25, W7 L62/L64<br>• The designer quick-check finishes in < 30 s per level<br>• 0 lost stars in migration tests |
| **Must NOT do yet** | • Mass level rewrites or fixes of baselined defects (P4)<br>• Writing formula par into content (step 13, after FORCE_SCALE is final)<br>• The D-04 zone retune (P4; G-17 only *measures*)<br>• New mechanics (`planned` registry refs stay schema-only)<br>• The relief ladder UI, hint rewrite or open frontier (P3)<br>• The multi-phase boss runtime (P4)<br>• EndlessScene sim migration (P8)<br>• Remote packs (P6/P10)<br>• Analytics taxonomy v2 (P6)<br>• Promoting nightly rules to blocking without a DECISIONS edit |

## 3. Architecture plan

1. **Content layer (`src/content/`).**
   - `LevelConfigV2` (LEVEL-ENGINE §2) wraps the v1 entity shapes unchanged and adds intent, objectives, the armed timing block, relief, tutorial, boss, rewards, variants, QA intent and provenance.
   - `WORLDS_V2` holds the explicit `levels: LevelId[]`.
   - `campaign.ts` derives order, index and next-level from the worlds.
   - `v1compat.ts` supplies `toV1()` and a derived `LEVELS` shim, so EndlessScene and Daily code stay untouched until P4/P8.
2. **Identity and persistence.**
   - A frozen `v9IndexToId` table migrates `progress:v9` to `progress:v10` (per-star flags, which fixes the union bug in `ProgressStore.ts:51-65`) and `ghost:v1` to `ghost:v2`.
   - Writes go through P0's durable layer. v9/v1 keys are never deleted in P2.
3. **Shared sim (`src/sim/LevelSim.ts`).**
   - LevelSim implements P1's `SimWorldPort` and steps through P1's `runFixedStep()`, so the D-01 order keeps one source. It reuses P1's `bodyDefs`, `rules`, `input`/`InputLog`, `stateHash` and `kinematics` (`TECHNICAL-ARCHITECTURE.md` §4.1).
   - LevelSim owns its own Matter `Engine`. The browser injects `Phaser.Physics.Matter.Matter`; Node injects `phaser/src/physics/matter-js/CustomMain.js`, the same module.
   - Bodies are created in the canonical order (walls → ball → obstacles → gates → platforms).
   - Each step follows the D-01 order, with D-03 win precedence and D-02 arm.
   - Events are queued, not fired.
   - GameScene becomes a renderer, input latch and HUD around it. Entities draw only.
4. **Validation (`src/sim/validate/`).**
   - Rules G-01…G-22 and M-01…M-12, each in its own module with positive and negative fixtures.
   - `qa/baseline.json` is a ratchet: errors block unless baselined, stale baseline entries fail CI, and warn counts may not rise.
5. **Bot (`scripts/levelsim/`).** An esbuild-bundled CLI with a worker pool, agents A0–A6, scripted and ablation runs, a cache keyed by content/sim/constants/agent hashes, and the report writers (JSON, MD, SVG, JUnit).
6. **CI.**
   - Fast tier: blocking, inside `ci.yml`.
   - Nightly tier: report-only, 4 shards.
   - Weekly tier: frame-rate and determinism matrix.
   - Designer quick-check: local.

## 4. Files and modules affected

### Create

| Path | Purpose |
|---|---|
| `src/content/schema.ts` | v2 types, `levelId()`/`worldId()` guards |
| `src/content/mechanics.ts` | Mechanic registry + pure detectors |
| `src/content/patterns.ts` | Typed geometry/hazard helpers (LEVEL-ENGINE §3.3) |
| `src/content/worlds.ts` | `WORLDS_V2` with explicit id lists |
| `src/content/campaign.ts` | `campaignOrder`, `levelById`, `worldOfLevel`, `campaignIndexOf`, `nextInOrder` |
| `src/content/v1compat.ts` | `toV1()`, derived `LEVELS`/`WORLDS` shims (removed in P4) |
| `src/content/migrations/v9IndexToId.ts` | **Frozen** 150-entry map, with the source sha in its header |
| `src/content/levels/<worldId>/<levelId>.ts` ×150, `levels/daily/d-01…08.ts`, `levels/vault/x-*.ts` ×13, `levels/_template.ts` | Level data (moved from `src/config/levels/`) |
| `src/content/levels/index.gen.ts` | Generated import list (`npm run content:index`) |
| `src/content/content.test.ts` | Runs the static rule suite over all packs (replaces `levels.test.ts`) |
| `src/sim/matter.ts`, `LevelSim.ts`, `snapshot.ts` (+ `*.test.ts`) | The shared pure sim (LEVEL-QA §1). LevelSim implements P1's `SimWorldPort` and steps via `runFixedStep()`. |
| `src/sim/validate/{index,context,geometry,sweep,grid,raster,baseline}.ts`, `rules/G-01…G-22.ts`, `rules/metadata.ts` (+ tests) | The validators |
| `src/ui/hudLayout.ts` (+ test) | Pure HUD exclusion rects, shared by the HUD code (GameScene today, `HudScene` after P5-A per D-13) and G-15 |
| `src/content/migrations/progressV10.ts` (+ test) | Pure v9→v10, ghost v1→v2 and tutorial-key transforms, registered as a step of P0's migration ladder |
| `src/config/qa.config.ts` | Rule thresholds, agent parameters, budgets, `difficultyModel@1` |
| `scripts/content/{migrate-v2.mjs, gen-index.mjs, new-level.mjs}` | Codemod, index generator, scaffolder |
| `scripts/levelsim/{cli,runner,cache,rng,matter-node}.ts`, `agents/*.ts`, `report/{json,markdown,svg,scores,par}.ts`, `fixtures/audit-2026-10-07.ts`, `acceptance.test.ts` | The bot |
| `qa/baseline.json`, `qa/solutions/<id>.json` | Ratchet; stored solutions (B-11, "Show me") |
| `.github/workflows/levelsim-nightly.yml`, `levelsim-weekly.yml` | Nightly and weekly tiers |

### Modify

| Path | Change |
|---|---|
| `src/types/index.ts` | Keep the entity configs. Rename the v1 shape to `LevelConfigV1`, with `LevelConfig` kept as an alias for one release. |
| `src/config/levels/index.ts`, `src/config/dailyLevels.ts`, `src/config/worlds.ts` | Become re-export shims over `src/content` |
| `src/config/levels/levels.test.ts` | Deleted after its checks are ported (G-01, G-02, G-05, G-10a, G-21) |
| `src/config/worldThemes.ts` | Keyed by `WorldId`; adds `music`/`backdrop`/`callbackOf` fields (values from P5) |
| `src/utils/world.ts`, `onboarding.ts`, `StatsStore.ts`, `ProgressStore.ts`, `GhostStore.ts`, `SettingsStore.ts` | Id-based APIs |
| `src/services/analyticsEvents.ts` (moved there by P0) | Non-breaking `level_id` param on level events |
| `src/sim/{bodyDefs,rules,input,stepPipeline,HeadlessWorld}.ts` (P1) | Extended for v2 configs (orbs, phases, ablation hooks). `HeadlessWorld` wraps `LevelSim`, or is deleted. |
| `src/platform/migrations.ts`, `src/utils/storeSchemas.ts` (P0) | Next ladder step = id migration (progress v10, ghost v2, tutorial key); v10/v2 shape validators |
| `src/scenes/GameScene.ts` | `create({ levelId })`. Builds `LevelSim`. `fixedStep` delegates to it. Rendering uses `poseAt`/`ball()`. Events flushed after the stepper loop. CoachMark keyed by `tutorial.id`. HUD built from `hudLayout`. |
| `src/entities/{Ball,Obstacle,Gate,MovingPlatform,Hazard,Goal,Portal,GravityZone,Magnet}.ts` | Draw-only: they no longer call `scene.matter.add.*` |
| `src/scenes/{LevelSelectScene,WorldMapScene,MainMenuScene,EndScene}.ts` | Id navigation; "LEVEL n" from `campaignIndexOf` |
| `src/main.ts` | Dev-only `?level=<id>` boot shortcut (stripped in prod by `import.meta.env.DEV`) |
| `.github/workflows/ci.yml` | New `levelsim-fast` job, plus the `content:index` freshness check |
| `package.json` | Scripts `levelsim`, `level:check`, `level:new`, `content:index`, `content:check`; devDependency `esbuild` (pinned to Vite 5's version) |
| `.gitignore` | `qa-out/`, `.levelsim/`, `.levelsim-cache/` |

## 5. Data-model changes

| Change | From → to | Spec |
|---|---|---|
| Level identity | Array index → `LevelId` (`w02-currents-01`), immutable | LEVEL-ENGINE §2.1, M-01 |
| Level shape | `LevelConfig` v1 → `LevelConfigV2` (intent, objectives, `timing{clock:'armed'}`, relief, tutorial, `boss: BossMeta`, rewards, variants, `remixOf`, qa, provenance) | §2.2–2.5 |
| Worlds | `{from,to}` → `WorldMeta{levels: LevelId[], focus, newRule, tone, theme, signature, unlock}` | §2.6 |
| Mechanics | implicit → registry with detectors and ablation kinds | §2.6 |
| Progress | `progress:v9` `Record<number,{stars,bestTimeMs,gem}>` → `progress:v10` `{schema:10, levels: Record<LevelId,{cleared,gem,par,bestTimeMs,bestClock,attempts,assisted}>}` | §6 |
| Ghosts | `ghost:v1` `Record<number,PathPoint[]>` → `ghost:v2` `Record<LevelId,{clock,points}>` | §6 |
| Tutorial | `seenTutorial: boolean` → `tutorialsSeen: Record<string, true>` | §6 |
| New checked-in data | `qa/baseline.json`, `qa/solutions/*.json` | LEVEL-QA §7 |

## 6. UI changes

**No player-visible UI change is intended.**

- Star badges, lock states, "LEVEL n" labels, world-map nodes and titles must render identically before and after migration. This is verified on screenshots of LevelSelect and WorldMap with a seeded v9 save.
- The only intended visible fix is a side effect: the L1 CoachMark can no longer fire on the Daily, because it is keyed by `tutorial.id`, not `currentLevel === 1` (`GameScene.ts:840`).
- Dev-only: the `?level=<id>` boot shortcut. P2 adds no relief-ladder or result-screen UI (that is P3).

## 7. Gameplay changes

**None intended.** For any input log, the game after T08 must produce the **same outcome, `simMs` and final state hash** as the M0 (P1) build, for all 150 levels (parity gate, §8). Content values (geometry, par, limits, zone strength) are not edited in P2. Bot findings are recorded in the baseline and in the report for P4.

## 8. Test strategy

| Layer | Tests | Type |
|---|---|---|
| Pure content | schema guards; registry detectors (each ref on a fixture); `campaignOrder`/`nextInOrder`; patterns pass their target rules | Vitest, TDD |
| Codemod | **Round-trip:** `toV1(v2)` deep-equals the v1 object at the parent commit, for all 163 configs | Vitest (loads the git-show snapshot of v1 configs) |
| Migration | v9→v10 case table (0/1/2/3 stars × gem × bestTime; unknown keys → orphans; corrupt JSON → backup restore per D-12); ghost; tutorial key; idempotence (run twice = same) | Vitest, TDD |
| Validators | Each G/M rule: ≥ 1 passing and ≥ 1 failing synthetic fixture; the baseline ratchet (new error fails, stale entry fails, warn count up fails) | Vitest, TDD |
| LevelSim | Body order; arm semantics (no steps before arm, t = 0 pose); D-03 precedence; event queue purity; snapshot round-trip; hash determinism (×2 in-process + fresh worker) | Vitest, TDD |
| **Parity** | Before T08: record per-level `{outcome, simMs, hash}` for 150 levels × 3 scripted logs (arm-only, A2 pursuit, stored solution) with the M0 build via the P1 harness. After T08: identical. | Python Playwright (`--disable-gpu --use-gl=swiftshader`) + Node |
| Agents | Synthetic arenas: an open goal (A2 wins < 3 s); a sealed goal (A5 fails, B-06 fires); a zone-carried spawn (A0 wins); a wall lane (A3 wins) | Vitest |
| Acceptance | The LEVEL-QA §11 defect table | Vitest (`scripts/levelsim/acceptance.test.ts`) |
| Smoke | Headless boot of all scenes, zero console errors; LevelSelect/WorldMap screenshot diff with a seeded v9 save | Python Playwright |
| CI budget | The fast job asserts its own wall time < 180 s (cold cache, run on the cache-bust PR) | CI |

## 9. Migration strategy

1. **Map first.** Freeze `v9IndexToId.ts` from `LEVELS` at the migration commit (T02), before anything moves.
2. **Two-commit file move.** First a move-only `git mv` commit (blame survives), then a codemod commit with the round-trip proof.
3. **Draft, then review metadata.** The codemod fills role/idea/teaches/uses/tags from the slot template, header words and detectors, and records `provenance.backfilled`. The T06 design pass reviews all 171 configs and clears the drafts. M-12 warns until then.
4. **Read new, keep old.** On first launch: if v10 exists and is valid, use it. Else migrate v9 → v10, write the backup, and **leave v9 untouched**. Same for ghosts and the tutorial key.
5. **Shims.** `LEVELS`/`WORLDS`/`DAILY_LEVELS` re-exports keep EndlessScene, Daily and old tests compiling. They are removed in P4 once nothing imports them (`tsc` proves it).
6. **Telemetry continuity.** The existing `level` index param stays; `level_id` is added alongside (non-breaking until P6).

## 10. Rollback

| Area | Rollback path |
|---|---|
| Save migration | A rollback build reads the untouched `progress:v9`/`ghost:v1`. It loses only progress made after the upgrade; nothing is corrupted. No key is deleted before P6. |
| File move + codemod | `git revert` of the two commits. The round-trip test guarantees v1 equivalence in both directions. |
| GameScene → LevelSim (T08) | Revert the single T08 commit series. The parity gate means the previous path is still byte-equivalent. Entities keep a draw-only API both paths can use during the transition. |
| CI gates | A workflow env `LEVELSIM_GATE=warn` turns the fast tier report-only for an urgent hotfix. Using it requires an owner note in `docs/STATUS.md`, and the next PR must restore `error`. |
| Bot findings | Never auto-applied to content, so there is nothing to roll back in data |

## 11. Performance

| Budget | Target | Check |
|---|---|---|
| In-game step cost | LevelSim `fixedStep` ≤ 1.05× the P1 `fixedStep` (browser, the 150-level parity run) | Harness timing |
| Allocation | 0 allocations per step: preallocated event ring and input frame | Vitest heap-stable loop test (10k steps) |
| Bundle | `src/sim/validate/**` and `scripts/**` never ship in the game bundle. Metadata adds ≤ 40 KB raw. | Build check: no rule-id strings (`G-0`) in `dist/` |
| Bodies | Unchanged (max 12 today); G-05e enforces < 20 | G-05 |
| CI | Fast tier < 3 min cold. Nightly ≤ 90 min wall on 4 shards. Quick-check < 30 s. | Job timers; µs/step recorded in every report |

## 12. Platform

- **Android WebView** (V8, `minWebViewVersion` 87 per D-11) and **Node 20 in CI** (`ci.yml`) both run V8 with the fdlibm transcendental port, so determinism is expected to be bit-exact [R physics Q4]. The weekly matrix verifies Node 20/22 and the browser.
- **Windows dev:** ids are lower-case kebab-case, so no case-only renames can break `git mv` on NTFS. Scripts use `path`/`fileURLToPath`, never hard-coded separators.
- **iOS/JSC (D-29, later):** LevelSim stays the same. Replay validation gets a tolerance mode. Nothing in P2 blocks the port.
- **Capacitor:** the migration runs before Boot completes, using P0's hydrated Preferences mirror (D-12).

## 13. Documentation changes

| Doc | Change |
|---|---|
| `CLAUDE.md` | Rewrite "Level system", "Folder Structure" (`src/content`, `src/sim`, `scripts/levelsim`) and "Future Expansion" (a mechanic = registry entry + config field + entity + validator rules) |
| `docs/architecture/LEVEL-ENGINE.md`, `LEVEL-QA-SIMULATION.md` | Keep in sync with the implementation. Mark resolved [ASSUMPTION]s. |
| `src/content/levels/_template.ts` | Becomes the v2 authoring template; replaces `src/config/levels/_template.ts` |
| `docs/STATUS.md` (from P0) | P2 progress, CI tier timings, baseline counts |
| `CHANGELOG.md` | Save migration note: "progress is now keyed by level id" |
| `docs/superpowers/plans/2026-10-xx-p02-step{8,9,11}.md` | Just-in-time TDD plans (EXECUTION-ORDER working agreement) |
| `docs/playtests/README.md` | The LEVEL-QA §9 protocol and observation sheet (created when the first playtest runs, P4) |

## 14. Validation criteria

| Criterion | Label |
|---|---|
| `npx tsc --noEmit`, `npx vitest run`, `npm run build` green | VERIFIED (command output) |
| Round-trip test 163/163; migration case table green; rule fixtures green | VERIFIED |
| Parity: 150 × 3 logs produce identical `{outcome, simMs, hash}`, M0 build vs P2 build | VERIFIED (harness output) |
| Fast tier < 180 s cold on the CI runner; quick-check < 30 s locally | VERIFIED (job timers) |
| Report JSON validates against the schema; covers 150/150 (+ daily + vault) | VERIFIED |
| Acceptance defects reproduced (LEVEL-QA §11) | VERIFIED |
| Nightly A4–A6 + ablation complete 150/150 within 90 min | VERIFIED (workflow log) |
| Determinism: Node ×2, fresh worker, Node 20/22 and browser hashes equal for stored solutions | VERIFIED |
| Bot scores rank levels the way humans will | INFERRED until §8 calibration (M1 + telemetry) |
| LevelSim per-step cost acceptable on low-end Android | INFERRED (desktop harness ratio) → **DEVICE** spot check |
| Upgrade from an M0 internal-track build with real progress keeps every star, best time and ghost | **REQUIRES HUMAN DEVICE TEST** (owner, internal track) |
| CoachMark no longer fires on the Daily for a fresh install | **DEVICE** (plus a unit test) |

## 15. Exact completion definition

P2 is complete when **all** of the following hold on `origin/master`:

1. All 150 campaign + 8 daily + 13 vault configs are v2 files under `src/content/levels/`. Each has id/idea/role/teaches/uses/tags, and `provenance.backfilled` is empty (reviewed).
2. `WORLDS_V2` lists ids explicitly. `campaignOrder()` reproduces the v9 order exactly (test).
3. Progress, ghosts and the tutorial flag are id-keyed. The migration tests pass, v9 keys are preserved, and the owner device upgrade test is recorded in `docs/STATUS.md`.
4. GameScene renders LevelSim. Entities create no Matter bodies. The parity gate is green.
5. Static rules G-01…G-22 and M-01…M-12 run in `content.test.ts`. `qa/baseline.json` lists every current error with its `fixIn` phase. There are zero un-baselined errors.
6. The `levelsim-fast` job blocks on errors and takes < 3 min cold. `level:check` runs in < 30 s.
7. The nightly workflow produces `level-quality-report.json` + `.md` for 150/150 with all 10 scores non-null where applicable, par suggestions, and committed `qa/solutions/` for every solvable level.
8. The LEVEL-QA §11 acceptance tests pass.
9. CLAUDE.md, STATUS, CHANGELOG and both architecture docs are updated. The code-review pass is done.

## 16. Task breakdown

### Step 8: Level data model v2 + id migration

| Task | Goal | Files | Tests | Done when |
|---|---|---|---|---|
| **P02-T01** Schema + registry | v2 types, id guards and mechanic registry with pure detectors | `src/content/schema.ts`, `mechanics.ts`, `src/config/qa.config.ts` | detector per ref; guard accept/reject table | `tsc` green; detectors match the inventory `mech` counts for all 150 levels (`docs/audit/2026-10-07/inventory/levels.json`) |
| **P02-T02** Frozen map + move + codemod | Freeze `v9IndexToId`; move-only commit; v2 codemod; generated index | `src/content/migrations/v9IndexToId.ts`, `scripts/content/{migrate-v2,gen-index}.mjs`, `src/content/levels/**`, `index.gen.ts` | map length/uniqueness/source-file match; **round-trip 163/163**; index freshness | Two commits landed; `git log --follow` shows history; round-trip green |
| **P02-T03** Worlds + campaign + shims | Explicit world id lists; id-based campaign helpers; v1 shims | `src/content/{worlds,campaign,v1compat}.ts`, `src/config/{worlds,levels/index,dailyLevels,worldThemes}.ts`, `src/utils/world.ts` | campaign order = v9 order; ported world-range tests (G-21) | All existing imports compile; old tests green through the shims |
| **P02-T04** Store migration | progress v10 (per-star flags), ghost v2, tutorial key, as the next step of P0's migration ladder | `src/content/migrations/progressV10.ts`, `src/platform/migrations.ts`, `src/utils/{storeSchemas,ProgressStore,GhostStore,SettingsStore}.ts` | the full case table incl. the `stars:2 & gem` rule, orphans, corruption → backup, idempotence | Migration tests green; v9/v1 keys untouched after migration |
| **P02-T05** Call sites to ids | Navigation, labels, unlock, stats, onboarding and analytics by id; CoachMark by `tutorial.id`; dev `?level=` | `src/scenes/{GameScene,LevelSelectScene,WorldMapScene,MainMenuScene,EndScene}.ts`, `src/utils/{StatsStore,onboarding}.ts`, `src/services/analyticsEvents.ts`, `src/main.ts` | analytics name/param test incl. `level_id`; unlock parity; boot smoke; LevelSelect/WorldMap screenshot diff with a seeded v9 save | No `currentLevel`-as-key remains (grep); screenshots identical |
| **P02-T06** Metadata review (design) | Human pass over the drafted idea/role/teaches/uses/tags/seals/intendedRoute for 171 configs | `src/content/levels/**` | M-01…M-12; G-13 recomputed | `provenance.backfilled` empty everywhere; M-12 has 0 warnings |

### Step 9: `src/sim` extraction + A0–A3 + validators v2 + report + CI gate

| Task | Goal | Files | Tests | Done when |
|---|---|---|---|---|
| **P02-T07** LevelSim core | DOM-free sim as P1's `SimWorldPort` with its own Matter world: Matter injection, canonical bodies, D-01 step via `runFixedStep`, D-02 arm, D-03 precedence, events, snapshot, hash, rules modes; absorbs `HeadlessWorld` | Create `src/sim/{matter,LevelSim,snapshot}.ts`, `scripts/levelsim/matter-node.ts`. Modify P1's `src/sim/{bodyDefs,rules,input,stepPipeline,HeadlessWorld}.ts`. | body order; arm; precedence; ×2 + fresh-worker hash equality; snapshot divergence measured and documented; Engine options = Phaser `World.js:73` path | Node replay of 150 levels × arm-only is deterministic; [ASSUMPTION] items in LEVEL-QA §1.2/§1.6 resolved in the doc |
| **P02-T08** GameScene as renderer | GameScene and entities render LevelSim; side effects flushed after the stepper loop; `hudLayout` extracted | `src/scenes/GameScene.ts`, `src/entities/*.ts`, `src/ui/hudLayout.ts` | **parity gate** (150 × 3 logs, M0 vs P2); multi-rate harness green; boot smoke; per-step ≤ 1.05×; zero-allocation loop | Parity identical; harness green at 30–144 Hz |
| **P02-T09** Validators v2 | G-01…G-22 + M-01…M-12 + baseline ratchet; replace `levels.test.ts` | `src/sim/validate/**`, `src/content/content.test.ts`, `qa/baseline.json` | positive + negative fixture per rule; ratchet tests | Every current error is baselined with `fixIn`; 0 un-baselined; Daily and vault covered (closes the [A] C.4 gap) |
| **P02-T10** CLI + A0–A3 + fixtures | esbuild CLI, worker pool, cache, A0/A1/A2/A3, scripted follower, G-17 micro-sim, B-11/B-13; µs/step benchmark | `scripts/levelsim/{cli,runner,cache,rng}.ts`, `agents/{a0-none,a1-nudge,a2-pursuit,a3-wallhug,scripted}.ts`, `fixtures/audit-2026-10-07.ts`, `acceptance.test.ts` | synthetic agent arenas; acceptance rows for L11, L12, L40, L60, L74, L80, L22–25, L62/L64 (static + fast parts) | Acceptance (fast parts) green; benchmark recorded; fallback rule (LEVEL-QA §6) applied if needed |
| **P02-T11** Report v1 | JSON/MD/SVG/JUnit writers; fast-tier scores (selfSolve, bypass, novelty raster, readability, provisional timer/gem) | `scripts/levelsim/report/{json,markdown,svg,scores}.ts` | schema validation; score formula unit tests on fixed inputs | The fast report covers 150/150 + daily + vault |
| **P02-T12** CI fast tier + quick-check | `levelsim-fast` job (blocking, cached, < 3 min); `level:check`, `level:new`, `content:*` scripts | `.github/workflows/ci.yml`, `package.json`, `scripts/content/new-level.mjs`, `.gitignore` | cold-cache timing PR; a deliberately broken level fails CI; quick-check < 30 s | CI green on master; the timing is recorded in STATUS |

### Step 11: A4–A6 + ablation + par formula + nightly report

| Task | Goal | Files | Tests | Done when |
|---|---|---|---|---|
| **P02-T13** A4 + A5 + solutions | Random search with AUCCESS and best-5% features; beam search (flow field, sensible moves, dedup, width fallback); cold re-verify; `qa/solutions/*.json` | `agents/{a4-random,a5-beam}.ts`, `src/sim/validate/grid.ts` (flow field) | synthetic: a sealed arena fails, a portal arena solves; cold re-verify equality; AUCCESS formula test | A5 solves every level that G-19 says is reachable, or each failure is listed as B-06 for human check; solutions committed |
| **P02-T14** A6 + ablation + par + full scores | Noisy closed-loop expert, micro-noise, ablation runner, the par formula with low-confidence fallback, gem Δ, timing/hazard/route analyses, all 10 scores | `agents/{a6-noisy,ablation}.ts`, `report/{par,scores}.ts` | par rounding/fallback table; ablation kinds per registry; nightly acceptance rows (L62/L64 ablation, L80 B-09) | Every report score is non-null where applicable; par suggestions for 150/150 |
| **P02-T15** Nightly + weekly workflows | Sharded nightly (≤ 90 min), trend diff, tracking issue on new errors, bot PR for `qa/solutions`; weekly frame-rate modes 1–2 + Node 20/22 matrix + legacy-mode audit reproduction | `.github/workflows/{levelsim-nightly,levelsim-weekly}.yml`, `scripts/levelsim/framerate.py` (P1 harness bridge) | dry run on a branch; artefacts downloadable | Two consecutive green nightlies; one weekly run with identical browser/Node hashes |
| **P02-T16** Docs + close-out | CLAUDE.md, the v2 template, STATUS, CHANGELOG, architecture docs synced, code review | §13 list | doc lints (links resolve) | §15 checklist all ticked |

**Order and parallelism:**
- T01 → T02 → T03 → (T04 ∥ T06) → T05 completes step 8.
- T07 → T08 and T09 (in parallel) → T10 → T11 → T12 completes step 9 and unblocks P3 (step 10).
- T13 → T14 → T15 → T16 completes step 11 and unblocks P4-α (step 13).
