# Bluff - Master Rehber

## Yapi

```
hub-bluff/
├── server/              → NestJS (HTTP + WebSocket tek projede)
│   ├── src/
│   │   ├── auth/        → Token-based login (2 sabit token)
│   │   ├── room/        → Tek sabit oda (DEFAULT_ROOM_ID)
│   │   ├── game/        → Socket Gateway + GameService (oyun state yonetimi)
│   │   ├── engine/      → Oyun motoru (deck, rules, scoring) — pure TS
│   │   └── shared/      → Ortak tipler (ICard, IRoomState, EVENTS, DeckConfig)
│   └── test/            → Jest unit testler (engine icin)
├── client/              → PixiJS + Vite
│   ├── src/
│   │   ├── app/         → Screens (LobbyScreen, GameScreen, GameOverScreen, LoadScreen)
│   │   │   └── ui/      → Button, Label, RoundedBox
│   │   ├── engine/      → Navigation, resize, audio, state plugins
│   │   ├── game/        → Session, services (ApiService, SocketService), components (CardSprite), utils
│   │   └── shared/      → server/src/shared'dan kopyalanan tipler
│   └── public/          → Asset'ler (kart gorselleri)
├── docs/                → Dokumantasyon (guncel MVP)
├── docs/v2/             → Eski 4-proje plani (Step 3 referansi)
└── package.json         → Root (pnpm workspace)
```

## Veri Akisi

```
[Browser]
  │  HTTP → /auth/login → Token dogrulama + playerId
  │  WS → ws://server/game (token ile)
  │  JOIN_ROOM → Otomatik default odaya katilim
  │
[NestJS Server]
  │  RAM'de oda + oyun state'i
  │  Her hamle → state guncelle → broadcast
  │  Blof → BLUFF_PHASE → 30s timeout → auto-PASS
```

## Tech Stack

- Backend: NestJS 11, TypeScript
- Frontend: PixiJS 8, Vite, TypeScript
- Realtime: Socket.io (namespace: /game)
- Database: Yok (RAM-only, MVP icin yeterli)
- Auth: Token-based (2 sabit token, game.config.ts)
- Package manager: pnpm (workspace)
- Animasyon: GSAP (sadece gsap.to — Timeline kullanma)
- Kart Flip: PerspectiveMesh + GSAP ile 3D cevirme

## Port Haritasi

- server: 3001 (HTTP + WebSocket)
- client: 5173 (Vite dev server)

## Ortak Tipler (shared/)

```typescript
export enum Suit { SPADES='S', HEARTS='H', DIAMONDS='D', CLUBS='C', NONE='X' }
export enum Rank {
  ACE='A', TWO='2', THREE='3', FOUR='4', FIVE='5',
  SIX='6', SEVEN='7', EIGHT='8', NINE='9', TEN='10',
  JACK='J', QUEEN='Q', KING='K', JOKER='JOKER'
}
export enum GamePhase {
  WAITING = 'WAITING',
  DEALING = 'DEALING',
  PLAYER_TURN = 'PLAYER_TURN',
  BLUFF_PHASE = 'BLUFF_PHASE',
  ROUND_END = 'ROUND_END',
  GAME_OVER = 'GAME_OVER',
}
export enum BluffDecision { CALL = 'CALL', PASS = 'PASS' }

export interface DeckConfig {
  deckCount: number;
  includeJokers: boolean;
  jokersPerDeck: number;
}
export const DEFAULT_DECK_CONFIG: DeckConfig = {
  deckCount: 1, includeJokers: false, jokersPerDeck: 0
};
export const DOUBLE_DECK_CONFIG: DeckConfig = {
  deckCount: 2, includeJokers: true, jokersPerDeck: 1
};

export interface ICard { suit: Suit; rank: Rank; id: string }
export interface IPlayer { id: string; nickname: string; handCount: number; score: number }
export interface ITableState { topCard: ICard | null; pileCount: number }
export interface IRoomState {
  roomId: string;
  phase: GamePhase;
  players: IPlayer[];
  currentTurn: string;
  table: ITableState;
  deckRemaining: number;
  deckConfig: DeckConfig;
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
```

## Guvenlik

- Rakibin `hand` array'i client'a gonderilmez, sadece `handCount`
- Ana deste (deck) client'a gonderilmez, sadece `deckRemaining`
- State masking: her oyuncuya sadece kendi elini goster
- Blof sirasinda: `CARD_PLAYED` event'inde `cardId: 'HIDDEN'` gonderilir
- Blof sirasinda: `topCard` olarak `bluffGroundCard` gosterilir (blof karti degil)

## Eslestirme Kurali (DeckConfig'e Bagli)

| Deste | Eslestirme | Ornek |
|-------|-----------|-------|
| Tek deste (52, jokersiz) | Sadece ayni rank | S7 = H7 ✓ |
| Cift deste (108, jokerli) | Sadece ayni rank | S7 = H7 ✓ (rank-only, suit farketmez) |

## DeckConfig Yonetimi (TEK NOKTADAN DEGISTIR)

Deste yapisi tek bir config dosyasindan kontrol edilir:

```typescript
// shared/game.config.ts — TEK KAYNAK
export const ACTIVE_DECK_CONFIG: DeckConfig = DEFAULT_DECK_CONFIG;
// export const ACTIVE_DECK_CONFIG: DeckConfig = DOUBLE_DECK_CONFIG;
```

Deste degistirmek icin: `game.config.ts` icinde tek satir degistir → build et → bitti.

## Blof Mekanigi — Detay

Blof **sadece pisti durumunda** (masada tam 1 kart varken) yapilabilir.

### Akis:
1. Oyuncu kart secer → "Kapali Oyna" butonu gorunur (pile === 1 ise)
2. `playCard(isHidden=true)` → server `canBluff()` kontrolu → BLUFF_PHASE
3. Rakibe `bluffRequest` eventi gider → "Ac!" / "Gec" paneli acilir (30s geri sayim)
4. Timeout (30s) → otomatik PASS

### Puanlama:
| Durum | Kazanan | Puan | Pile |
|-------|---------|------|------|
| Gec | blof yapan | +10 | Blofcu alir |
| Gec (wildcard ustune wildcard) | blof yapan | +30 | Blofcu alir |
| Ac! + gercek (rank eslesmesi) | blof yapan | +20 | Blofcu alir |
| Ac! + gercek (wildcard ile normal kart) | blof yapan | 0 | Blofcu alir |
| Ac! + gercek (wildcard ustune wildcard) | blof yapan | +100 | Blofcu alir |
| Ac! + sahte pisti | rakip | +10 | Caller alir |

> Sira her zaman diger oyuncuya gecer. Blof sonucu sirayi etkilemez.

### Degisiklik Noktasi:
Her elde blof istenirse su dosyalar guncellenir:
- `server/src/engine/rules.ts` → `canBluff()`: `pileCount === 1` → `pileCount >= 1`
- `client/src/app/screens/GameScreen.ts` → `renderState()` + `updateHiddenPlayButton()`: ayni degisiklik

## Gelistirme Adimlari

| Step | Kapsam | Durum |
|------|--------|-------|
| Step 1 (MVP) | 1v1 oyun + blof mekanigi | Tamamlandi |
| Step 2 (Polish) | Puanlama, runtime config, VFX, deployment | Aktif |
| Step 3 (Scale) | 4 kisilik mod, PostgreSQL, ekonomi | Planli |
