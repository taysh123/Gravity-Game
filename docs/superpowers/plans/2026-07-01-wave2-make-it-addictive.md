# Wave 2 — "Make it Addictive" Implementation Plan (DRAFT — awaiting wave-level approval)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task (one implementer + independent reviewer per task), same as Wave 1. Steps use checkbox (`- [ ]`).
> Pure/discrete logic (streak math, near-miss, login-bonus, streak-freeze, analytics event shaping) is **TDD'd**;
> onboarding/celebration *feel* is **playtested** (CLAUDE.md Skill Usage Rules). Every visual/motion/HUD task
> passes the **ui-ux-pro-max design lens** (below) before it is called done.

**Goal:** Maximize D1/D7 retention and the "one more level" pull — sharpen the first 90 seconds, add a win-streak
+ near-miss momentum loop, make meta-progression rewards *visibly* celebratory, add ethical comeback/habit hooks
(daily login bonus + streak protection), and instrument every retention hook with analytics — all cosmetic, no
P2W, additive on the existing architecture.

**Architecture:** Additive only, same conventions as Wave 1. Each feature extracts its *pure decision logic* into
a small TDD'd `src/utils/*.ts`, its *tuning constants* into config, and wires the visual/UX layer into existing
scenes/stores. New retention events extend `src/utils/analyticsEvents.ts` (factory pattern). Reward hooks reuse
the idempotent `RewardStore` + `Rewards.ts` composition (never a raw `CurrencyStore.add` in a re-runnable path).
No managers. No new mechanic. No new dependency or asset.

**Tech Stack:** Phaser 3.80 · TypeScript strict · Vite 5 · Vitest. No new runtime deps.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **No P2W — enforced, not just convention.** Every reward Wave 2 grants is **cosmetic or soft-currency only**
  (`CurrencyStore` Stardust / `FragmentStore` Fragments / `CosmeticStore.grant`). Never touch gameplay tuning,
  never gate difficulty/progress behind a purchase, never a stamina/pay-to-skip. Matches
  `config/monetization.config.ts` + `docs/store/monetization-review.md`.
