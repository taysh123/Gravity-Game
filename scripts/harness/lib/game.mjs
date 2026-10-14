// Helpers that read and drive the running Phaser game through window.__harnessGame (see browser.mjs).
//
// Rules for everything here (and for the checks that use it):
//   - Wait on game state, never on a fixed sleep: a scene is active, a text is on screen, the entrance tweens have finished.
//     The only clocks are Playwright's own timeouts, which are failure limits, not delays.
//   - Reading uses the objects Phaser already has (scene.children, scene.input); nothing here changes gameplay or data.
//   - Taps are REAL pointer events (page.mouse) at positions computed from the live objects, never hard-coded pixels.

import { captureProblem } from './capture.mjs';

const SPLASH_SCENES = ['CompanySplashScene', 'IntroSplashScene'];
const SETTLE_CALM_MS = 500; // how long nothing may be animating (page clock, which follows the frame rate of the game)
const SETTLE_CALM_FRAMES = 6; // ... and for at least this many frames, so a slow software-rendered frame cannot fake calm
const DEFAULT_TIMEOUT = 20000;

// ---- frames and waiting ----------------------------------------------------------------------------------------------

/** Resolve after n animation frames of the page (progress of the game, not wall-clock time). */
export function frames(page, n) {
  return page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let i = 0;
        const step = () => (++i >= count ? resolve() : requestAnimationFrame(step));
        requestAnimationFrame(step);
      }),
    n,
  );
}

/** waitForFunction with a message that says what was being waited for. */
export async function waitFor(page, what, fn, arg, timeout = DEFAULT_TIMEOUT) {
  try {
    return await page.waitForFunction(fn, arg, { timeout });
  } catch (err) {
    throw new Error(`timed out after ${timeout} ms waiting for ${what}: ${String(err.message).split('\n')[0]}`);
  }
}

export const isActive = (page, key) => page.evaluate((k) => window.__harnessGame.scene.isActive(k), key);
export const activeScenes = (page) => page.evaluate(() => window.__harnessGame.scene.getScenes(true).map((s) => s.scene.key));

export const waitForScene = (page, key, timeout) => waitFor(page, `scene ${key} to be active`, (k) => window.__harnessGame?.scene.isActive(k), key, timeout);
export const waitForSceneStopped = (page, key, timeout) => waitFor(page, `scene ${key} to stop`, (k) => !window.__harnessGame.scene.isActive(k), key, timeout);

/**
 * Wait until the given scenes (default: every active one) have nothing animating that will finish: no finite tween and no
 * running camera effect, for SETTLE_CALM_MS of the page clock and at least SETTLE_CALM_FRAMES frames. Looping tweens
 * (breathing, pulses) do not count: they never finish. A tween that a delayed call starts inside that window restarts the
 * count, so staggered entrances (delays are milliseconds, hence a time window and not a frame count) are waited out.
 */
