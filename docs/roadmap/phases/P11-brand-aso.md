# P11 — Brand, ASO & Store Conversion

**Status:** PLANNED · **owner-gated (D-19)**. Prep tasks run in M1 (EXECUTION-ORDER step 14); the rename switch waits for 👤 · baseline `master @ d3c6aab` · 2026-10-07

> **Conforms to:**
> - D-19: no rename before the owner's choice and a trademark knockout; one `BRAND` config.
> - D-17: no "leaderboard" copy until boards ship.
> - D-25: 13+ audience, non-childish marketing.
> - D-27: level count is an outcome.
> - D-16: the website hosts `assetlinks.json` for P9.
> - D-20: release engineering, consumed by P12.
>
> Checklist with exact Console answers: [`../../launch/STORE-LAUNCH-PLAN.md`](../../launch/STORE-LAUNCH-PLAN.md). Name candidates: `docs/launch/NAMING-STUDY.md` (written separately).

## 1. Summary
P11 turns the working-title prototype listing into an honest, high-converting store presence, and makes the eventual name change a **single, gated switch**. It has five parts:

1. **One `BRAND` config** (`src/config/brand.ts`). Every user-visible name surface reads it: splash, menu, End, share text, the HTML `<title>`, Android `strings.xml` and Capacitor `appName`. A sync/check script plus a "brand-leak" test keep the surfaces honest.
   - The config starts at `status: 'working-title'` with today's exact strings, so nothing is renamed.
   - The owner's decision flips one file. Production preflight (P12) refuses to ship while `status` is still `working-title`.
2. **Store copy as data:** per-locale JSON, tested for Play's limits, banned terms and the D-17 leaderboard rule, with numbers matched to `LEVELS` and `WORLDS`.
3. **Store creative v1:** 8 portrait 9:16 screenshots with baked captions (verb first), a feature graphic, a text-free icon with a monochrome layer, and a 20–30 s promo video. All of it is shot after the P5-A render fix.
4. **A developer website at a domain root**, hosting the privacy policy, support, delete-data, `app-ads.txt` and (for P9) `assetlinks.json`.
5. **Localization and experiments:** listing localization in waves, then store-listing experiments once traffic allows.

## 2. Scope
| Aspect | Detail |
|---|---|
| **Systems** | Brand config and its consumers; logo/icon/splash assets; store listing copy (en-US + locales); screenshot capture and caption pipeline; feature graphic; promo video; asset spec checker; website repo (policy, support, delete-data, app-ads.txt, assetlinks host); store-listing experiments and custom store listings |
| **Dependencies** | 👤 **D-19 name choice + trademark knockout (US/EU/IL)** for T14. **P5-A** (step 12: bright render, transparent logo re-export, hint chip) before any capture. **P4-α** (step 13: W1–3 content on screen). **P0 step 5** (honest copy, Data-safety and privacy drafts). **P0 step 4** (the Settings privacy row reads `BRAND.privacyUrl`). P6 Daily for screenshot 6 (fallback: Star Map). P12 preflight consumes `brand:check --release`. P9 consumes the website. |
| **Difficulty** | Engineering **L** · design **H** · QA **L** |
| **Risk** | (1) Trademark: a cease-and-desist after launch forces a rename that loses brand search equity (D-19). Mitigation: decide before production; studio-level domain. (2) Creative undersells the game: re-shoot after P5-A, then run experiments. (3) Copy drift: the claims change as P4/P6/P8 land. Mitigation: `storeCopy` test, numbers from data. (4) Ask Play summarises a stale website: the site mirrors the listing facts. |
| **Upside** | High. Installs are the binding constraint. The first 2–3 frames decide most conversions [UX§7]. AdMob serving requires a verified app-ads.txt. |
| **Success metrics** | Store listing conversion **≥ 30%** (organic visitors → installers, Console → Store performance). A winning first-two-screenshots experiment. **app-ads.txt "Verified"** in AdMob. 0 brand literals outside `brand.ts` (test). `storeCopy` and `store:check` green in CI. Name decision recorded **before** the first production listing. |
| **Must NOT do yet** | Rename any user-visible string, file or asset before 👤 D-19. Buy a game-name domain before D-19. Paid UA at scale. Capture store creative before P5-A and P4-α. Write "leaderboard" in any copy (D-17). Localize in-game text (English-only for 1.0). Change the package id, `gravity-flow:*` localStorage keys, `androidScheme`/`hostname` (D-11), the Firebase project, product ids or analytics event names. Rename the studio. Open pre-registration. |

