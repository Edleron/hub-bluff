# Bluff — Durum Raporu ve Gelistirme Plani

**Tarih:** 2026-04-12 (guncelleme)
**Versiyon:** 0.0.1
**Durum:** Step 2 (Polish) aktif olarak gelistiriliyor

---

## 1. MEVCUT DURUM OZETI

### Tamamlanan Ozellikler

| Ozellik | Server | Client | Durum |
|---------|--------|--------|-------|
| 1v1 gercek zamanli oyun | ✅ | ✅ | Calisiyor |
| Kart dagitimi (4'er) | ✅ | ✅ | Calisiyor |
| Pisti algilama | ✅ | ✅ | Calisiyor |
| Blof mekanizmasi | ✅ | ✅ | Calisiyor (sadece pisti durumunda) |
| Blof timer (30sn) | ✅ | ✅ | Calisiyor |
| Kart maskeleme (rakip eli gizli) | ✅ | — | Calisiyor |
| Wildcard (J her zaman, Joker cift destede) | ✅ | ✅ | Calisiyor |
| DeckConfig sistemi (tek/cift deste) | ✅ | ✅ | Runtime secim CALISIYOR |
| Animasyonlar (dagitim, oynama, toplama) | — | ✅ | Calisiyor |
| 3D kart cevirme (PerspectiveMesh) | — | ✅ | Calisiyor |
| Username auth (edleron/wilkagul) | ✅ | ✅ | Calisiyor |
| Otomatik oda (tek sabit oda) | ✅ | ✅ | Calisiyor |
| Host/Guest sistemi | ✅ | ✅ | edleron=host, wilkagul=guest |
| Reconnect (30sn grace period) | ✅ | ✅ | Calisiyor |
| Docker local dev | ✅ | ✅ | Calisiyor |
| Deployment (Render + Cloudflare Pages) | ✅ | ✅ | Calisiyor |
| CI/CD ([deploy] keyword) | ✅ | ✅ | GitHub Actions |
| Versiyon gosterimi | ✅ | ✅ | Calisiyor |
| Kart deger puanlamasi | ✅ | ✅ | C2 +2, D10 +3, Flush A+K+Q +30, FoaK +50 |
| Pisti puanlama | ✅ | ✅ | Normal +10, Jackpot +50, Wildcard+normal 0 |
| Oyun sonu kart fazlasi (+5) | ✅ | ✅ | Calisiyor |
| Runtime config (deste + blof) | ✅ | ✅ | Host lobby'de secer |
| Eslestirme rank-only (tek+cift) | ✅ | ✅ | Duzeltildi |
| Cift deste 4 joker (108 kart) | ✅ | ✅ | Duzeltildi |
| Blof: pile her zaman birine gider | ✅ | ✅ | Duzeltildi |
| Blof: pile animasyonu dogru yone | ✅ | ✅ | CALL+Sahte fix (v0.0.5) |
| Puan shake efekti | — | ✅ | Puan artinca ekran sallanir |

### Kalan Ozellikler

| Ozellik | Oncelik | Aciklama |
|---------|---------|----------|
| Blof UI iyilestirme (P3-2) | ORTA | CALL'da kart flip, PASS'ta highlight, floating puan text |
| 4 kisilik oyun | SONRAKI FAZ | Layout, tur sirasi, blof akisi — Step 3 |

## GIRIS SISTEMI

Token girisi kaldirildi. Yerine username butonlari eklendi.

### Oyuncular

| Username | Rol | Yetkiler |
|----------|-----|----------|
| `edleron` | **Host** | Oyun ayarlarini secer (deste tipi, blof toggle) |
| `wilkagul` | **Guest** | Direkt odaya katilir, ayar yapmaz |

### Giris Akisi

**edleron (host):**
1. "edleron" butonuna tikla
2. Ayarlari sec: Deste (Tek/Cift) + Blof (Acik/Kapali)
3. "Hazirim" tikla → Rakip bekleniyor...

**wilkagul (guest):**
1. "wilkagul" butonuna tikla
2. Direkt → Rakip bekleniyor... (ayar gormez)

**Oyun:** Iki oyuncu da baglaninca otomatik baslar. Host'un ayarlari gecerlidir.

### Degistirilecek yer
- `server/src/shared/game.config.ts` → `PLAYER_TOKENS` array
- Username + isHost flag burada tanimli

---

## 2. DETAYLI KOD ANALIZI

### 2.1 Server Engine (server/src/engine/)

**deck.ts — Deste Olusturma**
- `createDeck(config)`: DeckConfig'e gore deste olusturur (tek/cift, jokerli/jokersiz)
- `shuffle()`: Fisher-Yates karistirma
- `dealHands(deck, playerCount, handSize=4)`: Cyclic dagitim
- `calcTotalCards(config)`: 52 * deckCount + jokers

**rules.ts — Oyun Kurallari**
- `isMatch(played, top, config)`: Her zaman rank-only eslestirme (**DUZELTILDI**)
- `isWildCard(card, config)`: J her zaman, JOKER sadece includeJokers=true ise
- `canTakePile(played, top, config)`: isMatch VEYA isWildCard
- `canBluff(pileCount, topCard)`: Sadece pileCount === 1 ise
- `isRealPisti(played, ground, config)`: Blof cozumlemede kullanilir

**scoring.ts — Puanlama**
- `calcBluffScore(played, ground, decision, config)`: Blof puanlama
  - PASS → blofcu +10, caller 0
  - CALL + gercek → blofcu +20, caller 0
  - CALL + sahte → blofcu 0, caller +10
- `calcCardValues(cards)`: Kart deger puanlamasi (C2 +2, D10 +3)
- `calcPistiBonus(played, top, config)`: Pisti bonusu (normal +10, jackpot +50)
- `calcHandBonus(hand, config)`: Flush A+K+Q +30, Four of a Kind +50
- `calcEndGameBonus(players)`: Kart fazlasi +5

### 2.2 Server Game Service (server/src/game/game.service.ts)

**GameState yapisi:**
```
roomId, phase, players[], currentTurnIndex, deck[], pile[],
deckConfig, bluffCard?, bluffPlayerId?, bluffGroundCard?
```

**startGame():** Room'dan gelen GameConfig kullanir (host lobby'de secer).

