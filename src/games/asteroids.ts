import {
  ASTEROID_GRAY,
  BULLET_YELLOW,
  SCORE_ASTEROID_BIG,
  SCORE_ASTEROID_SMALL,
  SHIP_WHITE,
} from "../config.js";
import { fillCircle, mod, strokeCircle, strokePolygon } from "../draw.js";
import { Keys, type KeyCode } from "../keys.js";
import { defaultRng, type Rng } from "../rng.js";
import { MiniGame } from "./base.js";

export interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export function isBig(a: Asteroid): boolean {
  return a.radius >= AsteroidsGame.BIG_RADIUS;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class AsteroidsGame extends MiniGame {
  name = "ASTEROIDS";

  static readonly ROT_SPEED = 4.0;
  static readonly THRUST = 260.0;
  static readonly FRICTION = 0.4;
  static readonly MAX_BULLETS = 8;
  static readonly FIRE_COOLDOWN = 0.18;
  static readonly BIG_RADIUS = 20;
  static readonly SHIP_SIZE = 14;
  static readonly SHIP_COLLISION_RADIUS = 6;
  static readonly BULLET_SPEED = 480.0;
  static readonly BULLET_LIFE = 1.2;
  static readonly BULLET_RADIUS = 3;
  static readonly STROKE_WIDTH = 2;
  static readonly START_WAVE = 3;
  static readonly WAVE_ON_LOOP = 2;
  static readonly ASTEROID_SPEED_MIN = 40;
  static readonly ASTEROID_SPEED_MAX = 90;
  static readonly ASTEROID_RADIUS_MIN = 18;
  static readonly ASTEROID_RADIUS_MAX = 30;
  static readonly SPLIT_ANGLE = 0.7;
  static readonly SPLIT_SPEED_FACTOR = 1.2;
  static readonly SPLIT_RADIUS_FACTOR = 0.55;

  readonly rng: Rng;

  shipX!: number;
  shipY!: number;
  shipVx!: number;
  shipVy!: number;
  angle!: number;
  fireTimer!: number;
  fireQueued!: boolean;
  bullets!: Bullet[];
  asteroids!: Asteroid[];

  constructor(width: number, height: number, rng: Rng = defaultRng()) {
    super(width, height);
    this.rng = rng;
    this.reset();
  }

  reset(): void {
    this.shipX = this.width / 2;
    this.shipY = this.height / 2;
    this.shipVx = 0;
    this.shipVy = 0;
    this.angle = -Math.PI / 2;
    this.fireTimer = 0;
    this.fireQueued = false;
    this.bullets = [];
    this.asteroids = [];
    this.score = 0;
    this.alive = true;
    this.addWave(AsteroidsGame.START_WAVE);
  }

  addWave(count = AsteroidsGame.WAVE_ON_LOOP): void {
    for (let i = 0; i < count; i++) {
      const edge = this.rng.choice(["top", "bottom", "left", "right"] as const);
      let x: number;
      let y: number;
      if (edge === "top") {
        x = this.rng.uniform(0, this.width);
        y = 0;
      } else if (edge === "bottom") {
        x = this.rng.uniform(0, this.width);
        y = this.height;
      } else if (edge === "left") {
        x = 0;
        y = this.rng.uniform(0, this.height);
      } else {
        x = this.width;
        y = this.rng.uniform(0, this.height);
      }
      const speed = this.rng.uniform(AsteroidsGame.ASTEROID_SPEED_MIN, AsteroidsGame.ASTEROID_SPEED_MAX);
      const heading = this.rng.uniform(0, Math.PI * 2);
      this.asteroids.push({
        x,
        y,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        radius: this.rng.uniform(AsteroidsGame.ASTEROID_RADIUS_MIN, AsteroidsGame.ASTEROID_RADIUS_MAX),
      });
    }
  }

  override onKeyDown(key: KeyCode): void {
    super.onKeyDown(key);
    if (key === Keys.SPACE) this.fireQueued = true;
  }

  override update(dt: number): boolean {
    if (!this.alive) return false;

    const speed = this.speedMultiplier;

    if (this.pressed.has(Keys.LEFT) || this.pressed.has(Keys.A)) {
      this.angle -= AsteroidsGame.ROT_SPEED * speed * dt;
    }
    if (this.pressed.has(Keys.RIGHT) || this.pressed.has(Keys.D)) {
      this.angle += AsteroidsGame.ROT_SPEED * speed * dt;
    }

    if (this.pressed.has(Keys.UP) || this.pressed.has(Keys.W)) {
      this.shipVx += Math.cos(this.angle) * AsteroidsGame.THRUST * dt;
      this.shipVy += Math.sin(this.angle) * AsteroidsGame.THRUST * dt;
    }

    // Velocities stay in base units; the global multiplier is applied when
    // they are integrated into position, so every moving thing scales at once
    // and a level change takes effect immediately.

    this.shipVx -= this.shipVx * AsteroidsGame.FRICTION * dt;
    this.shipVy -= this.shipVy * AsteroidsGame.FRICTION * dt;
    this.shipX = mod(this.shipX + this.shipVx * speed * dt, this.width);
    this.shipY = mod(this.shipY + this.shipVy * speed * dt, this.height);

    this.fireTimer = Math.max(0, this.fireTimer - dt * speed);
    if ((this.pressed.has(Keys.SPACE) || this.fireQueued) && this.fireTimer <= 0) {
      this.fire();
    }

    for (const b of this.bullets) {
      b.x = mod(b.x + b.vx * speed * dt, this.width);
      b.y = mod(b.y + b.vy * speed * dt, this.height);
      b.life -= dt * speed;
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    for (const a of this.asteroids) {
      a.x = mod(a.x + a.vx * speed * dt, this.width);
      a.y = mod(a.y + a.vy * speed * dt, this.height);
    }

    this.collideBullets();
    this.collideShip();
    return this.alive;
  }

  private fire(): void {
    if (this.bullets.length >= AsteroidsGame.MAX_BULLETS) return;
    this.bullets.push({
      x: this.shipX,
      y: this.shipY,
      vx: Math.cos(this.angle) * AsteroidsGame.BULLET_SPEED,
      vy: Math.sin(this.angle) * AsteroidsGame.BULLET_SPEED,
      life: AsteroidsGame.BULLET_LIFE,
    });
    this.fireTimer = AsteroidsGame.FIRE_COOLDOWN;
    this.fireQueued = false;
    this.sfx("shoot");
  }

  private collideBullets(): void {
    for (const b of [...this.bullets]) {
      for (const a of [...this.asteroids]) {
        if (Math.hypot(b.x - a.x, b.y - a.y) <= a.radius) {
          this.bullets.splice(this.bullets.indexOf(b), 1);
          this.asteroids.splice(this.asteroids.indexOf(a), 1);
          this.sfx("explode");
          if (isBig(a)) {
            this.addScore(SCORE_ASTEROID_BIG);
            this.split(a);
          } else {
            this.addScore(SCORE_ASTEROID_SMALL);
          }
          break;
        }
      }
    }
  }

  private split(a: Asteroid): void {
    for (const sign of [-1, 1]) {
      const heading = Math.atan2(a.vy, a.vx) + sign * AsteroidsGame.SPLIT_ANGLE;
      const speed = Math.hypot(a.vx, a.vy) * AsteroidsGame.SPLIT_SPEED_FACTOR;
      this.asteroids.push({
        x: a.x,
        y: a.y,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        radius: a.radius * AsteroidsGame.SPLIT_RADIUS_FACTOR,
      });
    }
  }

  private collideShip(): void {
    for (const a of this.asteroids) {
      if (Math.hypot(this.shipX - a.x, this.shipY - a.y) <= a.radius + AsteroidsGame.SHIP_COLLISION_RADIUS) {
        this.alive = false;
        return;
      }
    }
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx);

    for (const a of this.asteroids) {
      strokeCircle(
        ctx,
        ASTEROID_GRAY,
        Math.round(a.x),
        Math.round(a.y),
        Math.round(a.radius),
        AsteroidsGame.STROKE_WIDTH,
      );
    }

    for (const b of this.bullets) {
      fillCircle(ctx, BULLET_YELLOW, Math.round(b.x), Math.round(b.y), AsteroidsGame.BULLET_RADIUS);
    }

    this.drawShip(ctx);
  }

  private drawShip(ctx: CanvasRenderingContext2D): void {
    const size = AsteroidsGame.SHIP_SIZE;
    const nose: [number, number] = [
      this.shipX + Math.cos(this.angle) * size,
      this.shipY + Math.sin(this.angle) * size,
    ];
    const left: [number, number] = [
      this.shipX + Math.cos(this.angle + 2.5) * size,
      this.shipY + Math.sin(this.angle + 2.5) * size,
    ];
    const right: [number, number] = [
      this.shipX + Math.cos(this.angle - 2.5) * size,
      this.shipY + Math.sin(this.angle - 2.5) * size,
    ];
    strokePolygon(ctx, SHIP_WHITE, [nose, left, right], AsteroidsGame.STROKE_WIDTH);
  }
}
