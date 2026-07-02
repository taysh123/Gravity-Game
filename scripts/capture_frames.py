"""Capture short PNG frame sequences for the animated README GIFs.

Reuses the seed + scene-nav helpers from capture_media.py. Four clips:
  gravity-pull     — the core mechanic: hold to pull the star along an arc
  endless-climb    — Gravity Run scrolling upward
  win-celebration  — reseed()'d 3-star celebration ESCALATION: goal absorb +
                      burst + LEVEL COMPLETE pop + stars-in + PERFECT! +
                      the Wave 2-3 "new juice" (×5 BLAZE streak flourish +
                      150-STARS milestone toast) settling in. A non-boss level
                      (LEVEL 65 — short HUD chip) so the frame never risks the
                      known long-boss-title/toolbar clip (see docs/media
                      curation notes) — a celebration hero must ship clean.
  living-world     — World 15 (HOMECOMING): a long-held attractor at full
                      charge (tendrils + lensing ring) against the reactive
                      cosmic background, dwelling long enough for a drifting
                      comet to cross (comets spawn within COMET_MAX_GAP_MS).

Slow-motion capture note: in this environment a single page.screenshot() call
costs ~1.5-2.5s wall-clock (CDP round-trip + swiftshader encoding) — far
longer than the ~1-2s of REAL game motion each clip is designed to show, and
the page keeps running in real time underneath regardless (it is not paused
while we await the screenshot). Left alone, a 20-shot series would span
30-50 real seconds, long enough for a held ball to already reach the goal (or
a win overlay to auto-advance) before the second frame. So each physics/UI
-driven clip pokes the existing window.__game dev hook to SLOW the game's own
clock (game.loop.timeScale for Matter physics; scene tweens/time.timeScale
for the win-overlay's entrance tweens) so its short burst of real motion
stretches to match our achievable screenshot cadence, giving each frame a
genuinely distinct sample instead of N near-duplicates of the settled state.
This only pokes already-exposed dev handles for capture purposes — no src/
edit, and nothing here ships in the game.

Output -> docs/media/raw/frames/<clip>/NNN.png  (assembled by scripts/assemble_gifs.mjs).
Prereqs: npm run dev + playwright.  Usage: python scripts/capture_frames.py
"""
import sys
from pathlib import Path
sys.path.insert(0, "scripts")
from capture_media import URL, SEED, START, TO_PAGE, GAME_POS, reseed  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

OUT = Path("docs/media/raw/frames")
# Modest source size (assembler downscales to 320w); keeps GIFs light.
VW, VH, DSF = 432, 864, 1.5

# Global game-clock scale (Matter physics + any per-frame update() motion).
# 1.0 = real time.
SET_TIMESCALE = """(v)=>{ if (window.__game) window.__game.loop.timeScale = v; return true; }"""

# Ball position AND alive/dead state for EndlessScene. capture_media.py's
# ENDLESS_BALL doesn't expose isDead — the ball entity persists (frozen,
# non-null position) even after a RUN OVER, so position-nullity alone can't
# detect death; this drives the endless-climb restart-on-death loop below.
ENDLESS_STATE = """()=>{const g=window.__game; const s=g.scene.getScene('EndlessScene');
  if(!s || !s.ball || !s.ball.body) return null;
  return {bx:s.ball.body.position.x, by:s.ball.body.position.y, dead: !!s.isDead};}"""

# Win trigger that ALSO stretches the overlay's own tween/delayedCall timing
# (Scene tweens + time timeScale) and pauses the auto-advance timer, so the
# ~1.8s real entrance (stars -> PERFECT! -> BLAZE -> milestone) spreads across
# the many real seconds our slow screenshot loop actually takes.
WIN_SLOW = """(scale)=>{const g=window.__game; const s=g.scene.getScene('GameScene');
  if(!s) return false;
  try{
    s.tweens.timeScale = scale;
    s.time.timeScale = scale;
    s.gemCollected = true;
    s.triggerWin();
    if (s.advanceTimer) s.advanceTimer.paused = true; // don't auto-restart mid-capture
    return true;
  }catch(e){ return false; }
}"""


