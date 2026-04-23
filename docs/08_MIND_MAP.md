# Bluff — Kavram Haritasi (Mind Map)

> Bu dokuman projenin **kavramsal yapisini** bir bakista gosterir.
> Yeni kisi (veya yeni Claude session) projeyi anlamak icin buradan baslar.
> Her kavram tek anlami olmali — karisiklik = hata kaynagi.

---

## 1. TEMEL BIRIMLER (atomik kavramlar)

```
Card (Kart) — atomik birim, en kucuk oyun entitesi
├── suit: S | H | D | C | X (NONE=joker icin)
├── rank: A | 2-10 | J | Q | K | JOKER
└── id: "S7_0" formati (Suit + Rank + _deckIndex)

Hand (El) — oyuncunun elindeki kartlar
├── Card[] (4 kart kapasite)
└── kaynak: deck'ten dagitim

Deck (Deste) — oyunun kart havuzu
├── Tek deste: 52 kart (jokersiz)
├── Cift deste: 108 kart = 2×52 + 4 joker
└── Fisher-Yates shuffle ile karistirilir

Pile (Masa Yigini) — masa ustundeki kartlar ⚠️ DIKKAT
├── pile: Card[] (ARRAY, tek kart DEGIL!)
├── pileCount: pile.length (kart sayisi, 0..N)
├── topCard: pile[length-1] (gorunur en ust kart)
└── Bosalma: canTakePile → pile.splice(0)

CapturedCards (Kazanilan Kartlar) — oyuncunun topladiklari
├── Card[] (oyun boyunca biriken)
└── Oyun sonu kart fazlasi icin sayilir
```

### Pile'in 3 ozel durumu

| Durum | pileCount | topCard | Anlami |
|-------|-----------|---------|--------|
| **Bos** | 0 | null | Pisti zemini atilmadi, sira sifir |
| **Pisti zemini** | 1 | Card | Bir sonraki eslesen kart Pisti yapar |
| **Dolu** | 2+ | Card | Oyun devam ediyor, eslesen kart TUMUNU alir |

---

## 2. OYUNCULAR VE ROLLER

```
Players (2 kisi — 4 kisilik Step 3'te)
├── Host: edleron (token sabit)
│   ├── Lobby'de config secer (deste, blof)
│   └── currentTurnIndex=0 ile basliyor (varsayim)
└── Guest: wilkagul (token sabit)

Roller (her turda degisebilir)
├── Bluffer — kapali kart atan oyuncu
│   └── set: playCard(isHidden=true) yapinca state.bluffPlayerId
├── Caller — CALL/PASS karar veren oyuncu
│   └── resolveBluff icin opponent (bluffPlayerId degil)
├── Winner — pile'i kazanan (her el icin degisir)
│   └── Normal: canTakePile yapan
│   └── Blof sonu: scoring'e gore bluffer veya caller
└── Current Player — sira kimde → currentTurnIndex
```

---

## 3. OYUN FAZLARI (GamePhase)

```
WAITING ──┐
          ↓
DEALING (4 kart masaya + 4 kart/oyuncu)
          ↓
PLAYER_TURN ←──────────────┐
  ├── Normal: playCard      │
  │     ├── canTakePile → pile bosalir, puan      │
  │     └── else → pile'a push
  ├── Kapali: playCard(isHidden=true) ──→ BLUFF_PHASE
  │                                        │
  │                                        ↓
  │                              resolveBluff(CALL|PASS)
  │                                        │
  │                                        ↓
  └────────────── advanceTurn ─────────────┘
          ↓
Deste bitti + ellerde kart yok
          ↓
GAME_OVER (son kart bonusu + kart fazlasi +5)
```

### Faz kurallari

- **BLUFF_PHASE**: sira zaman asimi (30sn) → otomatik PASS
- **BLUFF_PHASE**: `canBluff` kontrolu → pile === 1 zorunlu
- **PLAYER_TURN** → **BLUFF_PHASE**: gecise blof tetigi
- **BLUFF_PHASE** → **PLAYER_TURN**: resolveBluff sonrasi

---

## 4. AKSIYONLAR (Socket Events)

