const fs = require('fs');
let file = fs.readFileSync('src/game/WhotScene.ts', 'utf8');

const regexPreload = /preload\(\): void \{[\s\S]*?\n  \}/;
const newPreload = `preload(): void {
    this.cameras.main.setBackgroundColor('#064e3b');
  }`;
file = file.replace(regexPreload, newPreload);

const regexShowLoadingScreen = /private showLoadingScreen\(\): void \{[\s\S]*?progress \>= 100\) \{[\s\S]*?timer\.remove\(\);[\s\S]*?this\.showMainMenu\(\);\n              \}\n            \}\);\n          \}, 250\);\n        \}\n      \}\n    \}\);\n  \}/;

const newShowLoadingScreen = `private showLoadingScreen(): void {
    if (this.menuContainer) this.menuContainer.setVisible(false);

    this.loadingContainer = this.add.container(0, 0).setDepth(300);

    // Full screen overlay background
    const bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x064e3b, 1);
    bgGraphics.fillRect(0, 0, 320, 240);
    bgGraphics.lineStyle(2, 0xf1c40f, 1);
    bgGraphics.strokeRect(4, 4, 312, 232);
    this.loadingContainer.add(bgGraphics);

    const titleText = this.add.text(160, 42, 'NAIJA WHOT 3310', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '15px',
      color: '#f1c40f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.loadingContainer.add(titleText);

    const subText = this.add.text(160, 60, 'CLASSIC KAIOS EDITION', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '8px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.loadingContainer.add(subText);

    // Outer Progress Bar border
    const barBox = this.add.graphics();
    barBox.lineStyle(1.5, 0x38bdf8, 1);
    barBox.strokeRoundedRect(50, 162, 220, 14, 4);
    barBox.fillStyle(0x1e293b, 1);
    barBox.fillRoundedRect(50, 162, 220, 14, 4);
    this.loadingContainer.add(barBox);

    // Inner Progress Bar Fill Graphics
    const barFill = this.add.graphics();
    this.loadingContainer.add(barFill);

    // Progress Text
    const loadingText = this.add.text(160, 192, 'SHUFFLING CARDS... 0%', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '10px',
      color: '#f1c40f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.loadingContainer.add(loadingText);

    // Real asynchronous loading of remaining assets
    const keysToLoad = Object.keys(assetData);
    const totalAssets = keysToLoad.length;
    let loadedCount = 0;
    let hasFinishedLoading = false;

    const finishLoading = () => {
      if (hasFinishedLoading) return;
      hasFinishedLoading = true;

      setTimeout(() => {
        try {
          this.playSound('sfx_card_deal');
        } catch (e) {}

        this.tweens.add({
          targets: this.loadingContainer,
          alpha: 0,
          duration: 300,
          ease: 'Power2',
          onComplete: () => {
            if (this.loadingContainer) {
              this.loadingContainer.destroy();
            }
            this.showMainMenu();
          }
        });
      }, 250);
    };

    if (totalAssets === 0) {
      finishLoading();
      return;
    }

    const checkProgress = () => {
      loadedCount++;
      const progressPercent = Math.floor((loadedCount / totalAssets) * 100);

      if (barFill && barFill.clear) {
        barFill.clear();
        const currentWidth = Math.min(216, (loadedCount / totalAssets) * 216);
        if (currentWidth > 0) {
          barFill.fillStyle(0x2ecc71, 1);
          barFill.fillRoundedRect(52, 164, currentWidth, 10, 2);
        }
      }

      if (progressPercent < 35) {
        loadingText.setText(\`SHUFFLING CARDS... \${progressPercent}%\`);
      } else if (progressPercent < 70) {
        loadingText.setText(\`PREPARING DECK... \${progressPercent}%\`);
      } else if (progressPercent < 100) {
        loadingText.setText(\`DEALER READY... \${progressPercent}%\`);
      } else {
        loadingText.setText(\`DECK READY! 100%\`);
      }

      if (loadedCount >= totalAssets) {
        finishLoading();
      }
    };

    // Trigger all image loads asynchronously in parallel
    for (const key of keysToLoad) {
      const img = new Image();
      img.onload = () => {
        if (!this.textures.exists(key)) {
          this.textures.addImage(key, img);
        }
        checkProgress();
      };
      img.onerror = () => {
        checkProgress();
      };
      img.src = assetData[key as keyof typeof assetData] as string;
    }
  }`;

file = file.replace(regexShowLoadingScreen, newShowLoadingScreen);

fs.writeFileSync('src/game/WhotScene.ts', file);