export async function settle(page, keys = null, timeout = DEFAULT_TIMEOUT) {
  const ok = await page.evaluate(
    ([sceneKeys, calmMs, calmFrames, limit]) =>
      new Promise((resolve) => {
        const g = window.__harnessGame;
        const t0 = performance.now();
        let calm = 0;
        let calmSince = performance.now();
        const finite = (t) => !t.isInfinite && !t.data.some((d) => d.repeat === -1);
        const busy = (sc) => {
          if (sc.tweens && sc.tweens.getTweens().some(finite)) return true;
          const cam = sc.cameras && sc.cameras.main;
          return !!cam && (cam.fadeEffect.isRunning || cam.shakeEffect.isRunning || cam.flashEffect.isRunning || cam.panEffect.isRunning || cam.zoomEffect.isRunning);
        };
        const step = () => {
          const scenes = sceneKeys ? sceneKeys.map((k) => g.scene.getScene(k)).filter(Boolean) : g.scene.getScenes(true);
          if (scenes.some(busy)) {
            calm = 0;
            calmSince = performance.now();
          } else {
            calm++;
          }
          if (calm >= calmFrames && performance.now() - calmSince >= calmMs) resolve(true);
          else if (performance.now() - t0 > limit) resolve(false);
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    [keys, SETTLE_CALM_MS, SETTLE_CALM_FRAMES, timeout],
  );
  if (!ok) throw new Error(`scenes ${keys ? keys.join(', ') : '(active)'} never settled within ${timeout} ms (a finite tween or camera effect kept running)`);
}

// ---- booting ---------------------------------------------------------------------------------------------------------

/** Canvas position -> page (CSS) coordinates for a point in game coordinates (the game is a fixed 390x844, FIT-scaled). */
export function gameToPage(page, x, y) {
  return page.evaluate(
    ([gx, gy]) => {
      const g = window.__harnessGame;
      const r = g.canvas.getBoundingClientRect();
      return { x: r.left + (gx * r.width) / g.scale.gameSize.width, y: r.top + (gy * r.height) / g.scale.gameSize.height };
    },
    [x, y],
  );
}

/**
 * Resize the page and wait until the game has refitted its canvas to the new size (FIT scale: the game is a fixed 390x844,
 * scaled to the largest size that fits). What the app does on a rotation or a browser toolbar change.
 */
export async function setViewport(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await waitFor(
    page,
    `the canvas to refit to ${viewport.label}`,
    ([w, h]) => {
      const g = window.__harnessGame;
      const gw = g.scale.gameSize.width;
      const gh = g.scale.gameSize.height;
      const scale = Math.min(w / gw, h / gh);
      const r = g.canvas.getBoundingClientRect();
      return Math.abs(r.width - gw * scale) < 2 && Math.abs(r.height - gh * scale) < 2;
    },
    [viewport.width, viewport.height],
  );
}

export async function clickGame(page, x, y) {
  const p = await gameToPage(page, x, y);
  await page.mouse.click(p.x, p.y);
}

/**
 * Wait for the capture hook to hand over the game (window.__harnessGame). A hook that cannot work is reported within seconds with
 * the reason (capture.mjs), not after the whole boot timeout: the page is sampled once a second while it waits.
 */
async function waitForCapture(page, timeout) {
  const t0 = Date.now();
  for (;;) {
    await page.waitForFunction(() => !!window.__harnessGame || !!window.__harnessHookError, null, { timeout: 1000 }).catch(() => undefined);
    const state = await page
      .evaluate(() => ({
        gameCaptured: !!window.__harnessGame,
        hookError: window.__harnessHookError,
        phaserType: typeof window.Phaser,
        readyState: document.readyState,
      }))
      .catch((err) => {
        if (/context was destroyed|navigat/i.test(String(err.message))) return null; // the page reloaded (the dev server re-optimising): look again
        throw err;
      });
    if (state?.gameCaptured) return;
    const elapsedMs = Date.now() - t0;
    const problem = state && captureProblem({ ...state, elapsedMs });
    if (problem) throw new Error(problem);
    if (elapsedMs > timeout) throw new Error(`timed out after ${timeout} ms waiting for the Phaser game to start stepping (window.__harnessGame)`);
  }
}

/** Wait for the game handle, optionally tap through the two splashes, then wait until MainMenuScene has settled. */
export async function bootToMenu(page, { skipSplashes = true, timeout = 120000 } = {}) {
  const deadline = Date.now() + timeout;
  const left = () => Math.max(1000, deadline - Date.now());
  await waitForCapture(page, left());
  for (;;) {
    const handle = await waitFor(
      page,
      'a splash or the main menu',
      (splashes) => {
        const g = window.__harnessGame;
        if (g.scene.isActive('MainMenuScene')) return 'menu';
        return splashes.find((k) => g.scene.isActive(k)) ?? false;
      },
      SPLASH_SCENES,
      left(),
    );
    const where = await handle.jsonValue();
    if (where === 'menu') break;
    if (!skipSplashes) {
      await waitForScene(page, 'MainMenuScene', left());
      break;
    }
    await clickGame(page, 195, 14); // the empty strip at the top: any first touch skips a splash
    await page.waitForFunction((k) => !window.__harnessGame.scene.isActive(k), where, { timeout: 4000 }).catch(() => undefined);
  }
  await settle(page, ['MainMenuScene'], left());
}

export async function stopAll(page) {
  await page.evaluate(() => {
    const g = window.__harnessGame;
    g.scene
      .getScenes(false)
      .slice()
      .forEach((s) => g.scene.stop(s.scene.key));
  });
}

/** Stop everything, start one scene with data, wait until it is active and its entrance has finished. */
export async function startScene(page, key, data) {
  await stopAll(page);
  await page.evaluate(([k, d]) => window.__harnessGame.scene.start(k, d), [key, data]);
  await waitForScene(page, key);
  await settle(page, [key]);
}

// ---- reading what is on screen --------------------------------------------------------------------------------------

/**
 * Every Text in the given scenes (default: all active) with its world position and whether it is visible (itself and
 * every container above it). `text` is the displayed string.
 */
export function readTexts(page, scenes = null) {
  return page.evaluate((only) => {
    const g = window.__harnessGame;
    const out = [];
    const visible = (o) => {
      for (let p = o; p; p = p.parentContainer) if (!p.visible || !p.active || p.alpha === 0) return false;
      return true;
    };
    const walk = (o, key) => {
      if (o.type === 'Text') {
        const m = o.getWorldTransformMatrix();
        out.push({ text: String(o.text), x: m.tx, y: m.ty, visible: visible(o), scene: key });
      }
      if (o.list) o.list.forEach((c) => walk(c, key));
    };
    for (const sc of g.scene.getScenes(true)) {
      if (only && !only.includes(sc.scene.key)) continue;
      sc.children.list.forEach((o) => walk(o, sc.scene.key));
    }
    return out;
  }, scenes);
}

export async function visibleTexts(page, scenes = null) {
  return (await readTexts(page, scenes)).filter((t) => t.visible).map((t) => t.text);
}

export async function findTexts(page, what, scenes = null) {
  const re = what instanceof RegExp ? { source: what.source, flags: what.flags } : null;
  const all = await readTexts(page, scenes);
  return all.filter((t) => t.visible && (re ? new RegExp(re.source, re.flags).test(t.text) : t.text === what));
}

/** Wait until a visible text matching `what` (string = exact, RegExp = test) is in one of the scenes. */
export async function waitForText(page, what, scenes = null, timeout = DEFAULT_TIMEOUT) {
  const re = what instanceof RegExp ? { source: what.source, flags: what.flags } : null;
  await waitFor(
    page,
    `text ${String(what)}`,
    ([spec, exact, only]) => {
      const g = window.__harnessGame;
      const rx = spec ? new RegExp(spec.source, spec.flags) : null;
      const visible = (o) => {
        for (let p = o; p; p = p.parentContainer) if (!p.visible || !p.active || p.alpha === 0) return false;
        return true;
      };
      let hit = false;
      const walk = (o) => {
        if (hit) return;
        if (o.type === 'Text' && visible(o) && (rx ? rx.test(String(o.text)) : String(o.text) === exact)) hit = true;
        if (o.list) o.list.forEach(walk);
      };
      for (const sc of g.scene.getScenes(true)) {
        if (only && !only.includes(sc.scene.key)) continue;
        sc.children.list.forEach(walk);
      }
      return hit;
    },
    [re, re ? null : what, scenes],
    timeout,
  );
}

/** Click the centre of the first visible Text matching `what` (a real pointer event). Returns where it clicked. */
export async function clickText(page, what, scenes = null) {
  const found = await findTexts(page, what, scenes);
  if (found.length === 0) throw new Error(`no visible text ${String(what)} to click`);
  const p = await gameToPage(page, found[0].x, found[0].y);
  await page.mouse.click(p.x, p.y);
  return found[0];
}

/** Real tap, then wait for Phaser to process it (a few frames of the game). */
export async function tap(page, x, y, afterFrames = 8) {
  await page.mouse.click(x, y);
  await frames(page, afterFrames);
}

/** The current localStorage entry (null when absent). */
export const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);

/**
 * Count the taps (pointerup) that reach the nearest interactive container around the first visible Text equal to `text`, so a "tapping it grants
 * nothing" assertion is only believed if the tap really arrived. Read the count with tapCount(page, key).
 */
export function watchTaps(page, text, scenes, key) {
  return page.evaluate(
    ([wanted, only, k]) => {
      const g = window.__harnessGame;
      let target = null;
      const walk = (o) => {
        if (target) return;
        if (o.type === 'Text' && o.visible && String(o.text) === wanted) {
          let c = o.parentContainer;
          while (c && !(c.input && c.input.enabled)) c = c.parentContainer;
          target = c || o;
        }
        if (o.list) o.list.forEach(walk);
      };
      for (const sc of g.scene.getScenes(true)) {
        if (only && !only.includes(sc.scene.key)) continue;
        sc.children.list.forEach(walk);
      }
      if (!target) throw new Error(`no visible text "${wanted}" to watch`);
      window.__harnessTaps = window.__harnessTaps || {};
      window.__harnessTaps[k] = 0;
      target.on('pointerup', () => {
        window.__harnessTaps[k] += 1;
      });
    },
    [text, scenes, key],
  );
}

export const tapCount = (page, key) => page.evaluate((k) => (window.__harnessTaps && window.__harnessTaps[k]) || 0, key);

/** Is the first visible Text equal to `text`, or any container around it, tappable? */
export function isTappable(page, text, scenes) {
  return page.evaluate(
    ([wanted, only]) => {
      const g = window.__harnessGame;
      let found = null;
      const walk = (o, chain) => {
        if (found) return;
        if (o.type === 'Text' && o.visible && String(o.text) === wanted) found = [...chain, o];
        if (o.list) o.list.forEach((c) => walk(c, [...chain, o]));
      };
      for (const sc of g.scene.getScenes(true)) {
        if (only && !only.includes(sc.scene.key)) continue;
        sc.children.list.forEach((o) => walk(o, []));
      }
      if (!found) throw new Error(`no visible text "${wanted}"`);
      return found.some((o) => !!(o.input && o.input.enabled));
    },
    [text, scenes],
  );
}
