import gsap from "gsap";
import { BlurFilter, Container, Graphics } from "pixi.js";

import { session, socketService } from "../../game";
import type { BluffResolvedData } from "../../game/services/SocketService";
import type { ICard } from "../../shared/types";
import { BluffDecision } from "../../shared/types";
import { engine } from "../getEngine";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";

import type { GameScreen } from "./GameScreen";

export const BLUFF_TIMEOUT = 30;

// I-GF0 reveal timings (seconds)
const REVEAL_OVERLAY_ALPHA = 0.55;
const REVEAL_OVERLAY_FADE_IN = 0.3;
const REVEAL_OVERLAY_FADE_OUT = 0.4;
const REVEAL_PRE_FLIP_PAUSE = 0.5;
const REVEAL_FLIP_DURATION = 1.25;
const REVEAL_DIGEST_PAUSE = 0.8;
const REVEAL_FLASH_PEAK = 0.55;
const REVEAL_FLASH_DURATION = 0.2;
const REVEAL_BLUR_STRENGTH = 5;
const REVEAL_TEXT_SCALE_DURATION = 0.4;
const REVEAL_TEXT_FADE_DURATION = 0.3;
const REVEAL_HAND_FLASH_ALPHA = 0.7;
const REVEAL_SHAKE_DURATION = 0.04;

/**
 * Bluff UI + flow yoneticisi.
 * Panel olusturma, timer yonetimi, CALL/PASS handling, reveal animasyonu (I-GF0).
 * Pile/animation state GameScreen'de tutulur, buradan erisilir.
 */
export class BluffController {
  public panel: Container;
  private callButton: Button;
  private passButton: Button;
  private timerLabel: Label;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private timeLeft = 0;

  // I-GF0 reveal state
  private dimOverlay: Graphics | null = null;
  private flashLayer: Graphics | null = null;
  private resultLabel: Label | null = null;
  private blurredTargets: Container[] = [];
  private handFlashOverlay: Graphics | null = null;
  private originalTableIndex = -1;

  constructor(private screen: GameScreen) {
    // --- Bluff panel (hidden by default) ---
    this.panel = new Container();
    this.panel.visible = false;

    this.callButton = new Button({ text: "Blof", width: 200, height: 90 });
    this.callButton.x = -130;
    this.callButton.onPress.connect(() =>
      this.handleDecision(BluffDecision.CALL),
    );
    this.panel.addChild(this.callButton);

    this.passButton = new Button({ text: "Pass", width: 200, height: 90 });
    this.passButton.x = 130;
    this.passButton.onPress.connect(() =>
      this.handleDecision(BluffDecision.PASS),
    );
    this.panel.addChild(this.passButton);

    this.timerLabel = new Label({
      text: "",
      style: { fill: 0xff6600, fontSize: 28 },
    });
    this.timerLabel.y = -70;
    this.panel.addChild(this.timerLabel);
  }

  /** Show panel + start countdown */
  show() {
    this.panel.visible = true;
    this.panel.alpha = 0;
    gsap.to(this.panel, { alpha: 1, duration: 0.3, ease: "back.out" });
    this.startTimer();
  }

  /** Hide panel + stop timer (called when phase changes away from BLUFF_PHASE) */
  hide() {
    this.panel.visible = false;
    this.stopTimer();
  }

  /** Set panel position (called from GameScreen.resize) */
  setPosition(x: number, y: number) {
    this.panel.x = x;
    this.panel.y = y;
  }

  /** Reset everything (called from GameScreen.reset) */
  reset() {
    this.panel.visible = false;
    this.stopTimer();
    this.cleanupReveal();
  }