## 3. Architecture plan

### 3.1 `BRAND`: the single source of truth for every name surface
```ts
// src/config/brand.ts  (pure data, erasable TS only: Node 24, the local toolchain, imports it natively with
// type stripping, so brand-sync.mjs needs no build step; CI moves to Node 24 in P12-T04)
export type BrandStatus = 'working-title' | 'final';
export interface BrandDecision { ref: 'D-19'; date: string; tmKnockout: string } // e.g. "attorney memo 2026-11-02"
export const BRAND = {
  status: 'working-title' as BrandStatus,
  decision: null as BrandDecision | null,      // must be non-null when status === 'final'
  name: 'Gravity Flow',                         // title case: store, HTML <title>, share title
  wordmark: 'GRAVITY FLOW',                     // in-game display wordmark (EndScene, splash text)
  launcherLabel: 'GRAVITY FLOW',                // Android app_name / title_activity_main (≤ 12 chars)
  storeTitle: 'Gravity Flow: Physics Puzzle',   // ≤ 30 chars
  tagline: 'Bring the lost star home.',
  studio: 'True Story Labs',                    // not part of the rename
  contactEmail: 'truestorylabs@gmail.com',
  websiteUrl: '',                               // set in P11-T06 (domain root)
  privacyUrl: 'https://taysh123.github.io/Gravity-Game/',
  modes: { run: 'GRAVITY RUN' },                // mode label; may survive a rename
} as const;
```

**Consumers:**

