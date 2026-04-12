import gsap from "gsap";
import type { Ticker } from "pixi.js";
import { Container, Graphics, Sprite } from "pixi.js";

import { session, socketService, parseCardId } from "../../game";
import { CardSprite } from "../../game/components/CardSprite";
import type {
  BluffResolvedData,
  CardPlayedData,
  GameOverData,
  ScoreUpdateData,
} from "../../game/services/SocketService";
import type { ICard, IRoomState } from "../../shared/types";
import { BluffDecision, GamePhase } from "../../shared/types";
import { engine } from "../getEngine";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { ScorePanel } from "../ui/ScorePanel";

import { GameOverScreen } from "./GameOverScreen";

const CARD_SCALE = 0.6;
const OPPONENT_CARD_SCALE = 0.5;
const TABLE_CARD_SCALE = 0.7;
const HAND_SPACING = 100;
const OPPONENT_SPACING = 80;
const DEAL_DURATION = 0.3;
const DEAL_STAGGER = 0.1;
const PLAY_DURATION = 0.25;
const COLLECT_DURATION = 0.4;
const BLUFF_TIMEOUT = 30;

/** Ana oyun ekrani */
export class GameScreen extends Container {
  public static assetBundles = ["main"];

  private bg: Graphics;

  // UI containers
  private tableArea: Container;
  private playerHandContainer: Container;
  private opponentHandContainer: Container;
  private scoreContainer: Container;
  private bluffPanel: Container;
  private animLayer: Container;
  private turnIndicator: Label;

  // Table
  private tableCardSprite: CardSprite | null = null;
  private pileBackCards: CardSprite[] = [];
  private pileCountLabel: Label;

  // Score
  private playerScoreLabel: Label;
  private opponentScoreLabel: Label;
  private playerNameLabel: Label;
  private opponentNameLabel: Label;
  private deckRemainingLabel: Label;
  private scoreInfoBtn: Sprite;
  private scorePanel: ScorePanel | null = null;
  private myScoreEvents: ScoreUpdateData[] = [];

  // Bluff buttons
  private callButton: Button;
  private passButton: Button;
  private bluffTimerLabel: Label;
  private _bluffTimerInterval: ReturnType<typeof setInterval> | null = null;
  private _bluffTimeLeft = 0;

  // Hidden play button
  private hiddenPlayButton: Button;

  // State
  private hand: ICard[] = [];
  private roomState: IRoomState | null = null;
  private selectedCardIndex: number = -1;
  private cardSprites: CardSprite[] = [];
  private opponentCardSprites: CardSprite[] = [];

  // Animation tracking
  private _pendingPlayCardId: string | null = null;
  private _playAnimSprite: CardSprite | null = null;
  private _opponentAnimSprite: CardSprite | null = null;
  private _prevOpponentHandCount = 0;
  private _prevPileCount = 0;
  private _prevMyScore = 0;
  private _isDealAnimating = false;
  private _isOpponentDealAnimating = false;
  private _screenGen = 0; // generation counter — incremented on reset to invalidate async callbacks

  // Deferred table card render (wait for play animation to finish)
  private _deferredTopCard: ICard | null = null;
  private _hasDeferredTableCard = false;
  private _deferredCollect = false;
  private _isCollecting = false;
  private _bluffRevealing = false;
  private _collectWinnerId: string | null = null;

  // Deferred deal (wait for collect animation to finish)
  private _deferredDealCards: ICard[] | null = null;
  private _deferredOpponentDealCount = 0;

  // Deferred game over (wait for all animations to finish)
  private _deferredGameOver: GameOverData | null = null;

  // Deferred cache replay (prepare runs before resize — coords not ready)
  private _pendingCachedState: IRoomState | null = null;
  private _pendingCachedHand: ICard[] | null = null;
  private _firstResizeDone = false;

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

    // --- Score display ---
    this.scoreContainer = new Container();
    this.addChild(this.scoreContainer);

