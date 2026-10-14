import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLATFORM } from '../config/platform.config';

// errorOverlay.ts is plain DOM and Vitest runs in node, so these tests hand it a minimal fake of the few DOM members it touches. The real thing
// runs in Chromium in the dev-server smoke check scripts/harness/checks/crash-overlay.mjs (the tap and Escape restarts, end to end).
// A fresh module graph per test: the "restart once" flag is module state, and a real restart is a page reload that clears it.

const O = PLATFORM.ERROR_OVERLAY;

type FakeEvent = { key?: string; preventDefault?: () => void };

interface FakeElement {
  id: string;
  textContent: string;
  tabIndex: number;
  style: Record<string, string>;
  attrs: Record<string, string>;
  children: FakeElement[];
  listeners: Record<string, (e: FakeEvent) => void>;
  focused: boolean;
  setAttribute(name: string, value: string): void;
  append(...nodes: FakeElement[]): void;
  addEventListener(type: string, fn: (e: FakeEvent) => void): void;
  focus(): void;
}

function fakeElement(): FakeElement {
  const el: FakeElement = {
    id: '',
    textContent: '',
    tabIndex: -1,
    style: {},
    attrs: {},
    children: [],
    listeners: {},
    focused: false,
    setAttribute: (name, value) => {
      el.attrs[name] = value;
    },
    append: (...nodes) => {
      el.children.push(...nodes);
    },
    addEventListener: (type, fn) => {
      el.listeners[type] = fn;
    },
    focus: () => {
      el.focused = true;
    },
  };
  return el;
}

async function load() {
  vi.resetModules();
  const inDocument = new Map<string, FakeElement>();
  const appended: FakeElement[] = [];
  const reload = vi.fn();
  vi.stubGlobal('document', {
    createElement: fakeElement,
    getElementById: (id: string) => inDocument.get(id) ?? null,
    body: {
      appendChild: (el: FakeElement) => {
        appended.push(el);
        inDocument.set(el.id, el);
        return el;
      },
    },
  });
  vi.stubGlobal('window', { location: { reload } });
  const overlay = await import('./errorOverlay');
  return {
    ...overlay,
    reload,
    appended,
    show: (reloadPage?: () => void): FakeElement => overlay.showErrorOverlay(reloadPage) as unknown as FakeElement,
    tap: (panel: FakeElement): void => panel.listeners.click({}),
    press: (panel: FakeElement, key: string): { preventDefault: ReturnType<typeof vi.fn> } => {
      const e = { key, preventDefault: vi.fn() };
      panel.listeners.keydown(e);
      return e;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isErrorOverlayUp', () => {
  it('is false until the overlay is shown, then true', async () => {
    const o = await load();
    expect(o.isErrorOverlayUp()).toBe(false);
    o.show();
    expect(o.isErrorOverlayUp()).toBe(true);
  });
});

describe('showErrorOverlay', () => {
  it('shows one opaque full-screen alert dialog with the title and the action, focused', async () => {
    const o = await load();
    const panel = o.show();
    expect(panel.id).toBe(O.ID);
    expect(panel.attrs.role).toBe('alertdialog');
    expect(panel.attrs['aria-modal']).toBe('true');
    expect(panel.style).toMatchObject({ position: 'fixed', top: '0', right: '0', bottom: '0', left: '0', zIndex: String(O.Z_INDEX), background: O.BACKGROUND });
    expect(panel.children.map((c) => c.textContent)).toEqual([O.TITLE, O.ACTION]);
    expect(panel.attrs['aria-labelledby']).toBe(panel.children[0].id);
    expect(panel.attrs['aria-describedby']).toBe(panel.children[1].id);
    expect(panel.focused).toBe(true);
  });

  it('is idempotent: a second call returns the overlay already shown and adds nothing', async () => {
    const o = await load();
    const first = o.show();
    expect(o.show()).toBe(first);
    expect(o.appended).toHaveLength(1);
  });
});

describe('restarting from the overlay reloads the page once', () => {
  it('a tap reloads; a second tap, Enter, Space or restartFromErrorOverlay() do not reload again', async () => {
    const o = await load();
    const panel = o.show();
    o.tap(panel);
    expect(o.reload).toHaveBeenCalledTimes(1);
    o.tap(panel);
    o.press(panel, 'Enter');
    o.press(panel, ' ');
    o.restartFromErrorOverlay();
    expect(o.reload).toHaveBeenCalledTimes(1);
  });

  it('Enter and Space restart like a tap (and do not scroll the page)', async () => {
    for (const key of ['Enter', ' ']) {
      const o = await load();
      const panel = o.show();
      expect(o.press(panel, key).preventDefault).toHaveBeenCalledTimes(1);
      expect(o.reload).toHaveBeenCalledTimes(1);
    }
  });

  it('any other key does nothing (Escape is Back, which the lifecycle routes to restartFromErrorOverlay)', async () => {
    const o = await load();
    const panel = o.show();
    for (const key of ['a', 'Escape', 'Tab']) expect(o.press(panel, key).preventDefault).not.toHaveBeenCalled();
    expect(o.reload).not.toHaveBeenCalled();
  });

  it('restartFromErrorOverlay() (what Android Back and Escape call) reloads once and is idempotent', async () => {
    const o = await load();
    o.show();
    o.restartFromErrorOverlay();
    o.restartFromErrorOverlay();
    expect(o.reload).toHaveBeenCalledTimes(1);
  });

  it('a tap after Back, or Back after a tap, is the same single restart', async () => {
    const backFirst = await load();
    const panel = backFirst.show();
    backFirst.restartFromErrorOverlay();
    backFirst.tap(panel);
    expect(backFirst.reload).toHaveBeenCalledTimes(1);

    const tapFirst = await load();
    const panel2 = tapFirst.show();
    tapFirst.tap(panel2);
    tapFirst.restartFromErrorOverlay();
    expect(tapFirst.reload).toHaveBeenCalledTimes(1);
  });

  it('the reload that showErrorOverlay was given is the one both the tap and Back use', async () => {
    const o = await load();
    const mine = vi.fn();
    const panel = o.show(mine);
    o.tap(panel);
    o.restartFromErrorOverlay();
    expect(mine).toHaveBeenCalledTimes(1);
    expect(o.reload).not.toHaveBeenCalled();
  });
});
