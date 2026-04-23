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

## REFACTOR — GameScreen Ayirma (Bug + GF oncesi)

> **Neden once?** GameScreen.ts 1344 satir ve tum game-feel + bug fix'ler buraya eklenecek.
> Refactor OLMADAN ilerlemek dosyayi 2000+ satira cikarir ve her degisiklik riskli olur.
> Refactor SIRASINDA davranis degismez — ayni animasyonlar, ayni timing, ayni akis.

### Mevcut Yapi (tek dosya, 1344 satir)

```
GameScreen.ts
├── Constructor + UI olusturma (1-216)
├── Lifecycle: prepare, update, resize, show, hide (218-301)
├── Reset: tum state temizleme (303-400)
├── Socket listeners: setup + remove (402-442)
├── State handlers: onRoomState, onYourHand, onCardPlayed (444-646)
│   └── Deferred state: isAnimBusy, flushDeferredDeals, flushDeferredGameOver
├── Render: renderTableCardNow, renderHand, layoutHand (648-762)
├── Card selection + score: selectCard, playSelectedCard, shakeScreen (764-910)
├── Animations: deal, play, collect (912-1266) ← EN BUYUK, 354 satir
└── Bluff: panel, timer, resolve (1268-1344)
```

### Hedef Yapi (4 dosya)

```
screens/
├── GameScreen.ts          → Orchestrator (~500 satir)
│   ├── Constructor + UI
│   ├── Lifecycle (prepare, resize, reset)
│   ├── Socket listeners
│   ├── State handlers + deferred state
│   ├── Render (renderState, renderHand, layoutHand)
│   └── Card selection + play
│
├── GameAnimations.ts      → Animasyon yoneticisi (~400 satir)
│   ├── animateDealHand()
│   ├── animateOpponentDeal()
│   ├── animatePlayCard()
│   ├── animateOpponentPlay()
│   ├── animateCollectPile()
│   └── (gelecek: GF efektleri buraya eklenir)
│
├── BluffController.ts     → Blof UI + timer (~120 satir)
│   ├── showBluffPanel()
│   ├── startBluffTimer() / stopBluffTimer()
│   ├── handleBluff()
│   ├── onBluffResolved()
│   └── (gelecek: GF0 reveal, GF6 gerilim buraya eklenir)
│
└── ScoreDisplay.ts        → Skor gosterimi + toast (~150 satir)
    ├── updateScores()
    ├── showScoreToast()
    ├── shakeScreen()
    └── (gelecek: GF5 floating text, puan efektleri buraya eklenir)
```

### Refactor Kurallari

1. **Extract, rewrite degil** — metotlar oldugu gibi tasiniyor, logic degismiyor
2. **GameScreen orchestrator kalir** — tum container'lar ve state GameScreen'de
3. **Yeni dosyalar context alir** — constructor'da GameScreen referansi veya gerekli container'lar
4. **Deferred state GameScreen'de kalir** — manager'lar sadece cagrilir, state yonetmez
5. **`_screenGen` kontrolu korunur** — tum async callback'lerde generation check aynen kalir
6. **Test: refactor oncesi ve sonrasi ayni davranis** — playing test ile dogrula

> **NOT:** Satir numaralari referans icin verilmistir. Her adim sonrasi diger adimlarin
> satir numaralari kayar — metot adlarina gore bul, satir numarasina baglanma.

### Adimlar

#### Adim 1 — `GameAnimations.ts` (en buyuk parca, ilk cikar)

Tasinacak metotlar:

- `animateDealHand(cards)` (satir 917-981)
- `animateOpponentDeal(count)` (satir 984-1033)
- `animatePlayCard(sprite)` (satir 1036-1098)
- `animateOpponentPlay(cardId)` (satir 1101-1196)
- `animateCollectPile()` (satir 1199-1266)

Bagimliliklar:

- `animLayer`, `tableArea`, `playerHandContainer`, `opponentHandContainer` → constructor'da alinir
- `_screenGen` → her animasyon cagirisinda parametre olarak verilir
- `CARD_SCALE`, `TABLE_CARD_SCALE`, `OPPONENT_CARD_SCALE` → const olarak tasiniyor
- `DEAL_DURATION`, `DEAL_STAGGER`, `PLAY_DURATION`, `COLLECT_DURATION` → const olarak tasiniyor
- `CardSprite`, `parseCardId` → import edilir
- Callback'ler (flushDeferredTableCard, flushDeferredDeals, animateCollectPile) → GameScreen'den fonksiyon referansi

Sira: Ilk cikar cunku en buyuk parca (354 satir) ve diger adimlara bagimli degil.

- [X] Dosya olustur, metotlari tasi
- [X] GameScreen'de `this.animations = new GameAnimations(...)` olustur
- [X] Tum cagrilari `this.animations.xxx()` olarak guncelle
- [X] Playing test: kart oyna, dagitim, toplama → ayni animasyonlar

#### Adim 2 — `BluffController.ts`

Tasinacak metotlar:

