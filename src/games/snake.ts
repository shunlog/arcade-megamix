// Mini-game: Snake.
//
// Designed to feel like the Google snake doodle: grid movement, buffered turn
// input and a snake that grows by one apple at a time. The logic is kept free
// of any rendering so it can be tested directly.

import {
  APPLE_RED,
  BLACK,
  DARK,
  SCORE_SNAKE_APPLE,
  SNAKE_GREEN,
  SNAKE_HEAD,
} from "../config.js";
import { fillCircle, fillRect } from "../draw.js";
import { Keys, type KeyCode } from "../keys.js";
import { defaultRng, type Rng } from "../rng.js";
import { MiniGame } from "./base.js";

export type Vec = [number, number];

export const RIGHT: Vec = [1, 0];
export const LEFT: Vec = [-1, 0];
export const UP: Vec = [0, -1];
export const DOWN: Vec = [0, 1];

export class SnakeGame extends MiniGame {
  name = "SNAKE";

  static readonly CELL = 20;
  static readonly START_LEN = 3;
  static readonly STEP_TIME = 0.11;
  static readonly MAX_QUEUE = 3;

  readonly cols: number;
  readonly rows: number;
  readonly rng: Rng;

  snake!: Vec[];
  direction!: Vec;
  pending!: Vec[];
  moveTimer!: number;
  /** Every apple currently on the board. Eaten ones are replaced. */
  apples!: Vec[];

  constructor(width: number, height: number, rng: Rng = defaultRng()) {
    super(width, height);
    this.cols = Math.floor(width / SnakeGame.CELL);
    this.rows = Math.floor(height / SnakeGame.CELL);
    this.rng = rng;
    this.reset();
  }

  // -- lifecycle -----------------------------------------------------------
  reset(): void {
    const cy = Math.floor(this.rows / 2);
    const cx = Math.floor(this.cols / 3);
    this.snake = [];
    for (let i = 0; i < SnakeGame.START_LEN; i++) this.snake.push([cx - i, cy]);
    this.direction = [RIGHT[0], RIGHT[1]];
    this.pending = [];
    this.moveTimer = 0;
    this.score = 0;
    this.alive = true;
    this.apples = [];
    this.addApple();
  }

  /**
   * Drop another apple on a random free cell. Called once per level and every
   * time an apple is eaten, so the count can only grow between resets.
   */
  addApple(): void {
    this.apples.push(this.randomFreeCell());
  }

  // -- compatibility getter ------------------------------------------------
  // The first apple is exposed under the old single-apple name.
  get apple(): Vec {
    return this.apples[0];
  }

  set apple(value: Vec) {
    this.apples[0] = value;
  }

  // -- input ---------------------------------------------------------------
  /**
   * Queue a turn. Rejects reversals and duplicates of the last queued
   * direction, which is what makes buffered input feel correct.
   */
  turn(direction: Vec): boolean {
    const last = this.pending.length > 0 ? this.pending[this.pending.length - 1] : this.direction;
    if (direction[0] === last[0] && direction[1] === last[1]) return false;
    if (direction[0] === -last[0] && direction[1] === -last[1]) return false;
    if (this.pending.length >= SnakeGame.MAX_QUEUE) return false;
    this.pending.push([direction[0], direction[1]]);
    return true;
  }

  override onKeyDown(key: KeyCode): void {
    super.onKeyDown(key);
    if (key === Keys.UP || key === Keys.W) this.turn(UP);
    else if (key === Keys.DOWN || key === Keys.S) this.turn(DOWN);
    else if (key === Keys.LEFT || key === Keys.A) this.turn(LEFT);
    else if (key === Keys.RIGHT || key === Keys.D) this.turn(RIGHT);
  }

  // -- simulation ----------------------------------------------------------
  step(): void {
    if (!this.alive) return;

    // Consume exactly one buffered turn per step.
    while (this.pending.length > 0) {
      const candidate = this.pending.shift()!;
      const isSame = candidate[0] === this.direction[0] && candidate[1] === this.direction[1];
      const isReverse =
        candidate[0] === -this.direction[0] && candidate[1] === -this.direction[1];
      if (!isSame && !isReverse) {
        this.direction = candidate;
        this.sfx("snakeTurn");
        break;
      }
    }

    const [hx, hy] = this.snake[0];
    const nx = hx + this.direction[0];
    const ny = hy + this.direction[1];

    if (!(nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows)) {
      this.alive = false;
      return;
    }

    const eatingIndex = this.apples.findIndex(([ax, ay]) => ax === nx && ay === ny);
    const eating = eatingIndex >= 0;
    const body = new Set(this.snake.map(([x, y]) => `${x},${y}`));
    if (!eating) body.delete(`${this.snake[this.snake.length - 1][0]},${this.snake[this.snake.length - 1][1]}`);
    if (body.has(`${nx},${ny}`)) {
      this.alive = false;
      return;
    }

    this.snake.unshift([nx, ny]);
    if (eating) {
      this.addScore(SCORE_SNAKE_APPLE);
      this.sfx("apple");
      this.apples.splice(eatingIndex, 1);
      this.addApple();
    } else {
      this.snake.pop();
    }
  }

  override update(dt: number): boolean {
    if (!this.alive) return false;
    // Time flows faster with the global multiplier, so the snake takes grid
    // steps at a proportionally higher rate.
    this.moveTimer += dt * this.speedMultiplier;
    while (this.alive && this.moveTimer >= SnakeGame.STEP_TIME) {
      this.moveTimer -= SnakeGame.STEP_TIME;
      this.step();
    }
    return this.alive;
  }

  private randomFreeCell(): Vec {
    const occupied = new Set<string>();
    for (const [x, y] of this.snake) occupied.add(`${x},${y}`);
    for (const [x, y] of this.apples) occupied.add(`${x},${y}`);
    const free: Vec[] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!occupied.has(`${x},${y}`)) free.push([x, y]);
      }
    }
    if (free.length === 0) return [0, 0];
    return this.rng.choice(free);
  }

  // -- rendering -----------------------------------------------------------
  override draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgb(${BLACK[0]},${BLACK[1]},${BLACK[2]})`;
    ctx.fillRect(0, 0, this.width, this.height);
    const size = SnakeGame.CELL;

    this.snake.forEach(([x, y], i) => {
      const color = i === 0 ? SNAKE_HEAD : SNAKE_GREEN;
      fillRect(ctx, color, x * size + 1, y * size + 1, size - 2, size - 2, 5);
    });

    // eyes on the head, oriented by travel direction
    const [hx, hy] = this.snake[0];
    const cx = hx * size + Math.floor(size / 2);
    const cy = hy * size + Math.floor(size / 2);
    const [dx, dy] = this.direction;
    const ox = dy * 3;
    const oy = dx * 3;
    fillCircle(ctx, DARK, cx + dx * 3 + ox, cy + dy * 3 + oy, 2);
    fillCircle(ctx, DARK, cx + dx * 3 - ox, cy + dy * 3 - oy, 2);

    for (const [ax, ay] of this.apples) {
      fillCircle(ctx, APPLE_RED, ax * size + Math.floor(size / 2), ay * size + Math.floor(size / 2), size / 2 - 2);
    }
  }
}
