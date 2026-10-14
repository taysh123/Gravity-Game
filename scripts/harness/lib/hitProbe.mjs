// Tap-area probe: for every interactive object of the scenes under test, is the object itself what a finger hits?
// Ported from the P00-T17b scratch scripts (hit-corners.mjs, fix passes 1-3) so the hit-area regression is locked in by
// tracked code. `probe` runs inside the page (it is serialised by Playwright, so it must not reference anything outside
// itself); `probeToAssertions` turns its result into named pass/fail assertions and is unit-tested.
//
// Per scene state the probe:
//   - collects the interactive objects of the active scenes (scene.input._list, filtered by Phaser's own inputCandidate so
//     invisible / alpha-0 / unreachable objects are skipped) and computes each one's VISIBLE world bounds;
//   - hit-tests the 4 corners (inset 3 CSS px) and the centre through the scene's own InputPlugin.hitTestPointer, the code
//     path a real tap takes, and asserts the object itself (or a control inside it) is the top hit;
//   - probes 12 game px outside the middle of each edge: the object must NOT be hit there (the largest pad granted is 8);
//   - compares the effective hit rectangle with the visible bounds (centre offset, pad per side) and flags a zone under
//     44x44 game px (THEME.MIN_TAP);
//   - models a scrolling list as the player sees it: a row's hit zone is clipped to the geometry mask of scene.listC /
//     scene.content (its VIEWPORT BAND), a fully masked row must be dead, and a grid of probes over the canvas outside the
//     band must never find a list row as the top hit;
//   - checks that no two interactive objects' hit zones overlap (an ancestor and its child, a tap sink and a full-screen
//     scrim excepted).
// Zero exclusions: an overlap or a zone under 44 game px FAILS the run.

// Mirrors of src/config/theme.config.ts (THEME.MIN_TAP, THEME.TOGGLE_TAP_PAD / NODE_TAP_PAD). constants.test.mjs fails if
// they drift. The probe cannot import the app's config in the page, and the production bundle exposes no modules.
export const MIN_TAP_GAME_PX = 44;
export const MAX_PAD_GAME_PX = 8;
export const INSET_CSS_PX = 3;
export const LEAK_GAME_PX = 12; // outside offset: more than the largest pad

