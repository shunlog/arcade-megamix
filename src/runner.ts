import { GRAY, PixelFont, SCREEN_H, SCREEN_W } from "./config.js";
import type { MiniGame, MiniGameCtor } from "./games/index.js";
import { PongGame } from "./games/pong.js";
import { drawScore, HUD_MARGIN, type GameSession } from "./session.js";
import type { KeyCode } from "./keys.js";
import type { Sfx } from "./sound.js";

export class StandaloneRunner implements GameSession {
  onTick: ((tick: number) => void) | null = null;

  readonly width: number;
  readonly height: number;
  readonly big = new PixelFont(3);
  readonly small = new PixelFont(2);
  readonly game: MiniGame;
  private ballTimer = PongGame.BALL_SPAWN_INTERVAL;

  constructor(gameCls: MiniGameCtor, width = SCREEN_W, height = SCREEN_H) {
    this.width = width;
    this.height = height;
    this.game = new gameCls(width, height);
  }

  get gameOver(): boolean {
    return !this.game.alive;
  }

  get name(): string {
    return this.game.name;
  }

  get score(): number {
    return this.game.score;
  }

  drainSounds(): Sfx[] {
    const sounds = this.game.sounds.slice();
    this.game.sounds.length = 0;
    return sounds;
  }

  handleKeyDown(key: KeyCode): void {
    this.game.onKeyDown(key);
  }

  handleKeyUp(key: KeyCode): void {
    this.game.onKeyUp(key);
  }

  restart(): void {
    this.game.reset();
    this.ballTimer = PongGame.BALL_SPAWN_INTERVAL;
  }

  update(dt: number): void {
    if (!this.game.alive) return;
    this.game.update(dt);

    if (this.game instanceof PongGame && this.game.alive) {
      this.ballTimer -= dt;
      while (this.ballTimer <= 0) {
        this.ballTimer += PongGame.BALL_SPAWN_INTERVAL;
        this.game.addBall();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.game.draw(ctx);
    this.small.draw(ctx, this.game.name, GRAY, HUD_MARGIN, HUD_MARGIN);
    drawScore(ctx, this.width, this.big, this.small, this.game.score);
  }
}
