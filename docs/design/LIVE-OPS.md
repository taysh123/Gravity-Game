# Live-Ops Seams

> **Deliverable #11.** Design the **seams, not a platform.** Live ops for this game is *data, not content* (retention Q7): every event is a dated JSON row that switches on behaviour already shipped in the binary. Implementation plan: [`../roadmap/phases/P10-live-ops.md`](../roadmap/phases/P10-live-ops.md).
> **Conforms to:**
> - D-14: Remote Config through a pure clamped `rcConfig.ts`; Daily/Weekly/event changes are **dated overrides, never retroactive**
> - D-15: notifications ≤1/day, fixed types
> - D-17: Weekly on the PGS reset
> - D-21: Daily pool via dated overrides
> - D-22: Run content model
> - D-23: single earn-only soft currency; seasonal drops as a sink
> - D-24: no fake urgency
> - D-30: no battle pass, event currency or server events
>
> **Evidence:** `docs/research/retention-analytics-liveops.md` Q3, Q4, Q7 · `docs/archive/2026-10-07/growth-architecture.md` · `src/config/worldThemes.ts` · `src/utils/cosmetics.ts` · `src/utils/RewardStore.ts` · `docs/design/GRAVITY-RUN.md` §10.
> **Schedule:** execution step 22 (after P9). It needs P6 (Remote Config live), P7 (cosmetic pipeline) and P8 (Weekly modifier hook).

---

## 1. Principles
1. **The binary ships the content; the calendar only schedules it.** Cosmetics, palettes, modifiers and level packs are compiled in. Remote Config never carries code, art or level geometry.
2. **Old clients are always safe.** Unknown kinds, fields and references are ignored, never errors. The verification target is zero crashes on unknown event kinds (MASTER-ROADMAP P10).
3. **Deterministic and dated.** All dates are UTC ISO-8601. Given the same calendar and instant, every client resolves the same active set. A calendar never changes a window that has already started (D-14 "never retroactive").
4. **Nothing is permanently missable.** Every limited item has a guaranteed return path (§6).
5. **The operating cost fits one developer:** one 2-hour sitting a month (§10).
6. **Works offline.** With no fetch, the client runs a **built-in rotation** (§3.3). Live ops only ever *overrides* the default.

## 2. `event_calendar` Remote Config schema

- **Location:** one Remote Config parameter, `event_calendar` (JSON string, default `{"v":1,"events":[]}`; retention Q3).
- **Source of truth:** `liveops/event_calendar.json` in the repo. Git history is the audit log, and CI validates it (§11).
- **Size:** ≤16 KB. The window is the past 14 days plus the next 70 days.
- **Lifecycle:** cached values activate at boot, then a 3 s fetch during the splash (D-14). Every event is **published ≥7 days before `start`**, which covers the 12 h minimum fetch interval and app-update lag (retention Q7).

```json
{
  "v": 1,
  "events": [
    {
      "id": "wk-rw2968",
      "kind": "weekly_mod",
      "start": "2026-11-22T07:00:00Z",
      "end": "2026-11-29T07:00:00Z",
      "modifier": "mirror",
      "poolVer": 3,
      "seedKey": null,
      "title": "Mirror Week",
      "minBuild": 1010000
    },
    {
      "id": "season-aurora-2026",
      "kind": "season_palette",
      "start": "2026-12-01T00:00:00Z",
      "end": "2027-03-01T00:00:00Z",
      "palette": "aurora"
    },
    {
      "id": "drop-2026-12-aurora-trail",
      "kind": "cosmetic_drop",
      "start": "2026-12-01T00:00:00Z",
      "end": "2027-01-01T00:00:00Z",
      "rewardId": "trail_aurora",
      "goal": { "type": "weekly_runs", "target": 5 },
      "vaultReturn": "2027-06"
    },
    {
      "id": "pack-2027-q2-switchback",
      "kind": "level_pack",
      "start": "2027-04-04T07:00:00Z",
      "end": "2099-01-01T00:00:00Z",
      "packId": "switchback",
      "minBuild": 1030000
    }
  ]
}
```

### 2.1 Field rules

| Field | Rule | If violated |
|---|---|---|
| `v` | Integer schema version. The client knows ≤ its own. | `v` higher than known → ignore the whole calendar and use the built-in defaults |
| `id` | `^[a-z0-9-]{3,40}$`, unique | Duplicate → keep the first occurrence |
| `kind` | One of the **known kinds** below | **Unknown kind → skip the event** (not an error; counted in `liveops_reject{reason:'kind'}`) |
| `start` / `end` | ISO-8601 with `Z` (UTC only); `end > start` | Unparseable or non-UTC → skip the event |
| `minBuild` | Optional versionCode (D-20 scheme). Present when the event needs code newer than some live builds. | Client `versionCode < minBuild` → skip, and show "Update for this week's event" where relevant |
| Kind-specific references (`modifier`, `palette`, `rewardId`, `packId`) | Must exist in the client's compiled catalogue | Unknown → skip the event |
| Unknown fields | — | Ignored |

