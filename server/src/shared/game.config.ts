import { DEFAULT_DECK_CONFIG, DeckConfig } from './types';

// Versiyon — client'a da gonderilir (login response)
export const GAME_VERSION = '0.0.1';

// ═══════════════════════════════════════════════════════
//  DESTE YAPISINI DEGISTIRMEK ICIN SADECE BU SATIRI
//  DEGISTIR:
//
//  DEFAULT_DECK_CONFIG → 52 kart, jokersiz, rank eslestirme
//  DOUBLE_DECK_CONFIG  → 104+2 kart, jokerli, rank+suit eslestirme
// ═══════════════════════════════════════════════════════
export const ACTIVE_DECK_CONFIG: DeckConfig = DEFAULT_DECK_CONFIG;
// export { DOUBLE_DECK_CONFIG as ACTIVE_DECK_CONFIG } from './types';

// ═══════════════════════════════════════════════════════
//  OYUNCU TOKENLARI — sadece bu iki token ile giris yapilabilir
//  Format: xxxx-xxxx-xxxx
// ═══════════════════════════════════════════════════════
export const PLAYER_TOKENS = [
  { token: 'edleron', id: 'player-1', nickname: 'edleron', isHost: true },
  { token: 'wilkagul', id: 'player-2', nickname: 'wilkagul', isHost: false },
] as const;

// Sabit oda — oda kurma/katilma sureci yok, herkes buraya duser
export const DEFAULT_ROOM_ID = 'default-room';
