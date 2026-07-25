import Phaser from 'phaser';
import { WhotDeck, type Card, type Suit, type GameSettings } from './WhotDeck';
import soundData from '../../public/sounds_base64.json';
import assetData from '../../public/assets_base64.json';

export class WhotScene extends Phaser.Scene {
  private deck!: WhotDeck;
  private playerHand: Card[] = [];
  private cpuHand: Card[] = [];

  private playerSelectedIndex: number = 0;
  public currentTurn: 'LOADING' | 'MENU' | 'PLAYER' | 'CPU' | 'WHOT_SELECT' | 'VALID_SELECT' | 'GAMEOVER' = 'LOADING';
  private hasGameStarted: boolean = false;
  private savedTurn: 'PLAYER' | 'CPU' | 'WHOT_SELECT' | 'VALID_SELECT' = 'PLAYER';
  private firstMenuLabelText!: Phaser.GameObjects.Text;

  private loadingContainer!: Phaser.GameObjects.Container;
  private menuContainer!: Phaser.GameObjects.Container;
  private menuSelectedIndex: number = 0;
  private menuHighlight!: Phaser.GameObjects.Graphics;

  private rulesContainer!: Phaser.GameObjects.Container;
  private settingsPhaserContainer!: Phaser.GameObjects.Container;
  private settingsSelectedIndex: number = 0;
  private settingsHighlight!: Phaser.GameObjects.Graphics;

  // Game Sprites & Containers
  private marketSprite!: Phaser.GameObjects.Sprite;
  private marketCountText!: Phaser.GameObjects.Text;
  private playedCardSprite!: Phaser.GameObjects.Sprite;
  private turnBannerText!: Phaser.GameObjects.Text;

  private requestedSuitContainer!: Phaser.GameObjects.Container;
  private requestedSuitText!: Phaser.GameObjects.Text;
  private requestedSuitIcon!: Phaser.GameObjects.Sprite;

  private playerCardSprites: Phaser.GameObjects.Container[] = [];
  private cpuCardSprites: Phaser.GameObjects.Sprite[] = [];
  private selectionHighlight!: Phaser.GameObjects.Graphics;

  private whotModalContainer!: Phaser.GameObjects.Container;
  private whotModalSelectedIndex: number = 0;
  private whotModalHighlight!: Phaser.GameObjects.Graphics;
  private suitCountTexts: Phaser.GameObjects.Text[] = [];

  // Valid Cards Selector Modal Overlay
  private validCardsModalContainer!: Phaser.GameObjects.Container;
  private validCardsModalSelectedIndex: number = 0;
  private validCardsModalHighlight!: Phaser.GameObjects.Graphics;
  private validCardsList: { card: Card; originalIndex: number }[] = [];
  private validCardsModalItemsContainer!: Phaser.GameObjects.Container;

  private statusText!: Phaser.GameObjects.Text;
  private gameoverContainer!: Phaser.GameObjects.Container;

  private isAnimatingPlay: boolean = false;

