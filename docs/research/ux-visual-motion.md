# Gravity Flow: UX, visual and motion research (2026-10-07)

**Evidence tags:** **[DOC]** = official spec, policy or source code · **[IND]** = industry practice or talk · **[DB]** = ui-ux-pro-max skill database · **[OP]** = designer opinion.
**Scope:** read-only research. Repo inputs: `theme/fx/splash.config`, `ui/*`, `textFit`, `transitions`, `a11y`, `GameScene.applyScenePostFX`, Phaser 3.90 shader source, and Android captures 01/02/05/07/10/11/world-04/play-l045. Contrast and colour-vision numbers come from my own WCAG luminance and Machado-2009 simulation scripts (`scratchpad/scripts/`).

## 0. Top 10 decisions
1. **Take bloom off the main camera and put the HUD on its own camera with no post-processing.** I checked Phaser's source: BloomFX blends with `mix(orig, blur*strength, 0.5)` (`shaders/src/LinearBlend.frag`). That means the base image always lands at 50% brightness. That explains the 55–70% dimness. **[DOC]**
2. **Bake glow into sprites** using the existing additive `'glow'` texture. Also replace the ball's per-object `postFX.addGlow`. **[OP]**
3. **One token file** covering type (6 steps, 12 px minimum), spacing (4/8), radii, elevation, semantic colours and motion presets. Every literal number gets mapped to a token. **[DB][OP]**
4. **The win screen gets NEXT (primary), RETRY (secondary) and LEVELS (tertiary). No auto-advance.** The rewarded-ad button comes last and must say "ad". **[DOC][IND]**
5. **Rewarded buttons must name the ad.** Today "▶ On a streak – 2x ✦" and "▶ REVIVE" never say an ad will play. AdMob requires a clear description of the action and the reward before the player opts in. **[DOC]**
6. **One overlay grammar:** scrim, panel, headline, body, actions. Tapping the scrim never ends a run. **[OP]**
7. **One shake path:** a trauma-based shaker on the world camera only. It respects reduced-motion and gets a 0/50/100% slider. **[IND][DOC]**
8. **One scroll view with inertia** replaces the four separate drag-scroll implementations. **[OP]**
9. **Accessibility options:** a hold-or-toggle attractor mode, a Large text option, a shake slider, a high-contrast gameplay mode, and a persisted graphics quality setting. **[DOC]**
10. **Store creative:** 9:16 at 1080×1920. The current raw captures are 1080×2160 (2:1), which is not 9:16. Frame 1 should show hold-to-pull with a 3–5 word caption. **[DOC][IND]**

---

## 1. Design language

| | |
|---|---|
| **Sources** | Material touch targets 48 dp / 8 dp gap [DOC]. Apple HIG 11 pt minimum text [DOC]. XAG 101/102 (4.5:1 text, 3:1 large text and disabled, 7:1 high-contrast; measure against the worst part of a dynamic background) [DOC]. Skill DB: `font-scale`, `spacing-scale` 4/8, `elevation-consistent`, `color-dark-mode`, secondary text ≥3:1, "Modern Dark (Cinema Mobile)" style with Expo-out (0.16,1,0.3,1), radius 16, hairline rgba 0.08 [DB]. Mini Metro's "beauty through elimination" and Monument Valley's minimal chrome (GDC) [IND]. |
| **Key finding** | The existing THEME already matches the Cinema-Mobile style. The gaps are scale discipline (18 font sizes, 7 different gaps), contrast that collapses under bloom, and non-text boundaries. Hairline at 0.10 alpha measures **1.34:1**. Slate button `#2a2f48` against the background is **1.47:1**. Empty star `#3a4256` is **1.73:1**. |
| **Implication** | Text passes on paper (TEXT_MUTED is 5.33:1 on a panel) but falls to **2.18:1** after the bloom halves luminance. So the fix is the rendering path and the tokens together. |
| **Recommendation** | Use a three-layer token setup: primitives (`PHYSICS.COLOR_*`) feed semantic tokens (`UI.color.text.secondary`), which feed component tokens (`BTN.primary.fill`). Extend `theme.config.ts`; don't fork it. |
| **Risks** | Retokenising 18 sizes touches every scene, so do it scene by scene behind screenshots. Orbitron is wide, so long boss titles still need `textFit`. |

### 1a. Type scale (6 steps; logical px on the 390-wide canvas, which is roughly 1 dp/pt on 390–412 dp phones)
| Token | Size / line height | Face, weight, tracking | Use | Large-text (×1.25) |
|---|---|---|---|---|
| `display` | 40 / 44 | Orbitron 800, +2% | Boss title card, LEVEL COMPLETE, finale | 40 (fixed; uses textFit) |
| `title` | 28 / 34 | Orbitron 700, +4% | Screen titles (STORE, THE COSMOS) | 28 |
| `heading` | 20 / 26 | Orbitron 700, +3% | Panel titles, world names | 22 |
| `label` | 17 / 22 | Exo 2 700 (CTA) or Orbitron 600 (HUD) | Buttons, HUD chip, tabs | 21 |
| `body` | 15 / 21 | Exo 2 500 | Hints (replaces Arial), descriptions, stats | 19 |
| `caption` | 12 / 16 | Exo 2 600, +4% | Badges, meta, "best 1840" | 15 |

