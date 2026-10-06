// Run a single mini-game on its own, for testing and development.

import { GRAY, PixelFont, SCREEN_H, SCREEN_W, WHITE } from "./config.js";
import type { MiniGame } from "./games/index.js";
import { drawOverlay } from "./draw.js";
import { Keys, type KeyCode } from "./keys.js";

export type StandaloneCtor = new (width: number, height: number) => MiniGame;

export class StandaloneRunner {
  readonly width: number;
  readonly height: number;
  readonly big = new PixelFont(3);
  readonly small = new PixelFont(2);
  readonly game: MiniGame;

  constructor(gameCls: StandaloneCtor, width = SCREEN_W, height = SCREEN_H) {
    this.width = width;
    this.height = height;
    this.game = new gameCls(width, height);
  }

  /** Returns false when the runner should quit. */
  handleKeyDown(key: KeyCode): boolean {
    if (key === Keys.ESC) return false;
    if (key === Keys.R && !this.game.alive) {
      this.game.reset();
      return true;
    }
    this.game.onKeyDown(key);
    return true;
  }

  handleKeyUp(key: KeyCode): void {
    this.game.onKeyUp(key);
  }

  update(dt: number): void {
    if (this.game.alive) this.game.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = `rgb(8,8,16)`;
    ctx.fillRect(0, 0, this.width, this.height);
    this.game.draw(ctx);

    const name = this.small.draw(ctx, this.game.name, GRAY, 16, 16);
    void name;
    const score = this.big.render(String(this.game.score).padStart(6, "0"), WHITE);
    ctx.drawImage(score, this.width - score.width - 16, 12);

    if (!this.game.alive) {
      drawOverlay(ctx, this.width, this.height, this.big, this.small, "GAME OVER", [
        { text: `FINAL SCORE ${this.game.score}`, color: GRAY },
        { text: "R = RESTART    Q = MENU", color: GRAY },
      ]);
    }
    ctx.restore();
  }
}

export function runStandalone(gameCls: StandaloneCtor): StandaloneRunner {
  return new StandaloneRunner(gameCls);
}
