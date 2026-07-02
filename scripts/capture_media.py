"""Gravity Flow — full media-production capture pass.

Captures a broad, curate-later set of high-resolution screenshots from the LIVE
dev build (which exposes the window.__game Playwright hook only in DEV) across
every major system: Star Map, themed world panels (x15), gameplay with the
attractor pull, boss finales, Gravity Run (Endless + RUN OVER), Achievements,
the Cosmetics store, the win overlay, the main menu, and settings.

Output -> docs/media/raw/<profile>/NN-name.png  (gitignored; curate into the
committed docs/media/{store,github,portfolio,linkedin} folders afterwards).

Profiles (viewport x device_scale_factor -> exact output pixels):
  android  432x864 @2.5  -> 1080x2160  (Google Play workhorse; reused for
                                         portfolio / GitHub / LinkedIn finals)
  iphone67 430x932 @3    -> 1290x2796  (App Store 6.7")
  ipad     1024x1366 @2  -> 2048x2732  (App Store 12.9"; LETTERBOXED — the game
                                         is 0.462 aspect, so cosmic side bars)

Prereqs:  npm run dev  (http://localhost:5173)  +  playwright (pip).
Usage:    python scripts/capture_media.py
          python scripts/capture_media.py android      # one profile only
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = "http://localhost:5173"
OUT = Path("docs/media/raw")

# ---------------------------------------------------------------------------
# Seed localStorage so the whole game reads as a polished, fully-progressed
# save: every level 3-starred, healthy currency, a lively owned/locked store,
# a live daily streak + win streak, an unclaimed milestone/login ledger, and
# every achievement unlocked. Keys verified against src/utils/*Store.ts AFTER
# Waves 2-3 (progress is v9 / 150 levels; cosmetics v2).
# ---------------------------------------------------------------------------
SEED = """()=>{
  const set=(k,v)=>{try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));}catch(e){}};
  // Progress: all 150 levels at 3 stars + gem + a believable best time.
  const prog={}; for(let n=1;n<=150;n++) prog[n]={stars:3,bestTimeMs:3600+((n*53)%2600),gem:true};
  set('gravity-flow:progress:v9', prog);
  // Currency — healthy but believable.
  set('gravity-flow:currency:v1','2400');
  set('gravity-flow:fragments:v1','480');
  // Cosmetics: own a spread across rarities/categories; leave bundle+mythic
  // items LOCKED so the store shows locked previews too. Equip a premium look.
  set('gravity-flow:cosmetics:v2', {
    owned:['default','trail_default','arrival_default','ember','mint','ion','solar',
           'cosmic_nova','cosmic_pulsar','cosmic_supernova','cyber_neon','mythic_titan',
           'trail_fire','trail_ice','trail_lightning','arrival_starburst','arrival_portal','arrival_nova'],
    equipped:{skin:'cosmic_supernova',trail:'trail_lightning',arrival:'arrival_nova'}
  });
  // One-time reward ledger (RewardStore: 'login:<date>' / 'stars:<n>' /
  // 'collection:<id>' keys). Left EMPTY (was a stale, never-read
  // 'dailyFreeClaimedDate' field before) so: (a) the MainMenu DAILY REWARD
  // chest reads claimable, and (b) a forced campaign win fires a fresh
  // star-milestone celebration toast (Rewards.claimMilestoneRewards).
  set('gravity-flow:rewards:v1', {});
  // Daily Challenge streak: played YESTERDAY (so the gold DAILY badge still
  // shows today) with a live streak. Wave 2b Task 5 adds an earned
  // streak-freeze token (freezeCount — surfaces the "· protected" suffix) and
  // a SEPARATE consecutive-login-day counter (loginStreak/lastLoginDate —
  // independent of the challenge streak, since opening the app isn't playing
  // the daily) also last-seen yesterday, so DailyStore.loginBonusClaimedToday()
  // reads false today (chest gold/claimable) once claimed it would continue
  // the ladder from day 5.
  const y=new Date(Date.now()-864e5); const yk=`${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
  set('gravity-flow:daily', {lastPlayedDate:yk, streak:7, bestStreak:12, freezeCount:2, loginStreak:4, lastLoginDate:yk});
  // Win-streak (Wave 2a StreakStore — campaign wins only, separate from the
  // Daily Challenge streak above; broken only by a death). Seeded ONE below
  // the BLAZE tier (RETENTION.STREAK_BLAZE_MIN=5) so a single forced win
  // (StreakStore.win() increments before display) renders the exact
  // `x5 BLAZE` win-overlay flourish.
  set('gravity-flow:streak:v1', {current:4, best:9});
  // Lifetime stats + every achievement unlocked.
  set('gravity-flow:stats', {deaths:42, portalJumps:88});
  set('gravity-flow:achievements', ['first_win','ten_done','half_done','all_done','stars_30',
    'stars_90','stars_all','perfect_10','gems_25','master_world','portal_50','deaths_25','streak_3','streak_7']);
  // Leaderboards — a personal Endless best for the Gravity Run hub.
  set('gravity-flow:leaderboard:endless','1840');
  set('gravity-flow:run:coached','1');
  // Skip the one-time L1 coach-mark + first-ever-win FTUE beat so gameplay/win
  // frames are clean. NOTE: the live SettingsStore key has NO ':v1' suffix —
  // the previous seed wrote to a key the store never reads (a silent no-op
  // masked by the seeded progress already suppressing the FTUE beat via
  // hadPriorProgress); fixed here to the real key + real field names.
  set('gravity-flow:settings', {seenTutorial:true, seenFirstWin:true});
}"""

# Stop every running scene, then start the target one cleanly.
START = """([key,data])=>{const g=window.__game;
  g.scene.getScenes(true).slice().forEach(s=>g.scene.stop(s.scene.key));
  g.scene.start(key, data||{});}"""

# Settings overlay on top of a paused menu (its real launch path).
SETTINGS_OVERLAY = """()=>{const g=window.__game;
  g.scene.getScenes(true).slice().forEach(s=>g.scene.stop(s.scene.key));
  g.scene.start('MainMenuScene');}"""
SETTINGS_RUN = """()=>{const g=window.__game; g.scene.run('SettingsScene',{caller:'MainMenuScene'}); g.scene.bringToTop('SettingsScene');}"""

# Game-space (gx,gy) -> page CSS px, via the live FIT canvas bounds. Resolution
# independent, so the same hold points work across every profile.
TO_PAGE = """([gx,gy])=>{const g=window.__game; const b=g.scale.canvasBounds; const s=g.scale.gameSize;
  return [b.left + gx*b.width/s.width, b.top + gy*b.height/s.height];}"""

# Ball + goal positions of the live GameScene (game-space), or null if not ready.
GAME_POS = """()=>{const g=window.__game; const s=g.scene.getScene('GameScene');
  if(!s||!s.ball||!s.goal||!s.ball.body) return null;
  return {bx:s.ball.body.position.x, by:s.ball.body.position.y, gx:s.goal.x, gy:s.goal.y};}"""

ENDLESS_BALL = """()=>{const g=window.__game; const s=g.scene.getScene('EndlessScene');
  if(!s||!s.ball||!s.ball.body) return null; return {bx:s.ball.body.position.x, by:s.ball.body.position.y};}"""

# Force a clean 3-star LEVEL COMPLETE: mark the gem collected (the run is well
# under par right after start), then fire the scene's own win flow.
WIN = """()=>{const g=window.__game; const s=g.scene.getScene('GameScene');
  if(!s) return false; try{ s.gemCollected=true; s.triggerWin(); return true; }catch(e){ return false; }}"""


def reseed(pg):
    """Fresh SEED + reload. RewardStore/StreakStore cache their state in page
    memory for the life of the page — every scene navigation done via START
    reuses that SAME memory, so one forced win's claims (milestones, streak
    count) leak into every later forced win in the same page. Dedicated
    "wow"-moment captures (milestone toast, streak flourish, boss celebration)
    each need a clean, deterministic ledger, so they reseed+reload right
    before forcing their win — isolated from whatever earlier shots did."""
    pg.evaluate(SEED)
    pg.reload(wait_until="load")
    pg.wait_for_timeout(2600)


def hold_and_shot(pg, hold_game_xy, settle, path, hold_ms=380, release=True):
    """Press+hold an attractor at a game-space point, screenshot mid-pull, release."""
    px = pg.evaluate(TO_PAGE, list(hold_game_xy))
    pg.mouse.move(px[0], px[1])
    pg.mouse.down()
    pg.wait_for_timeout(hold_ms)
    pg.screenshot(path=str(path))
    if release:
        pg.mouse.up()
    pg.wait_for_timeout(120)


def shoot_gameplay(pg, level, settle, path, win=False):
    """Start a level, drive a held attractor, capture the pull (or the win overlay)."""
    pg.evaluate(START, ["GameScene", {"level": level}])
    pg.wait_for_timeout(settle)
    pos = pg.evaluate(GAME_POS)
    if not pos:
        pg.screenshot(path=str(path))  # fallback: static arena
        return
    if win:
        # Fire the scene's win flow directly for a clean 3-star LEVEL COMPLETE overlay.
        ok = pg.evaluate(WIN)
        pg.wait_for_timeout(1700 if ok else 300)
        pg.screenshot(path=str(path))
    else:
        # Hold partway ball->goal: visible pull line + ball mid-flight + trail.
        hx = pos["bx"] + (pos["gx"] - pos["bx"]) * 0.55
        hy = pos["by"] + (pos["gy"] - pos["by"]) * 0.55
        hold_and_shot(pg, (hx, hy), settle, path, hold_ms=420)


# ---------------------------------------------------------------------------
# Shot lists. Each entry: (kind, *args, name). Kinds:
#   scene       (key, data, settle)
#   game        (level, settle)              -> gameplay w/ attractor pull
#   win         (level, settle)              -> LEVEL COMPLETE overlay
#   endless     (settle)                     -> Gravity Run mid-climb (held)
#   runover     (wait)                       -> RUN OVER overlay (let it die)
#   settings()
#   living      (level, hold_ms)             -> long-held full-charge pull + comet dwell
#   win-fresh   (level, settle)              -> reseed()'d win overlay (isolated ledger)
#   scene-fresh (key, data, settle)          -> reseed()'d scene (isolated ledger)
# ---------------------------------------------------------------------------
WORLD_NAMES = ["foundations","currents","clockwork","peril","wells","rifts","gates",
               "convergence","gauntlet","binary","labyrinth","tempest","ascension",
               "singularity","homecoming"]
BOSS_LEVELS = list(range(10, 151, 10))  # 10,20,...,150 — each world finale

# Representative gameplay levels picked for visual variety across mechanics/worlds.
GAMEPLAY_LEVELS = [2, 13, 25, 35, 45, 55, 65, 75, 95, 105, 115, 135]

def android_shots():
    s = []
    s.append(("scene", "MainMenuScene", None, 1200, "01-main-menu"))
    s.append(("scene", "WorldMapScene", None, 1300, "02-star-map"))
    s.append(("scene", "RunSelectScene", None, 1100, "03-gravity-run-hub"))
    s.append(("endless", 800, "04-endless-climb"))
    s.append(("runover", 5200, "05-endless-runover"))
    s.append(("scene", "AchievementsScene", None, 1100, "06-achievements"))
    s.append(("scene", "CosmeticsScene", {"tab": "skin"}, 1100, "07-cosmetics-skins"))
    s.append(("scene", "CosmeticsScene", {"tab": "trail"}, 1000, "08-cosmetics-trails"))
    s.append(("scene", "CosmeticsScene", {"tab": "arrival"}, 1000, "09-cosmetics-arrivals"))
    s.append(("settings", 1000, "10-settings"))
    s.append(("win", 2, 900, "11-win-overlay"))
    # Themed world panels x15.
    for i, name in enumerate(WORLD_NAMES, start=1):
        s.append(("scene", "LevelSelectScene", {"world": i}, 1000, f"world-{i:02d}-{name}"))
    # Gameplay-with-pull across worlds.
    for lv in GAMEPLAY_LEVELS:
        s.append(("game", lv, 950, f"play-l{lv:03d}"))
    # Boss finales (static arenas).
    for lv in BOSS_LEVELS:
        s.append(("game-static", lv, 1100, f"boss-l{lv:03d}"))
    # ── Wave 2-3 "new juice" targets (Wave 4 Task 1) — each forced-win shot
    # below reseeds first (see `reseed`) so it renders deterministically no
    # matter what any earlier shot in this run already claimed/incremented.
    # Living gameplay: World 15 (HOMECOMING, the richest starAlpha/nebula
    # theme) with a long-held attractor at full charge (tendrils + lensing
    # ring cap at 900ms hold) and enough dwell time (comet cadence tops out
    # at 9s) for a drifting comet to enter — a "premium in motion" still.
    s.append(("living", 145, 9700, "20-living-world15"))
    # 3-star / boss celebration: the campaign finale (level163 "THE LONG WAY
    # HOME", boss:true) — the tiered celebration ladder's top rung (screen
    # bloom + camera punch + STAR FREED + PERFECT!).
    s.append(("win-fresh", 150, 1100, "21-boss-celebration"))
    # Win-streak flourish: a non-first, non-boss level — the seeded streak
    # renders the `x5 BLAZE` kicker on the win overlay.
    s.append(("win-fresh", 65, 950, "22-streak-flourish"))
    # Milestone toast: a non-first, non-boss level, fresh RewardStore — the
    # total-stars milestone (450/450 stars seeded → the highest, 150 "Celestial")
    # celebration toast below the panel.
    s.append(("win-fresh", 45, 950, "23-milestone-toast"))
    # Daily reward + streak protection: MainMenu's gold DAILY REWARD chest
    # (claimable — no 'login:<today>' claim) + the "· protected" suffix on the
    # DAILY caption (an earned streak-freeze token held).
    s.append(("scene-fresh", "MainMenuScene", None, 1200, "24-daily-reward-chest"))
    # Honest store framing: the Bundles tab — truthful per-bundle value lines
    # + the single config-flagged BEST VALUE tag (no fake-savings math).
    s.append(("scene", "CosmeticsScene", {"tab": "bundle"}, 1100, "25-cosmetics-bundle"))
    return s

def ios_shots():
    return [
        ("scene", "MainMenuScene", None, 1200, "01-main-menu"),
        ("scene", "WorldMapScene", None, 1300, "02-star-map"),
        ("game", 13, 950, "03-play-currents"),
        ("game", 55, 950, "04-play-rifts"),
        ("endless", 800, "05-endless-climb"),
        ("scene", "CosmeticsScene", {"tab": "skin"}, 1100, "06-cosmetics"),
        ("scene", "AchievementsScene", None, 1100, "07-achievements"),
        ("scene", "LevelSelectScene", {"world": 6}, 1000, "08-world-rifts"),
        ("scene", "RunSelectScene", None, 1100, "09-gravity-run-hub"),
        ("win", 2, 900, "10-win-overlay"),
        ("game-static", 150, 1100, "11-boss-finale"),
        ("game", 35, 950, "12-play-peril"),
    ]

def ipad_shots():
    return [
        ("scene", "WorldMapScene", None, 1300, "01-star-map"),
        ("game", 55, 950, "02-play-rifts"),
        ("scene", "LevelSelectScene", {"world": 2}, 1000, "03-world-currents"),
        ("endless", 800, "04-endless-climb"),
        ("game-static", 150, 1100, "05-boss-finale"),
    ]

PROFILES = {
    "android":  dict(w=432, h=864, dsf=2.5, shots=android_shots),
    "iphone67": dict(w=430, h=932, dsf=3.0, shots=ios_shots),
    "ipad":     dict(w=1024, h=1366, dsf=2.0, shots=ipad_shots),
}


def run_profile(browser, name, cfg, errs):
    out = OUT / name
    out.mkdir(parents=True, exist_ok=True)
    pg = browser.new_page(viewport={"width": cfg["w"], "height": cfg["h"]}, device_scale_factor=cfg["dsf"])
    pg.on("console", lambda m: errs.append(f"[{name}] {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(f"[{name}] {e}"))
    pg.goto(URL, wait_until="load")
    pg.wait_for_timeout(2200)
    reseed(pg)

    for shot in cfg["shots"]():
        kind = shot[0]
        path = out / f"{shot[-1]}.png"
        if kind == "scene":
            _, key, data, settle, _ = shot
            pg.evaluate(START, [key, data])
            pg.wait_for_timeout(settle)
            pg.screenshot(path=str(path))
        elif kind == "game":
            _, lv, settle, _ = shot
            shoot_gameplay(pg, lv, settle, path, win=False)
        elif kind == "game-static":
            _, lv, settle, _ = shot
            pg.evaluate(START, ["GameScene", {"level": lv}])
            pg.wait_for_timeout(settle)
            pg.screenshot(path=str(path))
        elif kind == "win":
            _, lv, settle, _ = shot
            shoot_gameplay(pg, lv, settle, path, win=True)
        elif kind == "endless":
            _, settle, _ = shot
            pg.evaluate(START, ["EndlessScene", {"mode": "endless"}])
            pg.wait_for_timeout(settle)
            bp = pg.evaluate(ENDLESS_BALL)
            if bp:
                hold_and_shot(pg, (bp["bx"], bp["by"] - 90), settle, path, hold_ms=460)
            else:
                pg.screenshot(path=str(path))
        elif kind == "runover":
            _, wait, _ = shot
            pg.evaluate(START, ["EndlessScene", {"mode": "endless"}])
            pg.wait_for_timeout(wait)  # no input -> falls behind -> RUN OVER overlay
            pg.screenshot(path=str(path))
        elif kind == "settings":
            _, settle, _ = shot
            pg.evaluate(SETTINGS_OVERLAY)
            pg.wait_for_timeout(900)
            pg.evaluate(SETTINGS_RUN)
            pg.wait_for_timeout(settle)
            pg.screenshot(path=str(path))
        elif kind == "living":
            # Long-held attractor (full tendril/lensing charge) + enough dwell
            # time for a comet to drift through. Hold point is offset SIDEWAYS
            # from the ball (not toward the goal) so a multi-second hold can
            # never accidentally win the level or drift into a hazard.
            _, lv, hold_ms, _ = shot
            pg.evaluate(START, ["GameScene", {"level": lv}])
            pg.wait_for_timeout(900)
            pos = pg.evaluate(GAME_POS)
            if pos:
                hx = min(pos["bx"] + 70, 340)
                hy = pos["by"] + 40
                hold_and_shot(pg, (hx, hy), 0, path, hold_ms=hold_ms)
            else:
                pg.screenshot(path=str(path))
        elif kind == "win-fresh":
            _, lv, settle, _ = shot
            reseed(pg)
            shoot_gameplay(pg, lv, settle, path, win=True)
        elif kind == "scene-fresh":
            _, key, data, settle, _ = shot
            reseed(pg)
            pg.evaluate(START, [key, data])
            pg.wait_for_timeout(settle)
            pg.screenshot(path=str(path))
        print(f"  [{name}] {path.name}")
    pg.close()


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    profiles = {only: PROFILES[only]} if only in PROFILES else PROFILES
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--disable-gpu", "--use-gl=swiftshader"])
        for name, cfg in profiles.items():
            print(f"profile: {name}")
            run_profile(b, name, cfg, errs)
        b.close()
    print("CONSOLE ERRORS:", errs if errs else "none")


if __name__ == "__main__":
    main()
