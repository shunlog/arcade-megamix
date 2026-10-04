// Mini-game: Pac-Man.
//
// A compact hand-made maze. Eating a pellet is the scoring baseline (1 point).
// Touching a ghost ends the run.
//
// The tile size is derived from the window so the field fills it, and the ghosts
// move slower than the player.

import {
  BLACK,
  DARK,
  GHOST_CYAN,
  GHOST_PINK,
  GHOST_RED,
  PAC_YELLOW,
  PELLET,
  SCORE_PAC_PELLET,
  type Color,
} from "../config.js";
import { fillCircle, fillPolygon, fillRect } from "../draw.js";
import { Keys, type KeyCode } from "../keys.js";
import { defaultRng, type Rng } from "../rng.js";
import { MiniGame } from "./base.js";

export type Vec = [number, number];

export const RIGHT: Vec = [1, 0];
export const LEFT: Vec = [-1, 0];
export const UP: Vec = [0, -1];
export const DOWN: Vec = [0, 1];

const MAZE = [
  "#########################",
  "#.......................#",
  "#...........#...........#",
  "#....##.###.#.###.##....#",
  "#.......................#",
  "#....##.#.#####.#.##....#",
  "#.......#...#...#.......#",
  "#...###.### # ###.###...#",
  "#...  #.#       #.#  ...#",
  "#...###.# ##-## #.###...#",
  "#...........#...........#",
  "#....##.###.#.###.##....#",
  "#.....#...........#.....#",
  "#...#.#.#.#####.#.#.#...#",
  "#.......#...#...#.......#",
  "#.......................#",
  "#########################",
];

const GHOST_SPAWNS: ReadonlyArray<readonly [number, number]> = [
  [10, 8],
  [12, 8],
  [14, 8],
];
const PAC_SPAWN: readonly [number, number] = [12, 12];
const GHOST_COLORS: ReadonlyArray<Color> = [GHOST_RED, GHOST_PINK, GHOST_CYAN];

export class Ghost {
  constructor(
    public x: number,
    public y: number,
    public direction: Vec,
    public readonly color: Color,
  ) {}
}

export class PacmanGame extends MiniGame {
  name = "PAC-MAN";

  // Seconds per tile. Ghosts are deliberately slower than the player.
  static readonly PAC_STEP = 0.18;
  static readonly GHOST_STEP = 0.3;
  static readonly MAX_QUEUE = 2;

  readonly rng: Rng;
  readonly rows: number;
  readonly cols: number;
  readonly cell: number;
  readonly x0: number;
  readonly y0: number;

  pacX!: number;
  pacY!: number;
  pacDir!: Vec;
  pending!: Vec[];
  pacTimer!: number;
  ghostTimer!: number;
  ghosts!: Ghost[];
  pellets!: Set<string>;

  constructor(width: number, height: number, rng: Rng = defaultRng()) {
    super(width, height);
    this.rng = rng;
    this.rows = MAZE.length;
    this.cols = MAZE[0].length;
    // Pick the biggest whole-pixel tile that fits, then bottom-align so the
    // top of the field clears the HUD.
    this.cell = Math.max(1, Math.min(Math.floor(width / this.cols), Math.floor(height / this.rows)));
    this.x0 = Math.floor((width - this.cols * this.cell) / 2);
    this.y0 = height - this.rows * this.cell;
    this.reset();
  }

