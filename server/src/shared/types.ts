export enum Suit {
  SPADES = 'S',
  HEARTS = 'H',
  DIAMONDS = 'D',
  CLUBS = 'C',
  NONE = 'X',
}

export enum Rank {
  ACE = 'A',
  TWO = '2',
  THREE = '3',
  FOUR = '4',
  FIVE = '5',
  SIX = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE = '9',
  TEN = '10',
  JACK = 'J',
  QUEEN = 'Q',
  KING = 'K',
  JOKER = 'JOKER',
}

export enum GamePhase {
  WAITING = 'WAITING',
  DEALING = 'DEALING',
  PLAYER_TURN = 'PLAYER_TURN',
  BLUFF_PHASE = 'BLUFF_PHASE',
  ROUND_END = 'ROUND_END',
  GAME_OVER = 'GAME_OVER',
}

export enum BluffDecision {
  CALL = 'CALL',
  PASS = 'PASS',
}

export interface DeckConfig {
  deckCount: number;
  includeJokers: boolean;
  jokersPerDeck: number;
}

export const DEFAULT_DECK_CONFIG: DeckConfig = {
  deckCount: 1,
  includeJokers: false,
  jokersPerDeck: 0,
};

export const DOUBLE_DECK_CONFIG: DeckConfig = {
  deckCount: 2,
  includeJokers: true,
  jokersPerDeck: 2,
};

export interface GameConfig {
  deckType: 'single' | 'double';
  bluffEnabled: boolean;
}

export interface ICard {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface IPlayer {
  id: string;
  nickname: string;
  handCount: number;
  score: number;
}

export interface ITableState {
  topCard: ICard | null;
  pileCount: number;
}

export interface IRoomState {
  roomId: string;
  phase: GamePhase;
  players: IPlayer[];
  currentTurn: string;
  table: ITableState;
  deckRemaining: number;
  deckConfig: DeckConfig;
  bluffEnabled: boolean;
  bluffPlayerId?: string;
}

export const EVENTS_C2S = {
  JOIN_ROOM: 'joinRoom',
  PLAY_CARD: 'playCard',
  BLUFF_DECISION: 'bluffDecision',
} as const;

export const EVENTS_S2C = {
  ROOM_STATE: 'roomState',
  YOUR_HAND: 'yourHand',
  BLUFF_REQUEST: 'bluffRequest',
  BLUFF_RESOLVED: 'bluffResolved',
  CARD_PLAYED: 'cardPlayed',
  SCORE_UPDATE: 'scoreUpdate',
  GAME_OVER: 'gameOver',
  ERROR: 'error',
} as const;
