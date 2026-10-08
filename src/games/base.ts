import type { KeyCode } from "../keys.js";
import type { Sfx } from "../sound.js";

export abstract class MiniGame {
  name = "game";
  readonly width: number;
  readonly height: number;
  score = 0;
  alive = true;
  readonly pressed = new Set<KeyCode>();
  readonly sounds: Sfx[] = [];
  speedMultiplier = 1.0;
  scoreMultiplier = 1.0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  onKeyDown(key: KeyCode): void {
    this.pressed.add(key);
  }

  onKeyUp(key: KeyCode): void {
    this.pressed.delete(key);
  }

  abstract reset(): void;

  abstract update(dt: number): boolean;

  abstract draw(ctx: CanvasRenderingContext2D): void;

  protected sfx(name: Sfx): void {
    this.sounds.push(name);
  }

  addScore(amount: number): void {
    this.score += Math.ceil(amount * this.scoreMultiplier);
  }
}
