// Scrolling lists (the shop, the world map, level select, achievements): where their rows are, which part of the screen is the
// list's viewport, and where a real tap or drag should land. Used by list-viewport-taps and list-scroll-ranges.
//
// Everything is read from the live scene, never hard-coded: a list's VIEWPORT BAND is the geometry mask of `scene.listC` /
// `scene.content` (read from the mask Graphics' own command buffer), a row is an interactive Container inside that root.
// The in-page half is installed once per page as window.__harnessLists (harness-controlled pages only; the app never sees it).

import { frames } from './game.mjs';

function installLib() {
  const g = window.__harnessGame;
  const lib = (window.__harnessLists = {});
  const css = (x, y) => {
    const cv = g.canvas.getBoundingClientRect();
    const k = cv.width / g.scale.gameSize.width;
    return { x: cv.left + x * k, y: cv.top + y * k };
  };
  const posOf = (o) => {
    const m = o.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  };
  const walkAll = (sc) => {
    const out = [];
    const walk = (l) => {
      for (const o of l) {
        out.push(o);
        if (o.list) walk(o.list);
      }
    };
    walk(sc.children.list);
    return out;
  };
  const hasText = (o, pred) => (o.list || []).some((c) => c.type === 'Text' && pred(String(c.text)));
  const isAnc = (a, b) => {
    for (let p = b.parentContainer; p; p = p.parentContainer) if (p === a) return true;
    return false;
  };
  const rectOf = (cb) => {
    for (let i = 0; i < cb.length; ) {
      const c = cb[i];
      if (c === 6) i += 4;
      else if (c === 7) i += 3;
      else if (c === 3) return { left: cb[i + 1], top: cb[i + 2], right: cb[i + 1] + cb[i + 3], bottom: cb[i + 2] + cb[i + 4] };
      else return null;
    }
    return null;
  };
  const rootOf = (sc) => sc.listC || sc.content;
  const bandOf = (sc) => {
    const root = rootOf(sc);
    const cb = root && root.mask && root.mask.geometryMask && root.mask.geometryMask.commandBuffer;
    return cb ? rectOf(cb) : null;
  };
  const labelOf = (o) => String(((o.list || []).find((c) => c.type === 'Text') || {}).text ?? '');

  lib.k = () => g.canvas.getBoundingClientRect().width / g.scale.gameSize.width;

  /** Move a scene's scrolling content to its clamp end ('top' / 'bottom') or shift it by a number of game px. */
  lib.scrollList = (key, where) => {
    const sc = g.scene.getScene(key);
    const max = sc.scroll ? sc.scroll.max : 0; // the scene's own clamp maximum
    const min = sc.scroll ? sc.scroll.min : sc.scrollMin; // and minimum
    if (where === 'top') sc.content.y = max;
    else if (where === 'bottom') sc.content.y = min;
    else sc.content.y += where;
    return { y: sc.content.y, min };
  };

  // Interactive objects OUTSIDE the list (Back button ...): a hidden row under one of them is covered by design, not a leak.
  const chromeRects = (sc, root) => {
    const rects = [];
    for (const o of sc.input._list) {
      if (!o.input || !o.input.enabled || o === root || isAnc(root, o)) continue;
      if (o.type === 'Container' && (o.list || []).length === 0) continue; // a tap sink
      const m = o.getWorldTransformMatrix();
      const w = o.width * Math.abs(m.scaleX);
      const h = o.height * Math.abs(m.scaleY);
      rects.push({ x0: m.tx - w / 2 - 6, y0: m.ty - h / 2 - 6, x1: m.tx + w / 2 + 6, y1: m.ty + h / 2 + 6 });
    }
    return rects;
  };

  /**
   * The interactive rows of a list that are (a) hidden: centre outside the viewport band but on the canvas and not under other
   * chrome, and (b) visible: centre well inside the band. Page (CSS) points for a real click.
   */
  lib.listPoints = (key) => {
    const sc = g.scene.getScene(key);
    const root = rootOf(sc);
    const band = bandOf(sc);
    const GW = g.scale.gameSize.width;
    const GH = g.scale.gameSize.height;
    const chrome = chromeRects(sc, root);
    const objs = [];
    const walk = (l) => {
      for (const o of l) {
        if (o.input && o.input.enabled && o.type === 'Container') objs.push(o);
        if (o.list && !o.input) walk(o.list);
      }
    };
    walk(root.list);
    const hidden = [];
    const visible = [];
    for (const o of objs) {
      const p = posOf(o);
      if (chrome.some((r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1)) continue;
      const name = labelOf(o);
      if ((p.y < band.top - 4 || p.y > band.bottom + 4) && p.y > 4 && p.y < GH - 4 && p.x > 4 && p.x < GW - 4) hidden.push({ name, p });
      else if (p.y > band.top + 14 && p.y < band.bottom - 14) visible.push({ name, p });
    }
    const pick = (a) => (a.length ? { name: a[0].name, css: css(a[0].p.x, a[0].p.y), n: a.length } : null);
    return { band, interactive: objs.length, hidden: pick(hidden), visible: pick(visible) };
  };

  lib.backPointOf = (key) => {
    const sc = g.scene.getScene(key);
    const back = walkAll(sc).find((o) => o.type === 'Container' && o.input && hasText(o, (t) => t.includes('Back') || t.includes('Map')));
    if (!back) return null;
    const p = posOf(back);
    return css(p.x, p.y);
  };

  // ---- the shop -----------------------------------------------------------------------------------------------------
  const shop = () => g.scene.getScene('CosmeticsScene');
  lib.shopTab = () => shop().tab;
  lib.tabPoint = (label, dy) => {
    const t = walkAll(shop()).find((o) => o.type === 'Text' && o.text === label);
    if (!t) return null;
    const b = t.getBounds();
    return css(b.centerX, b.centerY + dy);
  };
  lib.aboveTabs = (x, dy) => {
    const t = walkAll(shop()).find((o) => o.type === 'Text' && o.text === 'Skins');
    const b = t.getBounds();
    return css(x, b.centerY - dy);
  };
  /** The row that straddles the bottom edge of the viewport, with a spy on its pointerup, and where to tap its two halves. */
  lib.partialRow = () => {
    const cs = shop();
    const band = bandOf(cs);
    if (!band) return null;
    const rows = cs.listC.list.filter((o) => o.input && o.input.enabled);
    const r = rows.find((o) => {
      const p = posOf(o);
      return p.y - o.height / 2 < band.bottom - 12 && p.y + o.height / 2 > band.bottom + 12;
    });
    if (!r) return null;
    window.__rowTaps = 0;
    if (!r.__harnessSpy) {
      r.__harnessSpy = true;
      r.on('pointerup', () => {
        window.__rowTaps += 1;
      });
    }
    const p = posOf(r);
    return { name: labelOf(r), hiddenPart: css(p.x, band.bottom + 8), visiblePart: css(p.x, band.bottom - 8), left: css(30, band.bottom + 8) };
  };
  lib.rowTaps = () => window.__rowTaps ?? 0;

  // ---- scroll ranges ------------------------------------------------------------------------------------------------
  lib.listGeometry = (key, itemH) => {
    const sc = g.scene.getScene(key);
    const root = rootOf(sc);
    const items = root.list
      .filter((o) => o.type === 'Container')
      .map((o) => {
        const p = posOf(o);
        const h = o.height || itemH;
        const named = (o.list || []).find((c) => c.type === 'Text' && String(c.text).length > 2);
        return { top: p.y - h / 2, bottom: p.y + h / 2, name: String(named ? named.text : '') };
      });
    return { y: root.y, band: bandOf(sc), items };
  };
  lib.dragPoints = (key, dir) => {
    const sc = g.scene.getScene(key);
    const band = bandOf(sc);
    const cx = g.scale.gameSize.width / 2;
    const a = css(cx, band.bottom - 14);
    const b = css(cx, band.top + 14);
    return dir === 'up' ? { from: a, to: b } : { from: b, to: a };
  };
}

/** Install the in-page list helpers (once per page; idempotent). */
export async function installLists(page) {
  await page.evaluate(installLib);
}

export const inPage = (page, method, ...args) => page.evaluate(([m, a]) => window.__harnessLists[m](...a), [method, args]);

/** Real click at a page (CSS) point, then let Phaser process it. */
export async function clickPoint(page, point, afterFrames = 10) {
  await page.mouse.click(point.x, point.y);
  await frames(page, afterFrames);
}
