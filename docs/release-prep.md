# Release Prep — GRAVITY FLOW (Google Play tracker)

> Per-track checklists for the Play launch. **Command-center / full audit + roadmaps:
> [`docs/LAUNCH-READINESS.md`](./LAUNCH-READINESS.md).** Overall state: **[`project-status.md`](./project-status.md)**;
> 30-second version: **[`session-handoff.md`](./session-handoff.md)**; hands-on signing/AAB: **[`release-android.md`](./release-android.md)**.

---

## At a glance
| | |
|---|---|
| **Game / studio** | GRAVITY FLOW — **True Story Labs** |
| **Content** | **150 levels · 15 worlds** · Star Map · Gravity Run (Endless + Weekly) · Daily · achievements · cosmetics |
| **Version** | **`1.0.0-rc.1`** (`package.json`) · git tags **`v0.15.0`** (milestone) + **`v1.0.0-rc.1`** (launch candidate) · **app `versionCode 1` / `versionName 1.0.0`** (`android/app/build.gradle`) |
| **Package** | `com.truestorylabs.gravityflow` · target SDK **36** / min **24** |
| **Branch** | `master` (synced) · https://github.com/taysh123/Gravity-Game |
| **Privacy policy** | **https://taysh123.github.io/Gravity-Game/** (Pages → `docs/index.html`) |
| **Web demo (Vercel)** | https://gravity-flow-six.vercel.app (older build; not the release artifact) |
| **Signed AAB** | `android/app/build/outputs/bundle/release/app-release.aab` — **✅ rebuilt 2026-06-16** (11.4 MB, signed `gravityflow-upload`, `jarsigner` verified; reflects UMP + branded icon + 150 levels). Re-run the build only if real ids/version change. |
| **Upload key** | `gravityflow-upload` · `C:\Keys\gravityflow-upload.jks` (gitignored, valid to 2051) |
| **Store copy** | listing/ASO/release-notes refreshed to 150/15 + new modes (`docs/store/`) |
| **Media package** | ✅ full visual package in `docs/media/` (Play / App Store / GitHub / portfolio / LinkedIn) + 3 GIFs; strategy/captions in `docs/media/README.md`; portfolio-grade root `README.md` |

---

## Build the release AAB (do this first each release)
```
npm install                     # if deps missing (e.g. after a machine restart)
npm run build                   # tsc + vite -> dist/
npx cap sync android            # copy web assets + plugins into android/
# Gradle 8.14 doesn't support JDK 25 — point it at the Android Studio JBR (JDK 21):
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd android; ./gradlew bundleRelease   # -> app/build/outputs/bundle/release/app-release.aab (signed)
```
Verify: `jarsigner -verify <aab>` → "jar verified" with alias `gravityflow-upload`. (A
"certificate chain is invalid / unable to find valid certification path" warning is **expected** for a
self-signed upload key — the signature is still valid; Play does not require a CA-chained cert.)

---

## ✅ Internal Testing — code & assets READY (user/Play-Console gated)
- [x] Signed-AAB pipeline (signing config + keystore) · [x] UMP consent code · [x] boot fixes
- [x] Privacy policy (text + hosted HTML) · [x] icon 512 (32-bit) · [x] feature 1024×500 · [x] **8 screenshots 1080×2160 (refreshed 2026-06-14 for Star Map + 150 levels via `scripts/capture_media.py`)**
- [x] Branded launcher icon · [x] Firebase `google-services.json` · [x] listing/ASO/release-notes **refreshed to 150/15 + Gravity Run** (v0.15.0)
- [x] **AAB rebuilt 2026-06-16** (signed `gravityflow-upload`, `jarsigner` verified; reflects UMP + branded icon + 150 levels) — re-run only if real ids/version change
- [ ] **[User]** GitHub Pages live + privacy URL renders
- [ ] **[Play Console]** Create app → **App content** (privacy URL, data safety, content rating, ads, target audience)
- [ ] **[Play Console]** Main store listing (paste `docs/store/listing.md`; upload `docs/store/assets/*`)
- [ ] **[Play Console]** Internal testing release → upload AAB → testers → roll out
- *Test AdMob ids are acceptable on this track; real ids not required yet.*

## ◻ Closed Testing — adds external accounts
- [ ] **[AdMob]** Real app + rewarded/interstitial ad-unit ids → `config/monetization.config.ts` + `AndroidManifest.xml` → rebuild AAB
- [ ] **[AdMob]** Configure the UMP **"Privacy & messaging"** consent message (so the consent code shows in the EEA)
- [ ] **[RevenueCat]** Public SDK key + **Remove-Ads** product + **`premium`** entitlement (`config/monetization.config.ts`)
- [ ] **[Play Console]** Create billing products (`remove_ads` + the 3 bundles from `BUNDLES`)
- [ ] **[Device]** Verify rewarded / interstitial cap / Remove-Ads / Restore / Analytics DebugView / Crashlytics
- [ ] **[User]** Satisfy Play's new-personal-account closed-test tester + duration window

## ◻ Production — adds final gates
- [ ] **[Device]** **1★ fairness playtest** (the open gameplay gate; tune `parTimeMs`/hazard timings in level files if needed — no code changes)
- [ ] **[Play Console]** Final data safety / pricing / countries
- [ ] **[Play Console]** Promote → submit for review

---

## Compliance quick-reference (matches the policy + Data Safety draft)
- **Data Safety:** Firebase Analytics (app activity + identifiers, *analytics*), Crashlytics (crash diag,
  *app functionality*), AdMob (device/ad id, *ads* — rewarded opt-in + capped interstitials, shared with
  Google), RevenueCat (purchase/transaction). On-device-only: progress/stars/times/cosmetics/settings.
- **Content rating:** Everyone; contains ads + digital purchases; no objectionable content. No P2W.
- Drafts: `docs/store/listing.md` (listing + data-safety + rating answers), `docs/store/aso.md` (ASO + asset specs).

## Risks / watch-outs
- ✅ AAB rebuilt 2026-06-16 (fresh & verified); rebuild again only when real ids/version change.
- GitHub Pages source must be `master` → `/docs` (else `…/Gravity-Game/` serves the game, not the policy).
- Serving `/docs` via Jekyll publishes all internal docs (no secrets — keystore + `google-services.json`
  gitignored); optional `docs/.nojekyll`.
- Not legal advice — the policy is standard for this app type; a formal review is the only way to be certain.
