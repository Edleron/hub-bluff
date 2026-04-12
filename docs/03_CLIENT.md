# Bluff - Client Rehberi (PixiJS + Vite)

Tek frontend: Lobby UI + Oyun Ekrani, hepsi PixiJS icinde.

## Ekranlar

### LoadScreen
- Asset preload (kart gorselleri, arka plan)
- Yukleme bari

### LobbyScreen
- Token butonlari (edleron / wilkagul)
- Host: deste tipi (Tek/Cift) + blof toggle (Acik/Kapali) ayarlari → "Hazirim"
- Guest: direkt odaya katilir, ayar gormez
- Rakip bekleme durumu
- `reset()` ile BigPool reuse destegi

### GameScreen (~1340 satir, ana oyun ekrani)
- Socket baglantisi (token ile)
- Oyuncu eli (4 kart, alt kisim) — tikla ile sec, tekrar tikla ile oyna
- Rakip eli (4 kapali kart, ust kisim)
- Masa (ortada, pile + top card)
- Skor gostergesi (oyuncu + rakip + deste)
- Sira gostergesi (turn indicator)
- **Kapali Oyna butonu**: pisti durumunda (pile=1) secili kart varken gorunur
- **Blof paneli**: rakip blof yaptiginda "Ac!" / "Gec" butonlari + 30s geri sayim
- Animasyon pipeline: play → collect → deal → gameOver (sirayla, deferred)
- Reconnection: socket kesilirse otomatik yeniden baglanir ve odaya katilir

### GameOverScreen
- Kazanan/kaybeden gosterimi
- Skor ozeti
- "Lobiye Don" butonu
- `reset()` ile BigPool reuse destegi

## Socket Entegrasyonu

```typescript
// SocketService.ts (singleton)
connect(token) → io('ws://server/game', { auth: { token } })
joinRoom(roomId)
playCard(cardId, isHidden)
bluffDecision('CALL' | 'PASS')

// S2C Dinleme
on('roomState')    → GameScreen.renderState(state)
on('yourHand')     → GameScreen.onYourHand(cards)
on('cardPlayed')   → GameScreen.onCardPlayed(data) — rakip oynayinca
on('bluffRequest') → GameScreen.showBluffPanel() — blof karar paneli
on('bluffResolved')→ GameScreen.onBluffResolved(data) — blof sonucu + kart acma
on('scoreUpdate')  → GameScreen.onScoreUpdate(data) — puan animasyonu
on('gameOver')     → GameOverScreen'e gec
on('error')        → Hata mesaji

// Reconnect
on('connect')      → ilk baglantida onConnectCb, sonrakilerde onReconnectCb
```

## Blof UI Akisi

1. **Oyuncu tarafinda (blof yapan):**
   - Kart secilir → masada 1 kart varsa "Kapali Oyna" butonu gorunur
   - Butona basilir → `playCard(cardId, isHidden=true)` server'a gider
   - Kart animasyonu oynar, masa uzerinde kapali kart gosterilir

2. **Rakip tarafinda (karar veren):**
   - Server'dan `bluffRequest` gelir → blof paneli acilir
   - 30 saniye geri sayim baslar (`bluffTimerLabel`)
   - "Ac!" → `bluffDecision(CALL)` | "Gec" → `bluffDecision(PASS)`
   - Timeout → server otomatik PASS yapar

3. **State guncelleme:**
   - BLUFF_PHASE'de: masada kapali kart gosterilir (face-down sprite)
   - `topCard` olarak ground card gosterilir (blof karti degil — server maskeler)
   - Phase degisince blof paneli kapanir, timer durur

## Klasor Yapisi

```
client/
├── src/
│   ├── main.ts              → Vite entry, PixiJS Application setup
│   ├── app/
│   │   ├── getEngine.ts     → Engine singleton erisimt
│   │   ├── screens/
│   │   │   ├── LoadScreen.ts
│   │   │   ├── LobbyScreen.ts
│   │   │   ├── GameScreen.ts
│   │   │   └── GameOverScreen.ts
│   │   ├── ui/
│   │   │   ├── Button.ts
│   │   │   ├── Label.ts
│   │   │   └── RoundedBox.ts
│   │   └── popups/
│   │       ├── PausePopup.ts
│   │       └── SettingsPopup.ts
│   ├── engine/              → Navigation, resize, audio, state plugins
│   ├── game/
│   │   ├── session.ts       → Oyuncu token, playerId, roomId
│   │   ├── index.ts         → Barrel export
│   │   ├── components/
│   │   │   └── CardSprite.ts → PerspectiveMesh ile 3D kart (flip, setCard, destroy)
│   │   ├── services/
│   │   │   ├── ApiService.ts  → HTTP calls (login)
│   │   │   ├── SocketService.ts → Socket.io client (singleton)
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── cardMapping.ts → Server ID (S7_0) → Client frame (7_spades.png)
│   │       └── index.ts
│   └── shared/              → Ortak tipler (server ile ayni, manual sync)
├── public/
│   └── assets/
│       ├── cards/           → 7_spades.png, K_hearts.png ...
│       └── back.png
├── vite.config.ts
└── tsconfig.json
```

## Animasyon Mimarisi

### GSAP Kurallari
- Sadece `gsap.to()` kullan — Timeline kullanma
- `onComplete` callback'leri ile siralama
- `onInterrupt: resolve` ile temiz iptal (ozellikle flip'lerde)
- `gsap.killTweensOf(target)` ile cleanup

### Kart Cevirme (Flip) — CardSprite
- `PerspectiveMesh` ile 3D perspektif efekti
- `setCorners()` ile koseleri GSAP animate eder
- `_flipGen` generation counter: concurrent flip corruption'i onler
- `killFlipTweens()`: mevcut flip tween'lerini iptal eder
- `destroy()` override: flip tween'leri temizler

### Animasyon Pipeline (GameScreen)
```
play animation → collect animation → deal animation → gameOver
```
Her adim onceki tamamlanana kadar defer edilir:
- `_deferredCollect`: play animasyonu bitene kadar collect beklenir
- `_deferredDealCards` / `_deferredOpponentDealCount`: collect bitene kadar deal beklenir
- `_deferredGameOver`: deal bitene kadar gameOver beklenir
- `animLayer`: cross-container kart hareketi icin ozel Container (toGlobal/toLocal ile koordinat donusumu)

## Notlar

- BigPool pattern: ekranlar tekrar kullanilir, `reset()` tum state'i temizlemeli
- CardSprite: `destroy()` override ile memory leak onlenir
- Pos, scale, animasyon, game feel → senior PixiJS developer halleder
- Step 2'de VFX eklenir (screen shake, particles, vignette, ses)
