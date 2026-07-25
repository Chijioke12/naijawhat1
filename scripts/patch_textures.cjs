const fs = require('fs');
let file = fs.readFileSync('src/game/WhotScene.ts', 'utf8');

const regexInit = /  private initGameUI\(\): void \{/;
const newInit = `  private initGameUI(): void {
    // Generate Selection Textures to prevent WebGL Graphics stroke bugs
    if (!this.textures.exists('valid_highlight')) {
      const validGr = this.make.graphics({ x: 0, y: 0, add: false });
      validGr.lineStyle(2, 0x2ecc71, 0.9);
      validGr.strokeRoundedRect(2, 2, 50, 70, 4);
      validGr.generateTexture('valid_highlight', 54, 74);
    }
    if (!this.textures.exists('selected_highlight')) {
      const selGr = this.make.graphics({ x: 0, y: 0, add: false });
      selGr.lineStyle(2.5, 0x2ecc71, 1);
      selGr.strokeRoundedRect(3, 3, 50, 70, 4);
      selGr.lineStyle(1.5, 0xf1c40f, 1);
      selGr.strokeRoundedRect(1, 1, 54, 74, 6);
      selGr.generateTexture('selected_highlight', 56, 76);
    }
    if (!this.textures.exists('invalid_highlight')) {
      const invGr = this.make.graphics({ x: 0, y: 0, add: false });
      invGr.lineStyle(2, 0xef4444, 1);
      invGr.strokeRoundedRect(2, 2, 50, 70, 4);
      invGr.generateTexture('invalid_highlight', 54, 74);
    }`;

file = file.replace(regexInit, newInit);
fs.writeFileSync('src/game/WhotScene.ts', file);
