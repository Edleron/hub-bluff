import { io, Socket } from "socket.io-client";

import type {
  BluffDecision,
  GameConfig,
  ICard,
  IRoomState,
} from "../../shared/types";
import { EVENTS_C2S, EVENTS_S2C } from "../../shared/types";

const WS_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export interface GameOverData {
  winner: string;
  players: { id: string; nickname: string; score: number; handCount: number }[];
}

export interface ScoreUpdateData {
  playerId: string;
  label: string;
  total: number;
  cards: { suit: string; rank: string; id: string }[];
  pistiType: "normal" | "jackpot" | null;
  category?: "pisti" | "capture" | "flush" | "bluff";
}

export interface BluffRequestData {
  bluffPlayerId: string;
}

export interface BluffResolvedData {
  winner: string;
  decision: string;
  revealed: boolean;
  revealedCard: { suit: string; rank: string; id: string } | null;
}

export interface CardPlayedData {
  playerId: string;
  cardId: string;
  isHidden: boolean;
}

type EventCallback<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;

  // Cached latest data — survives listener swaps between screens
  private _lastRoomState: IRoomState | null = null;
  private _lastHand: ICard[] | null = null;

  private onRoomStateCb: EventCallback<IRoomState> | null = null;
  private onYourHandCb: EventCallback<ICard[]> | null = null;
  private onBluffRequestCb: EventCallback<BluffRequestData> | null = null;
  private onBluffResolvedCb: EventCallback<BluffResolvedData> | null = null;
  private onScoreUpdateCb: EventCallback<ScoreUpdateData> | null = null;
  private onCardPlayedCb: EventCallback<CardPlayedData> | null = null;
  private onGameOverCb: EventCallback<GameOverData> | null = null;
  private onErrorCb: EventCallback<string> | null = null;
  private onConnectCb: (() => void) | null = null;
  private onDisconnectCb: ((reason: string) => void) | null = null;
  private onReconnectCb: (() => void) | null = null;

  get lastRoomState(): IRoomState | null {
    return this._lastRoomState;
  }

  get lastHand(): ICard[] | null {
    return this._lastHand;
  }

  connect(token: string): void {
    if (this.socket?.connected) return;

    this._lastRoomState = null;
    this._lastHand = null;

    this.socket = io(`${WS_URL}/game`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    let hasConnectedBefore = false;

    this.socket.on("connect", () => {
      if (hasConnectedBefore) {
        // This is a reconnection
        this.onReconnectCb?.();
      } else {
        hasConnectedBefore = true;
        this.onConnectCb?.();
      }
    });

    this.socket.on("disconnect", (reason) => {
      this.onDisconnectCb?.(reason);
    });

    this.socket.on(EVENTS_S2C.ROOM_STATE, (data: IRoomState) => {
      this._lastRoomState = data;
      this.onRoomStateCb?.(data);
    });

    this.socket.on(EVENTS_S2C.YOUR_HAND, (data: ICard[]) => {
      this._lastHand = data;
      this.onYourHandCb?.(data);
    });

    this.socket.on(EVENTS_S2C.BLUFF_REQUEST, (data: BluffRequestData) => {
      this.onBluffRequestCb?.(data);
    });

    this.socket.on(EVENTS_S2C.BLUFF_RESOLVED, (data: BluffResolvedData) => {
      this.onBluffResolvedCb?.(data);
    });

    this.socket.on(EVENTS_S2C.SCORE_UPDATE, (data: ScoreUpdateData) => {
      this.onScoreUpdateCb?.(data);
    });

    this.socket.on(EVENTS_S2C.CARD_PLAYED, (data: CardPlayedData) => {
      this.onCardPlayedCb?.(data);
    });

    this.socket.on(EVENTS_S2C.GAME_OVER, (data: GameOverData) => {
      this.onGameOverCb?.(data);
    });

    this.socket.on(EVENTS_S2C.ERROR, (data: unknown) => {
      const msg =
        typeof data === "string"
          ? data
          : ((data as { message?: string })?.message ?? "Unknown error");
      this.onErrorCb?.(msg);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this._lastRoomState = null;
    this._lastHand = null;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // --- C2S Events ---

  joinRoom(roomId: string, gameConfig?: GameConfig): void {
    this.socket?.emit(EVENTS_C2S.JOIN_ROOM, { roomId, gameConfig });
  }

  playCard(cardId: string, isHidden: boolean): void {
    this.socket?.emit(EVENTS_C2S.PLAY_CARD, { cardId, isHidden });
  }

  bluffDecision(decision: BluffDecision): void {
    this.socket?.emit(EVENTS_C2S.BLUFF_DECISION, { decision });
  }

  // --- Listener Setters ---

  onRoomState(cb: EventCallback<IRoomState>): void {
    this.onRoomStateCb = cb;
  }

  onYourHand(cb: EventCallback<ICard[]>): void {
    this.onYourHandCb = cb;
  }

  onBluffRequest(cb: EventCallback<BluffRequestData>): void {
    this.onBluffRequestCb = cb;
  }

  onBluffResolved(cb: EventCallback<BluffResolvedData>): void {
    this.onBluffResolvedCb = cb;
  }

  onScoreUpdate(cb: EventCallback<ScoreUpdateData>): void {
    this.onScoreUpdateCb = cb;
  }

  onCardPlayed(cb: EventCallback<CardPlayedData>): void {
    this.onCardPlayedCb = cb;
  }

  onGameOver(cb: EventCallback<GameOverData>): void {
    this.onGameOverCb = cb;
  }

  onError(cb: EventCallback<string>): void {
    this.onErrorCb = cb;
  }

  onConnect(cb: () => void): void {
    this.onConnectCb = cb;
  }

  onDisconnect(cb: (reason: string) => void): void {
    this.onDisconnectCb = cb;
  }

  onReconnect(cb: () => void): void {
    this.onReconnectCb = cb;
  }
}

export const socketService = new SocketService();
