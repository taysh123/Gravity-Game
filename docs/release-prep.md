# Release Prep — Gravity Flow v0.2.0 (public playable build)

> First public, shareable build. This doc records what's frozen, where it's live, and how to resume.
> Single source of truth for project state stays **[`docs/project-status.md`](./project-status.md)**.

---

## Release at a glance

| | |
|---|---|
| **Game** | GRAVITY FLOW — by **True Story Labs** |
| **Version / tag** | `v0.2.0` (matches `package.json`) |
| **Branch** | `master` (synced with `origin`) |
| **Repository** | https://github.com/taysh123/Gravity-Game |
| **Live demo (Vercel)** | **https://gravity-flow-six.vercel.app** (share this) |
| **Quality gates** | `tsc` clean · **28 tests** pass · `npm run build` clean · live menu has no console errors |

---

## What's ready to share

A complete, playable cosmic physics puzzler:

- **27 levels across 5 worlds** — Foundations · Currents · Clockwork · Peril · Wells.
- **6 mechanics** — attractor pull (hold to pull), gravity zones, **magnets (attract/repel wells)**,
  moving platforms, hazards (fail-on-touch), timed levels (countdown fail).
- **3-star scoring** (complete / gem / under-par) with sequential unlock + menu Continue.
- **Daily Challenge** — a date-seeded level + consecutive-day streak (DAILY menu button + badge).
- Full premium presentation: splash → cosmic intro → menu → game → end; glass UI (Orbitron/Exo 2);
  settings (sound/music/haptics/reduced-motion); mobile touch + safe-area handling.

**Known caveat to mention to testers:** level *balance* for Worlds 2-5 is tuned in-browser but not yet
validated with real finger input on a phone (see the open M0 item in `project-status.md`). The game is
fully playable; some later levels may feel hard/tight pending that pass.

---

## How it's built / deployed

- **Stack:** Phaser 3 · TypeScript (strict) · Vite 5. Static SPA — no backend.
- **Build:** `npm run build` (`tsc && vite build`) → `dist/`. `vite.config.ts` uses `base: './'`
  (relative asset paths), so the static output works at any path.
- **Vercel config:** `vercel.json` pins `framework: vite`, `buildCommand: npm run build`,
  `outputDirectory: dist`.

### Vercel deployment

- Deployed from the Vercel CLI (account `tayshofer05-7241`, scope
  `tays-projects-d5aefd6e`, project `gravity-flow`): `vercel --prod --yes`.
- **Production URL (share this):** https://gravity-flow-six.vercel.app
- Deployment-specific URL: https://gravity-flow-anmu7cere-tays-projects-d5aefd6e.vercel.app
- Verified live: HTTP 200, canvas renders the menu, **no console errors** (`scripts/verify_live.py`).
- Redeploy after pushing changes: `vercel --prod` (or connect the GitHub repo in the Vercel dashboard
  for auto-deploy on push to `master`). The project is already linked (`.vercel/`, gitignored).

### GitHub release

- Tag `v0.2.0` is pushed to `origin`.
- The GitHub **Release** object was created manually (the `gh` CLI is not installed on this machine):
  - Web: https://github.com/taysh123/Gravity-Game/releases/new?tag=v0.2.0 → Publish release.
  - Or, after `winget install GitHub.cli`: `gh release create v0.2.0 --generate-notes`.

---

## How to resume work later

1. Read **`docs/project-status.md`** (full state) — quick version: `docs/session-handoff.md`.
2. The only open item from Sprint E is **M0 — device-playtest balance pass** on Worlds 2-5.
   Next mechanic after that: **Portals (World 6 — Rifts)**.
3. Monetization + store release remain gated on the **PWA vs Capacitor** ship-target decision.
4. `npm run dev` to develop; keep `tsc` / `npm test` / `npm run build` green; commit per milestone and
   `git push`. Tag future public builds (`v0.3.0`, …) and redeploy with `vercel --prod`.
