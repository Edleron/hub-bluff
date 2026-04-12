# Bluff - Server Rehberi (NestJS)

Tek NestJS projesi: hem HTTP hem WebSocket.

## Moduller

### auth/
- `POST /auth/login` → Body: `{ token }` → Response: `{ playerId, nickname, isHost }`
- Token-based: 2 sabit token (`game.config.ts` → `PLAYER_TOKENS`)
- Oyuncu bilgisi RAM'de Map<token, Player>

### room/
- Tek sabit oda: `DEFAULT_ROOM_ID = 'default-room'` (`game.config.ts`)
- Oda kur/katil UI kaldrildi — login = otomatik odaya katilim
- Game over veya 30sn disconnect timeout → `resetDefaultRoom()` → oda yeniden kullanima hazir
- Oda bilgisi RAM'de Map<roomId, Room>

### game/ (WebSocket Gateway)
- Namespace: `/game`
- `joinRoom` → Token dogrula, odaya bagla, 2 kisi gelince oyunu baslat
- `playCard` → `{ cardId, isHidden }` — isHidden=true ise blof kontrolu yapilir
- `bluffDecision` → `{ decision: 'CALL' | 'PASS' }`
- Broadcast: roomState, yourHand, bluffRequest, cardPlayed, gameOver, error

### game/game.gateway.ts — Blof Akisi
1. `handlePlayCard`: isHidden kart oynanirsa ve `canBluff()` true ise → BLUFF_PHASE
2. `CARD_PLAYED` event'inde `cardId: 'HIDDEN'` gonderilir (gercek kart maskelenir)
3. `startBluffTimer()`: 30 saniye sonra otomatik PASS
4. `handleBluffDecision`: rakip Ac!/Gec der → `resolveBluff()` → puanlama

### game/game.service.ts — State Maskeleme
- `maskStateForPlayer()`: BLUFF_PHASE sirasinda `topCard = bluffGroundCard` (blof karti gizli)
- Rakibin `hand` array'i asla gonderilmez → sadece `handCount`
- `bluffPlayerId` field'i state'te gonderilir (client'in kimin blof yaptigini bilmesi icin)

### engine/ (Pure TypeScript - framework bagimsiz)
- `deck.ts` → createDeck(config), shuffle (Fisher-Yates), dealHands
- `rules.ts` → isMatch, isWildCard, canTakePile, canBluff, isRealPisti
- `scoring.ts` → calcBluffScore

### shared/
- `types.ts` → ICard, IRoomState, EVENTS, enums, DeckConfig
- `game.config.ts` → ACTIVE_DECK_CONFIG (tek noktadan deste degisimi)
- `index.ts` → barrel export

## Blof Kurali — Kod Detayi

```typescript
// server/src/engine/rules.ts
// BLUFF RULE: Sadece pisti durumunda (pile === 1) blof yapilabilir.
// Tum ellerde blof istenirse → pileCount >= 1 yap.
export function canBluff(pileCount: number, topCard: ICard | null): boolean {
  return pileCount === 1 && topCard !== null;
}
```

```typescript
// server/src/engine/scoring.ts
export function calcBluffScore(playedCard, groundCard, decision, config):
  PASS                              → { blufferDelta: 10, callerDelta: 0 }
  PASS (wildcard ustune wildcard)   → { blufferDelta: 30, callerDelta: 0 }
  CALL + gercek (rank eslesmesi)    → { blufferDelta: 20, callerDelta: 0 }
  CALL + gercek (wildcard+normal)   → { blufferDelta: 0,  callerDelta: 0 }
  CALL + gercek (wildcard+wildcard) → { blufferDelta: 100, callerDelta: 0 }
  CALL + sahte                      → { blufferDelta: 0,  callerDelta: 10 }
// Sira her zaman advanceTurn ile diger oyuncuya gecer.
```

## DeckConfig Akisi

```
shared/game.config.ts
  └─ ACTIVE_DECK_CONFIG (DEFAULT veya DOUBLE)
       ├─ server: oda baslatilirken config olarak kullanilir
       │   └─ createDeck(ACTIVE_DECK_CONFIG)
       │   └─ isMatch(played, top, ACTIVE_DECK_CONFIG)
       └─ client: IRoomState.deckConfig'den okur (server gonderir)
```

Deste degistirmek icin: `game.config.ts` icinde tek satir degistir → build et → bitti.

## Test

Engine pure function'lar test edilir:
- createDeck(DEFAULT) → 52 kart
- createDeck(DOUBLE) → 106 kart
- isWildCard(J, DEFAULT) → true
- isWildCard(JOKER, DEFAULT) → false
- isWildCard(JOKER, DOUBLE) → true
- isMatch(S7, H7, DEFAULT) → true (tek deste: sadece rank)
- isMatch(S7, H7, DOUBLE) → true (cift deste: sadece rank, suit farketmez)
- canBluff(1, card) → true, canBluff(0, card) → false, canBluff(2, card) → false
- calcBluffScore: CALL/PASS senaryolari
