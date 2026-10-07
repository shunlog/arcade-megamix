// Mini-game: Pong.
//
// The player is the left paddle. Each paddle hit is worth a point; scoring past
// the CPU is worth a bundle. If the CPU scores, the player dies.

import {
  BLACK,
  GRAY,
  PONG_ACCENT,
  PONG_WHITE,
  SCORE_PONG_GOAL,
  SCORE_PONG_HIT,
} from "../config.js";
import { clamp, fillRect } from "../draw.js";
import { Keys } from "../keys.js";
import { defaultRng, type Rng } from "../rng.js";
import { MiniGame } from "./base.js";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function collides(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class PongGame extends MiniGame {
  name = "PONG";

  static readonly PADDLE_W = 12;
  static readonly PADDLE_H = 80;
  static readonly PADDLE_SPEED = 420.0;
  static readonly BALL_SIZE = 12;
  static readonly BALL_SPEED = 360.0;
  static readonly AI_SPEED = 300.0;

  readonly rng: Rng;

  playerY!: number;
  aiY!: number;
  ballX!: number;
  ballY!: number;
  ballVx!: number;
  ballVy!: number;

  constructor(width: number, height: number, rng: Rng = defaultRng()) {
    super(width, height);
    this.rng = rng;
    this.reset();
  }

  // -- lifecycle -----------------------------------------------------------
  reset(): void {
    this.playerY = this.height / 2 - PongGame.PADDLE_H / 2;
    this.aiY = this.height / 2 - PongGame.PADDLE_H / 2;
    this.score = 0;
    this.alive = true;
    this.serve(this.rng.choice([-1, 1]));
  }

  private serve(direction: number): void {
    this.ballX = this.width / 2;
    this.ballY = this.height / 2;
    const angle = this.rng.uniform(-0.5, 0.5);
    this.ballVx = PongGame.BALL_SPEED * direction;
    this.ballVy = PongGame.BALL_SPEED * angle;
  }

  // -- simulation ----------------------------------------------------------
  override update(dt: number): boolean {
    if (!this.alive) return false;

    const speed = this.speedMultiplier;

    if (this.pressed.has(Keys.UP) || this.pressed.has(Keys.W)) {
      this.playerY -= PongGame.PADDLE_SPEED * speed * dt;
    }
    if (this.pressed.has(Keys.DOWN) || this.pressed.has(Keys.S)) {
      this.playerY += PongGame.PADDLE_SPEED * speed * dt;
    }
    this.playerY = clamp(this.playerY, 0, this.height - PongGame.PADDLE_H);

    // Simple tracking AI with a capped speed.
    const target = this.ballY - PongGame.PADDLE_H / 2;
    const diff = target - this.aiY;
    const step = clamp(diff, -PongGame.AI_SPEED * speed * dt, PongGame.AI_SPEED * speed * dt);
    this.aiY = clamp(this.aiY + step, 0, this.height - PongGame.PADDLE_H);

    this.ballX += this.ballVx * speed * dt;
    this.ballY += this.ballVy * speed * dt;

    if (this.ballY <= 0 || this.ballY + PongGame.BALL_SIZE >= this.height) {
      this.ballVy *= -1;
      this.ballY = clamp(this.ballY, 0, this.height - PongGame.BALL_SIZE);
    }

    this.collidePaddles();

    if (this.ballX + PongGame.BALL_SIZE < 0) {
      this.alive = false;
    } else if (this.ballX > this.width) {
      this.addScore(SCORE_PONG_GOAL);
      this.serve(-1);
    }
    return this.alive;
  }

  private collidePaddles(): void {
    const ball: Rect = { x: this.ballX, y: this.ballY, w: PongGame.BALL_SIZE, h: PongGame.BALL_SIZE };
    const player: Rect = { x: 20, y: this.playerY, w: PongGame.PADDLE_W, h: PongGame.PADDLE_H };
    const ai: Rect = {
      x: this.width - 20 - PongGame.PADDLE_W,
      y: this.aiY,
      w: PongGame.PADDLE_W,
      h: PongGame.PADDLE_H,
    };

    if (this.ballVx < 0 && collides(ball, player)) {
      this.ballX = player.x + player.w;
      this.bounce((this.ballY - this.playerY) / PongGame.PADDLE_H - 0.5);
      this.addScore(SCORE_PONG_HIT);
    } else if (this.ballVx > 0 && collides(ball, ai)) {
      this.ballX = ai.x - PongGame.BALL_SIZE;
      this.bounce((this.ballY - this.aiY) / PongGame.PADDLE_H - 0.5);
    }
  }

  private bounce(offset: number): void {
    this.ballVx *= -1;
    this.ballVy = offset * PongGame.BALL_SPEED * 1.4;
    if (Math.abs(this.ballVy) < 40) {
      this.ballVy = this.ballVy >= 0 ? 40 : -40;
    }
  }

  // -- rendering -----------------------------------------------------------
  override draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgb(${BLACK[0]},${BLACK[1]},${BLACK[2]})`;
    ctx.fillRect(0, 0, this.width, this.height);
    for (let y = 0; y < this.height; y += 24) {
      fillRect(ctx, GRAY, this.width / 2 - 2, y, 4, 12);
    }

    fillRect(ctx, PONG_ACCENT, 20, this.playerY, PongGame.PADDLE_W, PongGame.PADDLE_H);
    fillRect(
      ctx,
      PONG_WHITE,
      this.width - 20 - PongGame.PADDLE_W,
      this.aiY,
      PongGame.PADDLE_W,
      PongGame.PADDLE_H,
    );
    fillRect(ctx, PONG_WHITE, this.ballX, this.ballY, PongGame.BALL_SIZE, PongGame.BALL_SIZE);
  }
}
