# Gravity Flow: UX/UI & Motion Design Language v2

> **Status:** design language of record for **P5**. It covers the **P5-A slice** (execution step 12) and the **P5 system** (step 16). Plan: [`../roadmap/phases/P05-ux-visual.md`](../roadmap/phases/P05-ux-visual.md). Date: 2026-10-07. Baseline: `master @ d3c6aab`.
>
> **Conforms to:** D-13 (rendering), D-08 (result screen), D-25 (13+, non-childish art). It also respects D-01 (sim clock / no gameplay tweens), D-02 (armed sim), D-07 (relief ladder), D-09 (store prices), D-10 (privacy entry points), D-11 (back/pause), D-12 (durable settings), D-14 (no `screen_view` from overlay scenes), D-17 ("your best" copy), D-19 (no renames), D-23/D-24 (honest offers, single soft currency), D-26/D-28 (no formula or engine change) and D-27 (counts are outcomes).
>
> **Evidence tags:**
> - **[M]** measured in this session: WCAG 2.x relative luminance and CIEDE2000, using the alpha-composited surface colours. The P05-T10 contrast test turns every [M] number into a CI assertion.
> - **[R]** `docs/research/ux-visual-motion.md` (primary) and `docs/research/physics-rendering.md`.
> - **[A]** `docs/audit/2026-10-07/STATE-AUDIT.md`.
> - **[I]** inferred from Phaser 3.90 behaviour. These get checked in the named task.
>
> Skills applied: `ui-ux-pro-max` (style "Modern Dark (Cinema Mobile)", Expo-out easing, no emoji/font glyphs as structural icons, 48 dp targets, 80–150 ms tap feedback, exits faster than entries) and `design-system` (three-layer tokens).

---

## 0. Principles (binding for every screen)

1. **Gameplay owns colour.** Goal green, hazard red and reward gold are semantic, and so are the mechanic hues. Chrome, world themes and cosmetics may never impersonate them inside the play rectangle (§1.8, §1.9).
2. **One overlay grammar:** scrim → E3 panel → headline → one supporting block → at most three actions stacked by hierarchy, with the primary action at the bottom in the thumb zone.
3. **Honesty is a visual property.**
   - Rewarded actions name the ad ("Watch ad · …").
   - Prices come from the store.
   - A disabled control says why.
   - No fake urgency.

   (D-08, D-09, D-24)
4. **Motion conveys state, never decoration alone.** Every class of motion has a reduced-motion (RM) equivalent. **RM never changes steady-state brightness** (D-13).
5. **Low-end first.** The camera carries no post-processing; glow comes from sprites and baked layers; budgets are set per quality tier (D-13).
6. **Every visual improvement ships with four evaluations:** GPU, memory, battery, and reduced-motion (§6.6).

---

## 1. Tokens v2

### 1.1 Architecture
Tokens come in three layers and live in **one file**, `src/config/theme.config.ts`. It is extended, not forked.

| Layer | Export | Example | Rule |
|---|---|---|---|
| Primitive | `PRIM` | `PRIM.ink950 = 0x0d0d1a`, `PRIM.space[4] = 16` | Raw values only. Gameplay hues are **re-exported** from `PHYSICS.COLOR_*` and never duplicated |
| Semantic | `UI` | `UI.text.secondary`, `UI.surface.modal`, `UI.reward` | Purpose aliases. Scenes and components read **only** this layer or the component layer |
| Component | `COMP` | `COMP.button.primary.fill`, `COMP.toast.bar` | Per-component values referencing `UI` |
| Motion | `MOTION`, `EASE` | `MOTION.overlay.in = 280` | Resolved through `utils/motion.ts` (RM in one place) |
| World | `WORLD_TOKENS[id]` | `{ accent, nebula, bg, starTint }` | Replaces `worldThemes.ts` colour fields; `worlds.ts` `theme` is deleted (it is unused at runtime; grep finds no reader) |

- `THEME` stays as a **deprecated facade** that maps to `UI`/`COMP` until the scene-by-scene migration is finished (P05-T12). Then it is removed.
- Naming follows `category.item.variant.state`.
- No component may contain a raw hex value. The token lint test enforces this with a shrinking allowlist (P05-T10).

### 1.2 Primitives

**Colour primitives (non-gameplay)**

| Token | Value | Notes |
|---|---|---|
| `ink950` | `#0D0D1A` | Canvas (= `PHYSICS.COLOR_BACKGROUND`). Not pure black (avoids OLED smear) |
| `ink900` | `#10121F` | Modal base |
| `ink850` | `#141627` | Surface base |
| `ink800` | `#1A1D30` | Toast base |
| `inkGlass` | `#0C0E1A` | Glass base (= `PANEL_FILL`) |
| `fog100` | `#EDEDF2` | Primary text |
| `fog300` | `#A9AFBC` | **New:** secondary text |
| `fog400` | `#8E94A3` | Tertiary text (was `#8A8F98`) |
| `slate500` | `#6B7590` | Empty star, lock glyph (was `#3A4256`) |
| `slate400` | `#7A8BA3` | **New:** obstacle rim and arena line (gameplay readability, §1.8) |
| `greenInk` | `#06231A` | Text on green |
| `redInk` | `#1A0507` | Text on red |
| `violetText` | `#A08CFF` | Violet when used *as text* (`#7C5CFF` stays stroke-only) |
| `white` | `#FFFFFF` | Hairlines, at an alpha |
| `okabe` | `#56B4E9` · `#009E73` · `#CC79A7` · `#E69F00` | Rarity: common · rare · epic · legendary |

**Gameplay primitives** are re-exported from `physics.config.ts` and never edited for UI reasons:

| Primitive | Value |
|---|---|
| goal | `#00E676` |
| hazard | `#FF5A6A` |
| gold (gem, star, ball glow) | `#FFD166` |
| attractor | `#7C5CFF` |
| cyan (attractor pulse / magnet attract / zone up) | `#00D4FF` |
| repel | `#C04CFF` |
| portal A | `#33E1FF` |
| portal B | `#FFA64D` |
| gate | `#2EE6C0` |
| ghost | `#8FB0FF` |
| orb | `#CFE8FF` |
| ball | `#F0F0FF` |

**Alpha primitives:** `a08 0.08` · `a12 0.12` · `a14 0.14` · `a35 0.35` · `a45 0.45` · `a62 0.62` · `a82 0.82` · `a88 0.88` · `a90 0.90` · `a96 0.96`.

### 1.3 Type scale (6 steps, 12 px floor; logical px on the 390-wide canvas ≈ 1 dp)

| Token | Size / line | Face · weight · tracking | Use | Large text ×1.25 |
|---|---|---|---|---|
| `display` | 40 / 44 | Orbitron 800, +2% | Boss intro card, finale headline, "WORLD CLEARED" | 40 (fixed; `textFit` min 0.7) |
| `title` | 28 / 34 | Orbitron 700, +4% | Screen titles (STORE, THE COSMOS), "LEVEL COMPLETE" | 28 (fixed) |
| `heading` | 20 / 26 | Orbitron 700, +3% | Panel titles, world names, settings section titles | 22 (×1.1 cap) |
| `label` | 17 / 22 | Exo 2 700 (CTA, rows) · Orbitron 600 (HUD) | Buttons, HUD chip, tabs, row titles | 21 |
| `body` | 15 / 21 | Exo 2 500 | Hints (replaces Arial), descriptions, stats | 19 |
| `caption` | 12 / 16 | Exo 2 600, +4% | Badges, meta, section headers, "best 1840" | 15 |

**Rules**
- Nothing renders below 12 px, including `textFit` floors. Today there are 11 sub-12 usages (5× `10px`, 6× `11px`) [M grep]. `HUD_LABEL_MIN_SCALE` 0.8 now floors at 17 × 0.8 = **13.6 px** (it was 14 × 0.8 = 11.2).
- Orbitron is **caps only**; mixed-case Orbitron is banned (weak lowercase [A E.2]).
- Hints and body copy wrap at **320 px**, which is about 35–60 characters per line.
- Timer and score digits sit in **fixed-width cells** sized to the widest string ("88.8s"), so chips don't jitter.
- Text objects are created only through `ui/text.ts` (`textStyle(token, opts)`). It applies family, size, line height, the large-text multiplier and `resolution = renderScale`.
- Today the code uses **18 distinct sizes** [M grep: 10, 11, 12, 12.5, 13, 14, 15, 16, 17, 18, 20, 21, 22, 24, 28, 30, 34, 38]. They map to the scale as follows:

  | Current sizes | Maps to |
  |---|---|
  | 10, 11, 12, 12.5, 13 | caption 12 |
  | 14, 15, 16 | body 15 |
  | 17, 18 | label 17 |
  | 20, 21, 22, 24 | heading 20 |
  | 28, 30 | title 28 |
  | 34, 38 | display 40, or title 28 if it's a score |

