const fs = require('fs');
let file = fs.readFileSync('src/game/WhotScene.ts', 'utf8');

const regexRender = /    \/\/ 2\. Render Cards with Clean On-Card Badges[\s\S]*?this\.playerCardSprites\.push\(cardContainer\);\n    \}/;

const newRender = `    // 2. Render Cards with Image-based On-Card Badges
    // Hide the old selection highlight graphics completely
    if (this.selectionHighlight) {
      this.selectionHighlight.clear();
      this.selectionHighlight.setVisible(false);
    }

    for (let i = 0; i < total; i++) {
      const card = this.playerHand[i];
      const cardKey = \`card_\${card.suit}_\${card.number}\`;

      const isValid = this.deck ? this.deck.isValidPlay(card) : false;
      const isSelected = i === this.playerSelectedIndex && this.currentTurn === 'PLAYER';

      let cardY = 198;
      if (isSelected) {
        cardY = 178; // Lift 20px on selection
      }

      const cardX = startX + i * spacing;

      const cardContainer = this.add.container(cardX, cardY);
      cardContainer.setDepth(isSelected ? 100 : i);

      const sprite = this.add.sprite(0, 0, cardKey);
      sprite.setInteractive({ useHandCursor: true });

      const index = i;
      sprite.on('pointerdown', () => {
        if (this.currentTurn !== 'PLAYER') return;
        if (this.playerSelectedIndex === index) {
          this.attemptPlayPlayerCard(index);
        } else {
          this.playerSelectedIndex = index;
          this.playSound('sfx_btn_click');
          this.renderPlayerHand();
        }
      });

      cardContainer.add(sprite);

      // Add image-based highlights inside the container
      if (isValid) {
        if (isSelected) {
          const hl = this.add.sprite(0, 0, 'selected_highlight');
          cardContainer.add(hl);
        } else {
          const hl = this.add.sprite(0, 0, 'valid_highlight');
          cardContainer.add(hl);
        }
      } else if (isSelected) {
        const hl = this.add.sprite(0, 0, 'invalid_highlight');
        cardContainer.add(hl);
      }

      this.playerCardSprites.push(cardContainer);
    }`;

file = file.replace(regexRender, newRender);
fs.writeFileSync('src/game/WhotScene.ts', file);
