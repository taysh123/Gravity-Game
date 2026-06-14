# Session Handoff — GRAVITY FLOW

**30-second resume card. 🚀 Launch command-center: [`docs/LAUNCH-READINESS.md`](./LAUNCH-READINESS.md)
(full audit + roadmaps + next actions). Full detail: [`docs/project-status.md`](./project-status.md).
Release checklists: [`docs/release-prep.md`](./release-prep.md).**

---

## Current status (one screen)
- **Game:** GRAVITY FLOW by **True Story Labs** — cosmic physics puzzler (Phaser 3 + TS + Vite).
  **NOW 150 levels / 15 worlds** (2026-06-14 expansion; was 56/8). All 7 mechanics; Worlds 9–15 are new
  combination/tension/mastery worlds (no new engine code). Plan of record + curation catalog:
  `docs/superpowers/plans/2026-06-14-expansion-150.md`.
- **Verified:** tsc + 103 tests + build green; all 150 boot with zero console errors
  (`scripts/smoke_levels.py`). Reward-flair polish done (cosmetic **unlock fanfare** + COLLECTION COMPLETE).
- **PRESENTATION (premium pass, built):** world progression is now a **journey, not a list** —
  `WorldMapScene` (the "Star Map": 15 worlds as glowing nodes on a constellation path, per-world
  accent/roman/tally/locks, auto-centres on your world); `LevelSelectScene` refactored to a **themed
  per-world panel** (`init({world})`, recoloured cosmos + roman/subtitle header); **`warpToScene`** cinematic
  warp (star-streaks + accent bloom) entering a world / from the menu (reduced-motion → fade). Menu LEVELS →
  **WORLDS** (Star Map). Future-growth seams documented in `docs/growth-architecture.md`.
- **Endless re-tune (v3, faster):** `ENDLESS_SCROLL_BASE 76 / ACCEL 4.0 / MAX 250 / ONBOARD 3500 /
  SPAWN_AHEAD 480` — a real adrenaline climb (~76→234 px/s over a ~45s run), still fair (start grace +
  safe-lane chunks). Verified ramp = 183 px/s at 30s.
- **GRAVITY RUN (endless flagship, built + v2 tuned):** `EndlessScene` — camera-scroll vertical climb
  reusing every campaign entity. **Two modes** via a `RunSelectScene` hub off the GRAVITY RUN menu entry:
  **Endless** (fresh random seed every attempt → different run each time; local all-time best
  `Leaderboard.bestEndless`) and **Weekly Challenge** (fixed `weekKey` seed → shared **weekly leaderboard**
  `Leaderboard.submitRun/bestRun`). RUN OVER overlay: **RETRY** (instant restart), Revive (rewarded, off the
  ranked board), 2× Stardust, shareable card (`utils/Share`). **20 handcrafted chunks** with a validator
  (`config/endless/chunks.test.ts`); `generateRun` variety/pacing (tier-0 opener, tension/release, no
  back-to-back id/tag, recency window — TDD in `utils/endless.test.ts`); gentler readable ramp + onboarding
  window + start grace + one-time coach hint (`physics.config ENDLESS_*`). Strategy of record:
  `~/.claude/plans/pure-foraging-fiddle.md`. **Open:** human feel-playtest of the tuned ramp; optional real
  Play Games Services leaderboards (interface ready).
- **MEDIA PACKAGE (built 2026-06-14):** full multi-destination visual package in `docs/media/`
  (Google Play / App Store / GitHub / portfolio / LinkedIn) auto-captured from the 150-level build +
  3 README GIFs; root **`README.md`** rewritten portfolio-grade; Play `docs/store/assets/screenshots/`
  refreshed (Star Map + 150-level). Strategy + inventory + captions: `docs/media/README.md`.
  Regenerate: `scripts/capture_media.py` → `capture_frames.py` → `assemble_gifs.mjs` → `curate_media.mjs`.
- **Open (campaign):** device 1★ fairness playtest (`docs/device-playtest-checklist.md`).
- **Launch:** deferred during the expansion. The store/AAB notes below are pre-expansion — **rebuild the
  AAB** (now also reflects 150 levels) before any upload.
- **Phase:** **Google Play launch engineering** (not gameplay). Code + store assets are ready;
  remaining work is mostly **user-side Play Console + external accounts**.
