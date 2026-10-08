import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AD_UI } from '../config/monetization.config';

// ui/adOffer.ts runs one tap on a rewarded offer (win overlay 2x, Endless revive / 2x, shop Free Fragments): disable the button
// BEFORE the ad is awaited, grant only if the scene is still there (audit H.4: no double grant, nothing into a destroyed world),
// and end the offer cleanly when no reward came. Phaser is not needed: the helper only uses the few methods faked here.

const { ads, showToast } = vi.hoisted(() => ({ ads: { isShowing: vi.fn(() => false), showRewarded: vi.fn() }, showToast: vi.fn() }));
vi.mock('../services/Ads', () => ({ Ads: ads }));
vi.mock('./toast', () => ({ showToast }));

import { runRewardedOffer, unlessAdShowing } from './adOffer';

interface FakeBtn {
  active: boolean;
  alpha: number;
  visible: boolean;
  interactive: boolean;
  log: string[];
  disableInteractive(): FakeBtn;
  setAlpha(a: number): FakeBtn;
  setVisible(v: boolean): FakeBtn;
}

function btn(): FakeBtn {
  const b: FakeBtn = {
    active: true, alpha: 1, visible: true, interactive: true, log: [],
    disableInteractive() { b.interactive = false; b.log.push('disable'); return b; },
    setAlpha(a) { b.alpha = a; b.log.push(`alpha:${a}`); return b; },
    setVisible(v) { b.visible = v; b.log.push(`visible:${v}`); return b; },
  };
  return b;
}

function scene(state: { active: boolean; paused: boolean } = { active: true, paused: false }) {
  return { scene: { isActive: () => state.active, isPaused: () => state.paused }, state };
}

const run = (s: ReturnType<typeof scene>, b: FakeBtn, source: string, handlers: Parameters<typeof runRewardedOffer>[3]) =>
  runRewardedOffer(s as never, b as never, source, handlers);

beforeEach(() => {
  ads.isShowing.mockReset().mockReturnValue(false);
  ads.showRewarded.mockReset();
  showToast.mockReset();
});