Rules [OP]:
- Nothing below 12. That clears all 11 sub-12 uses. HUD_LABEL_MIN_SCALE then floors at 17×0.8 = 13.6.
- Hints wrap at 320 px max, which keeps lines around 35–60 characters [DB `line-length-control`].
- Timer and score digits sit in fixed-width cells sized to the widest string ("88.8s"), so the chip doesn't jitter [DB `number-tabular`].

### 1b. Spacing, radii, elevation
| Spacing | `s1` 4 · `s2` 8 · `s3` 12 · `s4` 16 · `s5` 24 · `s6` 32 · `s7` 48 · `s8` 64 |
|---|---|

Map the current gaps 6→8, 9 and 10→8 or 12, 14→16, 18→16 or 24. Use 16 for screen gutters, 24 between sections, and at least 8 between tap targets [DB].

| Radius | `r-xs` 6 (badges) · `r-sm` 12 (chips, icon buttons; = RADIUS_SM) · `r-md` 16 (buttons, cards; = RADIUS) · `r-lg` 24 (modals, sheets) · `r-pill` h/2 (pills, toggles) |
|---|---|

| Level | Fill (colour, alpha) | Hairline | Extra | Use |
|---|---|---|---|---|
| E0 canvas | `#0d0d1a` 1.0 | — | nebula | backgrounds |
| E1 surface | `#141627` 0.90 | white 0.08 | — | list rows, level nodes, shop rows |
| E2 glass | `#0c0e1a` 0.82 + sheen 0.05 (current) | white 0.12 | 1 px top highlight 0.10 | HUD chips, toolbars |
| E3 modal | `#10121f` **0.96** | white 0.14 | accent glow sprite at 0.12 | settings, results, pause, confirm |
| E4 toast | `#1a1d30` 0.96 | accent 0.6 | 3 px accent left bar | milestones, unlocks |
| Scrim | black **0.62** (modal) / 0.45 (result, so the level stays visible) | | | |

The E3 alpha change matters. In capture 10, the settings panel at 0.82 lets the logo and "WORLDS" show through. Glass is for chrome; modals need to be close to opaque [DB `blur-purpose`].

### 1c. Semantic colour and contrast checks (panel = effective `#181925`)
| Token | Value | Measured | Verdict |
|---|---|---|---|
| text.primary | `#EDEDF2` | 14.8:1 | keep |
| text.secondary (new) | `#A9AFBC` | 7.9:1 | for stats and descriptions |
| text.tertiary | `#8E94A3` (was `#8A8F98`) | 5.7:1 | needs the bloom fix (would be 2.2:1 under bloom) |
| onPrimary | `#06231a` on `#00e676` | 10.0:1 | keep |
| onReward | `#0d0d1a` on `#ffd166` | 13.4:1 | rewarded / premium fills |
| accent.info (text, icons) | `#00d4ff` | 9.8:1 | keep |
| violet **as text** | `#7c5cff` | **4.0:1 fail** | use `#A08CFF` (6.3:1); keep `#7c5cff` for strokes only |
| danger text | `#ff5a6a` | 5.7:1 | ok. Danger fill needs dark text `#1a0507` (6.5:1); white on red is 3.0:1 and fails |
| star.empty | `#3a4256` → **`#6B7590`** | 1.7 → 3.8:1 | meets non-text 3:1 |
| border.control | white 0.10 → **0.35** | 1.3 → 3.2:1 | outline / secondary buttons [DOC WCAG 1.4.11] |

### 1d. Button hierarchy
All buttons are at least 48 tall (44 absolute floor), use `r-md`, and give press feedback within 80 ms [DB pro-rules].

| Variant | Fill / stroke | Text | Size | Rules |
|---|---|---|---|---|
| **Primary** | `#00e676` + glow sprite 0.35 | `#06231a` label 17/700 | 280×56 | One per screen, in the bottom-third thumb zone; NEXT / CONTINUE / PLAY |
| **Secondary** | E1 fill + 1.5 px stroke white 0.35 | text.primary | 200–280×48 | RETRY, WORLDS. Optional leading icon |
| **Tertiary** | none (text or icon) | `#00d4ff` | ≥48×48 hit | LEVELS, Back, "Not now". Never a bare string without a hit area |
| **Destructive** | `#ff5a6a` fill | `#1a0507` | 48 | "Reset progress". Always two steps (confirm modal) |
| **Reward (ad)** | E1 fill + 1.5 px **gold** `#ffd166` stroke | gold text + **ad glyph** | 48 | Copy pattern: "Watch ad · 2× ✦ (+34)". Never larger than primary, never green, never placed first [DOC AdMob] |
| **Purchase (IAP)** | `#ffd166` fill | `#0d0d1a` | 48–56 | Price string comes from the store (`formattedPrice` / RevenueCat `priceString`), never typed in |
| **Disabled** | variant at 0.45 alpha | | | Reason shown underneath ("Need 30 more ✦"). Contrast ≥3:1 [DOC XAG 102] |