```
Client → Server (C2S)
├── joinRoom(roomId, config)
├── playCard(cardId, isHidden)
│   └── isHidden=true + pile===1 → BLUFF_PHASE
└── bluffDecision('CALL' | 'PASS')

Server → Client (S2C)
├── roomState — maskelenmis oyun durumu
├── yourHand — oyuncunun kendi eli
├── cardPlayed — kart oynandi (isHidden ise cardId='HIDDEN')
├── bluffRequest — blof karari bekleniyor (sadece caller'a)
├── bluffResolved — blof sonucu (winner, revealed, revealedCard)
├── scoreUpdate — puan degisti
├── gameOver — oyun bitti (kazanan + skorlar)
└── error — hata mesaji
```

---

## 5. KURALLAR

```
Eslestirme (isMatch)
└── RANK BAZLI (her zaman, tek/cift fark etmez)
    └── S7 === H7 === D7 === C7 (her 7)

Wildcard (isWildCard)
├── J (Vale) — her zaman wildcard
├── Joker — sadece includeJokers=true ise
└── Davranis: masadaki TUM kartlari alir

Pile Alma (canTakePile)
└── isMatch(played, top) OR isWildCard(played)

Blof (canBluff)
├── pileCount === 1 ZORUNLU
├── topCard var olmali
└── bluffEnabled=true (runtime config)

Pisti (isRealPisti)
└── Blof cozumlemede kullanilir
    ├── isReal: rank eslesmesi + pileCount=1
    └── Wildcard pile kazanir ama pisti sayilmaz (+0 bonus)
```

---

## 6. PUANLAMA SISTEMI

```
Kart Degerleri (pile alinca)
├── C2 (Sinek 2) → +2
├── D10 (Karo 10) → +3
└── Diger → 0

El Bonuslari (dagitimda hesaplanir)
├── A+K+Q elde → +30 (Flush)
└── 4 ayni rank → +50 (Four of a Kind)

Pisti Bonuslari (playCard icinde)
├── Normal pisti (rank match) → +10
├── Jackpot pisti (wildcard×wildcard) → +50
└── Wildcard×normal → +0 (pile alir ama pisti degil)

Blof Puanlari (resolveBluff icinde)
├── PASS
│   ├── normal → Blofcu +10
│   └── wildcard×wildcard → Blofcu +30
├── CALL + gercek
│   ├── rank match → Blofcu +20
│   ├── wildcard×wildcard → Blofcu +100 (Jackpot blof)
│   └── wildcard×normal → Blofcu 0 (pile alir ama bonus yok)
├── CALL + sahte → Caller +10
└── Timeout (30sn) → otomatik PASS davranisi

Oyun Sonu
├── Son masadaki kartlar → en cok kart toplayana
├── Kart fazlasi → +5 bonus
└── Berabere → +5 verilmez
```

---

## 7. BLOF MEKANIGI — DETAYLI AKIS

```
1. A'nin turu, masada 1 kart (pisti zemini)
2. A karti secer
3. A "Kapali Oyna" butonuna basar
   └── playCard(cardId, isHidden=true)
4. Server: canBluff() kontrol → phase=BLUFF_PHASE
   ├── state.bluffCard = secilen kart
   ├── state.bluffPlayerId = A.id
   └── state.bluffGroundCard = onceki top
5. B'ye bluffRequest event'i → panel acilir (30sn timer)
6. B karar verir: CALL veya PASS
7. Server resolveBluff:
   ├── PASS → pile A'ya, A +10, sira B'ye
   ├── CALL + gercek rank → pile A'ya, A +20, sira B'ye
   ├── CALL + wildcard+wild → pile A'ya, A +100, sira B'ye
   ├── CALL + wildcard+normal → pile A'ya, A +0, sira B'ye
   └── CALL + sahte → pile B'ye, B +10, sira B'ye
8. bluffResolved event → client'ta reveal animasyonu (I-GF0)
```

> **ONEMLI:** Blof sonucu ne olursa olsun sira HER ZAMAN caller'a (B'ye) gecer.

---

## 8. STATE MASKING (Server → Client)

