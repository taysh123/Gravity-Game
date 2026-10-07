import { describe, it, expect, vi, beforeEach } from 'vitest';

// purchaseUi.ts is Phaser glue, but the purchase / restore sequence it shares between the shop and Settings (P00-T17 review
// I1) is plain logic over callbacks: guard, dim, await the store, map the outcome, redraw or toast. It is tested here with a
// fake surface; the real `phaser` package reads `window` at import and cannot load under Vitest's node environment (the
// same stub fx.test.ts uses), and the IAP service, the toast and the audio synth are replaced by fakes.
vi.mock('phaser', () => ({ default: {} }));

const iap = vi.hoisted(() => ({
  buy: vi.fn(),
  restore: vi.fn(),
  refresh: vi.fn(),
  inFlight: vi.fn(() => false),
  owns: vi.fn(() => false),
  isPending: vi.fn(() => false),
  isPremium: vi.fn(() => false),
  price: vi.fn((): string | null => '₪7.90'),
  storeStatus: vi.fn((): string => 'ready'),
}));
vi.mock('../services/IAP', () => ({ IAP: iap }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('./toast', () => toast);

const audio = vi.hoisted(() => ({ resume: vi.fn(), playLevelComplete: vi.fn() }));
vi.mock('../utils/AudioSynth', () => ({ sharedAudio: () => audio }));

import {
  cardViewFor,
  celebrateRemoveAds,
  dimmer,
  isWebStore,
  pollMayRedraw,
  purchaseSignature,
  runBuy,
  runCheckStatus,
  runRestore,
  startPurchasePoll,
  type PurchaseSurface,
} from './purchaseUi';
import { PACKAGES, PURCHASE_COPY, PURCHASE_UI } from '../config/monetization.config';
import { THEME } from '../config/theme.config';
import { PHYSICS } from '../config/physics.config';
import { SPLASH } from '../config/splash.config';

const flush = () => new Promise((r) => setTimeout(r, 0));

interface Fake {
  surface: PurchaseSurface;
  redraws: Array<{ toast?: { message: string; tone: string }; completed?: boolean }>;
  active: { value: boolean };
  blocked: { value: boolean };
  pointer: { isDown: boolean };
  timers: Array<{ delay: number; loop: boolean; callback: () => void }>;
  tap: { dim: ReturnType<typeof vi.fn>; undim: ReturnType<typeof vi.fn> };
}

function fake(): Fake {
  const redraws: Fake['redraws'] = [];
  const active = { value: true };
  const blocked = { value: false };
  const pointer = { isDown: false };
  const timers: Fake['timers'] = [];
  const sceneObj = {
    scene: { isActive: () => active.value },
    input: { activePointer: pointer },
    time: { addEvent: (cfg: { delay: number; loop: boolean; callback: () => void }) => void timers.push(cfg) },
  };
  const surface: PurchaseSurface = {
    scene: sceneObj as never,
    gate: { purchasing: false },
    toastY: () => 321,
    blocked: () => blocked.value,
    redraw: (t, completed) => void redraws.push({ toast: t, completed }),
  };
  return { surface, redraws, active, blocked, pointer, timers, tap: { dim: vi.fn(), undim: vi.fn() } };
}

beforeEach(() => {
  vi.clearAllMocks();
  iap.inFlight.mockReturnValue(false);
  iap.owns.mockReturnValue(false);
  iap.isPending.mockReturnValue(false);
  iap.isPremium.mockReturnValue(false);
  iap.price.mockReturnValue('₪7.90');
  iap.storeStatus.mockReturnValue('ready');
});

describe('runBuy: the shared purchase sequence (A.4, A.11)', () => {
  it('disables synchronously, before any await, and ignores a second tap while it runs (A.11)', async () => {
    const f = fake();
    let settle: (o: string) => void = () => undefined;
    iap.buy.mockImplementation(() => new Promise<string>((r) => { settle = r; }));
    const first = runBuy(f.surface, PACKAGES.REMOVE_ADS, f.tap, vi.fn());
    // nothing has been awaited yet: the guard and the dimming are already in place
    expect(f.surface.gate.purchasing).toBe(true);
    expect(f.tap.dim).toHaveBeenCalledTimes(1);
    expect(iap.buy).toHaveBeenCalledWith('remove_ads');
    void runBuy(f.surface, PACKAGES.REMOVE_ADS, f.tap, vi.fn()); // a double tap
    await flush();
    expect(iap.buy).toHaveBeenCalledTimes(1);
    settle('cancelled');
    await first;
  });

  it('is ignored while the surface says so (the shop mid-scroll) or the service is busy', async () => {
    const f = fake();
    f.blocked.value = true;
    await runBuy(f.surface, PACKAGES.REMOVE_ADS, f.tap, vi.fn());
    expect(iap.buy).not.toHaveBeenCalled();
    expect(f.surface.gate.purchasing).toBe(false);
    expect(f.tap.dim).not.toHaveBeenCalled();

    f.blocked.value = false;
    iap.inFlight.mockReturnValue(true);
    await runBuy(f.surface, PACKAGES.REMOVE_ADS, f.tap, vi.fn());
    expect(iap.buy).not.toHaveBeenCalled();
  });

  it('a cancel is silent: no toast, no redraw, the control is restored (P2)', async () => {
    const f = fake();
    iap.buy.mockResolvedValue('cancelled');
    await runBuy(f.surface, PACKAGES.STARTER, f.tap, vi.fn());
    expect(toast.showToast).not.toHaveBeenCalled();
    expect(f.redraws).toEqual([]);
    expect(f.tap.undim).toHaveBeenCalledTimes(1);
    expect(f.surface.gate.purchasing).toBe(false);
  });

  it('network and error show their copy in place (info / error tone, at the surface toast position) and restore the control', async () => {
    const f = fake();
    iap.buy.mockResolvedValueOnce('network');
    await runBuy(f.surface, PACKAGES.FOUNDERS, f.tap, vi.fn());
    expect(toast.showToast).toHaveBeenLastCalledWith(f.surface.scene, PURCHASE_COPY.NETWORK, { tone: 'info', y: 321 });

    iap.buy.mockResolvedValueOnce('error');
    await runBuy(f.surface, PACKAGES.FOUNDERS, f.tap, vi.fn());
    expect(toast.showToast).toHaveBeenLastCalledWith(f.surface.scene, PURCHASE_COPY.ERROR, { tone: 'error', y: 321 });
    expect(f.tap.undim).toHaveBeenCalledTimes(2);
    expect(f.redraws).toEqual([]);
  });

  it('pending redraws the surface (the card turns PENDING) carrying the message, instead of toasting in place', async () => {
    const f = fake();
    iap.buy.mockResolvedValue('pending');
    await runBuy(f.surface, PACKAGES.STARTER, f.tap, vi.fn());
    expect(f.redraws).toEqual([{ toast: { message: PURCHASE_COPY.PENDING_NOTE, tone: 'info' }, completed: undefined }]);
    expect(toast.showToast).not.toHaveBeenCalled();
    expect(f.surface.gate.purchasing).toBe(false);
  });

  it('purchased hands over to the surface fanfare; the gate stays closed until that redraw', async () => {
    const f = fake();
    iap.buy.mockResolvedValue('purchased');
    const celebrate = vi.fn();
    await runBuy(f.surface, PACKAGES.FOUNDERS, f.tap, celebrate);
    expect(celebrate).toHaveBeenCalledTimes(1);
    expect(f.surface.gate.purchasing).toBe(true);
    expect(f.redraws).toEqual([]);
    expect(f.tap.undim).not.toHaveBeenCalled();
  });

  it('on the web an unavailable store says "Available in the Android app"', async () => {
    const f = fake();
    iap.storeStatus.mockReturnValue('web');
    iap.buy.mockResolvedValue('unavailable');
    await runBuy(f.surface, PACKAGES.REMOVE_ADS, f.tap, vi.fn());
    expect(toast.showToast).toHaveBeenLastCalledWith(f.surface.scene, PURCHASE_COPY.WEB_ONLY, { tone: 'info', y: 321 });
  });

  it('does nothing after the await when the player already left the surface during the Play sheet', async () => {
    const f = fake();
    iap.buy.mockImplementation(async () => {
      f.active.value = false;
      return 'error';
    });
    const celebrate = vi.fn();
    await runBuy(f.surface, PACKAGES.REMOVE_ADS, f.tap, celebrate);
    expect(toast.showToast).not.toHaveBeenCalled();
    expect(f.redraws).toEqual([]);
    expect(celebrate).not.toHaveBeenCalled();
  });
});

describe('runCheckStatus (A.5): one restore of the pending product', () => {
  it('asks IAP.restore for exactly that product, and reads whether it is owned only after the answer', async () => {
    const f = fake();
    iap.restore.mockImplementation(async () => {
      iap.owns.mockReturnValue(true); // the entitlement landed with the restore
      return { outcome: 'restored', restored: ['no_ads'] };
    });
    await runCheckStatus(f.surface, PACKAGES.REMOVE_ADS, f.tap);
    expect(iap.restore).toHaveBeenCalledWith({ recheck: 'remove_ads' });
    expect(f.redraws).toEqual([{ toast: { message: 'Purchases restored: Remove Ads', tone: 'info' }, completed: undefined }]);
  });

  it('still not owned: the "no completed payment found yet" copy, and the card redraws back to its Buy state (review m6)', async () => {
    const f = fake();
    iap.restore.mockResolvedValue({ outcome: 'none', restored: [] });
    await runCheckStatus(f.surface, PACKAGES.REMOVE_ADS, f.tap);
    expect(f.redraws).toEqual([{ toast: { message: PURCHASE_COPY.CHECK_NOT_FOUND, tone: 'info' }, completed: undefined }]);
    expect(f.surface.gate.purchasing).toBe(false);
  });

  it('offline keeps the pending state: the network line in place, no redraw', async () => {
    const f = fake();
    iap.restore.mockResolvedValue({ outcome: 'network', restored: [] });
    await runCheckStatus(f.surface, PACKAGES.REMOVE_ADS, f.tap);
    expect(toast.showToast).toHaveBeenCalledWith(f.surface.scene, PURCHASE_COPY.NETWORK, { tone: 'info', y: 321 });
    expect(f.redraws).toEqual([]);
    expect(f.tap.undim).toHaveBeenCalledTimes(1);
  });

  it('disables synchronously and shares the guard with buy', async () => {
    const f = fake();
    let settle: (r: unknown) => void = () => undefined;
    iap.restore.mockImplementation(() => new Promise((r) => { settle = r; }));
    const p = runCheckStatus(f.surface, PACKAGES.STARTER, f.tap);
    expect(f.surface.gate.purchasing).toBe(true);
    await runBuy(f.surface, PACKAGES.REMOVE_ADS, f.tap, vi.fn()); // ignored: a check is running
    expect(iap.buy).not.toHaveBeenCalled();
    settle({ outcome: 'busy', restored: [] });
    await p;
    expect(toast.showToast).not.toHaveBeenCalled(); // busy is silent
  });
});

describe('runRestore (A.5): the Restore Purchases link', () => {
  it('nothing found: the "No purchases found" toast in place, no redraw', async () => {
    const f = fake();
    iap.restore.mockResolvedValue({ outcome: 'none', restored: [] });
    await runRestore(f.surface, f.tap);
    expect(iap.restore).toHaveBeenCalledWith(); // everything, no recheck
    expect(toast.showToast).toHaveBeenCalledWith(f.surface.scene, PURCHASE_COPY.NOTHING_TO_RESTORE, { tone: 'info', y: 321 });
    expect(f.redraws).toEqual([]);
  });

  it("restored: the toast lists what came back and the surface redraws", async () => {
    const f = fake();
    iap.restore.mockResolvedValue({ outcome: 'restored', restored: ['no_ads', 'pack_founders'] });
    await runRestore(f.surface, f.tap);
    expect(f.redraws).toEqual([{ toast: { message: "Purchases restored: Remove Ads, Founder's Pack", tone: 'info' }, completed: undefined }]);
  });

  it('is ignored mid-scroll, and an error uses the error tone', async () => {
    const f = fake();
    f.blocked.value = true;
    await runRestore(f.surface, f.tap);
    expect(iap.restore).not.toHaveBeenCalled();
    f.blocked.value = false;
    iap.restore.mockResolvedValue({ outcome: 'error', restored: [] });
    await runRestore(f.surface, f.tap);
    expect(toast.showToast).toHaveBeenCalledWith(f.surface.scene, PURCHASE_COPY.RESTORE_ERROR, { tone: 'error', y: 321 });
  });
});

describe('celebrateRemoveAds', () => {
  it('plays the level-complete chord and redraws with the thank-you toast, marked as a completion', () => {
    const f = fake();
    celebrateRemoveAds(f.surface);
    expect(audio.resume).toHaveBeenCalled();
    expect(audio.playLevelComplete).toHaveBeenCalled();
    expect(f.redraws).toEqual([{ toast: { message: PURCHASE_COPY.ADS_REMOVED, tone: 'info' }, completed: true }]);
  });
});

describe('dimmer', () => {
  it('dims with the shared busy alpha and restores full opacity', () => {
    const target = { setAlpha: vi.fn() };
    const d = dimmer(target);
    d.dim();
    d.undim();
    expect(target.setAlpha.mock.calls).toEqual([[PURCHASE_UI.BUSY_ALPHA], [1]]);
  });
});

describe('purchaseSignature: what the cards show, as one string', () => {
  const cards = [{ packageId: PACKAGES.REMOVE_ADS }, { packageId: PACKAGES.STARTER, hideWhenNoAds: true }];

  it('is stable while nothing visible changes and differs when a price, pending or owned state changes', () => {
    const a = purchaseSignature(cards);
    expect(purchaseSignature(cards)).toBe(a);
    iap.price.mockReturnValue('₪9.90');
    const priced = purchaseSignature(cards);
    expect(priced).not.toBe(a);
    iap.isPending.mockReturnValue(true);
    const pending = purchaseSignature(cards);
    expect(pending).not.toBe(priced);
    iap.owns.mockReturnValue(true);
    expect(purchaseSignature(cards)).not.toBe(pending);
  });

  it('includes no_ads ownership (it hides Starter and rewrites the Founder value line)', () => {
    const a = purchaseSignature(cards);
    iap.isPremium.mockReturnValue(true);
    expect(purchaseSignature(cards)).not.toBe(a);
  });

  it('the same input renders the same signature on both surfaces (one builder)', () => {
    expect(purchaseSignature([{ packageId: PACKAGES.REMOVE_ADS }])).toBe(purchaseSignature([{ packageId: PACKAGES.REMOVE_ADS }]));
  });
});

describe('the redraw poll (review m2, m3): never mid-gesture, never mid-purchase, and it resumes after a scroll', () => {
  function started(sig: { value: string }, redraw = vi.fn()) {
    const f = fake();
    startPurchasePoll(f.surface, () => sig.value, redraw);
    return { f, redraw, tick: () => f.timers[0].callback() };
  }

  it('retries the store once on start, then polls on the configured interval', () => {
    const { f } = started({ value: 'a' });
    expect(iap.refresh).toHaveBeenCalledTimes(1);
    expect(f.timers).toHaveLength(1);
    expect(f.timers[0]).toMatchObject({ delay: PURCHASE_UI.POLL_MS, loop: true });
  });

  it('redraws only when the signature changed', () => {
    const sig = { value: 'a' };
    const { redraw, tick } = started(sig);
    tick();
    expect(redraw).not.toHaveBeenCalled();
    sig.value = 'b';
    tick();
    expect(redraw).toHaveBeenCalledTimes(1);
  });

  it('holds off while a purchase runs, while the surface is blocked, and while a finger is down', () => {
    const sig = { value: 'a' };
    const { f, redraw, tick } = started(sig);
    sig.value = 'b';
    f.surface.gate.purchasing = true;
    tick();
    f.surface.gate.purchasing = false;
    f.blocked.value = true;
    tick();
    f.blocked.value = false;
    f.pointer.isDown = true; // between pointerdown and pointerup on a button
    tick();
    expect(redraw).not.toHaveBeenCalled();
    f.pointer.isDown = false; // released: the change lands on the next tick (no sticky guard)
    tick();
    expect(redraw).toHaveBeenCalledTimes(1);
  });

  it('pollMayRedraw is the single gate both surfaces use', () => {
    const f = fake();
    expect(pollMayRedraw(f.surface)).toBe(true);
    f.pointer.isDown = true;
    expect(pollMayRedraw(f.surface)).toBe(false);
  });
});

describe('cardViewFor / isWebStore', () => {
  it('reads every field from the service and passes the hide flag through (Starter, A-24)', () => {
    iap.isPremium.mockReturnValue(true);
    expect(cardViewFor(PACKAGES.STARTER, true).visible).toBe(false);
    expect(cardViewFor(PACKAGES.REMOVE_ADS).visible).toBe(true);
  });

  it('isWebStore asks about the Remove Ads package by its constant, not a literal (review m7)', () => {
    iap.storeStatus.mockReturnValue('web');
    expect(isWebStore()).toBe(true);
    expect(iap.storeStatus).toHaveBeenLastCalledWith(PACKAGES.REMOVE_ADS);
    iap.storeStatus.mockReturnValue('ready');
    expect(isWebStore()).toBe(false);
  });
});

// Review m10(d): the pending / web notes were 11px muted text. They are now >= 13px, and the colours they use must keep
// 4.5:1 on the glass card whatever the cosmic backdrop behind it is (WCAG AA for normal text).
describe('note legibility (review m10d)', () => {
  const rgb = (hex: number): [number, number, number] => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  const css = (c: string): [number, number, number] => rgb(parseInt(c.slice(1), 16));
  const lin = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = ([r, g, b]: [number, number, number]): number => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a: [number, number, number], b: [number, number, number]): number => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const over = (top: [number, number, number], alpha: number, under: [number, number, number]): [number, number, number] =>
    [0, 1, 2].map((i) => top[i] * alpha + under[i] * (1 - alpha)) as [number, number, number];
  const add = (under: [number, number, number], tint: [number, number, number], alpha: number): [number, number, number] =>
    [0, 1, 2].map((i) => Math.min(255, under[i] + tint[i] * alpha)) as [number, number, number];

  // The card = PANEL_FILL at PANEL_ALPHA, then the white sheen (drawGlass), over the backdrop: black, the scene colour, or
  // the scene colour under the brightest additive nebula glow of each tint.
  const backdrops: Array<[string, [number, number, number]]> = [
    ['black', [0, 0, 0]],
    ['scene colour', rgb(PHYSICS.COLOR_BACKGROUND)],
    ...SPLASH.NEBULA_TINTS.map((t, i): [string, [number, number, number]] => [`scene colour + nebula ${i}`, add(rgb(PHYSICS.COLOR_BACKGROUND), rgb(t), SPLASH.NEBULA_ALPHA)]),
  ];
  const cardBg = (backdrop: [number, number, number]): [number, number, number] =>
    over(rgb(THEME.GLASS_FILL), THEME.GLASS_ALPHA, over(rgb(THEME.PANEL_FILL), THEME.PANEL_ALPHA, backdrop));

  it('notes are at least 13px', () => {
    expect(PURCHASE_UI.NOTE_FONT_PX).toBeGreaterThanOrEqual(13);
  });

  it.each([
    ['muted note / web copy (THEME.TEXT_MUTED)', THEME.TEXT_MUTED],
    ['pending note and Check status (PURCHASE_UI.PENDING_COLOR)', PURCHASE_UI.PENDING_COLOR],
    ['price tag (PURCHASE_UI.PRICE_COLOR)', PURCHASE_UI.PRICE_COLOR],
  ])('%s keeps >= 4.5:1 on the glass card over every backdrop', (_name, color) => {
    for (const [name, backdrop] of backdrops) {
      expect(ratio(css(color), cardBg(backdrop)), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
