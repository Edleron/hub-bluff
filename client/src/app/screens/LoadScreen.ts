import { CircularProgressBar } from "@pixi/ui";
import gsap from "gsap";
import { Container, Sprite, Texture } from "pixi.js";

/** Screen shown while loading assets */
export class LoadScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["preload"];
  /** The PixiJS logo */
  private pixiLogo: Sprite;
  /** Progress Bar */
  private progressBar: CircularProgressBar;
  /** Current progress tween for smooth animation */
  private progressTween?: gsap.core.Tween;

  constructor() {
    super();

    this.progressBar = new CircularProgressBar({
      backgroundColor: "#3d3d3d",
      fillColor: "#e72264",
      radius: 100,
      lineWidth: 15,
      value: 0,
      backgroundAlpha: 0.5,
      fillAlpha: 0.8,
      cap: "round",
    });

    this.progressBar.x += this.progressBar.width / 2;
    this.progressBar.y += -this.progressBar.height / 2;

    this.addChild(this.progressBar);

    this.pixiLogo = new Sprite({
      texture: Texture.from("logo.png"),
      anchor: 0.5,
      scale: 1,
    });
    this.addChild(this.pixiLogo);
  }

  public onLoad(progress: number) {
    this.progressTween?.kill();
    this.progressTween = gsap.to(this.progressBar, {
      progress,
      duration: 0.8,
      ease: "power2.out",
    });
  }

  /** Resize the screen, fired whenever window size changes  */
  public resize(width: number, height: number) {
    this.pixiLogo.position.set(width * 0.5, height * 0.5);
    this.progressBar.position.set(width * 0.5, height * 0.5);
  }

  /** Show screen with animations */
  public async show() {
    this.alpha = 1;
  }

  /** Hide screen with animations */
  public async hide() {
    if (this.progressTween) {
      await this.progressTween;
    }
    await gsap.to(this, { alpha: 0, duration: 0.3, ease: "none", delay: 0.3 });
  }
}
