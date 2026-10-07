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
import { setScrimTapArea, setTapArea, setTapCircle, tapCircle, tapRect } from './hitArea';

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
});
