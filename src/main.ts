import Phaser from 'phaser';
import './styles/fonts.css';
import { BootScene } from './scenes/BootScene';
import { CompanySplashScene } from './scenes/CompanySplashScene';
import { IntroSplashScene } from './scenes/IntroSplashScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
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
  },
  scene: [
    BootScene,
    CompanySplashScene,
    IntroSplashScene,
    MainMenuScene,
    LevelSelectScene,
    SettingsScene,
    GameScene,
    EndScene,
  ],
});

// Dev-only handles for automated verification (Playwright). Stripped from prod builds.
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game; __Phaser: typeof Phaser }).__game = game;
  (window as unknown as { __game: Phaser.Game; __Phaser: typeof Phaser }).__Phaser = Phaser;
}
