import { ICard, Rank, DeckConfig } from '../shared';

export function isMatch(played: ICard, top: ICard, _config: DeckConfig): boolean {
  return played.rank === top.rank;
}

export function isWildCard(card: ICard, config: DeckConfig): boolean {
  if (card.rank === Rank.JACK) return true;
  if (config.includeJokers && card.rank === Rank.JOKER) return true;
  return false;
}

export function canTakePile(played: ICard, top: ICard, config: DeckConfig): boolean {
  return isMatch(played, top, config) || isWildCard(played, config);
}

// BLUFF RULE: Sadece pişti durumunda (pile === 1) blöf yapılabilir.
// Tüm ellerde blöf istenirse → pileCount >= 1 yap (client tarafı da güncellenmeli).
export function canBluff(pileCount: number, topCard: ICard | null): boolean {
  return pileCount === 1 && topCard !== null;
}

export function isRealPisti(playedCard: ICard, groundCard: ICard, config: DeckConfig): boolean {
  return isMatch(playedCard, groundCard, config) || isWildCard(playedCard, config);
}
