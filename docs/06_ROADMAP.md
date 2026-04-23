# Bluff — v1 Roadmap

> v0.0.1 → v1.0.0
> Odak: 2 kisilik deneyim, game feel, juice
> Auth/otorite/oda sistemi scope disinda — su anki token yapisi yeterli
> Blof kurali: sadece pile === 1 (tek kart, pisti zemini) iken yapilabilir

---

## CALISMA AKISI

> **Bu doküman implementasyon rehberi (kontekst, oncelik, kural).**
> **Hizli checklist:** `docs/07_QUICKLY_TODO_LIST.md` (mikro task listesi).
>
> ### Her task icin akis:
>
> 1. **ONCELIK SIRASI** tablosuna bak — hangi maddeyi yapacagini bul
> 2. Bu dokumandan ilgili maddenin **detayini oku** (hedef dosya, spec, kurallar)
> 3. Implement et
> 4. **Iki dosyayi da isaretle:** hem bu dokumandaki `- [ ]` → `- [x]`, hem TODO'daki ayni satir
> 5. Eger kural/scoring/dosya yapisi degistiyse: **DOCS GUNCELLEME KURALI** tablosuna bak, ilgili docs guncelle
> 6. Sonraki task'a gec
>
> **Kural:** Iki dosya senkron kalmali. Sadece TODO'yu isaretlemek YETMEZ.

---

## REFACTOR — Clean Architecture (Bug + GF oncesi)

> **Neden once?** Sadece dosya ayirma yetmez — coupling devam ediyor. Her class
> baska class'in internal state'ine (`public _xxx`) mudahale ediyor. Merkezi yonetim
> yok (z-index, deferred state, events). Bu yapida bir yeri duzeltince baska yerde
> sorun cikabilir.
>
> **Faz 1 — Dosya Ayirma (DONE):** GameScreen 1344 → 739 satir. 4 dosyaya bolundu.
> **Faz 2 — Clean Architecture (AKTIF):** Agresif bolme, her dosya max 200 satir.

---

### NEREDE KALDIK?

**Tamamlanan:** Faz 1 (4 adım), Bug B1, I-GF0, I-U1
**Su an yapilacak:** **F2A-1 — BluffResolvedData extension**
**Sirasi:** F2A-1 → F2A-2 → F2A-3 → F2A-4 → F2A-5 → F2B → F2C → F2D → F2E → Bug'lar → GF'ler

Her adim sonrasi:
1. TypeScript check + ESLint + build
2. Playing test (iki tarayici, oyun senaryosu)
3. Her iki dosyada checkbox `[x]` isaretle
4. Sonraki adim

---

### Refactor Kurallari (TUM FAZLAR ICIN)

1. **Extract, rewrite degil** — metotlar oldugu gibi tasiniyor, logic degismiyor
2. **Davranis DEGISMEZ** — ayni animasyonlar, ayni timing, ayni akis
3. **`_screenGen` kontrolu korunur** — tum async callback'lerde generation check
4. **Her adim playing test ile dogrulanir** — bir sonraki adima gecmeden kontrol
5. **Satir numaralari referanstir** — adim sonrasi kayar, metot adina gore bul
6. **TypeScript strict + ESLint temiz** — her adim sonrasi 0 hata/uyari

### FAZ 1 — GameScreen Ayirma ✅ DONE

**Sonuc:** GameScreen.ts 1344 → 739 satir. 4 dosyaya bolundu:
- `GameScreen.ts` (739) — orchestrator
- `GameAnimations.ts` (387) — deal/play/collect
- `BluffController.ts` (400+) — panel + timer + reveal
- `ScoreDisplay.ts` (212) — skor UI + toast + shake

Playing test: tam akis dogrulandi (login → deal → play → collect → pisti → blof CALL/PASS → game over → reconnect).

Not: GameScreen 500 hedefine indirilemedi (739). Faz 2'de agresif bolme ile ~100'e cekilecek.

---

### FAZ 2 — Agresif Clean Architecture (TOP PRIORITY — BUG'LARDAN ONCE)

> **Hedef:** Her dosya **max 200 satir**, cogu 50-150 arasi. Tek sorumluluk.
> `engine/` klasoru gibi: her dosya tek isi yapar, acik adli, stabil.
>
> **Yeni dosya sayisi:** Client ~20, Server ~10. Cok dosya ama her biri kucuk ve fokuslu.
> Yeni feature gelince mevcut dosya buyumez — yeni dosya eklenir.

#### HEDEF YAPI (agresif bolme)

```
client/src/app/screens/
├── GameScreen.ts                    → ~100 satir ORCHESTRATOR
│
├── game/                            → GameScreen alt modulleri
│   ├── GameLifecycle.ts             → prepare/show/hide/reset (~100)
│   ├── GameLayout.ts                → resize + positioning (~80)
│   ├── GameSocketHandler.ts         → socket subscribe + dispatch (~80)
│   ├── GameStateController.ts       → onRoomState/onYourHand/onCardPlayed (~150)
│   ├── CardSelector.ts              → selectCard/playSelectedCard (~80)
│   ├── LayerManager.ts              → z-index merkezi (~50)
│   └── DeferredActions.ts           → deferred state queue (~100)
│
├── ui/                              → Saf UI componentleri
│   ├── HandArea.ts                  → hand render + layout (~100)
│   ├── TableArea.ts                 → pile + topCard + pileCountLabel (~100)
│   ├── TurnIndicator.ts             → turn label (~40)
│   ├── BluffPanel.ts                → CALL/PASS + timer UI (~100)
│   ├── ScorePanel.ts                → left-top score labels (~80)
│   ├── DeckCounter.ts               → deste sayaci gorsel (~60)
│   └── CupButton.ts                 → right-bottom cup toggle (~40)
│
└── effects/                         → Animasyonlar + juice
    ├── DealEffect.ts                → deal animation (~120)
    ├── PlayEffect.ts                → play card (~100)
    ├── CollectEffect.ts             → collect pile (~120)
    ├── RevealEffect.ts              → I-GF0 reveal ani (~200)
    ├── ScoreToast.ts                → toast animation (~100)
    ├── FlashEffect.ts               → generic screen flash (~40)
    └── ShakeEffect.ts               → screen shake helper (~40)

server/src/game/
├── game.gateway.ts                  → ~150 satir (sadece routing)
├── game.service.ts                  → ~100 satir ORCHESTRATOR
│
├── state/
│   ├── GameStateManager.ts          → Map<roomId, state> + CRUD (~80)
│   ├── GameInitializer.ts           → startGame + dealHands (~100)
│   └── StateMasking.ts              → maskStateForPlayer (~60)
│
├── flow/
│   ├── PlayCardHandler.ts           → playCard flow (~120)
│   ├── ResolveBluffHandler.ts       → resolveBluff (~150)
│   └── RefillOrEndHandler.ts        → checkRefillOrEnd (~80)
│
├── events/
│   ├── GameEventEmitter.ts          → socket emit helper (~80)
│   └── GameEventTypes.ts            → typed event union (~60)
│
└── timers/
    └── BluffTimer.ts                → 30s auto-PASS (~40)
```

