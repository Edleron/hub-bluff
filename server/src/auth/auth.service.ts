import { Injectable } from '@nestjs/common';
import { PLAYER_TOKENS } from '../shared/game.config';

export interface PlayerInfo {
  id: string;
  nickname: string;
  token: string;
  isHost: boolean;
}

@Injectable()
export class AuthService {
  private players = new Map<string, PlayerInfo>();

  constructor() {
    for (const p of PLAYER_TOKENS) {
      this.players.set(p.token, {
        id: p.id,
        nickname: p.nickname,
        token: p.token,
        isHost: p.isHost,
      });
    }
  }

  login(token: string): PlayerInfo | null {
    return this.players.get(token) ?? null;
  }

  validateToken(token: string): PlayerInfo | null {
    return this.players.get(token) ?? null;
  }

  getPlayer(token: string): PlayerInfo | null {
    return this.players.get(token) ?? null;
  }
}
