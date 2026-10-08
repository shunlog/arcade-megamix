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

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
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
  static readonly BALL_SPAWN_INTERVAL = 5.0;

  readonly rng: Rng;

  playerY!: number;
  aiY!: number;
  balls!: Ball[];

  constructor(width: number, height: number, rng: Rng = defaultRng()) {
    super(width, height);
    this.rng = rng;
    this.reset();
  }

  reset(): void {
    this.playerY = this.height / 2 - PongGame.PADDLE_H / 2;
    this.aiY = this.height / 2 - PongGame.PADDLE_H / 2;
    this.score = 0;
    this.alive = true;
    this.balls = [];
    this.addBall();
  }

  addBall(direction?: number): void {
    const dir = direction ?? this.rng.choice([-1, 1]);
    this.balls.push(this.makeBall(dir));
  }

  private makeBall(direction: number): Ball {
    return {
      x: this.width / 2,
      y: this.height / 2,
      vx: PongGame.BALL_SPEED * direction,
      vy: PongGame.BALL_SPEED * this.rng.uniform(-0.5, 0.5),
    };
  }

  private serve(ball: Ball, direction: number): void {
    ball.x = this.width / 2;
    ball.y = this.height / 2;
    ball.vx = PongGame.BALL_SPEED * direction;
    ball.vy = PongGame.BALL_SPEED * this.rng.uniform(-0.5, 0.5);
  }

  get ballX(): number {
    return this.balls[0].x;
  }

  get ballY(): number {
    return this.balls[0].y;
  }

  get ballVx(): number {
    return this.balls[0].vx;
  }

  get ballVy(): number {
    return this.balls[0].vy;
  }

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

    const target = this.nearestBall();
    const targetY = target === null ? this.height / 2 : target.y;
    const diff = targetY - PongGame.PADDLE_H / 2 - this.aiY;
    const step = clamp(diff, -PongGame.AI_SPEED * speed * dt, PongGame.AI_SPEED * speed * dt);
    this.aiY = clamp(this.aiY + step, 0, this.height - PongGame.PADDLE_H);

    this.balls = this.balls.filter((ball) => this.updateBall(ball, speed, dt));

    if (this.balls.length === 0) this.alive = false;
    return this.alive;
  }

  private updateBall(ball: Ball, speed: number, dt: number): boolean {
    ball.x += ball.vx * speed * dt;
    ball.y += ball.vy * speed * dt;

    if (ball.y <= 0 || ball.y + PongGame.BALL_SIZE >= this.height) {
      ball.vy *= -1;
      ball.y = clamp(ball.y, 0, this.height - PongGame.BALL_SIZE);
      this.sfx("wall");
    }

    this.collidePaddles(ball);

    if (ball.x + PongGame.BALL_SIZE < 0) return false;
    if (ball.x > this.width) {
      this.addScore(SCORE_PONG_GOAL);
      this.sfx("goal");
      this.serve(ball, -1);
    }
    return true;
  }

  private nearestBall(): Ball | null {
    let best: Ball | null = null;
    for (const ball of this.balls) {
      if (best === null || ball.x > best.x) best = ball;
    }
    return best;
  }

  private collidePaddles(ball: Ball): void {
    const rect: Rect = { x: ball.x, y: ball.y, w: PongGame.BALL_SIZE, h: PongGame.BALL_SIZE };
    const player: Rect = { x: 20, y: this.playerY, w: PongGame.PADDLE_W, h: PongGame.PADDLE_H };
    const ai: Rect = {
      x: this.width - 20 - PongGame.PADDLE_W,
      y: this.aiY,
      w: PongGame.PADDLE_W,
      h: PongGame.PADDLE_H,
    };

    if (ball.vx < 0 && collides(rect, player)) {
      ball.x = player.x + player.w;
      this.bounce(ball, (ball.y - this.playerY) / PongGame.PADDLE_H - 0.5);
      this.addScore(SCORE_PONG_HIT);
      this.sfx("paddle");
    } else if (ball.vx > 0 && collides(rect, ai)) {
      ball.x = ai.x - PongGame.BALL_SIZE;
      this.bounce(ball, (ball.y - this.aiY) / PongGame.PADDLE_H - 0.5);
      this.sfx("paddleCpu");
    }
  }

  private bounce(ball: Ball, offset: number): void {
    ball.vx *= -1;
    ball.vy = offset * PongGame.BALL_SPEED * 1.4;
    if (Math.abs(ball.vy) < 40) {
      ball.vy = ball.vy >= 0 ? 40 : -40;
    }
  }

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
    for (const ball of this.balls) {
      fillRect(ctx, PONG_WHITE, ball.x, ball.y, PongGame.BALL_SIZE, PongGame.BALL_SIZE);
    }
  }
}
