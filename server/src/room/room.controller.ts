import { Controller, Get, Post, Param, Headers, BadRequestException } from '@nestjs/common';
import { RoomService } from './room.service';
import { AuthService } from '../auth/auth.service';

@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  create(@Headers('authorization') authHeader: string) {
    const player = this.resolvePlayer(authHeader);
    const room = this.roomService.create(player.id);
    return { roomId: room.id, code: room.code };
  }

  @Get()
  list() {
    return this.roomService.getWaitingRooms().map((r) => ({
      id: r.id,
      code: r.code,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
    }));
  }

  @Post(':id/join')
  join(@Param('id') roomId: string, @Headers('authorization') authHeader: string) {
    const player = this.resolvePlayer(authHeader);
    const room = this.roomService.join(roomId, player.id);
    return { roomId: room.id, code: room.code, playerCount: room.players.length };
  }

  private resolvePlayer(authHeader: string) {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) throw new BadRequestException('Token required');
    const player = this.authService.validateToken(token);
    if (!player) throw new BadRequestException('Invalid token');
    return player;
  }
}