**Eski Yeni Karsilastirma:**

| Dosya | Eski | Yeni (hedef) |
|-------|------|--------------|
| GameScreen.ts | 739 | ~100 |
| GameAnimations.ts | 387 | silinir → 3 effect dosyasina bolunur |
| BluffController.ts | 400+ | silinir → BluffPanel + RevealEffect |
| ScoreDisplay.ts | 212 | silinir → ScorePanel + ScoreToast + CupButton |
| game.service.ts (server) | 428 | ~100 orchestrator + 6 helper dosya |
| game.gateway.ts (server) | 381 | ~150 (emitter + events ayri) |

---

### FAZ 2 Alt-Fazlar (sirayla uygulanir)

#### FAZ 2A — Cross-cutting foundation (ilk yapilacaklar)

##### F2A-1 — BluffResolvedData extension ⬅️ ILK YAPILACAK

**Neden:** B2 bug temeli. Server delta gondersin, client dinamik text yapsin.

**Degisecek dosyalar:**
- `server/src/shared/types.ts` — BluffResolvedData interface
- `client/src/shared/types.ts` — kopya
- `server/src/game/game.service.ts` — resolveBluff event push
- `server/src/game/game.gateway.ts` — bluffResolved emit
- `client/src/game/services/SocketService.ts` — tip

**Davranis degismeyecek:** Client henuz kullanmayacak (sadece alacak).

- [ ] `BluffResolvedData`'ya `blufferDelta: number` + `callerDelta: number` ekle (server + client kopya)
- [ ] Server: resolveBluff 3 branch'inde (PASS, CallReal, CallFake) delta'lari event'e koy
- [ ] Gateway: emit'te forward et
- [ ] Playing test: blof CALL at → console'da bluffResolved event'inde delta geliyor mu kontrol

##### F2A-2 — LayerManager

**Dosya:** `client/src/app/screens/game/LayerManager.ts` (~50 satir)

**API:**
```typescript
class LayerManager {
  constructor(private screen: Container) {}
  addPersistent(child: Container, priority: number): void
  addOverlay(child: Container): void
  ensureTopMost(target: Container): void
}
```

- [ ] Dosya olustur
- [ ] GameScreen ctor'da instance
- [ ] Tum `screen.addChild` → `layers.addXxx()` migrate
- [ ] Playing test: toast/overlay/animLayer dogru sirada

##### F2A-3 — DeferredActions

**Dosya:** `client/src/app/screens/game/DeferredActions.ts` (~100 satir)

**API:**
```typescript
type DeferredAction =
  | { type: 'collect' }
  | { type: 'tableCard'; card: ICard | null }
  | { type: 'dealHand'; cards: ICard[] }
  | { type: 'dealOpponent'; count: number }
  | { type: 'gameOver'; data: GameOverData };

class DeferredActions {
  add(action: DeferredAction): void
  flush(types?: DeferredAction['type'][]): void
  isBusy(): boolean
  clear(): void
}
```

- [ ] Dosya olustur
- [ ] GameScreen'deki 6+ `_deferredXxx` field'larini kaldir
- [ ] Her defer noktasinda `deferred.add(...)` kullan
- [ ] Playing test: blof CALL + rapid play → race yok

##### F2A-4 — Server event/types extraction

**Dosyalar:**
- `server/src/game/events/GameEventTypes.ts` (~60)
- `server/src/game/events/GameEventEmitter.ts` (~80)

- [ ] Typed union `GameEvent` tanimla
- [ ] `GameEventEmitter` class (scoreUpdate/bluffResolved/cardPlayed vs metotlari)
- [ ] Gateway'de inject et, tum `server.to().emit()` migrate
- [ ] Playing test: tum event'ler hala dogru client'a gidiyor

##### F2A-5 — Central constants

**Dosya:** `server/src/shared/game-constants.ts` (client kopyasi ile)

```typescript
export const TIMING = { BLUFF_DECISION_MS: 30_000, DISCONNECT_GRACE_MS: 30_000 };
export const HAND_SIZE = 4;
export const INITIAL_TABLE_CARDS = 4;
```

- [ ] Dosya olustur
- [ ] Tum magic number'lari import et

---

#### FAZ 2B — UI component extraction (mevcut render logic'i bol)

##### F2B-1 — TableArea

**Dosya:** `client/src/app/screens/ui/TableArea.ts` (~100)

Icerik: Container subclass. `renderTableCardNow()` + `pileBackCards` + `pileCountLabel` + bluff back card logic.

- [ ] Dosya olustur, GameScreen'den logic tasi
- [ ] API: `setTopCard(card)`, `clear()`, `getBackCards()`, `flushDeferredCard()`
- [ ] GameScreen'de `this.tableArea = new TableArea()` olarak kullan
- [ ] Playing test: pile render + bluff back dogru

##### F2B-2 — HandArea

**Dosya:** `client/src/app/screens/ui/HandArea.ts` (~100)

Icerik: Container subclass. `renderHand()` + `layoutHand()` + `renderOpponentHand()` + `layoutOpponentHand()`.

Not: Tek sinif iki mod destekler (player=interactive, opponent=face-down).

- [ ] Dosya olustur, hem player hem opponent icin kullanilabilir
- [ ] API: `setCards(cards)`, `select(index)`, `clear()`, `count`
- [ ] GameScreen'de iki instance: `playerHand`, `opponentHand`
- [ ] Playing test: render + secim dogru

##### F2B-3 — TurnIndicator

**Dosya:** `client/src/app/screens/ui/TurnIndicator.ts` (~40)

- [ ] Dosya olustur, Label wrapper
- [ ] API: `setPhase(phase, isMyTurn)`
- [ ] Playing test: sira yazisi dogru

##### F2B-4 — BluffPanel

**Dosya:** `client/src/app/screens/ui/BluffPanel.ts` (~100)

Icerik: BluffController'in panel + timer kismi (reveal DEGIL — o effects'e tasinacak).

- [ ] Dosya olustur, sadece UI + timer
- [ ] API: `show()`, `hide()`, `onDecision(callback)`, `reset()`
- [ ] Playing test: panel gorunumu + timer calisir

##### F2B-5 — ScorePanel + CupButton

**Dosyalar:**
- `client/src/app/screens/ui/ScorePanel.ts` (~80)
- `client/src/app/screens/ui/CupButton.ts` (~40)