| Surface | Today ([REPO]) | After P11-T01/T02 |
|---|---|---|
| End screen title | `SPLASH.GAME_TITLE` (`src/config/splash.config.ts:9`) → `EndScene.ts:34` | `GAME_TITLE: BRAND.wordmark` (re-export, so call sites don't change) |
| Splash / menu logo | `IMAGES.gravityFlowLogo` (`src/config/assets.ts`) → `IntroSplashScene.ts:200,222`, `MainMenuScene.ts:98` | Unchanged path in T01. The rename PR swaps the PNG (and may move it to `assets/brand/`). |
| Share title | `'GRAVITY FLOW'` default (`src/utils/Share.ts:13`) | `BRAND.name` |
| Gravity Run label / share text | `MainMenuScene.ts:178`, `RunSelectScene.ts:33`, `EndlessScene.ts:497` | `BRAND.modes.run` |
| HTML `<title>` | `Project Gravity` (`index.html:6`), which is stale | A Vite `transformIndexHtml` plugin in `vite.config.ts` injects `BRAND.name`. This aligns the tab title with the working title; it is **not** a new name. |
| Android label | `app_name` / `title_activity_main` = `GRAVITY FLOW` (`res/values/strings.xml`) | Written by `scripts/brand-sync.mjs` |
| Capacitor `appName` | `'GRAVITY FLOW'` (`capacitor.config.ts`) | Literal between `/* brand:appName */` markers, written by brand-sync. This avoids relying on the Capacitor CLI resolving relative TS imports (INFERRED risk). |
| Launcher icon / splash | `res/mipmap-*`, `res/drawable*/splash.png` | Regenerated from masters with `npx @capacitor/assets generate --android`, plus a hand-added `<monochrome>` layer |
| Store copy | `docs/store/listing.md` (prose) | `docs/store/listing/<locale>.json`. The tests assert the title equals `BRAND.storeTitle` and the copy names `BRAND.name`, so a rename that forgets the copy fails CI. |
| Policy / website | `docs/index.html`, `docs/store/privacy-policy.md` | Website repo pages (P11-T06). The policy source stays in the game repo. |

**Gate mechanics (the "single switch"):**
- `brand.test.ts` enforces three things:
  1. while `status === 'working-title'`, `name` stays `'Gravity Flow'` and `decision` stays `null`, so a partial rename is impossible;
  2. `status === 'final'` requires a complete `decision`;
  3. `storeTitle.length ≤ 30` and `launcherLabel.length ≤ 12`.
- `npm run brand:check` verifies that every generated surface matches `BRAND` (CI, every push).
- `brand:check --release` additionally fails when `status !== 'final'`. P12's production preflight calls it, so **production cannot ship on an undecided name**. Internal and closed tracks may ship the working title.
- **Rename = one PR (P11-T14):** edit `brand.ts`, drop new masters into `assets/`, run `npm run brand:sync` and `npx @capacitor/assets generate`, re-capture the name-bearing creative (feature graphic, video end card, any frame showing the wordmark), update the listing JSON and the website. **Keep path:** the owner keeps "Gravity Flow", so set `status: 'final'` plus `decision`, and nothing else changes.

### 3.2 Store copy as data
- `docs/store/listing/en-US.json` = `{ locale, title, shortDescription, fullDescription }`, with real `\n` paragraphs and no hard wraps.
- `src/config/storeClaims.ts` = `{ onlineLeaderboards: false, zenMode: false }`. P8 flips `onlineLeaderboards` when Play Games Services boards ship (D-17).
- `src/config/storeCopy.test.ts` (vitest, node environment) reads every locale JSON, `docs/store/release-notes.md` and `README.md`, and checks:
  - **Limits:** title ≤30, short ≤80, full ≤4000, each release-notes block ≤500.
  - **Title rules:** no emoji; no ALL-CAPS word longer than 2 characters; no banned words in title or short description (`free|#1|best|top|new|sale|download`).
  - **D-17:** no `/leaderboard/i` anywhere while `onlineLeaderboards` is false. No "relaxing" while `zenMode` is false.
  - **Numbers:** `/(\d+) levels/` must equal `LEVELS.length`, `/(\d+) worlds/` must equal `WORLDS.length`, and the mechanics count must equal 7 (D-27: counts come from data).
  - **Anti-stuffing:** no keyword more than 4 times in the full description.
- `docs/store/listing.md` becomes a short rationale pointing at the JSON.

### 3.3 Creative pipeline
**Capture.** Reuse the existing web-build capture approach (`scripts/capture_media.py` → `scripts/curate_media.mjs`). Move the store driver to a **tracked** `scripts/store/capture_store_shots.py`. `.gitignore` ignores only top-level `scripts/*.py`, so a subfolder file is tracked [REPO].
- Shots are staged by input replay. Once P1's input-log replay exists, use it so frames are reproducible.
- The fallback is a dev-only `?shot=<id>` boot parameter, guarded by `import.meta.env.DEV`.

**Captions.** Composited in a browser so the self-hosted Exo 2 renders: `scripts/store/caption.html` takes the raw frame as background plus a caption band in the top ~18%, and Python Playwright screenshots it at 1080×1920. `scripts/store/finalize-shots.mjs` (sharp, already a devDependency) then flattens it to **24-bit RGB with no alpha**. Captions live in `docs/store/screenshots.<locale>.json`.

**Spec check.** `scripts/store/check-assets.mjs` (`npm run store:check`) asserts:
- icon: 512², 32-bit, ≤1024 KB;
- feature graphic: 1024×500, no alpha;
- screenshots: 2–8 of them, no alpha, long side ≤ 2× short side, and **≥3 at 9:16 and ≥1080×1920**;
- ordered file names `01..08`.

**Storyboard and specs:** STORE-LAUNCH-PLAN §7 (verb → 7 forces → boss → mastery → run → daily → make it yours → honest store).

### 3.4 Website (separate repo)
- **Host (👤 decision):** recommended a **studio domain** (truestorylabs.&lt;tld&gt;), which survives a game rename. The fallback is the user site `taysh123/taysh123.github.io`. App-ads.txt can't verify on a project path [LC§0.4].
- **Layout:**

  | Path | Content |
  |---|---|
  | `/` | Studio + game page with the listing facts (for Ask Play) |
  | `/privacy/` | The policy |
  | `/support/` | Support |
  | `/delete-data/` | Deletion steps (the Data safety "Yes") |
  | `/app-ads.txt` | `google.com, pub-…, DIRECT, f08c47fec0942fa0` |
  | `/.well-known/assetlinks.json` | Added in P9 |
  | `/.nojekyll`, `CNAME` | — |

- **Policy source of truth:** `docs/store/privacy-policy.md`, in the game repo, so any PR that changes data flows updates the policy. `scripts/site/render-policy.mjs` renders it to the site; it adds `marked` as a devDependency.
- **Old URL:** `taysh123.github.io/Gravity-Game/` keeps a meta-refresh page for ≥12 months. Optionally, switch this repo's Pages to an Actions deploy of only that redirect, so internal `docs/*.md` stop being served (audit J.1 exposure). That is an owner decision.

### 3.5 Localization and experiments
- **Locales:** listing JSON per locale, in the order es-419, pt-BR → de-DE, fr-FR → ja-JP, ko-KR → id, tr-TR, hi-IN.
- **Method:** Gemini pre-fill from a CSV, with a person reviewing the title and short description. The brand stays untranslated, and each localized description says "Game text is in English."
- **Experiments:** start after about **1,000 store visitors/week**. One variable at a time, up to 3 variants, ≥7 days each, in the order icon → screenshot 1 → short description → feature graphic.
- **Custom store listings:** by country, for localized creative. Keyword-targeted listings come from the Console's keyword recommendations [LC§5].

## 4. Files/modules affected
| Action | Path | Purpose |
|---|---|---|
| Create | `src/config/brand.ts` | BRAND config (§3.1) |
| Create | `src/config/brand.test.ts` | Gate invariants + brand-leak scan of `src/**/*.ts` string literals (allowlist: `brand.ts`, tests, `gravity-flow:` storage keys) |
| Create | `src/config/storeClaims.ts` | Claim flags (D-17) |
| Create | `src/config/storeCopy.test.ts` | Copy rules (§3.2) |
| Create | `scripts/brand-sync.mjs` | Writes/checks `strings.xml` and the Capacitor `appName` markers. `--check`, `--release`. |
| Create | `docs/store/listing/en-US.json` (+ one per locale later) | Paste-ready copy |
| Create | `docs/store/screenshots.en-US.json` | Frame ids + captions |
| Create | `scripts/store/capture_store_shots.py`, `scripts/store/caption.html`, `scripts/store/finalize-shots.mjs`, `scripts/store/check-assets.mjs` | Creative pipeline + spec check |
| Create | `scripts/site/render-policy.mjs` | Policy md → site HTML |
| Create (external) | Website repo (`taysh123.github.io` or the studio-domain repo) | §3.4 |
| Modify | `src/config/splash.config.ts` | `GAME_TITLE` ← `BRAND.wordmark` |
| Modify | `src/utils/Share.ts` | Default title ← `BRAND.name` |
| Modify | `src/scenes/MainMenuScene.ts`, `src/scenes/RunSelectScene.ts`, `src/scenes/EndlessScene.ts` | `BRAND.modes.run` |
| Modify | `vite.config.ts` | `transformIndexHtml` title plugin |
| Modify | `index.html` | `<title>` placeholder (`%BRAND_NAME%`) |
| Modify | `capacitor.config.ts` | `appName` marker |
| Modify | `android/app/src/main/res/values/strings.xml` | Generated labels |
| Modify | `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`, `ic_launcher_round.xml`, `mipmap-*/*`, `drawable*/splash.png` | Icon v1, `<monochrome>` layer, splash |
| Modify | `assets/images/gravity-flow-logo.png` | Replaced by the P5-A transparent re-export; swapped again only by the rename PR |
| Modify | `docs/store/assets/icon-512.png`, `feature-1024x500.png`, `screenshots/01..08-*.png` | Creative v1 (screenshots become 1080×1920) |
| Modify | `docs/store/listing.md`, `docs/store/aso.md`, `docs/store/assets/README.md`, `docs/store/release-notes.md`, `docs/store/privacy-policy.md`, `docs/index.html`, `README.md` | Honest copy, specs, policy deltas, redirect |
| Modify | `package.json` | Scripts `brand:sync`, `brand:check`, `store:check`, `store:shots`; devDependency `marked` |
| Modify | `.github/workflows/ci.yml` | `brand:check` + `store:check` steps |
| Not modified (guardrail) | `applicationId`/`namespace` (`android/app/build.gradle`), all `gravity-flow:*` keys (`src/utils/*Store.ts`), `IMAGES` keys, analytics names, the Firebase config | Name-neutral internals (D-11, D-19) |

## 5. Data-model changes
- **New types:** `BrandStatus`, `BrandDecision`, `BRAND` (code-level, no persistence). `StoreListing` JSON (`locale`, `title`, `shortDescription`, `fullDescription`). `ScreenshotManifest` JSON (`id`, `file`, `caption`, `setup`). `STORE_CLAIMS`.
- **Player data:** **none.** No save keys change. `gravity-flow:*` localStorage/Preferences keys stay permanently, whatever the final name.
- **Remote Config:** none. Listing experiments run in Play Console, not in the app.

## 6. UI changes
| Surface | Change | Note |
|---|---|---|
| Splash, Main Menu, End | Wordmark/logo read from BRAND/IMAGES; the transparent logo comes from P5-A | No visual change in T01 |
| End/splash text with a longer future name | Use the existing `textFit` helper (title-fit fix `32eeb6b`/`970744f`) so it can't overflow | Verify at the rename |
| Gravity Run labels and share text | `BRAND.modes.run` | — |
| Settings → "Privacy policy" (built in P0) | URL = `BRAND.privacyUrl`, updated to the website in T06 | 48 px target, 4.5:1 contrast |
| Web tab title | "Project Gravity" → `BRAND.name` | Stale-string fix |
| Launcher | Text-free icon v1, monochrome themed icon, label from `launcherLabel` | Check at 48/96 px, light and dark |

## 7. Gameplay changes
None. P11 never touches the sim, levels, scoring, economy or ad timing.

## 8. Test strategy
| Layer | Test | Gate |
|---|---|---|
| Unit | `brand.test.ts`: invariants + brand-leak scan | CI blocking |
| Unit | `storeCopy.test.ts`: limits, banned terms, D-17, numbers = data | CI blocking |
| Script | `brand:check` (generated surfaces match), `store:check` (asset specs) | CI blocking |
| Build | `npx tsc --noEmit`, `npx vitest run`, `npm run build`, `./gradlew assembleDebug` (label/icon resources compile) | MASTER-ROADMAP §6 gates |
| Smoke | Headless boot through every scene with 0 console errors; check the End title and splash after the brand change | Every brand PR |
| Human | Icon legibility at 48/96 px (light/dark launchers); first-3-frames 5-second test with 5 people who don't know the game ("what do you do in this game?") | Before upload |
| Device | Launcher label is not truncated; themed icon renders; splash correct | HUMAN DEVICE TEST |
| Live | Store listing experiments (Console statistics, 90% confidence) | Post-launch |

## 9. Migration
- **Players:** no migration. Display strings only. Saves are untouched, because storage keys and the WebView origin (D-11) never change.
- **Repo:** T01 moves literals into BRAND **without changing any string** except the stale web `<title>`.
- **Listing:** a name change before launch is free. After launch the title can still change (same package, so reviews and installs carry over), but brand-search equity and creative are lost. That is the reason for deciding before production.
- **Website:** the old Pages URL stays as a redirect. Update the Console privacy URL and Website field in the same session the new site goes live.

## 10. Rollback
| Change | Rollback |
|---|---|
| BRAND refactor / rename PR | `git revert` the PR, then `npm run brand:sync` and rebuild. No data impact. |
| Store copy / graphics | Console keeps the previous listing assets. Re-upload the prior PNGs from git history. |
| Experiment variant | Stop the experiment and keep the control |
| Website | Revert the site repo commit. The old Pages URL still works. |
| Localization | Delete the locale's listing translation in Console. It falls back to en-US. |

## 11. Performance
- **Logo PNG:** today it is 316 KB and the studio logo 734 KB [REPO `assets/images`]. The P5-A re-export targets **≤150 KB** via `npm run optimize:assets`; BootScene preloads it, so this cuts cold-start decode.
- **Icon:** ≤1024 KB (Play); in-build mipmaps from `@capacitor/assets`.
- **Runtime:** the BRAND lookups are constants, at zero runtime cost.
- **CI:** `store:check` takes under 5 s with sharp metadata only.

## 12. Platform
- **Android:** the label comes from `strings.xml`. Adaptive icon with a `<monochrome>` layer (Android 13+ themed icons). The splash theme is `AppTheme.NoActionBarLaunch` (`styles.xml`). `strings.xml` `package_name` / `custom_url_scheme` stay `com.truestorylabs.gravityflow`.
- **Web:** `<title>` comes from BRAND. The Vercel build (`gravity-flow-six.vercel.app`) keeps its URL until the owner chooses.
- **iOS (P12 track):** when `ios/` exists, brand-sync also writes `CFBundleDisplayName` and the app store icon (1024², no alpha).

## 13. Documentation
| Doc | Update |
|---|---|
| `docs/store/listing.md`, `aso.md`, `assets/README.md`, `release-notes.md` | Rewrite: JSON pointers, 9:16 spec, the "no caption editor" correction, the correct screenshot order |
| `docs/store/privacy-policy.md` | P1–P10 deltas (STORE-LAUNCH-PLAN §10); new effective date |
| `README.md` | Remove the leaderboard claim and the iOS badge until iOS starts |
| `CLAUDE.md` | One line: "Display name lives in `src/config/brand.ts` (D-19)" (architecture only, no state) |
| `docs/launch/STORE-LAUNCH-PLAN.md` | Flip statuses as items close |
| `docs/roadmap/DECISIONS.md` | The owner flips D-19 to ACCEPTED, with the chosen name and date, **before** T14 merges |
| `docs/STATUS.md` (P0) | Gates: name decision, app-ads.txt verified, creative signed off |

## 14. Validation criteria
| # | Criterion | Label |
|---|---|---|
| V1 | `npx vitest run` passes `brand.test.ts` and `storeCopy.test.ts` | VERIFIED (command output) |
| V2 | `npm run brand:check` exits 0; `brand:check --release` exits non-zero while `status = 'working-title'` | VERIFIED |
| V3 | `npm run store:check` passes: ≥3 shots at 1080×1920 9:16, no alpha, feature 1024×500 RGB, icon 512² ≤1024 KB | VERIFIED |
| V4 | `grep` shows no `GRAVITY FLOW`/`Gravity Flow`/`GRAVITY RUN` string literal in `src/` outside `brand.ts` | VERIFIED |
| V5 | Built `dist/index.html` `<title>` = `BRAND.name`; `strings.xml` `app_name` = `BRAND.launcherLabel` | VERIFIED |
| V6 | app-ads.txt shows **Verified** in AdMob; `https://<root>/app-ads.txt` returns 200 `text/plain` | VERIFIED (curl) + owner screenshot |
| V7 | The privacy page loads from a mobile network, with no geofence | VERIFIED (curl) / INFERRED |
| V8 | Icon readable at 48 px; launcher label not truncated; themed icon correct | HUMAN DEVICE TEST |
| V9 | 5-second test: at least 4 of 5 people name the verb ("hold to pull") from frame 1 | HUMAN TEST |
| V10 | Store conversion ≥30% organic after 4 weeks live | INFERRED until measured (Console) |

## 15. Exact completion definition
P11 is **complete** when all of the following are true:
1. `BRAND.status === 'final'` with a complete `decision` (after 👤 D-19 + trademark knockout), whether the name was kept or changed, and D-19 is marked ACCEPTED in DECISIONS.md.
2. Every name surface derives from BRAND; V1–V5 are green in CI on `master`.
3. The en-US listing is live in Console, matching `listing/en-US.json`, with honest copy (D-17 and every STORE-LAUNCH-PLAN §6.2 delta applied).
4. 8 captioned 9:16 screenshots, the feature graphic, the icon v1 (with a monochrome layer) and a promo video are uploaded and pass V3; the owner has signed them off.
5. The website is live at a domain root, with policy (P1–P10 applied), support, delete-data, and app-ads.txt **Verified** (V6). The Console privacy URL and Website field point at it, and the old URL redirects.
6. At least es-419 and pt-BR listing localizations are live.
7. The experiment backlog (icon, then screenshot 1) is written in `docs/store/aso.md` and ready to start at ~1,000 visitors/week. Running experiments then continues under P12's optimisation loop.

## 16. Task breakdown
| ID | Goal | Files | Tests | Done when |
|---|---|---|---|---|
| **P11-T01** | Centralise names in BRAND with **no visible change** (except the stale web title) | `src/config/brand.ts`, `splash.config.ts`, `Share.ts`, `MainMenuScene.ts`, `RunSelectScene.ts`, `EndlessScene.ts`, `vite.config.ts`, `index.html` | `brand.test.ts` (invariants); boot smoke | Strings render identically; V4/V5 web part green |
| **P11-T02** | Native surfaces + check | `scripts/brand-sync.mjs`, `capacitor.config.ts`, `res/values/strings.xml`, `package.json`, `ci.yml` | `brand:check` in CI; `assembleDebug` | V2 green; CI fails on a hand-edited `strings.xml` |
| **P11-T03** | Brand-leak guard | `src/config/brand.test.ts` | Scan test, with a fixture that proves it catches a literal | V4 enforced in CI |
| **P11-T04** | Store copy as data + rules | `docs/store/listing/en-US.json`, `src/config/storeClaims.ts`, `src/config/storeCopy.test.ts`, `docs/store/listing.md` | `storeCopy.test.ts` | V1 green; today's leaderboard copy fails the test before the fix |
| **P11-T05** | Honest-copy deltas (coordinate with P0 step 5; whichever lands first owns it) | `listing/en-US.json`, `release-notes.md`, `README.md`, `aso.md` | `storeCopy.test.ts` | Every STORE-LAUNCH-PLAN §6.2 row applied |
| **P11-T06** | 👤 Choose host → website repo + policy render + redirect | Site repo; `scripts/site/render-policy.mjs`; `docs/index.html`; `brand.ts` (`websiteUrl`, `privacyUrl`) | curl 200 on `/`, `/privacy/`, `/support/`, `/delete-data/` | V7; Console URLs updated (owner) |
| **P11-T07** | 👤 app-ads.txt live (needs the real AdMob publisher id from P0) | Site repo `/app-ads.txt` | curl `text/plain` | V6 Verified in AdMob |
| **P11-T08** | Icon v1: text-free, monochrome layer, adaptive | `assets/` masters, `docs/store/assets/icon-512.png`, `res/mipmap-*`, `ic_launcher*.xml` | `store:check`; `assembleDebug` | V8 passes on device; owner sign-off |
| **P11-T09** | Screenshot pipeline (tracked) | `scripts/store/*`, `docs/store/screenshots.en-US.json`, `package.json` (`store:shots`, `store:check`) | `store:check` on the generated set | Re-running the pipeline reproduces the same 8 frames |
| **P11-T10** | Screenshot set v1 (after P5-A + P4-α) | `docs/store/assets/screenshots/01..08-*.png` | V3, V9 | Owner sign-off; uploaded |
| **P11-T11** | Feature graphic v1 (wordmark from BRAND; redo after T14 if the name changes) | `docs/store/assets/feature-1024x500.png` | V3 | No clipping; curved pull; safe zone respected |
| **P11-T12** | Promo video v1 (20–30 s; end card after T14) | `docs/media/` (source), YouTube (owner upload, unlisted, monetization off) | Owner review on mute | URL in Console; gameplay within 3 s |
| **P11-T13** | Localization waves (es-419, pt-BR → de, fr → ja, ko → id, tr, hi) | `docs/store/listing/<locale>.json` | `storeCopy.test.ts` per locale | Wave 1 live; title/short human-reviewed |
| **P11-T14** | 👤 **Rename switch** (gated: D-19 ACCEPTED + trademark knockout memo) | `brand.ts` (values, `status: 'final'`, `decision`), `assets/` masters, regenerated `res/*`, `listing/*.json`, site repo, policy | All of V1–V5 with `--release`; boot smoke; device label check | One PR merged; `brand:check --release` green; Console title updated (owner). The "keep" path is a 2-line PR. |
| **P11-T15** | Experiments + custom store listings (post-launch, ≥1,000 visitors/week) | `docs/store/aso.md` (backlog + results log) | Console experiment statistics | ≥1 experiment concluded and applied |
| **P11-T16** | Monthly keyword review | `docs/store/aso.md` | Console search-terms report | Monthly log entry; copy changes go through T04 tests |
