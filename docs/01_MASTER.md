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
├── client/              → PixiJS + Vite
│   ├── src/
│   │   ├── app/         → Screens (LobbyScreen, GameScreen, GameOverScreen, LoadScreen)
│   │   │   ├── ui/      → Button, Label, RoundedBox, ScorePanel, VolumeSlider
│   │   │   └── popups/  → PausePopup, SettingsPopup
│   │   ├── engine/      → Navigation, resize, audio, state (XState appMachine) plugins
│   │   ├── game/        → Session, services (ApiService, SocketService), components (CardSprite), utils
│   │   └── shared/      → server/src/shared'dan kopyalanan tipler
│   └── public/          → Asset'ler (spritesheet: cards.png/webp + JSON atlas)
├── docs/                → Dokumantasyon
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

## Versiyon Yonetimi

Versiyon **2 noktadan** yonetilir:

| Dosya | Degisken | Aciklama |
|-------|----------|----------|
| `package.json` (root) | `version` | Client bunu okur (`vite.config.ts` → `APP_VERSION`) |
| `server/src/shared/game.config.ts` | `GAME_VERSION` | Server bunu client'a gonderir (login response) |

> Versiyon degistirmek = bu 2 dosyayi guncelle. Diger dosyalar (Dockerfile dummy, lock file) otomatik guncellenir.

## CI/CD — Deploy

Commit mesajinda `[deploy]` keyword'u varsa GitHub Actions uzerinden Render (server) ve Cloudflare Pages (client) otomatik deploy edilir. Keyword yoksa deploy tetiklenmez.

```bash
# Normal commit — deploy OLMAZ
git commit -m "fix: button rengi duzeltildi"

# Deploy commit — Render + Cloudflare guncellenir
git commit -m "feat: yeni ozellik eklendi [deploy]"
```

> Detaylar: `docs/DEPLOYMENT.md` (Adim 2.6 ve 3.6)

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
  deckCount: 2, includeJokers: true, jokersPerDeck: 2
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

## DeckConfig Yonetimi

Deste secimi **runtime'da** yapilir. Host oyuncu lobby'de Tek/Cift deste + Blof Acik/Kapali secer.

```typescript
// shared/types.ts → GameConfig
interface GameConfig {
  deckType: 'single' | 'double';
  bluffEnabled: boolean;
}
```

Host `JOIN_ROOM` event'inde config gonderir → `GameService.startGame()` bunu kullanir.
`game.config.ts` icindeki `ACTIVE_DECK_CONFIG` fallback olarak kalir.

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
| Step 1 (MVP) | 1v1 oyun + blof + puanlama + runtime config + deployment | Tamamlandi |
| Step 2 (Polish) | Stabilizasyon, test, UI iyilestirme, production-hardening | Planli |
| Step 3 (Scale) | 4 kisilik mod, PostgreSQL, ekonomi | Planli |