### 2.2 Kinds

| Kind | Payload | Window rule | Overlap rule | Ships in |
|---|---|---|---|---|
| `weekly_mod` | `modifier`, `poolVer`, optional `seedKey` override, `title` | **Exactly** one PGS week: Sunday 07:00 UTC → +7 d (D-17) | One per week; first valid in array order wins | P10 |
| `season_palette` | `palette` (one of 4 compiled ids) | ≤100 days | One at a time; first valid wins | P10 |
| `cosmetic_drop` | `rewardId`, `goal{type,target}`, `vaultReturn` (YYYY-MM) | ≤45 days | ≤2 concurrent | P10 |
| `level_pack` (later) | `packId` of a pack **compiled into the build** | Open-ended (unlock date) | Any | after P10 |

**Resolver.** The pure `resolveCalendar(raw, nowUtcMs, build)` returns `{ weeklyCourse, palette, drops[], packs[] }`. It never throws: any exception in parsing is caught, and the result is the built-in default.

## 3. Weekly modifier catalogue and rotation

### 3.1 Catalogue (8, all built from existing parameters)
Each modifier is a `RunModifier` (GRAVITY-RUN §10). Its physics knobs are clamped constants; the attractor formula is never touched (D-26).

| Id | Name | What changes (existing knob) | Difficulty | Origin |
|---|---|---|---|---|
| `standard` | Standard Week | nothing | baseline | — |
| `mirror` | Mirror Week | every template mirrored (`transform.mirror:'all'`) | ≈baseline | D-22 mirror |
| `gem_rush` | Gem Rush | `gemBonus` 5 → 10; gem placement unchanged, so gems are ≤18% of score (5 gems × 10 vs 224 climb points per 4-chunk cycle) | easier | Daily `gemRush` (`utils/daily.ts:45`) |
| `focus_currents` | Currents Week | biome weight: Currents ×3 | ≈baseline | Biome phases |
| `focus_wells` | Wells Week | biome weight: Wells ×3 | harder | Biome phases |
| `pulse_storm` | Pulse Storm | beam family weight ×2; beams eligible from P1 | harder | Beam chunks (`chunks.ts:110-136`) |
| `slipstream` | Slipstream | `BALL_FRICTION_AIR` ×0.7 (0.02 → 0.014) | harder (floatier) | `physics.config.ts:13` |
| `deep_end` | The Deep End | fusion phases from P2 (`fusionFromPhase: 2`) | hardest | Fusion phases |

Rejected modifiers:
- Anything that thins rest chunks, which would break D-22's cadence.
- Anything that raises scroll speed, which would break D-22's composition-not-speed rule.
- No-hazard "zen" weeks, which make the board unbounded.

### 3.2 Gate before a modifier may be scheduled
1. The modifier exists in every build ≥ the event's `minBuild`.
2. The **modifier matrix** passes nightly (validators plus the bot over the eligible pool, GRAVITY-RUN §14.3).
3. The 8-week pre-sim of the target seed under the modifier sits inside the normal survival band. Otherwise set a `seedKey` override.

### 3.3 Built-in rotation (zero-ops default)

```
ROTATION = [standard, mirror, focus_currents, gem_rush, pulse_storm, focus_wells, slipstream, deep_end]
modifierFor(weekIndex) = ROTATION[weekIndex % 8]
```
- Never the same modifier two weeks in a row.
- One easy week (`gem_rush`) and one hardest week (`deep_end`) per 8.

The calendar overrides a week only for themed weeks or seed fixes. Old and new clients therefore agree on the course even when the calendar fetch fails. Any override must use a modifier that every build ≥ `minBuild` knows. A client below `minBuild` shows "Update to join this week's board" and offers practice without ranked submission (GRAVITY-RUN §7).

### 3.4 Surface
- **"This Week" card in `RunSelectScene`:**
  - modifier name + one-line rule
  - the reset in local time ("resets Sun 10:00")
  - your best this week
  - rank (native, PGS)
- **MainMenu:** a small event chip.
- **Notifications:** none new. D-15's existing **weekly reset** reminder is the only weekly notification type.

## 4. Seasons: 4 a year via `worldThemes`

