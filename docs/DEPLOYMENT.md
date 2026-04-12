# Shade — Deployment Rehberi

Bu rehber Shade oyununu production ortamina deploy etme adimlaridir.

## Mimari

```
[Cloudflare Pages]          [Render]
  Client (Static)    <-->    Server (NestJS + WebSocket)
  PixiJS SPA                 API + Socket.io
  CDN uzerinden              Docker container
```

- **Client** → Vite build output (static HTML/JS/CSS) → Cloudflare Pages
- **Server** → NestJS Docker container → Render
- Her ikisi de tamamen ucretsiz
- User - > edleron
- User - > wilkagul
- doployment keywords --- :  [deploy]

---

## On Kosullar

1. **GitHub hesabi** — repo GitHub'da olmali
2. **Docker Desktop** — local dev icin (https://docs.docker.com/get-docker/)
3. **Render hesabi** — https://render.com (GitHub ile giris, ucretsiz)
4. **Cloudflare hesabi** — https://dash.cloudflare.com/sign-up (ucretsiz)

---

## Adim 1 — Local Development (Docker)

> **Ekip arkadaslari icin:** Makinende Node.js, pnpm veya baska bir sey
> kurmanin GEREKMEZ. Sadece Docker Desktop yeterli. Isletim sistemi
> farketmez (Windows, macOS, Linux).

### 1.1 Docker Desktop kur

Henuz kurulu degilse:

1. https://docs.docker.com/get-docker/ adresine git
2. Isletim sistemine uygun versiyonu indir
3. Kur ve calistir
4. Terminal'de kontrol et:
   ```bash
   docker --version
   # Docker version 27.x.x gibi bir cikti gelmeli
   ```

### 1.2 Repo'yu klonla

```bash
git clone <repo-url>
cd HubShade
```

### 1.3 Docker image'larini build et

```bash
docker-compose build
```

> Ilk seferde ~2-3 dakika surer (dependency'ler indirilir).
> Sonraki build'ler cache'ten gelir, cok hizli olur.

### 1.4 Calistir

```bash
docker-compose up
```

Terminalde su loglar gorunmeli:

```
server-1  | Shade server running on http://localhost:3001
server-1  | WebSocket namespace: /game
client-1  | VITE v6.x.x ready in xxx ms
client-1  |   ➜  Local:   http://localhost:5173/
```

### 1.5 Oyunu ac

1. Tarayicida ac: **http://localhost:5173**
2. **edleron** butonuna tikla (host — oyun ayarlarini secer)
3. Deste (Tek/Cift) ve Blof (Acik/Kapali) ayarla → **Hazirim** tikla
4. Ikinci tarayici sekmesi ac: **http://localhost:5173**
5. **wilkagul** butonuna tikla → Oyun otomatik baslar!

> **Oyuncular:**
>
> | Oyuncu | Rol | Aciklama |
> | ------ | --- | -------- |
> | `edleron` | Host | Oyun ayarlarini secer (deste, blof) |
> | `wilkagul` | Guest | Direkt odaya katilir, ayar yapmaz |
>
> Oyun bitince veya sekme kapatilinca oda resetlenir.

### 1.6 Durdurma ve yeniden baslatma

```bash
# Durdurmak icin: Ctrl+C (terminalde)
# veya:
docker-compose down

# Arka planda calistirmak icin:
docker-compose up -d

# Arka plandayken loglari gormek:
docker-compose logs -f

# Sadece server loglarini gormek:
docker-compose logs -f server

# Sadece client loglarini gormek:
docker-compose logs -f client
```

### 1.7 Kod degisince ne yapmaliyim?

**Kaynak kodu degistiysen** (`src/` altindaki dosyalar):
→ Bir sey yapmana gerek yok. Hot reload aktif, otomatik yenilenir.

**Dependency degistiysen** (`package.json` degisti):

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### 1.8 Docker olmadan calistirmak (alternatif)

Docker kurmak istemiyorsan, su gereksinimlere ihtiyacin var:

- Node.js >= 22
- pnpm >= 10

```bash
pnpm install

# Terminal 1 — Server
cd server && pnpm start:dev

# Terminal 2 — Client
cd client && pnpm dev
```

---

## Adim 2 — Server Deploy (Render)

### 2.1 Render hesabi olustur

1. https://render.com adresine git
2. **"Get Started for Free"** tikla
3. **"GitHub"** ile giris yap

### 2.2 Yeni Web Service olustur

1. Render dashboard'da **"New +"** tikla
2. **"Web Service"** sec
3. GitHub repo'nu bagla:
   - Ilk seferde **"Connect GitHub"** tikla ve Render'a repo erisimi ver
   - Shade repo'sunu sec (ornegin `HubShade`)

### 2.3 Service ayarlari

Render sana ayarlari soracak. Su sekilde doldur:

| Ayar                    | Deger                                            |
| ----------------------- | ------------------------------------------------ |
| **Name**          | `shade-server`                                 |
| **Region**        | `Frankfurt (EU Central)` (veya en yakin bolge) |
| **Branch**        | `main`                                         |
| **Runtime**       | `Docker`                                       |
| **Instance Type** | `Free`                                         |

> Render root'taki `Dockerfile`'i otomatik bulacak.
> Ekstra Dockerfile path belirtmene gerek yok.

### 2.4 Environment Variables (Opsiyonel)

Render dashboard'da projenin **"Environment"** sekmesine git:

| Degisken | Deger                | Aciklama                                           |
| -------- | -------------------- | -------------------------------------------------- |
| `PORT` | Render otomatik atar | **EKLEME** — Render kendi PORT'unu set eder |

> Render `PORT` env var'ini otomatik atar. `server/src/main.ts` zaten
> `process.env.PORT` kullaniyor, ekstra ayar gerekmez.

### 2.5 Deploy et

1. **"Create Web Service"** tikla
2. Render build'i baslatacak (~3-5dk ilk seferde)
3. Tamamlaninca sana bir URL verecek, ornegin:
   ```
   https://shade-server-kink.onrender.com
   ```
4. **Bu URL'yi kopyala** — Client deploy'da lazim olacak

### 2.6 Auto-Deploy kapat + Deploy Hook al

> **ONEMLI:** Her commit'te deploy olmasin diye auto-deploy'u kapatiyoruz.
> Sadece commit mesajinda `[deploy]` yazinca deploy olacak.

1. Render dashboard'da projenin **"Settings"** sekmesine git
2. **"Build & Deploy"** bolumunde **"Auto-Deploy"** → **"No"** yap
3. Ayni bolumde **"Deploy Hook"** → **"Create Deploy Hook"** tikla
4. Hook URL'yi kopyala (ornegin `https://api.render.com/deploy/srv-xxx?key=yyy`)
5. GitHub repo'na git → **Settings** → **Secrets and variables** → **Actions**
6. **"New repository secret"** tikla:
   - Name: `RENDER_DEPLOY_HOOK`
   - Value: kopyaladigin Deploy Hook URL'si

### 2.7 Deploy kontrol

- Dashboard'da **"Events"** sekmesinden build loglarini izleyebilirsin
- "Live" yaziyorsa server calisiyor demektir

### 2.7 Test et

```bash
# Tarayicidan veya terminal'den
curl https://shade-server-kink.onrender.com/rooms

# Bos array donmeli: []
```

> **NOT:** Render free tier'da servis 15dk inaktif kalinca uyku moduna gecer.
> Ilk istek ~30-60sn surer (cold start). Sonraki istekler aninda gelir.
> Bu MVP/test icin kabul edilebilir.

---

## Adim 3 — Client Deploy (Cloudflare Pages)

### 3.1 Cloudflare hesabi olustur

1. https://dash.cloudflare.com/sign-up adresine git
2. Email + sifre ile kayit ol (ucretsiz)

### 3.2 Pages projesi olustur

1. Cloudflare dashboard'da sol menuden **"Workers & Pages"** tikla
2. **"Create"** butonuna tikla
3. **"Pages"** sekmesini sec
4. **"Connect to Git"** tikla
5. GitHub hesabini bagla
6. Shade repo'sunu sec

### 3.3 Build ayarlari

Cloudflare sana build ayarlarini soracak. Su sekilde doldur:

| Ayar                         | Deger                                        |
| ---------------------------- | -------------------------------------------- |
| **Framework preset**   | `None`                                     |
| **Build command**      | `npx pnpm install && npx pnpm --filter web-plate build` |
| **Build output directory** | `client/dist`                            |

> **NOT:** Cloudflare varsayilan olarak `npm` kullanir ve `pnpm` workspace
> yapisini tanimaz. Bu yuzden build command icinde `npx pnpm install` ile
> once pnpm dependency'leri kurulur, sonra client build edilir.
> Filter ismi `web-plate` olarak kullanilir (`client/package.json` → `"name": "web-plate"`).

### 3.4 Environment Variables ayarla

**"Advanced Settings"** bolumunu ac ve su degiskenleri ekle:

| Degisken            | Deger                                      | Aciklama               |
| ------------------- | ------------------------------------------ | ---------------------- |
| `VITE_SERVER_URL` | `https://bluff-server.onrender.com`      | Render'dan aldigin URL |
| `NODE_VERSION`    | `22`                                     | Node.js versiyonu      |

> **ONEMLI:** `VITE_SERVER_URL` degeri Render'dan aldigin domain olmali.
> Sonunda `/` OLMAMALI.

### 3.5 Deploy et

1. **"Save and Deploy"** tikla
2. Cloudflare build'i baslatacak (~1-2dk)
3. Tamamlaninca sana bir URL verecek:
   ```
   https://shade.pages.dev
   ```

### 3.6 Auto-Deploy kapat + Deploy Hook al

1. Cloudflare Pages projesinin **"Settings"** → **"Builds & Deployments"** sekmesine git
2. **"Configure Production deployments"** → Branch control'u **"None"** yap (otomatik deploy kapanir)
3. **"Deploy Hooks"** bolumunde **"Add deploy hook"** tikla
   - Hook name: `github-action`
   - Branch: `main`
4. Hook URL'yi kopyala
5. GitHub repo'na git → **Settings** → **Secrets and variables** → **Actions**
6. **"New repository secret"** tikla:
   - Name: `CLOUDFLARE_DEPLOY_HOOK`
   - Value: kopyaladigin Deploy Hook URL'si

### 3.7 Test et

1. Tarayicida `https://shade.pages.dev` ac
2. Token gir: `edleron`
3. "Giris" tikla
4. Oda kur, ikinci tarayicida diger token ile katil

> **Ilk acilista yavas olabilir** — Render server'i uyandirmasi gerekiyor (cold start).
> 30-60sn bekle, sonra her sey hizli calisir.

---

## Adim 4 — Custom Domain (Opsiyonel)

### Cloudflare Pages icin

1. Pages projesinin **"Custom domains"** sekmesine git
2. **"Set up a custom domain"** tikla
3. Domain'ini gir (ornegin `shade.edleron.com`)
4. DNS kayitlarini Cloudflare otomatik ayarlar

### Render icin

1. Projenin **"Settings"** sekmesine git
2. **"Custom Domains"** bolumunde domain'ini ekle
3. DNS'de CNAME kaydini Render'in verdigi adrese yonlendir

---

## Environment Variables Referansi

### Server (Render)

| Degisken | Default  | Aciklama             |
| -------- | -------- | -------------------- |
| `PORT` | `3001` | Render otomatik atar |

### Client (Cloudflare Pages)

| Degisken            | Default                   | Aciklama                      |
| ------------------- | ------------------------- | ----------------------------- |
| `VITE_SERVER_URL` | `http://localhost:3001` | Server API + WebSocket URL'si |
| `NODE_VERSION`    | `22`                    | Build icin Node.js versiyonu  |

### Local Development

| Degisken            | Nerede          | Default                   |
| ------------------- | --------------- | ------------------------- |
| `PORT`            | `server/.env` | `3001`                  |
| `VITE_SERVER_URL` | `client/.env` | `http://localhost:3001` |

---

## Troubleshooting

### "WebSocket connection failed"

- `VITE_SERVER_URL` dogru mu kontrol et (Render URL)
- Render'da server calisiyormu kontrol et (dashboard'da "Live" yazisi)
- Server uyku modunda olabilir — 30-60sn bekle, tekrar dene
- CORS: Server `origin: '*'` kullaniyor, sorun olmamali

### "Invalid token" / "Baglanti hatasi"

- Kullanici adi dogru mu: `edleron` veya `wilkagul`
- Server calisiyormu kontrol et

### Render build hatasi

- `Dockerfile` root'ta olmali
- Build loglarini kontrol et (Dashboard → Events)
- Docker build icinde `pnpm install` hata veriyorsa: `.npmrc` ve `pnpm-workspace.yaml` root'ta olmali

### Cloudflare Pages build hatasi

- Build command'i kontrol et: `pnpm --filter client build`
- `VITE_SERVER_URL` env var set edilmis mi?
- `NODE_VERSION` = `22` set edilmis mi?
- Build output: `client/dist`

### Render server cok yavas basliyor (cold start)

- Free tier'da 15dk inaktivite sonrasi uyku moduna gecer
- Ilk istek ~30-60sn surer, sonraki istekler hizli
- Cozum: Paid plan'a gec ($7/ay) veya cron job ile server'i uyanik tut

### Docker "port already in use"

```bash
# Hangi process portu kullaniyor?
# Windows:
netstat -ano | findstr :3001
# macOS/Linux:
lsof -i :3001

# Docker containerlari durdur
docker-compose down
```

### Dependency degisince Docker calismiyor

```bash
docker-compose build --no-cache
docker-compose up
```

---

## Deploy Kullanimi

Deployment sadece commit mesajinda `[deploy]` keyword'u varsa tetiklenir.
Her push'ta sunucular mesgul edilmez.

```bash
# Normal commit — deploy OLMAZ
git commit -m "fix: button rengi duzeltildi"

# Deploy commit — Render + Cloudflare guncellenir
git commit -m "feat: yeni ozellik eklendi [deploy]"
```

> **On kosul:** Render ve Cloudflare'den Deploy Hook URL'leri alinmis
> ve GitHub Actions secrets'a eklenmi olmali (bkz. Adim 2.6 ve 3.6).

---

## Ucret Bilgisi

| Servis                     | Plan | Limit                             |
| -------------------------- | ---- | --------------------------------- |
| **Render**           | Free | 750 saat/ay, 15dk sonra uyku      |
| **Cloudflare Pages** | Free | 500 build/ay, unlimited bandwidth |
| **GitHub**           | Free | Private repo, unlimited           |

> MVP icin bu limitler fazlasiyla yeterli.
> Render free tier'da 750 saat/ay = kesintisiz kullanim icin yeterli.
> Cold start rahatsiz ederse: Render Starter plan $7/ay (uyku yok).
