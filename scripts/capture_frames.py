"""Capture short PNG frame sequences for the animated README GIFs.

Reuses the seed + scene-nav helpers from capture_media.py. Three clips:
  gravity-pull     — the core mechanic: hold to pull the star along an arc
  endless-climb    — Gravity Run scrolling upward
  win-celebration  — goal absorb flash + particle burst + LEVEL COMPLETE pop

Output -> docs/media/raw/frames/<clip>/NNN.png  (assembled by scripts/assemble_gifs.mjs).
Prereqs: npm run dev + playwright.  Usage: python scripts/capture_frames.py
"""
import sys
from pathlib import Path
sys.path.insert(0, "scripts")
from capture_media import URL, SEED, START, TO_PAGE, GAME_POS, ENDLESS_BALL, WIN  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

OUT = Path("docs/media/raw/frames")
# Modest source size (assembler downscales to 360w); keeps GIFs light.
VW, VH, DSF = 432, 864, 1.5


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

        # 1) gravity-pull — hold midway ball->goal so the star arcs under the pull.
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

        # 2) endless-climb — hold above the star to keep it alive while the camera scrolls.
        pg.evaluate(START, ["EndlessScene", {"mode": "endless"}])
        pg.wait_for_timeout(800)
        bp = pg.evaluate(ENDLESS_BALL)
        if bp:
            px = pg.evaluate(TO_PAGE, [bp["bx"], bp["by"] - 110])
            pg.mouse.move(px[0], px[1]); pg.mouse.down()
            grab_series(pg, "endless-climb", 24, 55)
            pg.mouse.up()

        # 3) win-celebration — fire the win flow, capture absorb + burst + overlay pop.
        pg.evaluate(START, ["GameScene", {"level": 35}])
        pg.wait_for_timeout(900)
        pg.evaluate(WIN)
        grab_series(pg, "win-celebration", 18, 70)

        b.close()
    print("done")


if __name__ == "__main__":
    main()
