import { Rank, Suit } from "../../shared/types";
import type { ICard } from "../../shared/types";

/**
 * Server card ID format: "S7_0" (Suit + Rank + _deckIndex)
 * Client sprite frame: "7_spades" (rank_suit)
 *
 * Bu fonksiyon server ICard → sprite frame name donusumu yapar.
 */

const SUIT_TO_SPRITE: Record<string, string> = {
  [Suit.SPADES]: "spades",
  [Suit.HEARTS]: "hearts",
  [Suit.DIAMONDS]: "diamonds",
  [Suit.CLUBS]: "clubs",
  [Suit.NONE]: "none",
};

const RANK_TO_SPRITE: Record<string, string> = {
  [Rank.ACE]: "A",
  [Rank.TWO]: "2",
  [Rank.THREE]: "3",
  [Rank.FOUR]: "4",
  [Rank.FIVE]: "5",
  [Rank.SIX]: "6",
  [Rank.SEVEN]: "7",
  [Rank.EIGHT]: "8",
  [Rank.NINE]: "9",
  [Rank.TEN]: "10",
  [Rank.JACK]: "J",
  [Rank.QUEEN]: "Q",
  [Rank.KING]: "K",
  [Rank.JOKER]: "joker",
};

/**
 * ICard → sprite frame name (AssetPack .png uzantili)
 * Ornek: { suit: 'S', rank: '7' } → "7_spades.png"
 * Joker: { suit: 'X', rank: 'JOKER' } → "joker.png"
 */
export function cardToFrame(card: ICard): string {
  if (card.rank === Rank.JOKER) {
    return "joker.png";
  }
  const rank = RANK_TO_SPRITE[card.rank] ?? card.rank;
  const suit = SUIT_TO_SPRITE[card.suit] ?? card.suit;
  return `${rank}_${suit}.png`;
}

/** Card back sprite frame name */
export const CARD_BACK_FRAME = "card_back_blue.png";

/**
 * Card ID → ICard
 * "S7_0" → { suit: 'S', rank: '7', id: 'S7_0' }
 * "JOKER_0" → { suit: 'X', rank: 'JOKER', id: 'JOKER_0' }
 */
export function parseCardId(cardId: string): ICard {
  if (cardId.startsWith("JOKER")) {
    return { suit: Suit.NONE, rank: Rank.JOKER, id: cardId };
  }
  const suit = cardId[0] as Suit;
  const rank = cardId.substring(1).split("_")[0] as Rank;
  return { suit, rank, id: cardId };
}