```
Sunucuda (gercek state)
├── state.players[].hand — TUM kartlar gorunur
├── state.deck — sirali
├── state.pile — gercek kartlar
├── state.bluffCard — A'nin kapali karti
├── state.bluffPlayerId — A'nin id'si
└── state.bluffGroundCard — pisti zemini

Client'a gonderilen (maskelenmis)
├── players[].handCount — SADECE sayi (rakip eli gizli)
├── deckRemaining — SADECE sayi
├── table.topCard
│   ├── Normal: pile.last
│   └── BLUFF_PHASE: bluffGroundCard (blof karti DEGIL)
├── table.pileCount
└── bluffPlayerId (CLIENT gorunumu icin)

CARD_PLAYED event
├── Normal: cardId = gercek id
└── isHidden: cardId = 'HIDDEN' (rakibe gercek kart gizli)
```

---

## 9. MIMARI (Refactor sonrasi)

```
SERVER (NestJS) — tek servis, HTTP + WebSocket
├── auth/
│   ├── auth.controller.ts — POST /auth/login
│   └── auth.service.ts — token dogrulama
├── room/
│   └── room.service.ts — tek sabit oda (default-room)
├── game/
│   ├── game.gateway.ts — socket handler + event routing
│   └── game.service.ts — state + oyun logic (playCard, resolveBluff)
├── engine/ (PURE TS, framework bagimsiz)
│   ├── deck.ts — createDeck, shuffle, dealHands
│   ├── rules.ts — isMatch, isWildCard, canTakePile, canBluff, isRealPisti
│   └── scoring.ts — calcBluffScore, calcCardValues, calcPistiBonus,
│                    checkFlushBonus, checkFourOfAKindBonus
└── shared/ — ortak tipler (server + client)

CLIENT (PixiJS) — tek uygulama, 4 ekran
├── app/screens/
│   ├── LoadScreen.ts — asset preload
│   ├── LobbyScreen.ts — giris + host config
│   ├── GameScreen.ts — ORCHESTRATOR (socket, state, render)
│   ├── GameAnimations.ts — deal/play/collect animasyonlari
│   ├── BluffController.ts — bluff panel + timer + REVEAL (I-GF0)
│   ├── ScoreDisplay.ts — skor UI + toast + shake
│   └── GameOverScreen.ts — kazanan + skor ozeti
├── game/
│   ├── session.ts — oyuncu bilgisi (token, id, roomId)
│   ├── services/
│   │   ├── ApiService.ts — HTTP login
│   │   └── SocketService.ts — socket connection + event callback
│   ├── components/CardSprite.ts — 3D flip kart (PerspectiveMesh)
│   └── utils/cardMapping.ts — ICard → sprite frame
├── engine/ — PixiJS plugins (navigation, audio, state XState)
└── shared/ — server tiplerinin kopyasi
```

---

## 10. UI ELEMENTLERI (ekranda ne gorur kullanici)

```
EKRAN LAYOUT (GameScreen container hierarchy)
┌──────────────────────────────────────────────────┐
│ [Skor Paneli]         [Turn Indicator]           │ ← TOP
│ wilkagul: 0                                      │
│ edleron: 0                                       │
│ Deste: 96                                        │
│                                                  │
│              [Opponent Hand — 4 kapali kart]     │
│                                                  │
│                                                  │
│              [Table Area — topCard + pile]       │ ← CENTER
│              Yigin: N                            │
│                                                  │
│              [Bluff Panel — CALL / PASS + 30s]   │ ← conditional
│              [Kapali Oyna butonu]                │ ← conditional
│                                                  │
│              [Player Hand — 4 acik kart]         │
│                                                  │
│                                          [🏆]    │ ← BOTTOM-RIGHT
└──────────────────────────────────────────────────┘
```

### 10.1 Persistent UI (her zaman ekranda)

**Skor Paneli** (sol ust) — `ScoreDisplay.container`
```
ScoreDisplay
├── playerNameLabel — kendi nickname (beyaz)
├── playerScoreLabel — kendi skor (0x00ff88 yesil)
├── opponentNameLabel — rakip nickname (beyaz)
├── opponentScoreLabel — rakip skor (0xff4444 kirmizi)
└── deckRemainingLabel — "Deste: N" (gri)
```