### 1e. Badges, chips, cards, toasts and overlays (one grammar)
- **Chip:** E2, height 32 (36 when tappable with a 48 hit area), caption or label text. Used for HUD level, timer and currency.
- **Badge:** `r-xs`, 18–20 tall, caption 12/700, fill at the semantic tint, dark text. Rarity colours use the Okabe-Ito hues.
- **Card:** E1, `r-md`, 16 px padding. Media sits left or top, title is `label`, meta is `caption`, action sits right.
- **Toast:** E4, top of screen under the safe area, at most one visible, 3 s auto-dismiss [DB `toast-dismiss`]. It must never cover result buttons (capture 11 stacks a milestone toast between the CTAs).
- **Overlay:** a scrim, then an E3 panel (`r-lg`, width 342), then one headline, one supporting row, and at most three actions stacked by hierarchy, plus a close button in the top-right (48 hit area). Headline badges like "PERFECT!" go **inside** the panel; in capture 11 they collide with the panel edge.

**Icons to add to `ui/icons.ts`** (2 px stroke, 24 px grid, outline at rest and filled when active) [DB stroke and filled-vs-outline discipline]: `play`, `next` (chevron), `back`, `pause`, `lock`, `crown` (boss), `star`, `gem`, `spark` (✦ currency), `ad` (TV with play mark), `share`, `bag`, `check`, `info`, `hand-hold` (hold mode), `text-size`, `contrast`, `shield` (privacy), `film` (credits), `bolt` (graphics quality).

### 1f. World theme tokens
The rule [OP]: a world accent tints chrome, the nebula and comets, and **never** gameplay entities. Goal green and hazard red are reserved semantic colours.

| Worlds | Accent | Problem | Token proposal |
|---|---|---|---|
| W1 FOUNDATIONS | `#00e676` | Equal to the goal colour | Shift the nebula hue toward teal (`#0A3D3A`) so the goal still pops |
| W4 PERIL / W12 TEMPEST | `#ff5a6a` | Equal to the hazard colour; the hazard doesn't stand out in its own world | Chrome accent W4 `#FF7A59` (coral), W12 `#FF4FA0` (storm magenta). Hazards stay `#ff5a6a` with spikes |
| W2/W5, W6/W11, W8/W15 | duplicate pairs | Weak wayfinding on the Star Map | Keep the accent; tell them apart with a world glyph and a second nebula hue |
| W3 CLOCKWORK | `#7c5cff` | 4.0:1 as text; dark numerals on the node are 4.4:1 | Text variant `#A08CFF` |
| All | — | — | `nebula = mix(accent, bg, 0.22)` (e.g. W10 `#21294C`); `onAccent = #0d0d1a` (passes for every accent except violet, which uses large numerals) |

---

## 2. Motion vocabulary

| | |
|---|---|
| **Sources** | M3: emphasized decelerate `(0.05,0.7,0.1,1)` 400 ms to enter, emphasized accelerate `(0.3,0,0.8,0.15)` 200 ms to exit; duration tokens 50–600 ms [DOC]. Skill DB: 150–300 ms micro, ≤400 ms complex, exit at 60–70% of enter, stagger 30–50 ms, scale press 0.95–1.05, interruptible [DB]. Apple Reduced Motion criteria: replace depth/parallax/zoom/spin/vortex with "a dissolve, highlight fade, or color shift"; stop decorative motion entirely [DOC]. WCAG 2.3.1 (≤3 flashes/s) and 2.3.3 [DOC]. XAG 117: allow disabling camera shake; Halo uses 0–100% sliders [DOC]. Eiserloh, GDC 2016: trauma 0–1, shake = trauma², Perlin noise, linear decay [IND]. Jonasson and Purho "Juice it or lose it"; Nijman "Art of Screenshake" [IND]. Hit-stop is best at about 0.1–0.2 s for impact; heavy hits 50–100 ms [IND, IEICE study]. |
| **Key finding** | Easing tokens already exist (Expo out, Back out, Sine in-out). Durations are scattered literals (110/130/160/350/430…). Shakes are not gated by reduced-motion. Phaser's `cam.shake` is per-frame uniform random, so it's jittery rather than smooth. It's also anisotropic: 0.008 is 3.1 px horizontally and 6.8 px vertically on 390×844. The HUD shakes with the world. |
| **Recommendation** | A `MOTION` preset table plus a `motion.ts` helper that resolves reduced-motion in one place. A custom trauma shaker on the world camera only. |
| **Risks** | Shorter scene fades can show texture pop-in on low-end devices, so test 250 ms. |

