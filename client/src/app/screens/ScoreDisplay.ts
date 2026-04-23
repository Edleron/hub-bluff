import gsap from "gsap";
import { Container, Sprite } from "pixi.js";

import { session } from "../../game";
import type { ScoreUpdateData } from "../../game/services/SocketService";
import type { IPlayer } from "../../shared/types";
import { engine } from "../getEngine";
import { Label } from "../ui/Label";
import { ScorePanel } from "../ui/ScorePanel";

import type { GameScreen } from "./GameScreen";

/**
 * Skor gosterimi: panel, toast, shake, score detail panel.
 * Sol ust kose: oyuncu/rakip skoru + deste sayaci.
 * Sag alt kose: kupa ikonu (toggleScorePanel).
 */
export class ScoreDisplay {
  // Containers
  public container: Container;
  public infoButton: Sprite;

  // Labels
  private playerNameLabel: Label;
  private playerScoreLabel: Label;
  private opponentNameLabel: Label;
  private opponentScoreLabel: Label;
  private deckRemainingLabel: Label;

  // Score detail panel (toggle)
  private scorePanel: ScorePanel | null = null;
  private myScoreEvents: ScoreUpdateData[] = [];

  // Shake tracking — last known own score to detect changes
  private prevMyScore = 0;

  constructor(private screen: GameScreen) {
    // Sol ust skor container
    this.container = new Container();

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

    this.container.addChild(this.playerNameLabel);
    this.container.addChild(this.playerScoreLabel);
    this.container.addChild(this.opponentNameLabel);
    this.container.addChild(this.opponentScoreLabel);
    this.container.addChild(this.deckRemainingLabel);

    // Sag alt kose — score panel toggle
    this.infoButton = Sprite.from("cup.png");
    this.infoButton.anchor.set(0.5);
    this.infoButton.scale.set(0.25);
    this.infoButton.eventMode = "static";
    this.infoButton.cursor = "pointer";
    this.infoButton.on("pointertap", () => this.togglePanel());
  }

  /** Layout: called from GameScreen.resize */
  layout(width: number, height: number) {
    this.container.x = 20;
    this.container.y = 20;
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

    this.infoButton.x = width - 50;
    this.infoButton.y = height - 50;
  }

  /** Update player + opponent score labels (called from renderState) */
  updateScores(me: IPlayer | undefined, opponent: IPlayer | undefined) {
    if (me) {
      this.playerNameLabel.text = me.nickname;
      this.playerScoreLabel.text = `${me.score}`;
      // Reveal sirasinda shake'i bastir (I-GF0 kendi shake'ini yapar)
      if (me.score > this.prevMyScore && !this.screen._bluffRevealing) {
        this.shake();
      }
      this.prevMyScore = me.score;
    }
    if (opponent) {
      this.opponentNameLabel.text = opponent.nickname;
      this.opponentScoreLabel.text = `${opponent.score}`;
    }
  }

  /** Update deck remaining label */
  updateDeck(deckRemaining: number) {
    this.deckRemainingLabel.text = `Deste: ${deckRemaining}`;
  }

  /** Score update event from server — show toast + record event */
  onScoreUpdate(data: ScoreUpdateData) {
    const isMe = data.playerId === session.playerId;

    if (!data.category) {
      if (data.pistiType) data.category = "pisti";
      else if (data.label.includes("Flush")) data.category = "flush";
      else if (data.label.includes("Blof")) data.category = "bluff";
      else data.category = "capture";
    }

    if (isMe) this.myScoreEvents.push(data);
    this.showToast(data.label, data.total, isMe);
  }

  /** Reset all state (called from GameScreen.reset) */
  reset() {
    if (this.scorePanel) {
      this.scorePanel.destroy({ children: true });
      this.scorePanel = null;
    }
    this.prevMyScore = 0;
    this.myScoreEvents = [];
    this.playerScoreLabel.text = "0";
    this.opponentScoreLabel.text = "0";
    this.playerNameLabel.text = "";
    this.opponentNameLabel.text = "";
    this.deckRemainingLabel.text = "Deste: 0";
  }

  private shake() {
    const screen = this.screen;
    gsap.to(screen, {
      x: 8,
      duration: 0.04,
      yoyo: true,
      repeat: 5,
      ease: "power1.inOut",
      onComplete: () => {
        screen.x = 0;
      },
    });
  }

  private togglePanel() {
    if (this.scorePanel) {
      this.scorePanel.destroy({ children: true });
      this.scorePanel = null;
      return;
    }

    this.scorePanel = new ScorePanel(
      engine().screen.width,
      engine().screen.height,
      this.myScoreEvents,
      () => this.togglePanel(),
    );
    this.screen.addChild(this.scorePanel);
  }

  private showToast(label: string, total: number, isMe: boolean) {
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
    this.screen.addChild(toast);

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
}
