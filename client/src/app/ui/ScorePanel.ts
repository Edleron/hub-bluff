import { Container, Graphics, NineSliceSprite, Sprite, Texture } from "pixi.js";
import { ScrollBox } from "@pixi/ui";

import { CardSprite } from "../../game/components/CardSprite";
import type { ICard } from "../../shared/types";
import type { ScoreUpdateData } from "../../game/services/SocketService";

import { Label } from "./Label";

const TAB_COLORS = {
  pisti: 0xec1561,
  capture: 0x00cc66,
  flush: 0xffd700,
};

type TabKey = "pisti" | "capture" | "flush";

/**
 * Puan detay paneli — kupa ikonuna tiklaninca acilir.
 * 3 tab: Pisti | Kart Kazanma | Flush/Blof
 * Her tab'da kazanilan kartlar gosterilir.
 */
export class ScorePanel extends Container {
  private overlay: Graphics;
  private panel: Container;
  private contentArea: ScrollBox;
  private tabs: { key: TabKey; btn: Container }[] = [];
  private events: ScoreUpdateData[];
  private panelW: number;
  private panelH: number;
  private scrollTrack: Graphics;
  private scrollThumb: Graphics;
  private scrollH: number;

  constructor(
    screenW: number,
    screenH: number,
    scoreEvents: ScoreUpdateData[],
    onClose: () => void,
  ) {
    super();
    this.events = scoreEvents;
    this.panelW = Math.min(screenW - 40, 520);
    this.panelH = Math.min(screenH - 60, 480);

    // Overlay
    this.overlay = new Graphics();
    this.overlay
      .rect(0, 0, screenW, screenH)
      .fill({ color: 0x000000, alpha: 0.8 });
    this.overlay.eventMode = "static";
    this.overlay.on("pointertap", onClose);
    this.addChild(this.overlay);

    // Panel container
    this.panel = new Container();
    this.panel.x = screenW / 2;
    this.panel.y = screenH / 2;
    this.addChild(this.panel);

    // Panel background
    const bg = new NineSliceSprite({
      texture: Texture.from("rounded-rectangle.png"),
      leftWidth: 34,
      topHeight: 34,
      rightWidth: 34,
      bottomHeight: 34,
      width: this.panelW,
      height: this.panelH,
      tint: 0x1a1a2e,
    });
    bg.x = -this.panelW / 2;
    bg.y = -this.panelH / 2;
    this.panel.addChild(bg);

    // Shadow
    const shadow = new NineSliceSprite({
      texture: Texture.from("rounded-rectangle.png"),
      leftWidth: 34,
      topHeight: 34,
      rightWidth: 34,
      bottomHeight: 34,
      width: this.panelW,
      height: this.panelH,
      tint: 0x000000,
      alpha: 0.3,
    });
    shadow.x = -this.panelW / 2 + 4;
    shadow.y = -this.panelH / 2 + 8;
    this.panel.addChildAt(shadow, 0);

    // Cup icon (seffaf, ortali) + title
    const cup = Sprite.from("cup.png");
    cup.anchor.set(0.5);
    cup.scale.set(0.35);
    cup.alpha = 0.15;
    cup.x = 0;
    cup.y = 0;
    this.panel.addChild(cup);

    const title = new Label({
      text: "PUANLAR",
      style: { fill: 0xffffff, fontSize: 22, fontWeight: "bold" },
    });
    title.x = 0;
    title.y = -this.panelH / 2 + 35;
    this.panel.addChild(title);

    // Close button
    const closeBtn = Sprite.from("cancel.png");
    closeBtn.anchor.set(0.5);
    closeBtn.scale.set(0.3);
    closeBtn.x = this.panelW / 2 - 30;
    closeBtn.y = -this.panelH / 2 + 30;
    closeBtn.eventMode = "static";
    closeBtn.cursor = "pointer";
    closeBtn.on("pointertap", (e) => {
      e.stopPropagation();
      onClose();
    });
    this.panel.addChild(closeBtn);

    // Tab bar
    this.buildTabs();

    // Scrollable content area
    const scrollH = this.panelH - 130;
    this.contentArea = new ScrollBox({
      width: this.panelW - 20,
      height: scrollH,
      type: "vertical",
      globalScroll: false,
    });
    this.contentArea.x = -this.panelW / 2 + 10;
    this.contentArea.y = -this.panelH / 2 + 115;
    this.panel.addChild(this.contentArea);

    // Scroll track (sag kenar)
    this.scrollTrack = new Graphics();
    this.scrollTrack.roundRect(0, 0, 4, scrollH, 2);
    this.scrollTrack.fill({ color: 0x333344 });
    this.scrollTrack.x = this.panelW / 2 - 10;
    this.scrollTrack.y = -this.panelH / 2 + 115;
    this.panel.addChild(this.scrollTrack);

    this.scrollThumb = new Graphics();
    this.scrollThumb.x = this.panelW / 2 - 10;
    this.scrollThumb.y = -this.panelH / 2 + 115;
    this.panel.addChild(this.scrollThumb);

    this.scrollH = scrollH;

    this.showTab("pisti");
  }