    this.playerNameLabel = new Label({
      text: "",
      style: { fill: 0xffffff, fontSize: 20 },
    });
    this.playerScoreLabel = new Label({
      text: "0",
      style: { fill: 0x00ff88, fontSize: 30 },
    });
    this.opponentNameLabel = new Label({
      text: "",
      style: { fill: 0xffffff, fontSize: 20 },
    });
    this.opponentScoreLabel = new Label({
      text: "0",
      style: { fill: 0xff4444, fontSize: 30 },
    });
    this.deckRemainingLabel = new Label({
      text: "Deste: 0",
      style: { fill: 0x888888, fontSize: 18 },
    });

    this.scoreInfoBtn = Sprite.from("cup.png");
    this.scoreInfoBtn.anchor.set(0.5);
    this.scoreInfoBtn.scale.set(0.25);
    this.scoreInfoBtn.eventMode = "static";
    this.scoreInfoBtn.cursor = "pointer";
    this.scoreInfoBtn.on("pointertap", () => this.toggleScorePanel());

    this.scoreContainer.addChild(this.playerNameLabel);
    this.scoreContainer.addChild(this.playerScoreLabel);
    this.scoreContainer.addChild(this.opponentNameLabel);
    this.scoreContainer.addChild(this.opponentScoreLabel);
    this.scoreContainer.addChild(this.deckRemainingLabel);
    this.addChild(this.scoreInfoBtn);

    // --- Player hand (bottom) ---
    this.playerHandContainer = new Container();
    this.addChild(this.playerHandContainer);

    // --- Opponent hand (top) ---
    this.opponentHandContainer = new Container();
    this.addChild(this.opponentHandContainer);

    // --- Bluff panel (hidden by default) ---
    this.bluffPanel = new Container();
    this.bluffPanel.visible = false;
    this.addChild(this.bluffPanel);

    this.callButton = new Button({ text: "Blof", width: 200, height: 90 });
    this.callButton.x = -130;
    this.callButton.onPress.connect(() => this.handleBluff(BluffDecision.CALL));
    this.bluffPanel.addChild(this.callButton);

    this.passButton = new Button({ text: "Pass", width: 200, height: 90 });
    this.passButton.x = 130;
    this.passButton.onPress.connect(() => this.handleBluff(BluffDecision.PASS));
    this.bluffPanel.addChild(this.passButton);

    this.bluffTimerLabel = new Label({
      text: "",
      style: { fill: 0xff6600, fontSize: 28 },
    });
    this.bluffTimerLabel.y = -70;
    this.bluffPanel.addChild(this.bluffTimerLabel);

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

    // Score
    this.scoreContainer.x = 20;
    this.scoreContainer.y = 20;
    this.playerNameLabel.anchor.set(0, 0);
    this.playerNameLabel.position.set(0, 0);
    this.playerScoreLabel.anchor.set(0, 0);
    this.playerScoreLabel.position.set(0, 24);
    this.opponentNameLabel.anchor.set(0, 0);
    this.opponentNameLabel.position.set(0, 60);
    this.opponentScoreLabel.anchor.set(0, 0);
    this.opponentScoreLabel.position.set(0, 84);
    this.deckRemainingLabel.anchor.set(0, 0);
    this.deckRemainingLabel.position.set(0, 120);

    // Cup icon — sag alt kose
    this.scoreInfoBtn.x = width - 50;
    this.scoreInfoBtn.y = height - 50;

    // Player hand
    this.playerHandContainer.x = width * 0.5;
    this.playerHandContainer.y = height - 140;
    this.layoutHand();

    // Opponent hand
    this.opponentHandContainer.x = width * 0.5;
    this.opponentHandContainer.y = 100;
    this.layoutOpponentHand();

    // Bluff panel
    this.bluffPanel.x = width * 0.5;
    this.bluffPanel.y = height - 360;

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

    if (this.scorePanel) {
      this.scorePanel.destroy({ children: true });
      this.scorePanel = null;
    }

