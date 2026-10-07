// Main application: cycle through the mini-games, switching ever faster.

import {
  DARK,
  GRAY,
  LEVEL_FLOOR,
  LEVEL_START,
  LEVEL_STEP,
  PLAY_TICKS,
  PixelFont,
  rgb,
  SCREEN_H,
  SCREEN_W,
  scoreMultiplier,
  speedMultiplier,
  TICKS_PER_CYCLE,
  WHITE,
} from "./config.js";
import { GAME_ORDER, type MiniGame } from "./games/index.js";
import { AsteroidsGame } from "./games/asteroids.js";
import { PongGame } from "./games/pong.js";
import { SnakeGame } from "./games/snake.js";
import { drawOverlay } from "./draw.js";
import { Keys, type KeyCode } from "./keys.js";

/** What the rotation is doing at the current tick. */
export type RoundPhase = "play" | "pause" | "switch";

/**
 * Tracks which mini-game is active and where we are in the 8-buzz cycle.
 *
 * A tick is the gap between two buzzes. The level duration covers the whole
 * cycle and is split into eight ticks: six play ticks, then a two-tick pause
 * during which the game is frozen and the pause / play sign is shown. On the
 * final tick the next mini-game is swapped in, still paused; play resumes on
 * the next cycle's first tick.
 */
export class RoundManager {
  index = 0;
  /** Level = completed full cycles through every mini-game. */
  level = 0;
  /** Position within the cycle: 0-5 play, 6 pause sign, 7 swap + play sign. */
  tickIndex = 0;
  /** Seconds until the next tick / buzz. */
  remaining = 0;
  /** Set when a cycle wraps; the level rises at the next cycle's tick 0. */
  private cycleComplete = false;

  constructor(
    public readonly count: number,
    public readonly start = LEVEL_START,
    public readonly step = LEVEL_STEP,
    public readonly floor = LEVEL_FLOOR,
    startLevel = 0,
  ) {
    this.level = startLevel;
    this.remaining = this.tickDuration;
  }

  /**
   * Total level duration in seconds, including the pause at the end. Each
   * level is 1s shorter than the last, down to the floor.
   */
  get duration(): number {
    return Math.max(this.floor, this.start - this.level * this.step);
  }

  /** Seconds between two buzzes: the level duration split across eight ticks. */
  get tickDuration(): number {
    return this.duration / TICKS_PER_CYCLE;
  }

  /** Playing time within a level: the six play ticks. */
  get playDuration(): number {
    return PLAY_TICKS * this.tickDuration;
  }

  /** Current phase, derived from the tick position. */
  get phase(): RoundPhase {
    if (this.tickIndex < PLAY_TICKS) return "play";
    return this.tickIndex === PLAY_TICKS ? "pause" : "switch";
  }

  /** Seconds until the active mini-game is replaced (the tick-7 buzz). */
  get timeToSwitch(): number {
    if (this.tickIndex <= PLAY_TICKS) {
      return this.remaining + (PLAY_TICKS - this.tickIndex) * this.tickDuration;
    }
    // Already showing the incoming game; the next switch is a full cycle away.
    return this.remaining + (TICKS_PER_CYCLE - 1) * this.tickDuration;
  }

  /**
   * Advance time. When a tick boundary is crossed the cycle moves on and the
   * new tick index (0..7) is returned; otherwise returns -1. The level rises
   * as the cycle wraps to tick 0, so the duration changes only between cycles.
   */
  tick(dt: number): number {
    this.remaining -= dt;
    if (this.remaining > 0) return -1;
    this.tickIndex = (this.tickIndex + 1) % TICKS_PER_CYCLE;
    if (this.tickIndex === 0 && this.cycleComplete) {
      this.level += 1;
      this.cycleComplete = false;
    }
    this.remaining += this.tickDuration;
    return this.tickIndex;
  }

