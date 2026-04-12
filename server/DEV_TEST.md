# Dev Test Rehberi

## Sunucuyu Baslat

```bash
cd server && pnpm run start:dev
# → http://localhost:3001
# → WebSocket: ws://localhost:3001/game
```

## HTTP Test Akisi

### 1. Player 1 kayit
```bash
curl -X POST http://localhost:3001/auth/nickname \
  -H "Content-Type: application/json" \
  -d '{"nickname":"Player1"}'
# → {"token":"TOKEN_1","playerId":"ID_1","nickname":"Player1"}
```

### 2. Player 2 kayit
```bash
curl -X POST http://localhost:3001/auth/nickname \
  -H "Content-Type: application/json" \
  -d '{"nickname":"Player2"}'
# → {"token":"TOKEN_2","playerId":"ID_2","nickname":"Player2"}
```

### 3. Oda olustur (Player 1)
```bash
curl -X POST http://localhost:3001/rooms \
  -H "Authorization: Bearer TOKEN_1"
# → {"roomId":"ROOM_ID","code":"ABCD"}
```

### 4. Odaya katil (Player 2)
```bash
curl -X POST http://localhost:3001/rooms/ROOM_ID/join \
  -H "Authorization: Bearer TOKEN_2"
# → {"roomId":"ROOM_ID","code":"ABCD","playerCount":2}
```

### 5. Odalari listele
```bash
curl http://localhost:3001/rooms
```

## WebSocket Test (wscat ile)

```bash
# Terminal 1 — Player 1
npx wscat -c "ws://localhost:3001/game" -H "auth:{\"token\":\"TOKEN_1\"}"
> {"event":"joinRoom","data":{"roomId":"ROOM_ID"}}

# Terminal 2 — Player 2
npx wscat -c "ws://localhost:3001/game" -H "auth:{\"token\":\"TOKEN_2\"}"
> {"event":"joinRoom","data":{"roomId":"ROOM_ID"}}

# Iki oyuncu da joinRoom yapinca oyun baslar
# roomState ve yourHand eventleri gelir

# Kart oyna (kendi elindeki kartın ID'sini kullan)
> {"event":"playCard","data":{"cardId":"S7_0","isHidden":false}}

# Blof karari (rakip blof attiginda)
> {"event":"bluffDecision","data":{"decision":"CALL"}}
```

## Socket.io Client ile Test (browser console)

```javascript
const io = require('socket.io-client');
// veya browser: <script src="https://cdn.socket.io/4.7.5/socket.io.min.js">

const socket = io('ws://localhost:3001/game', {
  auth: { token: 'TOKEN_1' }
});

socket.on('roomState', (state) => console.log('State:', state));
socket.on('yourHand', (hand) => console.log('Hand:', hand));
socket.on('bluffRequest', (data) => console.log('Bluff!', data));
socket.on('gameOver', (result) => console.log('Game Over:', result));
socket.on('error', (err) => console.log('Error:', err));

// Odaya katil
socket.emit('joinRoom', { roomId: 'ROOM_ID' });

// Kart oyna
socket.emit('playCard', { cardId: 'S7_0', isHidden: false });

// Blof karari
socket.emit('bluffDecision', { decision: 'CALL' });
```

## Notlar

- Token'lar sunucu restart'inda sifirlanir (RAM-only)
- Oda dolu (2 kisi) + iki oyuncu joinRoom yapar → oyun otomatik baslar
- Bluff timeout: 30 saniye sonra oyuncu disconnect sayilir
- ACTIVE_DECK_CONFIG degistirmek: `src/shared/game.config.ts` icinde tek satir