- **Git:** branch `master`, **synced**, HEAD **`a354492`**. Repo https://github.com/taysh123/Gravity-Game.git
- **Privacy policy (canonical, live target):** **https://taysh123.github.io/Gravity-Game/**
  (this repo's GitHub Pages → `docs/index.html`; source markdown `docs/store/privacy-policy.md`).
- **Signed AAB:** exists at `android/app/build/outputs/bundle/release/app-release.aab` but is
  **STALE** (built 2026-06-10, before UMP consent + the branded icon). **Rebuild before uploading.**

## Done this phase (all committed + pushed)
- **Release signing** via Gradle + gitignored `android/keystore.properties`; upload key
  `gravityflow-upload` (`C:\Keys\gravityflow-upload.jks`, valid to 2051); `signingReport` = Valid.
- **First signed AAB** built + `jarsigner`-verified (now stale — see above).
- **UMP/GDPR consent** before `AdMob.initialize()` (`utils/Ads.ts` + `native/admob.ts`), web-safe.
- **Privacy policy finalized** (markdown + mobile-friendly HTML `docs/index.html`; contact
  `truestorylabs@gmail.com`; Israel governing law; legal/disclaimer/retention clauses).
- **Store assets** (`docs/store/assets/`): 8 screenshots **1080×2160**, **32-bit `icon-512.png`**,
  **`feature-1024x500.png`**, + alternatives; catalog `README.md`.
- **Branded launcher icon** (vortex) replaces the default robot — all densities, adaptive + legacy.
- Firebase real `google-services.json` in place; `tsc` clean, **82 tests**, web build clean.

## Readiness by track
- **Internal Testing:** code/assets READY → blocked only on Pages-live + Play Console setup + AAB rebuild.
- **Closed Testing:** + real AdMob ids, AdMob UMP message, RevenueCat key/product/entitlement, Play
  billing products, on-device ad/IAP/analytics checks, Play's new-account tester window.
- **Production:** + device **1★ fairness playtest**, final data-safety/pricing/countries, submit.

---

## ⚡ Next Session Quick Start

**Current phase:** Google Play launch engineering. Game content-complete; shipping to Play.

**Immediate next tasks (in order):**
1. **Rebuild the signed AAB** so it includes UMP + the branded icon (and any real ids once set):
   ```
   npm install            # if node_modules is missing after a restart
   npm run build
   npx cap sync android
   cd android; ./gradlew bundleRelease   # -> app/build/outputs/bundle/release/app-release.aab
   ```
2. **[User]** Confirm **GitHub Pages** is live (Settings → Pages → source **`master` / `/docs`**) and
   that **https://taysh123.github.io/Gravity-Game/** renders the styled policy.
3. **[User · Play Console]** Create the app → **App content** (paste privacy URL, data safety, content
   rating, ads declaration, target audience) → **Main store listing** (text from `docs/store/listing.md`
   + upload `icon-512.png` / `feature-1024x500.png` / the 8 screenshots) → **Internal testing** release
   → upload the rebuilt AAB → add testers → roll out.
4. **[Device]** Smoke-test + the **1★ fairness playtest** on the internal build.

**Required external actions:**
- **Play Console** ($25 acct exists): app creation, App-content forms, store listing, tracks, billing products, uploads.
- **AdMob:** real app + rewarded/interstitial ids; configure the **UMP "Privacy & messaging"** consent message.
- **RevenueCat:** public SDK key; **Remove-Ads** product + **`premium`** entitlement.
- **Firebase:** done (`google-services.json` in `android/app/`); optionally verify DebugView/Crashlytics on device.

**Files/commands likely needed next:**
- `docs/release-android.md` (signing + AAB runbook) · `docs/release-prep.md` (track checklists) ·
  `docs/store/listing.md` + `docs/store/aso.md` (listing copy) · `docs/store/assets/` (graphics).
- `config/monetization.config.ts` + `android/app/src/main/AndroidManifest.xml` (drop in real AdMob/RC ids).
- Local regeneration (no accounts): `scripts/capture_store_shots.py` (screenshots),
  `scripts/gen_brand_assets.py` + `scripts/finalize_brand.mjs` (icon/feature),
  `scripts/gen_launcher_icons.py` + `npx @capacitor/assets generate --android` (launcher icon).

**Conventions:** keep `tsc`/tests/build green; verify in-browser (`npm run dev` + Playwright
`--disable-gpu --use-gl=swiftshader`); commit per milestone and `git push`; never commit
`keystore.properties`/`*.jks`/`google-services.json` (all gitignored).

## Known issues / watch-outs
- ⚠️ **AAB stale** — rebuild before any upload (step 1).
- **Pages must serve from `/docs`** or the canonical URL hits the game, not the policy.
- **Jekyll exposure:** `/docs` Pages publishes all internal docs (no secrets, but public) — optional `docs/.nojekyll`.
- **Working tree (uncommitted):** `docs/store/assets/icon-concepts/vortex.png` deleted (concept cleanup;
  the *final* `icon-512.png` is unaffected) + `android/.idea/*` churn — decide whether to commit/ignore.
