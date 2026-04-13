# Bluff

**Bluff** is a fast-paced, competitive 1v1 multiplayer card game that builds a risk-reward bluffing mechanic on top of the classic Turkish card game **Pisti**.

It transforms a luck-based card matching game into a psychological mind game of manipulation and quick decisions.

---

## Versioning

### v1 — MVP (current)
- 1v1 real-time gameplay with full Pisti rules
- NestJS monolithic server (REST + WebSocket on single port)
- PixiJS 8 game client with GSAP animations, PerspectiveMesh card flip
- In-memory state (no database)
- Guest login (nickname only, JWT 24h)
- Lobby: room create / join / list
- Pile collection, dealing, turn system, game over flow
- Reconnection support
- **Bluff mechanic** (Pisti-only): play card face-down on Pisti, opponent Aç!/Geç
- Bluff timeout (30s auto-PASS with countdown)
- Hidden card masking (server-side security)

### v2 — Polish (planned)
- End-of-game card-value scoring (Aces, 10D, 2C, most cards bonus)
- Score change animations (+10 floating text, Pisti effect)
- Sound effects & background music
- Turn timer with visual countdown

### v3 — Production (planned)
- Monorepo split: hub-bluff-api, hub-bluff-battle, hub-bluff-lobby, hub-bluff-game
- PostgreSQL + TypeORM for persistent data
- User accounts (register/login) replacing guest auth
- Match history & leaderboard
- Lobby chat
- Spectator mode
- Mobile responsive layout
- Deployment (Docker, CI/CD)

---

## Project Structure

```
HubBluff/
├── server/             NestJS backend (REST API + WebSocket gateway)
│   ├── src/
│   │   ├── auth/       JWT authentication (guest login)
│   │   ├── room/       Room CRUD (create, join, list)
│   │   ├── game/       Game gateway + service (socket events, state management)
│   │   ├── engine/     Game engine (deck, rules, scoring)
│   │   └── shared/     Shared types, enums, events, config
│   └── package.json
│
├── client/             PixiJS 8 game client (Vite)
│   ├── src/
│   │   ├── app/        Screens (Lobby, Game, GameOver, Load)
│   │   ├── engine/     Navigation system, app bootstrap
│   │   ├── game/       Session, services (API, Socket), components (CardSprite), utils
│   │   └── shared/     Shared types (manual sync with server)
│   └── package.json
│
├── docs/               Phase guides & architecture docs
└── CLAUDE.md           AI assistant instructions
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11, TypeScript |
| Frontend | PixiJS 8, TypeScript, Vite |
| Animation | GSAP 3 (tweens), PerspectiveMesh (3D card flip) |
| Realtime | Socket.io 4 (namespace: `/game`) |
| Auth | JWT (24h, guest) |
| Package Manager | pnpm (workspace) |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8 (`npm install -g pnpm`)

### Installation

```bash
# Clone the repo
git clone https://github.com/user/HubBluff.git
cd HubBluff

# Install all dependencies (workspace)
pnpm install
```

### Running the Server

```bash
cd server
pnpm run start:dev
```

Server starts on **http://localhost:3001** (REST + WebSocket).

### Running the Client

```bash
cd client
pnpm run dev
```

Client starts on **http://localhost:5173**.

### Playing the Game

1. Open **two browser tabs** at `http://localhost:5173`
2. Enter a nickname in each tab and click **Giris**
3. In Tab 1: click **Oda Kur** to create a room
4. In Tab 2: click the room button that appears to join
5. Game starts automatically when both players are in the room

---

## Gameplay Rules

### Basics
- **Deck:** 52 cards (4 suits x 13 ranks), no Jokers in MVP
- **Setup:** 4 cards dealt to pile (top one face-up), 4 cards to each player
- **Turn:** Play one card per turn. When all hands empty, 4 more cards dealt from deck
- **Game ends** when deck and all hands are empty

### Capturing
- Play a card that **matches the rank** of the top pile card to capture the entire pile
- **Jack (J)** is a wildcard — captures regardless of top card

### Pisti
- If the pile has only 1 card and you capture it → **Pisti!** (+10 points)
- Jackpot Pisti (wildcard on wildcard: J on J, J on Joker, etc.) → **+50 points**
- Wildcard on normal card → captures pile but **+0 bonus**

### Bluff (Pisti-only)

Bluff can only be played when the pile has **exactly 1 card** (Pisti opportunity):

1. The pile is empty. Opponent plays a card face-up (e.g. 7 of Spades) → pile = 1
2. You select a card and press **"Kapali Oyna"** (Play Hidden) to play it face-down
3. You are claiming Pisti — but the card could be anything
4. Opponent has 30 seconds to decide:

| Opponent's Choice | If Real Pisti (rank match) | If Wildcard (J/Joker) | If Fake Pisti |
|-------------------|---------------------------|----------------------|---------------|
| **Ac!** (Call — reveal) | You get **+20 pts** | You get **0 pts** (pile only) | Opponent gets **+10 pts** |
| **Gec** (Pass — accept) | You get **+10 pts** | You get **+10 pts** | You get **+10 pts** |

If opponent doesn't decide in 30s → auto **Gec** (Pass).

> **Dev note:** Bluff is currently Pisti-only (`pileCount === 1`). To enable bluff on every turn, change `pileCount === 1` → `pileCount >= 1` in:
> - `server/src/engine/rules.ts` → `canBluff()`
> - `client/src/app/screens/GameScreen.ts` → `renderState()` + `updateHiddenPlayButton()`

---

## Port Map

| Service | Port |
|---------|------|
| Server (API + WS) | 3001 |
| Client (Vite) | 5173 |

---

## Available Commands

```bash
# Server
cd server
pnpm run start:dev    # Development mode (ts-node)
pnpm run build        # Compile TypeScript
pnpm run test         # Run Jest tests

# Client
cd client
pnpm run dev          # Vite dev server
pnpm run build        # Production build
pnpm run lint         # ESLint
```

---

## Architecture Notes

- **State masking:** Opponent's hand is never sent to the client — only `handCount`. Deck is never sent — only `deckRemaining`.
- **Shared types:** Currently manually duplicated between `server/src/shared/` and `client/src/shared/` (MVP). Will be extracted to `hub-bluff-shared` package in v3.
- **Animation pipeline:** play → collect → deal → gameOver, each step deferred until the previous completes.
- **Card ID format:** Server uses `S7_0` (Suit+Rank+_deckIndex), client sprite frame is `7_spades.png`.

---

## Docs

Detailed phase guides in `docs/`:

| File | Content |
|------|---------|
| `00_INTRODUCE.md` | Game concept & rules |
| `01_MASTER.md` | Architecture, shared types, AI strategy |
| `02_SERVER.md` | NestJS server guide |
| `03_CLIENT.md` | PixiJS client guide |

---

## Contact

edleron@hotmail.com | [edleron.com](https://edleron.com)