  // -- lifecycle -----------------------------------------------------------
  reset(): void {
    [this.pacX, this.pacY] = PAC_SPAWN;
    this.pacDir = [LEFT[0], LEFT[1]];
    this.pending = [];
    this.pacTimer = 0;
    this.ghostTimer = 0;
    this.ghosts = GHOST_SPAWNS.map(
      ([x, y], i) => new Ghost(x, y, this.rng.choice([UP, DOWN, LEFT, RIGHT]), GHOST_COLORS[i]),
    );
    this.pellets = new Set<string>();
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (MAZE[y][x] === ".") this.pellets.add(`${x},${y}`);
      }
    }
    this.score = 0;
    this.alive = true;
  }

  // -- input ---------------------------------------------------------------
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
    if (direction !== undefined) this.queueTurn(direction);
  }

  queueTurn(direction: Vec): boolean {
    const last = this.pending.length > 0 ? this.pending[this.pending.length - 1] : this.pacDir;
    if (direction[0] === last[0] && direction[1] === last[1]) return false;
    if (this.pending.length >= PacmanGame.MAX_QUEUE) return false;
    this.pending.push([direction[0], direction[1]]);
    return true;
  }

  // -- grid helpers --------------------------------------------------------
  private walkable(x: number, y: number, ghost = false): boolean {
    if (!(x >= 0 && x < this.cols && y >= 0 && y < this.rows)) return false;
    const cell = MAZE[y][x];
    if (cell === "#") return false;
    if (cell === "-" && !ghost) return false;
    return true;
  }

  // -- simulation ----------------------------------------------------------
  override update(dt: number): boolean {
    if (!this.alive) return false;

    this.pacTimer += dt;
    while (this.alive && this.pacTimer >= PacmanGame.PAC_STEP) {
      this.pacTimer -= PacmanGame.PAC_STEP;
      this.stepPac();
      this.checkCollision();
    }

    this.ghostTimer += dt;
    while (this.alive && this.ghostTimer >= PacmanGame.GHOST_STEP) {
      this.ghostTimer -= PacmanGame.GHOST_STEP;
      this.stepGhosts();
      this.checkCollision();
    }

    return this.alive;
  }

  private stepPac(): void {
    // Try the buffered turn until it becomes legal.
    if (this.pending.length > 0) {
      const candidate = this.pending[0];
      if (this.walkable(this.pacX + candidate[0], this.pacY + candidate[1])) {
        this.pacDir = candidate;
        this.pending.shift();
      }
    }

    const nx = this.pacX + this.pacDir[0];
    const ny = this.pacY + this.pacDir[1];
    if (!this.walkable(nx, ny)) return;
    this.pacX = nx;
    this.pacY = ny;
    const key = `${nx},${ny}`;
    if (this.pellets.has(key)) {
      this.pellets.delete(key);
      this.addScore(SCORE_PAC_PELLET);
      if (this.pellets.size === 0) this.refillPellets();
    }
  }

  private refillPellets(): void {
    this.pellets = new Set<string>();
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (MAZE[y][x] === ".") this.pellets.add(`${x},${y}`);
      }
    }
  }

  private stepGhosts(): void {
    for (const ghost of this.ghosts) {
      let options = [UP, DOWN, LEFT, RIGHT].filter(
        (d) =>
          !(d[0] === -ghost.direction[0] && d[1] === -ghost.direction[1]) &&
          this.walkable(ghost.x + d[0], ghost.y + d[1], true),
      );
      if (options.length === 0) {
        options = [[-ghost.direction[0], -ghost.direction[1]]];
      }
      const ranked = options.map((d) => ({
        d,
        distance: Math.abs(ghost.x + d[0] - this.pacX) + Math.abs(ghost.y + d[1] - this.pacY),
        tie: this.rng.random(),
      }));
      ranked.sort((a, b) => a.distance - b.distance || a.tie - b.tie);
      ghost.direction = ranked[0].d;
      ghost.x += ghost.direction[0];
      ghost.y += ghost.direction[1];
    }
  }

  private checkCollision(): void {
    for (const ghost of this.ghosts) {
      if (ghost.x === this.pacX && ghost.y === this.pacY) {
        this.alive = false;
        return;
      }
    }
  }

  // -- rendering -----------------------------------------------------------
  private px(gx: number): number {
    return this.x0 + gx * this.cell;
  }

  private py(gy: number): number {
    return this.y0 + gy * this.cell;
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgb(${BLACK[0]},${BLACK[1]},${BLACK[2]})`;
    ctx.fillRect(0, 0, this.width, this.height);
    const c = this.cell;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const ch = MAZE[y][x];
        if (ch === "#") {
          fillRect(ctx, [28, 40, 160], this.px(x), this.py(y), c, c, 6);
        } else if (ch === "-") {
          fillRect(ctx, [240, 170, 200], this.px(x), this.py(y) + Math.floor(c / 2), c, 4);
        }
      }
    }

    for (const key of this.pellets) {
      const [x, y] = key.split(",").map(Number);
      fillCircle(
        ctx,
        PELLET,
        this.px(x) + Math.floor(c / 2),
        this.py(y) + Math.floor(c / 2),
        Math.max(2, Math.floor(c / 9)),
      );
    }

    for (const ghost of this.ghosts) this.drawGhost(ctx, ghost);
    this.drawPac(ctx);
  }

  private drawPac(ctx: CanvasRenderingContext2D): void {
    const c = this.cell;
    const cx = this.px(this.pacX) + Math.floor(c / 2);
    const cy = this.py(this.pacY) + Math.floor(c / 2);
    const r = Math.floor(c / 2) - 3;
    fillCircle(ctx, PAC_YELLOW, cx, cy, r);
    // Mouth wedge pointing in the travel direction. Keep it inside the
    // circle so it never paints over neighbouring walls.
    const angleDeg: Record<string, number> = {
      "1,0": 0,
      "-1,0": 180,
      "0,-1": 90,
      "0,1": 270,
    };
    const a = (angleDeg[`${this.pacDir[0]},${this.pacDir[1]}`] * Math.PI) / 180;
    const p1: [number, number] = [cx + Math.cos(a + 0.5) * r, cy + Math.sin(a + 0.5) * r];
    const p2: [number, number] = [cx + Math.cos(a - 0.5) * r, cy + Math.sin(a - 0.5) * r];
    fillPolygon(ctx, BLACK, [[cx, cy], p1, p2]);
  }

  private drawGhost(ctx: CanvasRenderingContext2D, ghost: Ghost): void {
    const c = this.cell;
    const x = this.px(ghost.x);
    const y = this.py(ghost.y);
    const r = Math.floor(c / 2) - 3;
    fillCircle(ctx, ghost.color, x + Math.floor(c / 2), y + Math.floor(c / 2) - 2, r);
    fillRect(ctx, ghost.color, x + 3, y + Math.floor(c / 2) - 2, c - 6, Math.floor(c / 2));
    fillCircle(
      ctx,
      DARK,
      x + Math.floor(c / 2) - Math.floor(r / 3),
      y + Math.floor(c / 2) - 4,
      Math.max(2, Math.floor(r / 5)),
    );
    fillCircle(
      ctx,
      DARK,
      x + Math.floor(c / 2) + Math.floor(r / 3),
      y + Math.floor(c / 2) - 4,
      Math.max(2, Math.floor(r / 5)),
    );
  }
}
