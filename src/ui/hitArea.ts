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

/** Sizes `c` to the 2r×2r square around a disc of radius `r` and makes that disc (optionally grown by `pad`) tappable. */
export function setTapCircle(c: Phaser.GameObjects.Container, r: number, pad = 0): void {
  c.setSize(2 * r, 2 * r);
  const t = tapCircle(r, pad);
  c.setInteractive(new Phaser.Geom.Circle(t.x, t.y, t.radius), Phaser.Geom.Circle.Contains);
}