- **⚠️ Idempotent grants (the #1 correctness risk).** `CurrencyStore.add()` / `FragmentStore.add()` are **NOT**
  self-guarding, and `GameScene.triggerWin` **re-runs on every `scene.restart()` (level replay)**. Any new reward
  hook MUST gate through `RewardStore.claimedEver(key)` / `claimedToday(key)` **before** adding currency — copy the
  exact guard-then-claim pattern in `utils/Rewards.ts` (`claimMilestoneRewards`/`claimCollectionRewards`). Namespace
  keys `"concern:id"` (e.g. `"login:2026-07-01"`, `"streakMilestone:5"`).
- **Analytics is a seam.** Never call Firebase directly or add a native import outside `utils/Analytics.ts`. New
  events = new factories in `utils/analyticsEvents.ts` returning `{ name, params }`; wrap string/user-derived params
  in `sanitizeParams`; `Analytics.track(...)` at the lifecycle point. Web build stays firebase-free.
- **Web-safe:** no native plugin outside the existing `isNativePlatform()` seams. **Push/local notifications are
  OUT of scope** for Wave 2 (they need a native notification plugin = a new dependency + native gate) — all
  comeback hooks are **in-app** (daily login bonus, streak protection, badges). Flagged as a deferred native item.
- **All constants in config** (`physics.config.ts`, `theme.config.ts`, `splash.config.ts`, `fx.config.ts`, or a new
  `retention.config.ts`). Never a raw semantic number in scene/entity code.
- **Honor `reducedMotionActive()`** for every motion added (streak flourish, milestone toast, login-chest open).
- **Perf ceiling** (<20 bodies, <50 particles, 60fps) and **lean build** hold. No new asset/dependency.
- **Quality gates at every commit:** `tsc --noEmit` clean · `npm test` green (**118 now — add, never regress**) ·
  `npm run build` clean · Playwright boot zero console errors.
- **`ProgressStore`/store schema:** if any stored shape changes, bump its versioned `KEY` (e.g. progress is at
  `:v9`) — don't silently break existing localStorage.

---

## Animation / Tooling note (carried from Wave 1)

Wave 2 is UI/logic/feel — **default to Phaser-native procedural** (0 new deps), reusing the Wave 1 FX vocabulary
(`fx.config.ts`, `celebrationFlash`, `warpToScene`, glass toasts). The **D1 Rive/Lottie decision stays gated**:
if a *daily-reward-chest open* or a *milestone reveal* set-piece genuinely can't land procedurally, surface a tiny
Rive/Lottie option with a measured build-size delta and wait for approval — do not add unilaterally. Spline stays
rejected. Push notifications (the classic retention hook) need a native plugin — **deferred**, surfaced as a
checklist item, not built in Wave 2.

---

## Design Lens (ui-ux-pro-max — applied to every UX/motion/HUD task)

- **Motion conveys meaning** — streak flourishes, milestone toasts, and the login-chest open each express
  cause→effect (win→momentum, threshold→reward), never decoration.
- **Timing tokens** — 150–300ms micro / ≤400ms complex; exit ~60–70% of enter; ease-out in / ease-in out; reuse
  `THEME.EASE*` for one rhythm.
- **Interruptible & non-blocking** — a retention overlay/toast never blocks the "one more" tap; the next-level/retry
  path stays instantly available (never lock input behind a celebration).
- **Reduced-motion** — calm/static variant for every new flourish via `reducedMotionActive()`.
- **Touch & contrast** — any new button (daily-reward chest, claim) ≥44×44px with ~100ms press feedback; all new
  text ≥4.5:1 (large glyphs ≥3:1); safe-area respected; haptics scaled, not overused.
- **Clarity of progress** — meta-progression surfaces (Star Map tally, milestone, streak) must read as *visible,
  earned* progress; never ambiguous ("what did I just get?").

---

## File Structure

**Create:**
- `src/config/retention.config.ts` — Wave 2 tuning (streak thresholds/labels, near-miss windows, login-bonus
  ladder, streak-freeze rules, toast timings). Mirrors `fx.config.ts`.
- `src/utils/streak.ts` (+ `.test.ts`) — pure consecutive-win counter tier/label + milestone detection.
- `src/utils/StreakStore.ts` — thin localStorage counter (current/best consecutive campaign wins).
- `src/utils/nearMiss.ts` (+ `.test.ts`) — pure "so close" classifier (near-goal death / just-missed-par/gem).
- `src/utils/loginBonus.ts` (+ `.test.ts`) — pure daily-login reward ladder by consecutive-login day.
- `src/utils/onboarding.ts` (+ `.test.ts`) — pure `nextUnlockHint(level)` + first-session step helpers.

**Modify:**
- `src/utils/analyticsEvents.ts` (+ `.test.ts`) — new funnel event factories; activate orphaned `hintUsed`.
- `src/utils/daily.ts` (+ `daily.test.ts`) — thread streak-freeze/grace into `nextStreak`/`effectiveStreak`.
- `src/utils/DailyStore.ts` — persist a streak-freeze token; expose login-bonus claim.
- `src/utils/Rewards.ts` — make `claimMilestoneRewards`/`claimCollectionRewards` **return what was claimed** (for
  celebration UI) without changing their idempotency; add `grantStreakRewards`/`grantLoginBonus` siblings.
- `src/scenes/GameScene.ts` — wire session/daily/world/achievement analytics; streak increment/reset + indicator;
  near-miss copy on death + win overlay; milestone/collection celebration toasts.
- `src/scenes/MainMenuScene.ts` — daily-login-reward chest button + streak-status surfacing.
- `src/scenes/WorldMapScene.ts` / `AchievementsScene.ts` — progress-clarity polish (world tally emphasis, optional
  achievement progress bars).
- `src/main.ts` or `src/scenes/BootScene.ts` — emit `session_start` once per app load.

**Reuse (do not duplicate):** `RewardStore` (idempotency), `Rewards.ts` composition, `CosmeticStore.grant`
(idempotent), `sanitizeParams`, `warpToScene`/glass-toast/`celebrationFlash` (Wave 1), `reducedMotionActive`.

---

### Task 1: Retention analytics funnel foundation

**Goal:** make D1/D7 + the retention funnel measurable before the features land. Additive event factories + wiring.

**Files:** Modify `src/utils/analyticsEvents.ts` (+ `analyticsEvents.test.ts`), `src/scenes/GameScene.ts`,
`src/scenes/BootScene.ts` (or `main.ts`), `src/utils/world.ts` (add `isWorldEnd` if absent).

**Interfaces (Produces):** `sessionStart()`, `dailyStart(index, modifier)`, `achievementUnlocked(id)`,
`worldComplete(world)` event factories; `hintUsed(level)` activated at a real call site.

- [ ] **Step 1 — failing tests** (`analyticsEvents.test.ts`): assert the new factories shape correctly, e.g.
```ts
import { achievementUnlocked, worldComplete, dailyStart } from './analyticsEvents';
it('achievementUnlocked sanitizes the id', () => {
  expect(achievementUnlocked('first_win')).toEqual({ name: 'achievement_unlocked', params: { id: 'first_win' } });
});
it('worldComplete carries the world number', () => {
  expect(worldComplete(3)).toEqual({ name: 'world_complete', params: { world: 3 } });
});
it('dailyStart sanitizes the modifier string', () => {
  expect(dailyStart(2, 'gemRush')).toEqual({ name: 'daily_start', params: { index: 2, modifier: 'gemRush' } });
});
```
- [ ] **Step 2** — run, verify FAIL (`npx vitest run src/utils/analyticsEvents.test.ts`).
- [ ] **Step 3** — implement the factories in `analyticsEvents.ts` following the existing pattern (numbers raw,
  strings via `sanitizeParams`).
- [ ] **Step 4** — run, verify PASS.
- [ ] **Step 5** — wire the emits (no new analytics logic, just `Analytics.track` at the lifecycle point):
  `session_start` once in `BootScene.create()` (or `main.ts` boot); `daily_start` in `GameScene.create()` where
  `isDaily` (mirrors the campaign `levelStart` at ~213); `achievement_unlocked` per id in `triggerWin` right where
  `this.newAchievements` is computed (~977); `world_complete` in `triggerWin` when the just-cleared level is the
  last of its world (add `isWorldEnd(level)` to `utils/world.ts`, TDD it in `world.test.ts`); activate `hintUsed`
  at `showHint`/hint-dismiss.
- [ ] **Step 6** — `tsc` + full `vitest` + `build` green; Playwright boot: in DEV, confirm `[analytics]` debug
  lines fire for session/level/world/achievement in the console (web path logs via `console.debug`). Commit.

---

### Task 2: First 90 seconds — FTUE sharpening

**Goal:** the mechanic's "aha" lands instantly and the first win feels *earned + delightful* (not the generic 3★).

**Files:** Create `src/utils/onboarding.ts` (+ test); Modify `src/scenes/GameScene.ts`,
`src/config/retention.config.ts`, `src/utils/SettingsStore.ts` (add a `seenFirstWin` sibling flag).

**Interfaces (Produces):** `nextUnlockHint(level: number): string | null` (pure — "2 more to unlock **Currents**"
using `worldOf`/`WORLDS`); a one-time first-win beat gated on a new `SettingsStore.seenFirstWin`.

- [ ] **Step 1 — failing tests** (`onboarding.test.ts`): `nextUnlockHint` returns a correct "N more to unlock
  <next world>" for a mid-world level, and `null` at a world's last level / campaign end. (Pure, deterministic
  over `WORLDS`.)