  private startTimer() {
    this.stopTimer();
    this.timeLeft = BLUFF_TIMEOUT;
    this.timerLabel.text = `${this.timeLeft}s`;

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.timerLabel.text = `${this.timeLeft}s`;
      if (this.timeLeft <= 0) {
        this.stopTimer();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timeLeft = 0;
    this.timerLabel.text = "";
  }

  private handleDecision(decision: BluffDecision) {
    this.stopTimer();
    socketService.bluffDecision(decision);
    this.panel.visible = false;
  }

  /**
   * Handle bluff resolved event from server.
   * PASS → erken return, collect animasyonu roomState ile tetiklenir.
   * CALL → I-GF0 reveal akisini calistirir (9 adim).
   */
  async onResolved(data: BluffResolvedData) {
    const screen = this.screen;
    this.panel.visible = false;
    this.stopTimer();
    screen._collectWinnerId = data.winner;

    // PASS → kart acilmaz, collect animasyonu roomState ile tetiklenir
    if (!data.revealed || !data.revealedCard) return;

    // CALL → kapali karti ac (son pileBackCard blof kartidir)
    const bluffBack = screen.pileBackCards[screen.pileBackCards.length - 1];
    if (!bluffBack || bluffBack.destroyed) return;

    const gen = screen._screenGen;
    screen._bluffRevealing = true;

    // Gercek blof mu? Kazanan bluff oyuncusu ise gercek pisti.
    const bluffPlayerId = screen.roomState?.bluffPlayerId;
    const isReal = !!bluffPlayerId && data.winner === bluffPlayerId;
    const bluffIsMe = bluffPlayerId === session.playerId;

    // --- Adim 1-2: Dim overlay + blur ---
    this.showDimOverlay();
    this.applyBlur();

    // --- Adim 3: Dramatik pause (overlay fade + bekleme) ---
    await this.wait(REVEAL_OVERLAY_FADE_IN + REVEAL_PRE_FLIP_PAUSE);
    if (gen !== screen._screenGen) return;

    // --- Adim 4: Yavas flip (1.25s toplam) ---
    bluffBack.setCard(data.revealedCard as ICard);
    await bluffBack.flip(true, REVEAL_FLIP_DURATION);
    if (gen !== screen._screenGen) return;

    // --- Adim 5: Sonuc efekti ---
    if (isReal) {
      // 5a — gercek pisti
      this.flashScreen(0xffffff);
      this.showResultText("+20 GERCEK!", 0xffcc00);
      this.shakeScreen();
    } else {
      // 5b — sahte (yakalandi)
      this.flashScreen(0xff3333);
      this.showResultText("YAKALANDI!", 0xff3333);
      this.flashBlufferHand(bluffIsMe);
    }

    // --- Adim 6: Sindirme pause (oyuncu sonucu okur) ---
    await this.wait(REVEAL_DIGEST_PAUSE);
    if (gen !== screen._screenGen) return;

    // --- Cleanup: blur + result label kaldir ---
    this.removeBlur();
    this.removeResultLabel();

    // Reveal bitti — collect tetigi serbest
    screen._bluffRevealing = false;

    // --- Adim 7: Pile toplama ---
    if (screen._deferredCollect) {
      screen._deferredCollect = false;
      screen.animations.animateCollectPile();
    } else {
      screen.flushDeferredTableCard();
      screen.flushDeferredDeals();
    }

    // --- Adim 8-9: Overlay fade out (collect ile paralel) ---
    this.hideDimOverlay();
  }

  // ============================
  //   I-GF0 Reveal helpers
  // ============================

  private wait(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  private showDimOverlay(): void {
    if (this.dimOverlay) return;
    const screen = this.screen;
    const w = engine().screen.width;
    const h = engine().screen.height;

    const overlay = new Graphics().rect(0, 0, w, h).fill(0x000000);
    overlay.alpha = 0;

    // Overlay'i ekle, tableArea'yi overlay ustune cikar (parlak kalsin)
    this.originalTableIndex = screen.getChildIndex(screen.tableArea);
    screen.addChild(overlay);
    screen.setChildIndex(screen.tableArea, screen.children.length - 1);
    if (!screen.animLayer.destroyed) {
      screen.setChildIndex(screen.animLayer, screen.children.length - 1);
    }

    this.dimOverlay = overlay;
    gsap.to(overlay, {
      alpha: REVEAL_OVERLAY_ALPHA,
      duration: REVEAL_OVERLAY_FADE_IN,
      ease: "power2.out",
    });
  }

  private hideDimOverlay(): void {
    if (!this.dimOverlay) return;
    const overlay = this.dimOverlay;
    const screen = this.screen;
    const originalIndex = this.originalTableIndex;

    gsap.to(overlay, {
      alpha: 0,
      duration: REVEAL_OVERLAY_FADE_OUT,
      ease: "power2.in",
      onComplete: () => {
        if (overlay.parent) overlay.parent.removeChild(overlay);
        overlay.destroy();
        if (
          originalIndex >= 0 &&
          screen.tableArea &&
          !screen.tableArea.destroyed
        ) {
          const max = screen.children.length - 1;
          const target = Math.min(Math.max(originalIndex, 0), max);
          screen.setChildIndex(screen.tableArea, target);
        }
      },
    });

    this.dimOverlay = null;
    this.originalTableIndex = -1;
  }

  private applyBlur(): void {
    const targets: Container[] = [
      this.screen.playerHandContainer,
      this.screen.opponentHandContainer,
    ];
    for (const target of targets) {
      if (target.destroyed) continue;
      const filter = new BlurFilter({ strength: REVEAL_BLUR_STRENGTH });
      target.filters = [filter];
      this.blurredTargets.push(target);
    }
  }

  private removeBlur(): void {
    for (const target of this.blurredTargets) {
      if (!target.destroyed) target.filters = null;
    }
    this.blurredTargets = [];
  }

  private flashScreen(color: number): void {
    const screen = this.screen;
    const w = engine().screen.width;
    const h = engine().screen.height;
    const flash = new Graphics().rect(0, 0, w, h).fill(color);
    flash.alpha = 0;
    screen.addChild(flash);

    // animLayer tepede kalsin
    if (!screen.animLayer.destroyed) {
      screen.setChildIndex(screen.animLayer, screen.children.length - 1);
    }

    this.flashLayer = flash;
    gsap.to(flash, {
      alpha: REVEAL_FLASH_PEAK,
      duration: REVEAL_FLASH_DURATION / 2,
      yoyo: true,
      repeat: 1,
      ease: "power2.out",
      onComplete: () => {
        if (flash.parent) flash.parent.removeChild(flash);
        flash.destroy();
        if (this.flashLayer === flash) this.flashLayer = null;
      },
    });
  }

  private showResultText(text: string, color: number): void {
    const screen = this.screen;
    const label = new Label({
      text,
      style: { fill: color, fontSize: 72, fontWeight: "bold" },
    });
    label.anchor.set(0.5);
    label.x = engine().screen.width / 2;
    label.y = engine().screen.height / 2 - 80;
    label.scale.set(0);
    screen.addChild(label);

    if (!screen.animLayer.destroyed) {
      screen.setChildIndex(screen.animLayer, screen.children.length - 1);
    }

    this.resultLabel = label;
    gsap.to(label.scale, {
      x: 1,
      y: 1,
      duration: REVEAL_TEXT_SCALE_DURATION,
      ease: "back.out(2)",
    });
  }

  private removeResultLabel(): void {
    if (!this.resultLabel) return;
    const label = this.resultLabel;
    this.resultLabel = null;

    gsap.to(label, {
      alpha: 0,
      duration: REVEAL_TEXT_FADE_DURATION,
      ease: "power2.in",
      onComplete: () => {
        if (label.parent) label.parent.removeChild(label);
        label.destroy({ children: true });
      },
    });
  }

  private shakeScreen(): void {
    const screen = this.screen;
    gsap.to(screen, {
      x: 12,
      duration: REVEAL_SHAKE_DURATION,
      yoyo: true,
      repeat: 7,
      ease: "power1.inOut",
      onComplete: () => {
        screen.x = 0;
      },
    });
  }

  /** Blofcunun el bolgesinde kisa kirmizi flash (yakalandi) */
  private flashBlufferHand(bluffIsMe: boolean): void {
    const screen = this.screen;
    const target = bluffIsMe
      ? screen.playerHandContainer
      : screen.opponentHandContainer;
    if (target.destroyed) return;

    const bounds = target.getLocalBounds();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const flash = new Graphics()
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .fill(0xff3333);
    flash.alpha = 0;
    target.addChild(flash);
    this.handFlashOverlay = flash;

    gsap.to(flash, {
      alpha: REVEAL_HAND_FLASH_ALPHA,
      duration: 0.15,
      yoyo: true,
      repeat: 1,
      ease: "power2.out",
      onComplete: () => {
        if (flash.parent) flash.parent.removeChild(flash);
        flash.destroy();
        if (this.handFlashOverlay === flash) this.handFlashOverlay = null;
      },
    });
  }

  /** Tum reveal visual'larini hemen temizle (reset sirasinda) */
  private cleanupReveal(): void {
    if (this.dimOverlay) {
      gsap.killTweensOf(this.dimOverlay);
      if (this.dimOverlay.parent)
        this.dimOverlay.parent.removeChild(this.dimOverlay);
      this.dimOverlay.destroy();
      this.dimOverlay = null;
    }
    if (this.flashLayer) {
      gsap.killTweensOf(this.flashLayer);
      if (this.flashLayer.parent)
        this.flashLayer.parent.removeChild(this.flashLayer);
      this.flashLayer.destroy();
      this.flashLayer = null;
    }
    if (this.handFlashOverlay) {
      gsap.killTweensOf(this.handFlashOverlay);
      if (this.handFlashOverlay.parent)
        this.handFlashOverlay.parent.removeChild(this.handFlashOverlay);
      this.handFlashOverlay.destroy();
      this.handFlashOverlay = null;
    }
    if (this.resultLabel) {
      gsap.killTweensOf(this.resultLabel);
      gsap.killTweensOf(this.resultLabel.scale);
      if (this.resultLabel.parent)
        this.resultLabel.parent.removeChild(this.resultLabel);
      this.resultLabel.destroy({ children: true });
      this.resultLabel = null;
    }
    this.removeBlur();
    this.originalTableIndex = -1;
  }
}
