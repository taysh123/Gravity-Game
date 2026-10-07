import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// hitArea.ts needs `Phaser.Geom`, but the real `phaser` bundle reads `window` at import and cannot load under Vitest's node
// environment (the same stub fx.test.ts and purchaseUi.test.ts use). The geometry itself is pure, so the stub hands out the
// REAL Phaser.Geom.Rectangle / Circle (with their real static Contains) straight from Phaser's source.
vi.mock('phaser', async () => {
  const { createRequire } = await import('node:module');
  const req = createRequire(import.meta.url);
  return { default: { Geom: { Rectangle: req('phaser/src/geom/rectangle'), Circle: req('phaser/src/geom/circle') } } };
});

import Phaser from 'phaser';
import { addTapSink, minTapPad, outsideBand, setScrimTapArea, setTapArea, setTapCircle, tapCircle, tapRect } from './hitArea';

// ---- A minimal container stand-in that tests a point EXACTLY the way Phaser 3.90 does ------------------------------
//   Container.js:299    displayOriginX = width * 0.5   (0 until setSize is called), same for Y
//   InputManager.js:966 pointWithinHitArea: x += displayOriginX; y += displayOriginY; then hitAreaCallback(hitArea, x, y)
// `hits(lx, ly)` takes a point in the container's local, centred space (0,0 = the container's position, i.e. the middle of
// a button drawn around it).
type Contains = (area: never, x: number, y: number) => boolean; // Phaser.Geom.Rectangle.Contains / Circle.Contains
class FakeContainer {
  width = 0;
  height = 0;
  input: { hitArea: unknown; hitAreaCallback: Contains } | undefined;
  get displayOriginX(): number {
    return this.width * 0.5;
  }
  get displayOriginY(): number {
    return this.height * 0.5;
  }
  setSize(w: number, h: number): this {
    this.width = w;
    this.height = h;
    return this;
  }
  setInteractive(hitArea: unknown, callback: Contains): this {
    this.input = { hitArea, hitAreaCallback: callback };
    return this;
  }
  hits(lx: number, ly: number): boolean {
    const x = lx + this.displayOriginX;
    const y = ly + this.displayOriginY;
    return !!this.input && this.input.hitAreaCallback(this.input.hitArea as never, x, y);
  }
}
const fake = (): FakeContainer & Phaser.GameObjects.Container => new FakeContainer() as never;

// The five points the headless corner check also uses: the four visible corners inset by 1 px, and the centre.
const corners = (w: number, h: number, inset = 1): Array<[string, number, number]> => [
  ['top-left', -w / 2 + inset, -h / 2 + inset],
  ['top-right', w / 2 - inset, -h / 2 + inset],
  ['bottom-left', -w / 2 + inset, h / 2 - inset],
  ['bottom-right', w / 2 - inset, h / 2 - inset],
  ['centre', 0, 0],
];
// One px past each edge (plus `pad`), at the middle of the edge.
const justOutside = (w: number, h: number, pad: number, past = 1): Array<[string, number, number]> => [
  ['left', -w / 2 - pad - past, 0],
  ['right', w / 2 + pad + past, 0],
  ['top', 0, -h / 2 - pad - past],
  ['bottom', 0, h / 2 + pad + past],
];

const SIZES: Array<[number, number]> = [
  [220, 58], // a menu Button
  [46, 46], // an IconButton
  [52, 30], // a Toggle
  [300, 64], // a shop card
  [105, 17], // an odd, non-square size
];

