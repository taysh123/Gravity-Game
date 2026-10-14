// The frame guard's "Tap to restart" overlay (P00-T21, B-10). Plain DOM, independent of Phaser: it is shown when the game loop is the
// thing that broke (frameGuard.ts has put it to sleep), so nothing Phaser draws can be trusted to appear. Full screen and opaque, one
// line of title and one of action. A tap anywhere (click), or Enter / Space with a keyboard, reloads the page, which boots the game
// again from its saves. Copy, colours and sizes: PLATFORM.ERROR_OVERLAY and THEME. No Vitest test (Vitest has no DOM here): the
// dev-server smoke check scripts/harness/checks/crash-overlay.mjs drives it in Chromium.
import { PLATFORM } from '../config/platform.config';
import { THEME } from '../config/theme.config';

const O = PLATFORM.ERROR_OVERLAY;

function line(text: string, id: string, css: Partial<CSSStyleDeclaration>): HTMLParagraphElement {
  const p = document.createElement('p');
  p.id = id;
  p.textContent = text;
  Object.assign(p.style, css);
  return p;
}

/** Show the overlay. Idempotent: a second call returns the one already shown. `reload` is injectable. */
export function showErrorOverlay(reload: () => void = () => window.location.reload()): HTMLElement {
  const existing = document.getElementById(O.ID);
  if (existing) return existing;

  const panel = document.createElement('div');
  panel.id = O.ID;
  panel.setAttribute('role', 'alertdialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', `${O.ID}-title`);
  panel.setAttribute('aria-describedby', `${O.ID}-action`);
  panel.tabIndex = 0;
  const style: Partial<CSSStyleDeclaration> = {
    position: 'fixed',
    top: '0',
    right: '0',
    bottom: '0',
    left: '0',
    zIndex: String(O.Z_INDEX),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: `${O.GAP_PX}px`,
    padding: `0 ${O.SIDE_PAD_PX}px`,
    background: O.BACKGROUND,
    textAlign: 'center',
    cursor: 'pointer',
    outline: 'none',
  };
  Object.assign(panel.style, style);
  panel.append(
    line(O.TITLE, `${O.ID}-title`, { color: THEME.TEXT_PRIMARY, fontFamily: THEME.FONT_DISPLAY, fontSize: `${O.TITLE_FONT_PX}px`, fontWeight: O.TITLE_WEIGHT }),
    line(O.ACTION, `${O.ID}-action`, { color: THEME.TEXT_MUTED, fontFamily: THEME.FONT_BODY, fontSize: `${O.ACTION_FONT_PX}px` }),
  );

  let restarting = false;
  const restart = (): void => {
    if (restarting) return;
    restarting = true;
    reload();
  };
  panel.addEventListener('click', restart);
  panel.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      restart();
    }
  });
  document.body.appendChild(panel);
  panel.focus();
  return panel;
}
