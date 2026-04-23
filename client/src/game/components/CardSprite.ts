import gsap from "gsap";
import { Container, PerspectiveMesh, Texture } from "pixi.js";

import type { ICard } from "../../shared/types";
import { cardToFrame, CARD_BACK_FRAME } from "../utils/cardMapping";

const CARD_W = 167;
const CARD_H = 214;
const MESH_DETAIL = 10;

/**
 * CardSprite — PerspectiveMesh tabanli kart komponenti.
 *
 * Kart cevirme (flip), dagitim, oynama animasyonlari icin
 * GSAP + PerspectiveMesh corners kullanir.
 */
export class CardSprite extends Container {
  public card: ICard | null = null;

  private frontTexture: Texture;
  private backTexture: Texture;
  private mesh: PerspectiveMesh;
  private _faceUp: boolean;
  private _flipTweens: gsap.core.Tween[] = [];
  private _flipGen = 0;

  constructor(card?: ICard, faceUp = true) {
    super();

    this.frontTexture = card ? Texture.from(cardToFrame(card)) : Texture.EMPTY;
    this.backTexture = Texture.from(CARD_BACK_FRAME);
    this._faceUp = faceUp;
    this.card = card ?? null;

    this.mesh = new PerspectiveMesh({
      texture: faceUp ? this.frontTexture : this.backTexture,
      verticesX: MESH_DETAIL,
      verticesY: MESH_DETAIL,
      x0: 0,
      y0: 0,
      x1: CARD_W,
      y1: 0,
      x2: CARD_W,
      y2: CARD_H,
      x3: 0,
      y3: CARD_H,
    });

    this.mesh.pivot.set(CARD_W / 2, CARD_H / 2);
    this.addChild(this.mesh);
  }

  get faceUp(): boolean {
    return this._faceUp;
  }

  get cardWidth(): number {
    return CARD_W;
  }

  get cardHeight(): number {
    return CARD_H;
  }

  /** Kart verisini degistir */
  setCard(card: ICard): void {
    if (this.destroyed) return;
    this.card = card;
    this.frontTexture = Texture.from(cardToFrame(card));
    if (this._faceUp) {
      this.mesh.texture = this.frontTexture;
    }
  }

  /** Karti aninda ac/kapat (animasyonsuz) */
  setFaceUp(faceUp: boolean): void {
    this._faceUp = faceUp;
    this.mesh.texture = faceUp ? this.frontTexture : this.backTexture;
    this.resetCorners();
  }

  /** PerspectiveMesh flip animasyonu — 3D cevirme efekti. durationSec = toplam sure (iki faz birlikte) */
  async flip(toFaceUp?: boolean, durationSec?: number): Promise<void> {
    if (this.destroyed) return;
    const target = toFaceUp ?? !this._faceUp;
    if (target === this._faceUp) return;

    // Cancel any ongoing flip
    this.killFlipTweens();
    const gen = ++this._flipGen;

    const totalDur = durationSec ?? 0.5;
    const dur = totalDur / 2;
    const squeeze = 0.15;
    const hw = CARD_W / 2;

    // Faz 1: Karti ortaya dogru kapat (squeeze)
    await new Promise<void>((resolve) => {
      const progress = { t: 0 };
      const tw = gsap.to(progress, {
        t: 1,
        duration: dur,
        ease: "power2.in",
        onUpdate: () => {
          const s = progress.t;
          const leftX = hw * s;
          const rightX = CARD_W - hw * s;
          const yOff = CARD_H * squeeze * s;
          this.mesh.setCorners(
            leftX,
            yOff,
            rightX,
            0,
            rightX,
            CARD_H,
            leftX,
            CARD_H - yOff,
          );
        },
        onComplete: resolve,
        onInterrupt: resolve,
      });
      this._flipTweens.push(tw);
    });

    if (gen !== this._flipGen) return;

    // Texture degistir
    this._faceUp = target;
    this.mesh.texture = target ? this.frontTexture : this.backTexture;

    // Faz 2: Karti tekrar ac (unsqueeze — tersten)
    await new Promise<void>((resolve) => {
      const progress = { t: 1 };
      const tw = gsap.to(progress, {
        t: 0,
        duration: dur,
        ease: "power2.out",
        onUpdate: () => {
          const s = progress.t;
          const leftX = hw * s;
          const rightX = CARD_W - hw * s;
          const yOff = CARD_H * squeeze * s;
          this.mesh.setCorners(
            leftX,
            yOff,
            rightX,
            0,
            rightX,
            CARD_H,
            leftX,
            CARD_H - yOff,
          );
        },
        onComplete: resolve,
        onInterrupt: resolve,
      });
      this._flipTweens.push(tw);
    });

    if (gen !== this._flipGen) return;

    this._flipTweens = [];
    this.resetCorners();
  }

  private killFlipTweens(): void {
    for (const tw of this._flipTweens) tw.kill();
    this._flipTweens = [];
  }

  override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    this.killFlipTweens();
    super.destroy(
      typeof options === "object"
        ? { ...options, children: true }
        : { children: true },
    );
  }

  /** Corner'lari sifirla */
  private resetCorners(): void {
    this.mesh.setCorners(0, 0, CARD_W, 0, CARD_W, CARD_H, 0, CARD_H);
  }
}
