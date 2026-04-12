import { Injectable } from '@nestjs/common';
import {
  ICard,
  GamePhase,
  BluffDecision,
  DeckConfig,
  GameConfig,
  IRoomState,
  IPlayer,
  DEFAULT_DECK_CONFIG,
  DOUBLE_DECK_CONFIG,
} from '../shared';
import { createDeck, shuffle, dealHands } from '../engine/deck';
import { canTakePile, canBluff, isWildCard, isRealPisti } from '../engine/rules';
import { calcBluffScore, calcCardValues, calcPistiBonus, buildCardValueLabels, checkFlushBonus, checkFourOfAKindBonus } from '../engine/scoring';

interface PlayerState {
  id: string;
  nickname: string;
  hand: ICard[];
  capturedCards: ICard[];
  score: number;
  socketId: string;
}

interface GameState {
  roomId: string;
  phase: GamePhase;
  players: PlayerState[];
  currentTurnIndex: number;
  deck: ICard[];
  pile: ICard[];
  deckConfig: DeckConfig;
  bluffEnabled: boolean;
  bluffCard?: ICard;
  bluffPlayerId?: string;
  bluffGroundCard?: ICard;
}

@Injectable()
export class GameService {
  private games = new Map<string, GameState>();
  private playerToRoom = new Map<string, string>();

  startGame(
    roomId: string,
    players: { id: string; nickname: string; socketId: string }[],
    gameConfig?: GameConfig,
  ): { state: GameState; events: GameEvent[] } {
    const config = gameConfig?.deckType === 'double' ? DOUBLE_DECK_CONFIG : DEFAULT_DECK_CONFIG;
    const bluffEnabled = gameConfig?.bluffEnabled ?? true;
    const deck = shuffle(createDeck(config));

    // Pisti kurali: once masaya 4 kart koy (ustteki acik)
    const pile: ICard[] = [];
    for (let i = 0; i < 4; i++) {
      const card = deck.pop();
      if (card) pile.push(card);
    }

    // Sonra oyunculara 4'er kart dagit
    const hands = dealHands(deck, players.length);

    const playerStates: PlayerState[] = players.map((p, i) => ({
      id: p.id,
      nickname: p.nickname,
      hand: hands[i],
      capturedCards: [],
      score: 0,
      socketId: p.socketId,
    }));

    const state: GameState = {
      roomId,
      phase: GamePhase.DEALING,
      players: playerStates,
      currentTurnIndex: 0,
      deck,
      pile,
      deckConfig: config,
      bluffEnabled,
    };

    state.phase = GamePhase.PLAYER_TURN;
    this.games.set(roomId, state);
    for (const p of playerStates) {
      this.playerToRoom.set(p.id, roomId);
    }

    const events = this.checkDealBonuses(state);
    return { state, events };
  }

  playCard(
    roomId: string,
    playerId: string,
    cardId: string,
    isHidden: boolean,
  ): { state: GameState; events: GameEvent[] } {
    const state = this.getState(roomId);
    const events: GameEvent[] = [];

    if (state.phase !== GamePhase.PLAYER_TURN) {
      return { state, events: [{ type: 'error', message: 'Not your turn phase' }] };
    }

    const currentPlayer = state.players[state.currentTurnIndex];
    if (currentPlayer.id !== playerId) {
      return { state, events: [{ type: 'error', message: 'Not your turn' }] };
    }

    const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return { state, events: [{ type: 'error', message: 'Card not in hand' }] };
    }

    const card = currentPlayer.hand.splice(cardIndex, 1)[0];
    const topCard = state.pile.length > 0 ? state.pile[state.pile.length - 1] : null;

    if (isHidden && state.bluffEnabled && topCard && canBluff(state.pile.length, topCard)) {
      state.phase = GamePhase.BLUFF_PHASE;
      state.bluffCard = card;
      state.bluffPlayerId = playerId;
      state.bluffGroundCard = topCard;
      state.pile.push(card);
      events.push({ type: 'bluffStarted', playerId });
      return { state, events };
    }

    state.pile.push(card);

