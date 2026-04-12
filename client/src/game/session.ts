/**
 * Oyun oturumu bilgisi — login sonrasi set edilir.
 * Tum uygulama boyunca kullanilir.
 */
class Session {
  private _token: string | null = null;
  private _playerId: string | null = null;
  private _nickname: string | null = null;
  private _roomId: string | null = null;

  get token(): string | null {
    return this._token;
  }

  get playerId(): string | null {
    return this._playerId;
  }

  get nickname(): string | null {
    return this._nickname;
  }

  get roomId(): string | null {
    return this._roomId;
  }

  setAuth(token: string, playerId: string, nickname: string): void {
    this._token = token;
    this._playerId = playerId;
    this._nickname = nickname;
  }

  setRoom(roomId: string): void {
    this._roomId = roomId;
  }

  clear(): void {
    this._token = null;
    this._playerId = null;
    this._nickname = null;
    this._roomId = null;
  }

  get isLoggedIn(): boolean {
    return this._token !== null;
  }
}

export const session = new Session();
