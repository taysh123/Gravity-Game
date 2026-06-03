// Pure portal helpers (no Phaser/Matter) so the teleport math is testable.
import type { Vec2 } from '../types';

// Circle overlap: is (px,py) within `r` of (cx,cy)?
export function withinMouth(px: number, py: number, cx: number, cy: number, r: number): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

// Where the ball reappears: offset from the exit mouth along its travel direction
// by `clear`, so it exits in front of the mouth and clears the trigger radius. If
// the ball is nearly still, default to straight down so it still emerges cleanly.
export function portalExit(exit: Vec2, vel: Vec2, clear: number): Vec2 {
  const len = Math.hypot(vel.x, vel.y);
  const dir = len > 0.01 ? { x: vel.x / len, y: vel.y / len } : { x: 0, y: 1 };
  return { x: exit.x + dir.x * clear, y: exit.y + dir.y * clear };
}