### 2a. Motion table (Phaser ease names; RM = reduced motion)
| Class | Duration | Easing | Spec | RM equivalent |
|---|---|---|---|---|
| Tap press / release | 80 / 140 | `Quad.easeOut` / `Back.easeOut` | scale 0.96 → 1.0 and fill brightens | Fill colour change only, no scale |
| Toggle | 160 | `Expo.easeOut` | knob slide + track colour | Snap, colour change |
| Toast in / out | 240 / 160 | `Expo.easeOut` / `Quad.easeIn` | y+12 and fade, 3 s hold | Fade 150 |
| Overlay enter / exit | 280 / 180 | `Expo.easeOut` / `Quad.easeIn` | scrim fade 200; panel scale 0.94→1 + fade | Crossfade 150, no scale |
| Sheet (shop detail) | 320 / 200 | `Expo.easeOut` / `Quad.easeIn` | from y+40 | Fade 150 |
| Scene fade | 250 out / 300 in | `Quad` | replaces 350/350 | Same (a fade is RM-safe) |
| Warp transition | 430 | `Cubic.easeIn` | existing | Fade 250 (existing) |
| List / grid stagger | 240 per item, 35 ms apart | `Expo.easeOut` | y+8 and fade; at most 8 staggered, total ≤ 400 | All at once, fade 150 |
| Star award (×3) | 320 each, 260 ms apart | `Back.easeOut(2)` | scale 0 → 1.15 → 1, one ring burst, rising pitch, 10 ms haptic | 150 fade each, 150 ms apart; audio and haptic kept |
| Reward count-up | 600–900 | `Quad.easeOut` | ticks capped at 12/s | Final value plus one chime |
| Unlock (node / world) | 400 | `Back.easeOut` | shackle lifts 200, node fill flash 250 | Lock→open icon crossfade 200 |
| Boss intro card | ~1600, tap to skip | `Expo.easeOut` | letterbox bars 300, title track-in 500, hold 700, out 300 | Static card, fade 200, 1200 hold |
| Near-miss | 150 | `Sine` | hazard outline flash + soft tick; no shake | Same (colour only) |
| Death | ~650 to restart | — | hit-stop 70 → red edge vignette 180 (α ≤0.35) → puff 300 → shake trauma 0.7 | No hit-stop or shake; vignette fade 200; sound and haptic kept |
| Win | absorb 350 → punch 250 → panel at +450 | `Sine.easeInOut` yoyo | punch 1.03 / 1.04 / 1.05 / 1.07 (existing tiers) | No punch, shake or flash; goal glow colour shift 250; ≤12 particles |
| Full-screen flash | 120 in / 250 out | — | α ≤0.35; perfect and boss only | Panel-border glow colour shift |
| Idle loops | 2200–2600 | `Sine.easeInOut` | **at most one** per screen (the primary CTA) | Off |
| Ambient (parallax, comets, nebula pulse) | — | — | — | Off [DOC Apple: depth/parallax] |

**Camera rules [OP]:**
- No rotation, ever.
- Zoom punch at most 1.07 and at most 250 ms.
- The HUD camera never moves.
- Endless scroll uses lerp 0.1. This counts as essential motion under RM, but parallax layers freeze.

**Shake model [IND, Eiserloh]:**
- Offset = `maxPx × trauma² × noise(t × 28 Hz)`, with `maxPx = 8`, isotropic, and decay 1.6 trauma/s.
- Trauma per event: win 0.4 (≈1.3 px), great 0.5, perfect 0.6, boss 0.75, death 0.7.
- Trauma adds up and is clamped to 1.
- Multiply by the Settings shake slider (0 / 50 / 100%). RM forces 0.

**Particle budgets** (live at any moment; the project ceiling stays at 50):

| Tier | Particles | Trail points | Comets | Win burst |
|---|---|---|---|---|
| Low | ≤20 | 8 | 0 | 12 |
| Mid | ≤40 | 16 | 1 | 24 |
| High | ≤50 | 24 | 2 | 24 + ring |

---

## 3. Win, fail and result screens

| | |
|---|---|
| **Sources** | Play policy: no interstitials "at the beginning of a level"; after the score screen is fine; rewarded is exempt only when explicitly opted in [DOC]. AdMob rewarded: affirmative opt-in and a "clear description of the action required … and what they will get" [DOC]. Dark-pattern literature (Zagal et al.; near-miss mechanics) [IND]. Cut the Rope / Angry Birds-style NEXT, RETRY, MENU triad [IND]. Skill DB `success-feedback`, `interruptible` [DB]. |
| **Key finding** | Capture 11: nine elements compete (streak badge, PERFECT!, title, stars, stats, unlock line, rewarded CTA, milestone toast, hint). There's no NEXT or RETRY, and it auto-advances at 2.8 s, which takes away the 3-star retry decision. Capture 05: Run Over has RETRY and REVIVE at equal weight, and "tap to return" exits on any stray tap. |
| **Recommendation** | The timeline and fail spec below. Offers are never shown before the primary action is interactive, and interstitials only appear *after* NEXT is tapped. |
| **Risks** | Removing auto-advance lengthens sessions slightly. Instead, offer an "Auto-continue" setting (off by default) [OP]. |

**Win choreography:**

| t (ms) | Beat |
|---|---|
| 0 | Goal absorb |
| 350 | Tier celebration |
| 450 | Panel enters, headline "LEVEL COMPLETE" or "WORLD CLEARED" |
| 600 / 860 / 1120 | Stars land |
| 1250 | Stats row "1.1 s · par 12.0 s · ✦ +34" |
| 1300 | Buttons go live |
| 1500 | Reward CTA and unlock chip fade in |

- A tap during 0–1300 **fast-forwards** to the final state; it never navigates [DB `interruptible`].
- Layout from bottom up: **NEXT** primary (thumb zone), then **RETRY** secondary, with **LEVELS** as a tertiary icon on the left of RETRY.
- The reward button sits below the panel.
- Each missed star gets a factual, actionable line: "☆ Grab the gem" or "☆ 0.4 s over par". That's honest near-miss messaging that motivates a retry. [OP]
- Never pair a near-miss line with a paid or ad offer [IND ethics].

