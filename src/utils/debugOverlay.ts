import Phaser from 'phaser';
import { safeAreaInsets } from './a11y';

// Temporary mobile diagnostics. Gated behind ?debug in main.ts — never shown to
// normal players. Renders an HTML panel (independent of the Phaser canvas, so it
// can't itself be clipped by the same bug) with the exact viewport / safe-area /
// canvas values needed to diagnose mobile fit + notch issues on a real device.
export function mountDebugOverlay(game: Phaser.Game): void {
  const el = document.createElement('pre');
  Object.assign(el.style, {
    position: 'fixed',
    left: '8px',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    margin: '0',
    background: 'rgba(0,0,0,0.85)',
    color: '#7CFFB2',
    font: '11px/1.5 ui-monospace, monospace',
    padding: '12px 14px',
    border: '1px solid #2a8a55',
    borderRadius: '10px',
    zIndex: '99999',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    textAlign: 'left',
    pointerEvents: 'none',
  } as CSSStyleDeclaration);
  document.body.appendChild(el);

  const render = (): void => {
    const ins = safeAreaInsets();
    const r = game.canvas
      ? game.canvas.getBoundingClientRect()
      : ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
    const vv = window.visualViewport;
    el.textContent = [
      'GRAVITY FLOW — mobile diag (?debug)',
      `UA: ${navigator.userAgent}`,
      `dpr: ${window.devicePixelRatio}`,
      `inner: ${window.innerWidth} x ${window.innerHeight}`,
      `screen: ${screen.width} x ${screen.height}`,
      `client: ${document.documentElement.clientWidth} x ${document.documentElement.clientHeight}`,
      `visualVP: ${vv ? `${Math.round(vv.width)} x ${Math.round(vv.height)} @top ${Math.round(vv.offsetTop)} scale ${vv.scale.toFixed(2)}` : 'n/a'}`,
      `SAFE-AREA env: T ${ins.top}  R ${ins.right}  B ${ins.bottom}  L ${ins.left}`,
      `gameSize: ${game.scale.gameSize.width} x ${game.scale.gameSize.height}`,
      `displaySize: ${Math.round(game.scale.displaySize.width)} x ${Math.round(game.scale.displaySize.height)}`,
      `canvasRect: L ${Math.round(r.left)} T ${Math.round(r.top)}  ${Math.round(r.width)} x ${Math.round(r.height)}`,
    ].join('\n');
  };

  render();
  window.addEventListener('resize', render);
  window.visualViewport?.addEventListener('resize', render);
  game.scale.on('resize', render);
  // Poll briefly while the mobile address bar settles after load.
  let n = 0;
  const id = window.setInterval(() => {
    render();
    if (++n > 20) window.clearInterval(id);
  }, 500);
}
