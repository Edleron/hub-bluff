import { ICard, DeckConfig, Suit, Rank } from '../shared';
import { isRealPisti, isWildCard } from './rules';

/**
 * Alinan kartlarin deger puanini hesaplar.
 * C2: +2, D10: +2
 * A/Q/K bireysel puan VERMEZ (flush combo ile verilir)
 */
export function calcCardValues(cards: ICard[]): number {
  let score = 0;
  for (const card of cards) {
    if (card.suit === Suit.CLUBS && card.rank === Rank.TWO) score += 2;
    else if (card.suit === Suit.DIAMONDS && card.rank === Rank.TEN) score += 3;
  }
  return score;
}

/**
 * A+K+Q flush kontrolu.
 * Elde 4 kart var, 3'u A+K+Q ise → +30
 */
export function checkFlushBonus(hand: ICard[]): { bonus: number; cards: ICard[] } {
  const a = hand.find((c) => c.rank === Rank.ACE);
  const k = hand.find((c) => c.rank === Rank.KING);
  const q = hand.find((c) => c.rank === Rank.QUEEN);
  if (a && k && q) {
    return { bonus: 30, cards: [a, k, q] };
  }
  return { bonus: 0, cards: [] };
}

/**
 * Four of a Kind kontrolu.
 * Elde 4 kart var, 4'u de ayni rank ise → +50
 */
export function checkFourOfAKindBonus(hand: ICard[]): { bonus: number; cards: ICard[] } {
  if (hand.length !== 4) return { bonus: 0, cards: [] };
  const rank = hand[0].rank;
  if (hand.every((c) => c.rank === rank)) {
    return { bonus: 50, cards: [...hand] };
  }
  return { bonus: 0, cards: [] };
}

/**
 * Pisti bonusu hesaplar.
 * Normal pisti (rank match): +10
 * Wildcard vs Wildcard (J/Joker ustune J/Joker): +50 (jackpot)
 * Wildcard vs normal kart: 0 (sadece eli alir, bonus yok)
 */
export function calcPistiBonus(
  playedCard: ICard,
  groundCard: ICard,
  config: DeckConfig,
): number {
  const playedIsWild = isWildCard(playedCard, config);
  const groundIsWild = isWildCard(groundCard, config);

  if (playedIsWild && groundIsWild) return 50;
  if (!playedIsWild) return 10;
  return 0;
}

/**
 * Alinan kartlarin label listesini olusturur (UI icin).
 */
export function buildCardValueLabels(cards: ICard[]): string[] {
  const labels: string[] = [];
  for (const card of cards) {
    if (card.suit === Suit.CLUBS && card.rank === Rank.TWO) labels.push('C2 +2');
    else if (card.suit === Suit.DIAMONDS && card.rank === Rank.TEN) labels.push('D10 +3');
  }
  return labels;
}

/**
 * Blof puanlama.
 *
 * Wildcard senaryolari:
 * - Wildcard ile normal karta blof + AC = 0 (wildcard avantaji yok)
 * - Wildcard ustune wildcard blof + GEC = +30 (agir ceza)
 * - Wildcard ustune wildcard blof + AC + gercek = +100 (imkansiz senaryo odulu)
 * - Normal eslesen kart blof + AC + gercek = +20 (standart)
 * - Sahte blof yakalandi = caller +10
 * - Standart GEC = +10
 */
export function calcBluffScore(
  playedCard: ICard,
  groundCard: ICard,
  decision: 'CALL' | 'PASS',
  config: DeckConfig,
): { blufferDelta: number; callerDelta: number } {
  const playedIsWild = isWildCard(playedCard, config);
  const groundIsWild = isWildCard(groundCard, config);

  if (decision === 'PASS') {
    if (playedIsWild && groundIsWild) return { blufferDelta: 30, callerDelta: 0 };
    return { blufferDelta: 10, callerDelta: 0 };
  }

  // CALL
  const isReal = isRealPisti(playedCard, groundCard, config);
  if (isReal) {
    if (playedIsWild && groundIsWild) return { blufferDelta: 100, callerDelta: 0 };
    if (playedIsWild && !groundIsWild) return { blufferDelta: 0, callerDelta: 0 };
    return { blufferDelta: 20, callerDelta: 0 };
  }

  return { blufferDelta: 0, callerDelta: 10 };
}
