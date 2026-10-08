import { BLACK, SCORE_TRON_KILL, TRON_ENEMY, TRON_GRID, TRON_PLAYER } from "../config.js";
import { fillRect } from "../draw.js";
import { Keys, type KeyCode } from "../keys.js";
import { defaultRng, type Rng } from "../rng.js";
import { MiniGame } from "./base.js";

export type Vec = [number, number];

export const RIGHT: Vec = [1, 0];
export const LEFT: Vec = [-1, 0];
export const UP: Vec = [0, -1];
export const DOWN: Vec = [0, 1];

export class Rider {
  readonly isPlayer: boolean;
  trail = new Set<string>();
  pending: Vec[] = [];

  constructor(
    public x: number,
    public y: number,
    public direction: Vec,
    public readonly color: readonly [number, number, number],
    isPlayer = false,
  ) {
    this.isPlayer = isPlayer;
    this.trail.add(`${x},${y}`);
  }
}

export class TronGame extends MiniGame {
  name = "TRON";

  static readonly CELL = 20;
  static readonly STEP_TIME = 0.11;
  static readonly MAX_QUEUE = 2;

  readonly cols: number;
  readonly rows: number;
  readonly rng: Rng;

  player!: Rider;
  enemy!: Rider;
  moveTimer!: number;

  constructor(width: number, height: number, rng: Rng = defaultRng()) {
    super(width, height);
    this.cols = Math.floor(width / TronGame.CELL);
    this.rows = Math.floor(height / TronGame.CELL);
    this.rng = rng;
    this.reset();
  }

  reset(): void {
    this.score = 0;
    this.alive = true;
    this.resetArena();
  }

  private resetArena(): void {
    this.player = new Rider(5, Math.floor(this.rows / 2), [RIGHT[0], RIGHT[1]], TRON_PLAYER, true);
    this.enemy = new Rider(
      this.cols - 6,
      Math.floor(this.rows / 2),
      [LEFT[0], LEFT[1]],
      TRON_ENEMY,
    );
    this.moveTimer = 0;
  }

  override onKeyDown(key: KeyCode): void {
    super.onKeyDown(key);
    const mapping: Record<string, Vec> = {
      [Keys.UP]: UP,
      [Keys.W]: UP,
      [Keys.DOWN]: DOWN,
      [Keys.S]: DOWN,
      [Keys.LEFT]: LEFT,
      [Keys.A]: LEFT,
      [Keys.RIGHT]: RIGHT,
      [Keys.D]: RIGHT,
    };
    const direction = mapping[key];
    if (direction !== undefined) this.queueTurn(this.player, direction);
  }

  queueTurn(rider: Rider, direction: Vec): boolean {
    const last = rider.pending.length > 0 ? rider.pending[rider.pending.length - 1] : rider.direction;
    if (direction[0] === last[0] && direction[1] === last[1]) return false;
    if (direction[0] === -last[0] && direction[1] === -last[1]) return false;
    if (rider.pending.length >= TronGame.MAX_QUEUE) return false;
    rider.pending.push([direction[0], direction[1]]);
    return true;
  }

  override update(dt: number): boolean {
    if (!this.alive) return false;
    this.moveTimer += dt * this.speedMultiplier;
    while (this.alive && this.moveTimer >= TronGame.STEP_TIME) {
      this.moveTimer -= TronGame.STEP_TIME;
      this.tick();
    }
    return this.alive;
  }

  get riders(): Rider[] {
    return [this.player, this.enemy].filter((r): r is Rider => r != null);
  }