**Turn Indicator** (ust orta) — `GameScreen.turnIndicator`
```
phase === PLAYER_TURN
├── isMyTurn: "Senin Siran!" (0xffcc00 sari)
└── else: "Rakip Oynuyor..."
phase === BLUFF_PHASE: "Blof Karari Bekleniyor..."
phase === DEALING: "Kartlar Dagitiliyor..."
```

**Kupa Butonu** (sag alt) — `ScoreDisplay.infoButton` (cup.png)
```
Click → ScorePanel toggle
└── ScorePanel (scrollable)
    └── myScoreEvents[] gecmisi
        └── Her event: kategori + kartlar + puan
           (pisti/flush/bluff/capture)
```

**Table Area** (orta) — `GameScreen.tableArea`
```
TableArea Container
├── tableCardSprite (face-up top card)
├── pileBackCards[] (alttaki kapali kartlar, offset ile)
├── pileCountLabel — "Yigin: N" (altta)
└── BLUFF_PHASE'de: + bluffBack (kapali blof karti)
```

**Hand Containers**
```
opponentHandContainer (ust orta)
└── opponentCardSprites[] — kapali kartlar, scale 0.5

playerHandContainer (alt orta)
└── cardSprites[] — acik kartlar, scale 0.6
    └── Secili kart: y -20 (yukari kalkar)

animLayer (tepede)
└── Cross-container animasyon icin gecici kartlar
```

**Kapali Oyna Butonu** (alt, conditional) — `GameScreen.hiddenPlayButton`
```
Gorunme sartlari (TUMU):
├── bluffEnabled === true
├── isMyTurn === true
├── selectedCardIndex >= 0
├── table.pileCount === 1
└── table.topCard !== null

Click → playCard(cardId, isHidden=true) → BLUFF_PHASE
```

### 10.2 Transient UI (gecici gosterilen)

**Score Toast** (ekran ortasi, 2s) — `ScoreDisplay.showToast`
```
Olay: scoreUpdate event geldi
Gorunum:
├── Buyuk yazi: "+N" veya "Rakip +N"
│   └── Renk: isMe → 0x00ff88 (yesil), degil → 0xff4444 (kirmizi)
├── Kucuk yazi: label (ornek: "C2 +2 | D10 +3")
└── Animasyon: yukari uzar (80px) + alpha 0, 2s ease-out
```

**Bluff Panel** (alt orta, conditional) — `BluffController.panel`
```
Gorunme: phase === BLUFF_PHASE + caller (A degil, B)
Icerik:
├── CALL butonu (sol, "Blof")
├── PASS butonu (sag, "Pass")
├── Timer label (30s geri sayim)
└── Fade-in back.out animasyon
```

**I-GF0 Reveal Elements** (blof CALL sonucu) — `BluffController`
```
Reveal sirasinda (~3.5s):
├── dimOverlay (tum ekran, siyah %55, 300ms fade-in/out)
│   └── tableArea ustune cikartilir (parlak kalir)
├── blur (playerHand + opponentHand, strength 5)
├── flashLayer (tum ekran, yoyo alpha)
│   ├── Gercek: beyaz (0xffffff)
│   └── Sahte: kirmizi (0xff3333)
├── resultLabel (ortada, buyuk)
│   ├── Gercek: "+20 GERCEK!" (0xffcc00 sari, scale 0→1 bounce)
│   └── Sahte: "YAKALANDI!" (0xff3333 kirmizi)
├── handFlashOverlay (sahte durumda, blofcunun el bolgesi)
│   └── Kirmizi flash (150ms yoyo)
└── shakeScreen (gercek durumda, 7x yoyo)
```

### 10.3 Toast vs Result Text — fark

| Ozellik | Score Toast | I-GF0 Result Text |
|---------|-------------|-------------------|
| **Ne zaman** | Her scoreUpdate (her puan degisimi) | Sadece blof CALL sonrasi |
| **Nerede** | Ekran ortasi (y - 40) | Ekran ortasi (y - 80) |
| **Icerik** | "+N" + label | "+20 GERCEK!" veya "YAKALANDI!" |
| **Sure** | 2s (fade up) | 0.8s + fade |
| **Boyut** | 36px | 72px |
| **Efekt** | Alpha fade + up | Scale 0→1 bounce + fade |