- `showBluffPanel()` (satir 1272-1277)
- `startBluffTimer()` (satir 1279-1291)
- `stopBluffTimer()` (satir 1293-1300)
- `handleBluff(decision)` (satir 1302-1306)
- `onBluffResolved(data)` (satir 1308-1343)

Bagimliliklar:

- `bluffPanel`, `bluffTimerLabel`, `callButton`, `passButton` → constructor'da olusturulur veya alinir
- `pileBackCards` referansi → GameScreen'den getter ile
- `_screenGen` → parametre olarak
- `_bluffRevealing`, `_collectWinnerId` → state callback ile GameScreen'e bildirilir
- `socketService.bluffDecision()` → import

Sira: Animasyonlardan sonra, cunku `onBluffResolved` icerisinde animasyon tetikliyor.

- [X] Dosya olustur, metotlari tasi
- [X] Bluff paneli UI olusturmayi BluffController constructor'ina tasi
- [X] GameScreen'de `this.bluff = new BluffController(...)` olustur
- [X] Playing test: blof yap, CALL, PASS, timeout → ayni davranis

#### Adim 3 — `ScoreDisplay.ts`

Tasinacak metotlar:

- `onScoreUpdate(data)` (satir 826-838)
- `showScoreToast(label, total, isMe)` (satir 840-874)
- `shakeScreen()` (satir 797-808)
- `toggleScorePanel()` (satir 810-824)
- Skor label'lari guncelleme logic'i (renderState icinden extract)

Bagimliliklar:

- `scoreContainer` ve icerisindeki label'lar → constructor'da olusturulur
- `scoreInfoBtn` → event binding
- `ScorePanel` → import
- `myScoreEvents[]` → ScoreDisplay'de tutulur
- `engine()` → screen boyutu icin

Sira: En son, cunku en az bagimlilik var ve diger adimlari etkilemiyor.

- [X] Dosya olustur, metotlari tasi
- [X] Skor UI olusturmayi ScoreDisplay constructor'ina tasi
- [X] GameScreen'de `this.score = new ScoreDisplay(...)` olustur
- [X] Playing test: puan degisimi, toast, shake, score panel → ayni davranis

#### Adim 4 — Final dogrulama

- [X] GameScreen.ts ~500 satir olmali (orchestrator) — **gerceklesen: 739 satir** (hedeften +239, kabul edilebilir)
- [X] Tum dosyalar TypeScript strict mode hatasi yok
- [X] Playing test (tam akis):
  1. Login → lobby → oyun basla (deal animasyonu)
  2. Kart sec → oyna (play animasyonu)
  3. Eslesme → pile toplama (collect animasyonu)
  4. Pisti → skor toast + shake
  5. Blof → CALL → reveal → pile toplama
  6. Blof → PASS → pile blofcuya
  7. Son el → game over ekrani
  8. Reconnect → state restore

---

## BUG — Oncelikli Duzeltmeler

### B1 — Blof PASS: Pile + kartlar yanlis kisiye gidiyor

Puan ve siralama dogru calisiyor ama PASS sonrasi pile (kartlar) yanlis oyuncuya veriliyor
ve collect animasyonu yanlis yone gidiyor. Ayni sorunun server (sahiplik) ve client (animasyon) tarafi.

- [X] Server: `resolveBluff()` → PASS case'inde pile blofcuya atanmali
- [X] Client: `_collectWinnerId` → collect animasyonu blofcu yonune gitmeli
- [X] Playing test: PASS → pile blofcuya gidiyor + animasyon dogru yon

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

> **Hedef dosya rehberi (refactor sonrasi):**
>
> - Animasyon maddeleri (GF0-GF4, GF7) → `GameAnimations.ts`
> - Blof efektleri (GF0, GF6) → `BluffController.ts`
> - Puan efektleri (GF5) → `ScoreDisplay.ts`
> - UI/render maddeleri (GF1, GF3, GF9, GF10, GF11) → `GameScreen.ts`
> - Kart secim (GF9) → `GameScreen.ts`
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

- [ ] Adim 1-3: overlay + blur + pause
- [ ] Adim 4: yavas flip animasyonu
- [ ] Adim 5a — sonuc gercek pisti:
  - Kart acilir → parlama efekti (beyaz flash, 200ms)
  - Buyuk yazi: "+20 GERCEK!" (scale 0→1 bounce, sonra fade-out)
  - Screen shake (hafif, 300ms)
  - Ses: zafer "sting" sesi
- [ ] Adim 5b — sonuc sahte (yakalandi):
  - Kart acilir → kirmizi tint flash (200ms)
  - Buyuk yazi: "YAKALANDI!" (scale 0→1, kirmizi renk)
  - Blofcunun el bolgesi kisa kirmizi flash
  - Ses: "busted" sesi (kisa, dramatik)
- [ ] Adim 6-9: sindirme → pile toplama → overlay kaldir → devam

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
| REFACTOR                 | 0 - ONKOŞUL | GameScreen ayirma — tum GF/BUG oncesi      |
| BUG (B1)                 | 1 - ACIL     | Pile/kart yonu bozuk, once duzelt           |
| I-GF0                    | 2 - YUKSEK   | Blof reveal — oyunun kalbi, en dramatik an |
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
