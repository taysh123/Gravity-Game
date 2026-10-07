# P09 — Social & Viral

**Status:** PLANNED, not started.
- **Execution step:** 21 ([`../EXECUTION-ORDER.md`](../EXECUTION-ORDER.md)). Needs step 20 (P8 weekly seeds and boards) and the P11 website/domain.
- **Design:** [`../../design/SOCIAL-VIRAL.md`](../../design/SOCIAL-VIRAL.md).
- **Decisions:** D-10, D-11, D-14, D-16, D-17, D-19, D-21, D-24, D-25, D-30.
- **Baseline:** `master @ d3c6aab`.

## 1. Summary
Turn satisfying moments into installs, using only systems that fit the game and need no server.

**P9 delivers:**
1. A **native share pipeline** (`@capacitor/share` 8.0.3 + `@capacitor/filesystem` 8.1.4) with an offscreen **share-card renderer**: Run, Daily, and Level in P9-B.
2. **Spoiler-free share text** with a link.
3. **Challenge links:**
   - App Links on the final link host, with `assetlinks.json`
   - a static web landing that opens the web build in "landing mode"
   - Play Install Referrer for deferred deep links
4. **Play In-App Review** at positive moments only.
5. (P9-B) Seed codes, custom-seed entry, a clean-HUD toggle, and level challenge cards.

**Not in P9:** referral rewards, friend ghosts, UGC and community events (D-30, SOCIAL-VIRAL §9).

## 2. Scope

### Systems
| System | P9 core | P9-B (after core is live ≥2 weeks) |
|---|---|---|
| Share pipeline | Native share + Filesystem; fallback chooser; remove `<external-path>` | Story format 1080×1920 |
| Share cards | Run card, Daily card (image; text grid from P6) | Level card on world complete / 3★ |
| Share text | Daily, Weekly, Endless-seed formats | Level format |
| Challenge links | Link codec, App Links filter, `appUrlOpen` router, static landing, web landing mode, Install Referrer | `l=` level links |
| Friend score challenge | `w=` and `e=` payloads with `s=` display score | — |
| In-App Review | Policy + `PlayGrowthPlugin.requestReview` | — |
| Creator tools | — | Seed code on the Endless result; "Play a seed" entry; clean-HUD toggle |
| Telemetry | `share`, `review_request`, `challenge_open` | — |

### Dependencies
| Needs | From |
|---|---|
| Daily rework + `dailyShareText()` (spoiler-free grid) | P6 (step 17, D-21) |
| Weekly key `rw<i>`, course identity, Endless seed codes, PGS boards | P8 (step 20) |
| Final link host (custom domain or user site) + `app-ads.txt` on it; `BRAND` config | P11 (step 14 + website), D-19 |
| `@capacitor/app` 8.1.2 (`appUrlOpen`, `getLaunchUrl`), consent-first analytics queue | P0 (steps 1, 4–5) |
| Result screen (NEXT/RETRY/LEVELS), shared components | P3 (D-08), P5 |
| 👤 Play App Signing SHA-256 + upload key SHA-256; host repo/domain DNS | Owner |

### Difficulty, risk, upside
| Item | Rating / note |
|---|---|
| Difficulty | Engineering **M** · design **M** · QA **M** (link verification and share targets are device-only) |
| Risk: App Links verification fails (redirect, wrong content type, missing fingerprint) | Medium. Mitigated by `pm verify-app-links` in the device checklist and a CI `curl -I` check for the host. |
| Risk: host migration breaks links | Medium. Links are published only on the final host; the old host keeps serving. |
| Risk: web landing exposes free purchases (web IAP stub) | High if missed. Landing mode hides shop/IAP/ads; boot smoke asserts it. |
| Risk: review quota wasted | Low. Strict policy plus a local frequency cap. |
| Upside | Medium, high variance: organic installs via K-factor and rating volume |

### Success metrics (MASTER-ROADMAP P9)
- Shares per DAU ≥3%.
- Share → install attribution measured (`first_open` with `utm_source=share`).
- Rating ≥4.5 with volume.