    // Bump generation — all pending async callbacks (setTimeout, onComplete) become stale
    this._screenGen++;

    // Kill GSAP tweens on screen-level objects
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.bluffPanel);

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
    this._prevMyScore = 0;
    this.myScoreEvents = [];
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
    this.bluffPanel.visible = false;
    this.hiddenPlayButton.visible = false;
    this.stopBluffTimer();
    this.turnIndicator.text = "";
    this.pileCountLabel.text = "Yigin: 0";
    this.playerScoreLabel.text = "0";
    this.opponentScoreLabel.text = "0";
    this.playerNameLabel.text = "";
    this.opponentNameLabel.text = "";
    this.deckRemainingLabel.text = "Deste: 0";
  }

  // ============================
  //   Socket Listeners
  // ============================

  private setupSocketListeners() {
    socketService.onRoomState((state) => this.onRoomState(state));
    socketService.onYourHand((cards) => this.onYourHand(cards));
    socketService.onCardPlayed((data) => this.onCardPlayed(data));
    socketService.onBluffRequest(() => this.showBluffPanel());
    socketService.onBluffResolved((data) => this.onBluffResolved(data));
    socketService.onScoreUpdate((data) => this.onScoreUpdate(data));
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
        this.animateCollectPile();
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
          this.animateDealHand(cards);
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
        this.animateDealHand(cards);
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
    this.animateOpponentPlay(data.isHidden ? null : data.cardId);
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

    if (me) {
      this.playerNameLabel.text = me.nickname;
      this.playerScoreLabel.text = `${me.score}`;
      if (me.score > this._prevMyScore) {
        this.shakeScreen();
      }
      this._prevMyScore = me.score;
    }
    if (opponent) {
      this.opponentNameLabel.text = opponent.nickname;
      this.opponentScoreLabel.text = `${opponent.score}`;

      const newCount = opponent.handCount;
      if (this._prevOpponentHandCount === 0 && newCount > 0) {
        // Opponent got dealt cards — animate (defer if busy)
        if (this.isAnimBusy()) {
          this._deferredOpponentDealCount = newCount;
        } else {
          this.animateOpponentDeal(newCount);
        }
      } else if (newCount !== this.opponentCardSprites.length) {
        this.renderOpponentHand(newCount);
      }
      this._prevOpponentHandCount = newCount;
    }

    this.deckRemainingLabel.text = `Deste: ${deckRemaining}`;
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
      this.bluffPanel.visible = false;
      this.stopBluffTimer();
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

  private flushDeferredTableCard() {
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
  private flushDeferredDeals() {
    if (this._deferredDealCards) {
      const cards = this._deferredDealCards;
      this._deferredDealCards = null;
      this.animateDealHand(cards);
    }
    if (this._deferredOpponentDealCount > 0) {
      const count = this._deferredOpponentDealCount;
      this._deferredOpponentDealCount = 0;
      this.animateOpponentDeal(count);
    }
    this.flushDeferredGameOver();
  }

  /** Show game over screen if deferred and all animations done */
  private flushDeferredGameOver() {
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

  private layoutOpponentHand() {
    const totalWidth = (this.opponentCardSprites.length - 1) * OPPONENT_SPACING;
    const startX = -totalWidth / 2;

    this.opponentCardSprites.forEach((cs, i) => {
      cs.x = startX + i * OPPONENT_SPACING;
    });
  }

  // ============================
  //   Card Selection & Play
  // ============================

  private selectCard(index: number) {
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

  private shakeScreen() {
    gsap.to(this, {
      x: 8,
      duration: 0.04,
      yoyo: true,
      repeat: 5,
      ease: "power1.inOut",
      onComplete: () => {
        this.x = 0;
      },
    });
  }

  private toggleScorePanel() {
    if (this.scorePanel) {
      this.scorePanel.destroy({ children: true });
      this.scorePanel = null;
      return;
    }

    this.scorePanel = new ScorePanel(
      engine().screen.width,
      engine().screen.height,
      this.myScoreEvents,
      () => this.toggleScorePanel(),
    );
    this.addChild(this.scorePanel);
  }

  private onScoreUpdate(data: ScoreUpdateData) {
    const isMe = data.playerId === session.playerId;

    if (!data.category) {
      if (data.pistiType) data.category = "pisti";
      else if (data.label.includes("Flush")) data.category = "flush";
      else if (data.label.includes("Blof")) data.category = "bluff";
      else data.category = "capture";
    }

    if (isMe) this.myScoreEvents.push(data);
    this.showScoreToast(data.label, data.total, isMe);
  }

  private showScoreToast(label: string, total: number, isMe: boolean) {
    const color = isMe ? 0x00ff88 : 0xff4444;
    const prefix = isMe ? "+" : "Rakip +";

    const titleLabel = new Label({
      text: `${prefix}${total}`,
      style: { fill: color, fontSize: 36, fontWeight: "bold" },
    });
    titleLabel.anchor.set(0.5);

    const detailLabel = new Label({
      text: label,
      style: { fill: 0xcccccc, fontSize: 16 },
    });
    detailLabel.anchor.set(0.5);
    detailLabel.y = 32;

    const toast = new Container();
    toast.addChild(titleLabel);
    toast.addChild(detailLabel);
    toast.x = engine().screen.width / 2;
    toast.y = engine().screen.height / 2 - 40;
    toast.alpha = 1;
    this.addChild(toast);

    gsap.to(toast, {
      y: toast.y - 80,
      alpha: 0,
      duration: 2,
      ease: "power2.out",
      onComplete: () => {
        toast.destroy({ children: true });
      },
    });
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
    this.animatePlayCard(sprite);

    // Relayout remaining cards
    this.layoutHand();

    // Emit to server
    socketService.playCard(card.id, isHidden);
  }

  // ============================
  //   Animations
  // ============================

  /** Deal animation: cards fly from deck to player hand, then flip face-up */
  private async animateDealHand(cards: ICard[]): Promise<void> {
    this._isDealAnimating = true;
    const gen = this._screenGen;

    // Clear existing hand sprites
    this.cardSprites.forEach((s) => s.destroy());
    this.cardSprites = [];
    this.playerHandContainer.removeChildren();

    // Deck position in playerHandContainer local coords
    const deckGlobal = this.tableArea.toGlobal({ x: 0, y: -30 });
    const deckLocal = this.playerHandContainer.toLocal(deckGlobal);

    const totalWidth = (cards.length - 1) * HAND_SPACING;
    const startX = -totalWidth / 2;

    const sprites: CardSprite[] = [];

    for (let i = 0; i < cards.length; i++) {
      const cs = new CardSprite(cards[i], false); // start face down
      cs.scale.set(CARD_SCALE);
      cs.position.set(deckLocal.x, deckLocal.y);
      this.playerHandContainer.addChild(cs);
      sprites.push(cs);
    }

    // Stagger animate each card to its hand position
    const promises: Promise<void>[] = [];
    for (let i = 0; i < sprites.length; i++) {
      const targetX = startX + i * HAND_SPACING;
      const cs = sprites[i];

      const p = new Promise<void>((resolve) => {
        gsap.to(cs, {
          x: targetX,
          y: 0,
          duration: DEAL_DURATION,
          delay: i * DEAL_STAGGER,
          ease: "power2.out",
          onComplete: () => {
            if (gen !== this._screenGen) {
              resolve();
              return;
            }
            cs.flip(true).then(resolve);
          },
        });
      });
      promises.push(p);
    }

    await Promise.all(promises);
    if (gen !== this._screenGen) return;

    // Setup interactions
    sprites.forEach((cs, i) => {
      cs.eventMode = "static";
      cs.cursor = "pointer";
      cs.on("pointerdown", () => this.selectCard(i));
    });

    this.cardSprites = sprites;
    this._isDealAnimating = false;
    this.flushDeferredGameOver();
  }

  /** Opponent deal animation: back cards fly from deck to opponent hand */
  private async animateOpponentDeal(count: number): Promise<void> {
    this._isOpponentDealAnimating = true;
    const gen = this._screenGen;

    // Clear existing opponent sprites
    this.opponentCardSprites.forEach((s) => s.destroy());
    this.opponentCardSprites = [];
    this.opponentHandContainer.removeChildren();

    // Deck position in opponentHandContainer local coords
    const deckGlobal = this.tableArea.toGlobal({ x: 0, y: -30 });
    const deckLocal = this.opponentHandContainer.toLocal(deckGlobal);

    const totalWidth = (count - 1) * OPPONENT_SPACING;
    const startX = -totalWidth / 2;

    const sprites: CardSprite[] = [];

    for (let i = 0; i < count; i++) {
      const cs = new CardSprite(undefined, false);
      cs.scale.set(OPPONENT_CARD_SCALE);
      cs.position.set(deckLocal.x, deckLocal.y);
      this.opponentHandContainer.addChild(cs);
      sprites.push(cs);
    }

    this.opponentCardSprites = sprites;

    // Stagger animate
    const promises: Promise<void>[] = [];
    for (let i = 0; i < sprites.length; i++) {
      const targetX = startX + i * OPPONENT_SPACING;
      const p = new Promise<void>((resolve) => {
        gsap.to(sprites[i], {
          x: targetX,
          y: 0,
          duration: DEAL_DURATION,
          delay: i * DEAL_STAGGER,
          ease: "power2.out",
          onComplete: resolve,
        });
      });
      promises.push(p);
    }

    await Promise.all(promises);
    if (gen !== this._screenGen) return;
    this._isOpponentDealAnimating = false;
    this.flushDeferredGameOver();
  }

  /** Play card animation: card flies from hand to table center */
  private animatePlayCard(sprite: CardSprite): void {
    // Convert card position to animLayer coords
    const globalPos = sprite.toGlobal({ x: 0, y: 0 });
    this.playerHandContainer.removeChild(sprite);
    const animPos = this.animLayer.toLocal(globalPos);
    sprite.position.set(animPos.x, animPos.y);
    this.animLayer.addChild(sprite);

    // Track immediately
    this._playAnimSprite = sprite;
    const gen = this._screenGen;

    // Target: table center in animLayer coords
    const tableGlobal = this.tableArea.toGlobal({ x: 0, y: 0 });
    const tableLocal = this.animLayer.toLocal(tableGlobal);

    gsap.to(sprite, {
      x: tableLocal.x,
      y: tableLocal.y,
      duration: PLAY_DURATION,
      ease: "power2.out",
      onComplete: () => {
        // Stale callback — screen was reset, sprite already cleaned up
        if (gen !== this._screenGen) return;
        if (this._playAnimSprite !== sprite) return;

        this._playAnimSprite = null;

        if (this._deferredCollect) {
          // Card landed — reparent to tableArea as the top card, then collect all
          this._deferredCollect = false;
          this._hasDeferredTableCard = false;
          this._deferredTopCard = null;

          if (sprite.parent) sprite.parent.removeChild(sprite);
          // Destroy old table card, put played card as new top
          if (this.tableCardSprite) {
            if (this.tableCardSprite.parent)
              this.tableCardSprite.parent.removeChild(this.tableCardSprite);
            this.tableCardSprite.destroy();
          }
          sprite.position.set(0, 0);
          sprite.scale.set(TABLE_CARD_SCALE);
          this.tableArea.addChild(sprite);
          this.tableCardSprite = sprite;

          // Collect all pile cards (backs + played card) toward winner
          this.animateCollectPile();
        } else {
          if (sprite.parent) sprite.parent.removeChild(sprite);
          sprite.destroy();
          this.flushDeferredTableCard();
          this.flushDeferredDeals();
        }
      },
    });
    gsap.to(sprite.scale, {
      x: TABLE_CARD_SCALE,
      y: TABLE_CARD_SCALE,
      duration: PLAY_DURATION,
      ease: "power2.out",
    });
  }

  /** Opponent play animation: back card flies from opponent hand to table, flips to reveal */
  private animateOpponentPlay(cardId: string | null): void {
    if (this.opponentCardSprites.length === 0) return;

    // Take the last opponent card sprite
    const sprite = this.opponentCardSprites.pop()!;

    // Set the actual card data so flip can show the face (skip for hidden/bluff)
    if (cardId) {
      const card = parseCardId(cardId);
      sprite.setCard(card);
    }

    // Convert to animLayer coords
    const globalPos = sprite.toGlobal({ x: 0, y: 0 });
    this.opponentHandContainer.removeChild(sprite);
    const animPos = this.animLayer.toLocal(globalPos);
    sprite.position.set(animPos.x, animPos.y);
    this.animLayer.addChild(sprite);

    // Track immediately
    this._opponentAnimSprite = sprite;
    const gen = this._screenGen;

    // Target: table center
    const tableGlobal = this.tableArea.toGlobal({ x: 0, y: 0 });
    const tableLocal = this.animLayer.toLocal(tableGlobal);

    const handleLanded = () => {
      if (gen !== this._screenGen) return;
      if (this._opponentAnimSprite !== sprite) return;

      // After landing (and optionally flipping), handle deferred actions
      const afterReveal = () => {
        if (gen !== this._screenGen) return;

        if (this._deferredCollect) {
          this._deferredCollect = false;
          this._hasDeferredTableCard = false;
          this._deferredTopCard = null;

          // Brief pause so player can see the revealed card — use GSAP delayedCall (killable on reset)
          gsap.delayedCall(0.4, () => {
            if (gen !== this._screenGen) return;

            this._opponentAnimSprite = null;
            if (sprite.parent) sprite.parent.removeChild(sprite);
            if (this.tableCardSprite) {
              if (this.tableCardSprite.parent)
                this.tableCardSprite.parent.removeChild(this.tableCardSprite);
              this.tableCardSprite.destroy();
            }
            sprite.position.set(0, 0);
            sprite.scale.set(TABLE_CARD_SCALE);
            this.tableArea.addChild(sprite);
            this.tableCardSprite = sprite;

            this.animateCollectPile();
          });
        } else {
          this._opponentAnimSprite = null;
          if (sprite.parent) sprite.parent.removeChild(sprite);
          sprite.destroy();
          this.flushDeferredTableCard();
          this.flushDeferredDeals();
        }
      };

      if (cardId) {
        // Normal play: flip card face-up, then continue
        sprite.flip(true).then(() => {
          if (gen !== this._screenGen) return;
          afterReveal();
        });
      } else {
        // Hidden/bluff play: card stays face-down, go straight to deferred
        afterReveal();
      }
    };

    gsap.to(sprite, {
      x: tableLocal.x,
      y: tableLocal.y,
      duration: PLAY_DURATION,
      ease: "power2.out",
      onComplete: handleLanded,
    });
    gsap.to(sprite.scale, {
      x: TABLE_CARD_SCALE,
      y: TABLE_CARD_SCALE,
      duration: PLAY_DURATION,
      ease: "power2.out",
    });

    // Relayout remaining opponent cards
    this.layoutOpponentHand();
  }

  /** Collect pile animation: all pile cards fly toward winner */
  private async animateCollectPile(): Promise<void> {
    if (!this.tableCardSprite) {
      this.flushDeferredDeals();
      return;
    }

    this._isCollecting = true;
    const gen = this._screenGen;

    // Use stored bluff winner if available, otherwise fall back to currentTurn heuristic
    const winnerId = this._collectWinnerId;
    this._collectWinnerId = null;
    const isMe = winnerId
      ? winnerId === session.playerId
      : this.roomState?.currentTurn !== session.playerId;

    // Target: winner's hand area
    const targetContainer = isMe
      ? this.playerHandContainer
      : this.opponentHandContainer;
    const targetGlobal = targetContainer.toGlobal({ x: 0, y: 0 });
    const targetLocal = this.animLayer.toLocal(targetGlobal);

    // Move all pile cards (backs + top) to animLayer and fly them out
    const allCards = [...this.pileBackCards, this.tableCardSprite];
    this.pileBackCards = [];
    this.tableCardSprite = null;

    const promises: Promise<void>[] = [];
    for (let i = 0; i < allCards.length; i++) {
      const card = allCards[i];
      if (card.destroyed) continue;
      const globalPos = card.toGlobal({ x: 0, y: 0 });
      if (card.parent) card.parent.removeChild(card);
      const animPos = this.animLayer.toLocal(globalPos);
      card.position.set(animPos.x, animPos.y);
      this.animLayer.addChild(card);

      const p = new Promise<void>((resolve) => {
        gsap.to(card, {
          x: targetLocal.x,
          y: targetLocal.y,
          alpha: 0,
          duration: COLLECT_DURATION,
          delay: i * 0.05,
          ease: "power2.in",
          onComplete: () => {
            if (gen !== this._screenGen) {
              resolve();
              return;
            }
            if (card.parent) card.parent.removeChild(card);
            card.destroy();
            resolve();
          },
        });
      });
      promises.push(p);
    }

    await Promise.all(promises);

    if (gen !== this._screenGen) return;
    this._isCollecting = false;

    // Now that collect is done, flush any deferred deals
    this.flushDeferredDeals();
  }

  // ============================
  //   Bluff
  // ============================

  private showBluffPanel() {
    this.bluffPanel.visible = true;
    this.bluffPanel.alpha = 0;
    gsap.to(this.bluffPanel, { alpha: 1, duration: 0.3, ease: "back.out" });
    this.startBluffTimer();
  }

  private startBluffTimer() {
    this.stopBluffTimer();
    this._bluffTimeLeft = BLUFF_TIMEOUT;
    this.bluffTimerLabel.text = `${this._bluffTimeLeft}s`;

    this._bluffTimerInterval = setInterval(() => {
      this._bluffTimeLeft--;
      this.bluffTimerLabel.text = `${this._bluffTimeLeft}s`;
      if (this._bluffTimeLeft <= 0) {
        this.stopBluffTimer();
      }
    }, 1000);
  }

  private stopBluffTimer() {
    if (this._bluffTimerInterval) {
      clearInterval(this._bluffTimerInterval);
      this._bluffTimerInterval = null;
    }
    this._bluffTimeLeft = 0;
    this.bluffTimerLabel.text = "";
  }

  private handleBluff(decision: BluffDecision) {
    this.stopBluffTimer();
    socketService.bluffDecision(decision);
    this.bluffPanel.visible = false;
  }

  private async onBluffResolved(data: BluffResolvedData) {
    this.bluffPanel.visible = false;
    this.stopBluffTimer();
    this._collectWinnerId = data.winner;

    // PASS → kart açılmaz, collect animasyonu roomState ile tetiklenir
    if (!data.revealed || !data.revealedCard) return;

    // CALL → kapalı kartı aç (son pileBackCard blöf kartıdır)
    const bluffBack = this.pileBackCards[this.pileBackCards.length - 1];
    if (!bluffBack || bluffBack.destroyed) return;

    const gen = this._screenGen;
    this._bluffRevealing = true;

    // Kart verisini ata ve yüzünü çevir
    bluffBack.setCard(data.revealedCard as ICard);
    await bluffBack.flip(true);

    if (gen !== this._screenGen) return;

    // Kısa bekleme — oyuncu açılan kartı görsün
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (gen !== this._screenGen) return;
    this._bluffRevealing = false;

    // Bekleyen collect animasyonunu tetikle
    if (this._deferredCollect) {
      this._deferredCollect = false;
      this.animateCollectPile();
    } else {
      this.flushDeferredTableCard();
      this.flushDeferredDeals();
    }
  }
}
