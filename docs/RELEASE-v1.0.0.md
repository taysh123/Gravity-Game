# Release Plan — GRAVITY FLOW v1.0.0

> The path from the **`v1.0.0-rc.1`** launch candidate to the **`v1.0.0`** public release.
> Audit + per-track roadmaps: [`LAUNCH-READINESS.md`](./LAUNCH-READINESS.md). Hands-on AAB: [`release-android.md`](./release-android.md).

## Where we are
- **`v1.0.0-rc.1`** — the locked launch candidate (code == `v0.15.0`; `package.json 1.0.0-rc.1`;
  Android `versionName 1.0.0` / `versionCode 1`). Repo-side launch prep complete.
- **Not yet:** the device playtest, the first uploaded build, and public availability.

## Versioning rules (semver + Play)
- **`package.json`** (dev/source version): `1.0.0-rc.1` now → `1.0.0` at launch → `1.0.1` (hotfix) / `1.1.0` (feature).
- **Android `versionName`** (store display): stays `1.0.0` for the first public release.
- **Android `versionCode`** (Play upload id): `1` for the first upload; **+1 for every subsequent upload**
  (Internal/Closed/Production rebuilds), even if `versionName` is unchanged. Never reuse a code.
- **Git tags:** `v1.0.0-rc.N` for candidates; **`v1.0.0`** is cut once, at production go-live.

## Release pipeline → when each tag/version happens
1. **RC locked (now):** `v1.0.0-rc.1` tagged (annotated, pre-release). ← *done by Claude.*
2. **Device playtest** (`device-playtest-checklist.md`). If tuning is needed → adjust data/levels/`ENDLESS_*` →
   commit → `v1.0.0-rc.2` (repeat until clean).
3. **Internal testing:** rebuild AAB (`versionCode 1`) → upload → smoke. *(test AdMob ids OK.)*
4. **Closed testing:** wire real AdMob/RevenueCat ids + Play billing products → rebuild (`versionCode 2`) →
   upload → on-device monetization/analytics smoke.
5. **Production:** final Play Console forms → promote → submit for review → **rollout**.
6. **At public go-live:** set `package.json` → `1.0.0`, commit, **tag `v1.0.0`**, **create the GitHub Release**.

## GitHub Release checklist (web UI — `gh` CLI is not installed here)
The `v1.0.0` Release is created at step 6. Steps:
1. Ensure `v1.0.0` tag is pushed (`git tag -a v1.0.0 -F <notes> && git push origin v1.0.0`).
2. GitHub → repo → **Releases → Draft a new release** → choose tag **`v1.0.0`**.
3. Title: `GRAVITY FLOW v1.0.0 — first public release`.
4. Notes: paste from `docs/store/release-notes.md` (player-facing) + a short "Highlights" list from
   `CHANGELOG.md` (150 levels/15 worlds · Star Map · Gravity Run · Daily · achievements · cosmetics).
5. Leave **"Set as pre-release" unchecked** (this is the real release); attach the AAB if you want a download.
6. Publish.

> The **`v1.0.0-rc.1`** candidate may be published now as a **pre-release** (same flow, but **check
> "Set as pre-release"**, choose tag `v1.0.0-rc.1`) if you want the candidate visible — optional.

## Owner go/no-go gate for `v1.0.0`
Cut `v1.0.0` only when **all** are true:
- [ ] Device **1★ fairness** + Endless/Star-Map **feel** playtest passed (or tuned to pass).
- [ ] A signed AAB built, uploaded, and smoke-tested on a device (ads/IAP/analytics if Closed+).
- [ ] Play Console App-content + listing complete; production rollout initiated.
Then: `package.json → 1.0.0`, commit, `git tag -a v1.0.0`, push, create the GitHub Release.