  private buildTabs() {
    const tabDefs: { key: TabKey; label: string; color: number }[] = [
      { key: "pisti", label: "Pisti", color: TAB_COLORS.pisti },
      { key: "capture", label: "Kartlar", color: TAB_COLORS.capture },
      { key: "flush", label: "Flush/Blof", color: TAB_COLORS.flush },
    ];

    const tabW = (this.panelW - 40) / 3;
    const tabY = -this.panelH / 2 + 70;
    const startX = -this.panelW / 2 + 20;

    for (let i = 0; i < tabDefs.length; i++) {
      const def = tabDefs[i];
      const btn = new Container();
      btn.x = startX + i * tabW + tabW / 2;
      btn.y = tabY;
      btn.eventMode = "static";
      btn.cursor = "pointer";

      const tabBg = new Graphics();
      tabBg.roundRect(-tabW / 2 + 4, -16, tabW - 8, 32, 8);
      tabBg.fill({ color: def.color, alpha: 0.3 });
      btn.addChild(tabBg);

      const count = this.getEventsForTab(def.key).length;
      const label = new Label({
        text: `${def.label} (${count})`,
        style: { fill: 0xffffff, fontSize: 13 },
      });
      btn.addChild(label);

      btn.on("pointertap", (e) => {
        e.stopPropagation();
        this.showTab(def.key);
      });

      this.panel.addChild(btn);
      this.tabs.push({ key: def.key, btn });
    }
  }

  private getEventsForTab(tab: TabKey): ScoreUpdateData[] {
    return this.events.filter((e) => {
      if (tab === "pisti") return e.category === "pisti";
      if (tab === "capture") return e.category === "capture";
      return e.category === "flush" || e.category === "bluff";
    });
  }

