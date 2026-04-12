import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { RoomService } from '../room/room.service';
import { GameService } from './game.service';
import { EVENTS_C2S, EVENTS_S2C, BluffDecision, GamePhase, GameConfig } from '../shared';
import { DEFAULT_ROOM_ID } from '../shared/game.config';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private socketToPlayer = new Map<string, { playerId: string; token: string }>();
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private bluffTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly authService: AuthService,
    private readonly roomService: RoomService,
    private readonly gameService: GameService,
  ) {}

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.auth as Record<string, unknown>)?.['token'] as string |
      undefined;
    if (!token) {
      client.emit(EVENTS_S2C.ERROR, { message: 'Token required' });
      client.disconnect();
      return;
    }

    const player = this.authService.validateToken(token);
    if (!player) {
      client.emit(EVENTS_S2C.ERROR, { message: 'Invalid token' });
      client.disconnect();
      return;
    }

    this.socketToPlayer.set(client.id, { playerId: player.id, token });

    const existingTimer = this.disconnectTimers.get(player.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.disconnectTimers.delete(player.id);
    }
  }

  handleDisconnect(client: Socket): void {
    const info = this.socketToPlayer.get(client.id);
    if (!info) return;
    this.socketToPlayer.delete(client.id);

    const roomId = this.gameService.getPlayerRoom(info.playerId);
    if (!roomId) return;

    // Notify remaining players
    this.server.to(roomId).emit(EVENTS_S2C.ERROR, {
      message: 'Rakip baglantisi koptu. 30 saniye bekleniyor...',
    });

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(info.playerId);
      const currentRoomId = this.gameService.getPlayerRoom(info.playerId);
      if (!currentRoomId || !this.gameService.hasGame(currentRoomId)) return;

      this.gameService.removeGame(currentRoomId);
      if (currentRoomId === DEFAULT_ROOM_ID) {
        this.roomService.resetDefaultRoom();
      } else {
        this.roomService.setStatus(currentRoomId, 'FINISHED');
      }
    }, 30_000);

    this.disconnectTimers.set(info.playerId, timer);
  }

  @SubscribeMessage(EVENTS_C2S.JOIN_ROOM)
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; gameConfig?: GameConfig },
  ): void {
    const info = this.socketToPlayer.get(client.id);
    if (!info) {
      client.emit(EVENTS_S2C.ERROR, { message: 'Not authenticated' });
      return;
    }

    // Default room: otomatik olustur ve oyuncuyu ekle
    if (payload.roomId === DEFAULT_ROOM_ID) {
      this.roomService.addPlayerToDefault(info.playerId);
    }

    const room = this.roomService.getRoom(payload.roomId);
    if (!room) {
      client.emit(EVENTS_S2C.ERROR, { message: 'Room not found' });
      return;
    }

    if (!room.players.includes(info.playerId)) {
      client.emit(EVENTS_S2C.ERROR, { message: 'Not in this room' });
      return;
    }

    // Ilk oyuncunun config'i kullanilir
    if (payload.gameConfig && !room.gameConfig) {
      room.gameConfig = payload.gameConfig;
    }

    client.join(payload.roomId);

    if (this.gameService.hasGame(payload.roomId)) {
      this.gameService.updateSocketId(payload.roomId, info.playerId, client.id);
      this.broadcastState(payload.roomId);
      return;
    }

    if (room.players.length === room.maxPlayers) {
      this.roomService.setStatus(payload.roomId, 'PLAYING');

      const playerInfos = room.players.map((pid) => {
        const p = this.findPlayerById(pid);
        const sid = this.findSocketIdByPlayerId(pid);
        return { id: pid, nickname: p?.nickname ?? 'Unknown', socketId: sid ?? '' };
      });

      const { events: startEvents } = this.gameService.startGame(
        payload.roomId,
        playerInfos,
        room.gameConfig,
      );
      this.broadcastState(payload.roomId);

      for (const event of startEvents) {
        if (event.type === 'scoreUpdate') {
          this.server.to(payload.roomId).emit(EVENTS_S2C.SCORE_UPDATE, {
            playerId: event['playerId'],
            label: event['label'],
            total: event['total'],
            cards: event['cards'] ?? [],
            pistiType: event['pistiType'] ?? null,
          });
        }
      }
    }
  }

  @SubscribeMessage(EVENTS_C2S.PLAY_CARD)
  handlePlayCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { cardId: string; isHidden: boolean },
  ): void {
    const info = this.socketToPlayer.get(client.id);
    if (!info) return;

    const roomId = this.gameService.getPlayerRoom(info.playerId);
    if (!roomId) return;

    try {
      const { state, events } = this.gameService.playCard(
        roomId,
        info.playerId,
        payload.cardId,
        payload.isHidden,
      );

      for (const event of events) {
        if (event.type === 'error') {
          client.emit(EVENTS_S2C.ERROR, { message: event['message'] });
          return;
        }
        if (event.type === 'bluffStarted') {
          const opponent = state.players.find((p) => p.id !== info.playerId);
          if (opponent) {
            this.server.to(opponent.socketId).emit(EVENTS_S2C.BLUFF_REQUEST, {
              bluffPlayerId: info.playerId,
            });
          }
        }
        if (event.type === 'scoreUpdate') {
          this.server.to(roomId).emit(EVENTS_S2C.SCORE_UPDATE, {
            playerId: event['playerId'],
            label: event['label'],
            total: event['total'],
            cards: event['cards'] ?? [],
            pistiType: event['pistiType'] ?? null,
          });
        }
      }

      this.server.to(roomId).emit(EVENTS_S2C.CARD_PLAYED, {
        playerId: info.playerId,
        cardId: payload.isHidden ? 'HIDDEN' : payload.cardId,
        isHidden: payload.isHidden,
      });

      this.broadcastState(roomId);

      // Start bluff timeout (30s auto-PASS)
      if (state.phase === GamePhase.BLUFF_PHASE) {
        this.startBluffTimer(roomId, info.playerId);
      }

      if (state.phase === GamePhase.GAME_OVER) {
        this.emitGameOver(roomId);
      }
    } catch (err) {
      client.emit(EVENTS_S2C.ERROR, { message: (err as Error).message ?? 'Internal error' });
    }
  }

  @SubscribeMessage(EVENTS_C2S.BLUFF_DECISION)
  handleBluffDecision(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { decision: BluffDecision },
  ): void {
    const info = this.socketToPlayer.get(client.id);
    if (!info) return;

    const roomId = this.gameService.getPlayerRoom(info.playerId);
    if (!roomId) return;

    try {
      this.clearBluffTimer(roomId);

      const { state, events } = this.gameService.resolveBluff(
        roomId,
        info.playerId,
        payload.decision,
      );

      for (const event of events) {
        if (event.type === 'error') {
          client.emit(EVENTS_S2C.ERROR, { message: event['message'] });
          return;
        }
        if (event.type === 'scoreUpdate') {
          this.server.to(roomId).emit(EVENTS_S2C.SCORE_UPDATE, {
            playerId: event['playerId'],
            label: event['label'],
            total: event['total'],
            cards: event['cards'] ?? [],
            pistiType: event['pistiType'] ?? null,
          });
        }
        if (event.type === 'bluffResolved') {
          this.server.to(roomId).emit(EVENTS_S2C.BLUFF_RESOLVED, {
            winner: event['winner'],
            decision: event['decision'],
            revealed: event['revealed'],
            revealedCard: event['revealedCard'] ?? null,
          });
        }
      }

      this.broadcastState(roomId);

      if (state.phase === GamePhase.GAME_OVER) {
        this.emitGameOver(roomId);
      }
    } catch (err) {
      client.emit(EVENTS_S2C.ERROR, { message: (err as Error).message ?? 'Internal error' });
    }
  }

  private broadcastState(roomId: string): void {
    const socketIds = this.gameService.getSocketIds(roomId);

    for (const { playerId, socketId } of socketIds) {
      if (!socketId) continue;
      const { roomState, hand } = this.gameService.maskStateForPlayer(roomId, playerId);
      this.server.to(socketId).emit(EVENTS_S2C.ROOM_STATE, roomState);
      this.server.to(socketId).emit(EVENTS_S2C.YOUR_HAND, hand);
    }
  }

  private startBluffTimer(roomId: string, bluffPlayerId: string): void {
    this.clearBluffTimer(roomId);

    const timer = setTimeout(() => {
      this.bluffTimers.delete(roomId);
      if (!this.gameService.hasGame(roomId)) return;

      // Find the opponent (the one who should decide) and auto-PASS
      const socketIds = this.gameService.getSocketIds(roomId);
      const opponent = socketIds.find((s) => s.playerId !== bluffPlayerId);
      if (!opponent) return;

      const { state, events } = this.gameService.resolveBluff(
        roomId,
        opponent.playerId,
        BluffDecision.PASS,
      );

      for (const event of events) {
        if (event.type === 'error') return;
        if (event.type === 'scoreUpdate') {
          this.server.to(roomId).emit(EVENTS_S2C.SCORE_UPDATE, {
            playerId: event['playerId'],
            label: event['label'],
            total: event['total'],
            cards: event['cards'] ?? [],
            pistiType: event['pistiType'] ?? null,
          });
        }
        if (event.type === 'bluffResolved') {
          this.server.to(roomId).emit(EVENTS_S2C.BLUFF_RESOLVED, {
            winner: event['winner'],
            decision: event['decision'],
            revealed: event['revealed'],
            revealedCard: event['revealedCard'] ?? null,
          });
        }
      }

      this.broadcastState(roomId);

      if (state.phase === GamePhase.GAME_OVER) {
        this.emitGameOver(roomId);
      }
    }, 30_000);

    this.bluffTimers.set(roomId, timer);
  }

  private clearBluffTimer(roomId: string): void {
    const timer = this.bluffTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.bluffTimers.delete(roomId);
    }
  }

  private emitGameOver(roomId: string): void {
    this.clearBluffTimer(roomId);
    const socketIds = this.gameService.getSocketIds(roomId);
    for (const { playerId, socketId } of socketIds) {
      if (!socketId) continue;
      const { roomState } = this.gameService.maskStateForPlayer(roomId, playerId);
      const winner = roomState.players.reduce((a, b) => (a.score > b.score ? a : b));
      this.server.to(socketId).emit(EVENTS_S2C.GAME_OVER, {
        winner: winner.id,
        players: roomState.players,
      });
    }
    this.gameService.removeGame(roomId);
    if (roomId === DEFAULT_ROOM_ID) {
      this.roomService.resetDefaultRoom();
    } else {
      this.roomService.setStatus(roomId, 'FINISHED');
    }
  }

  private findPlayerById(playerId: string) {
    for (const [, info] of this.socketToPlayer) {
      if (info.playerId === playerId) {
        return this.authService.getPlayer(info.token);
      }
    }
    return null;
  }

  private findSocketIdByPlayerId(playerId: string): string | undefined {
    for (const [socketId, info] of this.socketToPlayer) {
      if (info.playerId === playerId) return socketId;
    }
    return undefined;
  }
}
