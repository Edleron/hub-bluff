import gsap from "gsap";
import { Container } from "pixi.js";

import { socketService } from "../../game";
import type { BluffResolvedData } from "../../game/services/SocketService";
import type { ICard } from "../../shared/types";
import { BluffDecision } from "../../shared/types";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";

import type { GameScreen } from "./GameScreen";

export const BLUFF_TIMEOUT = 30;

/**
 * Bluff UI + flow yoneticisi.
 * Panel olusturma, timer yonetimi, CALL/PASS handling, reveal animasyonu.
 * Pile/animation state GameScreen'de tutulur, buradan erisilir.
 */
export class BluffController {
  public panel: Container;
  private callButton: Button;
  private passButton: Button;
  private timerLabel: Label;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private timeLeft = 0;

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

  /** Handle bluff resolved event from server */
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

    // Kart verisini ata ve yuzunu cevir
    bluffBack.setCard(data.revealedCard as ICard);
    await bluffBack.flip(true);

    if (gen !== screen._screenGen) return;

    // Kisa bekleme — oyuncu acilan karti gorsun
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (gen !== screen._screenGen) return;
    screen._bluffRevealing = false;

    // Bekleyen collect animasyonunu tetikle
    if (screen._deferredCollect) {
      screen._deferredCollect = false;
      screen.animations.animateCollectPile();
    } else {
      screen.flushDeferredTableCard();
      screen.flushDeferredDeals();
    }
  }
}