Internal:
- App Links `verified` on device.
- 0 silent share failures.
- Landing build exposes 0 purchasable items.

### Must NOT be done yet
- Referral rewards, friend ghosts, Firestore (D-30).
- UGC browsing (MASTER-ROADMAP P9).
- Share-gated rewards.
- Chat or display names.
- Web analytics on the landing page.
- FCM campaigns (D-30).

### Decision deltas (register in `DECISIONS.md` before T02 starts)
| # | Delta | Against | Proposed resolution |
|---|---|---|---|
| 1 | The Daily share card is claimed by both P6 (D-21) and P9 (D-16 #1) | Overlap | P6 owns the result data + pure text grid (`dailyShareText`); P9 owns the image card + native share pipeline |
| 2 | Link payloads go beyond weekly seeds: Endless seed `e`, Daily `d`, Level `l` (P9-B) | D-16 #3 names weekly-seed links only | Amend D-16 #3: "challenge links (weekly seed first; seed/daily/level payloads in the same format)" |
| 3 | A referred new player gets one challenged run before the World-1 Run gate | Depends on P8's proposed Run gate (P08 delta 3) | Record with that decision |

## 3. Architecture plan

```mermaid
flowchart LR
  subgraph app [App]
    RES[Result screens<br/>Daily · Run · Level] --> CARD[utils/shareCard.ts<br/>offscreen 2D canvas 1080×1350]
    RES --> TXT[utils/shareText.ts pure]
    CARD --> SH[utils/Share.ts<br/>chooser: native → web share → clipboard]
    TXT --> SH
    SH --> CAPS[@capacitor/share + filesystem]
    LINK[utils/challengeLink.ts pure<br/>build · parse · validate] --> TXT
    URL[@capacitor/app appUrlOpen / getLaunchUrl] --> LINK --> ROUTE[challenge router → EndlessScene/GameScene]
    REF[PlayGrowthPlugin.getInstallReferrer<br/>first launch only] --> LINK
    REV[utils/review.ts policy] --> PGR[PlayGrowthPlugin.requestReview]
  end
  subgraph host [LINK_HOST]
    AL[/.well-known/assetlinks.json/]
    AA[/app-ads.txt — P11/]
    LP[/c/ static landing + OG/]
  end
  LP -->|Play now| WEB[web build · landing mode]
  LP -->|Get it on Play + referrer| PLAY[Play Store]
```

### Rules
- **One link builder.** All link building goes through `challengeLink.ts` and one `LINK_HOST` constant. No URL literal appears anywhere else.
- **Payload.** `v`, `w`, `e`, `d`, `l`, `s` only (SOCIAL-VIRAL §6.4). Unknown params are ignored, and `s` is display-only.
- **The router is pure:** `parseChallenge(url, now, build) → Route | null`. It decides weekly-current vs expired, daily ≤7 days old, level exists and unlock state, and update-needed (`v` too high).
- **Install Referrer** is read once on first launch. The payload is persisted only after consent resolves (D-10).
- **First-launch challenge flow:** L1, then the challenged content once (a one-time exception to the World-1 Run gate), then the campaign.
- **The renderer never screenshots the live game.** It draws a dedicated card, which removes the WebGL snapshot path (`EndlessScene.ts:508-523`).

## 4. Files/modules affected

### Create
| Path | Purpose |
|---|---|
| `src/utils/shareCard.ts` | Offscreen card renderer (Run, Daily, Level layouts) |
| `src/utils/shareText.ts` (+ test) | Pure text formats (≤280 chars, no PII) |
| `src/utils/challengeLink.ts` (+ test) | `buildChallengeUrl`, `parseChallenge`, seed-code codec (Crockford base32) |
| `src/utils/shareChooser.ts` (+ test) | Pure: pick native, web-file, web-text or clipboard from capabilities |
| `src/utils/review.ts` (+ test) | `shouldRequestReview(state, trigger)` policy |
| `src/utils/ReviewStore.ts` | Lifetime count, last prompt date |
| `src/utils/ReferralStore.ts` | One-time referrer read flag + pending challenge |
| `src/utils/native/playGrowth.ts` | `registerPlugin('PlayGrowth')` bridge + web no-op |
| `android/app/src/main/java/com/truestorylabs/gravityflow/PlayGrowthPlugin.java` | `getInstallReferrer()`, `requestReview()` |
| `src/config/links.config.ts` | `LINK_HOST`, Play URL builder, UTM defaults |
| Host repo or domain (outside this repo): `.well-known/assetlinks.json`, `.nojekyll` (user site), `c/index.html`, `og-card.png` | App Links + landing (owner-provisioned; source kept under `docs/launch/link-host/` for review) |

### Modify (verified to exist)
| Path | Change |
|---|---|
| `src/utils/Share.ts` | Delegates to the chooser + Capacitor plugins; returns an outcome enum, so failures are never silent |
| `src/scenes/EndlessScene.ts` | SHARE uses the card + link (`:496-505`); seed code on the result (P9-B) |
| `src/scenes/GameScene.ts` | Daily and Level result share buttons (secondary); review triggers on world/boss complete |
| `src/scenes/RunSelectScene.ts` | "Play a seed" entry (P9-B) |
| `src/scenes/SettingsScene.ts` | Clean-HUD toggle (P9-B) |
| `src/utils/SettingsStore.ts` | `cleanHud` pref (P9-B) |
| `src/main.ts` | Register the `appUrlOpen` listener + cold-start `getLaunchUrl` → router |
| `src/scenes/BootScene.ts` | Web landing mode from the query; first-launch referrer read after consent |
| `src/utils/IAP.ts`, `src/utils/Ads.ts` | Respect landing mode (no shop, ads or IAP on the web landing build) |
| `src/utils/analyticsEvents.ts` (+ test) | `share`, `review_request`, `challenge_open` builders |
| `android/app/src/main/AndroidManifest.xml` | `autoVerify` VIEW intent filter for `https://<LINK_HOST>/c/` |
| `android/app/src/main/res/xml/file_paths.xml` | Remove `<external-path name="my_images" path="."/>`; keep `<cache-path>` |
| `android/app/build.gradle` | `com.android.installreferrer:installreferrer:2.2`, `com.google.android.play:review:2.0.2` |
| `android/app/src/main/java/com/truestorylabs/gravityflow/MainActivity.java` | `registerPlugin(PlayGrowthPlugin.class)` |
| `package.json` | `@capacitor/share` 8.0.3, `@capacitor/filesystem` 8.1.4, then `npx cap sync` |
| `docs/store/privacy-policy.md`, `docs/index.html` | Sharing, links, referrer attribution |

## 5. Data-model changes
| Store / config | Shape |
|---|---|
| `gravity-flow:review:v1` | `{count, lastPromptUtc, lifetimeWins}` (D-12 mirror + validation) |
| `gravity-flow:referral:v1` | `{read:true, payload?:string, consumed:boolean}` |
| `gravity-flow:settings` (existing SettingsStore) | `cleanHud:boolean` (P9-B) |
| `links.config.ts` | `LINK_HOST`, `PLAY_PACKAGE = 'com.truestorylabs.gravityflow'`, `UTM = {source:'share'}` |
| Remote Config (`rcConfig.ts`) | `share_enabled` (bool, true; exists in the D-14 table), `review_min_wins` (int, 15, clamp 5–50), `review_cooldown_days` (int, 60, clamp 30–180) |
| Link payload | `v=1` format (SOCIAL-VIRAL §6.4). Seed codes are 6-char Crockford base32 → `seedKey 'x'+code`. |

## 6. UI changes
| Surface | Change |
|---|---|
| Daily result | SHARE (secondary) → card + grid text + `d=` link |
| Run over | SHARE → Run card + weekly or seed link. P9-B: seed code chip `SEED 7K3-QX9` (tap to copy). |
| World complete / 3★ (P9-B) | SHARE → Level card |
| Share button state | 1-frame "Preparing…"; outcome toast ("Copied: paste anywhere" on the clipboard path) |
| Challenge entry (in app) | Interstitial-free card: "Week 41 · Mirror Week · Beat 2,418" → PLAY / LATER. Expired week: "That week has ended. Play this week's". |
| First launch via referrer | L1 banner "Learn the pull, then take on the challenge" → challenged run once |
| RunSelect (P9-B) | "Play a seed" text entry (6 chars, validated); runs labelled "practice: not ranked" |
| Settings (P9-B) | "Clean HUD for capture": hides score chrome except the score |
| Web landing | Static two-button page + OG card; the web build runs in landing mode (no shop) with a post-run "Get it on Google Play" primary CTA |
| In-App Review | Native card only, after a celebration settles and the primary action is live; no custom pre-prompt |

## 7. Gameplay changes
- **No change to rules, physics or scoring.**
- Custom-seed and friend-seed runs are practice: never posted to boards (GRAVITY-RUN §8). They count for height goals only.
- A Weekly link to an expired week routes to the current week.
- A Daily link >7 days old routes to today's Daily.
- A referred new player gets one challenged run before the World-1 Run gate. This is one-time, earns no rewards, and never posts if revived.

## 8. Test strategy
| Layer | Tests | Gate |
|---|---|---|
| Unit (TDD) | `challengeLink`: round-trip, unknown params ignored, regex rejects, `s` clamp, `v` too high → update route, expired week, daily age, locked level. Seed-code codec (no I/L/O/U, checksum-free, 30-bit). `shareText`: ≤280 chars, no digits that look like ids beyond score/time, link last. `shareChooser` capability matrix. `review` policy: every "never" rule, 60-day cooldown, lifetime 3, session-1 block. | CI blocking |
| Renderer | Pure layout fn → draw-list snapshot test (positions, sizes, contrast pairs ≥4.5:1 computed); 1080×1350 output dimensions | CI blocking |
| Boot smoke | `?w=rw2961` web landing boots into the Weekly, shop hidden, 0 console errors; `?e=7K3QX9` boots a practice run | CI blocking |
| Host check | `curl -sI https://<LINK_HOST>/.well-known/assetlinks.json` → 200, `content-type: application/json`, no `location` header (scheduled CI job) | CI report |
| Device 👤 | §14 matrix | Release gate |

## 9. Migration
- `Share.shareCard(blob, text)` keeps its signature for callers during the change. Internals switch to the chooser. The Run text format changes, and the old string at `EndlessScene.ts:497` is removed.
- `file_paths.xml`: removing `external-path` is safe. No code writes there, since Share accepts only cache `file://` paths (android brief Q8).
- No save-data migration. New stores start empty. The review counter starts at 0 for existing players, and `lifetimeWins` is seeded from ProgressStore's completed count.
- Links: none published before P9, so nothing to migrate. **Host rule:** if the user site precedes a custom domain, it keeps serving `assetlinks.json` and the landing page indefinitely.

## 10. Rollback
| Failure | Action |
|---|---|
| Share crashes or misbehaves | RC `share_enabled=false` → share buttons hidden |
| App Links misroute or crash | Router failure falls back to MainMenu (pure router; errors caught). Remove the intent filter in a versionCode+1 build. The web landing still works for everyone. |
| Review spam suspicion | RC `review_min_wins=50`, `review_cooldown_days=180` |
| Landing exposes shop | Hotfix the web build (Vercel/host redeploy is instant); boot smoke prevents recurrence |
| Referrer misroutes new players | `ReferralStore.consumed=true` on any error; onboarding is never skipped, so the worst case is a normal first session |

## 11. Performance
| Item | Budget |
|---|---|
| Card render | ≤120 ms on the Mid tier (2D canvas, static draw list, fonts already loaded at Boot); off the gameplay path |
| PNG size | ≤350 KB; write to Cache, delete after 24 h on next launch |
| Landing page | ≤10 KB HTML + ≤120 KB OG image; no JS frameworks |
| Web landing build | Same bundle as the web build; landing mode skips shop/IAP module init |
| Referrer read | Once per install, after first boot, off the critical path |
| Review | Native call only at settled moments; no frame cost during play |

## 12. Platform
- **Android:**
  - `@capacitor/share` 8.0.3 (FileProvider `${applicationId}.fileprovider`, already declared at `AndroidManifest.xml:36-44`)
  - `@capacitor/filesystem` 8.1.4 (Cache directory, no storage permission)
  - App Links `autoVerify` with `pathPrefix="/c/"`
  - Install Referrer 2.2
  - Play In-App Review 2.0.2 via the Java `PlayGrowthPlugin`
  - Activity launch mode `singleTask` today, `singleTop` per D-09. `appUrlOpen` is delivered warm in both.
  - Android 15+ re-verification can take up to 7 days (android brief Q8)
- **Owner:**
  - provision the host (the user-site repo `taysh123.github.io` with `.nojekyll`, **or** the custom domain from P11)
  - paste both SHA-256 fingerprints (Play Console → App integrity)
  - keep `app-ads.txt` on the same host (P11, AdMob)
- **Web:** Web Share/clipboard fallback; landing mode; local scores only.
- **iOS:** out of scope (D-29). Universal Links would reuse the same host later (`apple-app-site-association`).

## 13. Documentation
- `docs/design/SOCIAL-VIRAL.md`: as-built.
- `CHANGELOG.md`.
- `docs/STATUS.md`.
- `docs/release/RUNBOOK.md`: App Links verification commands and fingerprints.
- `docs/qa/DEVICE-CHECKLIST-M0.md`: share targets, link and referrer matrix.
- `docs/store/privacy-policy.md` + `docs/index.html`, together.
- `docs/store/data-safety.md`: Data safety delta (analytics attribution via the Install Referrer).
- Link-host sources under `docs/launch/link-host/`.

## 14. Validation criteria
| Criterion | Evidence type |
|---|---|
| tsc / vitest / build / boot smoke (including landing mode) green | VERIFIED |
| `assetlinks.json`: 200, `application/json`, no redirect | VERIFIED (scheduled `curl -I`) |
| `adb shell pm verify-app-links --re-verify com.truestorylabs.gravityflow` then `pm get-app-links` → `verified` for `LINK_HOST` | **HUMAN DEVICE TEST** |
| Link opens the app warm and cold to the right route; expired week and old daily reroute correctly | **HUMAN DEVICE TEST** + VERIFIED (router unit) |
| Share card + text to WhatsApp, Messages, Gmail; clipboard fallback on web; cancel is silent and non-erroring | **HUMAN DEVICE TEST** |
| Install via a referrer-tagged Play URL (internal testing track) → first launch reads `gf`, plays L1, then opens the challenge; `first_open` attributed to `utm_source=share` in GA4 | **HUMAN DEVICE TEST** (+ GA4 report after 24–48 h) |
| In-App Review appears only on eligible triggers; never after a fail or from a button | VERIFIED (policy unit) + **HUMAN DEVICE TEST** (internal app sharing shows the card) |
| Web landing has no purchasable item and no ad | VERIFIED (boot smoke) |
| Shares per DAU ≥3%; rating ≥4.5 | INFERRED until live data |

## 15. Exact completion definition
P9 core is complete when **all** of the following hold:
1. T01–T09 and T12–T14 are merged with all MASTER-ROADMAP §6 gates green. Outputs are recorded in `docs/STATUS.md`.
2. `LINK_HOST` is final (owner-confirmed), `assetlinks.json` passes the host check, and `pm get-app-links` shows `verified` on a release-signed internal-track build.
3. Daily and Run share produce an image + text + link on Android through the native sheet, verified on 3 target apps.
4. One referrer-tagged install has been traced end-to-end: referrer read → L1 → challenge → `first_open` attributed.
5. The review policy is live with RC clamps. The privacy policy and Data safety form are updated.
6. A production release containing P9 core has reached 100% rollout with crash-free sessions ≥99.5%.

P9-B (T10, T11) is tracked separately and does not block P9 completion.

## 16. Task breakdown

| Task | Goal | Files | Tests | Done when |
|---|---|---|---|---|
| **P09-T01** Link host 👤 | Final host + `assetlinks.json` (2 fingerprints) + `.nojekyll` (user site) + landing skeleton; `app-ads.txt` co-located (P11) | Host repo/domain; `docs/launch/link-host/*`; Create `src/config/links.config.ts` | Scheduled `curl -I` check | 200 + `application/json` + no redirect |
| **P09-T02** Link codec | Build/parse/validate challenge URLs; seed codes | Create `src/utils/challengeLink.ts`(+test) | Round-trip, regexes, clamps, expiry, version | 100% branch coverage of the router decisions |
| **P09-T03** Native share pipeline | Plugins + chooser + outcome enum; remove `external-path` | Modify `package.json`, `src/utils/Share.ts`, `file_paths.xml`; Create `src/utils/shareChooser.ts`(+test) | Capability matrix; never silent | Native sheet with a PNG on device 👤 |
| **P09-T04** Share-card renderer | Run + Daily layouts, 1080×1350, spoiler-free | Create `src/utils/shareCard.ts` | Draw-list snapshot; contrast ≥4.5:1; dimensions | ≤120 ms on Mid 👤 |
| **P09-T05** Share text | Daily/Weekly/seed formats with link | Create `src/utils/shareText.ts`(+test); Modify `EndlessScene.ts:496-505`, `GameScene.ts` (Daily) | ≤280 chars; link last; no PII | Strings match SOCIAL-VIRAL §4 |
| **P09-T06** App Links routing | Intent filter + `appUrlOpen`/`getLaunchUrl` → router → scenes | Modify `AndroidManifest.xml`, `src/main.ts` | Router unit; boot smoke with launch URL | Warm and cold routes correct 👤 |
| **P09-T07** Web landing | Static page (OG) + web build landing mode (no shop/IAP/ads, post-run Play CTA) | Host `c/index.html`; Modify `src/scenes/BootScene.ts`, `src/utils/IAP.ts`, `src/utils/Ads.ts` | Boot smoke `?w=`/`?e=`; shop-hidden assertion | Link opens playable in a mobile browser |
| **P09-T08** Install Referrer | Deferred deep link; first-launch read after consent | Create `PlayGrowthPlugin.java` (referrer), `src/utils/native/playGrowth.ts`, `src/utils/ReferralStore.ts`; Modify `MainActivity.java`, `android/app/build.gradle`, `BootScene.ts` | Payload parse; one-time consumption; consent ordering | End-to-end referred install traced 👤 |
| **P09-T09** In-App Review | Policy + native call + triggers | Create `src/utils/review.ts`(+test), `src/utils/ReviewStore.ts`; Modify `PlayGrowthPlugin.java`, `GameScene.ts`, `EndlessScene.ts` | Every "never" rule; caps; RC clamps | Card shown on an eligible trigger only 👤 |
| **P09-T10** Creator tools (P9-B) | Seed code chip, "Play a seed", clean-HUD toggle | Modify `EndlessScene.ts`, `RunSelectScene.ts`, `SettingsScene.ts`, `SettingsStore.ts` | Seed entry validation; practice never posts | Seeds reproducible across two devices 👤 |
| **P09-T11** Level challenge (P9-B) | Level card + `l=` links | Modify `shareCard.ts`, `shareText.ts`, `challengeLink.ts`, `GameScene.ts` | Locked-level route | Level link opens the right level or a lock notice |
| **P09-T12** Telemetry | `share{method,content_type,item_id}`, `review_request{trigger}`, `challenge_open{source:'applink'|'referrer'|'web', kind}` | Modify `src/utils/analyticsEvents.ts`(+test) | Name/param lint | Visible in DebugView 👤 |
| **P09-T13** Privacy + Data safety | Policy text + form delta | Modify `docs/store/privacy-policy.md`, `docs/index.html`, `docs/store/data-safety.md` | Review checklist | Owner submits the updated form 👤 |
| **P09-T14** Device matrix + release | Run §14; staged rollout | `docs/qa/DEVICE-CHECKLIST-M0.md`, `docs/release/RUNBOOK.md` | §14 | §15 items 1–6 satisfied |
