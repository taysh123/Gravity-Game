// Scroll range of a masked, vertically scrolling list. Pure, no Phaser.
//
// The content container rests at `viewTop` (the first item flush with the top of the viewport) and is moved by setting its y. The
// range of that y runs from the resting position down to the position where the last item is flush with the bottom of the
// viewport. A list that fits has the single position `viewTop`: it does not scroll.

export interface ScrollRange {
  max: number; // content.y with the first item at the top of the viewport (the resting position)
  min: number; // content.y with the last item at the bottom of the viewport (equal to max when the list fits)
}

export function scrollRange(viewTop: number, viewH: number, contentH: number): ScrollRange {
  const overflow = Math.max(0, contentH - viewH);
  return { max: viewTop, min: viewTop - overflow };
}

export function clampScroll(y: number, r: ScrollRange): number {
  return Math.min(r.max, Math.max(r.min, y));
}

export function canScroll(r: ScrollRange): boolean {
  return r.min < r.max;
}
