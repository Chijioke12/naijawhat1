const fs = require('fs');
let file = fs.readFileSync('src/game/WhotScene.ts', 'utf8');

file = file.replace(/preload\(\): void \{\n    \/\/ Sharp pixel art rendering\n    this.cameras.main.setBackgroundColor\('#064e3b'\);\n  \}/, `preload(): void {
    // Sharp pixel art rendering
    this.cameras.main.setBackgroundColor('#064e3b');

    // Load Generated Whot Assets from Base64 JSON
    for (const [key, base64Str] of Object.entries(assetData)) {
      this.load.image(key, base64Str as string);
    }
  }`);

const searchStr = `    // Keyboard Controls Setup
    this.setupKeyboardControls();

    // Show Loading screen before Main Menu.
    // This will load all card images and then call initGameUI().
    this.showLoadingScreen();
  }`;

const replaceStr = `    // Keyboard Controls Setup
    this.setupKeyboardControls();

    this.initGameUI();
    this.showLoadingScreen();
  }`;
file = file.replace(searchStr, replaceStr);

fs.writeFileSync('src/game/WhotScene.ts', file);