**Fail (campaign):**
- Keep the instant-restart flow, but add a **600 ms cause stamp** at the point of failure: an icon plus "Hazard" or "Time's up". Tap to restart immediately.
- After three fails on the same level, show a non-modal "Hint" chip. Hints are free; don't sell solutions [OP].

**Run Over (Endless):**
- RETRY is primary.
- "Watch ad · Revive (1 per run)" uses the reward style.
- SHARE is tertiary, with a Home icon alongside.
- A "NEW BEST" badge appears when earned.
- **Tapping the scrim does nothing.**
- Add a **pause** button in the HUD; it opens a modal with Resume, Restart and Home.

**EndScene:** replace the anticlimax with:
1. A star-home reunion vignette (~6 s, skippable).
2. A stats card: total ★, time played, attempts, gems.
3. A credits roll.
4. The next-goal CTA: "Gravity Run" as primary, "Replay a world" as secondary.

---

## 4. Level select, shop and settings

| | |
|---|---|
| **Sources** | Saga-map convention: a linear path that opens on the current level (King and others) [IND]. Mini Metro: peripheral info pushed to the edges [IND]. Play Billing: show `formattedPrice` [DOC]. UMP: "add a visible and interactable UI element" for privacy options when `privacyOptionsRequirementStatus` says it's required [DOC]. GAG basic: settings remembered; intermediate: let players skip non-core content; advanced: replay instructions [DOC]. |
| **Key finding** | world-04: 10 nodes fill only the top 45%, and there's no current, boss or lock marking. Capture 07: rows are static swatches, actions are text-only ("EQUIP"), and the tab labels are small. Capture 10: settings has only 4 toggles plus IAP; privacy, version, credits and tutorial replay are missing. |

**Level select [OP]:**
- Lay the 10 nodes out as a zig-zag constellation path over the full height. Regular nodes are 64 px; the boss node is 88 px with a `crown` glyph and a ring in the world colour.
- The current node gets a pulsing ring plus a "▶ PLAY" pill. Locked nodes show `lock` at 0.45 alpha. Stars sit under each node using `#6B7590` for empty stars.
- The header shows "★ 24/30" with a progress bar and a chip such as "8 ★ to unlock CURRENTS".
- The Star Map and level path **auto-centre on the current node** when opened (300 ms ease; jump under RM).

**`ScrollView` spec:**
- Movement past 8 px counts as a drag, not a tap.
- Velocity is estimated over the last 100 ms of samples.
- Momentum decays as `v·e^(−dt/325 ms)`.
- Rubber-band at the edges with 0.5 resistance and a 300 ms spring back.
- A scroll indicator fades in while dragging.

**Shop [OP]:**
- A sticky **preview stage** at the top: the ball orbits with the selected trail and loops the arrival burst.
- Tapping a row means **try-on**, with no commitment.
- A sticky bottom bar carries EQUIP, BUY "70 ✦", or "Need 30 more ✦ · Earn in Daily". Can't-afford states are explained and point somewhere; they're never just grey.
- Bundles are cards with composited art of their contents, "4 items", and the store price. No fake "was" prices.
- Tabs are 48 tall with `label` text and an underline indicator.
- Rarity badges use Okabe-Ito colours (orange `#E69F00`, sky `#56B4E9`, bluish green `#009E73`, reddish purple `#CC79A7`) plus the rarity word.

**Settings must-haves, grouped:**
- **Audio & feel:** Sound, Music, Haptics.
- **Accessibility:** Reduce motion (System / On / Off), Screen shake 0/50/100, Text size Normal/Large, Attractor Hold/Toggle, High-contrast gameplay, Flash effects on/off.
- **Graphics:** Auto / Battery / Balanced / Max.
- **Help:** Replay tutorial, How to play (one card per mechanic).
- **Purchases:** Remove ads (store price), Restore purchases.
- **Privacy:** Privacy options (UMP; visible only when required), Privacy policy.
- **About:** Credits, version + build ("v1.0.0 (rc.1)"), Support / contact.

Settings becomes a scrollable E3 sheet, not a fixed panel.

---

## 5. Rendering a neon-vector look on low-end Android WebView

| | |
|---|---|
| **Sources** | Phaser FX docs: FX are WebGL-only; for Bloom and Blur, higher steps cost "exponentially more gl operations"; game-object postFX works on any object [DOC]. Phaser `LinearBlend.frag` and `UtilityPipeline.blendFramesAdditive` (line 649) [DOC, source]. Phaser 3.60 mobile pipeline: single-texture hybrid batching; atlases cut binds [DOC]. `Text.setResolution` trades memory for crispness; Phaser 3 has no global resolution switch, so render at a larger size and scale [DOC + IND forum]. Device Memory API: 0.25–8 GiB buckets, not universal [DOC]. Phaser cameras: `ignore()` per camera [DOC]. |
| **Key finding** | (1) The bloom formula alone explains the dim gameplay. (2) Text is soft because the backing canvas is 390×844 and gets CSS-upscaled about 2.77× on a 1080-px phone; `Text.setResolution` can't fix that by itself. (3) RM users get no bloom, so the game looks **brighter** for them. That's an inconsistency: bloom is a brightness effect, not motion. (4) The FPS watchdog result isn't persisted, so every restart repeats about 3 s of jank on a weak GPU. (5) The ball's postFX glow is an extra framebuffer pass every frame. |
| **Recommendation** | Quality tiers (below). Glow comes from sprites, not shaders. The HUD goes on a camera with no FX. |
| **Risks** | A higher render scale costs k² in fill rate, which multiplies every post-FX pass, so you can't have both bloom and 2× resolution on low-end devices. Two cameras means one extra display-list traversal (cheap). Moving to k > 1 means every `this.scale.width` use needs auditing; one camera-zoom wrapper limits the blast radius. |

