import gsap from "gsap";
import { Container, Graphics } from "pixi.js";

import { apiService, session, socketService } from "../../game";
import type { GameConfig } from "../../shared/types";
import { engine } from "../getEngine";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { RoundedBox } from "../ui/RoundedBox";

import { GameScreen } from "./GameScreen";

/** Lobby screen — username secimi + host ayarlari */
export class LobbyScreen extends Container {
  public static assetBundles = ["preload", "main"];

  private panel: Container;
  private panelBase: RoundedBox;
  private title: Label;
  private statusLabel: Label;
  private versionLabel: Label;

  // Username butonlari
  private userButtonsContainer: Container;
  private edleronBtn: Button;
  private wilkagulBtn: Button;

  // Host ayarlari
  private settingsContainer: Container;
  private deckToggle: Button;
  private bluffToggle: Button;
  private readyButton: Button;
  private deckLabel: Label;
  private bluffLabel: Label;

  private isHost = false;
  private deckType: "single" | "double" = "single";
  private bluffEnabled = true;

  constructor() {
    super();

    const bg = new Graphics();
    bg.rect(0, 0, 1, 1).fill({ color: 0x1e1e1e });
    this.addChild(bg);

    this.panel = new Container();
    this.addChild(this.panel);

    this.panelBase = new RoundedBox({ width: 420, height: 500 });
    this.panel.addChild(this.panelBase);

    this.title = new Label({
      text: "Bluff",
      style: { fill: 0xec1561, fontSize: 48 },
    });
    this.title.y = -200;
    this.panel.addChild(this.title);

    this.statusLabel = new Label({
      text: "Oyuncu sec",
      style: { fill: 0xffffff, fontSize: 18 },
    });
    this.statusLabel.y = -140;
    this.panel.addChild(this.statusLabel);

    // --- Username butonlari ---
    this.userButtonsContainer = new Container();
    this.panel.addChild(this.userButtonsContainer);

    this.edleronBtn = new Button({
      text: "edleron",
      width: 200,
      height: 70,
      fontSize: 22,
    });
    this.edleronBtn.y = -40;
    this.edleronBtn.onPress.connect(() => this.handleLogin("edleron"));
    this.userButtonsContainer.addChild(this.edleronBtn);

    this.wilkagulBtn = new Button({
      text: "wilkagul",
      width: 200,
      height: 70,
      fontSize: 22,
    });
    this.wilkagulBtn.y = 50;
    this.wilkagulBtn.onPress.connect(() => this.handleLogin("wilkagul"));
    this.userButtonsContainer.addChild(this.wilkagulBtn);

    // --- Host oyun ayarlari (sadece edleron gorur) ---
    this.settingsContainer = new Container();
    this.settingsContainer.visible = false;
    this.panel.addChild(this.settingsContainer);

    this.deckLabel = new Label({
      text: "Deste:",
      style: { fill: 0xaaaaaa, fontSize: 14 },
    });
    this.deckLabel.x = -100;
    this.deckLabel.y = -50;
    this.settingsContainer.addChild(this.deckLabel);

    this.deckToggle = new Button({
      text: "Tek (52)",
      width: 140,
      height: 50,
      fontSize: 16,
    });
    this.deckToggle.x = 50;
    this.deckToggle.y = -50;
    this.deckToggle.onPress.connect(() => this.toggleDeck());
    this.settingsContainer.addChild(this.deckToggle);

    this.bluffLabel = new Label({
      text: "Blof:",
      style: { fill: 0xaaaaaa, fontSize: 14 },
    });
    this.bluffLabel.x = -100;
    this.bluffLabel.y = 20;
    this.settingsContainer.addChild(this.bluffLabel);

    this.bluffToggle = new Button({
      text: "Acik",
      width: 140,
      height: 50,
      fontSize: 16,
    });
    this.bluffToggle.x = 50;
    this.bluffToggle.y = 20;
    this.bluffToggle.onPress.connect(() => this.toggleBluff());
    this.settingsContainer.addChild(this.bluffToggle);

    this.readyButton = new Button({
      text: "Hazirim",
      width: 200,
      height: 80,
    });
    this.readyButton.y = 110;
    this.readyButton.onPress.connect(() => this.handleReady());
    this.settingsContainer.addChild(this.readyButton);

    // Versiyon
    this.versionLabel = new Label({
      text: `client v${APP_VERSION}`,
      style: { fill: 0x555555, fontSize: 12 },
    });
    this.versionLabel.y = 230;
    this.panel.addChild(this.versionLabel);
  }

  public prepare() {}

  public resize(width: number, height: number) {
    const bg = this.getChildAt(0) as Graphics;
    bg.clear().rect(0, 0, width, height).fill({ color: 0x1e1e1e });

    this.panel.x = width * 0.5;
    this.panel.y = height * 0.5;
  }

  public async show() {
    this.alpha = 0;
    await gsap.to(this, { alpha: 1, duration: 0.4, ease: "power2.out" });
  }

  public async hide() {
    await gsap.to(this, { alpha: 0, duration: 0.3, ease: "none" });
  }

  public reset() {
    this.isHost = false;
    this.userButtonsContainer.visible = true;
    this.settingsContainer.visible = false;
    this.statusLabel.text = "Oyuncu sec";
    this.deckType = "single";
    this.bluffEnabled = true;
  }

  // --- Toggle handlers ---

  private toggleDeck() {
    this.deckType = this.deckType === "single" ? "double" : "single";
    this.deckToggle.updateText(
      this.deckType === "single" ? "Tek (52)" : "Cift (108)",
    );
  }

  private toggleBluff() {
    this.bluffEnabled = !this.bluffEnabled;
    this.bluffToggle.updateText(this.bluffEnabled ? "Acik" : "Kapali");
  }

  // --- Handlers ---

  private async handleLogin(username: string) {
    this.statusLabel.text = "Baglaniyor...";
    this.userButtonsContainer.visible = false;

    try {
      const res = await apiService.login(username);
      session.setAuth(res.token, res.playerId, res.nickname);
      session.setRoom(res.roomId);
      this.isHost = res.isHost;
      this.versionLabel.text = `client v${APP_VERSION} | server v${res.serverVersion}`;

      if (this.isHost) {
        this.statusLabel.text = `${res.nickname} — Ayarlari sec:`;
        this.settingsContainer.visible = true;
      } else {
        this.statusLabel.text = `${res.nickname} — Rakip bekleniyor...`;
        this.connectAndJoin(res.roomId);
      }
    } catch {
      this.statusLabel.text = "Baglanti hatasi!";
      this.userButtonsContainer.visible = true;
    }
  }

  private handleReady() {
    if (!session.token || !session.roomId) return;

    this.settingsContainer.visible = false;
    this.statusLabel.text = "Rakip bekleniyor...";

    const gameConfig: GameConfig = {
      deckType: this.deckType,
      bluffEnabled: this.bluffEnabled,
    };

    this.connectAndJoin(session.roomId, gameConfig);
  }

  private connectAndJoin(roomId: string, gameConfig?: GameConfig) {
    if (!session.token) return;

    socketService.connect(session.token);

    socketService.onConnect(() => {
      socketService.joinRoom(roomId, gameConfig);
    });

    socketService.onRoomState(() => {
      engine().navigation.showScreen(GameScreen);
    });

    socketService.onError((msg) => {
      this.statusLabel.text = `Socket hata: ${msg}`;
    });
  }
}
