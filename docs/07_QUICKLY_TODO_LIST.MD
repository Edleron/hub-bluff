<aside>
💡

## 📯 hub-bluff

> **Bu hızlı checklist'tir.** Her task öncesi `docs/06_ROADMAP.md`'den detayını oku
> (öncelik, hedef dosya, spec, kural). Done yapınca **iki dosyayı da işaretle**:
> hem buradaki `[ ]` → `[x]`, hem ROADMAP'teki aynı satır.

* [x] 00X → | Bluff → REFACTOR → GameAnimations.ts: Dosya oluştur, metotları taşı (animateDealHand, animateOpponentDeal, animatePlayCard, animateOpponentPlay, animateCollectPile)
* [x] 00X → | Bluff → REFACTOR → GameAnimations.ts: GameScreen'de this.animations = new GameAnimations(...) oluştur
* [x] 00X → | Bluff → REFACTOR → GameAnimations.ts: Tüm çağrıları [this.animations.xxx](http://this.animations.xxx/)() olarak güncelle
* [ ] 00X → | Bluff → REFACTOR → GameAnimations.ts: Playing test (kart oyna, dağıtım, toplama → aynı animasyonlar)
* [x] 00X → | Bluff → REFACTOR → BluffController.ts: Dosya oluştur, metotları taşı (showBluffPanel, startBluffTimer, stopBluffTimer, handleBluff, onBluffResolved)
* [x] 00X → | Bluff → REFACTOR → BluffController.ts: Bluff paneli UI oluşturmayı BluffController constructor'ına taşı
* [x] 00X → | Bluff → REFACTOR → BluffController.ts: GameScreen'de this.bluff = new BluffController(...) oluştur
* [ ] 00X → | Bluff → REFACTOR → BluffController.ts: Playing test (blof yap, CALL, PASS, timeout → aynı davranış)
* [x] 00X → | Bluff → REFACTOR → ScoreDisplay.ts: Dosya oluştur, metotları taşı (onScoreUpdate, showScoreToast, shakeScreen, toggleScorePanel)
* [x] 00X → | Bluff → REFACTOR → ScoreDisplay.ts: Skor UI oluşturmayı ScoreDisplay constructor'ına taşı
* [x] 00X → | Bluff → REFACTOR → ScoreDisplay.ts: GameScreen'de this.score = new ScoreDisplay(...) oluştur
* [ ] 00X → | Bluff → REFACTOR → ScoreDisplay.ts: Playing test (puan değişimi, toast, shake, score panel → aynı davranış)
* [x] 00X → | Bluff → REFACTOR → Final doğrulama: GameScreen.ts ~500 satır olmalı (orchestrator)
* [x] 00X → | Bluff → REFACTOR → Final doğrulama: Tüm dosyalar TypeScript strict mode hatası yok
* [ ] 00X → | Bluff → REFACTOR → Final doğrulama: Playing test tam akış (login → lobby → deal → kart seç → oyna → eşleşme → collect → pişti → blof CALL reveal → blof PASS → son el game over → reconnect state restore)
* [ ] 00X → | Bluff → BUG → B1: Server resolveBluff() → PASS case'inde pile blofçuya atanmalı
* [ ] 00X → | Bluff → BUG → B1: Client _collectWinnerId → collect animasyonu blofçu yönüne gitmeli
* [ ] 00X → | Bluff → BUG → B1: Playing test (PASS → pile blofçuya gidiyor + animasyon doğru yön)
* [ ] 00X → | Bluff → UI → I-U1: Yeni kart asset'leri seç/tasarla
* [ ] 00X → | Bluff → UI → I-U1: raw-assets/ → AssetPack ile spritesheet oluştur
* [ ] 00X → | Bluff → UI → I-U1: cardMapping.ts → yeni frame isimlerine güncelle
* [ ] 00X → | Bluff → UI → I-U2: Yeni background asset'i (masa dokusu, vignette, ışık efekti)
* [ ] 00X → | Bluff → UI → I-U2: GameScreen'e background sprite ekle
* [ ] 00X → | Bluff → UI → I-U3: Her oyuncunun pişti sayısını takip et (server state'e ekle)
* [ ] 00X → | Bluff → UI → I-U3: Skor paneline pişti sayacı ekle
* [ ] 00X → | Bluff → UI → I-U3: Görsel (ikon + sayı formatı)
* [ ] 00X → | Bluff → UI → I-U4: Buton boyutlarını büyüt
* [ ] 00X → | Bluff → UI → I-U4: Renk kontrastı artır (CALL = kırmızı, PASS = yeşil/gri)
* [ ] 00X → | Bluff → UI → I-U4: Timer göstergesini daha belirgin yap (büyük font, pulse efekti)
* [ ] 00X → | Bluff → UI → I-U5: Aktif oyuncunun el bölgesinde parlama efekti
* [ ] 00X → | Bluff → UI → I-U5: "Senin Sıran" / "Rakip Oynuyor..." yazısı daha belirgin
* [ ] 00X → | Bluff → UI → I-U5: Sıra geçişinde kısa görsel geçiş animasyonu
* [ ] 00X → | Bluff → UI → I-U6: Deste ikonu (kart yığını sprite) + azalan sayı
* [ ] 00X → | Bluff → UI → I-U6: Kart dağıtılınca desteden kart çıkar animasyonu (opsiyonel)
* [ ] 00X → | Bluff → UI → I-U7: Fade-in / fade-out geçiş efekti (300-400ms, ease-in-out)
* [ ] 00X → | Bluff → UI → I-U7: Navigation plugin'e geçiş animasyonu ekle
* [ ] 00X → | Bluff → GAME FEEL → I-GF0: Adım 1-3 (overlay + blur + pause)
* [ ] 00X → | Bluff → GAME FEEL → I-GF0: Adım 4 (yavaş flip animasyonu)
* [ ] 00X → | Bluff → GAME FEEL → I-GF0: Adım 5a sonuç gerçek pişti (parlama + "+20 GERÇEK!" yazısı + shake + ses)
* [ ] 00X → | Bluff → GAME FEEL → I-GF0: Adım 5b sonuç sahte/yakalandı (kırmızı tint + "YAKALANDI!" yazısı + kırmızı flash + busted ses)
* [ ] 00X → | Bluff → GAME FEEL → I-GF0: Adım 6-9 (sindirme → pile toplama → overlay kaldır → devam)
* [ ] 00X → | Bluff → GAME FEEL → I-GF1: Her atılan kart öncekinin üstüne hafif offset ile binmeli (3-5px x/y + 2-4 derece rotation)
* [ ] 00X → | Bluff → GAME FEEL → I-GF1: Son atılan kart en üstte, alttaki kartların kenarları görünmeli
* [ ] 00X → | Bluff → GAME FEEL → I-GF1: Pile 5+ kart olunca compact moda geç (offset azalır, kenarları hala görülsün)
* [ ] 00X → | Bluff → GAME FEEL → I-GF1: Pile üzerinde kart sayısı göstergesi (küçük badge: "x7")
* [ ] 00X → | Bluff → GAME FEEL → I-GF2: Kart elden kalkar → masaya doğru uçar (300-400ms, ease-out)
* [ ] 00X → | Bluff → GAME FEEL → I-GF2: Uçuş sırasında hafif rotation (5-10 derece, rastgele yön)
* [ ] 00X → | Bluff → GAME FEEL → I-GF2: Masaya varınca küçük bounce (scale 1.05→1.0, 150ms, elastic ease)
* [ ] 00X → | Bluff → GAME FEEL → I-GF2: Masaya düşünce hafif gölge genişlemesi (kart "indi" hissi)
* [ ] 00X → | Bluff → GAME FEEL → I-GF2: Rakip kart oynadığında kapalı kart gelir → masada açılır (kısa flip, 300ms)
* [ ] 00X → | Bluff → GAME FEEL → I-GF3: Kart masaya düşünce kısa, tok "tuk" sesi (tatmin edici değil, nötr)
* [ ] 00X → | Bluff → GAME FEEL → I-GF3: Kart masaya yavaşça oturur (bounce yok, sadece ease-out landing)
* [ ] 00X → | Bluff → GAME FEEL → I-GF3: Pile sayısı badge'i +1 artar (küçük sayı değişimi, animasyonsuz)
* [ ] 00X → | Bluff → GAME FEEL → I-GF3: Hiçbir parlama, shake, floating text yok — kasıtlı sessizlik
* [ ] 00X → | Bluff → GAME FEEL → I-GF4: Kartlar tek tek kazanan tarafa uçmalı (staggered, kart başı 80ms arayla)
* [ ] 00X → | Bluff → GAME FEEL → I-GF4: Her kart uçarken hafif rotation + scale küçülme (uzaklaşma hissi)
* [ ] 00X → | Bluff → GAME FEEL → I-GF4: Toplama sonunda skor alanında kısa pulse efekti (scale 1.0→1.15→1.0, 200ms)
* [ ] 00X → | Bluff → GAME FEEL → I-GF4: Pişti ise özel — masada büyük parlama + "PIŞTI!" yazısı (1s görüntülenir)
* [ ] 00X → | Bluff → GAME FEEL → I-GF4: Pile büyüklüğüne göre skala (2-3 sakin / 4-6 hafif shake / 7+ belirgin shake + floating text)
* [ ] 00X → | Bluff → GAME FEEL → I-GF5: Floating text — küçük puan (+2, +3) beyaz sakin
* [ ] 00X → | Bluff → GAME FEEL → I-GF5: Floating text — orta puan (+10, +20) sarı/altın orta font bounce
* [ ] 00X → | Bluff → GAME FEEL → I-GF5: Floating text — büyük puan (+50, +100) altın büyük font glow + shake
* [ ] 00X → | Bluff → GAME FEEL → I-GF5: Pişti "+10 PIŞTI!" yazısı masanın üstünde (büyük, sarı, 1s)
* [ ] 00X → | Bluff → GAME FEEL → I-GF5: Jackpot pişti (+50) özel kutlama (particle patlaması + shake + altın flash)
* [ ] 00X → | Bluff → GAME FEEL → I-GF5: Mevcut shake efekti korunsun, üstüne floating text eklensin
* [ ] 00X → | Bluff → GAME FEEL → I-GF6: "Kapalı Oyna" butonu görünümü (koyu mor/kırmızı + pulse animasyonu + basınca scale 0.95→1.0)
* [ ] 00X → | Bluff → GAME FEEL → I-GF6: Kapalı kart masaya düştüğünde (yavaş hız + 300ms pause + breathing efekti)
* [ ] 00X → | Bluff → GAME FEEL → I-GF6: Bluff paneli açılırken (ekran %20 kararır + panel scale 0.8→1.0 ease-out)
* [ ] 00X → | Bluff → GAME FEEL → I-GF6: Timer son 5 saniyede (kırmızı renk + pulse hızlanır + son 3sn shake)
* [ ] 00X → | Bluff → GAME FEEL → I-GF6: PASS sonucu (kartlar blofçuya kayar + "Başarılı Blof!" yeşil floating text + overlay kalkar)
* [ ] 00X → | Bluff → GAME FEEL → I-GF7: Desteden tek tek kayarak dağıtım (kart başı 120ms arayla)
* [ ] 00X → | Bluff → GAME FEEL → I-GF7: Her kart üst köşeden elin pozisyonuna uçar (ease-out)
* [ ] 00X → | Bluff → GAME FEEL → I-GF7: Oyuncunun kartları gelince face-up açılır (50ms flip)
* [ ] 00X → | Bluff → GAME FEEL → I-GF7: Rakip kartları kapalı olarak aynı şekilde dağıtılır
* [ ] 00X → | Bluff → GAME FEEL → I-GF7: Her kart gelirken küçük "thwip" sesi
* [ ] 00X → | Bluff → GAME FEEL → I-GF8: Kazanan — altın parlama + confetti particle efekti (2-3s)
* [ ] 00X → | Bluff → GAME FEEL → I-GF8: Kaybeden — hafif desaturasyon (renk solması, agresif değil)
* [ ] 00X → | Bluff → GAME FEEL → I-GF8: Berabere — iki tarafa da nötr efekt (mavi/beyaz ton, "Berabere!" yazısı)
* [ ] 00X → | Bluff → GAME FEEL → I-GF8: Skor özeti animasyonlu (sayılar 0'dan yukarı sayarak, 200ms/sayı)
* [ ] 00X → | Bluff → GAME FEEL → I-GF8: Skor farkı büyükse ekstra efekt (confetti yoğunluğu artar)
* [ ] 00X → | Bluff → GAME FEEL → I-GF8: "Tekrar Oyna" butonu belirgin, pulse efekti ile dikkat çekici
* [ ] 00X → | Bluff → GAME FEEL → I-GF9: Hover — kart 8px yukarı kalkar + hafif parlama (glow outline, 150ms, ease-out)
* [ ] 00X → | Bluff → GAME FEEL → I-GF9: Seçim — kart 20px yukarı çıkar + belirgin glow (mavi/beyaz outline)
* [ ] 00X → | Bluff → GAME FEEL → I-GF9: Seçilmiş kart hafif "soluk alıp verme" animasyonu (subtle scale 1.0↔1.02, 1.5s loop)
* [ ] 00X → | Bluff → GAME FEEL → I-GF9: Diğer kartlar hafif soluk kalır (opacity 0.7) — seçili kart öne çıkar
* [ ] 00X → | Bluff → GAME FEEL → I-GF10: Rakip sırasıyla kartlarının üzerinde "..." thinking dots animasyonu
* [ ] 00X → | Bluff → GAME FEEL → I-GF10: Rakip kart seçtiğinde (hover) seçili kartın hafif hareket etmesi (3px kaldır)
* [ ] 00X → | Bluff → GAME FEEL → I-GF10: Blof kararında beklerken (timer + blof paneli görünür, rakibin düşündüğü belli)
* [ ] 00X → | Bluff → GAME FEEL → I-GF11: Deste sayacı renk değişimi (20+ beyaz sakin / 8-20 sarı pulse / 1-8 kırmızı hızlı pulse)
* [ ] 00X → | Bluff → GAME FEEL → I-GF11: Son dağıtımda (F3 ile birlikte) deste ikonu titrer + "SON EL!" banner
* [ ] 00X → | Bluff → GAME FEEL → I-GF11: Deste 0 olunca deste görseli kaybolur (fade-out, 300ms)
* [ ] 00X → | Bluff → SOUND → I-S1: Kart oynama "tok" sesi (kısa, net)
* [ ] 00X → | Bluff → SOUND → I-S1: Kart dağıtım "svip" sesleri (her kart için)
* [ ] 00X → | Bluff → SOUND → I-S1: Pile toplama (kağıt sürüme/yığın sesi)
* [ ] 00X → | Bluff → SOUND → I-S2: Pişti "ding" + kısa melodi (200ms)
* [ ] 00X → | Bluff → SOUND → I-S2: Jackpot pişti büyük ödül sesi (coin/jackpot jingle, 500ms)
* [ ] 00X → | Bluff → SOUND → I-S2: Blof kapalı kart düşük tonlu "thud" (gerilim yaratır)
* [ ] 00X → | Bluff → SOUND → I-S2: CALL dramatik reveal sesi (davul roll + açılma, 1s)
* [ ] 00X → | Bluff → SOUND → I-S2: PASS yumuşak "swipe" sesi (rahatlama hissi)
* [ ] 00X → | Bluff → SOUND → I-S3: Kazanma kısa zafer fanfarı (tatmin edici ama abartısız, 1.5s)
* [ ] 00X → | Bluff → SOUND → I-S3: Kaybetme hafif minör akor (üzüntü ama motivasyon kırıcı değil, 1s)
* [ ] 00X → | Bluff → STABILITE → I-ST1: Reconnect senaryolarını test et (30s grace period)
* [ ] 00X → | Bluff → STABILITE → I-ST1: Blof timer reconnect sonrası doğru devam etmeli
* [ ] 00X → | Bluff → STABILITE → I-ST1: Oyun ortasında disconnect → reconnect → state restore
* [ ] 00X → | Bluff → STABILITE → I-ST1: Rate limiting (aynı kart 2 kez oynanamaz, spam koruma)
* [ ] 00X → | Bluff → STABILITE → I-ST2: Server hatalarını client'a anlaşılır mesajla gönder
* [ ] 00X → | Bluff → STABILITE → I-ST2: Client'ta toast/banner ile hata göster (3s sonra kapat)
* [ ] 00X → | Bluff → STABILITE → I-ST2: Socket kopma durumunda görsel geri bildirim
* [ ] 00X → | Bluff → FEATURE → F1: Server scoring.ts → checkWildcardBonus(hand, config) fonksiyonu
* [ ] 00X → | Bluff → FEATURE → F1: Server game.service.ts → dağıtımda kontrol et
* [ ] 00X → | Bluff → FEATURE → F1: Client bonus animasyonu (floating text + özel efekt)
* [ ] 00X → | Bluff → FEATURE → F1: Docs 05_SCORING_GUIDE.md → yeni senaryo satırı ekle
* [ ] 00X → | Bluff → FEATURE → F2: Client GameOverScreen → "Tekrar Oyna" butonu ekle
* [ ] 00X → | Bluff → FEATURE → F2: Server aynı oda + aynı config ile yeni oyun başlat
* [ ] 00X → | Bluff → FEATURE → F2: İki oyuncu da "Tekrar Oyna" derse → restart
* [ ] 00X → | Bluff → FEATURE → F3: Server son dağıtımı tespit et (deck boş kalacak)
* [ ] 00X → | Bluff → FEATURE → F3: Client büyük "SON EL!" banner animasyonu (ortada, 1.5s, scale bounce)
* [ ] 00X → | Bluff → FEATURE → F4: Server isRealPisti() → wildcard eşleşmesini false döndür
* [ ] 00X → | Bluff → FEATURE → F4: Server calcBluffScore() → wildcard CALL case'lerini kaldır
* [ ] 00X → | Bluff → FEATURE → F4: Tüm docs güncelle ([CLAUDE.md](http://claude.md/), 01_MASTER.md, 05_SCORING_GUIDE.md, .claude/rules/game-rules.md)
* [ ] 00X → | Bluff → FEATURE → F4: Playing test (J ile blof yap → rakip AÇ → caller +10, pile caller'a)
  </aside>
