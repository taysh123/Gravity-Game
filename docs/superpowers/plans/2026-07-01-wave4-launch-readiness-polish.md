# Wave 4 — "Launch-Readiness Polish" Implementation Plan (DRAFT — awaiting wave-level approval)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development — one implementer + one
> independent reviewer per task, gates after each. Steps use checkbox (`- [ ]`). This wave is **media/ops +
> copy**, not gameplay code — the deliverables are verified by **running the capture pipeline and observing the
> output** (superpowers:verification-before-completion), not unit tests. Every visual asset passes the
> **ui-ux-pro-max lens** (ASO framing, contrast, safe-area) before it's called done.

**Goal:** Refresh the ASO/media package so the store listing *shows the new juice* (Waves 1–3: living FX + tiered
celebrations, win-streaks + milestone/daily-reward retention, honest store framing) — regenerate the capture
pipeline, verify the package is Play-compliant, honestly reconcile the listing copy, and surface the remaining
**external-account/device launch gates as a checklist** (do NOT attempt them).

**Architecture:** Additive to the existing reproducible capture pipeline (`scripts/capture_media.py` →
`capture_frames.py` → `assemble_gifs.mjs` → `curate_media.mjs`). Update the localStorage SEED for the new
Wave 2–3 stores, add capture targets for the new "wow" moments, regenerate + curate, and reconcile
`docs/store/*` copy. No gameplay code changes; no new dependency.

**Tech Stack:** Python Playwright (capture) · Node (GIF assembly/curation) · the existing DEV `window.__game` hook.

---

## Global Constraints

- **The game code is FROZEN for this wave** — Wave 4 touches only `scripts/*`, `docs/media/*`, `docs/store/*`
  (and `docs/*` status). No `src/` gameplay change. (If a capture reveals a genuine visual bug, file it — don't
  fix gameplay under a media wave without surfacing it first.)
- **Honesty in ASO copy** (carries the monetization philosophy): the listing may mention the new retention
  features (daily rewards, win streaks, celebrations) only where **truthful**. No overclaiming, no fake ratings,
  no "award-winning", no feature that doesn't exist. Cosmetic/Remove-Ads only; never imply P2W.
- **Play-compliance is non-negotiable:** Google Play screenshots at **1080×2160** (the `android` profile), 2–8
  screenshots, correct format; the icon (512, 32-bit) + feature (1024×500) unchanged unless re-approved.
- **Reproducibility:** the pipeline must stay one-command reproducible (`docs/media/README.md` regen steps);
  raw dumps stay gitignored (`docs/media/raw/`), only curated finals committed.
- **Do NOT attempt external-account/device work** — Play Console, real AdMob ids + UMP, RevenueCat
  key/product/entitlement, and the device 1★ fairness playtest are the user's gates. Surface them as a checklist.
- **No new dependency.** Quality bar per commit: the pipeline runs clean, captures render with **zero console
  errors**, and the committed asset set is complete + correctly sized.

---

## Design Lens (ui-ux-pro-max — ASO/media)

- **Lead with the verb + spectacle** — the first screenshot leads with the mechanic ("Hold to pull") or the new
  spectacle (a 3★ celebration / living world); the funnel is hook → mechanic → spectacle → replay → depth.
- **One accent glow per shot, caption in the top third, safe-area respected** (per `docs/store/aso.md §2`).
- **Contrast ≥4.5:1** for any burned-in caption; **no debug/empty/duplicate frames**; show *earned* progress
  states (the SEED presents a polished save).
- **The new juice must be legible in a still** — a bloom-lit 3★ moment, a `×5 BLAZE` streak flourish, a milestone
  toast, the DAILY REWARD chest, the store's honest BEST VALUE framing.

---

## File Structure

**Modify:**
- `scripts/capture_media.py` — update the SEED for new Wave 2–3 localStorage keys; add capture targets for the new
  moments (living-FX gameplay, 3★ celebration, streak flourish, milestone toast, daily-reward chest, store framing).
- `scripts/capture_frames.py` — add/refresh GIF frame sequences for a celebration + a streak build (show motion).
- `scripts/curate_media.mjs` — include the new stills/GIFs in the curated finals; retire superseded frames.
- `docs/media/README.md` — update the capture date, inventory, captions, and the "strongest selling points" table
  to include the new retention/juice.
