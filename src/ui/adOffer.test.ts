import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AD_UI } from '../config/monetization.config';

// ui/adOffer.ts runs one tap on a rewarded offer (win overlay 2x, Endless revive / 2x, shop Free Fragments): disable the button
// BEFORE the ad is awaited, grant only if the scene is still there (audit H.4: no double grant, nothing into a destroyed world),
// and end the offer cleanly when no reward came. Phaser is not needed: the helper only uses the few methods faked here.

const { ads, showToast } = vi.hoisted(() => ({ ads: { isShowing: vi.fn(() => false), showRewarded: vi.fn() }, showToast: vi.fn() }));
vi.mock('../services/Ads', () => ({ Ads: ads }));
vi.mock('./toast', () => ({ showToast }));

import { runRewardedOffer } from './adOffer';

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
