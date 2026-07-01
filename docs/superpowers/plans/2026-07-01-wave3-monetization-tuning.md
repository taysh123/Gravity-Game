# Wave 3 — "Monetization Tuning" Implementation Plan (DRAFT — awaiting wave-level approval)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development — one implementer + one
> independent reviewer per task, fix loop, gates after each. Steps use checkbox (`- [ ]`). Pure/discrete logic
> (interstitial eligibility, analytics event shaping) is **TDD'd**; store/UX copy + placement is **playtested**
> (CLAUDE.md). Every visual/UX element passes the **ui-ux-pro-max design lens** before it is called done.

**Goal:** Make money *respectfully* — ads never interrupt a satisfying moment, rewarded offers feel generous,
the IAP funnel is discoverable + honestly framed, and every ad/IAP step is measurable — all cosmetic + optional
Remove-Ads, **no P2W**, no new dependency, web-safe.

**Architecture:** Additive tuning on the existing (already-complete) monetization plumbing. Extract the
interstitial-cadence decision into a pure TDD'd function; add per-surface/lifecycle analytics params via the
`analyticsEvents.ts` factory + `Analytics.track` seam; surface honest store nudges using the existing win-overlay
"optional secondary line" composition; frame bundles + wire the already-modelled locked-cosmetic → bundle
cross-sell. No new mechanic, no managers, native strictly behind `isNativePlatform()`.

**Tech Stack:** Phaser 3.80 · TS strict · Vite 5 · Vitest. **No new runtime dependency** (AdMob/RevenueCat/Firebase
already in `package.json`, reached by-name behind `isNativePlatform()`).

---

## Global Constraints

- **No P2W — structurally enforced, keep it that way.** Only cosmetics + the optional Remove-Ads convenience are
  sold; `Cosmetic` has no gameplay fields (`utils/cosmetics.ts`), and `economy.test.ts` validates the price ladder.
  Wave 3 adds only: config constants, analytics params, honest copy, and cosmetic-grant cross-sell navigation —
  **never** a gameplay-affecting field, never a pay-to-skip/advantage.
