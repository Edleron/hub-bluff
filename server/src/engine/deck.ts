import { ICard, Suit, Rank, DeckConfig, DEFAULT_DECK_CONFIG } from '../shared';

const SUITS = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
const RANKS = [
  Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE,
  Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN,
  Rank.JACK, Rank.QUEEN, Rank.KING,
];

export function createDeck(config: DeckConfig = DEFAULT_DECK_CONFIG): ICard[] {
  const cards: ICard[] = [];

  for (let d = 0; d < config.deckCount; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ suit, rank, id: `${suit}${rank}_${d}` });
      }
    }
    if (config.includeJokers) {
      for (let j = 0; j < config.jokersPerDeck; j++) {
        const jokerIndex = d * config.jokersPerDeck + j;
        cards.push({ suit: Suit.NONE, rank: Rank.JOKER, id: `JOKER_${jokerIndex}` });
      }
    }
  }

  return cards;
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealHands(deck: ICard[], playerCount: number, handSize = 4): ICard[][] {
  const hands: ICard[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < handSize * playerCount; i++) {
    const card = deck.pop();
    if (!card) break;
    hands[i % playerCount].push(card);
  }
  return hands;
}

export function calcTotalCards(config: DeckConfig): number {
  return config.deckCount * 52 + (config.includeJokers ? config.deckCount * config.jokersPerDeck : 0);
}