- `docs/store/assets/screenshots/` + `docs/media/store/android/` — the refreshed committed Play set.
- `docs/store/listing.md` + `docs/store/aso.md` — honestly reconcile copy (daily rewards, streaks, celebrations).
- `docs/store/release-notes.md` — a truthful "what's new" for the feel/retention/monetization polish.
- `docs/LAUNCH-READINESS.md` + `docs/project-status.md` — reflect the media refresh + the standing external gates.

---

### Task 1: Refresh the capture SEED + add new-juice capture targets

**Files:** `scripts/capture_media.py`, `scripts/capture_frames.py`.

- [ ] **Step 1 — audit the SEED against the current stores.** Confirm every localStorage key the SEED writes
  matches the live `src/utils/*Store.ts` shapes AFTER Waves 2–3. New/changed keys to seed:
  - `gravity-flow:streak:v1` → a live win-streak (e.g. `{current:5,best:9}`) so a `×5 BLAZE` streak flourish
    renders on a win-overlay capture.
  - `gravity-flow:daily` → add the Wave 2b login fields the SEED lacks (`loginStreak`, `lastLoginDate`,
    `freezeCount`) so the **DAILY REWARD chest** shows *claimable* and the **streak-protection** indicator shows.
  - `gravity-flow:settings` (NOTE: the live key is `gravity-flow:settings`, not the SEED's current
    `gravity-flow:settings:v1` — verify + fix this pre-existing mismatch) with `seenTutorial:true` **and**
    `seenFirstWin:true` so the FTUE beat/coach-mark don't intrude on gameplay frames.
  - `gravity-flow:rewards:v1` → leave `login:<today>` UNclaimed so the chest reads claimable.
  Verify each against source; a wrong key = a stale/empty capture.
- [ ] **Step 2 — add capture targets** (new `START`/screenshot steps) for the moments Waves 1–3 added:
  - **Living gameplay** — a world with the richest living background + a held attractor (tendrils/lensing) +
    comet, for a "premium in motion" still.
  - **3★ celebration** — drive a win to the tiered `perfect`/boss celebration (bloom + star row + PERFECT!);
    force it via the `__game`/`__Phaser` hooks the other capture steps already use.
  - **Win-streak flourish** — the win overlay showing the `×5 BLAZE` streak indicator (seeded streak).
  - **Milestone toast** — a star-milestone / collection-complete celebration toast.
  - **Daily reward + streak protection** — the MainMenu with the gold DAILY REWARD chest + "protected" indicator.
  - **Honest store framing** — the Bundles tab showing the value lines + the single BEST VALUE tag.
- [ ] **Step 3 — run + observe:** `npm run dev`, then `python scripts/capture_media.py android` — confirm each new
  target renders (open the raw PNGs), **zero console errors** in the run, correct 1080×2160 output. Iterate the
  seed/targets until each new moment is captured cleanly. Commit the script changes.

---

### Task 2: Regenerate GIFs + curate + verify Play-compliance

**Files:** `scripts/capture_frames.py`, `scripts/assemble_gifs.mjs` (if needed), `scripts/curate_media.mjs`,
`docs/media/**`, `docs/store/assets/screenshots/**`.

