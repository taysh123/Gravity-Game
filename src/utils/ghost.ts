// Pure path helper (no Phaser) for the personal-best "ghost" trail. Keeps storage
// small by reducing a recorded run to at most `maxPoints`, evenly spaced, always
// preserving the first and last point.
export interface PathPoint {
  x: number;
  y: number;
}

export function downsamplePath(path: PathPoint[], maxPoints: number): PathPoint[] {
  if (maxPoints < 2 || path.length <= maxPoints) return path.slice();
  const out: PathPoint[] = [];
  const step = (path.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    out.push(path[Math.round(i * step)]);
  }
  return out;
}
