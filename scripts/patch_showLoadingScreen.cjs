const fs = require('fs');
let file = fs.readFileSync('src/game/WhotScene.ts', 'utf8');

const regex = /private showLoadingScreen\(\): void \{[\s\S]*?\/\/ Trigger all image loads asynchronously in parallel[\s\S]*?img\.src = assetData\[key as keyof typeof assetData\] as string;\n    }\n  \}/;

const newCode = `private showLoadingScreen(): void {
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

    // 4 Animated floating cards
    const cardSuits = ['card_circle', 'card_triangle', 'card_cross', 'card_square'];
    for (let i = 0; i < 4; i++) {
      const card = this.add.sprite(100 + i * 40, 100, cardSuits[i]).setScale(0.8);
      this.loadingContainer.add(card);

      this.tweens.add({
        targets: card,
        y: 110 + (i % 2 === 0 ? -6 : 6),
        rotation: (i - 1) * 0.15,
        duration: 400 + i * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

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

    let progress = 0;
    const timer = this.time.addEvent({
      delay: 15,
      repeat: 100,
      callback: () => {
        progress += 1;
        if (barFill && barFill.clear) {
          barFill.clear();
          const currentWidth = Math.min(216, (progress / 100) * 216);
          if (currentWidth > 0) {
            barFill.fillStyle(0x2ecc71, 1);
            barFill.fillRoundedRect(52, 164, currentWidth, 10, 2);
          }
        }

        if (progress < 35) {
          loadingText.setText(\`SHUFFLING CARDS... \${progress}%\`);
        } else if (progress < 70) {
          loadingText.setText(\`PREPARING DECK... \${progress}%\`);
        } else if (progress < 100) {
          loadingText.setText(\`DEALER READY... \${progress}%\`);
        } else {
          loadingText.setText(\`DECK READY! 100%\`);
        }

        if (progress >= 100) {
          timer.remove();
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
        }
      }
    });
  }`;

if (regex.test(file)) {
  file = file.replace(regex, newCode);
  fs.writeFileSync('src/game/WhotScene.ts', file);
  console.log("Success");
} else {
  console.log("Failed to match regex.");
}