**playCard():**
- Kart elinden cikarilir, pile'a eklenir
- canTakePile → pile temizlenir, pisti kontrolu
- Pisti puanlama: normal +10, jackpot +50, wildcard+normal 0
- Kart deger puanlamasi: C2 +2, D10 +3

**resolveBluff():**
- PASS → blofcu pile'i alir (+10 bonus)
- CALL + gercek → blofcu pile'i alir (+20 bonus)
- CALL + sahte → caller pile'i alir (+10 bonus)
- Pile her durumda birine gider, masa temizlenir

**checkRefillOrEnd():** Tum eller bossa yeniden dagit veya GAME_OVER

### 2.3 Client GameScreen (client/src/app/screens/GameScreen.ts)

**~1340 satir**, en buyuk dosya. Icerik:
- Oyuncu eli (alt), rakip eli (ust), masa (orta)
- Puan gosterimi, deste sayaci, tur gostergesi
- "Kapali Oyna" butonu (pileCount === 1 ise gorunur)
- Blof paneli ("Blof"/"Pass" butonlari + 30sn timer)
- Animasyon pipeline: dagitim → oynama → toplama → gameOver (deferred pattern)
- Optimistic UI: kart sunucudan onay gelmeden kaldirilir
- Reconnect destegi: onReconnect callback

**Animasyonlar:**
- animLayer: cross-container kart hareketleri icin ozel Container
- GSAP (sadece gsap.to) ile tum animasyonlar
- Deferred chain: her adim onceki tamamlaninca baslar

### 2.4 Client CardSprite (client/src/game/components/CardSprite.ts)

- PerspectiveMesh (10x10 vertex grid) ile 3D flip
- GSAP tween + _flipGen counter ile concurrent koruma
- destroy() override ile flip tween temizligi