- **Ads never interrupt a satisfying moment.** The interstitial's single call site is `advanceAfterWin`
  (`GameScene.ts:1095`) — the transition out of the win overlay. The new eligibility gate must add
  **first-session grace** (no interstitial in the first N levels / M seconds), **flow awareness** (never right
  after a boss / a hot streak / a 3★), and a **persisted** cooldown (today `lastInterstitialMs` is an in-memory
  `let` reset on every cold start — so a brand-new player's first win is the *least* protected; fix that).
- **Honest positioning.** Remove-Ads copy stays truthful ("No interstitials, ever. Rewarded ads stay optional." —
  `CosmeticsScene.ts:247-276`). No dark patterns, no fake urgency, no confusing "free" that costs an ad without
  saying so. Rewarded ads stay strictly **opt-in and never required to progress**.
- **Measure completion, not taps.** Today `purchase` fires at *attempt* (`IAP.ts:70,96`) — it measures buy-button
  taps, not revenue. Wave 3 splits it into initiated/completed/failed gated on the real result.
- **Analytics is a seam** — new factories in `analyticsEvents.ts` (numbers raw, strings via `sanitizeParams`);
  `Analytics.track(...)` at the call site; never call Firebase directly; web build stays firebase-free.
- **All constants in config** — move the inline `INTERSTITIAL_MIN_GAP_MS` (`Ads.ts:18`) into
  `monetization.config.ts`; new cadence/nudge tuning lands in config too. No raw semantic numbers in scene code.
- **Web-safe:** native ad/IAP calls stay behind the existing `isNativePlatform()` guards; web = stubs. No new dep/asset.
- **Quality gates green at every commit:** `tsc` clean · `npm test` green (**176 now — add, never regress**) ·
  `build` clean · Playwright boot zero console errors.
- **Reconcile with the prior audit** `docs/store/monetization-review.md` (the canonical ranked backlog) — extend it,
  don't re-derive.

---

## Tooling note (carried)

Pure Phaser-native/procedural — 0 new deps. No Rive/Lottie/Spline. Real AdMob/RevenueCat ids + UMP + RevenueCat key
remain **external-account launch gates** (not code) — Wave 3 tunes behavior + measurement against the existing test
ids; the real ids drop into `monetization.config.ts` when you provide them (documented in `docs/LAUNCH-READINESS.md`).

---

## Design Lens (ui-ux-pro-max — every store/nudge/offer element)

- **Never block the "one-more" flow** — a store nudge or offer is a subordinate, dismissible line; it never gates the
  next-level/retry tap or delays the win.
- **Timing tokens** 150–300ms / ≤400ms; reduced-motion static; reuse `THEME.EASE*`.
- **Touch & contrast** — every new button (store nudge CTA, Settings Remove-Ads/Restore, bundle card) ≥44×44px,
  ~100ms press feedback, text ≥4.5:1, safe-area respected. Vector icons, not emoji (the "✦"/"◆" currency glyphs are
  the game's established currency symbols — acceptable; a *new* icon uses `ui/icons.ts`).
- **Honesty & clarity** — value framing is truthful (real savings math), the primary CTA is singular per surface,
  disabled/owned states are visually distinct.

---

## File Structure

**Create:**
- `src/utils/interstitial.ts` (+ test) — pure `isInterstitialEligible(ctx)` cadence/grace/flow decision.
- `src/utils/Ads.test.ts` — tests for the extracted eligibility (currently zero coverage on Ads).

**Modify:**
- `src/config/monetization.config.ts` — add an `INTERSTITIAL` block (gap, first-session grace, flow rules) + a
  `NUDGE`/store-framing block; move `INTERSTITIAL_MIN_GAP_MS` here.
- `src/utils/Ads.ts` — `maybeInterstitial` consumes `isInterstitialEligible`; persist `lastInterstitialMs`; add a
  `source` param to `showRewarded`/rewarded events; emit interstitial-suppressed/capped analytics.
- `src/utils/IAP.ts` — split `purchase` → initiated/completed/failed on the real result; add `first_purchase`.
- `src/utils/analyticsEvents.ts` (+ test) — new/parameterized factories (source, purchase lifecycle, first_purchase,
  shopOpen tab, bundle/tab-view, interstitial suppressed).
- `src/scenes/GameScene.ts` — pass the interstitial context (streak tier / boss / level) into `maybeInterstitial`;
  add the win-overlay "spend your Stardust" store nudge (existing optional-line slot); tag the 2× rewarded `source`.
- `src/scenes/CosmeticsScene.ts` — bundle value/savings framing; locked-cosmetic → Bundles-tab cross-sell nav
  (using the existing `Cosmetic.bundleId`); `shopOpen` tab param + tab-switch/bundle-view events.
- `src/scenes/EndlessScene.ts` — tag the endless 2× / revive rewarded `source`.
- `src/scenes/SettingsScene.ts` — an honest Remove-Ads / Restore shortcut (today it only lives in the Bundles tab).
- `src/scenes/EndScene.ts` — an optional store link.

**Reuse:** the `Analytics.track` seam, `sanitizeParams`, the win-overlay optional-line composition, the existing
`isFirstWin`/`hadPriorProgress` first-time pattern (mirror it for `first_purchase`), `Cosmetic.bundleId`.

---

### Task 1: Interstitial cadence — flow-aware + first-session grace (TDD)

**Why:** today it's a flat 3-min gap with no awareness of the moment; a fresh player's first win is the *least*
protected (non-persisted counter). Make ads respect flow.

**Files:** Create `src/utils/interstitial.ts` (+ `interstitial.test.ts`), `src/utils/Ads.test.ts`; Modify
`monetization.config.ts`, `src/utils/Ads.ts`, `src/scenes/GameScene.ts`.

**Produces:** `isInterstitialEligible(ctx: { now, lastShownMs, isPremium, sessionStartMs, levelsThisSession,
lastWasBossOr3StarOrStreak }): boolean` — pure; `INTERSTITIAL` config block.

- [ ] **Step 1 — failing tests** (`interstitial.test.ts`): premium → never; within the min-gap → never; within
  first-session grace (`levelsThisSession < GRACE_LEVELS` or `now-sessionStartMs < GRACE_MS`) → never; right after a
  boss/3★/hot-streak win → never; otherwise, past the gap, mid-session → eligible. Cover each rule at its boundary.
- [ ] **Step 2** run → FAIL.
- [ ] **Step 3** implement `interstitial.ts` (pure) + the `INTERSTITIAL` config block (move `INTERSTITIAL_MIN_GAP_MS`
  from `Ads.ts:18` into config; add `GRACE_LEVELS`, `GRACE_MS`, the flow flags).
- [ ] **Step 4** run → PASS.
- [ ] **Step 5** wire `Ads.maybeInterstitial(ctx)` to consume it; **persist `lastShownMs`** (localStorage, so a cold
  start doesn't reset the cooldown); emit an `interstitialSuppressed(reason)` analytics event on each early return
  (premium/capped/grace/flow) so the cadence is measurable. In `GameScene.advanceAfterWin`, pass the context
  (streak tier, `isBoss`, stars, session level count). No interstitial logic in the scene — just the context.
- [ ] **Step 6** `tsc`/`vitest`(176+new)/`build` green; Playwright: win several campaign levels → confirm no
  interstitial attempt in the grace window and none right after a boss/streak (DEV `[analytics]` shows
  `interstitial_suppressed{reason}`); zero console errors. Commit.

---

### Task 2: Rewarded value props + per-surface analytics (TDD)

**Why:** 4 rewarded surfaces all emit param-less `rewarded_shown`/`rewarded_earned` — indistinguishable in
analytics; and there's no "offer shown" step to measure offer→tap→complete.

**Files:** Modify `src/utils/analyticsEvents.ts` (+ test), `src/utils/Ads.ts`, `src/scenes/GameScene.ts`,
`src/scenes/CosmeticsScene.ts`, `src/scenes/EndlessScene.ts`.

**Produces:** `rewardedShown(source)`, `rewardedEarned(source)`, `rewardedOffered(source)` (offer button rendered).

- [ ] **Step 1 — failing tests** (`analyticsEvents.test.ts`): the three factories sanitize the `source` string
  (mirrors `fragmentEarned(amount, source)`).
- [ ] **Step 2-4** TDD the factories; thread a `source: string` through `Ads.showRewarded(source)` to the two events.
- [ ] **Step 5 (playtested UX)** wire `source` at all 4 sites (`'campaign_2x'`, `'endless_2x'`, `'endless_revive'`,
  `'free_fragments'`); emit `rewardedOffered(source)` where each offer button renders (e.g. `GameScene.ts:1274`
  `if (showDouble)`; `CosmeticsScene` free-fragments card; `EndlessScene` pills). Strengthen copy per the ui-ux lens
  — emphasize the "2×", and tie the campaign 2× to the streak ("keep the streak going: 2× ✦"). All still opt-in.
- [ ] **Step 6** gates green; Playwright: trigger the campaign 2× offer → `rewarded_offered/shown/earned{source:
  campaign_2x}` all fire; free-fragments → `{source: free_fragments}`; zero errors. Commit.

---

### Task 3: IAP funnel — purchase lifecycle + first-purchase analytics (TDD)

**Why:** `purchase` fires at *attempt* → measures taps not revenue; no `first_purchase`; no bundle-intent signal.

**Files:** Modify `src/utils/analyticsEvents.ts` (+ test), `src/utils/IAP.ts`, `src/scenes/CosmeticsScene.ts`.

**Produces:** `purchaseInitiated(product)`, `purchaseCompleted(product)`, `purchaseFailed(product, reason)`,
`firstPurchase(product)`, `shopOpen(tab)`, `bundleViewed(id)` / `storeTab(tab)`.

- [ ] **Step 1 — failing tests**: the lifecycle factories + `firstPurchase` shape correctly (product sanitized).
- [ ] **Step 2-4** TDD the factories; in `IAP.buyRemoveAds`/`buyBundle`, emit `purchaseInitiated` at entry and
  `purchaseCompleted`/`purchaseFailed` gated on the real `ok` boolean already available (`IAP.ts:83,107` etc.). On
  the first-ever completion, emit `firstPurchase` using a persisted flag (mirror `seenFirstWin`/`hadPriorProgress`).
- [ ] **Step 5 (playtested)** `shopOpen(this.tab)` (tab is known at `create()`); a `storeTab(tab)` event on tab
  switch (`CosmeticsScene.ts:99`) — the Bundles-tab switch is the strongest IAP-intent signal.
- [ ] **Step 6** gates green; Playwright (web stub): buy a bundle → `purchase_initiated` then `purchase_completed`
  (+ `first_purchase` once); open store on Bundles → `shop_open{tab:bundle}`; zero errors. Commit.

---

### Task 4: Store discoverability + bundle framing + cross-sell (playtested UX)

**Why:** the store's ONLY entry point is the menu icon; the win flow awards Stardust every win but never nudges
spending it; bundle cards lack value framing; tapping a locked bundle-cosmetic doesn't route to its bundle.

**Files:** Modify `src/scenes/GameScene.ts` (win-overlay spend nudge), `src/scenes/CosmeticsScene.ts` (bundle
framing + cross-sell nav), `src/scenes/SettingsScene.ts` (Remove-Ads/Restore shortcut), `src/scenes/EndScene.ts`
(store link), `src/config/monetization.config.ts` (nudge copy/thresholds).

- [ ] **Step 1 (win-overlay spend nudge):** occasionally (config cadence, campaign, not first-win, mutually
  exclusive with the existing optional lines) show "you've earned **N ✦** — dress up your star" routing to the
  store. Honest, subordinate, dismissible, reduced-motion-safe, ≥4.5:1. Uses the existing optional-line slot.
- [ ] **Step 2 (bundle framing):** on `bundleCard`, add truthful value framing (e.g. the count/rarity of cosmetics
  + "Remove Ads" for premium bundles) and a single "best value"/"most popular" tag on ONE bundle — no fake savings.
- [ ] **Step 3 (cross-sell nav):** tapping a locked `acquire:'bundle'` cosmetic navigates to the Bundles tab and
  highlights its bundle (`Cosmetic.bundleId` already exists) instead of the generic shake.
- [ ] **Step 4 (honest shortcuts):** a Remove-Ads + Restore entry in `SettingsScene` (today only in Bundles tab —
  Restore is a store requirement worth surfacing); an optional store link on `EndScene`.
- [ ] **Step 5** gates green; Playwright: the spend nudge appears (campaign, non-first-win) and routes to the store;
  a locked bundle-cosmetic tap opens Bundles; Settings shows Remove-Ads/Restore; contrast/reduced-motion/44px pass;
  zero errors. ui-ux checklist sign-off. Commit.

---

### Task 5: Wave Verification & Finish

- [ ] Full gate: `tsc` · `vitest` (176 + new interstitial/analytics/IAP tests) · `build`.
- [ ] Playwright monetization-flow smoke: interstitial respects grace + flow (suppressed analytics fire, none after
  boss/streak); rewarded offers tagged per-surface; purchase lifecycle (initiated→completed / first_purchase);
  store nudge + cross-sell nav + Settings shortcut; **zero console errors**; DEV `[analytics]` shows the full ad/IAP
  funnel.
- [ ] **No-P2W audit:** confirm every new sink is cosmetic/Remove-Ads only; no gameplay field added; rewarded stays
  opt-in; Remove-Ads copy honest. **Web-safe audit:** no native import outside `isNativePlatform()`; web build
  firebase/admob/RC-free.
- [ ] Reduced-motion + 44px + 4.5:1 pass on every new element; ui-ux-pro-max checklist sign-off.
- [ ] Finish via superpowers:finishing-a-development-branch; update `docs/project-status.md` + reconcile
  `docs/store/monetization-review.md`.

---

## Self-Review (writing-plans checklist)

**Spec coverage:** interstitial cadence/cap flow-safety → **Task 1**; rewarded value props + per-surface measurement
→ **Task 2**; IAP funnel discoverability + first-purchase + bundle framing + honest Remove-Ads → **Tasks 3–4**;
analytics to measure ad/IAP performance → **Tasks 1–3** (+ each task instruments its own). ✅

**Grounded:** every anchor verified against the monetization recon (2026-07-01) — the interstitial call site, the
`purchase`-on-attempt bug, the param-less rewarded events, the single store entry point, the `Cosmetic.bundleId`
cross-sell field, the no-P2W structural guarantee.

**Risks pre-empted:** no-P2W + web-safe are Global Constraints + a dedicated audit step; the "measure completion not
taps" fix is Task 3; "ads never interrupt a satisfying moment" is the core of Task 1 (grace + flow + persistence).

**Open scoping questions for approval:**
1. **Wave size** — 4 feature tasks. Split? (3a: measurement + cadence Tasks 1–3 → then 3b: discoverability/framing
   Task 4.) *(recommend split — ship the flow-safety + measurement first, then the discoverability nudges.)*
2. **Interstitial aggressiveness** — with test ids you can't feel real ads; the grace/flow defaults are conservative
   guesses. Ship conservative and tune from live data (per `monetization-review.md`)? *(recommend yes.)*
3. **Win-overlay spend nudge cadence** — every Nth win? only when the player can afford something? *(recommend
   "can-afford-something" + a cooldown, so it's helpful not naggy.)*
4. **First-purchase incentive** — measure only (this wave), or also a one-time bonus-Fragments nudge? *(recommend
   measure-only now; a first-purchase Supporter framing is a documented post-launch lever.)*

---

## Execution Handoff

New branch `feat/wave3-monetization` (after Wave 2b merges). Subagent-driven-development, gates + ui-ux lens after
each task. **DRAFT — awaiting wave-level approval + the scoping answers above before any code is written.**