    if (topCard && canTakePile(card, topCard, state.deckConfig)) {
      const isPisti = state.pile.length === 2;
      const collected = state.pile.splice(0);

      const cardPoints = calcCardValues(collected);
      currentPlayer.score += cardPoints;
      currentPlayer.capturedCards.push(...collected);

      let pistiBonus = 0;
      let pistiLabel = '';
      if (isPisti) {
        pistiBonus = calcPistiBonus(card, topCard, state.deckConfig);
        currentPlayer.score += pistiBonus;
        if (pistiBonus === 50) pistiLabel = 'JACKPOT PISTI!';
        else if (pistiBonus === 10) pistiLabel = 'Pisti!';
      }

      const total = cardPoints + pistiBonus;
      if (total > 0 || isPisti) {
        const labels = buildCardValueLabels(collected);
        if (pistiLabel) labels.unshift(pistiLabel + ` +${pistiBonus}`);
        events.push({
          type: 'scoreUpdate',
          playerId,
          label: labels.join(' | '),
          total,
          cards: collected,
          pistiType: pistiBonus === 50 ? 'jackpot' : pistiBonus === 10 ? 'normal' : null,
        });
      }

      events.push({ type: 'pileTaken', playerId, cardCount: collected.length, isPisti });
    }

    this.advanceTurn(state);
    events.push(...this.checkRefillOrEnd(state));