### 10.4 UI Olustuklari Yerler (dosya sorumluluklari)

```
GameScreen.ts (orchestrator)
├── bg (Graphics) — yesil arka plan
├── tableArea — masa + pile + topCard
├── turnIndicator — sira yazisi
├── playerHandContainer — kendi el
├── opponentHandContainer — rakip el
├── hiddenPlayButton — "Kapali Oyna"
└── animLayer — cross-animasyon

GameAnimations.ts
└── Gecici kart sprite'lari (deal/play/collect)

BluffController.ts
├── panel — CALL/PASS + timer
├── dimOverlay — reveal sirasinda
├── flashLayer — reveal flash
├── resultLabel — "+20 GERCEK!" / "YAKALANDI!"
└── handFlashOverlay — blofcu el kirmizi flash

ScoreDisplay.ts
├── container — sol ust skor paneli
├── infoButton — sag alt kupa ikonu
├── Score toast (her scoreUpdate'te)
└── Shake (me.score arttiginda, _bluffRevealing false ise)
```

### 10.5 Z-INDEX SIRASI (katman sirasi)

Oyunun farkli durumlarinda ekrandaki elementler farkli katmanlarda bulunur.
`addChild` cocuk zaten eklenmisse sadece onu **ENDE tasir** (yeni eklemez) — dinamik
reorder icin kullanilir.

**Normal durum (asagidan yukari, index sirasiyla):**

```
0.  bg                    (yesil masa arka plani)
1.  tableArea             (pileBackCards + tableCardSprite + pileCountLabel)
2.  turnIndicator         (ust orta yazi)
3.  scoreContainer        (sol ust skor paneli)
4.  scoreInfoButton       (sag alt kupa)
5.  playerHandContainer   (alt kartlar)
6.  opponentHandContainer (ust kapali kartlar)
7.  bluffPanel            (hidden, BLUFF_PHASE'de acilir)
8.  hiddenPlayButton      (hidden, pile===1 + sira bende ise acilir)
9.  animLayer             ⬆️ EN UST (cross-animasyon icin)
```

**BLUFF_PHASE (panel acik):**
- Normal duzen + `bluffPanel.visible = true`
- bluffPanel 7. sirada, animLayer hala tepede

**I-GF0 Reveal sirasinda (CALL sonrasi):**

```
0-8. dim'lenir (bg, turnIndicator, score, hands, bluffPanel, button)
9.   dimOverlay          (%55 siyah, eklenir)
10.  tableArea           (dim'in ustune cikarilir — PARLAK kalir)
11.  animLayer           (her zaman en tepede)
(11+) flashLayer         (gecici, yoyo fade)
(11+) resultLabel        (gecici, scale bounce)
(11+) handFlashOverlay   (blofcu el icinde — container child'i)
```

**Toast gosterildiginde (scoreUpdate event geldiginde):**
- Toast `screen.addChild` ile eklenir → en uste gecer
- animLayer'in bile ustunde konumlanir
- ⚠️ **Reveal sirasinda toast eklenirse resultLabel'in uzerine biner**

### 10.6 UI SYNC CONTRACT (senkron olmali)

Ayni bilgiyi farkli yerlerde gosteren elementler **tutarli** olmali.
Uyusmazlik = kullaniciya yanlis bilgi verir = **bug.**

| Kaynak (server) | Gosterim 1 | Gosterim 2 | Iliski |
|-----------------|------------|------------|--------|
| `scoreUpdate.total` | Score toast ("+10") | playerScoreLabel (sol panel) | **Eslesmeli** |
| `bluffResolved.winner` | Reveal result text | Pile animasyonu yonu | **Ayni kazanana isaret etmeli** |
| Gercek blufferDelta | Reveal "+N GERCEK!" metni | scoreUpdate'ten gelen total | **Sayi eslesmeli** |
| roomState.pileCount | tableArea'daki kart gorseli | pileCountLabel metni | **Eslesmeli** |
| state.currentTurn | turnIndicator yazisi | playerHandContainer.interactiveChildren | **Eslesmeli** |