def grab_series(pg, folder, n, gap_ms):
    d = OUT / folder
    d.mkdir(parents=True, exist_ok=True)
    for i in range(n):
        pg.screenshot(path=str(d / f"{i:03d}.png"))
        pg.wait_for_timeout(gap_ms)
    print(f"  {folder}: {n} frames")


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--disable-gpu", "--use-gl=swiftshader"])
        pg = b.new_page(viewport={"width": VW, "height": VH}, device_scale_factor=DSF)
        pg.goto(URL, wait_until="load")
        pg.wait_for_timeout(2200)
        pg.evaluate(SEED)
        pg.reload(wait_until="load")
        pg.wait_for_timeout(2600)

        # 1) gravity-pull — hold midway ball->goal so the star arcs under the
        # pull. ~33x slow-motion so the ~1.1s arc spreads across our achievable
        # real screenshot cadence instead of completing in the first frame.
        pg.evaluate(SET_TIMESCALE, 0.03)
        pg.evaluate(START, ["GameScene", {"level": 13}])
        pg.wait_for_timeout(900)
        pos = pg.evaluate(GAME_POS)
        if pos:
            hx = pos["bx"] + (pos["gx"] - pos["bx"]) * 0.5
            hy = pos["by"] + (pos["gy"] - pos["by"]) * 0.5 - 30
            px = pg.evaluate(TO_PAGE, [hx, hy])
            pg.mouse.move(px[0], px[1]); pg.mouse.down()
            grab_series(pg, "gravity-pull", 20, 55)
            pg.mouse.up()

        # 2) endless-climb — hold above the star to keep it alive while the
        # camera scrolls. Real-time (NOT slowed): EndlessScene's fall-behind
        # boundary/difficulty ramp isn't reliably gated by game.loop.timeScale
        # the same way Matter's physics accumulator is (a slowed hold here
        # still fell behind and died in testing). A FIXED hold point (the
        # original design) also doesn't survive our slower real screenshot
        # cadence — the ball drifts far from a single stale point over many
        # real seconds — so re-read the ball's LIVE position and re-aim the
        # hold every iteration. Belt-and-suspenders: if the run still ends
        # (RUN OVER) mid-series despite tracking, immediately restart the run
        # so the assembled GIF never includes a dead/RUN OVER frame.
        pg.evaluate(SET_TIMESCALE, 1.0)

        def start_endless_run():
            pg.evaluate(START, ["EndlessScene", {"mode": "endless"}])
            pg.wait_for_timeout(800)
            bp0 = pg.evaluate(ENDLESS_STATE)
            if bp0 and not bp0["dead"]:
                px0 = pg.evaluate(TO_PAGE, [bp0["bx"], bp0["by"] - 110])
                pg.mouse.move(px0[0], px0[1])
                pg.mouse.down()
                return True
            return False

        d = OUT / "endless-climb"
        d.mkdir(parents=True, exist_ok=True)
        held = start_endless_run()
        n, i, attempts = 24, 0, 0
        while i < n and attempts < n * 4:
            attempts += 1
            bp = pg.evaluate(ENDLESS_STATE)
            if not bp or bp["dead"]:
                if held:
                    pg.mouse.up()
                held = start_endless_run()
                continue
            px = pg.evaluate(TO_PAGE, [bp["bx"], bp["by"] - 110])
            pg.mouse.move(px[0], px[1])
            pg.screenshot(path=str(d / f"{i:03d}.png"))
            pg.wait_for_timeout(55)
            i += 1
        if held:
            pg.mouse.up()
        print(f"  endless-climb: {i} frames ({attempts} attempts)")

        # 3) win-celebration — reseed() for a clean, deterministic ledger (one
        # BELOW the BLAZE tier + an unclaimed 150-stars milestone), restore
        # real-time physics (irrelevant — Matter is paused on win — but keep
        # state predictable), then fire the win flow on a short-chip, non-boss
        # level (LEVEL 65) with the overlay's own clock slowed ~20x so the
        # entrance escalation (absorb -> card pop -> stars -> PERFECT! -> BLAZE
        # + milestone) samples across our achievable screenshot cadence.
        pg.evaluate(SET_TIMESCALE, 1.0)
        reseed(pg)
        pg.evaluate(START, ["GameScene", {"level": 65}])
        pg.wait_for_timeout(900)
        pg.evaluate(WIN_SLOW, 0.05)
        grab_series(pg, "win-celebration", 22, 70)

        # 4) living-world — World 15's richest theme, a long-held attractor at
        # full visual charge (tendrils + lensing cap at CHARGE_FULL_MS=900ms)
        # dwelling long enough for a drifting comet (spawns within
        # COMET_MAX_GAP_MS=9000ms of REAL time) to cross the reactive nebula
        # background — real-time (timeScale 1.0), since our slow screenshot
        # cadence already gives ample real dwell for the comet cadence to
        # fire more than once. Hold point is offset SIDEWAYS from the ball
        # (never toward the goal) so the long hold can never accidentally win
        # the level or drift into the nearby hazard.
        pg.evaluate(SET_TIMESCALE, 1.0)
        pg.evaluate(START, ["GameScene", {"level": 145}])
        pg.wait_for_timeout(900)
        pos = pg.evaluate(GAME_POS)
        if pos:
            hx = min(pos["bx"] + 70, 340)
            hy = pos["by"] + 40
            px = pg.evaluate(TO_PAGE, [hx, hy])
            pg.mouse.move(px[0], px[1]); pg.mouse.down()
            grab_series(pg, "living-world", 28, 250)
            pg.mouse.up()

        b.close()
    print("done")


if __name__ == "__main__":
    main()