// ---- The trap, kept as documentation ---------------------------------------------------------------------------------
// Every sized Container in the game used to be made tappable with a rectangle centred on its own position. Phaser tests a
// container in a frame whose origin is its TOP-LEFT corner (displayOrigin = half the size), so that rectangle only ever
// covered the visible top-left quarter and leaked outside the button to the left and above.
describe('the old centred rectangle (the trap, P00-T17b)', () => {
  const oldFormula = (c: FakeContainer, w: number, h: number): void => {
    c.setSize(w, h);
    const centred = new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h); // the old formula
    c.setInteractive(centred, Phaser.Geom.Rectangle.Contains);
  };

  it('misses the bottom-right corner of the button it is supposed to cover', () => {
    const c = new FakeContainer();
    oldFormula(c, 220, 58);
    expect(c.hits(220 / 2 - 1, 58 / 2 - 1)).toBe(false);
  });

  it('covers only the top-left quarter and the centre', () => {
    const c = new FakeContainer();
    oldFormula(c, 220, 58);
    expect(c.hits(-109, -28)).toBe(true); // visible top-left
    expect(c.hits(109, -28)).toBe(false); // visible top-right
    expect(c.hits(-109, 28)).toBe(false); // visible bottom-left
    expect(c.hits(109, 28)).toBe(false); // visible bottom-right
  });

  it('is live outside the button, up and to the left of it', () => {
    const c = new FakeContainer();
    oldFormula(c, 220, 58);
    expect(c.hits(-110 - 40, -29 - 10)).toBe(true); // 40 px left of and 10 px above the visible edge
  });

  it('would have been right on an UNSIZED container (display origin 0), which is why it looked fine in a quick test', () => {
    const c = new FakeContainer();
    const centred = new Phaser.Geom.Rectangle(-110, -29, 220, 58);
    c.setInteractive(centred, Phaser.Geom.Rectangle.Contains);
    for (const [, x, y] of corners(220, 58)) expect(c.hits(x, y)).toBe(true);
  });
});

// ---- tapRect: pure ---------------------------------------------------------------------------------------------------
describe('tapRect', () => {
  it('is the body at the container frame origin: (0, 0, w, h)', () => {
    expect(tapRect(220, 58)).toEqual({ x: 0, y: 0, width: 220, height: 58 });
  });

  it('grows by pad on every side: (-pad, -pad, w + 2 pad, h + 2 pad)', () => {
    expect(tapRect(52, 30, 8)).toEqual({ x: -8, y: -8, width: 68, height: 46 });
  });

  it('pad defaults to 0', () => {
    expect(tapRect(10, 20)).toEqual(tapRect(10, 20, 0));
  });
});

// ---- setTapArea ------------------------------------------------------------------------------------------------------
describe('setTapArea', () => {
  it('sizes the container to w x h', () => {
    const c = fake();
    setTapArea(c, 220, 58);
    expect([c.width, c.height]).toEqual([220, 58]);
  });

  it('makes the container interactive with a Rectangle and the real Phaser Contains callback', () => {
    const c = fake();
    setTapArea(c, 220, 58, 8);
    expect(c.input!.hitArea).toBeInstanceOf(Phaser.Geom.Rectangle);
    expect(c.input!.hitAreaCallback).toBe(Phaser.Geom.Rectangle.Contains);
    expect(c.input!.hitArea).toMatchObject(tapRect(220, 58, 8));
  });

  for (const [w, h] of SIZES) {
    describe(`${w} x ${h}`, () => {
      it('the four visible corners (inset 1 px) and the centre are tappable', () => {
        const c = fake();
        setTapArea(c, w, h);
        for (const [name, x, y] of corners(w, h)) expect(c.hits(x, y), name).toBe(true);
      });

      it('one px outside any edge is not tappable (no leak, up-left included)', () => {
        const c = fake();
        setTapArea(c, w, h);
        for (const [name, x, y] of justOutside(w, h, 0)) expect(c.hits(x, y), name).toBe(false);
      });

      it('with pad 8: 7 px outside every edge is still tappable, 9 px is not', () => {
        const c = fake();
        setTapArea(c, w, h, 8);
        for (const [name, x, y] of justOutside(w, h, 0, 7)) expect(c.hits(x, y), `7px ${name}`).toBe(true);
        for (const [name, x, y] of justOutside(w, h, 8, 1)) expect(c.hits(x, y), `pad+1 ${name}`).toBe(false);
        for (const [name, x, y] of corners(w, h)) expect(c.hits(x, y), name).toBe(true);
      });

      it('exactly the visible rect: the first point past each edge flips from inside to outside', () => {
        const c = fake();
        setTapArea(c, w, h);
        expect(c.hits(w / 2 - 0.001, 0)).toBe(true);
        expect(c.hits(w / 2 + 0.001, 0)).toBe(false);
        expect(c.hits(-w / 2 + 0.001, 0)).toBe(true);
        expect(c.hits(-w / 2 - 0.001, 0)).toBe(false);
        expect(c.hits(0, h / 2 - 0.001)).toBe(true);
        expect(c.hits(0, h / 2 + 0.001)).toBe(false);
        expect(c.hits(0, -h / 2 + 0.001)).toBe(true);
        expect(c.hits(0, -h / 2 - 0.001)).toBe(false);
      });
    });
  }

  it('re-sizing and re-applying replaces the area (no stale rectangle from the first call)', () => {
    const c = fake();
    setTapArea(c, 100, 40); // half size 50 x 20
    expect(c.hits(90, 35)).toBe(false);
    setTapArea(c, 200, 80); // half size 100 x 40
    expect(c.hits(90, 35)).toBe(true); // only inside the second body
    expect(c.hits(-99, -39)).toBe(true);
    expect(c.hits(99, 39)).toBe(true);
    expect(c.hits(101, 0)).toBe(false);
    expect(c.hits(0, 41)).toBe(false);
  });
});

