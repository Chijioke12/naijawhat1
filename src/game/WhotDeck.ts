export type Suit = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';

export interface Card {
  id: string;
  suit: Suit;
  number: number;
}

export interface GameSettings {
  sfx: boolean;
  aiBanter: boolean;
  whotCard: boolean;
  pick3: boolean;
  suspend: boolean;
  emptyMarketEnds: boolean;
}

export class WhotDeck {
  private static DECK_CONFIG: { suit: Suit; numbers: number[] }[] = [
    { suit: 'circle', numbers: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14] },
    { suit: 'triangle', numbers: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14] },
    { suit: 'cross', numbers: [1, 2, 3, 5, 7, 10, 11, 13, 14] },
    { suit: 'square', numbers: [1, 2, 3, 5, 7, 10, 11, 13, 14] },
    { suit: 'star', numbers: [1, 2, 3, 4, 5, 7, 8] },
    { suit: 'whot', numbers: [20, 20, 20, 20, 20] }
  ];

  public marketPile: Card[] = [];
  public playedPile: Card[] = [];
  public currentRequestedSuit: Suit | null = null;
  public pendingPickCount: number = 0; // Cumulative pick 2 / pick 3 counter
  public settings: GameSettings;

  constructor(settings?: Partial<GameSettings>) {
    this.settings = {
      sfx: true,
      aiBanter: true,
      whotCard: true,
      pick3: true,
      suspend: true,
      emptyMarketEnds: false,
      ...settings
    };
    this.resetAndShuffle();
  }

  public resetAndShuffle(): void {
    const cards: Card[] = [];
    let idCounter = 1;

    for (const group of WhotDeck.DECK_CONFIG) {
      if (group.suit === 'whot' && !this.settings.whotCard) {
        continue;
      }
      for (const num of group.numbers) {
        cards.push({
          id: `card_${group.suit}_${num}_${idCounter++}`,
          suit: group.suit,
          number: num
        });
      }
    }

    // Fisher-Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    this.marketPile = cards;
    this.playedPile = [];
    this.currentRequestedSuit = null;
    this.pendingPickCount = 0;
  }

  // Draw 1 card from market pile (reshuffling played pile if market is empty)
  public drawCard(): Card | null {
    if (this.marketPile.length === 0) {
      if (this.settings.emptyMarketEnds) {
        return null;
      }
      this.refillMarketFromPlayed();
    }
    if (this.marketPile.length === 0) {
      return null; // Market completely empty
    }
    return this.marketPile.pop() || null;
  }

  private refillMarketFromPlayed(): void {
    if (this.playedPile.length <= 1) return;

    // Keep top played card
    const topCard = this.playedPile.pop()!;
    const remainingPlayed = [...this.playedPile];
    this.playedPile = [topCard];

    // Shuffle remaining played into market
    for (let i = remainingPlayed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingPlayed[i], remainingPlayed[j]] = [remainingPlayed[j], remainingPlayed[i]];
    }

    this.marketPile = remainingPlayed;
  }

  public getTopPlayedCard(): Card | null {
    return this.playedPile.length > 0 ? this.playedPile[this.playedPile.length - 1] : null;
  }

  // Check if a card is valid to play against the top card
  public isValidPlay(card: Card): boolean {
    const topCard = this.getTopPlayedCard();
    if (!topCard) return true; // First play of game

    // WHOT 20 is always playable as a wildcard
    if (card.suit === 'whot') {
      return true;
    }

    // Pending pick penalty defense check
    if (this.pendingPickCount > 0) {
      if (topCard.number === 2 && card.number === 2) return true;
      if (topCard.number === 5 && card.number === 5) return true;
      return false; // Must draw if unable to defend
    }

    // If WHOT suit call is active
    if (this.currentRequestedSuit) {
      return card.suit === this.currentRequestedSuit;
    }

    // Standard matching rule: Same suit OR Same number
    return card.suit === topCard.suit || card.number === topCard.number;
  }

  // Calculate hand score (Star cards count double value, Whot counts 20)
  public static calculateHandScore(hand: Card[]): number {
    return hand.reduce((total, c) => {
      if (c.suit === 'whot') return total + 20;
      if (c.suit === 'star') return total + (c.number * 2);
      return total + c.number;
    }, 0);
  }
}