  // Key Listeners
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyM!: Phaser.Input.Keyboard.Key;
  private key1!: Phaser.Input.Keyboard.Key;
  private key2!: Phaser.Input.Keyboard.Key;
  private key3!: Phaser.Input.Keyboard.Key;
  private key4!: Phaser.Input.Keyboard.Key;
  private key5!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'WhotScene' });
  }

  preload(): void {
    this.cameras.main.setBackgroundColor('#064e3b');
  }

  create(): void {
    // Sharp pixel art rendering
    this.cameras.main.setBackgroundColor('#064e3b');

    // Decode base64 audio asynchronously in background to ensure instant start and no loader stalling
    const soundManager = this.sound as any;
    if (soundManager && typeof soundManager.decodeAudio === 'function') {
      for (const [key, base64Str] of Object.entries(soundData)) {
        try {
          soundManager.decodeAudio(key, base64Str as string);
        } catch (err) {
          console.warn(`Could not decode audio ${key}:`, err);
        }
      }
    }

    // Keyboard Controls Setup
    this.setupKeyboardControls();

    this.showLoadingScreen();
  }

  private initGameUI(): void {
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
    }
    // 1. Background Table Graphics
    const bgGraphics = this.add.graphics();
    // Green felt center table
    bgGraphics.fillStyle(0x064e3b, 1);
    bgGraphics.fillRect(4, 4, 312, 232);
    // Sharp border
    bgGraphics.lineStyle(2, 0xf1c40f, 1);
    bgGraphics.strokeRect(4, 4, 312, 232);

    // Header Labels (CPU Score & Turn Indicator)
    this.add.text(12, 11, 'CPU BOT', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '11px',
      color: '#38bdf8',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });

    this.statusText = this.add.text(308, 11, 'YOUR TURN', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '11px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0).setDepth(100);

    // 2. Center Area: Market Deck, Played Pile, Called Suit
    // Market Deck Pile (Left: X = 55, Y = 100)
    this.marketSprite = this.add.sprite(55, 100, 'card_back');
    this.marketSprite.setInteractive({ useHandCursor: true });
    this.marketSprite.on('pointerdown', () => this.handleMarketDrawAttempt());

    this.marketCountText = this.add.text(55, 138, 'M: 38', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '10px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5);

    // Played Pile (Center: X = 160, Y = 100)
    this.playedCardSprite = this.add.sprite(160, 100, 'card_back');

    // Requested Suit Container (Right: X = 255, Y = 100)
    this.requestedSuitContainer = this.add.container(255, 100);
    const suitBg = this.add.graphics();
    suitBg.fillStyle(0x064e3b, 0.95);
    suitBg.fillRoundedRect(-30, -28, 60, 56, 6);
    suitBg.lineStyle(2, 0xf1c40f, 1);
    suitBg.strokeRoundedRect(-30, -28, 60, 56, 6);
    this.requestedSuitContainer.add(suitBg);

    this.requestedSuitText = this.add.text(0, -18, 'I NEED', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '9px',
      color: '#f1c40f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.requestedSuitContainer.add(this.requestedSuitText);

    this.requestedSuitIcon = this.add.sprite(0, 5, 'suit_circle').setScale(1.2);
    this.requestedSuitContainer.add(this.requestedSuitIcon);
    this.requestedSuitContainer.setVisible(false);

    // Turn Banner / Message Notification Toast (Y = 62)
    this.turnBannerText = this.add.text(160, 62, '', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#064e3b',
      padding: { x: 8, y: 2 }
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    // 3. Bottom Player Selection Highlight Box
    this.selectionHighlight = this.add.graphics();
    this.selectionHighlight.setDepth(15);

    // 4. WHOT Selection Graphic Modal Container (320x240 Overlay)
    this.createWhotSelectorModal();

    // 4b. Valid Cards Selection Modal Container
    this.createValidCardsSelectorModal();

    // 5. Game Over Container
    this.createGameOverContainer();

    // 6. Main Menu Container
    this.createMainMenuContainer();
    this.createRulesContainer();
    this.createSettingsContainer();
  }

  private setupKeyboardControls(): void {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.key4 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
    this.key5 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    });
  }

  private createPlayParticleEffect(x: number, y: number, color: number): void {
    const numParticles = 15;
    for (let i = 0; i < numParticles; i++) {
      const angle = Phaser.Math.Between(0, 360);
      const speed = Phaser.Math.Between(40, 100);
      const rad = Phaser.Math.DegToRad(angle);
      const vx = Math.cos(rad) * speed;
      const vy = Math.sin(rad) * speed;

      const size = Phaser.Math.Between(3, 7);
      const p = this.add.graphics({ x, y });
      p.fillStyle(color, 1);
      p.fillRoundedRect(-size / 2, -size / 2, size, size, 2);
      p.setDepth(50);

      this.tweens.add({
        targets: p,
        x: x + vx,
        y: y + vy,
        alpha: 0,
        scale: 0.5,
        duration: Phaser.Math.Between(400, 700),
        ease: 'Cubic.out',
        onComplete: () => p.destroy()
      });
    }
  }

  private animateCardToPlayedPile(card: Card, startX: number, startY: number): void {
    const cardKey = `card_${card.suit}_${card.number}`;
    const tempSprite = this.add.sprite(startX, startY, cardKey);
    tempSprite.setDepth(40);

    const suitColors: Record<Suit, number> = {
      circle: 0xE74C3C,
      triangle: 0x2ECC71,
      cross: 0x3498DB,
      square: 0xE67E22,
      star: 0x9B59B6,
      whot: 0xF1C40F
    };
    const color = suitColors[card.suit];

    this.tweens.add({
      targets: tempSprite,
      x: 160,
      y: 100,
      duration: 250,
      ease: 'Cubic.out',
      onComplete: () => {
        tempSprite.destroy();
        this.isAnimatingPlay = false;
        if (this.playedCardSprite) this.playedCardSprite.setAlpha(1);
        this.createPlayParticleEffect(160, 100, color);
        
        // Shake camera on special cards
        const specialNumbers = [2, 14, 20];
        if (this.deck.settings.pick3) specialNumbers.push(5);
        if (this.deck.settings.suspend) specialNumbers.push(8);
        if (specialNumbers.includes(card.number)) {
          this.cameras.main.shake(150, 0.015);
        }
      }
    });
  }

  public playSound(key: string): void {
    if (this.cache.audio.exists(key)) {
      this.sound.play(key);
    }
  }

  public handleSettingsChanged(): void {
    const rawSettings = localStorage.getItem('naija_whot_settings_hd');
    let settings: GameSettings = {
      sfx: true,
      aiBanter: true,
      whotCard: true,
      pick3: true,
      suspend: true,
      emptyMarketEnds: false
    };
    if (rawSettings) {
      try {
        settings = { ...settings, ...JSON.parse(rawSettings) };
      } catch (e) {
        // ignore
      }
    }
    
    if (this.deck) {
      const oldWhotCard = this.deck.settings.whotCard;
      this.deck.settings = settings;
      
      // If whotCard toggle changed, it is best to restart the game to build the correct deck!
      if (oldWhotCard !== settings.whotCard) {
        this.startNewGame();
      }
    }
    
    this.sound.mute = !settings.sfx;
  }

  public startNewGame(): void {
    const rawSettings = localStorage.getItem('naija_whot_settings_hd');
    let settings: GameSettings = {
      sfx: true,
      aiBanter: true,
      whotCard: true,
      pick3: true,
      suspend: true,
      emptyMarketEnds: false
    };
    if (rawSettings) {
      try {
        settings = { ...settings, ...JSON.parse(rawSettings) };
      } catch (e) {
        // ignore
      }
    }

    this.deck = new WhotDeck(settings);
    this.playerHand = [];
    this.cpuHand = [];
    this.playerSelectedIndex = 0;
    this.currentTurn = 'PLAYER';
    this.hasGameStarted = true;
    this.savedTurn = 'PLAYER';

    // Deal 4 cards to each player
    for (let i = 0; i < 4; i++) {
      const pCard = this.deck.drawCard();
      const cCard = this.deck.drawCard();
      if (pCard) this.playerHand.push(pCard);
      if (cCard) this.cpuHand.push(cCard);
    }

    // First played card (Ensure it is not WHOT 20 or special card for first turn)
    let firstCard = this.deck.drawCard();
    const specialNumbers = [1, 2, 14];
    if (settings.pick3) specialNumbers.push(5);
    if (settings.suspend) specialNumbers.push(8);

    while (firstCard && (firstCard.suit === 'whot' || specialNumbers.includes(firstCard.number))) {
      this.deck.marketPile.unshift(firstCard);
      firstCard = this.deck.drawCard();
    }

    if (firstCard) {
      this.deck.playedPile.push(firstCard);
    }

    this.playSound('sfx_card_deal');
    this.refreshBoard();
  }

  private refreshBoard(): void {
    // 1. Update Market Sprite & Count
    if (this.marketCountText) {
      this.marketCountText.setText(`MARKET: ${this.deck.marketPile.length}`);
    }

    // 2. Update Played Pile Sprite
    const topPlayed = this.deck.getTopPlayedCard();
    if (topPlayed && this.playedCardSprite) {
      const key = `card_${topPlayed.suit}_${topPlayed.number}`;
      this.playedCardSprite.setTexture(key);
      if (this.isAnimatingPlay) {
        this.playedCardSprite.setAlpha(0);
      } else {
        this.playedCardSprite.setAlpha(1);
      }
    }

    // 3. Update Requested Suit Indicator
    if (this.deck.currentRequestedSuit) {
      if (this.requestedSuitIcon) {
        this.requestedSuitIcon.setTexture(`suit_${this.deck.currentRequestedSuit}`);
      }
      if (this.requestedSuitContainer) {
        this.requestedSuitContainer.setVisible(true);
      }
    } else {
      if (this.requestedSuitContainer) {
        this.requestedSuitContainer.setVisible(false);
      }
    }

    // 4. Render CPU Hand Cards
    this.renderCpuHand();

    // 5. Render Player Hand Cards
    this.renderPlayerHand();

    // 6. Update Status Banner & Softkey Labels
    if (this.currentTurn === 'PLAYER') {
      const validCardsCount = this.playerHand.filter((c) => this.deck && this.deck.isValidPlay(c)).length;
      if (this.deck.pendingPickCount > 0) {
        const topCard = this.deck.getTopPlayedCard();
        if (topCard && topCard.number === 14) {
          if (this.statusText) this.statusText.setText('MUST PICK (GENERAL MARKET)').setColor('#ef4444');
        } else {
          if (this.statusText) this.statusText.setText('DEFEND OR PICK').setColor('#ef4444');
        }
      } else if (validCardsCount > 0) {
        if (this.statusText) this.statusText.setText(`YOUR TURN (${validCardsCount} VALID)`).setColor('#2ecc71');
      } else {
        if (this.statusText) this.statusText.setText('YOUR TURN (GO MARKET)').setColor('#f1c40f');
      }
    } else if (this.currentTurn === 'CPU') {
      if (this.deck.pendingPickCount > 0) {
        if (this.statusText) this.statusText.setText('CPU PENALTY').setColor('#ef4444');
      } else {
        if (this.statusText) this.statusText.setText('CPU THINKING...').setColor('#38bdf8');
      }
    }

    this.updateSoftkeyLabels();
  }

  public getLeftSoftKeyLabel(): string {
    if (this.currentTurn === ('LOADING' as any)) return '';
    if (this.currentTurn === 'MENU') return 'EXIT';
    if (this.currentTurn === ('SETTINGS' as any)) return 'BACK';
    if (this.currentTurn === ('RULES' as any)) return 'BACK';
    if (this.currentTurn === 'GAMEOVER') return 'MENU';
    if (this.currentTurn === 'WHOT_SELECT') return 'BACK';
    if (this.currentTurn === ('VALID_SELECT' as any)) return 'BACK';
    return 'MENU';
  }

  public getRightSoftKeyLabel(): string {
    if (this.currentTurn === ('LOADING' as any)) return '';
    if (this.currentTurn === 'MENU') return 'SELECT';
    if (this.currentTurn === ('SETTINGS' as any)) return 'TOGGLE';
    if (this.currentTurn === ('RULES' as any)) return 'MENU';
    if (this.currentTurn === 'GAMEOVER') return 'PLAY AGAIN';
    if (this.currentTurn === 'WHOT_SELECT') return 'CANCEL';
    if (this.currentTurn === ('VALID_SELECT' as any)) return 'PLAY';

    if (this.currentTurn === 'PLAYER' || this.currentTurn === 'CPU') {
      if (this.deck && this.deck.pendingPickCount > 0) {
        const topCard = this.deck.getTopPlayedCard();
        const count = this.deck.pendingPickCount;

        if (topCard && topCard.number === 14) {
          return 'GEN MARKET';
        }

        if (this.currentTurn === 'PLAYER') {
          const hasDefender = this.playerHand.some((c) => this.deck.isValidPlay(c));
          if (hasDefender) {
            return `PICK ${count} / DEF`;
          }
        }
        return `PICK ${count}`;
      }
      return 'MARKET';
    }

    return 'MARKET';
  }

  public updateSoftkeyLabels(): void {
    // Softkey labels are queried dynamically by Svelte via getLeftSoftKeyLabel() and getRightSoftKeyLabel()
  }

  private renderCpuHand(): void {
    // Destroy previous sprites
    this.cpuCardSprites.forEach((s) => s.destroy());
    this.cpuCardSprites = [];

    const total = this.cpuHand.length;
    const spacing = Math.min(22, 180 / Math.max(1, total));
    const startX = 160 - ((total - 1) * spacing) / 2;

    for (let i = 0; i < total; i++) {
      const x = startX + i * spacing;
      const sprite = this.add.sprite(x, -10, 'card_back').setScale(0.8);
      // Animate card down to top bar
      this.tweens.add({
        targets: sprite,
        y: 18,
        duration: 200,
        ease: 'Cubic.out'
      });
      this.cpuCardSprites.push(sprite);
    }
  }

  private renderPlayerHand(): void {
    // Destroy previous containers
    this.playerCardSprites.forEach((c) => c.destroy());
    this.playerCardSprites = [];

    if (this.playerSelectedIndex >= this.playerHand.length) {
      this.playerSelectedIndex = Math.max(0, this.playerHand.length - 1);
    }

    const total = this.playerHand.length;
    const spacing = Math.min(28, 220 / Math.max(1, total));
    const startX = 160 - ((total - 1) * spacing) / 2;

    if (this.selectionHighlight) {
      this.selectionHighlight.clear();
    }

    // 2. Render Cards with Image-based On-Card Badges
    // Hide the old selection highlight graphics completely
    if (this.selectionHighlight) {
      this.selectionHighlight.clear();
      this.selectionHighlight.setVisible(false);
    }

    for (let i = 0; i < total; i++) {
      const card = this.playerHand[i];
      const cardKey = `card_${card.suit}_${card.number}`;

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
    }
  }

  public handleInputLeft(): void {
    if (this.currentTurn === 'PLAYER' && this.playerHand.length > 0) {
      this.playerSelectedIndex = (this.playerSelectedIndex - 1 + this.playerHand.length) % this.playerHand.length;
      this.playSound('sfx_btn_click');
      this.renderPlayerHand();
    } else if (this.currentTurn === 'WHOT_SELECT') {
      this.whotModalSelectedIndex = (this.whotModalSelectedIndex - 1 + 5) % 5;
      this.playSound('sfx_btn_click');
      this.updateWhotModalHighlight();
    } else if (this.currentTurn === ('VALID_SELECT' as any)) {
      if (this.validCardsList.length > 0) {
        this.validCardsModalSelectedIndex = (this.validCardsModalSelectedIndex - 1 + this.validCardsList.length) % this.validCardsList.length;
        this.playSound('sfx_btn_click');
        this.renderValidCardsModalItems();
      }
    }
  }

  public handleInputRight(): void {
    if (this.currentTurn === 'PLAYER' && this.playerHand.length > 0) {
      this.playerSelectedIndex = (this.playerSelectedIndex + 1) % this.playerHand.length;
      this.playSound('sfx_btn_click');
      this.renderPlayerHand();
    } else if (this.currentTurn === 'WHOT_SELECT') {
      this.whotModalSelectedIndex = (this.whotModalSelectedIndex + 1) % 5;
      this.playSound('sfx_btn_click');
      this.updateWhotModalHighlight();
    } else if (this.currentTurn === ('VALID_SELECT' as any)) {
      if (this.validCardsList.length > 0) {
        this.validCardsModalSelectedIndex = (this.validCardsModalSelectedIndex + 1) % this.validCardsList.length;
        this.playSound('sfx_btn_click');
        this.renderValidCardsModalItems();
      }
    }
  }

  public handleInputUp(): void {
    if (this.currentTurn === 'MENU') {
      this.menuSelectedIndex = (this.menuSelectedIndex - 1 + 3) % 3;
      this.playSound('sfx_btn_click');
      this.updateMenuHighlight();
    } else if (this.currentTurn === ('SETTINGS' as any)) {
      this.settingsSelectedIndex = (this.settingsSelectedIndex - 1 + 7) % 7;
      this.playSound('sfx_btn_click');
      this.updateSettingsHighlight();
    } else if (this.currentTurn === 'PLAYER') {
      this.openValidCardsSelectorModal();
    }
  }

  public handleInputDown(): void {
    if (this.currentTurn === 'MENU') {
      this.menuSelectedIndex = (this.menuSelectedIndex + 1) % 3;
      this.playSound('sfx_btn_click');
      this.updateMenuHighlight();
    } else if (this.currentTurn === ('SETTINGS' as any)) {
      this.settingsSelectedIndex = (this.settingsSelectedIndex + 1) % 7;
      this.playSound('sfx_btn_click');
      this.updateSettingsHighlight();
    } else if (this.currentTurn === ('VALID_SELECT' as any)) {
      this.closeValidCardsModal();
    }
  }

  public handleInputOk(): void {
    if (this.currentTurn === 'MENU') {
      this.playSound('sfx_btn_click');
      this.executeMenuSelection();
    } else if (this.currentTurn === ('SETTINGS' as any)) {
      this.playSound('sfx_btn_click');
      this.executeSettingsSelection();
    } else if (this.currentTurn === ('RULES' as any)) {
      this.playSound('sfx_btn_click');
      this.rulesContainer.setVisible(false);
      this.showMainMenu();
    } else if (this.currentTurn === 'PLAYER') {
      this.attemptPlayPlayerCard(this.playerSelectedIndex);
    } else if (this.currentTurn === 'WHOT_SELECT') {
      const suits: Suit[] = ['circle', 'triangle', 'cross', 'square', 'star'];
      this.selectWhotSuit(suits[this.whotModalSelectedIndex]);
    } else if (this.currentTurn === ('VALID_SELECT' as any)) {
      this.playSelectedValidCard();
    } else if (this.currentTurn === 'GAMEOVER') {
      this.gameoverContainer.setVisible(false);
      this.startNewGame();
    }
  }

  public handleMarketDrawAttempt(): void {
    if (this.currentTurn !== 'PLAYER') return;

    if (this.deck.pendingPickCount > 0) {
      // Must draw penalty cards
      this.showToast(`DRAWING ${this.deck.pendingPickCount} CARDS!`, '#e74c3c');
      for (let i = 0; i < this.deck.pendingPickCount; i++) {
        const c = this.deck.drawCard();
        if (c) this.playerHand.push(c);
      }
      this.deck.pendingPickCount = 0;
      this.playSound('sfx_card_draw');
      this.finishPlayerTurn();
      return;
    }

    const drawnCard = this.deck.drawCard();
    if (drawnCard) {
      this.playerHand.push(drawnCard);
      this.playSound('sfx_card_draw');
      this.showToast('YOU DREW FROM MARKET', '#38bdf8');
      this.finishPlayerTurn();
    } else {
      this.showToast('MARKET IS EMPTY!', '#ef4444');
      this.checkEndGameCondition('EMPTY_MARKET');
    }
  }

  private attemptPlayPlayerCard(index: number): void {
    if (index < 0 || index >= this.playerHand.length) return;
    const card = this.playerHand[index];

    if (!this.deck.isValidPlay(card)) {
      this.playSound('sfx_invalid_move');
      this.showToast('INVALID PLAY!', '#ef4444');
      this.cameras.main.shake(100, 0.01);
      return;
    }

    const total = this.playerHand.length;
    const spacing = Math.min(28, 220 / Math.max(1, total));
    const startX = 160 - ((total - 1) * spacing) / 2 + index * spacing;
    const startY = 188;

    this.isAnimatingPlay = true;
    this.animateCardToPlayedPile(card, startX, startY);

    // Play card
    this.playerHand.splice(index, 1);
    this.deck.playedPile.push(card);
    this.deck.currentRequestedSuit = null; // Clear active requested suit

    // Check win
    if (this.playerHand.length === 0) {
      this.playSound('sfx_win');
      this.triggerGameOver('PLAYER');
      return;
    }

    // Handle Card Effects
    this.processCardActionEffects(card, 'PLAYER');
  }

  private processCardActionEffects(card: Card, playedBy: 'PLAYER' | 'CPU'): void {
    const isPlayer = playedBy === 'PLAYER';

    if (!isPlayer && this.deck.settings.aiBanter) {
      const banter = this.getCpuBanterMessage(card);
      // Wait slightly so player can read standard card effects before banter
      this.time.delayedCall(300, () => {
        this.showToast(`CPU: "${banter.toUpperCase()}"`, '#38bdf8');
      });
    }

    if (card.suit === 'whot') {
      this.playSound('sfx_whot_played');
      if (isPlayer) {
        this.openWhotSuitSelector();
      } else {
        // CPU chooses its most frequent suit
        const chosenSuit = this.getCpuBestSuitChoice();
        this.selectWhotSuit(chosenSuit);
        this.currentTurn = 'PLAYER';
        this.refreshBoard();
      }
      return;
    }

    let repeatTurn = false;

    if (card.number === 1) { // Hold On
      this.playSound('sfx_hold_on');
      this.showToast('HOLD ON! ANOTHER TURN', '#f1c40f');
      repeatTurn = true;
    } else if (card.number === 2) { // Pick Two
      this.playSound('sfx_pick_two');
      this.deck.pendingPickCount += 2;
      this.showToast(`PICK TWO! (${this.deck.pendingPickCount})`, '#ef4444');
    } else if (card.number === 5 && this.deck.settings.pick3) { // Pick Three
      this.playSound('sfx_pick_three');
      this.deck.pendingPickCount += 3;
      this.showToast(`PICK THREE! (${this.deck.pendingPickCount})`, '#ef4444');
    } else if (card.number === 8 && this.deck.settings.suspend) { // Suspension
      this.playSound('sfx_suspension');
      this.showToast('SUSPENSION! SKIP TURN', '#f1c40f');
      repeatTurn = true;
    } else if (card.number === 14) { // General Market
      this.playSound('sfx_gen_market');
      this.deck.pendingPickCount += 1;
      this.showToast('GENERAL MARKET! DRAW 1 CARD', '#e67e22');
    } else {
      this.playSound('sfx_card_play');
    }

    this.refreshBoard();

    if (repeatTurn) {
      if (!isPlayer) {
        this.time.delayedCall(1000, () => this.executeCpuTurn());
      }
    } else {
      if (isPlayer) {
        this.finishPlayerTurn();
      } else {
        this.currentTurn = 'PLAYER';
        this.refreshBoard();
      }
    }
  }

  private getCpuBanterMessage(card: Card): string {
    const bantersNormal = [
      "No be luck, na pure skill!",
      "I dey watch you like DSTV.",
      "Oya play, make we see.",
      "Your card don dey red?",
      "No go play card with your rent money o!",
      "I represent Naija Whot king!",
      "Calm down, no vex!",
      "You dey play like learner."
    ];
    
    const bantersHold = [
      "HOLD ON! Steady your mind first!",
      "One more turn for me, thank you!",
      "Don't go anywhere, I'm still playing!"
    ];

    const bantersPick2 = [
      "Oya carry two! Double up!",
      "Two cards for you, no crying!",
      "Take your two cards with love!"
    ];

    const bantersPick3 = [
      "Hehe! Pick THREE for your hand!",
      "Oya pack three, no dey delay!",
      "This one na heavy weight! Pick 3!"
    ];

    const bantersSuspend = [
      "SUSPENDED! Take a seat!",
      "No turn for you, rest first!",
      "Shhh... sit down, it's my turn again!"
    ];

    const bantersGeneralMarket = [
      "GENERAL MARKET! Everybody buy!",
      "Oya run go market go buy!",
      "Naija Market don open! Draw!"
    ];

    const bantersWhot = [
      "WHOT! Power card!",
      "The master card is here!",
      "Oya, I need my favorite suit!"
    ];

    if (card.suit === 'whot') {
      return bantersWhot[Math.floor(Math.random() * bantersWhot.length)];
    }
    if (card.number === 1) {
      return bantersHold[Math.floor(Math.random() * bantersHold.length)];
    }
    if (card.number === 2) {
      return bantersPick2[Math.floor(Math.random() * bantersPick2.length)];
    }
    if (card.number === 5 && this.deck.settings.pick3) {
      return bantersPick3[Math.floor(Math.random() * bantersPick3.length)];
    }
    if (card.number === 8 && this.deck.settings.suspend) {
      return bantersSuspend[Math.floor(Math.random() * bantersSuspend.length)];
    }
    if (card.number === 14) {
      return bantersGeneralMarket[Math.floor(Math.random() * bantersGeneralMarket.length)];
    }

    return bantersNormal[Math.floor(Math.random() * bantersNormal.length)];
  }

  private finishPlayerTurn(): void {
    this.currentTurn = 'CPU';
    this.refreshBoard();
    this.time.delayedCall(1200, () => this.executeCpuTurn());
  }

  private executeCpuTurn(): void {
    if (this.currentTurn !== 'CPU') return;

    // 1. Defend pending pick
    if (this.deck.pendingPickCount > 0) {
      const top = this.deck.getTopPlayedCard();
      const defenderIndex = this.cpuHand.findIndex(
        (c) => top && c.number === top.number && (c.number === 2 || (c.number === 5 && this.deck.settings.pick3))
      );

      if (defenderIndex !== -1) {
        const total = this.cpuHand.length;
        const spacing = Math.min(22, 180 / Math.max(1, total));
        const startX = 160 - ((total - 1) * spacing) / 2 + defenderIndex * spacing;
        const startY = 18;

        const card = this.cpuHand.splice(defenderIndex, 1)[0];
        
        this.isAnimatingPlay = true;
        this.animateCardToPlayedPile(card, startX, startY);

        this.deck.playedPile.push(card);
        this.deck.currentRequestedSuit = null; // Clear active requested suit
        this.showToast(`CPU DEFENDS WITH ${card.number}!`, '#f1c40f');
        this.processCardActionEffects(card, 'CPU');
        return;
      } else {
        // CPU must draw penalty cards
        this.showToast(`CPU DRAWS ${this.deck.pendingPickCount} CARDS`, '#ef4444');
        for (let i = 0; i < this.deck.pendingPickCount; i++) {
          const c = this.deck.drawCard();
          if (c) this.cpuHand.push(c);
        }
        this.deck.pendingPickCount = 0;
        this.playSound('sfx_card_draw');
        this.currentTurn = 'PLAYER';
        this.refreshBoard();
        return;
      }
    }

    // 2. Find valid card to play
    const validIndices: number[] = [];
    this.cpuHand.forEach((card, idx) => {
      if (this.deck.isValidPlay(card)) {
        validIndices.push(idx);
      }
    });

    if (validIndices.length > 0) {
      // Prioritize non-WHOT matching cards first, keep WHOT for strategic plays
      let selectedIndex = validIndices.find((idx) => this.cpuHand[idx].suit !== 'whot');
      if (selectedIndex === undefined) {
        selectedIndex = validIndices[0];
      }

      const total = this.cpuHand.length;
      const spacing = Math.min(22, 180 / Math.max(1, total));
      const startX = 160 - ((total - 1) * spacing) / 2 + selectedIndex * spacing;
      const startY = 18;

      const card = this.cpuHand.splice(selectedIndex, 1)[0];
      
      this.isAnimatingPlay = true;
      this.animateCardToPlayedPile(card, startX, startY);

      this.deck.playedPile.push(card);
      this.deck.currentRequestedSuit = null; // Clear active requested suit

      if (this.cpuHand.length === 0) {
        this.playSound('sfx_lose');
        this.triggerGameOver('CPU');
        return;
      }

      this.processCardActionEffects(card, 'CPU');
    } else {
      // CPU draws card
      const drawn = this.deck.drawCard();
      if (drawn) {
        this.cpuHand.push(drawn);
        this.playSound('sfx_card_draw');
        this.showToast('CPU DREW FROM MARKET', '#38bdf8');
      } else {
        this.checkEndGameCondition('EMPTY_MARKET');
        return;
      }
      this.currentTurn = 'PLAYER';
      this.refreshBoard();
    }
  }

  private getCpuBestSuitChoice(): Suit {
    const counts: Record<Suit, number> = {
      circle: 0,
      triangle: 0,
      cross: 0,
      square: 0,
      star: 0,
      whot: 0
    };

    this.cpuHand.forEach((c) => counts[c.suit]++);

    const suits: Suit[] = ['circle', 'triangle', 'cross', 'square', 'star'];
    let bestSuit: Suit = 'circle';
    let maxCount = -1;

    for (const s of suits) {
      if (counts[s] > maxCount) {
        maxCount = counts[s];
        bestSuit = s;
      }
    }
    return bestSuit;
  }

  private showLoadingScreen(): void {
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

      this.initGameUI();

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
        loadingText.setText(`SHUFFLING CARDS... ${progressPercent}%`);
      } else if (progressPercent < 70) {
        loadingText.setText(`PREPARING DECK... ${progressPercent}%`);
      } else if (progressPercent < 100) {
        loadingText.setText(`DEALER READY... ${progressPercent}%`);
      } else {
        loadingText.setText(`DECK READY! 100%`);
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
  }

  private createMainMenuContainer(): void {
    this.menuContainer = this.add.container(0, 0).setDepth(200);

    const bg = this.add.graphics();
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, 320, 240);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(4, 4, 312, 232);
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, 320, 240);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(4, 4, 312, 232);
    bg.fillStyle(0x0f1016, 0.95);
    bg.fillRect(20, 20, 280, 200);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(20, 20, 280, 200);
    this.menuContainer.add(bg);

    const titleText = this.add.text(160, 42, 'NAIJA WHOT', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '14px',
      color: '#f1c40f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.menuContainer.add(titleText);

    const subText = this.add.text(160, 60, 'CLASSIC KAIOS EDITION', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '8px',
      color: '#94a3b8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.menuContainer.add(subText);

    this.menuHighlight = this.add.graphics();
    this.menuContainer.add(this.menuHighlight);

    const menuItems = [
      { label: 'PLAY GAME', y: 95 },
      { label: 'HOW TO PLAY', y: 130 },
      { label: 'SETTINGS', y: 165 }
    ];

    menuItems.forEach((item, index) => {
      const itemBg = this.add.graphics();
      itemBg.fillStyle(0x1a1c29, 1);
      itemBg.fillRoundedRect(50, item.y - 14, 220, 28, 6);
      itemBg.lineStyle(1, 0x334155, 1);
      itemBg.strokeRoundedRect(50, item.y - 14, 220, 28, 6);
      this.menuContainer.add(itemBg);

      const label = this.add.text(160, item.y, item.label, {
        fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      if (index === 0) {
        this.firstMenuLabelText = label;
      }
      this.menuContainer.add(label);

      const hitZone = this.add.zone(160, item.y, 220, 28).setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => {
        if (this.currentTurn !== 'MENU') return;
        this.menuSelectedIndex = index;
        this.updateMenuHighlight();
        this.playSound('sfx_btn_click');
        this.executeMenuSelection();
      });
      this.menuContainer.add(hitZone);
    });

    const footerText = this.add.text(160, 202, 'Use ▲▼ to Select, OK to Confirm', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '8px',
      color: '#64748b'
    }).setOrigin(0.5);
    this.menuContainer.add(footerText);

    this.menuContainer.setVisible(false);
  }

  public showMainMenu(): void {
    if (this.currentTurn === 'PLAYER' || this.currentTurn === 'CPU' || this.currentTurn === 'WHOT_SELECT') {
      this.savedTurn = this.currentTurn;
      this.hasGameStarted = true;
    }
    this.currentTurn = 'MENU';
    this.menuSelectedIndex = 0;
    this.updateMenuHighlight();
    if (this.firstMenuLabelText) {
      this.firstMenuLabelText.setText(this.hasGameStarted ? 'RESUME GAME' : 'PLAY GAME');
    }
    if (this.menuContainer) this.menuContainer.setVisible(true);
    if (this.rulesContainer) this.rulesContainer.setVisible(false);
    if (this.settingsPhaserContainer) this.settingsPhaserContainer.setVisible(false);
    if (this.whotModalContainer) this.whotModalContainer.setVisible(false);
    if (this.gameoverContainer) this.gameoverContainer.setVisible(false);
    if (this.statusText) this.statusText.setText('MAIN MENU').setColor('#f1c40f');
    this.updateSoftkeyLabels();
  }

  private updateMenuHighlight(): void {
    if (!this.menuHighlight) return;
    this.menuHighlight.clear();
    const ys = [95, 130, 165];
    const y = ys[this.menuSelectedIndex];

    this.menuHighlight.lineStyle(2, 0xf1c40f, 1);
    this.menuHighlight.strokeRoundedRect(48, y - 16, 224, 32, 8);
    this.menuHighlight.fillStyle(0xf1c40f, 0.15);
    this.menuHighlight.fillRoundedRect(48, y - 16, 224, 32, 8);
  }

  private executeMenuSelection(): void {
    if (this.menuSelectedIndex === 0) {
      if (this.menuContainer) this.menuContainer.setVisible(false);
      if (this.hasGameStarted) {
        this.currentTurn = this.savedTurn;
        if (this.statusText) {
          this.statusText.setText(this.currentTurn === 'PLAYER' ? 'YOUR TURN' : 'CPU TURN').setColor('#2ecc71');
        }
      } else {
        this.startNewGame();
      }
    } else if (this.menuSelectedIndex === 1) {
      if (this.menuContainer) this.menuContainer.setVisible(false);
      this.showRulesScreen();
    } else if (this.menuSelectedIndex === 2) {
      if (this.menuContainer) this.menuContainer.setVisible(false);
      this.showSettingsScreen();
    }
  }

  private createRulesContainer(): void {
    this.rulesContainer = this.add.container(0, 0).setDepth(210);

    const bg = this.add.graphics();
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, 320, 240);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(4, 4, 312, 232);
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, 320, 240);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(4, 4, 312, 232);
    bg.fillStyle(0x0f1016, 0.98);
    bg.fillRect(15, 15, 290, 210);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(15, 15, 290, 210);
    this.rulesContainer.add(bg);

    const titleText = this.add.text(160, 32, 'HOW TO PLAY NAIJA WHOT', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '12px',
      color: '#f1c40f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.rulesContainer.add(titleText);

    const rulesDesc = 
      '• Match card number or suit with the pile.\n' +
      '• WHOT (20): Wild card! Call any suit.\n' +
      '• HOLD ON (1): Same player plays again.\n' +
      '• PICK 2 (2): Opponent draws 2 (Defend with 2).\n' +
      '• PICK 3 (5): Opponent draws 3 (Defend with 5).\n' +
      '• GENERAL MARKET (14): Opponent draws 1 (Cannot be defended).\n' +
      '• First player to clear all cards wins!';

    const rulesContent = this.add.text(30, 52, rulesDesc, {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '9px',
      color: '#cbd5e1',
      lineSpacing: 3
    });
    this.rulesContainer.add(rulesContent);

    const backBtnBg = this.add.graphics();
    backBtnBg.fillStyle(0x1a1c29, 1);
    backBtnBg.fillRoundedRect(90, 190, 140, 24, 6);
    backBtnBg.lineStyle(1, 0xf1c40f, 1);
    backBtnBg.strokeRoundedRect(90, 190, 140, 24, 6);
    this.rulesContainer.add(backBtnBg);

    const backBtnText = this.add.text(160, 202, '◄ BACK TO MENU (OK)', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '9px',
      color: '#f1c40f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.rulesContainer.add(backBtnText);

    const hitZone = this.add.zone(160, 202, 140, 24).setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      this.playSound('sfx_btn_click');
      this.rulesContainer.setVisible(false);
      this.showMainMenu();
    });
    this.rulesContainer.add(hitZone);

    this.rulesContainer.setVisible(false);
  }

  public showRulesScreen(): void {
    this.currentTurn = 'RULES' as any;
    if (this.menuContainer) this.menuContainer.setVisible(false);
    if (this.settingsPhaserContainer) this.settingsPhaserContainer.setVisible(false);
    if (this.rulesContainer) this.rulesContainer.setVisible(true);
    if (this.statusText) this.statusText.setText('RULES').setColor('#f1c40f');
    this.updateSoftkeyLabels();
  }

  private createSettingsContainer(): void {
    this.settingsPhaserContainer = this.add.container(0, 0).setDepth(210);

    const bg = this.add.graphics();
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, 320, 240);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(4, 4, 312, 232);
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, 320, 240);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(4, 4, 312, 232);
    bg.fillStyle(0x0f1016, 0.98);
    bg.fillRect(15, 15, 290, 210);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(15, 15, 290, 210);
    this.settingsPhaserContainer.add(bg);

    const titleText = this.add.text(160, 30, 'GAME SETTINGS', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '12px',
      color: '#f1c40f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.settingsPhaserContainer.add(titleText);

    this.settingsHighlight = this.add.graphics();
    this.settingsPhaserContainer.add(this.settingsHighlight);

    const raw = localStorage.getItem('naija_whot_settings_hd');
    let settings: any = {
      sfx: true,
      aiBanter: true,
      whotCard: true,
      pick3: true,
      suspend: true,
      emptyMarketEnds: false
    };
    if (raw) {
      try { settings = JSON.parse(raw); } catch (e) {}
    }

    const settingsItems = [
      { key: 'sfx', label: `Sound Effects: ${settings.sfx ? 'ON' : 'OFF'}` },
      { key: 'aiBanter', label: `AI Trash Talk: ${settings.aiBanter ? 'ON' : 'OFF'}` },
      { key: 'whotCard', label: `WHOT (20) Cards: ${settings.whotCard ? 'ON' : 'OFF'}` },
      { key: 'pick3', label: `Pick Three (5): ${settings.pick3 ? 'ON' : 'OFF'}` },
      { key: 'suspend', label: `Suspension (8): ${settings.suspend ? 'ON' : 'OFF'}` },
      { key: 'emptyMarketEnds', label: `Empty Market Ends: ${settings.emptyMarketEnds ? 'ON' : 'OFF'}` },
      { key: 'back', label: '◄ BACK TO MENU' }
    ];

    const ys = [46, 68, 90, 112, 134, 156, 184];

    settingsItems.forEach((item, index) => {
      const y = ys[index];
      const itemBg = this.add.graphics();
      itemBg.fillStyle(0x1a1c29, 1);
      itemBg.fillRoundedRect(30, y - 9, 260, 18, 4);
      itemBg.lineStyle(1, 0x334155, 1);
      itemBg.strokeRoundedRect(30, y - 9, 260, 18, 4);
      this.settingsPhaserContainer.add(itemBg);

      const label = this.add.text(40, y, item.label, {
        fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
        fontSize: '9px',
        color: index === 6 ? '#f1c40f' : '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      label.setName(`settingLabel_${index}`);
      this.settingsPhaserContainer.add(label);

      const hitZone = this.add.zone(160, y, 260, 18).setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => {
        if (this.currentTurn !== ('SETTINGS' as any)) return;
        this.settingsSelectedIndex = index;
        this.updateSettingsHighlight();
        this.playSound('sfx_btn_click');
        this.executeSettingsSelection();
      });
      this.settingsPhaserContainer.add(hitZone);
    });

    const footerText = this.add.text(160, 205, 'Use ▲▼ to Select, OK to Toggle/Confirm', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '8px',
      color: '#64748b'
    }).setOrigin(0.5);
    this.settingsPhaserContainer.add(footerText);

    this.settingsPhaserContainer.setVisible(false);
  }

  public showSettingsScreen(): void {
    this.currentTurn = 'SETTINGS' as any;
    this.settingsSelectedIndex = 0;
    
    // Refresh setting labels from current localStorage
    const raw = localStorage.getItem('naija_whot_settings_hd');
    let settings: any = {
      sfx: true,
      aiBanter: true,
      whotCard: true,
      pick3: true,
      suspend: true,
      emptyMarketEnds: false
    };
    if (raw) {
      try { settings = JSON.parse(raw); } catch (e) {}
    }

    const labels = [
      `Sound Effects: ${settings.sfx ? 'ON' : 'OFF'}`,
      `AI Trash Talk: ${settings.aiBanter ? 'ON' : 'OFF'}`,
      `WHOT (20) Cards: ${settings.whotCard ? 'ON' : 'OFF'}`,
      `Pick Three (5): ${settings.pick3 ? 'ON' : 'OFF'}`,
      `Suspension (8): ${settings.suspend ? 'ON' : 'OFF'}`,
      `Empty Market Ends: ${settings.emptyMarketEnds ? 'ON' : 'OFF'}`,
      '◄ BACK TO MENU'
    ];

    labels.forEach((text, idx) => {
      if (this.settingsPhaserContainer) {
        const lbl = this.settingsPhaserContainer.getByName(`settingLabel_${idx}`) as Phaser.GameObjects.Text;
        if (lbl) lbl.setText(text);
      }
    });

    this.updateSettingsHighlight();
    if (this.menuContainer) this.menuContainer.setVisible(false);
    if (this.rulesContainer) this.rulesContainer.setVisible(false);
    if (this.settingsPhaserContainer) this.settingsPhaserContainer.setVisible(true);
    if (this.statusText) this.statusText.setText('SETTINGS').setColor('#f1c40f');
    this.updateSoftkeyLabels();
  }

  private updateSettingsHighlight(): void {
    if (!this.settingsHighlight) return;
    this.settingsHighlight.clear();
    const ys = [46, 68, 90, 112, 134, 156, 184];
    const y = ys[this.settingsSelectedIndex];

    this.settingsHighlight.lineStyle(2, 0xf1c40f, 1);
    this.settingsHighlight.strokeRoundedRect(28, y - 11, 264, 22, 6);
    this.settingsHighlight.fillStyle(0xf1c40f, 0.15);
    this.settingsHighlight.fillRoundedRect(28, y - 11, 264, 22, 6);
  }

  private executeSettingsSelection(): void {
    const keys = ['sfx', 'aiBanter', 'whotCard', 'pick3', 'suspend', 'emptyMarketEnds'];
    if (this.settingsSelectedIndex >= 0 && this.settingsSelectedIndex <= 5) {
      const k = keys[this.settingsSelectedIndex];
      const raw = localStorage.getItem('naija_whot_settings_hd');
      let settings: any = {
        sfx: true,
        aiBanter: true,
        whotCard: true,
        pick3: true,
        suspend: true,
        emptyMarketEnds: false
      };
      if (raw) {
        try { settings = JSON.parse(raw); } catch (e) {}
      }

      settings[k] = !settings[k];
      localStorage.setItem('naija_whot_settings_hd', JSON.stringify(settings));
      this.handleSettingsChanged();

      const names = [
        `Sound Effects: ${settings.sfx ? 'ON' : 'OFF'}`,
        `AI Trash Talk: ${settings.aiBanter ? 'ON' : 'OFF'}`,
        `WHOT (20) Cards: ${settings.whotCard ? 'ON' : 'OFF'}`,
        `Pick Three (5): ${settings.pick3 ? 'ON' : 'OFF'}`,
        `Suspension (8): ${settings.suspend ? 'ON' : 'OFF'}`,
        `Empty Market Ends: ${settings.emptyMarketEnds ? 'ON' : 'OFF'}`
      ];

      if (this.settingsPhaserContainer) {
        const lbl = this.settingsPhaserContainer.getByName(`settingLabel_${this.settingsSelectedIndex}`) as Phaser.GameObjects.Text;
        if (lbl) lbl.setText(names[this.settingsSelectedIndex]);
      }
    } else if (this.settingsSelectedIndex === 6) {
      if (this.settingsPhaserContainer) this.settingsPhaserContainer.setVisible(false);
      this.showMainMenu();
    }
  }

  public returnToMainMenu(): void {
    this.showMainMenu();
  }
  private createWhotSelectorModal(): void {
    this.whotModalContainer = this.add.container(0, 0);
    this.whotModalContainer.setDepth(100);

    // Graphic image generated by Node canvas script
    const modalImage = this.add.image(160, 120, 'whot_selector_modal');
    this.whotModalContainer.add(modalImage);

    this.whotModalHighlight = this.add.graphics();
    this.whotModalContainer.add(this.whotModalHighlight);

    // Add interactive click targets for suit selection & suit count badges
    const suits: Suit[] = ['circle', 'triangle', 'cross', 'square', 'star'];
    this.suitCountTexts = [];

    suits.forEach((s, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);

      let cx: number, cy: number;
      if (row === 0) {
        cx = 58 + col * 102;
        cy = 72;
      } else {
        cx = 110 + (idx - 3) * 100;
        cy = 124;
      }

      // Suit Count Badge (top right of each suit button)
      const countText = this.add.text(cx + 26, cy - 12, 'x0', {
        fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
        fontSize: '10px',
        color: '#2ecc71',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5, 0.5);
      this.whotModalContainer.add(countText);
      this.suitCountTexts.push(countText);

      const hitArea = this.add.zone(cx, cy, 78, 42).setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.whotModalSelectedIndex = idx;
        this.selectWhotSuit(s);
      });
      this.whotModalContainer.add(hitArea);
    });

    this.whotModalContainer.setVisible(false);
  }

  private openWhotSuitSelector(): void {
    this.currentTurn = 'WHOT_SELECT';
    this.whotModalSelectedIndex = 0;

    // Refresh player cards rendering so hand is clearly visible below modal
    this.renderPlayerHand();

    // Update hand suit count badges on selector options
    const suits: Suit[] = ['circle', 'triangle', 'cross', 'square', 'star'];
    suits.forEach((s, idx) => {
      const count = this.playerHand.filter((c) => c.suit === s).length;
      if (this.suitCountTexts[idx]) {
        this.suitCountTexts[idx].setText(`x${count}`);
        if (count > 0) {
          this.suitCountTexts[idx].setColor('#2ecc71');
        } else {
          this.suitCountTexts[idx].setColor('#64748b');
        }
      }
    });

    this.whotModalContainer.setVisible(true);
    this.whotModalContainer.setAlpha(0);
    this.tweens.add({
      targets: this.whotModalContainer,
      alpha: 1,
      duration: 150,
      ease: 'Linear'
    });
    this.updateWhotModalHighlight();
    this.updateSoftkeyLabels();
  }

  private updateWhotModalHighlight(): void {
    if (!this.whotModalHighlight) return;
    this.whotModalHighlight.clear();
    const idx = this.whotModalSelectedIndex;
    const col = idx % 3;
    const row = Math.floor(idx / 3);

    let cx: number, cy: number;
    if (row === 0) {
      cx = 58 + col * 102;
      cy = 72;
    } else {
      cx = 110 + (idx - 3) * 100;
      cy = 124;
    }
    
    this.whotModalHighlight.lineStyle(3, 0xffffff, 1);
    this.whotModalHighlight.strokeRoundedRect(cx - 39 - 2, cy - 21 - 2, 78 + 4, 42 + 4, 6);
  }

  public selectWhotSuit(suit: Suit): void {
    this.deck.currentRequestedSuit = suit;
    
    if (this.currentTurn === 'WHOT_SELECT') {
      this.tweens.add({
        targets: this.whotModalContainer,
        alpha: 0,
        duration: 150,
        ease: 'Linear',
        onComplete: () => this.whotModalContainer.setVisible(false)
      });
    }
    
    this.showToast(`I NEED... ${suit.toUpperCase()}!`, '#f1c40f');

    if (this.currentTurn === 'WHOT_SELECT') {
      this.finishPlayerTurn();
    } else {
      this.refreshBoard();
    }
  }

  private createValidCardsSelectorModal(): void {
    this.validCardsModalContainer = this.add.container(0, 0);
    this.validCardsModalContainer.setDepth(150);

    // Backdrop
    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.94);
    bg.fillRect(0, 0, 320, 240);
    bg.lineStyle(2, 0x2ecc71, 1);
    bg.strokeRect(8, 8, 304, 224);
    this.validCardsModalContainer.add(bg);

    // Title Bar
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x047857, 1);
    titleBg.fillRoundedRect(20, 14, 280, 28, 6);
    titleBg.lineStyle(1.5, 0xf1c40f, 1);
    titleBg.strokeRoundedRect(20, 14, 280, 28, 6);
    this.validCardsModalContainer.add(titleBg);

    const titleText = this.add.text(160, 28, 'PLAYABLE CARDS SELECTOR', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '12px',
      color: '#f1c40f',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);
    this.validCardsModalContainer.add(titleText);

    // Subtitle / Instruction
    const subtitleText = this.add.text(160, 50, 'Select a card or press number keys 1-9', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '8px',
      color: '#cbd5e1'
    }).setOrigin(0.5, 0.5);
    this.validCardsModalContainer.add(subtitleText);

    // Dynamic Items Container
    this.validCardsModalItemsContainer = this.add.container(0, 0);
    this.validCardsModalContainer.add(this.validCardsModalItemsContainer);

    // Highlight Graphics
    this.validCardsModalHighlight = this.add.graphics();
    this.validCardsModalContainer.add(this.validCardsModalHighlight);

    this.validCardsModalContainer.setVisible(false);
  }

  public openValidCardsSelectorModal(): void {
    if (this.currentTurn !== 'PLAYER' && this.currentTurn !== ('VALID_SELECT' as any)) return;

    this.validCardsList = this.playerHand
      .map((card, originalIndex) => ({ card, originalIndex }))
      .filter((item) => this.deck.isValidPlay(item.card));

    if (this.validCardsList.length === 0) {
      this.playSound('sfx_invalid_move');
      this.showToast('NO VALID CARDS! DRAW FROM MARKET', '#ef4444');
      return;
    }

    this.currentTurn = 'VALID_SELECT' as any;
    this.validCardsModalSelectedIndex = 0;
    this.renderValidCardsModalItems();

    this.validCardsModalContainer.setVisible(true);
    this.validCardsModalContainer.setAlpha(0);
    this.tweens.add({
      targets: this.validCardsModalContainer,
      alpha: 1,
      duration: 150,
      ease: 'Linear'
    });

    this.updateSoftkeyLabels();
  }

  private renderValidCardsModalItems(): void {
    this.validCardsModalItemsContainer.removeAll(true);

    const total = this.validCardsList.length;
    if (total === 0) return;

    const itemWidth = Math.min(56, 260 / Math.max(1, total));
    const startX = 160 - ((total - 1) * itemWidth) / 2;

    this.validCardsList.forEach((item, idx) => {
      const cx = startX + idx * itemWidth;
      const cy = 118;

      const isSelected = idx === this.validCardsModalSelectedIndex;
      const card = item.card;
      const cardKey = `card_${card.suit}_${card.number}`;

      const cardItemContainer = this.add.container(cx, cy);

      // Card Sprite
      const sprite = this.add.sprite(0, -2, cardKey).setScale(0.85);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => {
        this.validCardsModalSelectedIndex = idx;
        this.playSelectedValidCard();
      });
      cardItemContainer.add(sprite);

      // Number Badge
      const numBadgeBg = this.add.graphics();
      numBadgeBg.fillStyle(isSelected ? 0xf1c40f : 0x1e293b, 1);
      numBadgeBg.fillCircle(0, -42, 10);
      numBadgeBg.lineStyle(1.5, 0x2ecc71, 1);
      numBadgeBg.strokeCircle(0, -42, 10);
      cardItemContainer.add(numBadgeBg);

      const numText = this.add.text(0, -42, `${idx + 1}`, {
        fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
        fontSize: '10px',
        color: isSelected ? '#000000' : '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5, 0.5);
      cardItemContainer.add(numText);

      // Card Suit Label
      const suitName = card.suit === 'whot' ? 'WHOT 20' : `${card.suit.toUpperCase()} ${card.number}`;
      const nameLabel = this.add.text(0, 38, suitName, {
        fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
        fontSize: '8px',
        color: isSelected ? '#f1c40f' : '#cbd5e1',
        fontStyle: 'bold'
      }).setOrigin(0.5, 0.5);
      cardItemContainer.add(nameLabel);

      this.validCardsModalItemsContainer.add(cardItemContainer);
    });

    this.updateValidCardsModalHighlight();
  }

  private updateValidCardsModalHighlight(): void {
    if (!this.validCardsModalHighlight) return;
    this.validCardsModalHighlight.clear();
    const total = this.validCardsList.length;
    if (total === 0) return;

    const itemWidth = Math.min(56, 260 / Math.max(1, total));
    const startX = 160 - ((total - 1) * itemWidth) / 2;
    const cx = startX + this.validCardsModalSelectedIndex * itemWidth;
    const cy = 118;

    // Glowing Box around selected card
    this.validCardsModalHighlight.lineStyle(3, 0xf1c40f, 1);
    this.validCardsModalHighlight.strokeRoundedRect(cx - 26, cy - 54, 52, 102, 6);

    // Play Button Bar at bottom of modal
    this.validCardsModalHighlight.fillStyle(0x16a34a, 1);
    this.validCardsModalHighlight.fillRoundedRect(70, 185, 180, 24, 6);
    this.validCardsModalHighlight.lineStyle(1.5, 0xf1c40f, 1);
    this.validCardsModalHighlight.strokeRoundedRect(70, 185, 180, 24, 6);

    const playText = this.add.text(160, 197, '★ PRESS OK TO PLAY ★', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '9px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);
    this.validCardsModalItemsContainer.add(playText);

    const playHit = this.add.zone(160, 197, 180, 24).setInteractive({ useHandCursor: true });
    playHit.on('pointerdown', () => this.playSelectedValidCard());
    this.validCardsModalItemsContainer.add(playHit);
  }

  public playSelectedValidCard(): void {
    if (this.validCardsList.length === 0) return;
    const selectedItem = this.validCardsList[this.validCardsModalSelectedIndex];
    if (!selectedItem) return;

    this.validCardsModalContainer.setVisible(false);
    this.currentTurn = 'PLAYER';

    this.attemptPlayPlayerCard(selectedItem.originalIndex);
  }

  public selectValidCardByNumber(num: number): void {
    if (num < 1 || num > this.validCardsList.length) return;
    this.validCardsModalSelectedIndex = num - 1;
    this.playSound('sfx_btn_click');
    this.playSelectedValidCard();
  }

  public closeValidCardsModal(): void {
    if (this.currentTurn === ('VALID_SELECT' as any)) {
      this.tweens.add({
        targets: this.validCardsModalContainer,
        alpha: 0,
        duration: 120,
        ease: 'Linear',
        onComplete: () => {
          if (this.validCardsModalContainer) this.validCardsModalContainer.setVisible(false);
          this.currentTurn = 'PLAYER';
          this.renderPlayerHand();
          this.updateSoftkeyLabels();
        }
      });
    }
  }

  private showToast(msg: string, color: string = '#ffffff'): void {
    if (this.turnBannerText) {
      this.turnBannerText.setText(msg).setColor(color).setAlpha(1);
      this.tweens.add({
        targets: this.turnBannerText,
        alpha: 0,
        duration: 1600,
        delay: 800,
        ease: 'Power2'
      });
    }
  }

  private checkEndGameCondition(reason: string): void {
    if (reason === 'EMPTY_MARKET' && this.deck.marketPile.length === 0) {
      const pScore = WhotDeck.calculateHandScore(this.playerHand);
      const cScore = WhotDeck.calculateHandScore(this.cpuHand);

      if (pScore < cScore) {
        this.playSound('sfx_win');
        this.triggerGameOver('PLAYER', `Lowest Score! You: ${pScore} vs CPU: ${cScore}`);
      } else if (cScore < pScore) {
        this.playSound('sfx_lose');
        this.triggerGameOver('CPU', `Lowest Score! CPU: ${cScore} vs You: ${pScore}`);
      } else {
        this.triggerGameOver('TIE', `Draw Match! Points: ${pScore}`);
      }
    }
  }

  private createGameOverContainer(): void {
    this.gameoverContainer = this.add.container(160, 120).setDepth(200);

    const bg = this.add.graphics();
    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(-160, -120, 320, 240);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(-156, -116, 312, 232);
    bg.fillStyle(0x0f172a, 0.95);
    bg.fillRoundedRect(-130, -90, 260, 180, 10);
    bg.lineStyle(3, 0xf1c40f, 1);
    bg.strokeRoundedRect(-130, -90, 260, 180, 10);
    this.gameoverContainer.add(bg);

    const titleText = this.add.text(0, -55, 'GAME OVER', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '20px',
      color: '#f1c40f',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.gameoverContainer.add(titleText);

    const descText = this.add.text(0, -10, '', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 220 }
    }).setOrigin(0.5);
    descText.setName('descText');
    this.gameoverContainer.add(descText);

    const replayBtn = this.add.text(0, 45, '[ PRESS OK TO PLAY AGAIN ]', {
      fontFamily: "'Luckiest Guy', 'Baloo Chettan', sans-serif",
      fontSize: '12px',
      color: '#38bdf8',
      fontStyle: 'bold',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    replayBtn.on('pointerdown', () => {
      this.gameoverContainer.setVisible(false);
      this.startNewGame();
    });
    this.gameoverContainer.add(replayBtn);

    this.gameoverContainer.setVisible(false);
  }

  private triggerGameOver(winner: 'PLAYER' | 'CPU' | 'TIE', details?: string): void {
    this.currentTurn = 'GAMEOVER';
    this.hasGameStarted = false;
    const pScore = WhotDeck.calculateHandScore(this.playerHand);
    const cScore = WhotDeck.calculateHandScore(this.cpuHand);

    let title = 'YOU WIN!';
    let color = '#2ecc71';

    if (winner === 'CPU') {
      title = 'CPU WINS!';
      color = '#ef4444';
    } else if (winner === 'TIE') {
      title = 'IT IS A TIE!';
      color = '#f1c40f';
    }

    const desc = details || (winner === 'PLAYER'
      ? `CPU Remaining Score: ${cScore}`
      : `Your Remaining Score: ${pScore}`);

    const descText = this.gameoverContainer.getByName('descText') as Phaser.GameObjects.Text;
    if (descText) descText.setText(desc);

    const titleObj = this.gameoverContainer.list[1] as Phaser.GameObjects.Text;
    if (titleObj) titleObj.setText(title).setColor(color);

    this.gameoverContainer.setVisible(true);
    this.updateSoftkeyLabels();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    const isKaiOS = typeof navigator !== 'undefined' && /KaiOS|KAIOS/i.test(navigator.userAgent);

    if (isKaiOS) {
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        this.handleInputDown(); // Physical Left rotates to Screen Down (90 deg CCW)
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        this.handleInputUp();   // Physical Right rotates to Screen Up (90 deg CCW)
      } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        this.handleInputLeft(); // Physical Up rotates to Screen Left (90 deg CCW)
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        this.handleInputRight(); // Physical Down rotates to Screen Right (90 deg CCW)
      }
    } else {
      // Standard mapping for desktop browser simulator
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        this.handleInputLeft();
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        this.handleInputRight();
      } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        this.handleInputUp();
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        this.handleInputDown();
      }
    }

    if (key === 'Enter' || key === ' ' || key === 'q' || key === 'Q') {
      this.handleInputOk();
    } else if (key === 'm' || key === 'M' || key === 'e' || key === 'E') {
      this.handleMarketDrawAttempt();
    } else if (['1', '2', '3', '4', '5'].includes(key) && this.currentTurn === 'WHOT_SELECT') {
      const idx = parseInt(key, 10) - 1;
      const suits: Suit[] = ['circle', 'triangle', 'cross', 'square', 'star'];
      this.selectWhotSuit(suits[idx]);
    } else if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key) && this.currentTurn === ('VALID_SELECT' as any)) {
      const val = parseInt(key, 10);
      this.selectValidCardByNumber(val);
    }
  }
}