**Bilinen uyusmazliklar (bug):**

| # | Problem | Detay |
|---|---------|-------|
| 1 | Reveal text hardcoded | "+20 GERCEK!" her zaman, ama server +100 veya +0 olabilir |
| 2 | Score panel reveal once guncellenir | Kullanici +100 puani reveal'dan once gorur |
| 3 | Toast reveal'la ayni pozisyonda | y=h/2-40 (toast) ve y=h/2-80 (result) cakisir |

### 10.7 TASIMA/REORDER PRATIKLERI

**Kural 1 — animLayer her zaman tepede:** Animasyon cross-container hareketi icin
animLayer kullanilir. Baska bir `addChild`/`setChildIndex` sonrasi animLayer kayabilir.
Her manipulasyon sonunda geri tepeye al:

```typescript
if (!screen.animLayer.destroyed) {
  screen.setChildIndex(screen.animLayer, screen.children.length - 1);
}
```

**Kural 2 — Reveal sirasinda tableArea dimOverlay ustunde:**
```typescript
screen.addChild(dimOverlay);
screen.setChildIndex(screen.tableArea, screen.children.length - 1);
screen.setChildIndex(screen.animLayer, screen.children.length - 1);
// Sonuc: dimOverlay < tableArea < animLayer
```

**Kural 3 — Tek sorumlu merkez yok:** Su an her fonksiyon kendi addChild'ini yapiyor.
Hata ihtimali: bir fonksiyon siralamayi bozar, baska fonksiyon farkedemez.
İleriki iyilestirme: `LayerManager` gibi merkezi yonetim.

---

## 11. VERI AKISI (tam oyun turu)

```
[Login]
edleron → POST /auth/login → token + playerId + isHost
wilkagul → ayni

[Lobby]
edleron → socket.connect → joinRoom(default-room, config)
wilkagul → socket.connect → joinRoom(default-room)
    ↓
Server: 2 oyuncu var → startGame()
    ↓ (both clients)
roomState (DEALING → PLAYER_TURN)
yourHand (4 kart)
scoreUpdate (eger el bonusu varsa: flush/FoaK)

[Oyun turu — normal]
A kart secer → playCard(cardId, isHidden=false)
    ↓
Server: pile'a ekle, canTakePile kontrol, puan
    ↓ (both clients)
cardPlayed → A'nin karti B'nin ekraninda acilir
scoreUpdate (puan degisti ise)
roomState (pile guncellendi)
yourHand (A'nin eli 3 karta dustu)

[Oyun turu — blof]
A kart secer (pisti zemini var) → playCard(cardId, isHidden=true)
    ↓
Server: canBluff() → BLUFF_PHASE
    ↓
cardPlayed (isHidden=true, cardId='HIDDEN')
roomState (BLUFF_PHASE, bluffPlayerId=A)
bluffRequest → SADECE B'ye (panel acilir, 30sn)
    ↓
B → bluffDecision('CALL' | 'PASS')
    ↓
Server: resolveBluff → puan + pile yonu
    ↓
scoreUpdate
bluffResolved (winner, revealed, revealedCard)
    ↓ (client)
Eger CALL → I-GF0 reveal animasyonu (9 adim, ~3.5s)
Eger PASS → direkt collect animasyonu
roomState (PLAYER_TURN, pile=0, sira B'de)

[El sonu]
Tum eller bos → server: dealHands() veya game over
    ↓
yourHand (yeni 4 kart)
scoreUpdate (yeni el bonuslari varsa)

[Oyun sonu]
Deste bitti + eller bos → GAME_OVER
    ↓
scoreUpdate (oyun sonu kart fazlasi +5)
gameOver (winner + skorlar)
    ↓ (client)
GameOverScreen
```

---

## 12. KAVRAM SOZLUGU (referans tablo)