### 2.5 Shared Types (server/src/shared/types.ts)

- DeckConfig: { deckCount, includeJokers, jokersPerDeck }
- DEFAULT_DECK_CONFIG: { deckCount: 1, includeJokers: false, jokersPerDeck: 0 }
- DOUBLE_DECK_CONFIG: { deckCount: 2, includeJokers: true, jokersPerDeck: 1 }
- IRoomState: deckConfig alanini icerir (client'a gonderilir)

---

## 3. KURAL DEGISIKLIKLERI (TAMAMLANDI)

### 3.1 Cift Deste Eslestirme Kurali ✅

Cift destede de sadece rank eslesmeli (S7 = H7, herhangi 7 = herhangi 7).
`isMatch()` her iki destede rank-only eslestirme yapar.

### 3.2 Cift Deste Joker Sayisi ✅

`jokersPerDeck: 2` → 2 deste × 2 = 4 joker → toplam 108 kart.

### 3.3 Blof PASS Davranisi ✅

Blof sonucu ne olursa olsun pile her zaman birine gider (masa temizlenir).
PASS/gercek → blofcu alir. Sahte → caller alir. Sira her zaman diger oyuncuya gecer.

### 3.4 Blof Pile Animasyonu ✅ (v0.0.5)

CALL+Sahte durumunda pile animasyonu yanlis yone gidiyordu (blofcuye).
Fix: `_collectWinnerId` ile server'in gonderdigi `winner` alani kullanilarak dogru yone yonlendirildi.

---

## 4. PUANLAMA SISTEMI (TAMAMLANDI)

### 4.1 Kart Deger Puanlamasi

| Kart | Puan | Aciklama |
|------|------|----------|
| Sinek 2 (C2) | +2 | Eli kazanan oyuncuya |
| Karo 10 (D10) | +3 | Eli kazanan oyuncuya |
| A+K+Q (elde birlikte) | +30 | Flush bonusu (dagitimda kontrol edilir) |
| J (herhangi) | 0 | Wildcard, puan vermez (sadece alma gucu) |
| JOKER | 0 | Wildcard, puan vermez (sadece alma gucu) |
| Diger kartlar | 0 | Puan degeri yok |

### 4.2 Ozel Puan Durumlari

| Durum | Puan | Aciklama |
|-------|------|----------|
| Normal pisti (blof olmadan) | +10 | Masa 1 kart, eslesme ile alma |
| Pisti wildcard ile (J/Joker) | +20 | Wildcard ile pisti |
| Flush bonusu (A+K+Q elde) | +30 | Dagitimda elde A+K+Q varsa +30 |
| Four of a Kind (4 ayni rank) | +50 | Dagitimda 4 kart ayni rank ise +50 |
| Oyun sonu kart fazlasi | +5 | Daha fazla kart toplayan oyuncu |

### 4.3 Blof Puanlamasi

| Durum | Blofcu | Rakip | Pile | Sira |
|-------|--------|-------|------|------|
| PASS | +10 | 0 | Blofcu alir | Diger oyuncuya |
| PASS (wildcard ustune wildcard) | +30 | 0 | Blofcu alir | Diger oyuncuya |
| CALL + gercek (rank eslesmesi) | +20 | 0 | Blofcu alir | Diger oyuncuya |
| CALL + gercek (wildcard+normal) | 0 | 0 | Blofcu alir | Diger oyuncuya |
| CALL + gercek (wildcard+wildcard) | +100 | 0 | Blofcu alir | Diger oyuncuya |
| CALL + sahte | 0 | +10 | Caller alir | Diger oyuncuya |

> Pile her zaman birine gider. Sira her zaman diger oyuncuya gecer.

### 4.4 Puanlama Hesaplama Noktasi

- **Eli kazaninca:** C2 +2, D10 +3 deger puani hesaplanir
- **Pisti olunca:** Normal +10, Jackpot +50, Wildcard+normal 0
- **Flush:** Dagitimda elde A+K+Q varsa +30
- **Blof cozulunce:** Blof puanlari eklenir (wildcard senaryolarina gore degisir)
- **Oyun sonunda:** Kart fazlasi +5

**Ilgili dosyalar:**
- `server/src/engine/scoring.ts` → `calcCardValues()`, `calcPistiBonus()`, `calcHandBonus()`, `calcEndGameBonus()`
- `server/src/game/game.service.ts` → playCard icinde pile capture'da + checkRefillOrEnd icinde oyun sonu

---

## 5. RUNTIME OYUN AYARLARI (TAMAMLANDI)

Host (edleron) lobby'de deste tipi (Tek/Cift) ve blof toggle (Acik/Kapali) secer.
Guest (wilkagul) direkt katilir, host'un ayarlari gecerlidir.

```typescript
interface GameConfig {
  deckConfig: DeckConfig;       // tek/cift deste
  bluffEnabled: boolean;        // blof aktif/pasif
}
```

- Host JOIN_ROOM event'inde config gonderir
- `GameService.startGame(roomId, players, config)` → config'i GameState'e kaydeder
- 4 kisilik mod (maxPlayers) Step 3'e ertelendi

---

## 6. 4 KISILIK OYUN (SONRAKI FAZ — Step 3)

### Mevcut Engeller

1. **Server:** Blof timeout'ta opponent bulma 2 oyuncu varsayar
2. **Server:** resolveBluff sadece 1 rakip varsayar
3. **Client:** GameScreen layout 2 oyuncu icin hardcoded (ust/alt)
4. **Client:** animateCollectPile 2 oyuncu varsayar
5. **Shared:** maxPlayers type'larda yok

### Gerekli Degisiklikler (Ozet)

- Server: Tur sirasi A→B→C→D dongusu (zaten advanceTurn % players.length)
- Server: Blof'ta sadece siradaki oyuncu karar verir
- Client: 4 yonlu layout (alt, sag, ust, sol)
- Client: Her oyuncu icin el gosterimi
- Client: Score paneli 4 oyuncu icin

**Bu faz MVP'de yapilmayacak. Step 3'e ertelendi.**

---

## 7. JOKER KURALLARI

### Tek Deste
- Joker karti **bulunmaz** (includeJokers: false)
- Wildcard sadece J (4 adet)
- Toplam: 52 kart

### Cift Deste
- 4 adet Joker eklenir (jokersPerDeck: 2)
- Wildcard: J (8 adet) + Joker (4 adet) = 12 wildcard
- Toplam: 108 kart

### Joker ve J Islevi (Ayni)
- Ortadaki TUM kartlari alir (eli kazanir)
- Normal kart ustune: +0 puan (bonus yok, sadece alma)
- Wildcard ustune wildcard (J ustune J, J ustune Joker vs): +50 puan (Jackpot Pisti)
- Kart deger puani: 0 (sadece alma gucu)

### Asset Durumu
- `raw-assets/main{m}/cards{tps}/joker.png` → **MEVCUT** ✅
- `cardMapping.ts` → Joker mapping **MEVCUT** ✅

---

## 8. BLOF KURALLARI (GUNCEL)

### Ne Zaman Blof Yapilabilir
- Masada tam 1 kart varken (pisti zemini)
- Blof feature aktif ise (runtime config ile)

### Akis
1. A oyuncusu kart secer → "Kapali Oyna" butonu gorunur
2. Kapali Oyna → server canBluff() → BLUFF_PHASE
3. B oyuncusuna "Ac!" / "Gec" paneli gosterilir (30sn timer)

### Sonuclar

| Durum | Blofcu (A) | Rakip (B) | Pile | Sira |
|-------|-----------|-----------|------|------|
| B "Gec" (PASS) | +10 | 0 | A alir | B'ye gecer |
| B "Gec" (wildcard ustune wildcard) | +30 | 0 | A alir | B'ye gecer |
| B "Ac!" + gercek (rank eslesmesi) | +20 | 0 | A alir | B'ye gecer |
| B "Ac!" + gercek (wildcard+normal) | 0 | 0 | A alir | B'ye gecer |
| B "Ac!" + gercek (wildcard+wildcard) | +100 | 0 | A alir | B'ye gecer |
| B "Ac!" + sahte | 0 | +10 | B alir | B'ye gecer |
| 30sn timeout | +10 | 0 | A alir | B'ye gecer |

> Sira her zaman diger oyuncuya gecer. Blof sonucu sirayi etkilemez.

### Blofsuz Pisti
- Normal pisti (rank eslesmesi): +10 puan
- Jackpot pisti (wildcard ustune wildcard): +50 puan
- Wildcard ile normal kart alma: +0 puan (bonus yok)

---

## 9. BACKLOG DURUMU

### P0 — Kural Duzeltmeleri ✅ TAMAMLANDI

1. ~~Cift deste eslestirme: rank-only~~ ✅
2. ~~Cift deste joker: 4 adet (108 kart)~~ ✅
3. ~~Blof: pile her zaman birine gider~~ ✅
4. ~~Blof kart logic fix~~ ✅

### P1 — Puanlama Sistemi ✅ TAMAMLANDI

5. ~~Kart deger puanlamasi: C2 +2, D10 +3, Flush A+K+Q +30~~ ✅
6. ~~Pisti puanlama: Normal +10, Jackpot +50, Wildcard+normal 0~~ ✅
7. ~~Oyun sonu kart fazlasi (+5)~~ ✅
8. ~~Pisti puanlamasi (zaten vardi)~~ ✅

### P2 — Runtime Config + Auth ✅ TAMAMLANDI

9. ~~GameConfig interface~~ ✅
10. ~~Lobby UI: deste + blof toggle~~ ✅
11. ~~Server entegrasyonu~~ ✅
12. ~~Username auth (edleron/wilkagul)~~ ✅
13. ~~Host/Guest sistemi (sadece host ayar yapar)~~ ✅

### P3 — Client Polish (DEVAM EDIYOR)

14. ~~Puan shake efekti~~ ✅ (sadece kazanan oyuncuda ekran sallanir)
15. **Blof UI iyilestirme** — BEKLIYOR
    - CALL'da blof karti flip animasyonu ile acilir
    - PASS'ta kartlar ortada kaldigini gosteren highlight efekti
    - Floating puan text (+10, +20 gibi)

### Sonraki Faz (Step 3)

16. **4 kisilik oyun:** Layout, tur sirasi, blof akisi
17. **PostgreSQL:** State persistence
18. **Matchmaking:** Oda sistemi genisletme

---

## 10. TAMAMLANAN DEGISIKLIKLER

| Oncelik | Degisiklik | Durum |
|---------|-----------|-------|
| P0 | Cift deste joker sayisi (jokersPerDeck: 2) | ✅ |
| P0 | Rank-only eslestirme (tek + cift deste) | ✅ |
| P0 | Blof pile davranisi (her zaman birine gider) | ✅ |
| P1 | Kart deger puanlamasi (C2, D10, Flush, FoaK) | ✅ |
| P1 | Pisti puanlama (normal, jackpot, wildcard) | ✅ |
| P1 | Oyun sonu kart fazlasi (+5) | ✅ |
| P2 | Runtime config (deste + blof toggle) | ✅ |
| P2 | Host/Guest sistemi | ✅ |
| P3 | Puan shake efekti | ✅ |
| P3 | Blof pile animasyon yonu fix (v0.0.5) | ✅ |

---

## 11. TEKNIK NOTLAR

### Engine Guclu Yanlari
- Pure TypeScript, framework bagimsiz
- Tum fonksiyonlar DeckConfig parametresi aliyor
- Fisher-Yates shuffle garanti
- Kart maskeleme (rakip eli + deste asla gonderilmez)

### Engine Zayif Yanlari
- 2 oyuncu varsayimi (gateway timeout'ta) — Step 3'te duzeltilecek

### Client Guclu Yanlari
- Deferred animation pattern (race condition korunma)
- Generation counter (stale callback engelleme)
- Optimistic UI (sunucu beklemeden kart kaldir)
- Reconnect destegi (cached state)
- GSAP tween cleanup (memory leak yok)

### Client Zayif Yanlari
- GameScreen ~1340 satir (buyuk dosya)
- 2 oyuncu layout hardcoded — Step 3'te duzeltilecek

---

## ORIJINAL PROMPT (REFERANS)

Asagidaki prompt bu raporun olusturulma talebidir:

> Şimdi proje özelinde bak bakalım çift deste | tek deste muhappeti vardı.
>
> Çift destede > örnek veriyorum tüm yediler (Kupa | Maça | Sinek | Karo) Eşlenik 7'ler eli kazanır > Örneğin ortada 7 maça var ise bende 7 maça var ise eli kazanmam gerekiyor du Kural böyledi dökümanda (Bunu değiştireceğiz) |
>
> Tek destede > Örnek veriyorum tüm yediler (Kupa | Maça | Sinek | Karı) Herhangi 7 varsa elim kazanırdı. Yani 7'ler özelinde gidecek isek | 4 tane 7 var elimmde | oyun 7'ler özelinde 2 tur dönmesi lazım | el geldiği şartlarda.
>
> Çift destede artık herhangi bir 7'li | eli kazanması gerekiyor. Örnek vericek olur isem (Kupa | Maça | Sinek | Karo) 2'şer kağıttan 8'tane 7'li olabilir. -> Buna binayen 7'ler özelinde el 4 tur dönmelidir. Eski notlarada bakarsan, Net olarak görebilirsin. Bunu hem döküman özeklinde hemde claude.md özelinde hemde .claude klasörü özelinde bir değiştirelim.
>
> -> Tarih + hem client hemde server derinlmesine bir analiz edip | bir plan oluşturalım. Bu planı rapor şeklinde bana sun. docs klasörü içerine kaydet lütfen Bir çok geliştirme yapıldı ama haberimiz yok neler yapıldı edildi.
>
> -> Şimdi Hem client hemde server tarafı çift yada tek deste oynama özelliğini runtime'de desteklemiyor. | Bunu geliştirmek kolay mı ? oyun dinamikleri ve akışı bozmadan kolayca enntegre edebilirmiyiz ? bunu dökümanda belirtelim. bu acil geliştirme gereken bir backlog işidir.
> -> Aynı zamnada hem client hemde server tarafı 4 kişilik oyunada desteklemiyor. Bunu bir sonraki faz'a aktaralım, dökümanda belirtelim.
> -> Oyunumuzda aktif  bir blöf feature var. Buda yine runtimede ayarlanabilir olabilir ? olması için neler gerekiyor neler yapabiliriz araştıralım | bu acil geliştirilmesi beklenen backlog işidir. dökümanda belirtelim.
> -> Oyunumuzda sadece blöf üzerine bir puanlama sistemi mevcuttur. Hem çift deste için hemde tek deste için, gerçek hayat pişti oyunları gibi her kart ve kazanımda puanlama sistemi olmak zorundadır. bunu yine acil geliştirilmesi gereken bir süreçtir bunuda rapora koyalım lütfen.
>
> -> Runtime'de oda kurulmadan önce yada oda kurulurken | yada bir api isteği sayesinde |
> - - > Oyun blöf | blöfsüz çalıştırma süreci
> - - > Oyun Çift | tek deste çalıştırma süreci
> - - > oyun 2 kişişik | 4 kişilik çalıştırma süreci (soranda yapılabilir 2 kişiden devam edebilriizi ama bir sonraki fazda bu olucak)
> varsa baska ayar gibi süreçler nasıl geliştrebiliriz ayrıntılı bir görelim.
>
> -> Joker (Eğer çift deste ile oynuyor ise oyuncu 4 adet joker kağıdı da gelmelidir. raw-asset içerisinde joker.png şeklinde listelenmiştir) Çift destede 52 adet kart bulunur 4 adet 4 joker eklenince 108 adet toplam kart olur. pişti kuralı gereği 4 kart ortaya oyun başında ortada olur kalan 104 kağıt ise 2 kişilik oyunda toplam 8'e kağıt dağıtarak 13 tur boyunca oynanması sağlanır. Yani kısaca çift destede ekstra joker diye bir kağıt grubu daha gelir -> 4 adet. (Eğer matematik yanlış ise uyar beni) | tek destede joker kart feature bulunmaz.
>
> -> Yere düşen ilk kartlara (Blöf feature aktif ise ) blöf yapılabilir (Zaten bu özelliği destekliyor olabiliriz. check et lütfen)
> -> Blöf atılan kart karşı tarafa aç yada pass geç opsiyonu verilir (Zaten bu özelliği destekliyoruz check et lütfen)
>
> -> Joker ile | J (Maça J | Kupa J | Sinek J | Karo J) -> Aynı işleve sahipttir | Tüm ortadaki kartları alır yani eli kazanır (Round değil sadece ilgili sırayı).
>
> -> Puanlama sistemi
> - - > Yere ilk açılan kartlardan 4 tanesinden | Joker yada J ise (Tek destek çift deste muhappeti anlattım yukarıda) Joker yada j ile alınır ise, eli alan oyuncu 50 puan kazanır.
> - - > Eğer oyuncu yerdeki kağıtları kazanır ise içerisinde sinek 2 var ise 2 puan
> - - > Eğer oyuncu yerdeki kağıtları kazanır ise içerisinde karo 10 var ise 2 puan
> - - > Eğer oyuncu yerdeki kağıtları kazanır ise içerisidne A | Q | K var ise 30 puan kazandırır | her yüksek high seymbol 10 puandır  J Hariç
> - - > Tur sonunda | oyun bittiğinde > Kağıt fazlası kimde ise oyuncu ekstra 5 puan kazanır.
>
> -> Blöf Puanlamam Sistemi (Mevcut durumu check et zaten bunları karşılıyor olabiliriz)
> - -> şimdi ister 2 kişilik olsun ister 4 kişilik olsun | blöf mekanizması iki kişi arasında geçer A oyuncu ve B oyuncu. Zaten 4 kişilikte bu altındaki oyuncu ile olacaktır. Yani eli oynayan kişinin altındaki oyuncu B oyuncu oluyor mantıken.
> - -> Eğer A oyuncusu Blöf yapar ise Karşı taraf bunu cevaplamak zorundadır.
> - -> Eğer A oyuncusu Blöf yaptı ise B oyuncusu Pass seçeneğine tıklar ise kartlar diğer oyuncuya geçmemeli ortada kalmalıdır. el yada tur devam etmelidir. Ama A oyuncusu 10 puan kazanmalıdır. (Burada bizde direk el ve kartlar kaznaıyor gibi A oyuncusuna geçiyor mevcut durumda sadece kartlar ortada kalmaya devam edecek. Ama A oyuncusuna puan vereceğiz.)
> - -> Eğer A Oyuncusu Blöf yaptı ise B oyuncusu pass yada blöf diyebilir (Bu mevcut sistemde) Eğer pass demiş ise yukarıda açıkladım. Ama Blöf seçeneğine tıklar ise 2 ihtimal vardır
> - -> İhtimal 1 : A oyuncu gerçekten blöf yapmıştır. B oyuncusu bunu yakalamıştır. B oyuncusuna 10 puan yazılır (El yada tur devam etmelidir) (Bu durum bizde böylemi check et.)
> - -> ihtimal 2 : A oyuncusu blöf yapamış eli kazanacak gerçek kart atmıştır. B oyuncusu yanılmıştır. A oyuncusuna 20 puan yazılır. (Bu durum bizde böylemi check et)
>
> -> Blöf yapılmadan | her pişti süreci oyunculara 10 puan kazandırmalıdır.
>
> -> Client tarafında her puan kazanma durumunda | bir basit shake efekti istiyorum.

---

**Rapor sonu. Sonraki adim: P0 kural duzeltmeleri ile baslayacagiz.**
