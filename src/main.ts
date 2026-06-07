import Phaser from 'phaser';
import './styles/fonts.css';
import { BootScene } from './scenes/BootScene';
import { CompanySplashScene } from './scenes/CompanySplashScene';
import { IntroSplashScene } from './scenes/IntroSplashScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { AchievementsScene } from './scenes/AchievementsScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GameScene } from './scenes/GameScene';
import { EndScene } from './scenes/EndScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 390,
  height: 844,
  backgroundColor: '#0d0d1a',
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'app',
    autoRound: true, // integer canvas sizes — crisper render + no fractional hit-test drift
  },
  scene: [
    BootScene,
    CompanySplashScene,
    IntroSplashScene,
    MainMenuScene,
    LevelSelectScene,
    AchievementsScene,
    SettingsScene,
    GameScene,
    EndScene,
  ],
});

// Size the Phaser parent (#app) to the *visible* viewport. iOS Chrome resolves
// CSS 100dvh to the larger toolbar-hidden layout viewport, so FIT was scaling the
// canvas taller than the screen and CENTER_BOTH pushed its top off-screen (-66px
// observed). window.visualViewport reports the truly-visible area (excludes the
// browser toolbars), so the FIT canvas stays within it with a top >= 0. Re-fit on
// every viewport change (toolbar show/hide, rotation).
function syncViewport(): void {
  const vv = window.visualViewport;
  const w = Math.round(vv?.width ?? window.innerWidth);
  const h = Math.round(vv?.height ?? window.innerHeight);
  const app = document.getElementById('app');
  if (app) {
    app.style.width = `${w}px`;
    app.style.height = `${h}px`;
    if (vv) app.style.transform = `translateY(${Math.round(vv.offsetTop)}px)`;
  }
  game.scale.refresh();
}

game.events.once(Phaser.Core.Events.READY, syncViewport);
window.addEventListener('resize', syncViewport);
window.addEventListener('orientationchange', syncViewport);
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);
// A couple of delayed passes catch iOS Chrome's toolbar settling after first paint.
setTimeout(syncViewport, 300);
setTimeout(syncViewport, 1200);

// Dev-only handles for automated verification (Playwright). Stripped from prod builds.
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game; __Phaser: typeof Phaser }).__game = game;
  (window as unknown as { __game: Phaser.Game; __Phaser: typeof Phaser }).__Phaser = Phaser;
}