// ---- setTapCircle (WorldMap nodes are the one circular site) ------------------------------------------------------------
describe('tapCircle / setTapCircle', () => {
  it('tapCircle is centred in the container frame: (r, r) with radius r + pad', () => {
    expect(tapCircle(34)).toEqual({ x: 34, y: 34, radius: 34 });
    expect(tapCircle(34, 8)).toEqual({ x: 34, y: 34, radius: 42 });
  });

  it('sizes the container to the circle diameter and uses the real Circle.Contains', () => {
    const c = fake();
    setTapCircle(c, 34, 8);
    expect([c.width, c.height]).toEqual([68, 68]);
    expect(c.input!.hitArea).toBeInstanceOf(Phaser.Geom.Circle);
    expect(c.input!.hitAreaCallback).toBe(Phaser.Geom.Circle.Contains);
  });

  it('covers the whole visible disc, on every side, and the pad ring, and nothing beyond', () => {
    const c = fake();
    setTapCircle(c, 34, 8);
    const d = (34 - 1) / Math.SQRT2;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) expect(c.hits(sx * d, sy * d), `${sx},${sy}`).toBe(true);
    expect(c.hits(0, 0)).toBe(true);
    expect(c.hits(41, 0)).toBe(true); // 7 px past the disc, inside the pad
    expect(c.hits(-41, 0)).toBe(true);
    expect(c.hits(0, 41)).toBe(true);
    expect(c.hits(0, -41)).toBe(true);
    expect(c.hits(43, 0)).toBe(false);
    expect(c.hits(0, -43)).toBe(false);
  });

  it('the old centred circle covered only the top-left quarter of the disc', () => {
    const c = new FakeContainer();
    c.setSize(68, 68);
    const centred = new Phaser.Geom.Circle(0, 0, 42);
    c.setInteractive(centred, Phaser.Geom.Circle.Contains);
    expect(c.hits(24, 24)).toBe(false); // the visible bottom-right of the disc
    expect(c.hits(-24, -24)).toBe(true);
  });
});

// ---- setScrimTapArea (a Graphics scrim: display origin 0, so its frame is its own coordinates) ------------------------------
describe('setScrimTapArea', () => {
  it('covers exactly (0, 0, w, h) of a zero-origin object', () => {
    const scrim = new FakeContainer(); // width stays 0, so displayOrigin is 0 like a Graphics
    setScrimTapArea(scrim as never, 390, 844);
    expect(scrim.input!.hitAreaCallback).toBe(Phaser.Geom.Rectangle.Contains);
    for (const [x, y] of [[1, 1], [389, 1], [1, 843], [389, 843], [195, 422]]) expect(scrim.hits(x, y), `${x},${y}`).toBe(true);
    for (const [x, y] of [[-1, 400], [391, 400], [200, -1], [200, 845]]) expect(scrim.hits(x, y), `${x},${y}`).toBe(false);
  });
});

