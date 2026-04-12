import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DEFAULT_ROOM_ID, GAME_VERSION } from '../shared/game.config';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body('token') token: string) {
    if (!token || token.trim().length === 0) {
      throw new BadRequestException('Token is required');
    }

    const player = this.authService.login(token.trim());
    if (!player) {
      throw new BadRequestException('Invalid token');
    }

    return {
      token: player.token,
      playerId: player.id,
      nickname: player.nickname,
      roomId: DEFAULT_ROOM_ID,
      serverVersion: GAME_VERSION,
      isHost: player.isHost,
    };
  }
}