  /**
   * Move to the next game. Returns true if this completes a full cycle; the
   * level itself rises on the next tick 0, keeping the tick duration constant
   * for the whole cycle.
   */
  advance(): boolean {
    this.index += 1;
    if (this.index >= this.count) {
      this.index = 0;
      this.cycleComplete = true;
      return true;
    }
    return false;
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
  /** Level the run starts on, set by the chosen difficulty. */
  readonly startLevel: number;

  constructor(width: number = SCREEN_W, height: number = SCREEN_H, startLevel = 0) {
    this.width = width;
    this.height = height;
    this.big = new PixelFont(3);
    this.small = new PixelFont(2);
    this.startLevel = startLevel;
    this.games = GAME_ORDER.map((cls) => new cls(width, height));
    this.round = new RoundManager(this.games.length, LEVEL_START, LEVEL_STEP, LEVEL_FLOOR, startLevel);
    this.applyMultipliers();
  }

  /** Push the current level's speed and score multipliers onto every mini-game. */
  private applyMultipliers(): void {
    const speed = speedMultiplier(this.round.level);
    const score = scoreMultiplier(this.round.level);
    for (const g of this.games) {
      g.speedMultiplier = speed;
      g.scoreMultiplier = score;
    }
  }

  get active(): MiniGame {
    return this.games[this.round.index];
  }

  get totalScore(): number {
    return this.games.reduce((sum, g) => sum + g.score, 0);
  }

  restart(): void {
    this.games = GAME_ORDER.map((cls) => new cls(this.width, this.height));
    this.round = new RoundManager(this.games.length, LEVEL_START, LEVEL_STEP, LEVEL_FLOOR, this.startLevel);
    this.applyMultipliers();
    this.gameOver = false;
  }

  private doSwitch(): void {
    const wrapped = this.round.advance();
    // Every mini-game keeps its state; only Asteroids gets a fresh wave
    // on each new loop through the full rotation.
    if (wrapped) {
      for (const g of this.games) {
        if (g instanceof AsteroidsGame) g.addWave(2);
        // Pong gains a ball each level, so later levels get busier.
        if (g instanceof PongGame) g.addBall();
        // Snake gains an extra apple each level, on top of the existing one.
        if (g instanceof SnakeGame) g.addApple();
      }
    }
    // Drop held keys so a key held through the switch doesn't stick.
    for (const g of this.games) g.pressed.clear();
  }

  /**
   * Advance one frame. Returns the tick index that just began (0..7), or -1
   * when no tick boundary was crossed. The mini-game only runs during the
   * six play ticks; it is frozen while the pause / play sign is shown.
   */
  update(dt: number): number {
    if (this.gameOver) return -1;

    const tick = this.round.tick(dt);
    // The level (and so the multipliers) may have just changed.
    if (tick === 0) this.applyMultipliers();
    if (tick === TICKS_PER_CYCLE - 1) {
      // Swap in the incoming mini-game during the pause; play resumes on tick 0.
      this.doSwitch();
    }
    if (this.round.phase === "play") {
      if (!this.active.update(dt)) this.gameOver = true;
    }
    return tick;
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

    // top-left: current level + current mini-game name
    const level = this.big.draw(ctx, `LV ${this.round.level}`, WHITE, 16, 12);
    this.small.draw(ctx, this.active.name, GRAY, 18, 12 + level.height + 6);

    // top-right: big pixel score
    const score = this.big.render(String(this.totalScore).padStart(6, "0"), WHITE);
    ctx.drawImage(score, this.width - score.width - 16, 12);

    // under the score: global score multiplier, e.g. "x1.1"
    const mult = this.small.render(`x${scoreMultiplier(this.round.level).toFixed(1)}`, GRAY);
    ctx.drawImage(mult, this.width - mult.width - 16, 12 + score.height + 6);

    if (!this.gameOver && this.round.phase !== "play") {
      this.drawPhaseSign(ctx, this.round.phase);
    }

    // The tick ring hugs the screen edge so it stays visible through the
    // pause / play overlays.
    this.drawTickRing(ctx);

    if (this.gameOver) {
      drawOverlay(ctx, this.width, this.height, this.big, this.small, "GAME OVER", [
        { text: `FINAL SCORE ${this.totalScore}`, color: GRAY },
        { text: "R = RESTART    Q = MENU", color: GRAY },
      ]);
    }
  }

  /**
   * Draw the eight-segment border around the whole screen that tracks the
   * rotation's ticks: two segments per side. It fills clockwise from the
   * top-left, so tick 0 lights one segment and tick 7 completes the screen.
   */
  private drawTickRing(ctx: CanvasRenderingContext2D): void {
    const t = 4; // border thickness
    const w = this.width;
    const h = this.height;
    const innerH = h - t * 2;
    const halfH = Math.floor(innerH / 2);
    const halfW = Math.floor(w / 2);

    // Clockwise from the top-left: top (left, right), right side (top,
    // bottom), bottom (right, left), then the left side (bottom, top).
    const segments: ReadonlyArray<readonly [number, number, number, number]> = [
      [0, 0, halfW, t],
      [halfW, 0, w - halfW, t],
      [w - t, t, t, halfH],
      [w - t, t + halfH, t, innerH - halfH],
      [halfW, h - t, w - halfW, t],
      [0, h - t, halfW, t],
      [0, t + halfH, t, innerH - halfH],
      [0, t, t, halfH],
    ];

    const lit = this.round.tickIndex + 1;
    segments.forEach(([sx, sy, sw, sh], i) => {
      ctx.fillStyle = rgb(i < lit ? WHITE : DARK);
      ctx.fillRect(sx, sy, sw, sh);
    });
  }

  /**
   * Big centred symbol for the rotation pause: two bars while the game is
   * frozen, a triangle once the incoming game is shown and about to start.
   */
  private drawPhaseSign(ctx: CanvasRenderingContext2D, phase: "pause" | "switch"): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const size = 140;

    ctx.save();
    ctx.fillStyle = "rgba(8,8,16,0.55)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = rgb(WHITE);

    if (phase === "pause") {
      const bar = size * 0.3;
      const half = size * 0.12;
      ctx.fillRect(cx - half - bar, cy - size / 2, bar, size);
      ctx.fillRect(cx + half, cy - size / 2, bar, size);
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.32, cy - size / 2);
      ctx.lineTo(cx + size * 0.5, cy);
      ctx.lineTo(cx - size * 0.32, cy + size / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