- **Shape.** A `SEASON_THEMES` table reuses the `WorldTheme` shape (`src/config/worldThemes.ts:4-13`: `bgColor`, `nebulaTints`, `starTint`, `starAlpha`, `accent`).
- **Where it applies:** MainMenu, RunSelect, the Gravity Run Launch biome, and the share-card backdrop.
- **Where it never applies:** campaign worlds, whose identity is fixed by P4. That keeps world readability and bot verification untouched.
- **Names are astronomical, not hemispheric,** because Northern "winter" is Southern summer:

| Palette id | Window (default) | Mood | Base (reuse) |
|---|---|---|---|
| `aurora` | Dec–Feb | icy cyan + green curtains | W2/W13 tints |
| `bloom` | Mar–May | nebula magenta + mint | W5/W13 |
| `solar` | Jun–Aug | gold + amber flare | W8/W15 |
| `ember` | Sep–Nov | ember red + violet dusk | W4/W14 |

- **Contrast.** Each palette must pass the P5 contrast audit, HUD text ≥4.5:1 (MASTER-ROADMAP P5 metrics). Reduced motion changes no brightness (D-13).
- **Rendering.** The palette swap is a `CosmicBackground` theme argument (`src/entities/CosmicBackground.ts:51`), costing **zero new draw calls**.
- **Optional extra:** a season may unlock one earned trail via a `cosmetic_drop` (§6).

## 5. Limited-time events (what an "event" is here)

An event is a calendar row, a goal, and a reward that is already in the binary. There are no new modes, no servers and no event currency.

| Event type | Composition | Example |
|---|---|---|
| **Monthly drop** | `cosmetic_drop` + goal | "Aurora Trail: play 5 Weekly runs in December" |
| **Themed week** | `weekly_mod` + matching `season_palette` slice + a Daily theme via D-21's dated `daily_schedule` override (same week) | "Currents Week": Currents biome ×3, zone-themed dailies |
| **Challenge ladder** (always on) | Personal weekly milestone track: reach 500 / 1,000 / 1,500 / 2,000 in this week's Weekly → 5 / 10 / 15 / 25 Stardust | Retention Q7 #5. Personal, so it works on web too. |
| **Special world / level pack** (later) | `level_pack` unlock date for a bot-verified pack compiled into a release | A 10-level "SWITCHBACK" pack (audit §C.6) |

**Goal types** for drops are evaluated by one pure function, `eventGoalProgress(goal, stats)`:
- `weekly_runs`
- `run_height`
- `daily_clears`
- `run_gems`
- `levels_3star`

Progress counts only inside `[start, end)`, measured on the device clock. A player who changes their clock only changes when they get a cosmetic. That's harmless, because drops are cosmetic, earned and returning.

## 6. Earned cosmetics and the vault

| Rule | Detail |
|---|---|
| Earned only | Event cosmetics use a new `Acquire` value `'event'` (`src/utils/cosmetics.ts:10`) with an `eventId`. **Never sold for money**, unlike P7's paid seasonal packs, which are separate items. |
| Ships ahead | The cosmetic ships in a release **≥4 weeks before** its drop starts, so ≥80% of actives have the build. The calendar entry gets `minBuild`. |
| Vault return | Every drop names a `vaultReturn` month ≤12 months later. Each "Vault Month" (every 3rd month) re-runs 2 past drops with the same goals. |
| Permanent fallback | 12 months after its first window, every drop becomes permanently earnable as a **Stardust item** (D-23 seasonal-drop sink) or achievement. A static test enforces that every `'event'` cosmetic has a fallback path. |
| Copy | Factual: "Available until Jan 1 · returns in the Vault". No red countdowns, no "last chance", no urgency styling (D-24). |
| Idempotence | The grant goes through `RewardStore.claimedEver('event:<eventId>')` (`src/utils/RewardStore.ts:39`), so it fires exactly once even across re-runs. |

## 7. Special worlds and level packs (later)
- **Content.** A pack is a D-05 world entry (`levels: id[]`) marked `pack: true`. It goes through the full P2 pipeline (validators, bot gates, ablation, par formula) and ships in a release.
- **Calendar.** The calendar only sets the unlock instant (`level_pack`). After unlock it stays unlocked forever, so it is never removed.
- **Packs are free content.** Paid packs would be a P7 decision against D-24 "never gate progress". Expert/remix packs (D-27) are the likely first candidates.
- **Not doing:** downloading level JSON at runtime. That needs integrity checks, bot verification and cache invalidation; revisit only if release cadence becomes the bottleneck.

## 8. Event currencies: deferred
Deferred by D-30, for four reasons:
1. A third currency fights D-23's single earn-only soft currency.
2. It triggers EU CPC virtual-currency transparency duties and Digital Fairness Act scrutiny (retention Q4/Q7).
3. Balancing exchange rates is a recurring solo-dev cost.
4. Progress meters (the §5 goals) already give the "event progress" feeling without a wallet.

