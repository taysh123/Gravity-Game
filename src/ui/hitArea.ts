import Phaser from 'phaser';

// The one place a Container is made tappable over a custom shape (guarded by hitArea.test.ts: no other file under src/ may
// hand `new Phaser.Geom.<shape>(...)` straight to setInteractive).
//
// Why a helper: Phaser tests a Container's hit shape in a frame whose origin is the container's TOP-LEFT corner, not its
// position. `Container.displayOriginX` is `width * 0.5` (Container.js:299, 0 until setSize is called) and
// `InputManager.pointWithinHitArea` (InputManager.js:966) adds `displayOriginX/Y` to the local point before calling the hit
// callback. So on a sized container the visible body (-w/2..w/2) is tested as 0..w, and a rectangle centred on the
// container (-w/2, -h/2, w, h) covers only the visible top-left quarter, plus a dead-to-the-eye patch above and left of it.

export interface TapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TapCircle {
  x: number;
  y: number;
  radius: number;
}

// The hit rectangle, in the container's hit frame, for a w x h body grown by `pad` px on every side. Pure.
export function tapRect(w: number, h: number, pad = 0): TapRect {
  const origin = 0 - pad; // 0 rather than -0 when pad is 0
  return { x: origin, y: origin, width: w + 2 * pad, height: h + 2 * pad };
}

// The hit circle, in the container's hit frame, for a disc of radius `r` (sized 2r x 2r, so its centre is (r, r)) grown by
// `pad` px. Pure.
export function tapCircle(r: number, pad = 0): TapCircle {
  return { x: r, y: r, radius: r + pad };
}

/** Sizes `c` to w×h and makes exactly its visible rect (optionally grown by `pad` on every side) tappable. */
export function setTapArea(c: Phaser.GameObjects.Container, w: number, h: number, pad = 0): void {
  c.setSize(w, h);
  const r = tapRect(w, h, pad);
  c.setInteractive(new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height), Phaser.Geom.Rectangle.Contains);
}

/**
 * Makes a full-area Graphics scrim tappable over (0, 0, w, h). A Graphics has no size and a display origin of 0, so unlike a
 * Container its hit frame IS its own coordinate space: a scrim filled from (0, 0) is covered by exactly this rectangle.
 */
export function setScrimTapArea(scrim: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const r = tapRect(w, h);
  scrim.setInteractive(new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height), Phaser.Geom.Rectangle.Contains);
}

// The pad per side that lifts the SHORTER side of a w x h target to `min` px (0 when it is already big enough), for a target
// that is a little too small to hit with a finger but must not change how it looks. Rounded up, so the result never falls short.
export function minTapPad(w: number, h: number, min: number): number {
  return Math.ceil(Math.max(0, min - Math.min(w, h)) / 2);
}

// The parts of a viewW x viewH screen that lie outside the horizontal band [top, bottom], full width: the strip above it and the
// strip below it. A strip with no height is left out; a band that sticks out of the screen, or is empty, is clamped, so the
// strips never overlap the band or each other. Pure.
export function outsideBand(viewW: number, viewH: number, top: number, bottom: number): TapRect[] {
  const t = Math.min(Math.max(top, 0), viewH);
  const b = Math.min(Math.max(bottom, top, 0), viewH);
  const rects: TapRect[] = [];
  if (t > 0) rects.push({ x: 0, y: 0, width: viewW, height: t });
  if (b < viewH) rects.push({ x: 0, y: b, width: viewW, height: viewH - b });
  return rects;
}

/**
 * An invisible, interactive rectangle over `r` (screen space, top-left based) that only swallows taps. Input is `topOnly`, so any
 * interactive object at a LOWER depth that lies under it never sees a tap there; anything that must stay tappable in that area
 * is given a higher depth. A mask clips drawing, never input, so this is how a scrolling list keeps its off-screen rows dead.
 */
export function addTapSink(scene: Phaser.Scene, r: TapRect, depth: number): Phaser.GameObjects.Container {
  const sink = scene.add.container(r.x + r.width / 2, r.y + r.height / 2).setDepth(depth);
  setTapArea(sink, r.width, r.height);
  return sink;
}

/** Sizes `c` to the 2r×2r square around a disc of radius `r` and makes that disc (optionally grown by `pad`) tappable. */
export function setTapCircle(c: Phaser.GameObjects.Container, r: number, pad = 0): void {
  c.setSize(2 * r, 2 * r);
  const t = tapCircle(r, pad);
  c.setInteractive(new Phaser.Geom.Circle(t.x, t.y, t.radius), Phaser.Geom.Circle.Contains);
}