describe('runRewardedOffer', () => {
  it('disables and dims the button BEFORE the ad is awaited (a double tap cannot reach the ad twice)', async () => {
    const b = btn();
    let atShow: { interactive: boolean; alpha: number } | undefined;
    ads.showRewarded.mockImplementation(async () => {
      atShow = { interactive: b.interactive, alpha: b.alpha };
      return 'earned';
    });
    await run(scene(), b, 'endless_2x', { onEarned: vi.fn() });
    expect(atShow).toEqual({ interactive: false, alpha: AD_UI.BUSY_ALPHA });
    expect(ads.showRewarded).toHaveBeenCalledWith('endless_2x');
  });

  it('earned: grants exactly once and puts the full alpha back on the (still disabled) button', async () => {
    const b = btn();
    ads.showRewarded.mockResolvedValue('earned');
    const onEarned = vi.fn();
    await run(scene(), b, 'campaign_2x', { onEarned });
    expect(onEarned).toHaveBeenCalledTimes(1);
    expect(b.alpha).toBe(1);
    expect(b.interactive).toBe(false);
    expect(b.visible).toBe(true);
  });

  it('dismissed (closed early): no grant; the offer is hidden, no toast', async () => {
    const b = btn();
    ads.showRewarded.mockResolvedValue('dismissed');
    const onEarned = vi.fn();
    await run(scene(), b, 'endless_revive', { onEarned });
    expect(onEarned).not.toHaveBeenCalled();
    expect(b.visible).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('unavailable: no grant; the offer is hidden and "Ad unavailable" is shown (device row A3)', async () => {
    const b = btn();
    const s = scene();
    ads.showRewarded.mockResolvedValue('unavailable');
    const onEarned = vi.fn();
    await run(s, b, 'free_fragments', { onEarned, toastY: 321 });
    expect(onEarned).not.toHaveBeenCalled();
    expect(b.visible).toBe(false);
    expect(showToast).toHaveBeenCalledWith(s, AD_UI.UNAVAILABLE, { tone: 'info', y: 321 });
  });

  it('a custom onNotEarned replaces the default hide + toast and receives the outcome', async () => {
    const b = btn();
    ads.showRewarded.mockResolvedValue('unavailable');
    const onNotEarned = vi.fn();
    await run(scene(), b, 'campaign_2x', { onEarned: vi.fn(), onNotEarned });
    expect(onNotEarned).toHaveBeenCalledWith('unavailable');
    expect(b.visible).toBe(true);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('the scene was left while the ad ran: nothing is granted and nothing is touched (audit H.4)', async () => {
    const b = btn();
    const s = scene();
    ads.showRewarded.mockImplementation(async () => {
      s.state.active = false; // shut down meanwhile
      return 'earned';
    });
    const onEarned = vi.fn();
    const onNotEarned = vi.fn();
    await run(s, b, 'endless_2x', { onEarned, onNotEarned });
    expect(onEarned).not.toHaveBeenCalled();
    expect(onNotEarned).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('the scene restarted while the ad ran (active again, but the button is a destroyed object): nothing is granted', async () => {
    const b = btn();
    ads.showRewarded.mockImplementation(async () => {
      b.active = false;
      return 'earned';
    });
    const onEarned = vi.fn();
    await run(scene(), b, 'endless_revive', { onEarned });
    expect(onEarned).not.toHaveBeenCalled();
  });

  it('a scene that is only paused (an overlay opened over it) still counts as there', async () => {
    const b = btn();
    ads.showRewarded.mockResolvedValue('earned');
    const onEarned = vi.fn();
    await run(scene({ active: false, paused: true }), b, 'campaign_2x', { onEarned });
    expect(onEarned).toHaveBeenCalledTimes(1);
  });

  it('another ad is already on screen: the tap is ignored and the button is left alone', async () => {
    const b = btn();
    ads.isShowing.mockReturnValue(true);
    const onEarned = vi.fn();
    await run(scene(), b, 'endless_2x', { onEarned });
    expect(ads.showRewarded).not.toHaveBeenCalled();
    expect(b.log).toEqual([]);
    expect(b.interactive).toBe(true);
  });
});

// P00-T19 fix pass 1 (m3): the shop holds its purchase gate for the whole offer, and EVERY way out of the offer releases it. Before,
// the helper's early returns (an ad already up, the scene gone) and the grant's own early return (already claimed today) left
// gate.purchasing set, which froze the shop's purchases, restore and redraws until it was reopened.
describe('runRewardedOffer with a purchase gate (Free Fragments)', () => {
  const gated = (gate: { purchasing: boolean }, over: Partial<Parameters<typeof runRewardedOffer>[3]> = {}) => ({
    onEarned: vi.fn(),
    gate,
    ...over,
  });

  it('holds the gate while the ad is awaited', async () => {
    const gate = { purchasing: false };
    let atShow: boolean | undefined;
    ads.showRewarded.mockImplementation(async () => {
      atShow = gate.purchasing;
      return 'earned';
    });
    await run(scene(), btn(), 'free_fragments', gated(gate));
    expect(atShow).toBe(true);
  });

  for (const outcome of ['earned', 'dismissed', 'unavailable'] as const) {
    it(`releases it after ${outcome}`, async () => {
      const gate = { purchasing: false };
      ads.showRewarded.mockResolvedValue(outcome);
      await run(scene(), btn(), 'free_fragments', gated(gate));
      expect(gate.purchasing).toBe(false);
    });
  }

  it('releases it when the grant returns early (already claimed today)', async () => {
    const gate = { purchasing: false };
    ads.showRewarded.mockResolvedValue('earned');
    const onEarned = vi.fn(() => {
      if (gate.purchasing) return; // the scene's `claimedToday` early return: nothing granted, nothing redrawn
    });
    await run(scene(), btn(), 'free_fragments', gated(gate, { onEarned }));
    expect(onEarned).toHaveBeenCalledTimes(1);
    expect(gate.purchasing).toBe(false);
  });

  it('releases it when the scene was left meanwhile, and when the button was destroyed', async () => {
    const gate = { purchasing: false };
    const left = scene();
    ads.showRewarded.mockImplementation(async () => {
      left.state.active = false;
      return 'earned';
    });
    await run(left, btn(), 'free_fragments', gated(gate));
    expect(gate.purchasing).toBe(false);

    const b = btn();
    ads.showRewarded.mockImplementation(async () => {
      b.active = false;
      return 'earned';
    });
    await run(scene(), b, 'free_fragments', gated(gate));
    expect(gate.purchasing).toBe(false);
  });

  it('releases it when a handler throws or the ad call rejects, and the failure still reaches the caller', async () => {
    const gate = { purchasing: false };
    ads.showRewarded.mockResolvedValue('earned');
    await expect(run(scene(), btn(), 'free_fragments', gated(gate, { onEarned: () => { throw new Error('boom'); } }))).rejects.toThrow('boom');
    expect(gate.purchasing).toBe(false);
    ads.showRewarded.mockRejectedValue(new Error('plugin'));
    await expect(run(scene(), btn(), 'free_fragments', gated(gate))).rejects.toThrow('plugin');
    expect(gate.purchasing).toBe(false);
  });

  it('another ad already up: the tap is ignored and the gate is neither taken nor, if someone else holds it, cleared', async () => {
    ads.isShowing.mockReturnValue(true);
    const free = { purchasing: false };
    await run(scene(), btn(), 'free_fragments', gated(free));
    expect(free.purchasing).toBe(false);
    expect(ads.showRewarded).not.toHaveBeenCalled();
    const held = { purchasing: true };
    await run(scene(), btn(), 'free_fragments', gated(held));
    expect(held.purchasing).toBe(true);
  });

  it('a purchase already running (the gate is up): the tap is ignored, the gate stays up and no ad is requested', async () => {
    ads.isShowing.mockReturnValue(false);
    const gate = { purchasing: true };
    const b = btn();
    await run(scene(), b, 'free_fragments', gated(gate));
    expect(ads.showRewarded).not.toHaveBeenCalled();
    expect(gate.purchasing).toBe(true);
    expect(b.log).toEqual([]);
  });

  it('without a gate nothing changes (win overlay and Endless offers)', async () => {
    ads.showRewarded.mockResolvedValue('earned');
    const onEarned = vi.fn();
    await run(scene(), btn(), 'campaign_2x', { onEarned });
    expect(onEarned).toHaveBeenCalledTimes(1);
  });
});

// P00-T19 fix pass 1 (m2): ONE check for every action that would leave, reset or redraw a screen while an ad is requested or playing.
describe('unlessAdShowing', () => {
  it('runs the action with its arguments when no ad is in flight', () => {
    ads.isShowing.mockReturnValue(false);
    const action = vi.fn();
    unlessAdShowing(action)('a', 2);
    expect(action).toHaveBeenCalledWith('a', 2);
  });

  it('swallows the action while an ad is in flight, and runs it again once the ad is gone', () => {
    const action = vi.fn();
    const guarded = unlessAdShowing(action);
    ads.isShowing.mockReturnValue(true);
    guarded();
    guarded();
    expect(action).not.toHaveBeenCalled();
    ads.isShowing.mockReturnValue(false);
    guarded();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('asks Ads on every call (the answer changes during the life of a button)', () => {
    ads.isShowing.mockClear();
    ads.isShowing.mockReturnValue(false);
    const guarded = unlessAdShowing(() => undefined);
    guarded();
    guarded();
    expect(ads.isShowing).toHaveBeenCalledTimes(2);
  });
});