ScoreDisplay'i bol:
- ScorePanel = sol ust label'lar (persistent)
- CupButton = sag alt kupa + detail panel toggle

- [ ] ScorePanel dosyasi
- [ ] CupButton dosyasi (detail panel toggle icerir)
- [ ] API: ScorePanel.update(me, opponent, deckCount), CupButton.onClick
- [ ] Playing test: skor label'lar + kupa butonu calisir

##### F2B-6 — DeckCounter

**Dosya:** `client/src/app/screens/ui/DeckCounter.ts` (~60)

Mevcut: deckRemainingLabel sadece text. Gelecek I-GF11 icin ayri component.

- [ ] Dosya olustur, deste ikonu + sayi
- [ ] API: `setCount(n)`, `flash()` (son el vurgusu)
- [ ] ScorePanel'den ayir

---

#### FAZ 2C — Effects extraction (animasyon + juice)

##### F2C-1 — DealEffect

**Dosya:** `client/src/app/screens/effects/DealEffect.ts` (~120)

GameAnimations.ts'deki `animateDealHand` + `animateOpponentDeal`.

- [ ] Dosya olustur, metotlari tasi
- [ ] API: `dealPlayerHand(cards)`, `dealOpponentHand(count)`
- [ ] Playing test: dagitim animasyonu ayni

##### F2C-2 — PlayEffect

**Dosya:** `client/src/app/screens/effects/PlayEffect.ts` (~100)

GameAnimations.ts'deki `animatePlayCard` + `animateOpponentPlay`.

- [ ] Dosya olustur, metotlari tasi
- [ ] API: `playerPlay(sprite)`, `opponentPlay(cardId)`
- [ ] Playing test: kart oynama animasyonu ayni

##### F2C-3 — CollectEffect

**Dosya:** `client/src/app/screens/effects/CollectEffect.ts` (~120)

GameAnimations.ts'deki `animateCollectPile`.

- [ ] Dosya olustur, metotlari tasi
- [ ] API: `collectPile(winnerId, pileBackCards, tableCard)`
- [ ] Playing test: pile toplama animasyonu ayni

##### F2C-4 — RevealEffect

**Dosya:** `client/src/app/screens/effects/RevealEffect.ts` (~200)

BluffController'daki 9 adimlik reveal logic'i. En buyuk effect dosyasi.

- [ ] Dosya olustur, onResolved'daki tum reveal adimlari
- [ ] API: `reveal(bluffBack, data)`, `cleanup()`
- [ ] FlashEffect + ShakeEffect kullanir (helper)
- [ ] Playing test: blof CALL reveal ayni

##### F2C-5 — ScoreToast

**Dosya:** `client/src/app/screens/effects/ScoreToast.ts` (~100)

ScoreDisplay.showToast + toast management (B6 fix).

- [ ] Dosya olustur
- [ ] API: `show(data, options)`, `clearAll()`
- [ ] activeToasts[] queue + offset (B6 temel)
- [ ] Playing test: ardarda scoreUpdate okunur

##### F2C-6 — FlashEffect + ShakeEffect

**Dosyalar:**
- `effects/FlashEffect.ts` (~40)
- `effects/ShakeEffect.ts` (~40)

Helper — her yerde kullanilabilir.

- [ ] FlashEffect: `flash(screen, color, duration)`
- [ ] ShakeEffect: `shake(target, intensity, duration)`
- [ ] ScoreDisplay.shake + RevealEffect.shake bunu kullansin

---

#### FAZ 2D — Game module extraction (GameScreen iskelet)

##### F2D-1 — GameLifecycle

**Dosya:** `client/src/app/screens/game/GameLifecycle.ts` (~100)

`prepare()`, `show()`, `hide()`, `reset()` GameScreen'den cikar.

- [ ] Dosya olustur
- [ ] API: GameScreen instance alir, lifecycle methodlarini export eder
- [ ] Playing test: ekran gecisleri ayni

##### F2D-2 — GameLayout

**Dosya:** `client/src/app/screens/game/GameLayout.ts` (~80)

`resize()` icerigi cikar. Container koordinatlari hesaplar.

- [ ] Dosya olustur
- [ ] API: `layout(width, height, components)`
- [ ] Playing test: resize dogru

##### F2D-3 — GameSocketHandler

**Dosya:** `client/src/app/screens/game/GameSocketHandler.ts` (~80)

`setupSocketListeners` + `removeSocketListeners` cikar. Event'leri domain handler'lara dispatch eder.

- [ ] Dosya olustur
- [ ] API: `setup(callbacks)`, `teardown()`
- [ ] Playing test: tum socket event'leri calisiyor

##### F2D-4 — GameStateController

**Dosya:** `client/src/app/screens/game/GameStateController.ts` (~150)

`onRoomState`, `onYourHand`, `onCardPlayed` logic'i.

- [ ] Dosya olustur
- [ ] Deferred state kullanir (F2A-3)
- [ ] UI component'lere delege eder (F2B)
- [ ] Playing test: state gecisleri dogru

##### F2D-5 — CardSelector

**Dosya:** `client/src/app/screens/game/CardSelector.ts` (~80)

`selectCard`, `playSelectedCard`, `updateHiddenPlayButton` cikar.

- [ ] Dosya olustur
- [ ] API: `select(index)`, `play(isHidden)`
- [ ] Playing test: kart secimi + oynama dogru

##### F2D-6 — GameScreen iskelet

**Hedef:** GameScreen.ts ~100 satir. Sadece:
- Constructor: component'leri olustur + baglar
- Update tick delegate
- Module'lere baglanti

- [ ] GameScreen'i 100 satira indir
- [ ] Tum logic alt module'lere gitmis olmali
- [ ] Playing test: tam akis ayni

---

#### FAZ 2E — Server refactor (paralel alt-faz)

##### F2E-1 — Server state/ extraction

**Dosyalar:**
- `server/src/game/state/GameStateManager.ts` (~80) — Map<roomId, state>
- `server/src/game/state/GameInitializer.ts` (~100) — startGame
- `server/src/game/state/StateMasking.ts` (~60) — maskStateForPlayer

- [ ] 3 dosya olustur, game.service.ts'den cikar
- [ ] GameService bunlari inject edip kullansin
- [ ] Playing test: oyun baslangic + state maskeleme

##### F2E-2 — Server flow/ extraction

**Dosyalar:**
- `server/src/game/flow/PlayCardHandler.ts` (~120)
- `server/src/game/flow/ResolveBluffHandler.ts` (~150)
- `server/src/game/flow/RefillOrEndHandler.ts` (~80)

- [ ] 3 dosya olustur, game.service.ts'den cikar
- [ ] ResolveBluffHandler icinde private metotlar (Pass/CallReal/CallFake)
- [ ] Playing test: kart oynama + blof + el sonu

