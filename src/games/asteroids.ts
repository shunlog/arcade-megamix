// Mini-game: Asteroids.
//
// The ship persists between switches. A fresh wave of asteroids is added every
// time the main game completes a full loop through the five mini-games.

import {
  ASTEROID_GRAY,
  BLACK,
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
  return a.radius >= 20;
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
  /**
   * Safety net only. The fire rate is governed by FIRE_COOLDOWN: with a 0.18s
   * cooldown and a 1.2s bullet life at most ~7 bullets are ever alive, so this
   * must stay above that or it starts blocking shots and the cadence stutters.
   */
  static readonly MAX_BULLETS = 8;
  static readonly FIRE_COOLDOWN = 0.18;

  readonly rng: Rng;

  shipX!: number;
  shipY!: number;
  shipVx!: number;
  shipVy!: number;
  angle!: number;
  fireTimer!: number;
  /** A fire press seen since the last shot, so taps are never dropped. */
  fireQueued!: boolean;
  bullets!: Bullet[];
  asteroids!: Asteroid[];

  constructor(width: number, height: number, rng: Rng = defaultRng()) {
    super(width, height);
    this.rng = rng;
    this.reset();
  }

  // -- lifecycle -----------------------------------------------------------
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
    this.addWave(3);
  }

  addWave(count = 2): void {
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
      const speed = this.rng.uniform(40, 90);
      const heading = this.rng.uniform(0, Math.PI * 2);
      this.asteroids.push({
        x,
        y,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        radius: this.rng.uniform(18, 30),
      });
    }
  }

  override onKeyDown(key: KeyCode): void {
    super.onKeyDown(key);
    if (key === Keys.SPACE) this.fireQueued = true;
  }

  // -- simulation ----------------------------------------------------------
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

    // mild drag so the ship does not accelerate forever
    this.shipVx -= this.shipVx * AsteroidsGame.FRICTION * dt;
    this.shipVy -= this.shipVy * AsteroidsGame.FRICTION * dt;
    this.shipX = mod(this.shipX + this.shipVx * speed * dt, this.width);
    this.shipY = mod(this.shipY + this.shipVy * speed * dt, this.height);

    this.fireTimer = Math.max(0, this.fireTimer - dt * speed);
    // Holding SPACE keeps firing at the cooldown rate; a tap is remembered
    // until the cooldown allows it, so quick presses are not lost.
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
    const speed = 480.0;
    this.bullets.push({
      x: this.shipX,
      y: this.shipY,
      vx: Math.cos(this.angle) * speed,
      vy: Math.sin(this.angle) * speed,
      life: 1.2,
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
      const heading = Math.atan2(a.vy, a.vx) + sign * 0.7;
      const speed = Math.hypot(a.vx, a.vy) * 1.2;
      this.asteroids.push({
        x: a.x,
        y: a.y,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        radius: a.radius * 0.55,
      });
    }
  }

  private collideShip(): void {
    for (const a of this.asteroids) {
      if (Math.hypot(this.shipX - a.x, this.shipY - a.y) <= a.radius + 6) {
        this.alive = false;
        return;
      }
    }
  }

  // -- rendering -----------------------------------------------------------
  override draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgb(${BLACK[0]},${BLACK[1]},${BLACK[2]})`;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const a of this.asteroids) {
      strokeCircle(ctx, ASTEROID_GRAY, Math.round(a.x), Math.round(a.y), Math.round(a.radius), 2);
    }

    for (const b of this.bullets) {
      fillCircle(ctx, BULLET_YELLOW, Math.round(b.x), Math.round(b.y), 3);
    }

    this.drawShip(ctx);
  }

  private drawShip(ctx: CanvasRenderingContext2D): void {
    const size = 14;
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
    strokePolygon(ctx, SHIP_WHITE, [nose, left, right], 2);
  }
}