**Techniques, in priority order [OP]:**
1. **Remove the main-camera Bloom.** If a wash is still wanted on High, write a 2-step custom PostFX that uses additive blending (`blendFramesAdditive`), so `out = orig + blur·k` and the base brightness stays at 100%.
2. **Glow sprites.** The existing `'glow'` texture, tinted with the ADD blend mode, goes under the ball, goal, attractor and portals. For pulsing, scale and alpha tweens are almost free. Bake static vector entities (walls, zone hatching) with `generateTexture` once per level instead of redrawing `Graphics` every frame.
3. **HUD camera.** Put two layers in each gameplay scene: `world` and `hud`. Then `main.ignore(hud)`, and the `hudCam` ignores `world` and has no FX, shake or zoom.
4. **Render scale k:** Low 1.0, Mid 1.5, High `min(DPR, 2)`. Implement it as game size = logical × k with `cam.setZoom(k)` and `Text.setResolution(k)`, wrapped in one helper.
5. **Vignette as a texture.** On Low, a pre-baked radial gradient sprite replaces the shader pass.

**Budgets per quality tier** (targets for 2–3 GB RAM devices; verify with the watchdog):

| | Low ("Battery") | Mid ("Balanced", default) | High ("Max") |
|---|---|---|---|
| Render scale | 1.0 | 1.5 | ≤2.0 |
| PostFX passes per frame | 0 | 1 (vignette) | ≤5 (vignette + additive bloom, 2 steps) |
| Per-object postFX | 0 | 0 | 0 (sprites only) |
| Draw calls (target) | <40 | <60 | <80 |
| Live particles / trail | 20 / 8 | 40 / 16 | 50 / 24 |
| Comets / parallax layers | 0 / 1 | 1 / 2 | 2 / 3 |
| Frame budget | 30 fps floor | 60 fps p50 | 60 fps p50 |

**Measurement:**
- Start tier: `deviceMemory ≤ 2` → Low; 3–4 → Mid; ≥ 6 and ≥ 6 cores → High. If the API is missing, start at Mid.
- Watchdog: if the rolling 3 s p50 fps is below 50 (Mid/High) or the p95 frame time is above 33 ms, **step down one tier and persist it** in SettingsStore with the app version. Never auto-upgrade within a session.
- Log the tier and p50/p95 as Crashlytics custom keys so real-device data feeds the defaults. [OP]

---

## 6. Accessibility for a one-touch game

| | |
|---|---|
| **Sources** | WCAG 2.2: 2.5.8 target ≥24 px (AA); 2.5.7 dragging alternatives (exempt when essential) [DOC]. Android 48 dp / 8 dp [DOC]. GAG "Avoid / provide alternatives to requiring buttons to be held down" (intermediate), "Include toggle/slider for any haptics" (basic), "Ensure no essential information is conveyed by a fixed colour alone" (basic), "Include an option to adjust the game speed" (basic) [DOC]. XAG 102/117 [DOC]. Apple Accessibility Nutrition Labels: Reduced Motion, Sufficient Contrast (4.5:1 / 3:1), Larger Text (≥200%, which games may manage in-app), Differentiate Without Color [DOC]. Celeste Assist Mode (speed 50–100% in 10% steps; careful wording) and Alto Zen mode [IND]. HIG: "Make motion optional … supplement visual feedback by also using … haptics and audio" [DOC]. |

**Key findings (colour-vision simulation, ΔE76; under 15 is risky, under 8 is confusable):**

| Pair | Normal | Protan | Deutan | Tritan |
|---|---|---|---|---|
| goal / hazard | 136 | 51 | **12.8** | 130 |
| attractor `#7c5cff` / repel magnet `#c04cff` | 22 | **2.2** | 14.9 | 44 |
| goal / one-way gate | 40 | 39 | 35 | **5.4** |
| goal / gem (gold) | 77 | **7.4** | 24 | 73 |
| gem / portal B (amber) | 23 | 12.9 | **9.4** | 24 |
| portal A / portal B | 103 | 78 | 91 | 93 (cyan/amber: good) |

The existing shape coding (spikes, chevrons, diamond, rings) is what carries these pairs, so treat it as a **contract**: every mechanic needs its own silhouette and must still be identifiable in greyscale.

