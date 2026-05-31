import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CompanySplashScene } from './scenes/CompanySplashScene';
import { GameScene } from './scenes/GameScene';
import { EndScene } from './scenes/EndScene';

new Phaser.Game({
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
  scene: [BootScene, CompanySplashScene, GameScene, EndScene],
});
