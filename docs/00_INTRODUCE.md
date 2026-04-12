# Bluff - Proje Tanitimi

Pisti tabanli, blof mekanigine sahip gercek zamanli 1v1 kart oyunu.

## Konsept

Klasik Pisti kuralina bir katman ekleniyor: **Blof (Kapali Kart)**. Masada tek bir kart varken (pisti zemini), oyuncu kartini kapali atarak Pisti iddia edebilir. Rakip "Ac!" (karti actir) veya "Gec" (kabul et) der. Bu basit eklenti oyunu psikolojik bir akil oyununa donusturur.

## Mimari (MVP - Minimal)

```
hub-bluff/
├── server/    → Tek NestJS: HTTP (Auth, Room) + WebSocket (oyun)
│   └── src/shared/  → Ortak tipler + config
├── client/    → PixiJS + Vite: Lobby UI + Oyun Ekrani
│   └── src/shared/  → server/src/shared'dan kopyalanan tipler
└── docs/      → Dokumantasyon
```

- **2 proje**, **0 veritabani**, **1 domain**, **1 server**
- Oda ve oyuncu bilgisi RAM'de (in-memory Map)
- Token-based auth (2 sabit token, `game.config.ts`)

## Mevcut Durum (v1)

Asagidaki ozellikler implement edilmistir:

- 1v1 gercek zamanli oyun (tam Pisti kurallari)
- Blof mekanigi (sadece pisti durumunda — masada 1 kart varken)
- 30 saniye blof timeout (otomatik Gec)
- Server-side kart maskeleme (blof karti gizli)
- Kart dagitim, pile toplama, tur sistemi, oyun sonu
- Reconnection destegi
- GSAP animasyonlari + PerspectiveMesh 3D kart cevirme

## Blof Kurali (Pisti-Only)

Blof **sadece masada tam 1 kart varken** (pisti zemini) yapilabilir.

### Nasil Calisir?

1. Masa bosaltilmistir (pile = 0)
2. Rakip ilk kartini acik atar (ornegin: Maca 7) → pile = 1
3. Eger senin elinde eslesen kart varsa, normal atip Pisti yapabilirsin
4. **Blof Secenegi:** Kartini **kapali** atarak "Pisti" iddia edebilirsin
   - Gercekten eslesen kart olabilir, ya da tamamen farkli bir kart

### Rakibin Secenekleri

Rakip 30 saniye icinde karar verir (timeout = otomatik Gec):

**"Ac!" (Call) — Karti actir:**
- Gercek Pisti ise (kart eslesiyor veya wildcard) → blofcu **+20 puan**
- Sahte Pisti ise (kart eslesmiyorsa) → rakip **+10 puan**

**"Gec" (Pass) — Kabul et:**
- Kart acilmaz → blofcu **+10 puan**

### Ozet Tablo

| Durum | Sonuc |
|-------|-------|
| Blof yapmadiniz, rakip acti | +20 puan (sana) |
| Blof yaptiniz, rakip acti | +10 puan (rakibe) |
| Rakip acmadi (Gec dedi) | +10 puan (sana) |

### Kod Referansi

Blof kurali su dosyalarda tanimlidir:
- Server: `server/src/engine/rules.ts` → `canBluff(pileCount, topCard)` — `pileCount === 1`
- Client: `client/src/app/screens/GameScreen.ts` → `renderState()` + `updateHiddenPlayButton()` — `pileCount === 1`
- Her elde blof istenirse: `=== 1` → `>= 1` yap (her iki dosyada)

## Step'ler

| Step | Kapsam | Durum |
|------|--------|-------|
| **Step 1 (MVP)** | 1v1 oyun + blof mekanigi + puanlama + runtime config + deployment | Tamamlandi |
| **Step 2 (Polish)** | Stabilizasyon, test, UI iyilestirme, production-hardening | Planli |
| **Step 3 (Scale)** | 4 kisilik mod, PostgreSQL, ekonomi, matchmaking | Planli |