##### F2E-3 — Server timer extraction

**Dosya:** `server/src/game/timers/BluffTimer.ts` (~40)

- [ ] game.gateway.ts'deki startBluffTimer/clearBluffTimer cikar
- [ ] Playing test: 30s timeout

##### F2E-4 — Server final: gateway/service trim

**Hedef:** game.gateway.ts ~150, game.service.ts ~100.

- [ ] Gateway sadece routing (handlers thin)
- [ ] Service sadece orchestrator (tum logic handler'larda)
- [ ] Playing test: tam oyun akisi ayni

---

### REFACTOR KURALI — Uygulama Sirasi

**Onemli:** Her alt-faz playing test ile dogrulanmali. Bir sonraki faza gecmeden mevcut davranisin bozulmadigi kontrol edilmeli.

**Sira:**
1. FAZ 2A (foundation) — diger fazlar buna bagli
2. FAZ 2B (UI) — paralel F2C ile baslanabilir
3. FAZ 2C (effects) — F2B ile paralel
4. FAZ 2D (game module) — F2A/2B/2C bittikten sonra
5. FAZ 2E (server) — istedigimiz zaman, client paralel calisabilir

**Game-feel (I-GF) maddeleri:** Refactor bitince hedef dosyalar var olacak.
Yeni kod zaten kucuk dosyalara gider — GameScreen'e eklenmez.

---

## BUG — Oncelikli Duzeltmeler

### B1 — Blof PASS: Pile + kartlar yanlis kisiye gidiyor

Puan ve siralama dogru calisiyor ama PASS sonrasi pile (kartlar) yanlis oyuncuya veriliyor
ve collect animasyonu yanlis yone gidiyor. Ayni sorunun server (sahiplik) ve client (animasyon) tarafi.

- [X] Server: `resolveBluff()` → PASS case'inde pile blofcuya atanmali
- [X] Client: `_collectWinnerId` → collect animasyonu blofcu yonune gitmeli
- [X] Playing test: PASS → pile blofcuya gidiyor + animasyon dogru yon

### B2 — Reveal text hardcoded puan uyumsuzlugu

Blof CALL reveal'inda gosterilen "+20 GERCEK!" yazisi hardcoded.
Gercek puan serverdan gelen blufferDelta'ya gore degisir:

| Durum | Gercek puan | Su an gosterilen |
|-------|-------------|------------------|
| CALL + rank match | +20 | "+20 GERCEK!" ✓ |
| CALL + wildcard+normal | +0 | "+20 GERCEK!" ❌ |
| CALL + wildcard+wildcard | +100 | "+20 GERCEK!" ❌ |
| CALL + sahte (fake) | caller +10 | "YAKALANDI!" (no puan) |

**Kaynak:** `BluffController.ts:178` — hardcoded string
**Kok sebep:** `BluffResolvedData` event'inde delta bilgisi yok

> ⚠️ **NOT:** Ilk 2 task F2A-1 (REFACTOR) ile otomatik tamamlanir.
> B2'ye gelindiginde sadece client tarafi (2 task) kalmis olacak.

- [ ] ~~Server: `BluffResolvedData` tipine `blufferDelta` + `callerDelta` ekle~~ → **F2A-1 ile done**
- [ ] ~~Server: `game.gateway.ts` bluffResolved emit'inde delta'lari gonder~~ → **F2A-1 ile done**
- [ ] Client: `BluffController.onResolved` → delta'yi kullanarak dinamik text olustur
- [ ] Caller kazaninca `"+N YAKALANDI!"` formatinda text (caller puanini gosterir)
- [ ] Playing test: 3 farkli senaryo (+20, +100, +0) ve sahte yakalama

### B3 — Score panel reveal oncesi guncelleniyor (sync yok)

Event sirasi: `scoreUpdate` → `bluffResolved` → `roomState`.
`roomState` geldiginde `score.updateScores` tetiklenir ve sol panelde yeni skor hemen gosterilir.
Kullanici dramatik reveal ANIMAsonu baslamadan "+100" puani sol panelde gorur.

**Senaryo:** Blof CALL + wildcard+wildcard (+100)
- t=0: scoreUpdate toast ortada gorunur ("+100")
- t=0: roomState ile playerScoreLabel = "100" (sol panel)
- t=0.3: dim overlay aciliyor
- t=2.0: flip bitiyor, "+20 GERCEK!" yazisi cikiyor (uyumsuzluk!)

**Kaynak:** `GameScreen.ts` renderState → `score.updateScores` her zaman calisir
**Kok sebep:** Reveal devam ederken score panel guncelleniyor

- [ ] Client: `ScoreDisplay.updateScores` → `_bluffRevealing=true` iken deferred update
- [ ] Reveal bitince deferred score guncellemelerini flush et
- [ ] Alternatif: BluffController reveal bitince scoreDisplay.flushDeferredScores() cagirsin
- [ ] Playing test: blof CALL sonrasi skor reveal ile ESZAMANLI guncellenir

### B4 — Toast + result label pozisyon cakismasi

Score toast (`ScoreDisplay.showToast`) ve reveal result label (`BluffController.showResultText`) cakiliyor:

| Eleman | Pozisyon | Boyut |
|--------|----------|-------|
| Toast | y = height/2 - 40 | fontSize 36 |
| Result label | y = height/2 - 80 | fontSize 72 |

**Senaryo:** Blof CALL esnasinda scoreUpdate geldiginde:
- t=0: toast cikar (ekran ortasi)
- t=2.0: result label cikar (40px yukarida)
- Her ikisi ayni anda 800ms+ birlikte gorunur → gorsel clutter

**Kok sebep:** Toast reveal sirasinda suppress edilmiyor.

- [ ] Client: `ScoreDisplay.onScoreUpdate` → `_bluffRevealing=true` iken toast GOSTERME
- [ ] Alternatif: Reveal sirasindaki scoreUpdate'leri kuyruga al, reveal bitince goster
- [ ] Playing test: blof CALL reveal akisi sirasinda ayni pozisyonda 2 yazi gozukmesin

### B5 — animLayer z-index tutarsizligi

animLayer cross-container animasyonlar icin kullanilan en ust katman (kart ucusu). Ancak:

**Sorunlu noktalar:**
- `ScoreDisplay.ts:201` — `this.screen.addChild(toast)` → toast animLayer ustune cikar
- `ScoreDisplay.ts:175` — `this.screen.addChild(this.scorePanel)` → panel animLayer ustune cikar
- Diger `screen.addChild` yerleri animLayer'i tepeye iade etmez

**Senaryo:** Toast acikken collect animasyonu baslar → kart toast'in ALTINDAN ucar → kart gozukmez

**Kok sebep:** Merkezi layer management yok, her fonksiyon kendi ekler.

> ✅ **NOT:** B5 **F2A-2 (LayerManager)** ile otomatik cozulur.
> LayerManager tum `addChild` cagrilarini merkezi yonetir, animLayer her zaman tepede.
> F2A-2 bittikten sonra B5'in manuel task'ina gerek kalmaz — sadece playing test yap.

- [ ] ~~Client: `ScoreDisplay.showToast` → toast ekledikten sonra animLayer tepeye~~ → **F2A-2 ile done**
- [ ] ~~Client: `ScoreDisplay.togglePanel` → scorePanel ekledikten sonra animLayer tepeye~~ → **F2A-2 ile done**
- [ ] ~~Client: Her `screen.addChild` sonrasi enforce: `setChildIndex(animLayer, last)`~~ → **F2A-2 ile done**
- [ ] Playing test: Toast acikken pile toplama → kartlar toast onunde ucuyor mu

### B6 — Multiple toast stacking

Tek hamlede birden fazla `scoreUpdate` gelirse (ornek: pile alindi + pisti + card values),
toast'lar AYNI pozisyonda ust uste biner, okunmaz.

**Senaryo:** Pisti yapildi → scoreUpdate olaylari:
1. Kart deger puani (+2 C2)
2. Pisti bonus (+10)
3. (opsiyonel) Flush bonus dagitimda

Hepsi ayni anda ayni pozisyonda belirir.

**Kok sebep:** Toast queue/offset yok.

> ✅ **NOT:** B6 **F2C-5 (ScoreToast)** ile otomatik cozulur.
> F2C-5 task'inda zaten "activeToasts[] yonetim (B6 temel)" yaziyor — yeni ScoreToast
> dosyasi queue/offset sistemini barindiracak. F2C-5 bittikten sonra B6 manuel fix'e
> gerek kalmaz — sadece playing test yap.

- [ ] ~~Client: `ScoreDisplay` → `activeToasts[]` array tut~~ → **F2C-5 ile done**
- [ ] ~~Yeni toast eklenirken aktif toast sayisina gore y offset (ornek: i × 50px asagida)~~ → **F2C-5 ile done**
- [ ] ~~Toast kaybolunca array'den cikar ve diger toast'larin pozisyonunu guncelle~~ → **F2C-5 ile done**
- [ ] Playing test: Ard arda scoreUpdate gelince toast'lar okunur sekilde gozuksun

---

## IMPROVEMENT — Iyilestirmeler

### UI

#### I-U1 — Kart gorselleri degisimi

Mevcut kart sprite'lari degistirilecek. Yeni kart seti entegre edilecek.

- [x] Yeni kart asset'leri sec/tasarla
- [x] `raw-assets/` → AssetPack ile spritesheet olustur
- [x] `cardMapping.ts` → yeni frame isimlerine guncelle

#### I-U2 — Background yenileme

Yesil duz renk yerine daha atmosferik bir masa gorunumu.

- [ ] Yeni background asset'i (masa dokusu, vignette, isik efekti)
- [ ] GameScreen'e background sprite ekle

#### I-U3 — Skor paneli iyilestirme

Sol ustteki skor gosterimi cok minimal. Pisti sayisi da gosterilmeli.

- [ ] Her oyuncunun pisti sayisini takip et (server state'e ekle)
- [ ] Skor paneline pisti sayaci ekle
- [ ] Gorsel: ikon + sayi formati

#### I-U4 — PASS / BLOF yazisi belirgin degil

Blof panelindeki butonlar ve yazilar yeterince dikkat cekici degil.

- [ ] Buton boyutlarini buyut
- [ ] Renk kontrasti artir (CALL = kirmizi, PASS = yesil/gri)
- [ ] Timer gostergesini daha belirgin yap (buyuk font, pulse efekti)

#### I-U5 — Sira gostergesi (turn indicator)

Siranin kimde oldugu net belli olmuyor.

- [ ] Aktif oyuncunun el bolgesinde parlama efekti
- [ ] "Senin Siran" / "Rakip Oynuyor..." yazisi daha belirgin
- [ ] Sira gecisinde kisa gorsel gecis animasyonu

#### I-U6 — Deste gorseli

Sol ustte "Deste: 96" sadece yazi. Gorsel bir deste ikonu olmali.

- [ ] Deste ikonu (kart yigini sprite) + azalan sayi
- [ ] Kart dagitilinca desteden kart cikar animasyonu (opsiyonel)

#### I-U7 — Ekran gecis animasyonlari

Lobby → Game → GameOver arasi gecisler keskin, puruzsuz olmali.

- [ ] Fade-in / fade-out gecis efekti (300-400ms, ease-in-out)
- [ ] Navigation plugin'e gecis animasyonu ekle

---

### GAME FEEL

> **Hedef dosya rehberi (Faz 2 refactor sonrasi):**
>
> | Madde | Hedef dosya |
> |-------|-------------|
> | I-GF0 reveal | `effects/RevealEffect.ts` |
> | I-GF1 pile stacking | `ui/TableArea.ts` |
> | I-GF2 kart oynama | `effects/PlayEffect.ts` |
> | I-GF3 eslesmedi feedback | `effects/PlayEffect.ts` + `ui/TableArea.ts` |
> | I-GF4 pile toplama | `effects/CollectEffect.ts` |
> | I-GF5 puan efektleri | `effects/ScoreToast.ts` |
> | I-GF6 blof gerilim | `ui/BluffPanel.ts` + `effects/RevealEffect.ts` |
> | I-GF7 kart dagitim | `effects/DealEffect.ts` |
> | I-GF8 oyun sonu | `screens/GameOverScreen.ts` |
> | I-GF9 kart secim | `game/CardSelector.ts` + `ui/HandArea.ts` |
> | I-GF10 rakip gostergesi | `ui/HandArea.ts` + `ui/TurnIndicator.ts` |
> | I-GF11 deste azalma | `ui/DeckCounter.ts` |
>
> **Tamamlanma kriteri:** Her madde playing test ile dogrulanir.
> Animasyonlar oynanir, spec'teki his saglanir. Kullanici "tamam" derse done.

> **Tempo Felsefesi:** Oyunun ritmi aksiyona gore degisir.
> Normal oyun hizli ve akici, blof ani yavas ve gerilimli.
> Bu tempo farki oyuncuya "onemli bir sey oluyor" hissini verir.
>
> | Aksiyon                       | Tempo                | Sure                    |
> | ----------------------------- | -------------------- | ----------------------- |
> | Kart oynama (elden masaya)    | Hizli, akici         | 300-400ms               |
> | Rakip kart oynama             | Hizli, kart acilmasi | 400-500ms               |
> | Pile toplama                  | Orta, tatmin edici   | 500-700ms               |
> | Kart dagitimi (el basi)       | Ritmik, sirayla      | kart basi 100-150ms     |
> | Blof: kapali kart atma        | Yavas, agirlikli     | 600-800ms + 300ms pause |
> | Blof: CALL reveal (kart acma) | En yavas, dramatik   | 1000-1500ms             |
> | Blof: PASS sonucu             | Orta, rahatlama      | 500-600ms               |
> | Pisti toplama                 | Orta + kutlama       | 700ms + efekt           |
> | Sira gecisi                   | Anlik, kesintisiz    | 200ms                   |

#### I-GF0 — Blof Reveal Ani (Oyunun Kalbi)

CALL sonrasi kartin acilmasi oyunun en dramatik ani. Poker'deki showdown'a esit.
Bu an oyuncuya "hersey bu ana bagliyor" hissini vermeli.

**Reveal akisi (adim adim):**

1. Ekran kararir: siyah overlay %40 opacity (300ms fade-in)
2. Masa disindaki tum elemanlar hafif blur olur (odak masaya cekilir)
3. Dramatik pause: 500ms bekleme (gerilim zirve yapar)
4. Kart yavasca cevrilir: 1-1.5s flip animasyonu (normal flip'in 3 kati yavas)
5. Sonuc efekti gosterilir (asagida detay)
6. Sonucu sindirme suresi: 800ms pause (oyuncu sonucu okur)
7. Pile toplama animasyonu baslar (kartlar kazanana gider)
8. Overlay kalkar (400ms fade-out)
9. Normal oyun devam eder

- [x] Adim 1-3: overlay + blur + pause
- [x] Adim 4: yavas flip animasyonu
- [x] Adim 5a — sonuc gercek pisti:
  - Kart acilir → parlama efekti (beyaz flash, 200ms)
  - Buyuk yazi: "+20 GERCEK!" (scale 0→1 bounce, sonra fade-out)
  - Screen shake (hafif, 300ms)
  - ~~Ses: zafer "sting" sesi~~ (I-S2'de eklenecek)
- [x] Adim 5b — sonuc sahte (yakalandi):
  - Kart acilir → kirmizi tint flash (200ms)
  - Buyuk yazi: "YAKALANDI!" (scale 0→1, kirmizi renk)
  - Blofcunun el bolgesi kisa kirmizi flash
  - ~~Ses: "busted" sesi~~ (I-S2'de eklenecek)
- [x] Adim 6-9: sindirme → pile toplama → overlay kaldir → devam

#### I-GF1 — Kart yiginlama gorunumu (pile stacking)

Kartlar cok ust uste geliyor, hangi kartin ustune ne geldigi belli olmuyor.
Oyuncuya "masada gercek kartlar var" hissini vermeli.

- [ ] Her atilan kart oncekinin ustune hafif offset ile binmeli (3-5px x/y + 2-4 derece rotation)
- [ ] Son atilan kart en ustte, alttaki kartlarin kenarlari gorunmeli
- [ ] Pile 5+ kart olunca compact moda gec (offset azalir, kenarlari hala gorulsun)
- [ ] Pile uzerinde kart sayisi gostergesi (kucuk badge: "x7")

#### I-GF2 — Kart oynama animasyonu

Kart atildiginda elden masaya gecis agirlikli ve tatmin edici hissettirmeli.
Kartın "fiziksel bir nesne" oldugu hissi verilmeli.

- [ ] Kart elden kalkar → masaya dogru ucar (300-400ms, ease-out)
- [ ] Ucus sirasinda hafif rotation (5-10 derece, rastgele yon)
- [ ] Masaya varinca kucuk bounce (scale 1.05→1.0, 150ms, elastic ease)
- [ ] Masaya dusunce hafif golge genislemesi (kart "indi" hissi)
- [ ] Rakip kart oynadiginda: kapali kart gelir → masada acilir (kisa flip, 300ms)

#### I-GF3 — Kart eslesmedi geri bildirimi

Kart atildi ama eslesmedi — pile'a dustu, hicbir sey olmadi.
Bu sessizlik onemli: eslesen anlarin degerini bu kontrast yaratir.

- [ ] Kart masaya dusunce kisa, tok "tuk" sesi (tatmin edici degil, notr)
- [ ] Kart masaya yavasca oturur (bounce yok, sadece ease-out landing)
- [ ] Pile sayisi badge'i +1 artar (kucuk sayi degisimi, animasyonsuz)
- [ ] Hicbir parlama, shake, floating text yok — kasitli sessizlik

#### I-GF4 — Pile toplama animasyonu

Eli kazanmak tatmin edici hissettirmeli — "bu kartlar artik benim" duygusu.
Pile ne kadar buyukse odül o kadar agresif hissettirmeli.

- [ ] Kartlar tek tek kazanan tarafa ucmali (staggered, kart basi 80ms arayla)
- [ ] Her kart ucerken hafif rotation + scale kuculme (uzaklasma hissi)
- [ ] Toplama sonunda skor alaninda kisa pulse efekti (scale 1.0→1.15→1.0, 200ms)
- [ ] Pisti ise ozel: masada buyuk parlama + "PISTI!" yazisi (1s goruntulenir)
- [ ] Pile buyuklugune gore skala:
  - 2-3 kart: normal toplama, sakin
  - 4-6 kart: biraz daha hizli ucus + hafif screen shake
  - 7+ kart: hizli ucus + belirgin shake + buyuk floating text "x{sayi}!"

#### I-GF5 — Puan kazanma efektleri

Her puan degisimi oyuncuya "bir sey kazandim" hissi vermeli.
Puan ne kadar buyukse efekt o kadar agresif olmali.

- [ ] Floating text: puan kaynagindan yukari suzerek kaybolur (800ms, ease-out)
  - Kucuk puan (+2, +3): beyaz, kucuk font, sakin
  - Orta puan (+10, +20): sari/altin, orta font, hafif bounce
  - Buyuk puan (+50, +100): altin, buyuk font, glow efekti + screen shake
- [ ] Pisti: "+10 PISTI!" yazisi masanin ustunde (buyuk, sari, 1s goruntulenir)
- [ ] Jackpot pisti (+50): ozel kutlama (particle patlamasi + buyuk shake + altin flash)
- [ ] Mevcut shake efekti korunsun, ustune floating text eklensin

#### I-GF6 — "Kapali Oyna" butonu + blof gerilim efektleri

Blof tetik ani: oyuncu "Kapali Oyna"ya bastiginda cesaretini hissetmeli.
Sonrasinda karar beklenirken "hersey askida" gerilimi olmali.
Normal oyun temposundan kopus — yavasla, karar, gerilim.

- [ ] "Kapali Oyna" butonu gorunumu:
  - Normal butonlardan farkli renk (koyu mor/kirmizi, gizemli his)
  - Buton gorunurken hafif pulse animasyonu ("cesaretin var mi?" daveti)
  - Basinca kisa haptic-style efekt (scale 0.95→1.0, 100ms)
- [ ] Kapali kart masaya dustugunde:
  - Kart normal hizin 2 kati yavas gelir (600-800ms)
  - Masaya dustugunde 300ms dramatik pause (hicbir sey hareket etmez)
  - Kart masada face-down durur, hafif titresim (breathing efekti, subtle scale 1.0↔1.02)
- [ ] Blof paneli acilirken:
  - Ekran %20 kararir (dim overlay, 300ms fade-in)
  - Panel ortadan buyuyerek gelir (scale 0.8→1.0, 200ms, ease-out)
- [ ] Timer son 5 saniyede:
  - Yazi kirmiziya doner
  - Pulse hizlanir (1s aralik → 0.5s → 0.3s)
  - Son 3 saniyede hafif screen shake baslar
- [ ] PASS sonucu:
  - Kartlar blofcuya kayar (normal toplama animasyonu)
  - "Basarili Blof!" floating text (yesil, 800ms)
  - Dim overlay kalkar (300ms fade-out)

#### I-GF7 — Kart dagitim animasyonu

Her elin basinda kartlarin gelisi ritmik ve beklenti yaratan bir an olmali.
"Yeni kartlar geliyor, simdi ne gelecek?" heyecani.

- [ ] Desteden tek tek kayarak dagitim (kart basi 120ms arayla)
- [ ] Her kart ust koseden elin pozisyonuna ucar (ease-out)
- [ ] Oyuncunun kartlari gelince face-up acilir (50ms flip)
- [ ] Rakip kartlari kapali olarak ayni sekilde dagitilir
- [ ] Her kart gelirken kucuk "thwip" sesi

#### I-GF8 — Oyun sonu deneyimi

Oyun bittiginde galip net belli olmali, kaybeden ezilmemeli.

- [ ] Kazanan: altin parlama + confetti particle efekti (2-3s)
- [ ] Kaybeden: hafif desaturasyon (renk solmasi, agresif degil)
- [ ] Berabere: iki tarafa da nötr efekt (mavi/beyaz ton, "Berabere!" yazisi)
- [ ] Skor ozeti animasyonlu: sayilar 0'dan yukari sayarak gosterilir (200ms/sayi)
- [ ] Skor farki buyukse ekstra efekt (confetti yogunlugu artar)
- [ ] "Tekrar Oyna" butonu belirgin, pulse efekti ile dikkat cekici

#### I-GF9 — Kart secim geri bildirimi

Oyuncu kartini secerken "bu karti tutuyorum, oynamaya hazirim" hissi.

- [ ] Hover: kart 8px yukari kalkar + hafif parlama (glow outline, 150ms, ease-out)
- [ ] Secim: kart 20px yukari cikar + belirgin glow (mavi/beyaz outline)
- [ ] Secilmis kart hafif "soluk alip verme" animasyonu (subtle scale 1.0↔1.02, 1.5s loop)
- [ ] Diger kartlar hafif soluk kalir (opacity 0.7) — secili kart one cikar

#### I-GF10 — Rakip davranis gostergesi

Rakibin ne yaptigini bilmek gerilimi arttirir, belirsizligi azaltir.

- [ ] Rakip sirasiyla: kartlarinin uzerinde "..." thinking dots animasyonu
- [ ] Rakip kart sectiginde (hover): secili kartin hafif hareket etmesi (3px kaldir)
- [ ] Blof kararinda beklerken: timer + blof paneli gorunur (rakibin dusundugu belli)

#### I-GF11 — Deste azalma gerilimi

Deste azaldikca "son kartlar, her hamle kritik" hissi verilmeli.
Oyunun sonuna yaklastikca gorsel ve isitsel gerilim artmali.

- [ ] Deste sayaci renk degisimi:
  - Normal (20+ kart): beyaz, sakin
  - Azaliyor (8-20 kart): sari/turuncu, hafif pulse
  - Son kartlar (1-8 kart): kirmizi, hizli pulse
- [ ] Son dagitimda (F3 ile birlikte): deste ikonu titrer + "SON EL!" banner
- [ ] Deste 0 olunca: deste gorseli kaybolur (fade-out, 300ms)

---

### SOUND

#### I-S1 — Kart sesleri

- [ ] Kart oynama: kartin masaya dustugu "tok" sesi (kisa, net)
- [ ] Kart dagitim: sirayla hizli "svip" sesleri (her kart icin)
- [ ] Pile toplama: kartlari toplama sesi (kagit surume/yigin sesi)

#### I-S2 — Oyun olaylari sesleri

- [ ] Pisti: tatmin edici "ding" + kisa melodi (200ms)
- [ ] Jackpot pisti: buyuk odul sesi (coin/jackpot jingle, 500ms)
- [ ] Blof kapali kart: dusuk tonlu "thud" (gerilim yaratir)
- [ ] CALL: dramatik reveal sesi (davul roll + acilma, 1s)
- [ ] PASS: yumusak "swipe" sesi (rahatlama hissi)

#### I-S3 — Oyun sonu sesleri

- [ ] Kazanma: kisa zafer fanfari (tatmin edici ama abartisiz, 1.5s)
- [ ] Kaybetme: hafif minör akor (uzuntu ama motivasyon kirici degil, 1s)

---

### STABILITE

#### I-ST1 — Socket guvenilirligi (2 kisilik)

Mevcut socket davranisi 2 kisi icin guvenilir olmali.

- [ ] Reconnect senaryolarini test et (30s grace period)
- [ ] Blof timer reconnect sonrasi dogru devam etmeli
- [ ] Oyun ortasinda disconnect → reconnect → state restore
- [ ] Rate limiting: ayni kart 2 kez oynanamaz (spam koruma)

#### I-ST2 — Error handling

- [ ] Server hatalarini client'a anlasilir mesajla gonder
- [ ] Client'ta toast/banner ile hata goster (3s sonra kapat)
- [ ] Socket kopma durumunda gorsel geri bildirim

---

## FEATURE — Yeni Ozellikler

### F1 — Wildcard Bonus (Sans Puani)

Dagitimda elde 3+ wildcard (J veya Joker) gelirse ekstra puan.
Dagitim sirasinda kontrol edilir (`checkFlushBonus` gibi).
Cift destede 13 dagitim turu var — her turda kontrol edilir.

- Gecerli kombinasyonlar: 3x J, 2x J + 1x Joker, 1x J + 2x Joker, 3x Joker
- Puan: ___ (belirlenecek)

- [ ] Server: `scoring.ts` → `checkWildcardBonus(hand, config)` fonksiyonu
- [ ] Server: `game.service.ts` → dagitimda kontrol et
- [ ] Client: bonus animasyonu (floating text + ozel efekt)
- [ ] Docs: `05_SCORING_GUIDE.md` → yeni senaryo satiri ekle

### F2 — Tekrar Oyna (Rematch)

GameOver ekraninda "Tekrar Oyna" butonu.

- [ ] Client: GameOverScreen → "Tekrar Oyna" butonu ekle
- [ ] Server: ayni oda + ayni config ile yeni oyun baslat
- [ ] Iki oyuncu da "Tekrar Oyna" derse → restart

### F3 — Son El Bildirimi

Son dagitimda "Son El!" gostergesi.

- [ ] Server: son dagitimi tespit et (deck bos kalacak)
- [ ] Client: buyuk "SON EL!" banner animasyonu (ortada, 1.5s, scale bounce)

### F4 — Blof Kural Degisikligi: J/Joker = Sahte Blof

**Bu feature en sona birakilacaktir.**

Mevcut kural: J/Joker ile blof yapilip rakip CALL derse, wildcard eslesmesine gore puan verilir.
Yeni kural: Blof'ta sadece rank eslesmesi "gercek" sayilir. J/Joker ile yapilan blof = sahte blof.

**Mevcut puanlama (degisecek):**

| Durum                                  | Blofcu | Caller | Pile        |
| -------------------------------------- | ------ | ------ | ----------- |
| CALL + gercek (rank eslesmesi)         | +20    | 0      | Blofcu alir |
| CALL + gercek (wildcard + normal kart) | 0      | 0      | Blofcu alir |
| CALL + gercek (wildcard + wildcard)    | +100   | 0      | Blofcu alir |

**Yeni puanlama:**

| Durum                          | Blofcu | Caller | Pile        |
| ------------------------------ | ------ | ------ | ----------- |
| CALL + gercek (rank eslesmesi) | +20    | 0      | Blofcu alir |
| CALL + J/Joker (sahte blof)    | 0      | +10    | Caller alir |

> J/Joker blof'ta artik "gercek pisti" sayilmaz. Sadece rank eslesmesi gecerli.
> PASS davranisi degismez (blofcu hala +10/+30 alir, pile blofcuya gider).

- [ ] Server: `isRealPisti()` → wildcard eslesmesini `false` dondur
- [ ] Server: `calcBluffScore()` → wildcard CALL case'lerini kaldir
- [ ] Tum docs guncelle: `CLAUDE.md`, `01_MASTER.md`, `05_SCORING_GUIDE.md`, `.claude/rules/game-rules.md`
- [ ] Playing test: J ile blof yap → rakip AC → caller +10, pile caller'a

---

## ONCELIK SIRASI

| Grup                     | Oncelik      | Aciklama                                    |
| ------------------------ | ------------ | ------------------------------------------- |
| REFACTOR Faz 1           | 0 - ONKOŞUL | GameScreen ayirma — DONE                   |
| BUG (B1)                 | 1 - ACIL     | Pile/kart yonu bozuk — DONE                 |
| I-GF0                    | 2 - YUKSEK   | Blof reveal — DONE (refactor sirasinda effects/RevealEffect'e tasinacak) |
| REFACTOR Faz 2A          | 2.1 - ACIL  | Foundation: BluffResolvedData + LayerManager + DeferredActions + events + constants |
| REFACTOR Faz 2B          | 2.2 - ACIL  | UI component extraction (7 dosya)           |
| REFACTOR Faz 2C          | 2.3 - ACIL  | Effects extraction (7 dosya)                |
| REFACTOR Faz 2D          | 2.4 - YUKSEK | GameScreen iskelet (~100 satir hedef)      |
| REFACTOR Faz 2E          | 2.5 - YUKSEK | Server refactor (state + flow + timers)     |
| BUG (B2, B3, B4)         | 2.6 - ACIL   | UI sync bugs (refactor sonrasi 10x kolay)   |
| BUG (B5, B6)             | 2.7 - YUKSEK | Z-index + toast (F2A LayerManager ile bag)  |
| I-U4, I-U5               | 3 - YUKSEK   | Blof paneli + sira gostergesi net olmali    |
| I-GF1, I-GF2, I-GF3      | 4 - YUKSEK   | Kart yiginlama + oynama + eslesmeme hissi   |
| I-GF6                    | 5 - YUKSEK   | Blof gerilim efektleri (reveal'i tamamlar)  |
| F1                       | 6 - ORTA     | Wildcard bonus                              |
| I-GF4, I-GF5             | 7 - ORTA     | Pile toplama (skalalanir) + puan efektleri  |
| I-GF7, I-GF9, I-GF10     | 8 - ORTA     | Dagitim, secim, rakip gostergesi            |
| I-GF11                   | 9 - ORTA     | Deste azalma gerilimi                       |
| I-S1 — I-S3             | 10 - ORTA    | Ses tasarimi                                |
| I-U1 — I-U3, I-U6, I-U7 | 11 - ORTA    | Gorsel yenileme (asset + gecisler)          |
| I-GF8                    | 12 - NORMAL  | Oyun sonu deneyimi                          |
| F2, F3                   | 13 - NORMAL  | Rematch, son el bildirimi                   |
| I-ST1, I-ST2             | 14 - NORMAL  | Socket guvenilirligi                        |
| F4                       | 15 - EN SON  | Blof kural degisikligi (J/Joker = sahte)    |

---

## DOCS GUNCELLEME KURALI

> Her tamamlanan madde sonrasi ilgili docs kontrol edilmeli:
>
> | Degisiklik turu          | Guncellenmesi gereken docs                                                                                     |
> | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
> | Yeni scoring fonksiyonu  | `CLAUDE.md`, `05_SCORING_GUIDE.md`, `.claude/rules/game-rules.md`                                        |
> | Blof kural degisikligi   | `CLAUDE.md`, `01_MASTER.md`, `05_SCORING_GUIDE.md`, `.claude/rules/game-rules.md`, `00_INTRODUCE.md` |
> | Yeni UI component/dosya  | `03_CLIENT.md`, `01_MASTER.md` (yapi agaci)                                                                |
> | Server state degisikligi | `02_SERVER.md`, `04_STATUS_REPORT.md`                                                                      |
> | Refactor (dosya ayirma)  | `03_CLIENT.md` (klasor yapisi), `CLAUDE.md` (yapi)                                                         |

---

## SCOPE DISI (v1'de YAPILMAYACAK)

- Auth/otorite sistemi (JWT, kullanici kaydi)
- Oda kurma/secme (coklu oda)
- 4 kisilik oyun
- Veritabani (PostgreSQL, Redis)
- Leaderboard / istatistikler
- Oyun ici satin alma / ekonomi
- Mobil uygulama