    return { state, events };
  }

  resolveBluff(
    roomId: string,
    callerId: string,
    decision: BluffDecision,
  ): { state: GameState; events: GameEvent[] } {
    const state = this.getState(roomId);
    const events: GameEvent[] = [];

    if (state.phase !== GamePhase.BLUFF_PHASE) {
      return { state, events: [{ type: 'error', message: 'Not in bluff phase' }] };
    }

    if (state.bluffPlayerId === callerId) {
      return { state, events: [{ type: 'error', message: 'Cannot decide own bluff' }] };
    }

    const bluffer = state.players.find((p) => p.id === state.bluffPlayerId);
    const caller = state.players.find((p) => p.id === callerId);
    if (!bluffer || !caller || !state.bluffCard || !state.bluffGroundCard) {
      return { state, events: [{ type: 'error', message: 'Invalid bluff state' }] };
    }

    const { blufferDelta, callerDelta } = calcBluffScore(
      state.bluffCard,
      state.bluffGroundCard,
      decision,
      state.deckConfig,
    );

    bluffer.score += blufferDelta;
    caller.score += callerDelta;

    const isReal = isRealPisti(state.bluffCard, state.bluffGroundCard, state.deckConfig);

    if (decision === BluffDecision.PASS) {
      // PASS: Blöfçü (A) pile'ı kapalı alır, +10 bonus. Sıra caller'da (B) kalır.
      const collected = state.pile.splice(0);
      const cardPoints = calcCardValues(collected);
      bluffer.score += cardPoints;
      bluffer.capturedCards.push(...collected);

      const labels = [`Blof Basarili! +${blufferDelta}`, ...buildCardValueLabels(collected)];
      events.push({
        type: 'scoreUpdate',
        playerId: bluffer.id,
        label: labels.join(' | '),
        total: blufferDelta + cardPoints,
        cards: collected,
        pistiType: null,
      });
      events.push({ type: 'bluffResolved', winner: bluffer.id, decision, revealed: false, revealedCard: null });
      this.advanceTurn(state); // A → B (sıra caller'a geçer)
    } else if (decision === BluffDecision.CALL && isReal) {
      // Case 2: Blöf değilmiş, gerçek pişti! A +20 + pile alır. Sıra B'de kalır.
      const collected = state.pile.splice(0);
      const cardPoints = calcCardValues(collected);
      bluffer.score += cardPoints;
      bluffer.capturedCards.push(...collected);

      const labels = [`Blof Gercek! +${blufferDelta}`, ...buildCardValueLabels(collected)];
      events.push({
        type: 'scoreUpdate',
        playerId: bluffer.id,
        label: labels.join(' | '),
        total: blufferDelta + cardPoints,
        cards: collected,
        pistiType: null,
      });
      events.push({ type: 'bluffResolved', winner: bluffer.id, decision, revealed: true, revealedCard: state.bluffCard });
      this.advanceTurn(state); // A → B (sıra caller'a geçer)
    } else {
      // Case 1: Blöf yakalandı! B +10 + pile alır. Sıra A'ya (blöfçüye) geçer.
      const collected = state.pile.splice(0);
      const cardPoints = calcCardValues(collected);
      caller.score += cardPoints;
      caller.capturedCards.push(...collected);

      const labels = [`Blof Yakalandi! +${callerDelta}`, ...buildCardValueLabels(collected)];
      events.push({
        type: 'scoreUpdate',
        playerId: caller.id,
        label: labels.join(' | '),
        total: callerDelta + cardPoints,
        cards: collected,
        pistiType: null,
      });
      events.push({ type: 'bluffResolved', winner: caller.id, decision, revealed: true, revealedCard: state.bluffCard });
      this.advanceTurn(state);
    }

    state.bluffCard = undefined;
    state.bluffPlayerId = undefined;
    state.bluffGroundCard = undefined;
    state.phase = GamePhase.PLAYER_TURN;

    events.push(...this.checkRefillOrEnd(state));

    return { state, events };
  }

  maskStateForPlayer(roomId: string, playerId: string): { roomState: IRoomState; hand: ICard[] } {
    const state = this.getState(roomId);

    const players: IPlayer[] = state.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      handCount: p.hand.length,
      score: p.score,
    }));

    const me = state.players.find((p) => p.id === playerId);

    // During BLUFF_PHASE, show the ground card (not the hidden bluff card) as topCard
    const topCard =
      state.phase === GamePhase.BLUFF_PHASE
        ? (state.bluffGroundCard ?? null)
        : state.pile.length > 0
          ? state.pile[state.pile.length - 1]
          : null;

    const roomState: IRoomState = {
      roomId: state.roomId,
      phase: state.phase,
      players,
      currentTurn: state.players[state.currentTurnIndex].id,
      table: {
        topCard,
        pileCount: state.pile.length,
      },
      deckRemaining: state.deck.length,
      deckConfig: state.deckConfig,
      bluffEnabled: state.bluffEnabled,
      bluffPlayerId: state.bluffPlayerId,
    };

    return { roomState, hand: me?.hand ?? [] };
  }

  getPlayerRoom(playerId: string): string | undefined {
    return this.playerToRoom.get(playerId);
  }

  hasGame(roomId: string): boolean {
    return this.games.has(roomId);
  }

  getSocketIds(roomId: string): { playerId: string; socketId: string }[] {
    const state = this.games.get(roomId);
    if (!state) return [];
    return state.players.map((p) => ({ playerId: p.id, socketId: p.socketId }));
  }

  updateSocketId(roomId: string, playerId: string, socketId: string): void {
    const state = this.games.get(roomId);
    if (!state) return;
    const player = state.players.find((p) => p.id === playerId);
    if (player) player.socketId = socketId;
  }

  removeGame(roomId: string): void {
    const state = this.games.get(roomId);
    if (state) {
      for (const p of state.players) {
        this.playerToRoom.delete(p.id);
      }
    }
    this.games.delete(roomId);
  }

  private getState(roomId: string): GameState {
    const state = this.games.get(roomId);
    if (!state) throw new Error(`Game not found: ${roomId}`);
    return state;
  }

  private advanceTurn(state: GameState): void {
    state.currentTurnIndex = (state.currentTurnIndex + 1) % state.players.length;
  }

  private checkRefillOrEnd(state: GameState): GameEvent[] {
    const allEmpty = state.players.every((p) => p.hand.length === 0);
    if (!allEmpty) return [];

    if (state.deck.length === 0) {
      if (state.pile.length > 0) {
        const lastCaptor = state.players.reduce((a, b) =>
          a.capturedCards.length > b.capturedCards.length ? a : b,
        );
        lastCaptor.score += calcCardValues(state.pile);
        lastCaptor.capturedCards.push(...state.pile.splice(0));
      }

      let maxCards = 0;
      let maxPlayer: PlayerState | null = null;
      for (const p of state.players) {
        if (p.capturedCards.length > maxCards) {
          maxCards = p.capturedCards.length;
          maxPlayer = p;
        }
      }
      if (maxPlayer) {
        const isTie = state.players.filter((p) => p.capturedCards.length === maxCards).length > 1;
        if (!isTie) maxPlayer.score += 5;
      }

      state.phase = GamePhase.GAME_OVER;
      return [];
    }

    const hands = dealHands(state.deck, state.players.length);
    for (let i = 0; i < state.players.length; i++) {
      state.players[i].hand = hands[i];
    }

    return this.checkDealBonuses(state);
  }

  private checkDealBonuses(state: GameState): GameEvent[] {
    const events: GameEvent[] = [];
    for (const p of state.players) {
      // Four of a Kind: 4 ayni rank → +50
      const foak = checkFourOfAKindBonus(p.hand);
      if (foak.bonus > 0) {
        p.score += foak.bonus;
        events.push({
          type: 'scoreUpdate',
          playerId: p.id,
          label: `Four of a Kind! +${foak.bonus}`,
          total: foak.bonus,
          cards: foak.cards,
          pistiType: null,
        });
        continue; // 4lu ayni rank ve flush ayni elde olamaz
      }

      // Flush: A+K+Q → +30
      const flush = checkFlushBonus(p.hand);
      if (flush.bonus > 0) {
        p.score += flush.bonus;
        events.push({
          type: 'scoreUpdate',
          playerId: p.id,
          label: `A+K+Q Flush! +${flush.bonus}`,
          total: flush.bonus,
          cards: flush.cards,
          pistiType: null,
        });
      }
    }
    return events;
  }
}

export interface GameEvent {
  type: string;
  [key: string]: unknown;
}