**Revisit only if** `SUCCESS-METRICS.md` (planned) shows event participation ≥20% of WAU for 3 consecutive months **and** meters measurably underperform.

## 9. Challenge ladders (beyond the weekly track)
- **Weekly ladder** (§5): always on, personal.
- **Run goal ranks** (GRAVITY-RUN §12): the permanent ladder.
- **Seasonal ladder** (optional, from the 2nd season): one 4-step track per season (e.g. 20 Weekly runs, reach the Deep 5 times). The reward is the season's palette-matched trail, earned and with a vault return.
- **Not doing:** a battle or season pass (D-30). It needs a content treadmill and thousands of DAU, and it carries FOMO risk.

## 10. Operating cadence (solo developer)

| Cadence | Time | Tasks |
|---|---|---|
| **Monthly sitting** (first Monday) | 2 h | Draft the next month's rows in `liveops/event_calendar.json`. Check `vaultReturn` obligations. Run `node scripts/liveops/calendar.mjs validate` and `preview`. Publish by the **20th** (≥7 days ahead). |
| **Weekly check** (Monday) | 15 min | PGS Console: hide tamper-flagged scores. Glance at Weekly participation, submit success and crash-free rate. Confirm next week's seed pre-sim is green. |
| **Per release** (≈6 weeks) | +0.5 d | Ship the next 1–2 drop cosmetics ≥4 weeks ahead. Add the `minBuild` rows. |
| **Quarterly** | 1–2 d | New season palette (data only) + 1 earned trail. Review the D-30 revisit metrics. |
| **Emergency** | 10 min | Remote Config `liveops_enabled=false` (kill switch: built-in rotation only), or roll back to a previous Remote Config template version. |

Yearly load ≈ 12 × 2 h + 52 × 15 min + 4 × 1.5 d ≈ **10 dev-days**. That is sustainable alongside content work, which addresses the treadmill-fatigue risk in MASTER-ROADMAP P10.

## 11. Tooling
- **`liveops/event_calendar.json`:** the source file, reviewed like code.
- **`scripts/liveops/calendar.mjs`:** a Node CLI that imports the same pure resolver and catalogues as the client, so there is no drift.

  | Command | What it does |
  |---|---|
  | `validate <file>` | Schema check; references against the compiled modifier, palette, cosmetic and pack catalogues; ≥7-day lead; window rules; overlap rules; `vaultReturn` ≤12 months |
  | `preview <iso-date>` | Resolved active set at that instant |
  | `timeline` | 12-week ASCII view: weekly modifiers, seasons, drops, vault obligations |
  | `export` | Minified JSON for Remote Config (size check ≤16 KB) |

- **Publishing.** Paste into the Firebase Remote Config console, or `firebase deploy --only remoteconfig` with a template file. The CLI path is INFERRED and to be confirmed in P10-T02. Remote Config keeps template versions, so rollback is one action.
- **CI.** `calendar.mjs validate liveops/event_calendar.json` joins the web job (`.github/workflows/ci.yml`).

## 12. Safety and tests

| Test | Asserts |
|---|---|
| Unknown kind | `{"kind":"battle_pass",…}` → skipped, the rest resolve, no throw |
| Unknown field / higher `v` | Fields ignored; a higher `v` falls back to defaults |
| Malformed JSON, non-UTC dates, `end ≤ start`, duplicates | Fallback or skip; never throws |
| Boundaries | Active at `start` exactly, inactive at `end` exactly; week boundary at Sunday 07:00:00.000Z |
| Old-client simulation | Resolving the full calendar with a lower `versionCode` skips `minBuild` rows; the weekly course falls back to the built-in rotation **only when the override is `minBuild`-gated** (otherwise every client agrees) |
| Determinism | Same calendar + instant → identical `weeklyCourse` across 10k randomised instants (property test) |
| Never permanently missable | Every `acquire:'event'` cosmetic has `vaultReturn` ≤12 months and a permanent fallback |
| Modifier matrix | Nightly: every calendar-referenced modifier passes the validators and the bot |
| Kill switch | `liveops_enabled=false` → resolver returns the built-in defaults |
| Telemetry | `event_view{event_id}`, `event_progress{event_id, pct}` (at 25/50/75/100), `event_reward{event_id, reward_id}`, `liveops_reject{reason}` (sampled ≤1/session) |

Success metrics (MASTER-ROADMAP P10):
- Event participation ≥20% of WAU.
- D7 retention of participants vs non-participants is reported.
- **Zero crashes on unknown event kinds.**
