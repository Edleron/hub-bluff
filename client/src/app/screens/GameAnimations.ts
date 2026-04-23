import gsap from "gsap";

import { parseCardId } from "../../game";
import { CardSprite } from "../../game/components/CardSprite";
import { session } from "../../game";
import type { ICard } from "../../shared/types";

import type { GameScreen } from "./GameScreen";

export const CARD_SCALE = 0.85;
export const OPPONENT_CARD_SCALE = 0.7;
export const TABLE_CARD_SCALE = 0.95;
export const HAND_SPACING = 140;
export const OPPONENT_SPACING = 112;
export const DEAL_DURATION = 0.3;
export const DEAL_STAGGER = 0.1;
export const PLAY_DURATION = 0.25;
export const COLLECT_DURATION = 0.4;

/**
 * GameScreen animasyon yoneticisi.
 * Tum animasyon logic'i burada — deal, play, collect, opponent.
 * State (sprite refs, deferred flags) GameScreen'de tutulur, buradan erisilir.
 */
export class GameAnimations {
  constructor(private screen: GameScreen) {}

  /** Deal animation: cards fly from deck to player hand, then flip face-up */
  async animateDealHand(cards: ICard[]): Promise<void> {
    const screen = this.screen;
    screen._isDealAnimating = true;
    const gen = screen._screenGen;

    // Clear existing hand sprites
    screen.cardSprites.forEach((s) => s.destroy());
    screen.cardSprites = [];
    screen.playerHandContainer.removeChildren();

    // Deck position in playerHandContainer local coords
    const deckGlobal = screen.tableArea.toGlobal({ x: 0, y: -30 });
    const deckLocal = screen.playerHandContainer.toLocal(deckGlobal);

    const totalWidth = (cards.length - 1) * HAND_SPACING;
    const startX = -totalWidth / 2;

    const sprites: CardSprite[] = [];

    for (let i = 0; i < cards.length; i++) {
      const cs = new CardSprite(cards[i], false); // start face down
      cs.scale.set(CARD_SCALE);
      cs.position.set(deckLocal.x, deckLocal.y);
      screen.playerHandContainer.addChild(cs);
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
            if (gen !== screen._screenGen) {
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
    if (gen !== screen._screenGen) return;

    // Setup interactions
    sprites.forEach((cs, i) => {
      cs.eventMode = "static";
      cs.cursor = "pointer";
      cs.on("pointerdown", () => screen.selectCard(i));
    });

    screen.cardSprites = sprites;
    screen._isDealAnimating = false;
    screen.flushDeferredGameOver();
  }

  /** Opponent deal animation: back cards fly from deck to opponent hand */
  async animateOpponentDeal(count: number): Promise<void> {
    const screen = this.screen;
    screen._isOpponentDealAnimating = true;
    const gen = screen._screenGen;

    // Clear existing opponent sprites
    screen.opponentCardSprites.forEach((s) => s.destroy());
    screen.opponentCardSprites = [];
    screen.opponentHandContainer.removeChildren();

    // Deck position in opponentHandContainer local coords
    const deckGlobal = screen.tableArea.toGlobal({ x: 0, y: -30 });
    const deckLocal = screen.opponentHandContainer.toLocal(deckGlobal);

    const totalWidth = (count - 1) * OPPONENT_SPACING;
    const startX = -totalWidth / 2;

    const sprites: CardSprite[] = [];

    for (let i = 0; i < count; i++) {
      const cs = new CardSprite(undefined, false);
      cs.scale.set(OPPONENT_CARD_SCALE);
      cs.position.set(deckLocal.x, deckLocal.y);
      screen.opponentHandContainer.addChild(cs);
      sprites.push(cs);
    }

    screen.opponentCardSprites = sprites;

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
    if (gen !== screen._screenGen) return;
    screen._isOpponentDealAnimating = false;
    screen.flushDeferredGameOver();
  }

  /** Play card animation: card flies from hand to table center */
  animatePlayCard(sprite: CardSprite): void {
    const screen = this.screen;

    // Convert card position to animLayer coords
    const globalPos = sprite.toGlobal({ x: 0, y: 0 });
    screen.playerHandContainer.removeChild(sprite);
    const animPos = screen.animLayer.toLocal(globalPos);
    sprite.position.set(animPos.x, animPos.y);
    screen.animLayer.addChild(sprite);

    // Track immediately
    screen._playAnimSprite = sprite;
    const gen = screen._screenGen;

    // Target: table center in animLayer coords
    const tableGlobal = screen.tableArea.toGlobal({ x: 0, y: 0 });
    const tableLocal = screen.animLayer.toLocal(tableGlobal);

    gsap.to(sprite, {
      x: tableLocal.x,
      y: tableLocal.y,
      duration: PLAY_DURATION,
      ease: "power2.out",
      onComplete: () => {
        // Stale callback — screen was reset, sprite already cleaned up
        if (gen !== screen._screenGen) return;
        if (screen._playAnimSprite !== sprite) return;

        screen._playAnimSprite = null;

        if (screen._deferredCollect) {
          // Card landed — reparent to tableArea as the top card, then collect all
          screen._deferredCollect = false;
          screen._hasDeferredTableCard = false;
          screen._deferredTopCard = null;

          if (sprite.parent) sprite.parent.removeChild(sprite);
          // Destroy old table card, put played card as new top
          if (screen.tableCardSprite) {
            if (screen.tableCardSprite.parent)
              screen.tableCardSprite.parent.removeChild(screen.tableCardSprite);
            screen.tableCardSprite.destroy();
          }
          sprite.position.set(0, 0);
          sprite.scale.set(TABLE_CARD_SCALE);
          screen.tableArea.addChild(sprite);
          screen.tableCardSprite = sprite;

          // Collect all pile cards (backs + played card) toward winner
          this.animateCollectPile();
        } else {
          if (sprite.parent) sprite.parent.removeChild(sprite);
          sprite.destroy();
          screen.flushDeferredTableCard();
          screen.flushDeferredDeals();
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
  animateOpponentPlay(cardId: string | null): void {
    const screen = this.screen;
    if (screen.opponentCardSprites.length === 0) return;

    // Take the last opponent card sprite
    const sprite = screen.opponentCardSprites.pop()!;

    // Set the actual card data so flip can show the face (skip for hidden/bluff)
    if (cardId) {
      const card = parseCardId(cardId);
      sprite.setCard(card);
    }

    // Convert to animLayer coords
    const globalPos = sprite.toGlobal({ x: 0, y: 0 });
    screen.opponentHandContainer.removeChild(sprite);
    const animPos = screen.animLayer.toLocal(globalPos);
    sprite.position.set(animPos.x, animPos.y);
    screen.animLayer.addChild(sprite);

    // Track immediately
    screen._opponentAnimSprite = sprite;
    const gen = screen._screenGen;

    // Target: table center
    const tableGlobal = screen.tableArea.toGlobal({ x: 0, y: 0 });
    const tableLocal = screen.animLayer.toLocal(tableGlobal);

    const handleLanded = () => {
      if (gen !== screen._screenGen) return;
      if (screen._opponentAnimSprite !== sprite) return;

      // After landing (and optionally flipping), handle deferred actions
      const afterReveal = () => {
        if (gen !== screen._screenGen) return;

        if (screen._deferredCollect) {
          screen._deferredCollect = false;
          screen._hasDeferredTableCard = false;
          screen._deferredTopCard = null;

          // Brief pause so player can see the revealed card — use GSAP delayedCall (killable on reset)
          gsap.delayedCall(0.4, () => {
            if (gen !== screen._screenGen) return;

            screen._opponentAnimSprite = null;
            if (sprite.parent) sprite.parent.removeChild(sprite);
            if (screen.tableCardSprite) {
              if (screen.tableCardSprite.parent)
                screen.tableCardSprite.parent.removeChild(
                  screen.tableCardSprite,
                );
              screen.tableCardSprite.destroy();
            }
            sprite.position.set(0, 0);
            sprite.scale.set(TABLE_CARD_SCALE);
            screen.tableArea.addChild(sprite);
            screen.tableCardSprite = sprite;

            this.animateCollectPile();
          });
        } else {
          screen._opponentAnimSprite = null;
          if (sprite.parent) sprite.parent.removeChild(sprite);
          sprite.destroy();
          screen.flushDeferredTableCard();
          screen.flushDeferredDeals();
        }
      };

      if (cardId) {
        // Normal play: flip card face-up, then continue
        sprite.flip(true).then(() => {
          if (gen !== screen._screenGen) return;
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
    screen.layoutOpponentHand();
  }

  /** Collect pile animation: all pile cards fly toward winner */
  async animateCollectPile(): Promise<void> {
    const screen = this.screen;
    if (!screen.tableCardSprite) {
      screen.flushDeferredDeals();
      return;
    }

    screen._isCollecting = true;
    const gen = screen._screenGen;

    // Use stored bluff winner if available, otherwise fall back to currentTurn heuristic
    const winnerId = screen._collectWinnerId;
    screen._collectWinnerId = null;
    const isMe = winnerId
      ? winnerId === session.playerId
      : screen.roomState?.currentTurn !== session.playerId;

    // Target: winner's hand area
    const targetContainer = isMe
      ? screen.playerHandContainer
      : screen.opponentHandContainer;
    const targetGlobal = targetContainer.toGlobal({ x: 0, y: 0 });
    const targetLocal = screen.animLayer.toLocal(targetGlobal);

    // Move all pile cards (backs + top) to animLayer and fly them out
    const allCards = [...screen.pileBackCards, screen.tableCardSprite];
    screen.pileBackCards = [];
    screen.tableCardSprite = null;

    const promises: Promise<void>[] = [];
    for (let i = 0; i < allCards.length; i++) {
      const card = allCards[i];
      if (card.destroyed) continue;
      const globalPos = card.toGlobal({ x: 0, y: 0 });
      if (card.parent) card.parent.removeChild(card);
      const animPos = screen.animLayer.toLocal(globalPos);
      card.position.set(animPos.x, animPos.y);
      screen.animLayer.addChild(card);

      const p = new Promise<void>((resolve) => {
        gsap.to(card, {
          x: targetLocal.x,
          y: targetLocal.y,
          alpha: 0,
          duration: COLLECT_DURATION,
          delay: i * 0.05,
          ease: "power2.in",
          onComplete: () => {
            if (gen !== screen._screenGen) {
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

    if (gen !== screen._screenGen) return;
    screen._isCollecting = false;

    // Now that collect is done, flush any deferred deals
    screen.flushDeferredDeals();
  }
}
