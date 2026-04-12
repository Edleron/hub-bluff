import gsap from "gsap";
import { Container, Graphics } from "pixi.js";

import { session, socketService } from "../../game";
import type { GameOverData } from "../../game/services/SocketService";
import { engine } from "../getEngine";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { RoundedBox } from "../ui/RoundedBox";

import { LobbyScreen } from "./LobbyScreen";

/** Oyun sonu ekrani */
export class GameOverScreen extends Container {
  public static assetBundles = ["preload", "main"];

  /** Set by GameScreen before navigating here */
  public static lastResult: GameOverData | null = null;

  private bg: Graphics;
  private panel: Container;
  private panelBase: RoundedBox;
  private title: Label;
  private resultLabel: Label;
  private playerScoreLabel: Label;
  private opponentScoreLabel: Label;
  private backButton: Button;

  constructor() {
    super();

    this.bg = new Graphics();
    this.addChild(this.bg);

    this.panel = new Container();
    this.addChild(this.panel);

    this.panelBase = new RoundedBox({ width: 400, height: 400 });
    this.panel.addChild(this.panelBase);

    this.title = new Label({
      text: "Oyun Bitti!",
      style: { fill: 0xec1561, fontSize: 42 },
    });
    this.title.y = -140;
    this.panel.addChild(this.title);

    this.resultLabel = new Label({
      text: "",
      style: { fill: 0xffcc00, fontSize: 32 },
    });
    this.resultLabel.y = -80;
    this.panel.addChild(this.resultLabel);

    this.playerScoreLabel = new Label({
      text: "",
      style: { fill: 0xffffff, fontSize: 22 },
    });
    this.playerScoreLabel.y = -20;
    this.panel.addChild(this.playerScoreLabel);

    this.opponentScoreLabel = new Label({
      text: "",
      style: { fill: 0xffffff, fontSize: 22 },
    });
    this.opponentScoreLabel.y = 20;
    this.panel.addChild(this.opponentScoreLabel);

    this.backButton = new Button({
      text: "Lobiye Don",
      width: 220,
      height: 80,
    });
    this.backButton.y = 110;
    this.backButton.onPress.connect(() => this.handleBack());
    this.panel.addChild(this.backButton);
  }

  public prepare() {
    const result = GameOverScreen.lastResult;
    if (!result) return;

    const isWinner = result.winner === session.playerId;
    this.resultLabel.text = isWinner ? "Kazandin!" : "Kaybettin!";
    this.resultLabel.style.fill = isWinner ? 0x00ff88 : 0xff4444;

    const me = result.players.find((p) => p.id === session.playerId);
    const opponent = result.players.find((p) => p.id !== session.playerId);

    if (me) {
      this.playerScoreLabel.text = `${me.nickname}: ${me.score} puan`;
    }
    if (opponent) {
      this.opponentScoreLabel.text = `${opponent.nickname}: ${opponent.score} puan`;
    }
  }

  public resize(width: number, height: number) {
    this.bg.clear().rect(0, 0, width, height).fill({ color: 0x1a1a1a });
    this.panel.x = width * 0.5;
    this.panel.y = height * 0.5;
  }

  public async show() {
    this.panel.alpha = 0;
    this.panel.pivot.y = -200;
    await Promise.all([
      gsap.to(this.panel, { alpha: 1, duration: 0.4, ease: "power2.out" }),
      gsap.to(this.panel.pivot, { y: 0, duration: 0.4, ease: "back.out" }),
    ]);
  }

  public async hide() {
    await gsap.to(this, { alpha: 0, duration: 0.3, ease: "none" });
  }

  public reset() {
    GameOverScreen.lastResult = null;
  }

  private handleBack() {
    socketService.disconnect();
    session.clear();
    GameOverScreen.lastResult = null;
    engine().navigation.showScreen(LobbyScreen);
  }
}