- [ ] **Step 1 — GIFs:** refresh/add frame sequences (a celebration escalation + a streak build) via
  `capture_frames.py` → `assemble_gifs.mjs`; observe the output GIFs actually show the motion, size is reasonable
  (lean — the repo's asset-budget discipline), reduced-motion not required for marketing GIFs.
- [ ] **Step 2 — curate:** run `curate_media.mjs`; select the new stills/GIFs into the committed finals
  (`docs/media/{store,github,portfolio,linkedin}`), retire superseded frames. Keep the Play set to a strong 6–8.
- [ ] **Step 3 — verify the package:** confirm every committed Play screenshot is exactly **1080×2160**, count is
  2–8, no debug/empty frames, captions legible (≥4.5:1) and safe-area-clear; the icon/feature graphic unchanged;
  `docs/media/README.md` inventory matches the committed files. Commit the curated finals + README.

---

### Task 3: Honestly reconcile the listing + ASO + release notes

**Files:** `docs/store/listing.md`, `docs/store/aso.md`, `docs/store/release-notes.md`.

- [ ] **Step 1 — listing/ASO copy:** weave in the new, TRUTHFUL selling points where they strengthen the funnel —
  living-cosmos feel, satisfying celebrations, **daily rewards + streaks** (retention), a fair **cosmetic-only**
  store (no P2W). No overclaiming, no invented features, no fake proof. Update the screenshot captions to match
  the refreshed set.
- [ ] **Step 2 — release notes:** a concise, honest "what's new" entry for the feel/retention/monetization polish
  (Waves 1–3) suitable for the Play "What's new" field.
- [ ] **Step 3 — self-review for honesty:** re-read every added claim against what the game actually does; delete
  anything not literally true. Commit.

---

### Task 4: External-gate checklist + finish

**Files:** `docs/LAUNCH-READINESS.md`, `docs/project-status.md` (+ finish the branch).

- [ ] **Step 1 — reconcile the launch docs:** update `LAUNCH-READINESS.md` + `project-status.md` to reflect the
  refreshed media package, the current test count, and the Waves 1–3 feature additions (feel/retention/monetization).
- [ ] **Step 2 — surface (do NOT attempt) the external gates as a single actionable checklist:**
  - **[Play Console]** create/finish the app, App-content forms, paste the refreshed listing + upload the refreshed
    screenshots, tracks, billing products (`remove_ads` + the 3 bundles), upload the signed AAB.
  - **[AdMob]** real app + rewarded/interstitial ad-unit ids → `monetization.config.ts` + `AndroidManifest.xml`;
    configure the **UMP consent** message.
  - **[RevenueCat]** public SDK key + Remove-Ads product + `premium` entitlement → `monetization.config.ts`.
  - **[Device]** the **1★ fairness playtest** + on-device ad/IAP/Restore/Analytics(DebugView)/Crashlytics smoke,
    and — new — a device pass on the Wave 1–3 additions (celebration feel, streak, daily reward, interstitial
    cadence, store nudge) on a real mid-range Android at 60fps.
  - **[AAB]** rebuild the signed AAB so it includes Waves 1–3 (the last build was 2026-06-16, pre-Waves 1–3): the
    runbook in `docs/release-android.md` (Android Studio JBR / JDK 21).
- [ ] **Step 3 — finish** via superpowers:finishing-a-development-branch.

---

## Self-Review (writing-plans checklist)

**Spec coverage** (engagement Wave 4 → task): ASO screenshot/GIF capture refresh showcasing the new juice →
**Tasks 1–2**; verify the media package → **Task 2 Step 3**; honestly reconcile listing/ASO → **Task 3**; surface
external-account/device gates as a checklist (don't attempt) → **Task 4**. ✅

**Grounded:** the pipeline (`capture_media.py` SEED + profiles + `__game` hook), the curated-finals convention, and
the external gates are all verified against the repo (`scripts/`, `docs/media/README.md`, `docs/LAUNCH-READINESS.md`).
The pre-existing SEED settings-key mismatch (`:v1`) is flagged for Task 1.

**Open scoping questions for approval:**
1. **AAB rebuild** — include the signed-AAB rebuild (Task 4) as a documented runbook step for you to run, or leave
   it entirely to you? *(recommend: document it as a your-side step; it needs the Android Studio JBR on your machine.)*
2. **New App Store (iOS) shots** — refresh the iphone67/ipad profiles too, or Play-only for now? *(recommend
   Play-only now; iOS remains macOS-gated and ~10% ready.)*
3. **GIF scope** — 1 hero GIF (celebration) or 2–3 (celebration + streak + living world)? *(recommend 2: a 3★
   celebration + a living-world/attractor loop — the two most "wow" in motion, kept lean.)*

---

## Execution Handoff

New branch `feat/wave4-launch-media` (after Wave 3 merges). Subagent-driven-development; verify by running the
pipeline + observing output (not unit tests); ui-ux/ASO lens on every asset. **DRAFT — awaiting wave-level
approval + the scoping answers before any work.**