| Kavram | Anlam | Kaynak |
|--------|-------|--------|
| **Card** | Tek bir kart (suit+rank+id) | `shared/types.ts` ICard |
| **Hand** | Oyuncunun elindeki kartlar | `PlayerState.hand` |
| **Deck** | Oyun havuzu (karistirilmis) | `GameState.deck` |
| **Pile** | Masadaki kart yigini (array!) | `GameState.pile` |
| **Pile count** | Pile'daki kart sayisi | `state.table.pileCount` |
| **Top card** | Pile'in en ustteki kart | `state.table.topCard` |
| **Pisti zemini** | pile.length === 1 durumu | canBluff kontrolu |
| **Captured cards** | Toplanan kartlar (kazanilmis) | `PlayerState.capturedCards` |
| **Match** | Rank eslesmesi (S7=H7) | `isMatch()` |
| **Wildcard** | J veya Joker | `isWildCard()` |
| **Take pile** | Eli alma (pile'i toplama) | `canTakePile()` |
| **Pisti** | Normal pisti (rank match, pile=1) | `calcPistiBonus()` |
| **Jackpot pisti** | Wildcard×Wildcard pisti | `calcPistiBonus()` → 50 |
| **Bluff** | Kapali kart atma | `isHidden=true` + `canBluff()` |
| **Bluffer** | Kapali kart atan oyuncu | `state.bluffPlayerId` |
| **Caller** | CALL/PASS karar veren | `opponent(bluffPlayerId)` |
| **CALL** | Blof karti ac | `BluffDecision.CALL` |
| **PASS** | Blof karti acma | `BluffDecision.PASS` |
| **Real bluff** | CALL + gercek rank match | `isRealPisti()` |
| **Fake bluff** | CALL + eslesmiyor | isReal=false |
| **Advance turn** | Sira bir sonrakine gecer | `advanceTurn()` |
| **State masking** | Rakip eli gizleme | `maskStateForPlayer()` |
| **Score Toast** | Puan degisiminde ortada cikan gecici yazi | `ScoreDisplay.showToast()` |
| **Result Text** | Blof CALL sonrasi "+20 GERCEK!" / "YAKALANDI!" | `BluffController.showResultText()` |
| **Score Panel** | Sol ustteki surekli skor gosterimi | `ScoreDisplay.container` |
| **ScorePanel (detay)** | Kupa butonuna basinca acilan skor gecmisi | `ui/ScorePanel.ts` |
| **Info Button** | Sag alt kupa ikonu (score panel toggle) | `ScoreDisplay.infoButton` |
| **Turn Indicator** | Ust orta "Senin Siran!" yazisi | `GameScreen.turnIndicator` |
| **Hidden Play Button** | Blof icin "Kapali Oyna" butonu | `GameScreen.hiddenPlayButton` |
| **Dim Overlay** | Reveal sirasinda ekrani karartan layer | `BluffController.dimOverlay` |
| **Flash Layer** | Reveal sirasinda gecici flash (beyaz/kirmizi) | `BluffController.flashLayer` |
| **Anim Layer** | Cross-container animasyon icin tepe container | `GameScreen.animLayer` |

---

## 13. DIKKAT NOKTALARI (sik karistirilan)

1. **Pile tek kart degildir.** Array. `pileCount` sayi verir.
2. **Pisti zemin = pile.length === 1.** Pile bos (0) ise blof yapilamaz.
3. **Eslestirme rank-only.** Suit farketmez (her iki destede de).
4. **Wildcard pile'i alir ama pisti puani vermez** (wildcard×normal = 0).
5. **Blof sonrasi sira HER ZAMAN caller'a gecer.** Blof sonucu sirayi etkilemez.
6. **J ve Joker ayni isleve sahip** — wildcard, kart degeri 0.
7. **Rakip eli client'a gonderilmez** (sadece handCount).
8. **Blof sirasinda topCard = bluffGroundCard** (kapali kart gizlenir).
9. **Score Toast vs Result Text farkli seylerdir.** Toast her puan degisiminde; Result Text sadece blof CALL sonrasi dramatik reveal'da.
10. **Score Panel (sol ust) ile ScorePanel (detay) farkli.** Ilki surekli goruniyor (label'lar), ikincisi kupa butonu ile acilir/kapanir.
11. **Shake efekti iki yerden gelebilir.** ScoreDisplay otomatik shake yapar ama reveal sirasinda bastirilir (I-GF0 kendi shake'ini yapar).
