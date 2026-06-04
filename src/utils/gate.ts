// Pure one-way-gate logic (no Phaser/Matter) so it's testable. A gate is passable
// (open) only while the ball moves along its allowed direction; moving against it
// (or being nearly still) keeps it solid.
import type { Vec2 } from '../types';

export function gateOpen(vel: Vec2, dir: Vec2, threshold: number): boolean {
  // dir is the normalized allowed pass direction; the dot is the velocity
  // component along it. Positive past the threshold => moving the allowed way.
  return vel.x * dir.x + vel.y * dir.y > threshold;
}