**Recommendations:**
- **Attractor mode: Hold (default) or Toggle.** In Toggle, a tap places the attractor, dragging moves it, and another tap removes it. The press-and-hold is the core mechanic, so it's "essential" under WCAG, but GAG still asks for an alternative. Flag runs made in Toggle mode for the Weekly leaderboard only if that turns out to matter. [DOC + OP]
- **Assist: game speed 70 / 85 / 100%** (physics time scale). Disable or rescale the par-time star while active. Use neutral wording: "Assist options let you tune the challenge." [IND Celeste]
- **High-contrast gameplay:** hazards get a 3 px dashed outline plus stripes; magnets get +/− glyphs; text and UI contrast goes to ≥7:1 [DOC XAG 102].
- **Text size Large (×1.25)** on body, caption and label (table 1a). Layouts must reflow, using `textFit` only for titles.
- **Motion:** RM removes shake, punch, flash, parallax, comets, nebula pulse and breathing. It does **not** change bloom or brightness. Flash effects get their own toggle, and are never more than 3 per second [DOC WCAG 2.3.1].
- **Haptics as redundant cues.** The same event map as audio: tap 10 ms, star 10 ms × n, win pattern, death pattern, timer warn 3 × 15 ms at 3 s. Use Capacitor Haptics on native, where `navigator.vibrate` is unreliable in WebViews [OP].
- **Audio cues:** give "hazard death" and "timeout" different fail sounds, and add a near-goal shimmer tone so information isn't visual-only [DOC GAG].
- **Targets:** at least 48 logical px (which is ≥44 pt on a 390-wide iPhone), at least 8 px apart. The HUD toolbar's 48 px at 52 px spacing leaves only 4 px between buttons; go to 56 px pitch.

---

## 7. Store creative

| | |
|---|---|
| **Sources** | Play preview assets: game promotion needs ≥4 screenshots at ≥1080 px, 9:16 portrait; captions ≤20% of the image; no device imagery and no people interacting with the device; video autoplays its first 30 s, ≥80% in-game, with gameplay in the first 10 s [DOC]. Play icon: 512² full-square, Play applies a 30% corner radius and the shadow, no ranking or "deal" text [DOC]. StoreMaven/SplitMetrics: about 60–70% of visitors never scroll past the first frames and decide in about 7 s; 3–7-word captions; story flow is hook → journey → proof [IND]. Apple has OCR-indexed caption text since 2025 [IND]. |
| **Key finding** | The raw captures are 1080×2160 (2:1). That's allowed for the listing, but it isn't 9:16, so it misses the promotion-format spec. The logo PNG is an opaque square with a sparkle watermark and doesn't work as an icon. |

**Storyboard (9:16, 1080×1920, no device frame, caption in the top 18% in Exo 2 800 at ≥72 px):**
1. "Hold to pull the star." Hero play-l045-style shot, with the attractor ring, pull line and the ball arcing toward the goal. A touch is shown as the in-game attractor glow, not a finger.
2. "150 levels. 7 forces." A 2×2 tile of zones, magnets, portals and gates, with one world colour per tile.
3. "Beat the boss of every world." A boss shot plus the WORLD CLEARED stars.
4. "Endless Gravity Run." The climb plus a NEW BEST badge.
5. "Make the star yours." The shop preview stage.
6. "Calm, no rush, assist options." Accessibility as a feature [OP].

**Promo video (15–30 s, works muted):**
- 0–2 s: hold-to-pull hook with no logo intro.
- 2–8 s: three escalating mechanics.
- 8–20 s: boss and celebration beats.
- 20–26 s: Gravity Run.
- 26–30 s: end card with logo and "Free on Google Play".
- Burn in captions.

**Icon:**
- Remove the text; a wordmark can't be read at 48 px.
- Use one bright ball with a vortex swirl on full-bleed indigo.
- Check the silhouette at 48 px and 96 px on both light and dark launchers.
- Re-export the menu logo with alpha and without the sparkle.

---

## 8. Components to build or refactor, in priority order

