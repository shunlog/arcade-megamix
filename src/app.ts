// Main application: cycle through the mini-games, switching ever faster.

import { GRAY, PixelFont, SCREEN_H, SCREEN_W, WHITE } from "./config.js";
import { GAME_ORDER, type MiniGame } from "./games/index.js";
import { AsteroidsGame } from "./games/asteroids.js";
import { Keys, type KeyCode } from "./keys.js";

/**
 * Tracks which mini-game is active and how long until the next switch.
 *
 * Rounds start at `start` seconds and shrink by `step` on every full loop
 * through all games, down to a `floor`.
 */
export class RoundManager {
  index = 0;
  loops = 0;
  remaining = 0;

  constructor(
    public readonly count: number,
    public readonly start = 10.0,
    public readonly step = 1.0,
    public readonly floor = 3.0,
  ) {
    this.remaining = this.duration;
  }

  get duration(): number {
    return Math.max(this.floor, this.start - this.loops * this.step);
  }

  /**
   * Advance time. Returns true when it is time to switch games.
   *
   * This does not move to the next game itself; the caller does that via
   * `advance` so a switch can only happen once per expiry.
   */
  tick(dt: number): boolean {
    this.remaining -= dt;
    return this.remaining <= 0;
  }

  /** Move to the next game. Returns true if a new loop began. */
  advance(): boolean {
    this.index += 1;
    let wrapped = false;
    if (this.index >= this.count) {
      this.index = 0;
      this.loops += 1;
      wrapped = true;
    }
    this.remaining = this.duration;
    return wrapped;
  }
}

export class App {
  readonly width: number;
  readonly height: number;
  readonly big: PixelFont;
  readonly small: PixelFont;
  games: MiniGame[];
  round: RoundManager;
  gameOver = false;

  constructor(width: number = SCREEN_W, height: number = SCREEN_H) {
    this.width = width;
    this.height = height;
    this.big = new PixelFont(3);
    this.small = new PixelFont(2);
    this.games = GAME_ORDER.map((cls) => new cls(width, height));
    this.round = new RoundManager(this.games.length);
  }

  get active(): MiniGame {
    return this.games[this.round.index];
  }

  get totalScore(): number {
    return this.games.reduce((sum, g) => sum + g.score, 0);
  }

  restart(): void {
    this.games = GAME_ORDER.map((cls) => new cls(this.width, this.height));
    this.round = new RoundManager(this.games.length);
    this.gameOver = false;
  }

  private doSwitch(): void {
    const wrapped = this.round.advance();
    // Every mini-game keeps its state; only Asteroids gets a fresh wave
    // on each new loop through the full rotation.
    if (wrapped) {
      for (const g of this.games) {
        if (g instanceof AsteroidsGame) g.addWave(2);
      }
    }
    // Drop held keys so a key held through the switch doesn't stick.
    for (const g of this.games) g.pressed.clear();
  }

  update(dt: number): void {
    if (this.gameOver) return;
    if (this.round.tick(dt)) this.doSwitch();
    if (!this.active.update(dt)) this.gameOver = true;
  }

  /** Returns false when the app should quit. */
  handleKeyDown(key: KeyCode): boolean {
    if (key === Keys.ESC) return false;
    if (this.gameOver && key === Keys.R) {
      this.restart();
      return true;
    }
    if (!this.gameOver) this.active.onKeyDown(key);
    return true;
  }

  handleKeyUp(key: KeyCode): void {
    if (!this.gameOver) this.active.onKeyUp(key);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.active.draw(ctx);

    // top-left: time until the next switch + current mini-game name
    const secs = Math.max(0, this.round.remaining);
    const timer = this.big.draw(ctx, secs.toFixed(1).padStart(4, "0"), WHITE, 16, 12);
    this.small.draw(ctx, this.active.name, GRAY, 18, 12 + timer.height + 6);

    // top-right: big pixel score
    const score = this.big.render(String(this.totalScore).padStart(6, "0"), WHITE);
    ctx.drawImage(score, this.width - score.width - 16, 12);

    if (this.gameOver) {
      this.drawCentered(ctx, this.big, "GAME OVER", WHITE, this.height / 2 - 60);
      this.drawCentered(ctx, this.small, `FINAL SCORE ${this.totalScore}`, GRAY, this.height / 2);
      this.drawCentered(ctx, this.small, "R = RESTART    ESC = MENU", GRAY, this.height / 2 + 40);
    }
  }

  private drawCentered(
    ctx: CanvasRenderingContext2D,
    font: PixelFont,
    text: string,
    color: readonly [number, number, number],
    y: number,
  ): void {
    const surface = font.render(text, color);
    ctx.drawImage(surface, Math.floor((this.width - surface.width) / 2), y);
  }
}
