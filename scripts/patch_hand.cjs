const fs = require('fs');
let file = fs.readFileSync('src/game/WhotScene.ts', 'utf8');

const oldRenderPlayerHand = `    // 2. Render Cards with Clean On-Card Badges
    for (let i = 0; i < total; i++) {
      const card = this.playerHand[i];
      const cardKey = \`card_\${card.suit}_\${card.number}\`;

      const isValid = this.deck ? this.deck.isValidPlay(card) : false;
      const isSelected = i === this.playerSelectedIndex && this.currentTurn === 'PLAYER';

      let cardY = 198;
      if (isSelected) {
        cardY = 178; // Lift 20px on selection
      }

      const cardContainer = this.add.container(startX + i * spacing, cardY);
      cardContainer.setDepth(i);

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

      // On-Card Badges strictly INSIDE card bounds (-25 to +25 X, -35 to +35 Y)
      if (isValid) {
        if (isSelected) {
          // Green & Gold outline for selected valid card
          const border = this.add.graphics();
          border.lineStyle(2.5, 0x2ecc71, 1);
          border.strokeRoundedRect(-25, -35, 50, 70, 4);
          border.lineStyle(1.5, 0xf1c40f, 1);
          border.strokeRoundedRect(-27, -37, 54, 74, 6);
          cardContainer.add(border);
        } else {
          // Green border for unselected valid card
          const border = this.add.graphics();
          border.lineStyle(2, 0x2ecc71, 0.9);
          border.strokeRoundedRect(-25, -35, 50, 70, 4);
          cardContainer.add(border);
        }
      } else if (isSelected) {
        // Red border for selected invalid card
        const border = this.add.graphics();
        border.lineStyle(2, 0xef4444, 1);
        border.strokeRoundedRect(-25, -35, 50, 70, 4);
        cardContainer.add(border);
      }

      this.playerCardSprites.push(cardContainer);
    }`;

const newRenderPlayerHand = `    // 2. Render Cards with Clean On-Card Badges
    this.selectionHighlight.setDepth(150); // Ensure highlight is above cards

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
      cardContainer.setDepth(i);

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

      // Draw borders using the single selectionHighlight graphics object
      if (isValid) {
        if (isSelected) {
          // Green & Gold outline for selected valid card
          this.selectionHighlight.lineStyle(2.5, 0x2ecc71, 1);
          this.selectionHighlight.strokeRoundedRect(cardX - 25, cardY - 35, 50, 70, 4);
          this.selectionHighlight.lineStyle(1.5, 0xf1c40f, 1);
          this.selectionHighlight.strokeRoundedRect(cardX - 27, cardY - 37, 54, 74, 6);
        } else {
          // Green border for unselected valid card
          this.selectionHighlight.lineStyle(2, 0x2ecc71, 0.9);
          this.selectionHighlight.strokeRoundedRect(cardX - 25, cardY - 35, 50, 70, 4);
        }
      } else if (isSelected) {
        // Red border for selected invalid card
        this.selectionHighlight.lineStyle(2, 0xef4444, 1);
        this.selectionHighlight.strokeRoundedRect(cardX - 25, cardY - 35, 50, 70, 4);
      }

      this.playerCardSprites.push(cardContainer);
    }`;

file = file.replace(oldRenderPlayerHand, newRenderPlayerHand);
fs.writeFileSync('src/game/WhotScene.ts', file);
