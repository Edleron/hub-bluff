# Dev Test Rehberi

## Sunucuyu Baslat

```bash
cd server && pnpm run start:dev
# → http://localhost:3001
# → WebSocket: ws://localhost:3001/game
```

## HTTP Test Akisi

### 1. Login (edleron — host)
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"token":"edleron"}'
# → {"token":"edleron","playerId":"player-1","nickname":"edleron","roomId":"default-room","serverVersion":"0.0.1","isHost":true}
```

### 2. Login (wilkagul — guest)
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"token":"wilkagul"}'
# → {"token":"wilkagul","playerId":"player-2","nickname":"wilkagul","roomId":"default-room","serverVersion":"0.0.1","isHost":false}
```

## WebSocket Test (wscat ile)

```bash
# Terminal 1 — edleron (host)
npx wscat -c "ws://localhost:3001/game" -H "auth:{\"token\":\"edleron\"}"
> {"event":"joinRoom","data":{"roomId":"default-room","config":{"deckType":"single","bluffEnabled":true}}}

# Terminal 2 — wilkagul (guest)
npx wscat -c "ws://localhost:3001/game" -H "auth:{\"token\":\"wilkagul\"}"
> {"event":"joinRoom","data":{"roomId":"default-room"}}

# Iki oyuncu da joinRoom yapinca oyun baslar
# roomState ve yourHand eventleri gelir

# Kart oyna (kendi elindeki kartin ID'sini kullan)
> {"event":"playCard","data":{"cardId":"S7","isHidden":false}}

# Kapali oyna (blof — sadece pile === 1 ise)
> {"event":"playCard","data":{"cardId":"H7","isHidden":true}}

# Blof karari (rakip blof attiginda)
> {"event":"bluffDecision","data":{"decision":"CALL"}}
```

## Socket.io Client ile Test (browser console)

```javascript
const socket = io('ws://localhost:3001/game', {
  auth: { token: 'edleron' }
});

socket.on('roomState', (state) => console.log('State:', state));
socket.on('yourHand', (hand) => console.log('Hand:', hand));
socket.on('bluffRequest', (data) => console.log('Bluff!', data));
socket.on('bluffResolved', (data) => console.log('Resolved:', data));
socket.on('cardPlayed', (data) => console.log('Card:', data));
socket.on('scoreUpdate', (data) => console.log('Score:', data));
socket.on('gameOver', (result) => console.log('Game Over:', result));
socket.on('error', (err) => console.log('Error:', err));

// Odaya katil (host config ile)
socket.emit('joinRoom', {
  roomId: 'default-room',
  config: { deckType: 'single', bluffEnabled: true }
});

// Kart oyna
socket.emit('playCard', { cardId: 'S7', isHidden: false });

// Blof karari
socket.emit('bluffDecision', { decision: 'CALL' });
```

## Notlar

- Tokenlar sabit: `edleron` (host) ve `wilkagul` (guest)
- Tek sabit oda: `default-room` (oda kurma/secme yok)
- Host JOIN_ROOM'da config gonderir (deckType + bluffEnabled)
- Guest config gondermez, host'un ayarlari gecerlidir
- Iki oyuncu joinRoom yapinca oyun otomatik baslar
- Bluff timeout: 30 saniye sonra otomatik PASS
- Disconnect: 30 saniye grace period, sonra oyun silinir
- Tum state RAM'de — sunucu restart'inda sifirlanir
