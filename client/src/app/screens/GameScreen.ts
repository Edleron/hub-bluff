import gsap from "gsap";
import type { Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { session, socketService } from "../../game";
import { CardSprite } from "../../game/components/CardSprite";
import type {
  CardPlayedData,
  GameOverData,
} from "../../game/services/SocketService";
import type { ICard, IRoomState } from "../../shared/types";
import { GamePhase } from "../../shared/types";
import { engine } from "../getEngine";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";

import { BluffController } from "./BluffController";
import {
  CARD_SCALE,
  GameAnimations,
  HAND_SPACING,
  OPPONENT_CARD_SCALE,
  OPPONENT_SPACING,
  TABLE_CARD_SCALE,
} from "./GameAnimations";
import { GameOverScreen } from "./GameOverScreen";
import { ScoreDisplay } from "./ScoreDisplay";

/** Ana oyun ekrani */
export class GameScreen extends Container {
  public static assetBundles = ["main"];

  private bg: Graphics;

  // UI containers — public for GameAnimations access
  public tableArea: Container;
  public playerHandContainer: Container;
  public opponentHandContainer: Container;
  public animLayer: Container;
  private turnIndicator: Label;

  // Table — public for GameAnimations access
  public tableCardSprite: CardSprite | null = null;
  public pileBackCards: CardSprite[] = [];
  private pileCountLabel: Label;

  // Score display (panel + toast + shake)
  private score: ScoreDisplay;

  // Bluff controller (panel + timer + resolve)
  private bluff: BluffController;

  // Hidden play button
  private hiddenPlayButton: Button;

  // State — public for GameAnimations access
  private hand: ICard[] = [];
  public roomState: IRoomState | null = null;
  private selectedCardIndex: number = -1;
  public cardSprites: CardSprite[] = [];
  public opponentCardSprites: CardSprite[] = [];

  // Animation tracking — public for GameAnimations access
  private _pendingPlayCardId: string | null = null;
  public _playAnimSprite: CardSprite | null = null;
  public _opponentAnimSprite: CardSprite | null = null;
  private _prevOpponentHandCount = 0;
  private _prevPileCount = 0;
  public _isDealAnimating = false;
  public _isOpponentDealAnimating = false;
  public _screenGen = 0; // generation counter — incremented on reset to invalidate async callbacks

  // Deferred table card render (wait for play animation to finish)
  public _deferredTopCard: ICard | null = null;
  public _hasDeferredTableCard = false;
  public _deferredCollect = false;
  public _isCollecting = false;
  public _bluffRevealing = false;
  public _collectWinnerId: string | null = null;

  // Deferred deal (wait for collect animation to finish)
  private _deferredDealCards: ICard[] | null = null;
  private _deferredOpponentDealCount = 0;

  // Deferred game over (wait for all animations to finish)
  private _deferredGameOver: GameOverData | null = null;

  // Deferred cache replay (prepare runs before resize — coords not ready)
  private _pendingCachedState: IRoomState | null = null;
  private _pendingCachedHand: ICard[] | null = null;
  private _firstResizeDone = false;

  // Animation manager — public for BluffController access
  public animations: GameAnimations;

  constructor() {
    super();

    this.bg = new Graphics();
    this.addChild(this.bg);

    // --- Table area (center) ---
    this.tableArea = new Container();
    this.addChild(this.tableArea);

    this.pileCountLabel = new Label({
      text: "Yigin: 0",
      style: { fill: 0xaaaaaa, fontSize: 20 },
    });
    this.tableArea.addChild(this.pileCountLabel);

    // --- Turn indicator ---
    this.turnIndicator = new Label({
      text: "",
      style: { fill: 0xffcc00, fontSize: 26 },
    });
    this.addChild(this.turnIndicator);

    // --- Score display (panel + toast + shake) ---
    this.score = new ScoreDisplay(this);
    this.addChild(this.score.container);
    this.addChild(this.score.infoButton);

    // --- Player hand (bottom) ---
    this.playerHandContainer = new Container();
    this.addChild(this.playerHandContainer);

    // --- Opponent hand (top) ---
    this.opponentHandContainer = new Container();
    this.addChild(this.opponentHandContainer);

    // --- Bluff controller (panel + timer + decision flow) ---
    this.bluff = new BluffController(this);
    this.addChild(this.bluff.panel);

    // --- Hidden play button (appears when bluff is available) ---
    this.hiddenPlayButton = new Button({
      text: "Kapali Oyna",
      width: 200,
      height: 60,
    });
    this.hiddenPlayButton.visible = false;
    this.hiddenPlayButton.onPress.connect(() => this.playSelectedCard(true));
    this.addChild(this.hiddenPlayButton);

    // --- Animation layer (top of everything) ---
    this.animLayer = new Container();
    this.addChild(this.animLayer);

    // --- Animation manager ---
    this.animations = new GameAnimations(this);
  }

  public prepare() {
    this.setupSocketListeners();

    // Store cached data — will replay after first resize when coords are ready
    this._pendingCachedState = socketService.lastRoomState;
    this._pendingCachedHand = socketService.lastHand;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_time: Ticker) {
    // future: card hover/selection animations
  }

  public resize(width: number, height: number) {
    // BG
    this.bg.clear().rect(0, 0, width, height).fill({ color: 0x0d4a2e });

    // Table center
    this.tableArea.x = width * 0.5;
    this.tableArea.y = height * 0.45;
    this.pileCountLabel.y = 70;

    // Turn indicator
    this.turnIndicator.x = width * 0.5;
    this.turnIndicator.y = 30;

    // Score (panel + cup icon)
    this.score.layout(width, height);

    // Player hand
    this.playerHandContainer.x = width * 0.5;
    this.playerHandContainer.y = height - 140;
    this.layoutHand();

    // Opponent hand
    this.opponentHandContainer.x = width * 0.5;
    this.opponentHandContainer.y = 100;
    this.layoutOpponentHand();

    // Bluff panel
    this.bluff.setPosition(width * 0.5, height - 360);

    // Hidden play button
    this.hiddenPlayButton.x = width * 0.5;
    this.hiddenPlayButton.y = height - 330;

    // Replay cached data after first resize (containers now positioned)
    if (!this._firstResizeDone) {
      this._firstResizeDone = true;
      if (this._pendingCachedState) {
        this.onRoomState(this._pendingCachedState);
        this._pendingCachedState = null;
      }
      if (this._pendingCachedHand) {
        this.onYourHand(this._pendingCachedHand);
        this._pendingCachedHand = null;
      }
    }
  }

  public async show() {
    this.alpha = 0;
    await gsap.to(this, { alpha: 1, duration: 0.4, ease: "power2.out" });
  }

  public async hide() {
    await gsap.to(this, { alpha: 0, duration: 0.3, ease: "none" });
  }

  public reset() {
    this.removeSocketListeners();

    // Bump generation — all pending async callbacks (setTimeout, onComplete) become stale
    this._screenGen++;

    // Kill GSAP tweens on screen-level objects
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.bluff.panel);

    // Kill play/opponent animation sprites
    if (this._playAnimSprite) {
      gsap.killTweensOf(this._playAnimSprite);
      gsap.killTweensOf(this._playAnimSprite.scale);
      this._playAnimSprite.destroy();
      this._playAnimSprite = null;
    }
    if (this._opponentAnimSprite) {
      gsap.killTweensOf(this._opponentAnimSprite);
      gsap.killTweensOf(this._opponentAnimSprite.scale);
      this._opponentAnimSprite.destroy();
      this._opponentAnimSprite = null;
    }

    // Clean up animLayer (may have lingering deal/collect sprites)
    for (const child of this.animLayer.removeChildren()) {
      gsap.killTweensOf(child);
      gsap.killTweensOf(child.scale);
      child.destroy();
    }

    // Clean up card sprites
    this.cardSprites.forEach((s) => s.destroy());
    this.cardSprites = [];
    this.playerHandContainer.removeChildren();

    this.opponentCardSprites.forEach((s) => s.destroy());
    this.opponentCardSprites = [];
    this.opponentHandContainer.removeChildren();

    // Clean up table
    this.pileBackCards.forEach((c) => {
      if (!c.destroyed) {
        if (c.parent) c.parent.removeChild(c);
        c.destroy();
      }
    });
    this.pileBackCards = [];
    if (this.tableCardSprite) {
      if (!this.tableCardSprite.destroyed) {
        if (this.tableCardSprite.parent)
          this.tableCardSprite.parent.removeChild(this.tableCardSprite);
        this.tableCardSprite.destroy();
      }
      this.tableCardSprite = null;
    }

    // Reset all state & flags
    this.hand = [];
    this.roomState = null;
    this.selectedCardIndex = -1;
    this._pendingPlayCardId = null;
    this._prevOpponentHandCount = 0;
    this._prevPileCount = 0;
    this._isDealAnimating = false;
    this._isOpponentDealAnimating = false;
    this._deferredTopCard = null;
    this._hasDeferredTableCard = false;
    this._deferredCollect = false;
    this._isCollecting = false;
    this._bluffRevealing = false;
    this._collectWinnerId = null;
    this._deferredDealCards = null;
    this._deferredOpponentDealCount = 0;
    this._deferredGameOver = null;
    this._pendingCachedState = null;
    this._pendingCachedHand = null;
    this._firstResizeDone = false;

    // Reset UI
    this.bluff.reset();
    this.score.reset();
    this.hiddenPlayButton.visible = false;
    this.turnIndicator.text = "";
    this.pileCountLabel.text = "Yigin: 0";
  }

  // ============================
  //   Socket Listeners
  // ============================

  private setupSocketListeners() {
    socketService.onRoomState((state) => this.onRoomState(state));
    socketService.onYourHand((cards) => this.onYourHand(cards));
    socketService.onCardPlayed((data) => this.onCardPlayed(data));
    socketService.onBluffRequest(() => this.bluff.show());
    socketService.onBluffResolved((data) => this.bluff.onResolved(data));
    socketService.onScoreUpdate((data) => this.score.onScoreUpdate(data));
    socketService.onGameOver((data) => {
      if (this.isAnimBusy()) {
        this._deferredGameOver = data;
      } else {
        GameOverScreen.lastResult = data;
        engine().navigation.showScreen(GameOverScreen);
      }
    });
    socketService.onError((msg) => {
      console.error("[GameScreen] Socket error:", msg);
      this._pendingPlayCardId = null;
    });
    socketService.onReconnect(() => {
      if (session.roomId) {
        socketService.joinRoom(session.roomId);
      }
    });
  }

  private removeSocketListeners() {
    socketService.onRoomState(() => {});
    socketService.onYourHand(() => {});
    socketService.onCardPlayed(() => {});
    socketService.onBluffRequest(() => {});
    socketService.onBluffResolved(() => {});
    socketService.onScoreUpdate(() => {});
    socketService.onGameOver(() => {});
    socketService.onError(() => {});
    socketService.onReconnect(() => {});
  }

  // ============================
  //   State Handlers
  // ============================

  private onRoomState(state: IRoomState) {
    const prevPile = this._prevPileCount;
    this._prevPileCount = state.table.pileCount;
    this.roomState = state;

    // Detect pile collection: pile went from >0 to 0
    if (prevPile > 0 && state.table.pileCount === 0) {
      // If a play/reveal animation is active, defer the collect until it finishes
      if (
        this._playAnimSprite ||
        this._opponentAnimSprite ||
        this._bluffRevealing
      ) {
        this._deferredCollect = true;
      } else {
        this.animations.animateCollectPile();
      }
    }

    this.renderState();
  }

  private onYourHand(cards: ICard[]) {
    // If we just played a card optimistically, don't full-rebuild
    if (this._pendingPlayCardId) {
      this._pendingPlayCardId = null;
      this.hand = cards;

      // Check if refill happened (played last card → server dealt new hand)
      if (cards.length > 0 && this.cardSprites.length === 0) {
        if (this.isAnimBusy()) {
          this._deferredDealCards = cards;
        } else {
          this.animations.animateDealHand(cards);
        }
      }
      return;
    }

    const wasDeal = this.hand.length === 0 && cards.length > 0;
    this.hand = cards;
    this.selectedCardIndex = -1;

    if (wasDeal) {
      if (this.isAnimBusy()) {
        this._deferredDealCards = cards;
      } else {
        this.animations.animateDealHand(cards);
      }
    } else {
      this.renderHand();
    }
  }

  private onCardPlayed(data: CardPlayedData) {
    // Skip own plays — already handled optimistically
    if (data.playerId === session.playerId) return;

    // Opponent played a card — animate one back card to table
    // If hidden (bluff), don't reveal the card
    this.animations.animateOpponentPlay(data.isHidden ? null : data.cardId);
  }

  // ============================
  //   Render (non-animated)
  // ============================

  private renderState() {
    if (!this.roomState) return;
    const { players, currentTurn, table, deckRemaining, phase } =
      this.roomState;

    // Find player & opponent
    const me = players.find((p) => p.id === session.playerId);
    const opponent = players.find((p) => p.id !== session.playerId);

    // Update score labels + shake on own score change
    this.score.updateScores(me, opponent);

    if (opponent) {
      const newCount = opponent.handCount;
      if (this._prevOpponentHandCount === 0 && newCount > 0) {
        // Opponent got dealt cards — animate (defer if busy)
        if (this.isAnimBusy()) {
          this._deferredOpponentDealCount = newCount;
        } else {
          this.animations.animateOpponentDeal(newCount);
        }
      } else if (newCount !== this.opponentCardSprites.length) {
        this.renderOpponentHand(newCount);
      }
      this._prevOpponentHandCount = newCount;
    }

    this.score.updateDeck(deckRemaining);
    this.pileCountLabel.text = `Yigin: ${table.pileCount}`;

    // Top card on table
    this.renderTableCard(table.topCard);

    // Turn indicator
    if (phase === GamePhase.PLAYER_TURN) {
      const isMyTurn = currentTurn === session.playerId;
      this.turnIndicator.text = isMyTurn ? "Senin Siran!" : "Rakip Oynuyor...";
      this.playerHandContainer.interactiveChildren = isMyTurn;

      const canBluff =
        this.roomState?.bluffEnabled &&
        isMyTurn &&
        this.selectedCardIndex >= 0 &&
        table.pileCount === 1 &&
        table.topCard !== null;
      this.hiddenPlayButton.visible = canBluff;
    } else if (phase === GamePhase.BLUFF_PHASE) {
      this.turnIndicator.text = "Blof Karari Bekleniyor...";
      this.hiddenPlayButton.visible = false;
    } else if (phase === GamePhase.DEALING) {
      this.turnIndicator.text = "Kartlar Dagitiliyor...";
      this.hiddenPlayButton.visible = false;
    } else {
      this.turnIndicator.text = "";
      this.hiddenPlayButton.visible = false;
    }

    // Hide bluff panel if not in bluff phase
    if (phase !== GamePhase.BLUFF_PHASE) {
      this.bluff.hide();
    }
  }

  private renderTableCard(topCard: ICard | null) {
    // If a play/reveal animation is active, defer until it finishes
    if (
      this._playAnimSprite ||
      this._opponentAnimSprite ||
      this._bluffRevealing
    ) {
      this._deferredTopCard = topCard;
      this._hasDeferredTableCard = true;
      return;
    }

    this.renderTableCardNow(topCard);
  }

  public flushDeferredTableCard() {
    if (this._hasDeferredTableCard) {
      this._hasDeferredTableCard = false;
      this.renderTableCardNow(this._deferredTopCard);
      this._deferredTopCard = null;
    }
  }

  /** Are play/collect animations still in progress? */
  private isAnimBusy(): boolean {
    return !!(
      this._playAnimSprite ||
      this._opponentAnimSprite ||
      this._deferredCollect ||
      this._isCollecting ||
      this._bluffRevealing
    );
  }

  /** Flush any deferred deal animations (called after collect finishes) */
  public flushDeferredDeals() {
    if (this._deferredDealCards) {
      const cards = this._deferredDealCards;
      this._deferredDealCards = null;
      this.animations.animateDealHand(cards);
    }
    if (this._deferredOpponentDealCount > 0) {
      const count = this._deferredOpponentDealCount;
      this._deferredOpponentDealCount = 0;
      this.animations.animateOpponentDeal(count);
    }
    this.flushDeferredGameOver();
  }

  /** Show game over screen if deferred and all animations done */
  public flushDeferredGameOver() {
    if (!this._deferredGameOver) return;
    // Don't show yet if deals are animating
    if (this._isDealAnimating || this._isOpponentDealAnimating) return;

    const data = this._deferredGameOver;
    this._deferredGameOver = null;
    GameOverScreen.lastResult = data;
    engine().navigation.showScreen(GameOverScreen);
  }

  private renderTableCardNow(topCard: ICard | null) {
    // Clear existing table visuals
    this.pileBackCards.forEach((c) => {
      if (!c.destroyed) {
        if (c.parent) c.parent.removeChild(c);
        c.destroy();
      }
    });
    this.pileBackCards = [];

    if (this.tableCardSprite) {
      if (!this.tableCardSprite.destroyed) {
        if (this.tableCardSprite.parent)
          this.tableCardSprite.parent.removeChild(this.tableCardSprite);
        this.tableCardSprite.destroy();
      }
      this.tableCardSprite = null;
    }

    if (!topCard) return;

    // Show up to 3 face-down cards beneath the top card (pile depth)
    const pileCount = this.roomState?.table.pileCount ?? 1;
    const backCount = Math.min(pileCount - 1, 3);

    // Predetermined offsets for a natural scattered pile look
    const pileOffsets = [
      { x: -10, y: 5, rot: -0.08 },
      { x: 4, y: -3, rot: 0.06 },
      { x: 8, y: 4, rot: 0.12 },
    ];

    for (let i = 0; i < backCount; i++) {
      const back = new CardSprite(undefined, false);
      back.scale.set(TABLE_CARD_SCALE);
      const off = pileOffsets[i];
      back.x = off.x;
      back.y = off.y;
      back.rotation = off.rot;
      this.tableArea.addChild(back);
      this.pileBackCards.push(back);
    }

    // Face-up top card on top of the pile
    this.tableCardSprite = new CardSprite(topCard, true);
    this.tableCardSprite.scale.set(TABLE_CARD_SCALE);
    this.tableArea.addChild(this.tableCardSprite);

    // During BLUFF_PHASE, show a face-down card on top (the hidden bluff card)
    if (this.roomState?.phase === GamePhase.BLUFF_PHASE) {
      const bluffBack = new CardSprite(undefined, false);
      bluffBack.scale.set(TABLE_CARD_SCALE);
      bluffBack.x = 3;
      bluffBack.y = -5;
      bluffBack.rotation = 0.04;
      this.tableArea.addChild(bluffBack);
      this.pileBackCards.push(bluffBack);
    }
  }

  private renderHand() {
    // Clear old sprites
    this.cardSprites.forEach((s) => s.destroy());
    this.cardSprites = [];
    this.playerHandContainer.removeChildren();

    this.hand.forEach((card, i) => {
      const cs = new CardSprite(card, true);
      cs.scale.set(CARD_SCALE);
      cs.eventMode = "static";
      cs.cursor = "pointer";
      cs.on("pointerdown", () => this.selectCard(i));

      this.cardSprites.push(cs);
      this.playerHandContainer.addChild(cs);
    });

    this.layoutHand();
  }

  private layoutHand() {
    const totalWidth = (this.cardSprites.length - 1) * HAND_SPACING;
    const startX = -totalWidth / 2;

    this.cardSprites.forEach((cs, i) => {
      cs.x = startX + i * HAND_SPACING;
      cs.y = i === this.selectedCardIndex ? -20 : 0;
    });
  }

  private renderOpponentHand(count: number) {
    if (this.opponentCardSprites.length === count) return;

    this.opponentCardSprites.forEach((s) => s.destroy());
    this.opponentCardSprites = [];
    this.opponentHandContainer.removeChildren();

    for (let i = 0; i < count; i++) {
      const cs = new CardSprite(undefined, false);
      cs.scale.set(OPPONENT_CARD_SCALE);
      this.opponentCardSprites.push(cs);
      this.opponentHandContainer.addChild(cs);
    }

    this.layoutOpponentHand();
  }

  public layoutOpponentHand() {
    const totalWidth = (this.opponentCardSprites.length - 1) * OPPONENT_SPACING;
    const startX = -totalWidth / 2;

    this.opponentCardSprites.forEach((cs, i) => {
      cs.x = startX + i * OPPONENT_SPACING;
    });
  }

  // ============================
  //   Card Selection & Play
  // ============================

  public selectCard(index: number) {
    if (this._isDealAnimating) return;

    if (this.selectedCardIndex === index) {
      // Double-tap to play open
      this.playSelectedCard(false);
      return;
    }
    this.selectedCardIndex = index;
    this.layoutHand();
    this.updateHiddenPlayButton();
  }

  private updateHiddenPlayButton() {
    if (!this.roomState) {
      this.hiddenPlayButton.visible = false;
      return;
    }
    const { phase, currentTurn, table } = this.roomState;
    const isMyTurn =
      phase === GamePhase.PLAYER_TURN && currentTurn === session.playerId;
    this.hiddenPlayButton.visible =
      !!this.roomState?.bluffEnabled &&
      isMyTurn &&
      this.selectedCardIndex >= 0 &&
      table.pileCount === 1 &&
      table.topCard !== null;
  }

  private playSelectedCard(isHidden: boolean) {
    if (
      this.selectedCardIndex < 0 ||
      this.selectedCardIndex >= this.hand.length
    )
      return;
    if (!this.roomState || this.roomState.currentTurn !== session.playerId)
      return;

    const card = this.hand[this.selectedCardIndex];
    const sprite = this.cardSprites[this.selectedCardIndex];

    // Set pending flag so onYourHand doesn't rebuild
    this._pendingPlayCardId = card.id;

    // Remove from arrays immediately
    this.hand.splice(this.selectedCardIndex, 1);
    this.cardSprites.splice(this.selectedCardIndex, 1);
    this.selectedCardIndex = -1;

    // Rebind pointerdown indices after splice
    this.cardSprites.forEach((cs, i) => {
      cs.removeAllListeners("pointerdown");
      cs.on("pointerdown", () => this.selectCard(i));
    });

    // Animate card to table
    this.animations.animatePlayCard(sprite);

    // Relayout remaining cards
    this.layoutHand();

    // Emit to server
    socketService.playCard(card.id, isHidden);
  }

  // ============================
  //   Animations — moved to GameAnimations.ts
  // ============================

  // ============================
  //   Bluff — moved to BluffController.ts
  // ============================
}
