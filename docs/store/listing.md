# Play Store Listing — GRAVITY FLOW (draft)

Studio **True Story Labs** · package `com.truestorylabs.gravityflow` · category
**Games › Puzzle** · content rating target **Everyone**. Copy below is ready to paste
into Play Console (tune lengths to Play limits: title ≤30, short ≤80, full ≤4000).

## Title (≤30)
`GRAVITY FLOW — Physics Puzzle`

## Short description (≤80)
`Hold to pull a lost star home. One-touch gravity physics puzzles in deep space.`

## Full description (≤4000)
```
Bring the lost star home.

GRAVITY FLOW is a one-touch physics puzzle set in deep space. You never move the
star directly — press and hold to create a point of gravity, and the star is pulled
toward it. Drag to steer, release to let go. Hold to pull, guide the star home.

Journey across a living star map of 15 worlds and 150 hand-tuned levels. Every world
teaches a new way to think — currents that sweep you off course, clockwork that opens
and closes, magnetic wells you slingshot around, rifts that fold space, one-way gates
you commit to, deadly spinning arms and pulsing laser beams. Each world ends in its
own boss, each chapter a fresh kind of spectacle. Warp between worlds on the cosmic
map and watch your constellation of stars grow.

Then test your nerve in GRAVITY RUN — an endless, accelerating climb through space.
Chase your best in Endless mode (a fresh run every time), or take on the Weekly
Challenge, where everyone races the same seeded course for the leaderboard.

• Pure one-thumb control — easy to learn, deep to master
• 150 hand-tuned levels across 15 distinct worlds, on a cosmic star map
• GRAVITY RUN: an endless score-chase + a weekly challenge leaderboard
• A new mechanic and a memorable boss in every world
• 3-star mastery: finish, grab the gem, beat par — chase your best with a ghost trail
• Daily challenge + streaks, achievements, and unlockable cosmetic star skins, trails & arrival effects
• Premium cosmic visuals and audio; relaxing or thrilling, your pace

No pay-to-win. Optional ads are rewarded and never required to progress. Remove ads
any time. Play offline.

Hold to pull. Find the flow. Bring the star home.
```

## Data safety (Play form)
Declare the following collected/shared data and purposes:
- **Firebase Analytics** — app activity + device/other identifiers, *Analytics*
  purpose. Not used for tracking across other apps for ads by us.
- **Firebase Crashlytics** — crash logs + diagnostics, *App functionality* purpose.
- **AdMob** — device/advertising id + approximate usage for ads (rewarded opt-in,
  capped interstitials). Shared with Google for advertising.
- **RevenueCat** — purchase/transaction info for entitlement management.
- Local-only (NOT collected/sent): level progress, stars, best times, ghost paths,
  Stardust, cosmetics, settings — all stored on-device (localStorage).
- Data is encrypted in transit; users can request deletion via the privacy contact.

## Content rating questionnaire (answers)
Abstract puzzle game. No violence, no sexual content, no profanity, no gambling, no
user-to-user communication. Contains **ads** (yes) and **digital purchases** (yes).

## Privacy policy
The **final, hosting-ready** privacy policy now lives in
[`docs/store/privacy-policy.md`](./privacy-policy.md). Host that file (GitHub Pages /
Vercel / any static host) and paste the public URL into Play Console → App content →
Privacy policy (and the store listing). Confirm the items in that file's pre-hosting
checklist (contact email, studio/legal name, jurisdiction) before publishing.

## Required graphic assets (specs in docs/store/aso.md · files in docs/store/assets/)
- **App icon 512×512** (32-bit PNG) → `docs/store/assets/icon-512.png` *(ready; alternatives in `icon-concepts/`)*
- **Feature graphic 1024×500** → `docs/store/assets/feature-1024x500.png` *(ready; alternatives in `feature-concepts/`)*
- **Phone screenshots ×8** (portrait 1080×2160, Play-compliant) → `docs/store/assets/screenshots/`
  *(✅ refreshed 2026-06-14 for the Star Map + 150-level build: Star Map, gameplay, boss, Gravity Run,
  hazards, cosmetics, achievements, 3-star win. Full package + captions in `docs/media/README.md`.)*
- (Optional) 30s promo video — not produced
- Adaptive in-build launcher icon (branded vortex, replaces the Capacitor robot) — **done** (`@capacitor/assets`, all densities)
- Catalog of finals vs. alternatives: `docs/store/assets/README.md`