// ---- minTapPad: lift a short target to the 44 px minimum without changing how it looks (F4: the 42 px Endless pills) ------------
describe('minTapPad', () => {
  it('is 0 when both sides already meet the minimum', () => {
    expect(minTapPad(220, 58, 44)).toBe(0);
    expect(minTapPad(44, 44, 44)).toBe(0);
    expect(minTapPad(300, 60, 44)).toBe(0);
  });

  it('pads each side by half the shortfall of the SHORTER side (42 px pill -> 1 px a side -> 44 px)', () => {
    expect(minTapPad(168, 42, 44)).toBe(1);
    expect(minTapPad(124, 42, 44)).toBe(1);
    expect(minTapPad(30, 30, 44)).toBe(7);
  });

  it('rounds up so an odd shortfall still reaches the minimum', () => {
    expect(minTapPad(100, 43, 44)).toBe(1); // 43 + 2 = 45 >= 44
    expect(minTapPad(100, 18, 44)).toBe(13); // 26 / 2
    expect(minTapPad(100, 17, 44)).toBe(14); // 27 / 2 = 13.5 -> 14
  });

  it('always yields a zone of at least min on both sides once applied through tapRect', () => {
    for (const [w, h] of [[168, 42], [124, 42], [90, 18], [30, 30], [100, 43.5], [44, 44], [300, 64]] as Array<[number, number]>) {
      const r = tapRect(w, h, minTapPad(w, h, 44));
      expect(Math.min(r.width, r.height), `${w}x${h}`).toBeGreaterThanOrEqual(44);
    }
  });

  it('a tapped pill keeps its visible edge live and leaks at most the pad beyond it', () => {
    const c = fake();
    setTapArea(c, 168, 42, minTapPad(168, 42, 44));
    for (const [name, x, y] of corners(168, 42)) expect(c.hits(x, y), name).toBe(true);
    expect(c.hits(0, 21.9)).toBe(true); // 0.9 px past the visible bottom edge, inside the 1 px pad
    expect(c.hits(0, 22.1)).toBe(false);
  });
});

// ---- outsideBand + addTapSink: the dead zones around a scrolling list (F1: rows scrolled out of view stay live otherwise) --------
describe('outsideBand', () => {
  it('returns the strip above and the strip below a vertical band, full width', () => {
    expect(outsideBand(390, 844, 134, 764)).toEqual([
      { x: 0, y: 0, width: 390, height: 134 },
      { x: 0, y: 764, width: 390, height: 80 },
    ]);
  });

  it('leaves out a strip that has no height (band flush with the top or the bottom)', () => {
    expect(outsideBand(390, 844, 0, 700)).toEqual([{ x: 0, y: 700, width: 390, height: 144 }]);
    expect(outsideBand(390, 844, 100, 844)).toEqual([{ x: 0, y: 0, width: 390, height: 100 }]);
    expect(outsideBand(390, 844, 0, 844)).toEqual([]);
  });

  it('clamps a band that sticks out of the screen', () => {
    expect(outsideBand(390, 844, -50, 900)).toEqual([]);
    expect(outsideBand(390, 844, 900, 1000)).toEqual([{ x: 0, y: 0, width: 390, height: 844 }]);
    expect(outsideBand(390, 844, -200, -10)).toEqual([{ x: 0, y: 0, width: 390, height: 844 }]);
  });

  it('never overlaps the band and never overlaps itself, and an empty or inverted band leaves the whole screen covered', () => {
    for (const [top, bottom] of [[134, 764], [300, 300], [400, 200], [0, 100], [700, 844]] as Array<[number, number]>) {
      const rects = outsideBand(390, 844, top, bottom);
      const lo = top; // an inverted band is read as an empty one at `top`
      const hi = Math.max(top, bottom);
      for (const r of rects) expect(r.y + r.height <= lo || r.y >= hi, `band ${top}..${bottom}`).toBe(true);
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i]; const b = rects[j];
          expect(a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
        }
      }
      if (hi === lo) expect(rects.reduce((sum, r) => sum + r.height, 0), `empty band ${top}..${bottom}`).toBe(844);
    }
  });
});

describe('addTapSink', () => {
  class Placed extends FakeContainer {
    x = 0;
    y = 0;
    depth = 0;
    setDepth(d: number): this {
      this.depth = d;
      return this;
    }
    // A point in world (screen) space, as the engine reaches it: undo the container position, then the displayOrigin shift.
    hitsWorld(wx: number, wy: number): boolean {
      return this.hits(wx - this.x, wy - this.y);
    }
  }
  const made: Placed[] = [];
  const scene = {
    add: {
      container: (x: number, y: number): Placed => {
        const c = new Placed();
        c.x = x;
        c.y = y;
        made.push(c);
        return c;
      },
    },
  } as never;

  it('covers exactly the given screen rectangle (top-left based) and sits at the given depth', () => {
    made.length = 0;
    const sink = addTapSink(scene, { x: 0, y: 0, width: 390, height: 134 }, 1) as unknown as Placed;
    expect(sink.depth).toBe(1);
    for (const [x, y] of [[1, 1], [389, 1], [1, 133], [389, 133], [195, 67]]) expect(sink.hitsWorld(x, y), `in ${x},${y}`).toBe(true);
    for (const [x, y] of [[195, 135], [-1, 60], [391, 60]]) expect(sink.hitsWorld(x, y), `out ${x},${y}`).toBe(false);
  });

  it('the two sinks of a list viewport tile the screen minus the band: every probe outside is caught once, none inside', () => {
    made.length = 0;
    const [top, bottom] = [134, 764];
    for (const r of outsideBand(390, 844, top, bottom)) addTapSink(scene, r, 1);
    expect(made).toHaveLength(2);
    for (let y = 0; y <= 844; y += 7) {
      for (let x = 0; x <= 390; x += 13) {
        const caught = made.filter((s) => s.hitsWorld(x, y)).length;
        if (y > top && y < bottom) expect(caught, `inside the band ${x},${y}`).toBe(0);
        else if (y < top - 0.5 || y > bottom + 0.5) expect(caught, `outside the band ${x},${y}`).toBe(1);
      }
    }
  });
});

