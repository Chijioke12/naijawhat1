import Phaser from 'phaser';
import { WhotScene } from './WhotScene';

export function createPhaserGame(containerId: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: containerId,
    width: 320,
    height: 240,
    backgroundColor: '#064e3b',
    render: {
      pixelArt: true,
      roundPixels: true
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 320,
      height: 240
    },
    scene: [WhotScene],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false
      }
    }
  };

  return new Phaser.Game(config);
}