| # | Component | Builds on / replaces | Why |
|---|---|---|---|
| P0-1 | `UI` tokens (type, space, radius, elevation, semantic colour, `MOTION`) | Extends `config/theme.config.ts`; absorbs magic numbers in `splash.config` MENU_* | Foundation for everything below |
| P0-2 | HUD camera + world/hud layers (`utils/hudCamera.ts`) | `GameScene`, `EndlessScene` HUD code | HUD contrast, shake isolation |
| P0-3 | `utils/quality.ts` (tiers, persisted watchdog, render scale) + glow sprites | Replaces `applyScenePostFX` / `watchdogFx`, `Ball.ts` `postFX.addGlow`, `FX.BLOOM_*` | Fixes 55–70% dimness |
| P0-4 | `Button` variants (primary, secondary, tertiary, destructive, reward, purchase, disabled) | Refactor `ui/Button.ts`; `IconButton` default 48 + label; `Toggle` hit area to 48 | Hierarchy, honest ads |
| P0-5 | `ResultPanel` (win) + `RunOverPanel` | Win overlay in `GameScene`; Endless Run Over | NEXT/RETRY, choreography, offer ordering |
| P0-6 | `Modal` (scrim + E3 panel + actions + close) | `drawGlass`; used by Settings, Pause, confirm dialogs | One overlay grammar |
| P0-7 | `utils/motion.ts` (presets, RM resolution) + `utils/shake.ts` (trauma) | Direct `cam.shake`/tween literals; `transitions.ts` keeps fade/warp | RM gaps, smooth shake |
| P0-8 | `text.ts` style factory (scale, wrap, Exo 2 hints, resolution) | Inline `add.text` styles; `textFit.ts` reused | 18 → 6 sizes, Arial hints |
| P1-9 | `ScrollView` (inertia, rubber-band, indicator) | The 4 drag-scroll implementations (LevelSelect, WorldMap, Cosmetics, Achievements) | Feel, consistency |
| P1-10 | `LevelNode` + path layout | `LevelSelectScene` grid | Current/boss/lock markers, fills the screen |
| P1-11 | `FailStamp`, `PausePanel` | `triggerDeath`; Endless HUD | Cause clarity, pause |
| P1-12 | `Toast` queue (E4, one at a time) | Milestone and unlock toasts | No overlap with CTAs |
| P1-13 | Shop: `PreviewStage`, `ItemRow`, `StickyActionBar`, `BundleCard`, `Tabs` | `CosmeticsScene` | Try-on, can't-afford path, store prices |
| P1-14 | Settings v2 (scrollable sheet + new rows) | `SettingsScene`, `SettingsStore` (+`shake`, `textSize`, `holdMode`, `highContrast`, `flashes`, `quality`) | Must-haves and accessibility |
| P2-15 | Icons (20 listed in 1e) | `ui/icons.ts` | Needed by P0/P1 |
| P2-16 | Launch flow: full splash on first launch only; returning launches ≤1.5 s | `CompanySplashScene`, `IntroSplashScene` | 5.5 s every launch |
| P2-17 | `FinaleSequence` | `EndScene` | Fixes the anticlimax |
| P2-18 | Store kit: 9:16 frames, icon re-export, logo with alpha | `docs/media`, `assets/raw` pipeline | Conversion, policy |

---

## Sources
- Phaser source: `node_modules/phaser/src/renderer/webgl/shaders/src/LinearBlend.frag`; `pipelines/UtilityPipeline.js:649`
- Phaser FX: https://docs.phaser.io/phaser/concepts/fx · Cameras: https://docs.phaser.io/phaser/concepts/cameras · 3.60 mobile performance: https://unpkg.com/phaser@4.2.1/changelog/v3/3.60/MobilePerformance.md · Text resolution: https://newdocs.phaser.io/docs/3.70.0/focus/Phaser.GameObjects.TextStyle-setResolution · HiDPI thread: https://phaser.discourse.group/t/settings-for-crisp-rendering/10000
- Material 3 motion tokens: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs · Android touch targets: https://support.google.com/accessibility/android/answer/7101858
- WCAG 2.2 new criteria: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ · 2.3.3: https://w3c.github.io/wcag/understanding/animation-from-interactions.html
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/full-list/ · hold alternative: https://gameaccessibilityguidelines.com/avoid-provide-alternatives-to-requiring-buttons-to-be-held-down/
- XAG 101: https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/101 · 102: …/102 · 117: …/117
- Apple: Reduced Motion criteria https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria · Sufficient Contrast …/sufficient-contrast-evaluation-criteria · Larger Text …/larger-text-evaluation-criteria
- Eiserloh, GDC 2016: https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math · Talk list (Juice it or lose it; Art of Screenshake): https://kenney.nl/learn/must-see-videos-for-indie-developers · Hit-stop study: https://ken.ieice.org/ken/paper/20230315OCSt/eng/
- Celeste: https://en.wikipedia.org/wiki/Celeste_(video_game) · Alto's Odyssey Zen: https://en.wikipedia.org/wiki/Alto%27s_Odyssey · Monument Valley GDC: https://www.gdcvault.com/play/1021380/Designing-Monument-Valley-Less · Mini Metro visual design: https://mechanicsofmagic.com/2023/04/22/visual-design-of-games-mini-metro/
- AdMob rewarded policy: https://support.google.com/admob/answer/7313578 · Play Better Ads: https://support.google.com/googleplay/android-developer/answer/12271244 · UMP privacy options: https://developers.google.com/admob/flutter/privacy · Play Billing price display: https://developer.chrome.com/docs/android/trusted-web-activity/billing
- Play preview assets: https://support.google.com/googleplay/android-developer/answer/9866151 · Play icon spec: https://developer.android.com/google-play/resources/icon-design-specifications
- Screenshot behaviour: https://appagent.com/?p=1373 · https://appscreenshotstudio.com/blog/first-three-app-store-screenshots-2026-conversion-playbook · Preview video: https://splitmetrics.com/blog/create-app-preview-video-app-store-ios/
- Okabe-Ito: https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference · Device Memory: https://developer.chrome.com/blog/device-memory
- Dark patterns in games: https://research.chalmers.se/publication/177148 · Near-miss: https://medium.com/design-bootcamp/the-near-miss-effect-and-almost-winning-mechanics-378de92f88a8
- Skill DB (ui-ux-pro-max 2.11.0): `quick-reference.md` (duration-timing, exit-faster-than-enter, stagger-sequence, scale-feedback, touch-spacing, color-dark-mode, toast-dismiss, blur-purpose); `pro-rules.md` (tap feedback 80–150 ms, secondary text ≥3:1, icon stroke consistency); `styles.csv` "Modern Dark (Cinema Mobile)"; `motion.csv` stagger presets.