// ---- Source guard: the done-when grep, plus its multi-line form -----------------------------------------------------------
describe('source guard: custom hit shapes go through ui/hitArea.ts', () => {
  const srcRoot = fileURLToPath(new URL('../', import.meta.url));
  function files(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...files(full));
      else if (/\.ts$/.test(name)) out.push(full);
    }
    return out;
  }
  const rel = (f: string): string => relative(srcRoot, f).replace(/\\/g, '/');
  // Built from pieces so this file does not itself match the grep it guards. `\s*` also spans line breaks, which a
  // line-based `git grep` cannot (the Button / IconButton / Toggle / LevelSelect calls were split over several lines).
  const forbidden = new RegExp(['setInteractive\\(\\s*new\\s+Phaser\\.Geom\\.', '(Rectangle|Circle|Ellipse|Polygon|Triangle)\\('].join(''));

  it('no file under src/ other than ui/hitArea.ts passes `new Phaser.Geom.<shape>(` straight to setInteractive', () => {
    const offenders = files(srcRoot)
      .filter((f) => rel(f) !== 'ui/hitArea.ts')
      .filter((f) => forbidden.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('the guard pattern matches both the one-line and the multi-line forms (so it is not a no-op)', () => {
    const oneLine = 'x.setInteractive(' + 'new Phaser.Geom.Rectangle(-1, -1, 2, 2), Phaser.Geom.Rectangle.Contains);';
    const multiLine = 'x.setInteractive(\n      ' + 'new Phaser.Geom.Rectangle(-1, -1, 2, 2),\n      Phaser.Geom.Rectangle.Contains,\n    );';
    const circle = 'x.setInteractive(' + 'new Phaser.Geom.Circle(0, 0, 4), Phaser.Geom.Circle.Contains);';
    expect(forbidden.test(oneLine)).toBe(true);
    expect(forbidden.test(multiLine)).toBe(true);
    expect(forbidden.test(circle)).toBe(true);
    expect(forbidden.test('x.setInteractive();')).toBe(false);
    expect(forbidden.test('setTapArea(card, w, h);')).toBe(false);
  });

  // A mask clips drawing, never input: a scrolled-out row of a masked list keeps a live hit zone over whatever lies around the
  // list. Every scene that masks content must put tap sinks around it (addTapSink), unless nothing in its list is interactive.
  const masksContent = /\.setMask\(/;
  const hasSinks = /\baddTapSink\(/;
  const NO_INTERACTIVE_ROWS = [
    'scenes/AchievementsScene.ts', // its rows are plain display objects; only the Back button is interactive, and it is outside the list
  ];

  it('every scene that masks a scrolling list also puts tap sinks around it (or has no interactive rows)', () => {
    const offenders = files(srcRoot)
      .filter((f) => masksContent.test(readFileSync(f, 'utf8')))
      .filter((f) => !hasSinks.test(readFileSync(f, 'utf8')))
      .map(rel)
      .filter((r) => !NO_INTERACTIVE_ROWS.includes(r));
    expect(offenders).toEqual([]);
  });

  it('the exemption list stays honest: an exempt scene really has no interactive object in its list', () => {
    for (const r of NO_INTERACTIVE_ROWS) {
      const src = readFileSync(join(srcRoot, r), 'utf8');
      expect(masksContent.test(src), `${r} no longer masks a list: drop it from the list`).toBe(true);
      expect(/setInteractive\(|setTapArea\(|setTapCircle\(/.test(src), `${r} gained something interactive: give it tap sinks`).toBe(false);
      expect((src.match(/new Button\(/g) ?? []).length, `${r}: only the Back button may be interactive`).toBe(1);
    }
  });
});