### 1.4 Spacing (4/8 scale)
`s1 4 · s2 8 · s3 12 · s4 16 · s5 24 · s6 32 · s7 48 · s8 64`.

Every layout value must sit on the 4 px grid. A composite is allowed only as a sum of two tokens. Screen gutter = `s4`; between sections = `s5`; between tap targets ≥ `s2`.

| Current literal (file) | Value | → Token |
|---|---|---|
| `LevelSelectScene.ts` `GAP_Y` / `SECTION_GAP` / `GAP_X` | 6 / 10 / 12 | `s2` / `s3` / `s3` |
| `CosmeticsScene.ts` `CARD_GAP` | 9 | `s2` |
| `splash.config.ts` `MENU_BTN_GAP` | 18 | `s4` |
| `GameScene.ts` `NAV_GAP` / `NAV_PAD_X` | 4 / 10 | `s2` / `s2` (pitch 48 + 8 = **56**) |
| `GameScene.ts` `SAFE_PAD` (+8) | 12 (+8) | `s3` (+`s2`) |
| `THEME.HUD_CHIP_PAD` | 28 | `s4` ×2 (32) |
| `THEME.HUD_CHIP_NAV_GAP` / `TITLE_CARD_SAFE_MARGIN` | 16 / 24 | `s4` / `s5` |
| `THEME.HIT_PADDING` | 14 (dead code [A E.1 #14]) | delete |
| Win-overlay star gap | 40 | star pitch 52 (36 star + `s4`) |

### 1.5 Radii
| Token | Value | Use |
|---|---|---|
| `r-xs` | 6 | Badges |
| `r-sm` | 12 (= `RADIUS_SM`) | Chips, icon buttons, item swatches |
| `r-md` | 16 (= `RADIUS`) | Buttons, cards, rows |
| `r-lg` | 24 | Modals, sheets, result panel |
| `r-pill` | h/2 | Pills, toggles, segmented controls, HUD chips |

### 1.6 Surfaces and elevation
Effective colours are composited over `ink950` [M].

| Level | Fill | Hairline | Extra | Effective | `text.primary` on it | Use |
|---|---|---|---|---|---|---|
| E0 canvas | `ink950` 1.0 | — | nebula | `#0D0D1A` | 16.52:1 | Backgrounds |
| E1 surface | `ink850` 0.90 | white 0.08 | — | `#131526` | 15.48:1 | Rows, level nodes, shop rows, cards |
| E2 glass (chrome) | `inkGlass` 0.82 + white sheen 0.05 | white 0.12 | 1 px top highlight 0.10 | `#181A25` | 14.83:1 | Menu toolbars and chips |
| **E2-HUD** | `inkGlass` **0.88** + sheen 0.05 | white 0.12 | — | — | ≥10.31:1 even over pure white | In-play HUD chips, hint chip |
| E3 modal | `ink900` **0.96** | white 0.14 | accent glow sprite 0.12 | `#10121F` (worst case, white beneath: `#1A1B28`) | 15.95:1 (worst 14.62) | Settings, result, pause, confirm |
| E4 toast | `ink800` 0.96 | accent 0.6 | 3 px accent left bar | `#191C2F` | 14.41:1 | Milestones, unlocks |
| Scrim | black **0.62** (modal) · **0.45** (result, so the level stays visible) | | | | | |

**Why E2-HUD is 0.88.** At today's 0.82, `text.secondary` over a white gameplay highlight measures **4.46:1** (fail). At 0.88 it measures **5.47:1** [M]. **Why E3 is 0.96:** at 0.82 the menu logo and "WORLDS" bleed through the settings panel (capture `10-settings.png`). Glass is for chrome; modals are near-opaque [R §1b].

`drawSurface(g, level, w, h, radius)` in `ui/glass.ts` implements this table. `drawGlass` stays as the E2 wrapper.

### 1.7 Semantic colours with measured contrast
Columns: E1 = `#131526`, E3 = `#10121F`, E3w = E3 worst case over white, HUD-w = E2-HUD over white.

| Token | Value | E1 | E3 | E3w | HUD-w | Verdict |
|---|---|---|---|---|---|---|
| `text.primary` | `#EDEDF2` | 15.48 | 15.95 | 14.62 | 10.31 | keep |
| `text.secondary` (new) | `#A9AFBC` | 8.21 | 8.46 | 7.75 | 5.47 | stats, descriptions |
| `text.tertiary` | `#8E94A3` | 5.95 | 6.13 | 5.62 | — | meta, disabled labels, "tap to skip" (audit measured 3.19 in capture) |
| `info` (text, icons, links, focus) | `#00D4FF` | 10.20 | 10.51 | 9.63 | 6.80 | tertiary actions |
| `violet.text` | `#A08CFF` | 6.61 | 6.82 | 6.25 | — | `#7C5CFF` as text is 3.98–4.43 (**fail**); stroke only |
| `danger.text` | `#FF5A6A` | 5.95 | 6.14 | 5.62 | — | DeathStamp, errors |
| `success.text` | `#00E676` | 10.82 | 11.15 | 10.22 | — | positive deltas only (never as a world accent) |
| `reward` | `#FFD166` | 12.52 | 12.91 | 11.83 | 8.34 | stars, ✦, reward stroke and text |

**Fills and the ink on them**

| Pair | Ratio | Use |
|---|---|---|
| `greenInk` on `#00E676` | **9.96** | Primary button |
| `#0D0D1A` on `#FFD166` | **13.37** | Purchase fill |
| `redInk` on `#FF5A6A` | **6.48** | Destructive fill. White on red is **3.03, fail** |
| `#0D0D1A` on `#00D4FF` | **10.89** | Selected segment |

**Non-text elements** (3:1 required, WCAG 1.4.11)

| Element | Today | v2 |
|---|---|---|
| Control border | white 0.10 = **1.31** | white 0.35 = **3.22** |
| Empty star | `#3A4256` = **1.80** | `#6B7590` = **3.93** on E1 / 4.20 on canvas |
| Lock glyph (`text.primary` @ 0.45 on E1) | — | **4.02** |
| Slate button `#2A2F48` vs canvas | **1.47** | retired. Secondary = E1 + 0.35 border |

**Rarity badges** (dark ink `#0D0D1A`, plus the rarity *word*; colour is never the only cue):

| Rarity | Fill | Contrast |
|---|---|---|
| common | `#56B4E9` | 8.35 |
| rare | `#009E73` | 5.63 |
| epic | `#CC79A7` | 6.30 |
| legendary | `#E69F00` | 8.56 |

### 1.8 Gameplay-reserved namespace and readability tokens
Inside the play rectangle during play, only gameplay primitives may be saturated. Chrome inside the play area (HUD chips, hint chip, DeathStamp) is drawn on E2-HUD/E4 and uses text tokens, never a mechanic hue as a fill.

**Readability fixes, applied when static layers are baked (P05-T04)**

| Element | Today [M] | v2 |
|---|---|---|
| Obstacle fill `#3A4A5C` vs canvas | **2.12:1**, which fails 3:1 for a blocking object | Keep the fill; add a 1.5 px rim `slate400 #7A8BA3`: 5.55:1 on canvas, 4.08:1 on the brightest nebula peak |
| Arena wall `#1A2A3A` @ 0.6 | **1.32:1** | 1 px `slate400` |

- **Boss HUD label:** today it uses hazard red `#FF5A6A`, which is a semantic collision. In v2 it is `text.primary` plus a `crown` glyph in `reward` gold.
- **Signature level label** stays `reward` gold.

**Colour-vision contract** [R §6]. Every mechanic keeps a unique silhouette that survives greyscale:

| Mechanic | Silhouette |
|---|---|
| Hazard | Spikes / stripes |
| Magnet | ± glyph + ring direction |
| Zone | Chevrons |
| Gate | Arrows |
| Gem | Diamond |
| Portals | Cyan/amber paired rings |

- The high-contrast mode (§7) thickens these shapes; it never relies on hue.
- Ball skins in the red–orange family get a **mandatory white core highlight**, keeping them ΔE-distinct from hazards.

### 1.9 World theme tokens (never collide with gameplay colours)
**Finding [M].** All 15 current `worldThemes.ts` accents fall within CIEDE2000 **ΔE ≤ 10.1** of a gameplay colour, and **11 are identical** to one (ΔE 0.0). For example, W1 = goal green and W4/W12 = hazard red.

The research brief's W3 "violet" value came from `worlds.ts` `theme`, which is dead code. The runtime W3 accent is amber `#FFB04D`.

The hue wheel can't hold 15 accents that are all far from 12 saturated gameplay hues. The free regions [M search] are only rose/blush, orchid and chartreuse. So the contract is **spatial and tonal**, plus measured gates:

| Rule | Statement | Gate |
|---|---|---|
| WT-1 | The full-chroma `accent` is drawn **only outside the play rectangle**: Star Map, level path, world-complete ceremony, LevelSelect header, title-card roman numeral. It is never drawn on, around or behind a gameplay entity | Lint: `WORLD_TOKENS[*].accent` referenced only from the allowlisted UI files |
| WT-2 | Inside the play area, world identity uses only `bg`, `nebula = mix(accent, bg, 0.22)` (additive at ≤ 0.16 × intensity 0.5 × pulse 1.5) and `starTint` | Brightest in-play atmosphere pixel ≤ relative luminance **0.035**. Measured peaks: W1 0.019, W13 0.022, W15 0.024 [M] |
| WT-3 | Accents keep **ΔE2000 ≥ 12** from the out-of-play semantic trio: success green `#00E676`, danger red `#FF5A6A`, reward gold `#FFD166` | Contrast test (P05-T10) |
| WT-4 | Worlds adjacent on the Star Map differ by **ΔE2000 ≥ 15**. Identity never depends on colour alone: the roman numeral is always on the node, and the 2nd nebula hue differs | Contrast test |
| WT-5 | `onAccent = #0D0D1A` numerals ≥ 4.5:1, and accent as text on canvas ≥ 4.5:1 | Contrast test |

| W | Name | Accent today → **v2** | ΔE to trio [M] | Adjacent ΔE [M] | Numeral contrast | Nebula (mix 0.22) |
|---|---|---|---|---|---|---|
| 1 | FOUNDATIONS | `#00E676` → **`#9EC9FF`** (dawn blue) | 45.4 | 15.9 | 11.24 | `#2D364C` |
| 2 | CURRENTS | `#00D4FF` (keep) | 41.9 | 15.9 / 47.1 | 10.89 | `#0A394C` |
| 3 | CLOCKWORK | `#FFB04D` → **`#E8A25C`** (bronze) | 15.2 | 47.1 / 18.0 | 8.95 | `#3D2E29` |
| 4 | PERIL | `#FF5A6A` → **`#FF7A59`** (coral) | 12.8 | 18.0 / 42.3 | 7.51 | `#422528` |
| 5 | WELLS | `#C04CFF` (keep) | 32.9 | 42.3 / 47.3 | 5.25 | `#341B4C` |
| 6 | RIFTS | `#33E1FF` (keep) | 37.3 | 47.3 / 22.0 | 12.26 | `#153C4C` |
| 7 | GATES | `#2EE6C0` (keep) | 14.1 | 22.0 / 45.0 | 12.11 | `#143D3F` |
| 8 | CONVERGENCE | `#FFD166` → **`#FFC2A8`** (apricot) | 21.0 | 45.0 / 16.9 | 12.42 | `#423539` |
| 9 | GAUNTLET | `#FF8A3D` (keep) | 24.0 | 16.9 / 50.2 | 8.22 | `#422822` |
| 10 | BINARY | `#6A8CFF` (keep) | 40.6 | 50.2 / 42.2 | 6.25 | `#21294C` |
| 11 | LABYRINTH | `#33E1FF` → **`#3FE0C5`** (aqua) | 16.8 | 42.2 / 63.7 | 11.64 | `#183B40` |
| 12 | TEMPEST | `#FF5A6A` → **`#FF4FA0`** (storm magenta) | 14.6 | 63.7 / 79.1 | 6.31 | `#421C37` |
| 13 | ASCENSION | `#7AFFB0` → **`#C5F56A`** (chartreuse) | 16.6 | 79.1 / 78.1 | 15.27 | `#35402C` |
| 14 | SINGULARITY | `#C04CFF` → **`#B98CFF`** (orchid) | 33.2 | 78.1 / 50.3 | 7.58 | `#33294C` |
| 15 | HOMECOMING | `#FFD166` → **`#FFF0C8`** (star-white gold) | 14.8 | 50.3 | 17.02 | `#423F40` |

- **Pairs that are not adjacent but read alike:** W2/W6 (ΔE 4.7), W7/W11 (3.2), W3/W9 (9.6). They are told apart by numeral, 2nd nebula hue and position, as WT-4 allows.
- **Each world keeps the hue family of the mechanic it teaches** (W2 cyan currents, W6 portal cyan). That association is legal because WT-1 keeps the accent off the play field.

### 1.10 Component tokens (excerpt; the full set is in `COMP`)
| Token | Value |
|---|---|
| `button.primary` | fill `success` · ink `greenInk` · glow sprite 0.35 · 280×56 |
| `button.secondary` | fill E1 · stroke white 0.35 / 1.5 px · ink `text.primary` · 48 h |
| `button.reward` | fill E1 · stroke `reward` 1.5 px · ink `reward` · leading `ad` icon |
| `button.purchase` | fill `reward` · ink `#0D0D1A` |
| `button.destructive` | fill `hazard` · ink `redInk` |
| `chip.hud` | E2-HUD · h 32 · r-pill · `label` (Orbitron 600) |
| `toast` | E4 · bar 3 px `info` (or semantic) · w ≤ 342 · h 56/72 |
| `modal` | E3 · r-lg · w = min(342, W − 2·s4) · pad s5 |
| `node.level` | ⌀ 64 (boss 88) · ring 2 px accent · numeral `label` |
| `focus` | 2 px `info` ring, 4 px offset (keyboard / D-pad on web) |

---

## 2. Component kit

| Component | File (Create / Refactor) | Replaces / reuses | Phase |
|---|---|---|---|
| Text style factory | `src/ui/text.ts` (C) | Inline `add.text` styles in 13 scenes; reuses `utils/textFit.ts` | P5 system |
| Surface | `src/ui/glass.ts` (R: `drawSurface`) | `drawGlass` in 9 files | P5 system |
| Button (6 variants + disabled) | `src/ui/Button.ts` (R) | `EndlessScene.pill()`, win-offer pills (`GameScene.ts:1386-1424`), Settings "Remove Ads" button, Cosmetics text actions | P5 system |
| IconButton 48 (+ micro-label) | `src/ui/IconButton.ts` (R) | Default 46 → 48. MainMenu top icons get labels | P5 system |
| Toggle | `src/ui/Toggle.ts` (R) | Hit 46 → full row / ≥48; contrast-safe knob | P5 system |
| Segmented | `src/ui/Segmented.ts` (C) | New (Reduce motion, Shake, Text size, Graphics, Speed) | P5 system |
| Chip / Badge | `src/ui/Chip.ts`, `src/ui/Badge.ts` (C) | HUD chips (`GameScene.createHud/createCountdown/createParChip`), rarity chips | P5 system |
| Card | `src/ui/Card.ts` (C) | `drawGlass` rows in Achievements / RunSelect / Cosmetics | P5 system |
| Modal | `src/ui/Modal.ts` (C) | Settings panel, Run Over panel, confirm dialogs. Registers with the D-11 back router | P5 system |
| Toast queue | `src/ui/Toast.ts` (C) | GameScene achievement/milestone toasts (`:1439-1497`), MainMenu chest toast (`:318`) | P5 system |
| HintChip | `src/ui/HintChip.ts` (C) | `GameScene.showHint` (Arial 17, no wrap) | **P5-A** |
| ResultPanel / RunOverPanel | `src/ui/ResultPanel.ts` (built in P3 step 10; restyled here) | `GameScene.showWinOverlay`, `EndlessScene.showRunOver` | P3 → P5 system |
| DeathStamp | `src/ui/DeathStamp.ts` (P3; motion here) | `GameScene.deathFeedback` | P3 → P5 system |
| PausePanel | `src/ui/PausePanel.ts` (P0 minimal per D-11; restyled here) | New Endless pause | P0 → P5 system |
| ScrollView | `src/ui/ScrollView.ts` + pure `src/utils/scrollPhysics.ts` (C) | 4 drag-scroll copies: `LevelSelectScene.ts:119-145`, `WorldMapScene.ts:~190-212`, `CosmeticsScene.ts:143-157`, `AchievementsScene.ts:137-150` | P5 system |
| LevelNode + path | `src/ui/LevelNode.ts` + pure `src/utils/pathLayout.ts` (C) | `LevelSelectScene` 3-col grid | P5 system |
| Tabs | `src/ui/Tabs.ts` (C) | Cosmetics bare-text tabs (~18 px hit) | P5 system |
| Shop: PreviewStage, ItemRow, StickyActionBar, BundleCard | `src/ui/shop/*.ts` (C) | `CosmeticsScene.ts:184-364` | P5 system (used by P7) |
| Settings v2 | `src/scenes/SettingsScene.ts` (R) | Fixed 4-toggle panel | P5 system |
| HUD host | `src/scenes/HudScene.ts` (C) | In-scene HUD (`GameScene` depth 20 containers, Endless `setScrollFactor(0)` score) | **P5-A** |

### 2.1 Buttons
Buttons are at least 48 tall (44 is the absolute floor and needs a justified exception), use `r-md`, and give press feedback within 80 ms.

| Variant | Visual | Text | Size | Rules |
|---|---|---|---|---|
| **Primary** | `success` fill + glow sprite 0.35 | `greenInk` `label` 17/700 — 9.96:1 | 280×56 | One per screen, in the bottom-third thumb zone: NEXT / CONTINUE / PLAY / RETRY (run). The only element allowed an idle "breathe" loop |
| **Secondary** | E1 + 1.5 px white 0.35 (3.22:1) | `text.primary` | 200–280×48 | RETRY, WORLDS, Back. Optional leading 24 px icon |
| **Tertiary** | none | `info` (10.2:1) or icon | ≥48×48 hit | LEVELS, "Not now", links. Never a bare string without a 48 hit area |
| **Destructive** | `hazard` fill | `redInk` (6.48:1) | 48 | "Reset progress". Always a 2-step confirm Modal |
| **Reward (ad)** | E1 + 1.5 px `reward` stroke | `reward` + **`ad` icon** | ≤240×48 | Copy pattern "Watch ad · 2× ✦ (+34)" / "Watch ad · Revive". Never green, never larger than primary, never visible before the primary is live, hidden when no ad is loaded (D-08, D-24) |
| **Purchase (IAP)** | `reward` fill | `#0D0D1A` (13.37:1) | 48–56 | Label = store `priceString` only (D-09). Never typed |
| **Disabled** | E1 fill + white 0.20 border | `text.tertiary` (5.95:1) + reason line ("Need 30 more ✦") | as variant | **Replaces "variant at 0.45 alpha"**, which measures 1.61:1 for text [M]. Not interactive; tapping announces the reason via Toast |

**States**

| State | Treatment |
|---|---|
| Rest | — |
| Pressed | scale 0.96 + fill +8% lightness, 80 ms `Quad.easeOut` |
| Released | 1.0, 140 ms `Back.easeOut` |
| Focus (web) | 2 px `info` ring |
| Loading | label → 16 px spinner arc, keeps width |

No hover scale on touch builds. There are no layout shifts.

### 2.2 IconButton, Toggle, Segmented

**IconButton**
- 48×48 hit area; the visual is 40 inside.
- Icon size `icon.md` 24, 2 px stroke.
- Toolbar pitch is **56**, so there are 8 px between hit areas. The HUD bar becomes 176 wide (8 + 3×48 + 2×8 + 8).
- Optional micro-label: `caption` 12, `text.secondary`, 4 px below the icon. Required on the MainMenu top row.

**Toggle**
- Track 52×32, knob 24.
- **On:** track `success`, knob `greenInk` (9.96:1).
- **Off:** track E1 + border 0.35 (3.22:1), knob `fog300`.
- State is also carried by knob position.
- In Settings the whole 56 px row is the hit area.
- 160 ms `Expo.easeOut` (RM: snap).

**Segmented**
- 40 visual / 48 hit, `r-pill`, E1 track + border 0.35.
- Selected segment: `info` fill with `#0D0D1A` text (10.89:1). Unselected: `text.secondary`.
- Indicator slides 160 ms (RM: snap).

### 2.3 Chip, Badge, Card
- **Chip:** 32 tall (36 when tappable, with a 48 hit area), `r-pill`, E2-HUD in play and E2 in menus. Text is `label`/`caption`. Timer/par chips use fixed-width digit cells.
- **Badge:** 20 tall, `r-xs`, `caption` 12/700 +4%, semantic/rarity fill with `#0D0D1A` ink plus the rarity word. "PERFECT", "NEW BEST" and "BOSS" badges sit **inside** their panel; today "PERFECT!" collides with the panel edge in capture 11.
- **Card:** E1, `r-md`, padding `s4`, min height 64. Media on the left at 40 px, title `label`, meta `caption`, action on the right with a ≥48 hit area.

### 2.4 Modal (one overlay grammar)
- **Layout:** scrim (0.62) → E3 panel, `r-lg`, width min(342, W − 32), padding 24 → header (`heading` + close IconButton 48 inset 8) → body → ≤3 actions.
- **Action order:** bottom-up primary, secondary, tertiary.
- **Dismissing:**
  - Scrim tap closes **only** dismissable modals (Settings, info).
  - Scrim tap does nothing on Result, Run Over, Pause and destructive confirms.
  - Android Back closes the top dismissable modal, resumes on Pause, and is a no-op on Result (D-11).
- **Motion:** enter 280 (`Expo.easeOut`, panel scale 0.94 → 1 + fade; scrim fade 200), exit 180 `Quad.easeIn`. RM: 150 crossfade.
- **Long modals** (Settings) are a **sheet**: same E3, but scrollable via ScrollView.

### 2.5 Toast queue
- **Placement:** E4 at the top under the safe area (y = safeTop + 8), width ≤342, height 56 (one line) or 72 (two lines).
- **Content:** 3 px accent bar on the left, 24 px icon, header `caption` 12/700 in the accent colour, body `body` 15 `text.primary`.
- **Queue:**
  - One visible at a time, FIFO.
  - At most 3 pending; overflow drops the lowest priority. Priority order: unlock > milestone > achievement > currency.
  - Hold 3000 ms; tap to dismiss.
- **Motion:** in 240 (y +12 → 0, fade), out 160. RM: fade 150.
- **Never overlaps** result or run-over actions (capture 11 stacks a milestone toast between CTAs). During a result, toasts stay top-anchored.
- **Host:** HudScene in play; the active scene in menus.

### 2.6 ResultPanel (win), RunOverPanel, DeathStamp, PausePanel
**ResultPanel (D-08).** Scrim 0.45, then the panel top-down:

| Element | Spec |
|---|---|
| Badge row | tier badge, inside the panel |
| Headline | `title` 28 "LEVEL COMPLETE" (`display` 40 + `textFit` for "STAR FREED" / "WORLD CLEARED") |
| Stars | 3 vector stars at 36 px, pitch 52 |
| Stats row | `body` tabular: "1.1 s · par 12.0 s · ✦ +34" |
| Missed-star lines | `text.secondary`, factual and actionable: "Par 9.5 s · you 11.2 s", "Grab the gem" |
| Unlock line | `caption` |

Below the panel, top to bottom:
1. Reward offer (≤240×48, appears at 1500 ms, only if an ad is loaded).
2. The [LEVELS icon 48 | RETRY secondary 200×48] row.
3. **NEXT** primary 280×56 at `H − max(safeBottom, 16) − 24 − 28`.

A missed-star line is **never** paired with an offer (ethics [R §3]).

**RunOverPanel (Endless)**

| Element | Spec |
|---|---|
| Primary | RETRY |
| Reward | "Watch ad · Revive (1 per run)" in reward style |
| Tertiary | SHARE + Home IconButton |
| Badge | "NEW BEST" when earned |
| Removed | "tap to return"; the scrim is inert [A E.1 #10] |

**DeathStamp (D-08, ≤600 ms)**
- An E4 chip at the failure point, clamped to the safe play rectangle.
- Contents: `hazard` / `timer` / `bounds` icon + `label` "Hazard" · "Time's up" · "Out of bounds" in `danger.text` (5.54:1 on E4).
- Timeline in §5.2.

**PausePanel (D-11)**
- A non-dismissable Modal titled "PAUSED".
- Actions: RESUME (primary), RESTART (secondary), HOME (secondary), plus a settings IconButton.
- Background/foreground opens it and it never auto-resumes. Endless gets a HUD pause IconButton.

### 2.7 HintChip (P5-A)
- E2-HUD chip, max width 342, `body` 15/21 Exo 2 500, `text.primary` (≥10.31:1 even over white), wrap 320, at most 3 lines.
- Hint data longer than 3 lines fails the P2 validator rule "hint ≤ 110 chars".
- Position: centred, bottom edge at `H − max(safeBottom, 16) − 24`.
- Appears 300 ms after any title card. Dismissed on first touch or after `HINT_DURATION_MS` 5000.
- Motion: in 240 / out 160 (RM: fade 150).
- **When** it shows (first attempt, D-07 tiers) is owned by P3's HintSystem. The chip is presentation only.

### 2.8 ScrollView (inertia spec)
| Parameter | Value |
|---|---|
| Drag threshold (tap vs scroll) | 8 px |
| Velocity estimate | Least-squares over samples in the last 100 ms |
| Momentum | `v·e^(−dt/325 ms)`. Stops below 0.02 px/ms or on touch |
| Edges | Rubber band, 0.5 resistance, max overscroll 80 px, spring back 300 ms `Expo.easeOut` |
| Indicator | 3 px, `r-pill`, white 0.35, right inset 4. Fades in 120 while moving, out 400 after 600 ms idle |
| API | `scrollTo(y, animate)`, `ensureVisible(rect)`, wheel input, mask clip (existing GeometryMask pattern) |
| Reduced motion | Inertia kept (direct manipulation). Rubber band → hard clamp; `scrollTo` jumps |

### 2.9 LevelNode path map
- **Layout:** the world's 8–12 nodes (D-27) zig-zag over the full height from `pathLayout(n, viewRect, bossIdx)`.
  - x alternates 30% / 70% of the width with a sinusoidal offset.
  - Centre-to-centre spacing ≥ 72 px.
  - Scrolls when needed.
- **Nodes:**

  | Node | Spec |
  |---|---|
  | Regular | ⌀ 64 |
  | Boss | ⌀ 88 with a `crown` glyph and a 3 px world-accent ring |
  | Completed | E1 + 2 px accent ring |
  | Current | Accent fill + `onAccent` numeral (≥5.25:1 worst case) + pulsing ring (the screen's single idle loop, 2400 ms) + "▶ PLAY" chip |
  | Locked | E1 + 0.35 border + `lock` glyph (4.02:1) |
  | Skipped (D-07 "Skip for now") | Dashed hollow ring |

- **Stars** below each node: 3 × 12 px, filled `reward` / empty `slate500`.
- **Header:** "★ 24/30", a 4 px accent progress bar, and the unlock chip (e.g. "8 ★ to unlock CURRENTS"). The copy comes from the D-07 frontier rule function, never a literal.
- **Open behaviour:** auto-centres on the current node, 300 ms `Expo.easeOut` (RM: jump). The Star Map does the same.

### 2.10 Shop components (consumed by P7, D-23-ready)
| Component | Spec |
|---|---|
| **Tabs** | 48 tall, `label` 17, 4 equal tabs (342/4), 3 px `info` underline that slides 240 ms. A tab switch is an in-scene 160 ms crossfade, **never a scene fade** [A E.2] |
| **PreviewStage** | Sticky top, 342×200 E1 card. A live `Ball` render (no Matter body) orbits a 120×50 ellipse at 0.9 rev/s with the selected trail; the arrival burst loops every 3.2 s at ≤ half the tier particle budget. RM: static centred ball, trail drawn as a static arc, burst replaced by one 250 ms glow-alpha step |
| **ItemRow** | 64 tall Card: 40 px **live mini-render** of the skin (not a flat swatch), name `label`, rarity Badge, state at right ("Equipped ✓" / "70 ✦" / "Locked · <source>"). **Tap = try on**, with no commitment |
| **StickyActionBar** | Bottom, 72 tall E3, safe-area aware. Exactly one action for the selected item: Equip (primary) · "Buy · 70 ✦" (primary, earned currency) · "Need 30 more ✦" (disabled) + "Earn in Daily" (tertiary link) · pack-locked → Purchase with store `priceString`. Can't-afford never uses camera shake (today `CosmeticsScene.ts:217/291/364`): the button nudges ±4 px × 3 over 240 ms, plus a Toast (RM: Toast only) |
| **BundleCard** | 342×168 E1: 2×2 live mini-renders of the contents, `heading` title, "4 items" caption, Purchase button with `priceString`, "Owned ✓" chip. At most one hero bundle, marked by a 1.5 px `reward` stroke (not by size). No "was" prices |
| Currency | Components take a `currency` parameter. New UI assumes **one** earn-only currency, ✦ (D-23 PROPOSED) |

### 2.11 Settings v2 (scrollable E3 sheet)
- **Rows:** 56 tall; 24 px icon at `s4`; title `label` 17 Exo 2 600; sublabel `caption` `text.secondary`; control right-aligned.
- **Section headers:** `caption` 12/700, +8% tracking, `text.tertiary`, 24 above / 8 below.

| Section | Rows |
|---|---|
| Audio & feel | Sound · Music · Haptics (Toggle) |
| Accessibility | Reduce motion (System / On / Off) · Screen shake (0 / 50 / 100%) · Flash effects (Toggle) · Text size (Normal / Large) · Attractor (Hold / Toggle) · Game speed (100 / 85 / 70%) · High-contrast gameplay (Toggle) |
| Graphics | Quality: Auto / Battery / Balanced / Max, plus a readout ("Auto · Balanced") |
| Help | Replay tutorial · How to play (one card per mechanic) |
| Purchases | Remove ads (Purchase-style **row**, not the dominant element [A E.1 #8]; store price, D-09) · Restore purchases |
| Privacy | Privacy choices (only when UMP status is REQUIRED, D-10) · Privacy policy · Reset analytics data |
| About | Credits · Version "v{versionName} ({versionCode})" (D-20) · Support |

---

## 3. Iconography
**Rules**
- 24 px grid; 2 px stroke (`max(2, size·0.09)` today); round caps and joins.
- Outline at rest, filled when selected or active. Never mix the two at one hierarchy level.
- Sizes: `icon.sm` 16 · `icon.md` 24 · `icon.lg` 32. Colour comes from semantic tokens only.
- **Font glyphs used as structural icons are banned:** `✦ ◆ ▶ ★ ▾ ← ▲`. They become vector icons.

**Additions to `src/ui/icons.ts`:**
- **Actions & nav:** `play`, `next`, `back`, `pause`, `grid` (levels), `lock`, `check`, `info`, `share`, `bag`, `map`.
- **Status & rewards:** `crown`, `star` (outline + filled), `gem`, `spark` (✦), `ad` (TV + play mark), `timer`, `hazard` (spike), `bounds`.
- **Settings & accessibility:** `hand-hold`, `text-size`, `contrast`, `shake`, `flash`, `speed` (gauge), `shield` (privacy), `film` (credits), `bolt` (graphics quality).

**Redraws:**
- `palette`: today it reads as a bowling ball → add a thumb hole and a brush.
- `motion`: today it reads as audio → a ball with trailing speed lines.

---

## 4. Motion vocabulary

### 4.1 Easing tokens
| Token | Phaser ease | Meaning |
|---|---|---|
| `EASE.out` | `Expo.easeOut` (≈ cubic-bezier 0.16, 1, 0.3, 1) | Entrances, reveals |
| `EASE.in` | `Quad.easeIn` | Exits (60–70% of the entrance duration) |
| `EASE.pop` | `Back.easeOut` (params `[2]` for stars) | Satisfying pops |
| `EASE.soft` | `Sine.easeInOut` | Idle loops, near-miss |
| `EASE.warp` | `Cubic.easeIn` | Warp transition |

### 4.2 Motion table
`utils/motion.ts` resolves every class from **`MOTION`** (durations in ms).

| Class | Duration | Easing | Spec | Reduced-motion equivalent | Flashes off |
|---|---|---|---|---|---|
| Tap press / release | 80 / 140 | `Quad.easeOut` / `EASE.pop` | Scale 0.96 → 1, fill +8% | Fill change only | — |
| Toggle / segmented | 160 | `EASE.out` | Knob slide + track colour | Snap + colour | — |
| Toast in / out | 240 / 160 (hold 3000) | `EASE.out` / `EASE.in` | y +12 + fade | Fade 150 | — |
| Overlay enter / exit | 280 / 180 | `EASE.out` / `EASE.in` | Scrim 200; panel 0.94 → 1 + fade | Crossfade 150 | — |
| Sheet | 320 / 200 | `EASE.out` / `EASE.in` | From y +40 | Fade 150 | — |
| Scene fade | 250 out / 300 in | `Quad` | Replaces 350/350 (`SPLASH.SCENE_FADE_MS`) | Same (fades are RM-safe) | — |
| Warp | 430 | `EASE.warp` | Existing streaks + glow | Fade 250 (existing) | Glow sprite capped at α 0.35 |
| List / grid stagger | 240 per item, 35 apart | `EASE.out` | y +8 + fade; ≤8 staggered; total ≤400 | All at once, fade 150 | — |
| Star award ×3 | 320 each, 260 apart | `EASE.pop` | 0 → 1.15 → 1, ring burst, rising pitch, 10 ms haptic | Fade 150 each, 150 apart; audio + haptic kept | Ring burst → colour step |
| Reward count-up | 600–900 | `Quad.easeOut` | Ticks ≤12/s | Final value + one chime | — |
| Unlock (node / world) | 400 | `EASE.pop` | Shackle lifts 200, node fill flash 250 | Lock → open crossfade 200 | Fill flash → colour step |
| Boss intro card | ≈1600, tap to skip | `EASE.out` | Letterbox 300, title track-in 500, hold 700, out 300 | Static card, fade 200, hold 1200 | — |
| Near-miss | 150 | `EASE.soft` | Hazard outline brighten + soft tick; no shake | Same (colour only) | Same |
| Death | ≤600 to control | — | §5.2 | No hit-stop or shake; stamp fade 100 | Vignette → border tint |
| Win | absorb 350 → punch 250 → panel at +450 | `Sine.easeInOut` yoyo | Punch 1.03 / 1.04 / 1.05 / 1.07 by tier | No punch, shake or screen flash; goal glow colour shift 250; ≤12 particles | No screen flash |
| Full-screen flash | 120 in / 250 out | — | α ≤ 0.35; perfect / boss only; ≤3 per second ever (WCAG 2.3.1) | Removed | Panel-border glow shift |
| Idle loop | 2200–2600 | `EASE.soft` | **At most one per screen** (the primary CTA or current node) | Off | — |
| Ambient (parallax, comets, nebula pulse, star drift) | continuous | — | Quality-tier budgeted | Off; steady-state brightness equal (D-13) | — |
| Timer warn | 1.1 Hz pulse | `EASE.soft` | Scale ≤1.08 + `danger` colour + 3 × 15 ms haptic at 3 s | Colour + haptic only | — |

### 4.3 Transition system
| From → To | Transition |
|---|---|
| Menu ↔ any screen | Fade 250 / 300. Re-entrancy guard kept (`utils/transitions.ts`) |
| Menu / Star Map → level | Warp 430 → fade-in 300 |
| Death → same level | **Instant cut.** No title card or intro zoom on retry (D-08) |
| Win → ResultPanel | Overlay (in-scene, HudScene) |
| NEXT → next level | Fade 250 → interstitial only if due (D-24, awaited) → fade-in 300 |
| Star Map → level path | Warp, accent-tinted |
| Store tab switch | In-scene crossfade 160 (no scene fade) |
| Any overlay (Settings, Pause) | Overlay 280 / 180 over a paused host |
| Host ↔ HudScene | `fadeToScene` fades **both** cameras in sync; HudScene is stopped when the host leaves (not on restart) |

### 4.4 Micro-interactions
- **Tap:** visual feedback ≤80 ms, plus a new `playTap()` (30 ms soft tick, Sound-gated). Today there is no UI tap sound [A E.2].
- **Haptics:** 10 ms on primary actions only.
- **Can't afford:** a button nudge plus an explanatory Toast. Camera shake is never used in menus.
- **Currency change:** count-up plus a chime; ticks capped at 12/s.
- **Near goal:** a shimmer tone that rises with proximity, so the cue isn't visual-only (see Accessibility).
- **Scroll edge:** a rubber band, never a hard stop (except under RM).

### 4.5 Camera rules
- No rotation, ever.
- Zoom punch ≤1.07 and ≤250 ms, always about the **centre**. The helper adjusts scroll for origin-(0,0) cameras (§6.4).
- Camera-intro zoom plays **once per level per session** (D-08). Never under RM.
- The HUD never moves: it lives in HudScene with an untouched camera (D-13).
- Endless follows with lerp 0.1, which is essential motion under RM. Parallax layers freeze under RM.
- Camera effects are render-only juice. They never feed the sim (D-01).

### 4.6 Screen-shake trauma model (`src/utils/shake.ts`, world camera only)
- **Offset** = `maxPx · slider · trauma² · n(t)`, with `maxPx = 8` logical px, **isotropic**.
  - `n(t)` is deterministic value noise: the sum of two seeded sines per axis at ~28 Hz and ~17 Hz. It never uses `Math.random`, so captures are reproducible.
  - Today's `cam.shake(…, 0.008)` is 3.1 px horizontally vs 6.8 px vertically, and jittery [R §2].
- **Trauma** adds per event and clamps at 1. It decays linearly at 1.6 per second.

  | Event | Trauma | Peak (≈ px) |
  |---|---|---|
  | win | 0.40 | 1.3 |
  | great | 0.50 | 2.0 |
  | perfect | 0.60 | 2.9 |
  | boss clear | 0.75 | 4.5 |
  | death (campaign / endless) | 0.70 | 3.9 |

- **Slider:** Settings → Screen shake 0 / 50 / 100% (`slider` 0, 0.5, 1). **RM forces 0.**
- **Applied** as an additive scroll offset on the host's main camera after the scene's own scroll (Endless keeps its scroll base).
- `CosmicBackground`'s fill is oversized by `maxPx` on each side so edges never show.
- **Every** `cameras.main.shake(` call is replaced: `GameScene.ts:1130, 1634`, `EndlessScene.ts:356`, `CosmeticsScene.ts:217/291/364` (deleted, not replaced) and `IntroSplashScene.ts:140`.

### 4.7 Particle budgets per quality tier (live at any instant; project ceiling stays <50)
| Tier | Particles | Trail points | Comets | Win burst | Additive glow quads | Parallax layers |
|---|---|---|---|---|---|---|
| Low (Battery) | ≤20 | 8 | 0 | 12 | ≤24 | 1 (static) |
| Mid (Balanced) | ≤40 | 16 | 1 | 24 | ≤40 | 2 |
| High (Max) | ≤50 | 24 | 2 | 24 + ring | ≤60 | 3 |

**Enforcement**
- Emitters are created through `quality.particles(n)`, which clamps `explode` counts. Today `Math.min(a.count, 44)` is hard-coded in `emitGoalBurst`.
- `CosmicBackground` reads `comets` and parallax layers from the tier; `Ball` reads trail points.
- Glow sprites register with `quality.glowBudget`, which drops in priority order: nebula, then comets, then decorative glows.

### 4.8 Glow approach (D-13)
**The neon recipe:**
- A **crisp core stroke** (w px, α 1.0).
- **1–2 wider low-alpha strokes** (w+3 at α 0.25, w+6 at α 0.10).
- **One additive glow sprite**: the existing 256² `'glow'` canvas texture with `BlendModes.ADD`, tinted.

All glow sprites sit in one **depth band** (`DEPTH.glow = 2`), so consecutive same-texture ADD quads batch into one or two draw calls.

| Entity | Glow sprite | Pulse (non-RM) | RM |
|---|---|---|---|
| Ball | 6r = 96 px, skin glow tint, α 0.55 | none (replaces `postFX.addGlow`, `Ball.ts:69`) | identical |
| Goal | 4 × radius, `goal` tint, α 0.35 → 0.60 with proximity | scale ±4% at 0.5 Hz | frozen at mean α |
| Attractor | 120 px, cyan, α 0.40 | follows the charge level | follows the charge (state, not decoration) |
| Portals | 90 px per mouth, own tint, α 0.35 | ±6% | frozen at mean |
| Magnets / gem / orbs | 2.2 × core, own tint, α 0.30 | ±5% | frozen at mean |
| Hazards | existing (`Hazard.ts:47`, α 0.3) | beam telegraph (gameplay state, not decorative) | kept |

**The celebration "bloom boost" is replaced** (it was a transient bloom strength tween): the goal glow goes α 0.6 → 1.0 and scale ×1.6 over 250 ms, then decays over 700 ms. Perfect/boss tiers add the full-screen flash image when Flashes is on.

---

## 5. Choreography

### 5.1 Win / result (D-08)
| t (ms) | Beat | RM |
|---|---|---|
| 0 | Goal absorb: ball scale 2.5 + fade 350; goal glow swell; burst (tier budget); shake (trauma by tier); punch | Absorb as fade only; no punch or shake; ≤12 particles |
| 350 | Tier celebration: haptic pattern, screen flash for perfect/boss (if Flashes on) | Colour shift on the goal glow |
| 450 | Scrim 0.45 + panel enters (overlay 280); headline | Crossfade 150 |
| 600 / 860 / 1120 | Stars land, with rising tones | 150 fades, 150 apart |
| 1250 | Stats row + missed-star lines | — |
| **1300** | **Actions live** (NEXT / RETRY / LEVELS) | Same |
| 1500 | Reward offer + unlock chip fade in (only if an ad is loaded) | Same |

- Any tap during 0–1300 **fast-forwards** to the final state and never navigates.
- No auto-advance.
- An interstitial can fire only after NEXT (D-08, D-24).

### 5.2 Death (D-08, ≤600 ms to control)
| t | Beat | RM / Flashes off |
|---|---|---|
| 0 | Run ends (sim stopped); distinct fail sound (hazard: falling buzz; timeout: double low tone); death haptic | Same |
| 0–60 | Hit-stop: visuals hold | None |
| 60 | Red edge vignette image α ≤0.35, 180 ms; puff (16 ≤ tier budget); trauma 0.7 | Border tint 200, no puff |
| 60 | DeathStamp scales in 120 (`EASE.pop`) | Fade 100 |
| 200+ | Tap restarts immediately | Same |
| 600 | Respawn at the armed preview (D-02); no title card, no intro zoom | Same |

### 5.3 Reward, unlock and boss presentation
| Moment | Choreography | RM |
|---|---|---|
| Currency reward | Count-up 600–900, ticks ≤12/s, `spark` icon pop 1.15, chime at the end | Final value + chime |
| Star milestone / achievement | Toast (E4, accent bar), queued; never during 0–1300 of a result | Fade 150 |
| Level unlock (path) | Next node: shackle lift 200 → fill flash 250 (`EASE.pop`) → current ring starts | Lock → open crossfade 200 |
| Boss intro (once per level per session, D-08) | Letterbox bars 300 → `display` title track-in 500 (tracking +12% → +2%) → hold 700 → out 300. The first tap **skips the card and is consumed**; the next press arms the sim (D-02) | Static card, fade 200, hold 1200 |
| Boss clear | Celebration tier `boss` (trauma 0.75, punch 1.07, flash) → "STAR FREED" `display` → `crown` badge | No punch, shake or flash |

### 5.4 World-complete ceremony on the Star Map
Triggered the first time the Star Map opens after a world's boss is cleared. It is persisted per world id in `ProgressStore` (`ceremonySeen`). The whole sequence is ≤2.4 s and tap-to-skip jumps to the end state.

| t (ms) | Beat | RM |
|---|---|---|
| 0 | Map opens centred on the cleared world (300 auto-centre) | Jump |
| 300 | Cleared node: ring burst + fill flash 400; "WORLD CLEARED · ★ 27/30" chip | Colour step + chip fade |
| 700 | Path segment to the next world **draws** 600 ms (line grows, `EASE.out`) | Drawn instantly |
| 1300 | Next node unlock: shackle 200 + fill 250; numeral pops | Crossfade 200 |
| 1750 | Next world name track-in 500 (`heading`, accent) | Fade 150 |
| 2250 | Primary CTA "Enter <WORLD>" becomes live; idle ring starts | Same |

### 5.5 Splash fast path
| Launch | Sequence | Total |
|---|---|---|
| **First launch** (`SettingsStore.seenIntro = false`) | Company splash (~1.9 s) → intro sphere → vortex → logo (~3.6 s). **One** tap skips both straight to the menu | ≈5.5 s |
| **Returning** | Company splash skipped (its 1024×559 logo is not loaded: about −2.2 MB VRAM). Intro reduced to logo fade-in 300 → hold 400 → fade-out 250 | **≤1.2 s** (−4.3 s per cold start) |
| RM (any) | Static logo, fade 200, hold 600 | ≤1.0 s |

- The splash never waits on the Remote Config fetch (D-14 fetches in the background).
- It never overlaps the UMP consent form (D-10 order wins). A splash that is still running when consent is required pauses until consent resolves.

### 5.6 EndScene finale sequence (replaces "You did it!" [A E.1 #11])
The finale level content is P4's job. This is the presentation.

| t (s) | Beat | RM |
|---|---|---|
| 0–6 (skippable) | **Reunion vignette:** the star is drawn home; the 15 world nodes light in sequence (120 ms stagger); the final goal bloom (glow swell + flash if enabled); `display` "THE STAR IS HOME" | Static constellation, all lit; headline fade 200 |
| 6 | **Stats card** (E3): total ★ (x / max, from data), time played, attempts, gems; count-ups | Final values |
| 8 | **Credits roll:** 40 px/s, hold to ×3, Skip (tertiary) | Static paged credits |
| end | CTA: **Gravity Run** (primary), **Replay a world** (secondary → Star Map), Main menu (tertiary). "Play Again → Level 1" is removed | Same |

`finaleSeen` is persisted, so later visits open at the stats card.

---

## 6. Rendering plan (D-13)

### 6.1 Items
| # | Item | Today | v2 |
|---|---|---|---|
| R1 | Camera bloom | `GameScene.ts:303` `addBloom` (strength 0.65; a crossfade gives **−22% flat, −48% on 1–2 px lines** [R]) | **Removed.** `FX.BLOOM_*` deleted |
| R2 | Ball glow | `Ball.ts:69` `postFX.addGlow` (a full-frame target, 96 taps/px ≈ 32M fetches/frame [R]) | **Removed** → glow sprite (§4.8) |
| R3 | Vignette | Camera `addVignette` (an extra RT copy + pass) | **Pre-rendered image**: a `vignette` canvas texture (128×276 radial gradient, edge α 0.32, radius 0.82), generated once in BootScene and drawn as one Image at `DEPTH.vignette = −60`, **below** gameplay entities, so entities at the edges are no longer dimmed. The camera now carries **no postFX** |
| R4 | Glow sprites | Some exist (Hazard, Collectible, nebula) | All glowing entities (§4.8), one depth band |
| R5 | Baked static layers | Walls, obstacles, zone frames and tracks are separate Graphics; `Hazard.draw` geometry rebuilt every frame | **One `RenderTexture` per level** (play rect 360×780 × k): walls, obstacles (drawn **rotated**, + rim token), zone frames, platform tracks, portal link line. Static hazard geometry cached; only motion and pulse layers redraw |
| R6 | HudScene | HUD on the main camera (shaken, zoomed; dimmed under bloom: HUD text 3.77:1 [A]) | **Parallel `HudScene`** (`scene.launch`): HUD chips, nav toolbar, hint chip, title cards, DeathStamp, result/run-over panels, toasts, pause. Its camera has no FX, shake or zoom. Fallback: Layers + a second camera with `ignore()` (`RENDER.HUD_SCENE = false`) |
| R7 | Quality tiers | FPS watchdog removes bloom only and is **not persisted** (3–6 s stutter every restart [A H.4]) | §6.2 |
| R8 | Render scale / text sharpness | 390×844 backbuffer CSS-upscaled ≈2.77× (soft text) | §6.4 |
| R9 | Celebration flash | Full-screen ADD glow image (keep) | Flashes-toggle aware; ≤3/s |

### 6.2 Quality tiers
| | **Low** ("Battery") | **Mid** ("Balanced", default) | **High** ("Max") |
|---|---|---|---|
| Render scale k | 1.0 | 1.5 | min(kNeeded, 2.0) |
| PostFX passes / frame | **0** | **0** | **0** (D-13: no custom pipelines) |
| Per-object postFX | 0 | 0 | 0 |
| Draw calls (D-13) | ≤40 | ≤60 | ≤80 |
| Particles / trail / comets / glow quads | 20 / 8 / 0 / 24 | 40 / 16 / 1 / 40 | 50 / 24 / 2 / 60 |
| Frame target | p95 ≤33 ms (30 fps floor) | **p95 ≤20 ms** (success metric) | p50 60 fps, p95 ≤20 ms |

- **Start tier:** `navigator.deviceMemory ≤2` → Low; 3–4 → Mid; ≥6 **and** `hardwareConcurrency ≥6` → High. API missing → Mid.
- **Watchdog (Auto only):**
  - Evaluates a rolling 3 s window of frame times.
  - If p50 > 20 ms or p95 > 33 ms → **step down one tier** and **persist** `gfxDownstep { tier, appVersion, at }`.
  - Never upgrades within a session. A new `appVersion` clears the record.
  - Particle, comet and glow budgets apply immediately. Render scale applies at the next scene start (no mid-level hitch).
- **Manual** quality choices disable auto step-down.
- **Crashlytics custom keys:** `gfx_tier`, `render_scale`, `gfx_p50_ms`, `gfx_p95_ms`.

### 6.3 Depth bands (also batching rules)
| Band | Depth |
|---|---|
| Atmosphere | −100 … −80 |
| Vignette | −60 |
| Baked static | 0 |
| **Glow (ADD)** | 2 |
| Dynamic entities | 3–9 |
| Ball | 10 |
| Juice (bursts, flashes) | 40–46 |
| HUD, overlays | HudScene |

### 6.4 DPR and text-sharpness approach
- `kNeeded = (scale.displaySize.width × devicePixelRatio) / 390`. It is ≈2.77 on a 1080-px-wide phone.
- The game is created at 390k × 844k. Every scene camera uses **origin (0,0), zoom k, scroll 0**. With that, scroll-factor-0 objects still map correctly [I, verified in P05-T06].
- `this.scale.width/height` reads (53 in 14 files) become `PHYSICS.VIEW_W/VIEW_H`. Raw `pointer.x/y` reads (18) become `worldX/worldY`.
- Text: `resolution = k` via `ui/text.ts`. Baked RT: 360k × 780k, displayed at logical size.
- Low tier (k = 1) keeps today's softness. This is accepted for weak devices.
- `?gfx=capture` (dev-only) forces k = 1080/390 for store frames (§8).

### 6.5 HudScene contract
- **Launch / reset:**
  - The host (`GameScene` / `EndlessScene`) launches it with `{ host }` in `create()`, or calls `hud.reset()` if it is already running.
  - On `scene.restart` the HUD is reset, not stopped, so there is no flicker. It is stopped when the host leaves.
- **API:** direct methods, no event manager: `setLabel`, `setClock(ms, state)`, `showHint`, `showTitleCard`, `showDeathStamp`, `showResult`, `toast`.
- **Input:** HudScene sits above the host, so a hit HUD object consumes the pointer (Phaser `InputManager.globalTopOnly`, default true [I, tested in P05-T05]). `isOverUi` remains as a guard, fed from `hud.blockerRects()`.
- **Integration:**
  - SettingsScene and PausePanel sit above HudScene.
  - HudScene emits **no** `screen_view` (D-14).
  - Its modals register with the D-11 back router.

### 6.6 Evaluation matrix (GPU · memory · battery · reduced motion) — every visual improvement
Costs are per frame at k = 1 unless noted. "Fetches" means texel fetches; 390×844 = 0.33 MP. Inferred figures are confirmed by the device tests in P05 §14.

| Item | GPU | Memory | Battery | Reduced motion |
|---|---|---|---|---|
| R1 remove bloom | −≈11 full-frame passes, −14.5M fetches | − bloom ping-pong targets (each 1.32 MB at k = 1) | Large decrease (fragment work dominates) [I] | Fixes today's inconsistency: RM users got no bloom and a **brighter** game. Now identical brightness |
| R2 remove ball postFX | −32M fetches, −1 full-frame target | −1.32 MB | Large decrease [I] | None (static) |
| R3 vignette image | +1 quad, 0.33 MP blend (vs RT copy + pass) | +0.14 MB (128×276 RGBA) | Decrease | Static; identical under RM |
| R4 glow sprites | +≤0.26 MP (≤40 quads × ~80²), 1–2 draw calls | 0 (shared `'glow'` 0.26 MB) | Negligible | Pulses freeze at the **mean** α (brightness unchanged) |
| R5 baked static | +0.28 MP quad; −N Graphics draws; −per-frame tessellation | +1.12 MB at k = 1 (2.53 at 1.5; 4.49 at 2) | Decrease (CPU) | Static |
| R6 HudScene | +1 camera, +1–3 draw calls, +1 display-list walk | <50 KB JS | Negligible | HUD never shakes or zooms. Improves RM and vestibular comfort for everyone |
| R7 tiers + persisted watchdog | Bounds the worst case | +≈200 B settings | Removes the repeated 3–6 s jank per restart | — |
| R8 render scale | ×2.25 fill (Mid), ×4 (High). Total still ≈2.0M / ≈3.5M fetches vs **≈47M today** | Backbuffer 2.96 MB (1.5) / 5.27 MB (2) + text textures ×k² | Mid/High higher than Low, far below today [I] | — |
| Shake model | ~0 (scroll offset) | 0 | 0 | **Forced 0**; slider 0/50/100 |
| Flash image / death vignette | 1 full-screen ADD quad for ≤370 ms | 0 | ~0 | Removed (RM), or border tint (Flashes off) |
| Type scale + large text | Text textures grow ≤1.56× (×1.25²) when Large | +≤1 MB worst case | ~0 | n/a |
| E3 modal 0.96 / E2-HUD 0.88 | 0 | 0 | 0 | n/a; contrast-safe |
| Toast queue | ≤1 quad + text | ~0 | ~0 | Fade only |
| ScrollView inertia | Redraw only while moving | 0 | ~0 | Inertia kept; no rubber band |
| LevelNode path | ≤12 nodes + 1 idle ring | ~0 | ~0 | Idle ring off; auto-centre jumps |
| Shop PreviewStage (live ball) | 1 ball + trail + ≤25 particles while visible | ~0 (no physics body) | Small; paused when the shop is hidden | Static pose |
| World-complete ceremony | ≤2.4 s, ≤24 particles | 0 | ~0 | Crossfades only |
| Splash fast path | Removes ≈4.3 s of rendering per cold start | −2.2 MB (company logo not loaded) | Decrease | Static |
| EndScene finale | 6 s vignette, ≤40 particles | 0 | ~0 | Static constellation |
| High-contrast gameplay | +dashed outlines (baked where static) | 0 | 0 | Compatible |
| Transparent logo re-export | 0 | ≤3.2 MB (trimmed ≤896²) | 0 | n/a |

---

## 7. Accessibility options
| Option | Default | Behaviour | Implementation notes | Standard |
|---|---|---|---|---|
| **Attractor: Hold / Toggle** | Hold | Toggle: tap places, drag moves, a second tap (<12 px movement, <250 ms) removes | Feeds the D-01 input latch `{on, x, y}`; replays unaffected; no board flag | GAG "alternatives to holding"; WCAG 2.5.7 |
| **Game speed 100 / 85 / 70%** | 100 | The stepper accumulates `frameMs × speed`. Steps stay `SIM_STEP_MS`, so physics and replays are identical (D-01, D-26) | **Par rescale:** par/countdown are evaluated in sim time. The wall-clock par becomes `par / speed`, so the par star stays earnable. The chip shows sim seconds. Weekly/Endless results at <100% are stored `assist: true` and never submitted to boards (D-17/P8). Open conflict with D-07: P05 §1, C1 | GAG "adjust game speed"; Celeste wording: "Assist options let you tune the challenge." |
| **High-contrast gameplay** | Off | Hazards: 3 px dashed outline + stripes; magnets: ±glyph ×1.5; obstacles: rim `#9AABC3` (8.25:1); nebula and comets off; HUD surface 0.96; text ≥7:1 | Baked layer re-bakes on toggle | XAG 102 |
| **Text size Normal / Large** | Normal | ×1.25 on caption/body/label (§1.3); layouts reflow; `textFit` only for titles | `ui/text.ts` | Apple Larger Text; GAG |
| **Reduce motion System / On / Off** | System | §4.2 RM column; never changes steady-state brightness | `reducedMotionActive()` stays the single resolver | WCAG 2.3.3; Apple RM criteria |
| **Screen shake 0 / 50 / 100%** | 100 | Multiplies `maxPx`; RM forces 0 | `utils/shake.ts` | XAG 117 |
| **Flash effects** | On | Off: full-screen and death flashes become border/glow colour shifts. Always ≤3 flashes/s | `motion.ts` | WCAG 2.3.1 |
| **Haptics redundancy** | On | Same event map as audio: tap 10 · star 10 × n · win/perfect/boss patterns · death `[60,40,20]` · timer warn 3 × 15 at 3 s · near-goal 8 ms tick | `utils/haptics.ts`; Android `navigator.vibrate` + `VIBRATE` (D-11); `@capacitor/haptics` with iOS (D-29) | HIG "supplement with haptics and audio" |
| **Distinct fail sounds** | — | Hazard = falling buzz; timeout = two low tones; plus a near-goal shimmer that rises with proximity | `AudioSynth.playFailHazard/playFailTimeout/playNearGoal` | GAG "no info by sound/colour alone" |
| **Touch targets** | — | ≥48×48 logical, ≥8 apart; toolbar pitch 56 | Audit script | Android 48 dp; WCAG 2.5.8 |

---

## 8. Store-creative visual spec (hand-off to P11 / step 14)
**Preconditions.** The P5-A render fixes are live; the naming decision (D-19) is applied through `BRAND`; facts are current. Captions come from `docs/STATUS.md` facts at shoot time, never literals, because counts are outcomes (D-27). There is no "leaderboard" wording until boards ship (D-17), and the art is non-childish (D-25).

**Frame spec**
- 9:16 at **1080×1920**, no device frame, no people or hands.
- Caption band = top **18% (346 px)**: `ink950` → transparent gradient, Exo 2 800, ≥72 px, 3–5 words, `text.primary` with one accent word.
- Gameplay is captured with `?gfx=capture` (k ≈ 2.77 → 1080×2337) and cropped to y ∈ [a, a + 1574] below the band.
- Captions take ≤20% of the image. The first two frames carry the verb.

| # | Caption (template) | Shot |
|---|---|---|
| 1 | "Hold to pull the star." | Mid-pull: attractor ring, pull line, curved trail toward the goal (the attractor glow stands in for the finger) |
| 2 | "{levels} levels. {mechanics} forces." | 2×2 tile: zones, magnets, portals, gates, one world accent each |
| 3 | "Beat every world's boss." | Boss arena + WORLD CLEARED stars |
| 4 | "Endless Gravity Run." | Climb + "NEW BEST" badge (no board claims) |
| 5 | "Make the star yours." | Shop PreviewStage. **No prices visible** [A I.2] |
| 6 | "Calm. No rush. Assist options." | Settings accessibility section + a gameplay strip |

**Icon (512² full-square; Play applies the 30% radius)**
- No text. One bright ball + vortex swirl on full-bleed indigo.
- The key shape sits inside the central 66% (adaptive-icon safe zone).
- Silhouette check at **48 px and 96 px** on light and dark launchers: it must read as "glowing ball pulled into a swirl", not an iridescent donut [A I.2].
- One brand mark across icon, in-app logo and feature graphic.

**Feature graphic (1024×500)**
- Wordmark never clipped.
- The trail must curve *toward* the attractor ("pulled", not "thrown").

**Promo video (15–30 s, works muted, burned-in captions)**

| Time | Content |
|---|---|
| 0–2 s | Hold-to-pull hook, no logo intro |
| 2–8 s | 3 mechanics |
| 8–20 s | Boss + celebration |
| 20–26 s | Gravity Run |
| 26–30 s | End card |

**Logo (P5-A)**
- Re-export the menu logo with **alpha**: key out the navy square (corner RGB ≈ (1, 7, 36)) and crop the bottom-right 4-point sparkle [A E.1 #2].
- Trim to the alpha bounds + 8 px; RGBA.
- The menu adds its existing additive gold glow behind it.
