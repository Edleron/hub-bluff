import { Injectable, BadRequestException } from '@nestjs/common';
import { GameConfig } from '../shared';
import { DEFAULT_ROOM_ID } from '../shared/game.config';

export interface Room {
  id: string;
  code: string;
  players: string[];
  maxPlayers: number;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  gameConfig?: GameConfig;
}

@Injectable()
export class RoomService {
  private rooms = new Map<string, Room>();

  constructor() {
    this.ensureDefaultRoom();
  }

  ensureDefaultRoom(): Room {
    const existing = this.rooms.get(DEFAULT_ROOM_ID);
    if (existing && existing.status === 'WAITING') return existing;

    const room: Room = {
      id: DEFAULT_ROOM_ID,
      code: 'BLUFF',
      players: [],
      maxPlayers: 2,
      status: 'WAITING',
    };
    this.rooms.set(DEFAULT_ROOM_ID, room);
    return room;
  }

  addPlayerToDefault(playerId: string): Room {
    const room = this.ensureDefaultRoom();
    if (room.players.includes(playerId)) return room;
    if (room.players.length >= room.maxPlayers) {
      throw new BadRequestException('Room full');
    }
    room.players.push(playerId);
    return room;
  }

  resetDefaultRoom(): void {
    this.rooms.set(DEFAULT_ROOM_ID, {
      id: DEFAULT_ROOM_ID,
      code: 'BLUFF',
      players: [],
      maxPlayers: 2,
      status: 'WAITING',
    });
  }

  create(playerId: string): Room {
    const id = crypto.randomUUID();
    const room: Room = {
      id,
      code: this.generateCode(),
      players: [playerId],
      maxPlayers: 2,
      status: 'WAITING',
    };
    this.rooms.set(room.id, room);
    return room;
  }

  join(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new BadRequestException('Room not found');
    if (room.status !== 'WAITING') throw new BadRequestException('Room not available');
    if (room.players.length >= room.maxPlayers) throw new BadRequestException('Room full');
    if (room.players.includes(playerId)) throw new BadRequestException('Already in room');
    room.players.push(playerId);
    return room;
  }

  getWaitingRooms(): Room[] {
    return Array.from(this.rooms.values()).filter((r) => r.status === 'WAITING');
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  setStatus(roomId: string, status: Room['status']): void {
    const room = this.rooms.get(roomId);
    if (room) room.status = status;
  }

  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const exists = Array.from(this.rooms.values()).some((r) => r.code === code);
    if (exists) return this.generateCode();
    return code;
  }
}