- [ ] **Step 2-4** — TDD `nextUnlockHint` (reads `WORLDS`/`worldOf`, no Phaser).
- [ ] **Step 5 (playtested UX)** — in `GameScene`:
  - **Audit** current L1 flow (coach-mark + hint + first press) against the ui-ux lens; keep what works.
  - **First-win beat:** on the *first ever* campaign win (`!SettingsStore.get().seenFirstWin`), show a one-time
    "You brought your first star home" banner on the win overlay (distinct from the generic 3★), set
    `seenFirstWin`, emit an onboarding-complete analytics event. Reduced-motion → static.
  - **Momentum nudge:** on early wins, surface `nextUnlockHint(level)` on the win overlay ("2 more to unlock
    **Currents**") so the player always sees the next carrot. Constants (durations) in `retention.config.ts`.
- [ ] **Step 6** — gates green; Playwright: fresh-profile boot → L1 win shows the first-win beat once (not on
  replay), nudge shows on L2/L3; contrast ≥4.5:1; reduced-motion calm. Commit.

---

### Task 3: The "one more" loop — win-streak momentum + near-miss encouragement

**Goal:** the single biggest retention lever (100% greenfield) — reward consecutive wins with visible momentum, and
turn near-misses into "so close, retry" pulls rather than frustration.

**Files:** Create `src/utils/streak.ts` (+ test), `src/utils/StreakStore.ts`, `src/utils/nearMiss.ts` (+ test);
Modify `src/config/retention.config.ts`, `src/scenes/GameScene.ts`, `src/utils/Rewards.ts` (add `grantStreakRewards`).

**Interfaces (Produces):**
- `streakTier(count: number): { label: string; level: number }` (pure — thresholds → e.g. `×3 FLOW`, `×5 BLAZE`,
  `×8 NOVA`, from `retention.config`).
- `streakMilestone(count: number): number` (pure — Stardust bonus at exact thresholds, else 0; mirrors
  `daily.streakReward`).
- `StreakStore`: `current()`, `best()`, `win(): number` (increment, persist, return new count), `reset(): void`.
- `nearMiss(ctx): 'near-goal' | 'just-par' | 'just-gem' | null` (pure — death within `NEAR_GOAL_PX` of goal, or a
  win that missed par/gem by < a small window → an encouragement key).

- [ ] **Step 1 — failing tests** (`streak.test.ts`, `nearMiss.test.ts`): streak increments/resets; `streakTier`
  thresholds; `streakMilestone` fires only at exact thresholds; `nearMiss` classifies a death 20px from goal as
  `'near-goal'` and a win 200ms over par as `'just-par'`, `null` otherwise.
- [ ] **Step 2-4** — TDD both pure modules; `StreakStore` is a thin localStorage wrapper (no logic to test beyond
  a smoke of persist/reset — keep it dumb).
- [ ] **Step 5 (wire, playtested feel)** — in `GameScene`:
  - `triggerWin`: `const streak = StreakStore.win();` → drive a **streak indicator** (subtle HUD chip / win-overlay
    flourish escalating with `streakTier`), and `grantStreakRewards(streak)` (**guarded via
    `RewardStore.claimedEver('streakMilestone:'+streak)`** so a replay can't re-grant). Emit `winStreak(streak)`
    at milestones.
  - `triggerDeath`: `StreakStore.reset()` + emit `streakBroken(prev)`; if `nearMiss(...)==='near-goal'`, show an
    encouraging "SO CLOSE — try again" beat on the snappy retry (keep `RESTART_DELAY_MS` feel). Manual restart
    (R/nav) is a player choice — **decide with playtest** whether it breaks the streak (recommend: manual restart
    does NOT count as a loss for streak, only death does).
  - Win overlay: if `nearMiss(...)==='just-par'/'just-gem'`, show "0.2s from ★★★" / "the gem was right there" to
    pull the retry.
- [ ] **Step 6** — gates green; Playwright: force 3 consecutive wins → streak indicator escalates + milestone
  reward granted once (not re-granted on replay — verify the guard); a near-goal death shows the encouragement;
  reduced-motion calm; no console errors. Commit.

---

### Task 4: Meta-progression clarity — surface the silent celebrations

**Goal:** star-milestone (30/60/100/150★) and collection-complete rewards currently land **silently** — make them
feel like visible, earned milestones. Sharpen the Star Map / achievements progress read.

**Files:** Modify `src/utils/Rewards.ts` (return claimed items), `src/scenes/GameScene.ts` (celebration toasts),
`src/scenes/WorldMapScene.ts` / `AchievementsScene.ts` (progress clarity), `src/config/retention.config.ts`.

**Interfaces (Produces):** `claimMilestoneRewards(totalStars): { stars: number; fr: number } | null` and
`claimCollectionRewards(): string[]` (the newly-completed collection ids) — **same idempotency**, just returning
what was claimed instead of `void`, so the scene can celebrate it.

- [ ] **Step 1 — failing tests** (extend the existing `Rewards`/economy tests): `claimMilestoneRewards` returns the
  milestone on first cross of a threshold and `null` on re-call (idempotent); `claimCollectionRewards` returns a
  newly-completed collection id once, then `[]`.
- [ ] **Step 2-4** — TDD the return-value change (behavior otherwise identical: same `RewardStore.claimedEver`
  gate, same currency grant).
- [ ] **Step 5 (playtested feel)** — in `triggerWin`, when the returned milestone/collection is non-null, show a
  celebratory glass toast/overlay (reuse the achievement-toast pattern + a `celebrationFlash` tint) — "★ 100 STARS
  — Ascendant" / "Collection complete: Nebula". Reduced-motion → static. Star Map: emphasize the world
  `earned/max★` tally on the current node; (optional, ui-ux-gated) add achievement **progress bars**
  (`StatsSnapshot` already has the raw counts) in `AchievementsScene`.
- [ ] **Step 6** — gates green; Playwright: cross a star milestone → toast fires once; contrast/reduced-motion
  pass; no console errors. Commit.

---

### Task 5: Comeback & habit hooks — daily login bonus + streak protection

**Goal:** ethical, in-app return incentives (no push, no P2W): a daily free reward for opening the app, and
streak-protection so a single missed day doesn't nuke a long daily streak.

**Files:** Create `src/utils/loginBonus.ts` (+ test); Modify `src/utils/daily.ts` (+ `daily.test.ts`),
`src/utils/DailyStore.ts`, `src/utils/Rewards.ts` (`grantLoginBonus`), `src/scenes/MainMenuScene.ts`,
`src/config/retention.config.ts`.

**Interfaces (Produces):**
- `loginBonusFor(consecutiveDays: number): { sd: number; fr: number }` (pure — an escalating-then-cyclic ladder
  from `retention.config`).
- `nextStreak(state, today, opts?: { freeze?: boolean })` / `effectiveStreak(state, today, opts?)` — extend the
  existing pure daily-streak fns so a held **freeze token** forgives exactly one missed day (TDD in
  `daily.test.ts`).
- `DailyStore`: `claimLoginBonus(now)` (idempotent via `RewardStore.claimedToday('login:'+dateKey)`),
  `hasFreeze()` / `consumeFreeze()`.

- [ ] **Step 1 — failing tests** (`loginBonus.test.ts` + extend `daily.test.ts`): `loginBonusFor` ladder values;
  `nextStreak` with `freeze:true` forgives a 2-day gap (keeps + increments) and consumes the freeze, without freeze
  it resets (existing behavior unchanged); `effectiveStreak` respects the freeze.
- [ ] **Step 2-4** — TDD the pure math; keep the **no-freeze path identical** to today (regression-guard the
  existing `daily.test.ts` cases).
- [ ] **Step 5 (wire, playtested UX)** — `MainMenuScene`: a **DAILY REWARD** chest button (≥44px, glass, gold
  when claimable) → `DailyStore.claimLoginBonus` → `grantLoginBonus` (guarded) → a claim animation + amount;
  emit `loginBonus(day)`. Streak-freeze earned at streak milestones (cosmetic economy; e.g. 1 freeze per 7-day
  streak) and surfaced on the DAILY button ("🛡 streak protected"). All rewards currency/cosmetic — **no P2W**.
- [ ] **Step 6** — gates green; Playwright: menu shows a claimable chest → claim grants once/day (guard verified);
  simulate a 1-day gap with a freeze → streak survives; reduced-motion + contrast pass; no console errors. Commit.

---

### Task 6: Wave Verification & Finish

- [ ] **Step 1 — full gate:** `npx tsc --noEmit` · `npx vitest run` (118 baseline + all new retention/analytics
  tests green) · `npm run build`.
- [ ] **Step 2 — Playwright retention-flow smoke** (`--disable-gpu --use-gl=swiftshader`): fresh profile → first
  win beat + nudge; 3-win streak → indicator + milestone reward (granted once, not on replay); near-goal death →
  encouragement; cross a star milestone → toast; menu daily-reward claim (once/day) + streak-freeze survives a
  gap. Assert **zero console errors** and that `[analytics]` DEV logs show the full funnel
  (session/daily/level/world/achievement/streak/loginBonus).
- [ ] **Step 3 — double-grant audit (critical):** replay a milestone/streak/login level and confirm **no
  re-grant** (every reward hook guarded by `RewardStore`). No P2W: confirm every grant is currency/cosmetic only.
- [ ] **Step 4 — reduced-motion + a11y pass:** every new flourish calm/static; all new buttons ≥44px + press
  feedback; text ≥4.5:1; safe-area respected.
- [ ] **Step 5 — ui-ux-pro-max checklist sign-off** (motion tokens, interruptible, reduced-motion, contrast, touch).
- [ ] **Step 6 — finish** via superpowers:finishing-a-development-branch; update `docs/project-status.md` with a
  Wave 2 entry.

---

## Self-Review (writing-plans checklist)

**Spec coverage** (engagement Wave 2 → task):
- First 90 seconds / onboarding "aha" + earned first win → **Task 2** ✅
- "One more" loop (quick-restart/instant-next already exist; win-streak momentum; near-miss encouragement) →
  **Task 3** ✅ (audit confirms restart=240ms + instant-next already tuned; streak/near-miss are net-new)
- Meta-progression clarity (Star Map journey, milestone celebrations, streak/daily escalation) → **Task 4**
  (+ streak visibility from Task 3) ✅
- Comeback + habit hooks (streak protection, daily free-reward cadence, milestone drops — cosmetic, no P2W) →
  **Task 5** ✅
- Instrument every retention hook with analytics (extend `analyticsEvents.ts`, TDD event shaping) → **Task 1** +
  each feature task emits its own event ✅

**Grounding:** every file path + extension point verified against the codebase (retention-surface recon,
2026-07-01). Known greenfield vs existing is called out per task. `hint_used` (defined, orphaned) is activated.

**Risks pre-empted:** the `triggerWin`-re-runs-on-restart double-grant risk is a Global Constraint + a dedicated
verification step; no-P2W is a Global Constraint + verification; push-notifications explicitly deferred (native).

**Open scoping questions for approval (right-size before building):**
1. **Wave size** — 5 feature tasks is a full retention wave. Trim/split? (e.g., ship Tasks 1–3 as "Wave 2a: the
   one-more loop" first, then 4–5 as "Wave 2b: habit hooks".)
2. **Streak semantics** — does a *manual* restart break the win-streak, or only a death? (recommend: only death.)
3. **Streak-freeze source** — earned via streak milestones only (cosmetic economy), or also purchasable? (recommend:
   earned-only, to stay unambiguously non-P2W.)
4. **D1 (Rive/Lottie)** — keep procedural for the daily-chest/milestone reveals (recommend yes), or evaluate a tiny
   Rive chest after playtest?

---

## Execution Handoff

Work on a new branch `feat/wave2-make-it-addictive` (after Wave 1 is merged/finished). Subagent-driven-development,
one subagent per task + independent review, gates + smoke after each. **This is a DRAFT — awaiting wave-level
approval + answers to the scoping questions above before any code is written.**
