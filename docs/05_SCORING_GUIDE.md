# Bluff — Puanlama Rehberi

**Versiyon:** 0.0.5
**Tarih:** 2026-04-12

---

## PUANLAMA TABLOSU

| #  | Ne Oldu                                                          | Puan  | Kime         | Kosul                                                      | Ornek                                           |
| -- | ---------------------------------------------------------------- | ----- | ------------ | ---------------------------------------------------------- | ----------------------------------------------- |
| 1  | Eli aldin, icinde **Sinek 2** var                                | +2    | Eli alan     | Masadaki kartlari aldin, icinde C2 var                     | Masada [3, C2, 7], sen 7 attin → +2            |
| 2  | Eli aldin, icinde **Karo 10** var                                | +3    | Eli alan     | Masadaki kartlari aldin, icinde D10 var                    | Masada [D10, 5], sen 5 attin → +3              |
| 3  | El dagitildi, elinde **A+K+Q** var                               | +30   | Eli tutan    | Dagitimda 4 karttan 3'u A+K+Q ise flush bonusu            | Eline [A, K, Q, 7] geldi → +30                 |
| 4  | El dagitildi, **4'u de ayni rank**                               | +50   | Eli tutan    | Four of a Kind (orn: 7-7-7-7, A-A-A-A)                    | Eline [7, 7, 7, 7] geldi → +50                 |
| 5  | Eli aldin, icinde **J** veya **Joker** var                       | 0     | —            | Wildcard — alma gucu var, puan yok                         | Deger vermez                                    |
| 6  | **Normal Pisti**                                                 | +10   | Pisti yapan  | Masada tek kart (zemin) + sen eslesen rank attin           | Masada 7, sen 7 → +10                          |
| 7  | **J/Joker ile eli aldin** (zemin normal kart)                    | 0     | Eli alan     | Masada tek kart + sen J/Joker attin, zemin wildcard degil  | Sadece kart degerleri gecerli, pisti bonusu yok |
| 8  | **Jackpot Pisti** (wildcard vs wildcard)                         | +50   | Pisti yapan  | Masada tek kart = J veya Joker + sen de J veya Joker attin | Masada J, sen Joker → +50                      |
| 9  | **Blof** — rakip **Gec** dedi                                    | +10   | Blofcu       | Kapali attin, rakip acmadi                                 | Pile blofcuya gider                             |
| 10 | **Blof** — rakip **Gec** dedi (wildcard ustune wildcard)         | +30   | Blofcu       | Kapali wildcard attin, zemin de wildcard, rakip acmadi     | Pile blofcuya gider                             |
| 11 | **Blof** — rakip **Ac** dedi, kartin **eslesiyor** (rank match)  | +20   | Blofcu       | Kapali attin, gercekten rank eslesiyor                     | Pile blofcuya gider                             |
| 12 | **Blof** — rakip **Ac** dedi, **wildcard ile normal kart**       | 0     | Blofcu       | Wildcard ile blof yaptin, eli alirsin ama bonus yok        | Pile blofcuya gider, 0 bonus                    |
| 13 | **Blof** — rakip **Ac** dedi, **wildcard ustune wildcard**       | +100  | Blofcu       | Wildcard ile wildcard zemine blof, en nadir senaryo        | Pile blofcuya gider                             |
| 14 | **Blof** — rakip **Ac** dedi, kartin **eslesmiyor**              | +10   | Rakip        | Kapali attin, rakip yakaladi                               | Pile caller'a gider                             |
| 15 | **Blof** — **30sn timeout**                                      | +10   | Blofcu       | Otomatik Gec                                               | Pile blofcuya gider                             |
| 16 | Oyun sonu — **en cok kart** sende                                | +5    | Cok toplayan | Berabere ise kimseye verilmez                              | 30 vs 22 kart → +5                             |
| 17 | Oyun sonu — masada **kart kaldi**                                | degisir | Cok toplayan | Kalan kartlarin degerleri (C2/D10)                       | Masada [C2, D10] → +5                          |

> **Satirlar birikimlidir.** Tek hamlede birden fazla tetiklenebilir.
> Ornek: Masada 7 (zemin), sen 7 attin → Normal Pisti(+10) = **+10**
> Ornek: Masada J (zemin), sen Joker attin → Jackpot Pisti(+50) = **+50**
> **Sira her zaman diger oyuncuya gecer.** Hicbir sonuc sirayi etkilemez.

---

## Terimler

| Terim               | Aciklama                                                                |
| ------------------- | ----------------------------------------------------------------------- |
| **Masa**      | Ortadaki kart yigini. Oyuncular sirayla buraya kart atar                |
| **Zemin**     | Masa bosken atilan ilk kart. Pisti firsati olusturur                    |
| **Eli almak** | Masadaki tum kartlari toplamak (rank eslesmesi veya wildcard ile)       |
| **Pisti**     | Masada sadece 1 kart (zemin) varken, eslesen kart atarak eli almak      |
| **Wildcard**  | J (Vale) ve Joker — masadaki tum kartlari alir, rank farketmez         |
| **Blof**      | Masada 1 kart varken, kartini kapali atarak pisti yaptigini iddia etmek |
| **Flush**     | Dagitimda elde A+K+Q birlikte gelirse +30 bonus                        |
| **Four of a Kind** | Dagitimda 4 kart ayni rank ise +50 bonus (orn: 7-7-7-7)          |

---

## PUAN AKIS OZETI

```

Kart oynarsin
  │
  ├─ Eli aldin mi? (rank eslesti veya wildcard)
  │   ├─ EVET
  │   │   ├─ Aldiklarin icindeki ozel kartlar → C2(+2), D10(+3)
  │   │   └─ Pisti mi? (masada sadece 1 kart vardi)
  │   │       ├─ Normal kart ile (rank match) → +10
  │   │       ├─ Wildcard vs normal kart → 0 (bonus yok)
  │   │       └─ Wildcard vs wildcard (J/Joker ustune J/Joker) → +50 (jackpot)
  │   └─ HAYIR → 0, kart masaya duser
  │
  ├─ Blof mu? (kapali attin + blof acik + masada 1 kart)
  │   ├─ Rakip PASS → +10, pile blofcuya
  │   ├─ Rakip PASS (wildcard ustune wildcard) → +30, pile blofcuya
  │   ├─ Rakip CALL + gercek (rank match) → +20, pile blofcuya
  │   ├─ Rakip CALL + gercek (wildcard+normal) → 0, pile blofcuya
  │   ├─ Rakip CALL + gercek (wildcard+wildcard) → +100, pile blofcuya
  │   ├─ Rakip CALL + sahte → 0 (rakip +10), pile caller'a
  │   └─ 30sn timeout → +10 (otomatik PASS), pile blofcuya
  │
  ├─ El bonusu? (dagitimda kontrol edilir)
  │   ├─ Four of a Kind (4 ayni rank) → +50
  │   └─ Flush (A+K+Q) → +30
  │
  └─ Oyun bitti mi?
      ├─ Masada kart kaldi → en cok toplayan alir + kart degerleri
      └─ En cok kart toplayan → +5 (berabere = kimseye 0)


```