  private showTab(tab: TabKey) {
    // Update tab visual
    for (const t of this.tabs) {
      const bg = t.btn.getChildAt(0) as Graphics;
      const color = TAB_COLORS[t.key];
      bg.clear();
      const tabW = (this.panelW - 40) / 3;
      bg.roundRect(-tabW / 2 + 4, -16, tabW - 8, 32, 8);
      if (t.key === tab) {
        bg.fill({ color, alpha: 0.8 });
      } else {
        bg.fill({ color, alpha: 0.2 });
      }
    }

    // Rebuild content
    this.contentArea.removeItems();

    const events = this.getEventsForTab(tab);
    const areaW = this.panelW - 40;
    const wrap = new Container();

    if (events.length === 0) {
      const empty = new Label({
        text: "Henuz kazanim yok",
        style: { fill: 0x666666, fontSize: 16 },
      });
      empty.anchor.set(0.5, 0);
      empty.x = areaW / 2;
      empty.y = 40;
      wrap.addChild(empty);
      this.contentArea.addItem(wrap);
      return;
    }

    // Total for this tab
    const totalPts = events.reduce((s, e) => s + e.total, 0);
    const totalLabel = new Label({
      text: `Toplam: +${totalPts}`,
      style: { fill: TAB_COLORS[tab], fontSize: 18, fontWeight: "bold" },
    });
    totalLabel.anchor.set(0.5, 0);
    totalLabel.x = areaW / 2;
    totalLabel.y = 5;
    wrap.addChild(totalLabel);

    // Events with cards
    let y = 35;
    const cardScale = 0.32;
    const cardH = 214 * cardScale;
    const cardW = 167 * cardScale;
    const gap = 6;
    const maxCards = Math.floor(areaW / (cardW + gap));

    for (const evt of events) {
      const headerBg = new Graphics();
      headerBg.roundRect(0, y, areaW, 22, 4);
      headerBg.fill({ color: 0xffffff, alpha: 0.05 });
      wrap.addChild(headerBg);

      const headerLabel = new Label({
        text: evt.label,
        style: { fill: 0xaaaaaa, fontSize: 11 },
      });
      headerLabel.anchor.set(0, 0.5);
      headerLabel.x = 8;
      headerLabel.y = y + 11;
      wrap.addChild(headerLabel);

      const ptsLabel = new Label({
        text: `+${evt.total}`,
        style: {
          fill: TAB_COLORS[tab],
          fontSize: 13,
          fontWeight: "bold",
        },
      });
      ptsLabel.anchor.set(1, 0.5);
      ptsLabel.x = areaW - 8;
      ptsLabel.y = y + 11;
      wrap.addChild(ptsLabel);

      y += 28;

      const showCards =
        tab === "capture"
          ? evt.cards.filter((c) => this.isValuableCard(c))
          : evt.cards;

      if (showCards.length > 0) {
        const rowCards = showCards.slice(0, maxCards);
        const rowW = rowCards.length * (cardW + gap) - gap;
        let cx = areaW / 2 - rowW / 2 + cardW / 2;

        for (const cardData of rowCards) {
          const card: ICard = {
            suit: cardData.suit as ICard["suit"],
            rank: cardData.rank as ICard["rank"],
            id: cardData.id,
          };
          const sprite = new CardSprite(card);
          sprite.setFaceUp(true);
          sprite.scale.set(cardScale);
          sprite.x = cx;
          sprite.y = y + cardH / 2;
          wrap.addChild(sprite);

          const pts = this.getCardPts(cardData);
          if (pts > 0) {
            const badgeBg = new Graphics();
            badgeBg.circle(cx, y + cardH + 10, 12);
            badgeBg.fill({ color: TAB_COLORS[tab], alpha: 0.9 });
            wrap.addChild(badgeBg);

            const badge = new Label({
              text: `+${pts}`,
              style: { fill: 0xffffff, fontSize: 10, fontWeight: "bold" },
            });
            badge.x = cx;
            badge.y = y + cardH + 10;
            wrap.addChild(badge);
          }

          cx += cardW + gap;
        }
        y += cardH + 30;
      } else {
        y += 4;
      }
    }

    this.contentArea.addItem(wrap);
    this.updateScrollThumb();
  }

  private updateScrollThumb() {
    this.scrollThumb.clear();
    const contentH = this.contentArea.scrollHeight;
    if (contentH <= this.scrollH) return;
    const ratio = this.scrollH / contentH;
    const thumbH = Math.max(ratio * this.scrollH, 20);
    this.scrollThumb.roundRect(0, 0, 4, thumbH, 2);
    this.scrollThumb.fill({ color: 0xec1561, alpha: 0.8 });

    // Scroll pozisyonuna gore thumb'i kaydir
    this.contentArea.onScroll.connect((pos) => {
      const p = typeof pos === "number" ? pos : pos.y;
      const scrollRange = contentH - this.scrollH;
      const thumbRange = this.scrollH - thumbH;
      const progress = Math.abs(p) / scrollRange;
      this.scrollThumb.y = -this.panelH / 2 + 115 + progress * thumbRange;
    });
  }

  private isValuableCard(c: { suit: string; rank: string }): boolean {
    if (c.suit === "C" && c.rank === "2") return true;
    if (c.suit === "D" && c.rank === "10") return true;
    return false;
  }

  private getCardPts(c: { suit: string; rank: string }): number {
    if (c.suit === "C" && c.rank === "2") return 2;
    if (c.suit === "D" && c.rank === "10") return 3;
    return 0;
  }
}