  tick(): void {
    const allTrails = new Set<string>();
    for (const r of this.riders) for (const t of r.trail) allTrails.add(t);

    const proposals = new Map<Rider, { nx: number; ny: number; direction: Vec }>();
    for (const r of this.riders) {
      const direction = r.isPlayer ? this.nextPlayerDirection(r) : this.nextEnemyDirection(r);
      proposals.set(r, { nx: r.x + direction[0], ny: r.y + direction[1], direction });
    }

    const targetCounts = new Map<string, number>();
    for (const { nx, ny } of proposals.values()) {
      const key = `${nx},${ny}`;
      targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
    }

    const crashed: Rider[] = [];
    for (const r of this.riders) {
      const { nx, ny } = proposals.get(r)!;
      const key = `${nx},${ny}`;
      if (!(nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows)) crashed.push(r);
      else if (allTrails.has(key)) crashed.push(r);
      else if ((targetCounts.get(key) ?? 0) > 1) crashed.push(r);
    }

    const playerCrashed = crashed.includes(this.player);
    if (playerCrashed) {
      this.alive = false;
      return;
    }

    const enemyCrashed = crashed.includes(this.enemy);

    this.advanceRider(this.player, proposals);
    if (!enemyCrashed) this.advanceRider(this.enemy, proposals);

    if (enemyCrashed) {
      this.addScore(SCORE_TRON_KILL);
      this.sfx("tronKill");
      this.resetArena();
    }
  }

  private advanceRider(
    rider: Rider,
    proposals: Map<Rider, { nx: number; ny: number; direction: Vec }>,
  ): void {
    const { nx, ny, direction } = proposals.get(rider)!;
    rider.trail.add(`${nx},${ny}`);
    rider.x = nx;
    rider.y = ny;
    rider.direction = direction;
  }

  private nextPlayerDirection(rider: Rider): Vec {
    while (rider.pending.length > 0) {
      const candidate = rider.pending.shift()!;
      const isSame =
        candidate[0] === rider.direction[0] && candidate[1] === rider.direction[1];
      const isReverse =
        candidate[0] === -rider.direction[0] && candidate[1] === -rider.direction[1];
      if (!isSame && !isReverse) {
        this.sfx("tronTurn");
        return candidate;
      }
    }
    return rider.direction;
  }

  private nextEnemyDirection(rider: Rider): Vec {
    const options = [UP, DOWN, LEFT, RIGHT].filter(
      (d) => !(d[0] === -rider.direction[0] && d[1] === -rider.direction[1]),
    );
    const safe: Vec[] = [];
    for (const d of options) {
      const nx = rider.x + d[0];
      const ny = rider.y + d[1];
      if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) safe.push(d);
    }
    if (safe.length === 0) return rider.direction;

    const danger = (d: Vec): number => {
      const nx = rider.x + d[0];
      const ny = rider.y + d[1];
      for (const other of this.riders) {
        if (other.trail.has(`${nx},${ny}`)) return 1;
      }
      return 0;
    };

    const ranked = safe.map((d) => ({
      d,
      danger: danger(d),
      distance: Math.abs(rider.x + d[0] - this.player.x) + Math.abs(rider.y + d[1] - this.player.y),
      tie: this.rng.random(),
    }));
    ranked.sort(
      (a, b) => a.danger - b.danger || a.distance - b.distance || a.tie - b.tie,
    );
    const choice = ranked[0].d;
    if (choice[0] !== rider.direction[0] || choice[1] !== rider.direction[1]) {
      this.sfx("tronTurnEnemy");
    }
    return choice;
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgb(${BLACK[0]},${BLACK[1]},${BLACK[2]})`;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = `rgb(${TRON_GRID[0]},${TRON_GRID[1]},${TRON_GRID[2]})`;
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.width; x += TronGame.CELL) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += TronGame.CELL) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(this.width, y + 0.5);
      ctx.stroke();
    }

    for (const r of this.riders) {
      for (const key of r.trail) {
        const [x, y] = key.split(",").map(Number);
        fillRect(
          ctx,
          r.color,
          x * TronGame.CELL + 1,
          y * TronGame.CELL + 1,
          TronGame.CELL - 2,
          TronGame.CELL - 2,
        );
      }
    }
  }
}