/* eslint-disable no-undef -- runs in the page */
export function probe({ only, insetCss, leakPx, maxPad, minTap }) {
  const g = window.__harnessGame;
  const cv = g.canvas.getBoundingClientRect();
  const GW = g.scale.gameSize.width;
  const GH = g.scale.gameSize.height;
  const k = cv.width / GW; // CSS px per game px
  const inset = insetCss / k;
  const scenes = g.scene.getScenes(true); // bottom -> top

  const label = (o) => {
    let t = null;
    const walk = (n) => {
      if (t !== null) return;
      if (n.type === 'Text' && n.text) {
        t = n.text;
        return;
      }
      if (n.list) n.list.forEach(walk);
    };
    walk(o);
    return `${o.type}${t ? ` "${String(t).replace(/\s+/g, ' ').slice(0, 26)}"` : ''}`;
  };
  const isAncestor = (a, b) => {
    for (let p = b.parentContainer; p; p = p.parentContainer) if (p === a) return true;
    return false;
  };

  // The VIEWPORT BAND of a scrolling list = what its geometry mask shows. Read from the mask Graphics' own command buffer
  // ([LINE_STYLE = 6 (4 args), FILL_STYLE = 7 (3 args), FILL_RECT = 3 (x, y, w, h)]), so it does not depend on any field
  // the scene may or may not expose.
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
    const m = root && root.mask && root.mask.geometryMask;
    const cb = m && m.commandBuffer;
    return cb ? rectOf(cb) : null;
  };
  const listRoots = scenes.filter((sc) => bandOf(sc)).map((sc) => rootOf(sc));
  const isListMember = (o) => !!o && listRoots.some((r) => o === r || isAncestor(r, o));

  const topAt = (sx, sy) => {
    const pointer = { x: sx, y: sy, worldX: 0, worldY: 0 };
    for (let i = scenes.length - 1; i >= 0; i--) {
      const sc = scenes[i];
      if (!sc.input.isActive()) continue;
      const over = sc.input.hitTestPointer(pointer).slice();
      if (over.length) {
        const sorted = sc.input.sortGameObjects(over, pointer);
        return { all: sorted.slice(), top: sorted[0] };
      }
    }
    return { all: [], top: null };
  };

  const items = [];
  const scrimSet = new Set();
  for (const sc of scenes) {
    if (only && !only.includes(sc.scene.key)) continue;
    const cam = sc.cameras.main;
    for (const o of sc.input._list) {
      if (!o.input || !o.input.enabled || !g.input.inputCandidate(o, cam)) continue;
      const m = o.getWorldTransformMatrix();
      const sx = Math.abs(m.scaleX);
      const sy = Math.abs(m.scaleY);
      const offX = cam.scrollX * o.scrollFactorX;
      const offY = cam.scrollY * o.scrollFactorY;
      const scr = (tx, ty) => ({ x: tx - offX, y: ty - offY });
      const dox = o.displayOriginX;
      const doy = o.displayOriginY;
      const ha = o.input.hitArea;
      const isCircle = !!ha && ha.radius !== undefined && ha.width === undefined;
      const isRect = !!ha && ha.width !== undefined && ha.height !== undefined && !isCircle;
      if (!isRect && !isCircle) {
        items.push({ scene: sc.scene.key, label: label(o), kind: 'other', verdict: 'SKIP', note: 'hit area is neither rect nor circle' });
        continue;
      }

      // Visible bounds (game px, screen space).
      let vis;
      if (o.type === 'Container') {
        const c = scr(m.tx, m.ty);
        const w = o.width * sx;
        const h = o.height * sy;
        vis = { x0: c.x - w / 2, y0: c.y - h / 2, x1: c.x + w / 2, y1: c.y + h / 2 };
      } else if (typeof o.getBounds === 'function') {
        const b = o.getBounds();
        vis = { x0: b.x - offX, y0: b.y - offY, x1: b.x + b.width - offX, y1: b.y + b.height - offY };
      } else {
        const fillsScreen = isRect && ha.width * sx * ha.height * sy > 0.6 * GW * GH;
        if (fillsScreen) scrimSet.add(o);
        items.push({ scene: sc.scene.key, label: label(o), kind: o.type, verdict: 'SKIP', note: fillsScreen ? 'full-screen scrim' : 'no getBounds' });
        continue;
      }

      // Effective hit area (game px, screen space).
      const base = scr(m.tx, m.ty);
      let hit;
      if (isRect) {
        const x0 = base.x + (ha.x - dox) * sx;
        const y0 = base.y + (ha.y - doy) * sy;
        hit = { x0, y0, x1: x0 + ha.width * sx, y1: y0 + ha.height * sy };
      } else {
        const cx = base.x + (ha.x - dox) * sx;
        const cy = base.y + (ha.y - doy) * sy;
        const r = ha.radius * sx;
        hit = { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r };
      }

      const row = {
        scene: sc.scene.key,
        kind: isCircle ? 'circle' : o.type,
        label: `${label(o)} @${Math.round((vis.x0 + vis.x1) / 2)},${Math.round((vis.y0 + vis.y1) / 2)}`,
        vis: { w: (vis.x1 - vis.x0) * k, h: (vis.y1 - vis.y0) * k },
        hit: { w: (hit.x1 - hit.x0) * k, h: (hit.y1 - hit.y0) * k },
        centreDx: ((hit.x0 + hit.x1) / 2 - (vis.x0 + vis.x1) / 2) * k,
        centreDy: ((hit.y0 + hit.y1) / 2 - (vis.y0 + vis.y1) / 2) * k,
        _hit: hit,
        _o: o,
        _vis: vis,
        _visFull: vis,
      };
      row.sink = o.type === 'Container' && (o.list || []).length === 0;
      row.sceneBand = bandOf(sc);
      // A row of a scrolling list is only visible (and only meant to be tappable) inside the list's viewport band: clip.
      const band = bandOf(sc);
      if (band && isAncestor(rootOf(sc), o)) {
        const clip = (r) => ({ ...r, y0: Math.max(r.y0, band.top), y1: Math.min(r.y1, band.bottom) });
        row.inList = true;
        row.band = band;
        row._vis = clip(vis);
        row._hit = clip(hit);
        row.clippedAway = row._vis.y1 - row._vis.y0 < 2 * inset + 2; // (almost) fully masked
        row.partial = !row.clippedAway && (row._vis.y0 > vis.y0 + 0.5 || row._vis.y1 < vis.y1 - 0.5);
      }
      // Skip what cannot be tapped on the canvas now (scrolled out) or covers the screen (a scrim).
      const onCanvas = row.inList ? true : vis.x0 >= -0.5 && vis.y0 >= -0.5 && vis.x1 <= GW + 0.5 && vis.y1 <= GH + 0.5;
      const screenFill = (hit.x1 - hit.x0) * (hit.y1 - hit.y0) > 0.6 * GW * GH;
      row.scrim = screenFill;
      if (screenFill) scrimSet.add(o);
      row.onCanvas = onCanvas;
      items.push(row);
    }
  }

  // ---- corner / centre / leak tests --------------------------------------------------------------------------------
  for (const r of items) {
    if (r.verdict === 'SKIP') continue;
    if (r.scrim) {
      r.verdict = 'SKIP';
      r.note = 'full-screen scrim';
      continue;
    }
    if (!r.onCanvas) {
      r.verdict = 'SKIP';
      r.note = 'not fully on canvas (scrolled out)';
      continue;
    }
    const o = r._o;
    const V = r._vis;
    const pts = [];
    const isCircle = r.kind === 'circle';
    // A row that is (almost) fully masked must be DEAD: nothing inside its full extent may report it, or any other list row,
    // as the top hit.
    if (r.clippedAway) {
      const F = r._visFull;
      const cxm = (F.x0 + F.x1) / 2;
      const leaksHidden = [];
      for (let y = F.y0 + inset; y <= F.y1 - inset; y += 8) {
        if (y >= r.band.top && y <= r.band.bottom) continue;
        const t = topAt(cxm, y).top;
        if (isListMember(t)) leaksHidden.push(`y=${Math.round(y)}->${label(t)}`);
      }
      r.cornerMiss = leaksHidden;
      r.leaks = [];
      r.pad = { l: 0, t: 0, r: 0, b: 0 };
      r.small = false;
      r.verdict = leaksHidden.length === 0 ? 'PASS' : 'FAIL';
      r.note = 'fully masked row: dead';
      continue;
    }
    if (isCircle) {
      // The disc's own geometry. For a planet half hidden by the list viewport only the sample points inside the band are
      // tapped by the player, so only those must hit the planet (the rest are covered by design).
      const F = r.inList ? r._visFull : V;
      const cx = (F.x0 + F.x1) / 2;
      const cy = (F.y0 + F.y1) / 2;
      const rad = (F.x1 - F.x0) / 2 - inset;
      const d = rad / Math.SQRT2;
      pts.push(['TL', cx - d, cy - d], ['TR', cx + d, cy - d], ['BL', cx - d, cy + d], ['BR', cx + d, cy + d], ['C', cx, cy], ['L', cx - rad, cy], ['R', cx + rad, cy], ['T', cx, cy - rad], ['B', cx, cy + rad]);
      if (r.inList) {
        const inBand = pts.filter(([, , py]) => py >= r.band.top + 0.5 && py <= r.band.bottom - 0.5);
        pts.length = 0;
        pts.push(...inBand);
      }
    } else {
      pts.push(
        ['TL', V.x0 + inset, V.y0 + inset],
        ['TR', V.x1 - inset, V.y0 + inset],
        ['BL', V.x0 + inset, V.y1 - inset],
        ['BR', V.x1 - inset, V.y1 - inset],
        ['C', (V.x0 + V.x1) / 2, (V.y0 + V.y1) / 2],
      );
    }
    if (pts.length === 0) {
      // never let a clipped item vanish silently from the table
      r.cornerMiss = ['no sample point inside the viewport band'];
      r.leaks = [];
      r.pad = { l: 0, t: 0, r: 0, b: 0 };
      r.small = false;
      r.verdict = 'FAIL';
      continue;
    }
    const miss = [];
    let occluded = 0;
    for (const [name, px, py] of pts) {
      const t = topAt(px, py);
      if (t.top === o || (t.top && isAncestor(o, t.top))) continue; // the object, or a control inside it (a panel with buttons)
      if (r.sink && t.top && t.top.depth > o.depth) continue; // a tap sink yields to the chrome stacked above it
      if (t.top && scrimSet.has(t.top)) occluded++; // covered by a full-screen overlay scrim: by design, not a hit-area fault
      else miss.push(`${name}${t.top ? `->${label(t.top)}` : '->none'}`);
    }
    r.cornerMiss = miss;

    // Leak probes (not for Text: its hit area is deliberately larger than the glyphs).
    const leaks = [];
    if (o.type !== 'Text') {
      const cx = (V.x0 + V.x1) / 2;
      const cy = (V.y0 + V.y1) / 2;
      const outs = [
        ['L', V.x0 - leakPx, cy],
        ['R', V.x1 + leakPx, cy],
        ['T', cx, V.y0 - leakPx],
        ['B', cx, V.y1 + leakPx],
      ];
      for (const [name, px, py] of outs) {
        if (px < 0 || py < 0 || px > GW || py > GH) continue;
        // A list row is clipped to its band: past the clipped top/bottom edge its (unclipped) zone is still geometrically there
        // but must be occluded, so there the test is "no list row is the top hit" instead of "the zone is absent".
        const clippedEdge = r.inList && ((name === 'T' && r._vis.y0 > r._visFull.y0 + 0.5) || (name === 'B' && r._vis.y1 < r._visFull.y1 - 0.5));
        if (clippedEdge ? isListMember(topAt(px, py).top) : topAt(px, py).all.includes(o)) leaks.push(name);
      }
    }
    r.leaks = leaks;
    // Pad actually granted per side (hit minus visible), CSS px.
    r.pad = { l: (V.x0 - r._hit.x0) * k, t: (V.y0 - r._hit.y0) * k, r: (r._hit.x1 - V.x1) * k, b: (r._hit.y1 - V.y1) * k };
    const padOk = o.type === 'Text' || Object.values(r.pad).every((p) => p >= -1 && p <= maxPad * k + 1);
    r.small = Math.min(r.hit.w, r.hit.h) / k < minTap - 0.5; // the FULL zone (a clipped list row is not "small"), in GAME px
    r.smallCss = Math.min(r.hit.w, r.hit.h) < minTap - 0.5; // the same zone in CSS px: below 44 whenever the FIT scale k is under 1 (info only)
    if (occluded === pts.length) {
      r.verdict = 'SKIP';
      r.note = 'covered by an overlay scrim (by design)';
      continue;
    }
    const sinkBandOk = !r.sink || !r.sceneBand || r._hit.y1 <= r.sceneBand.top + 0.5 || r._hit.y0 >= r.sceneBand.bottom - 0.5; // a sink never covers the list viewport
    if (!sinkBandOk) miss.push('SINK OVERLAPS THE LIST VIEWPORT');
    r.verdict = miss.length === 0 && leaks.length === 0 && padOk && Math.abs(r.centreDx) < 1.5 && Math.abs(r.centreDy) < 1.5 ? 'PASS' : 'FAIL';
  }

  // ---- overlap between hit zones -----------------------------------------------------------------------------------
  const overlaps = [];
  const cand = items.filter((r) => r._hit && !r.scrim && !r.sink && (r.verdict !== 'SKIP' || r.note === 'not fully on canvas (scrolled out)'));
  for (let i = 0; i < cand.length; i++) {
    for (let j = i + 1; j < cand.length; j++) {
      const a = cand[i];
      const b = cand[j];
      if (a.scene !== b.scene) continue;
      if (isAncestor(a._o, b._o) || isAncestor(b._o, a._o)) continue;
      const ox = Math.min(a._hit.x1, b._hit.x1) - Math.max(a._hit.x0, b._hit.x0);
      const oy = Math.min(a._hit.y1, b._hit.y1) - Math.max(a._hit.y0, b._hit.y0);
      if (ox > 0.5 && oy > 0.5) overlaps.push({ a: a.label, b: b.label, w: +(ox * k).toFixed(1), h: +(oy * k).toFixed(1) });
    }
  }

  // ---- scan outside every list viewport: no list row may be the top hit anywhere the list is not visible --------------
  const scans = [];
  for (const sc of scenes) {
    if (only && !only.includes(sc.scene.key)) continue;
    const band = bandOf(sc);
    if (!band) continue;
    let points = 0;
    const leaks = [];
    for (let y = 2; y < GH; y += 6) {
      if (y >= band.top && y <= band.bottom) continue;
      for (let x = 3; x < GW; x += 10) {
        points++;
        const t = topAt(x, y).top;
        if (isListMember(t)) leaks.push(`(${x},${y})->${label(t)}`);
      }
    }
    const rows = sc.input._list.filter((o) => o.input && o.input.enabled && isAncestor(rootOf(sc), o)).length;
    scans.push({ scene: sc.scene.key, band, points, rows, leaks: leaks.slice(0, 6), leakCount: leaks.length });
  }

  const clean = items.map((r) => {
    const c = { ...r };
    delete c._hit;
    delete c._o;
    delete c._vis;
    delete c._visFull;
    return c;
  });
  return { k, GW, GH, items: clean, overlaps, scans };
}
/* eslint-enable no-undef */

const fmt = (n) => String(Math.round(n * 10) / 10);

/** Run the probe on a page for the given scene keys (null = every active scene). */
export function runProbe(page, only = null) {
  return page.evaluate(probe, { only, insetCss: INSET_CSS_PX, leakPx: LEAK_GAME_PX, maxPad: MAX_PAD_GAME_PX, minTap: MIN_TAP_GAME_PX });
}

/**
 * One probe result -> assertions: one for the tappable objects, one for the hit-zone overlaps, one per scrolling list.
 * A zone under 44x44 game px fails; a zone under 44 CSS px only because the FIT scale k is below 1 does not.
 */
export function probeToAssertions(state, res) {
  const tested = res.items.filter((r) => r.verdict === 'PASS' || r.verdict === 'FAIL');
  const skipped = res.items.length - tested.length;
  const out = [];

  const bad = [];
  for (const r of tested) {
    const why = [];
    if (r.cornerMiss && r.cornerMiss.length) why.push(`MISS ${r.cornerMiss.join(',')}`);
    if (r.leaks && r.leaks.length) why.push(`LEAK ${r.leaks.join(',')}`);
    if (r.small) why.push(`hit zone under ${MIN_TAP_GAME_PX}x${MIN_TAP_GAME_PX} game px (${fmt(r.hit.w / res.k)}x${fmt(r.hit.h / res.k)})`);
    if (r.verdict === 'FAIL' && why.length === 0) {
      const p = r.pad || {};
      why.push(`hit zone not centred on the visible object or padded wrongly (centre d(${fmt(r.centreDx ?? 0)},${fmt(r.centreDy ?? 0)}), pad L${fmt(p.l ?? 0)} T${fmt(p.t ?? 0)} R${fmt(p.r ?? 0)} B${fmt(p.b ?? 0)})`);
    }
    if (why.length) bad.push(`${r.label}: ${why.join('; ')}`);
  }
  const n = tested.length;
  const label = `${state}: ${n} tappable object${n === 1 ? '' : 's'} hit at their corners and centre, no leak, none under ${MIN_TAP_GAME_PX} game px${skipped ? ` (${skipped} skipped)` : ''}`;
  if (n === 0) out.push({ label, ok: false, detail: 'no tappable object found: the probe saw nothing to test, so this state proves nothing' });
  else out.push({ label, ok: bad.length === 0, detail: bad.join(' | ') });

  out.push({
    label: `${state}: no overlapping hit zones`,
    ok: res.overlaps.length === 0,
    detail: res.overlaps.map((o) => `${o.a} x ${o.b} (${o.w}x${o.h} css px)`).join(' | '),
  });

  for (const s of res.scans) {
    out.push({
      label: `${state}: nothing outside the ${s.scene} list viewport reaches a list row (${s.points} probes, ${s.rows} interactive rows)`,
      ok: s.leakCount === 0,
      detail: `${s.leakCount} probes reach a list row, e.g. ${s.leaks.join(' ')}`,
    });
  }
  return out;
}
