import {
  BLACK,
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
import { drawScore, HUD_MARGIN, HUD_TOP, type GameSession } from "./session.js";
import type { KeyCode } from "./keys.js";
import type { Sfx } from "./sound.js";

export type RoundPhase = "play" | "pause";

export class RoundManager {
  index = 0;
  level = 0;
  tickIndex = 0;
  remaining = 0;
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

  get duration(): number {
    return Math.max(this.floor, this.start - this.level * this.step);
  }

  get tickDuration(): number {
    return this.duration / TICKS_PER_CYCLE;
  }

  get playDuration(): number {
    return PLAY_TICKS * this.tickDuration;
  }

  get phase(): RoundPhase {
    return this.tickIndex < PLAY_TICKS ? "play" : "pause";
  }

  get timeToSwitch(): number {
    const ticks = (PLAY_TICKS - 1 - this.tickIndex + TICKS_PER_CYCLE) % TICKS_PER_CYCLE;
    return this.remaining + ticks * this.tickDuration;
  }

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

export class App implements GameSession {
  static readonly SIGN_SIZE = 140;
  static readonly SIGN_BAR_RATIO = 0.3;
  static readonly SIGN_GAP_RATIO = 0.12;
  static readonly TICK_RING = 4;

  onTick: ((tick: number) => void) | null = null;

  readonly width: number;
  readonly height: number;
  readonly big: PixelFont;
  readonly small: PixelFont;
  games: MiniGame[];
  round: RoundManager;
  gameOver = false;
  readonly startLevel: number;
  /** Index of the mini-game sliding out during the tick-8 switch, or null. */
  transitionFrom: number | null = null;
  private transitionSpan = 0;

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

  get active(): MiniGame {
    return this.games[this.round.index];
  }

  get name(): string {
    return this.active.name;
  }

  get score(): number {
    return this.totalScore;
  }

  get totalScore(): number {
    return this.games.reduce((sum, g) => sum + g.score, 0);
  }

  private applyMultipliers(): void {
    const speed = speedMultiplier(this.round.level);
    const score = scoreMultiplier(this.round.level);
    for (const g of this.games) {
      g.speedMultiplier = speed;
      g.scoreMultiplier = score;
    }
  }

  restart(): void {
    this.games = GAME_ORDER.map((cls) => new cls(this.width, this.height));
    this.round = new RoundManager(this.games.length, LEVEL_START, LEVEL_STEP, LEVEL_FLOOR, this.startLevel);
    this.applyMultipliers();
    this.gameOver = false;
    this.transitionFrom = null;
    this.onTick?.(0);
  }

  /**
   * Progress of the tick-8 slide, 0 at the moment of the switch and 1 exactly
   * when the tick (and therefore the animation) ends.
   */
  get transitionProgress(): number {
    if (this.transitionFrom === null || this.transitionSpan <= 0) return 1;
    const p = 1 - this.round.remaining / this.transitionSpan;
    return Math.max(0, Math.min(1, p));
  }

  drainSounds(): Sfx[] {
    const sounds: Sfx[] = [];
    for (const g of this.games) {
      if (g.sounds.length === 0) continue;
      sounds.push(...g.sounds);
      g.sounds.length = 0;
    }
    return sounds;
  }

  private doSwitch(): void {
    const wrapped = this.round.advance();
    if (wrapped) {
      for (const g of this.games) {
        if (g instanceof AsteroidsGame) g.addWave(AsteroidsGame.WAVE_ON_LOOP);
        if (g instanceof PongGame) g.addBall();
        if (g instanceof SnakeGame) g.addApple();
      }
    }
    for (const g of this.games) g.pressed.clear();
  }

  update(dt: number): void {
    if (this.gameOver) return;

    const tick = this.round.tick(dt);
    if (tick === 0) {
      this.transitionFrom = null;
      this.applyMultipliers();
    }
    if (tick === TICKS_PER_CYCLE - 1) {
      // Swap in the next game and start the slide that fills this whole tick.
      this.transitionFrom = this.round.index;
      this.doSwitch();
      this.transitionSpan = this.round.remaining;
    }
    if (this.round.phase === "play") {
      if (!this.active.update(dt)) this.gameOver = true;
    }
    if (tick >= 0) this.onTick?.(tick);
  }

  handleKeyDown(key: KeyCode): void {
    if (!this.gameOver) this.active.onKeyDown(key);
  }

  handleKeyUp(key: KeyCode): void {
    if (!this.gameOver) this.active.onKeyUp(key);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.transitionFrom !== null) {
      this.drawSwitch(ctx);
    } else {
      this.active.draw(ctx);
    }

    const level = this.big.draw(ctx, `LV ${this.round.level}`, WHITE, HUD_MARGIN, HUD_TOP);
    this.small.draw(ctx, this.active.name, GRAY, HUD_MARGIN + 2, HUD_TOP + level.height + 6);

    drawScore(ctx, this.width, this.big, this.small, this.totalScore, `x${scoreMultiplier(this.round.level).toFixed(1)}`);

    if (!this.gameOver && this.round.phase !== "play") {
      this.drawPhaseSign(ctx);
    }

    this.drawTickRing(ctx);
  }

  /**
   * Tick-8 slide: the outgoing mini-game screen exits to the left while the
   * incoming one enters from the right, over a full tick with ease-in-out.
   */
  private drawSwitch(ctx: CanvasRenderingContext2D): void {
    const from = this.games[this.transitionFrom!];
    const p = this.transitionProgress;
    const eased = p * p * (3 - 2 * p);
    const offset = eased * this.width;

    ctx.fillStyle = rgb(BLACK);
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(-offset, 0);
    from.draw(ctx);
    ctx.restore();

    ctx.save();
    ctx.translate(this.width - offset, 0);
    this.active.draw(ctx);
    ctx.restore();
  }

  private drawTickRing(ctx: CanvasRenderingContext2D): void {
    const t = App.TICK_RING;
    const w = this.width;
    const h = this.height;
    const innerH = h - t * 2;
    const halfH = Math.floor(innerH / 2);
    const halfW = Math.floor(w / 2);

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

  private drawPhaseSign(ctx: CanvasRenderingContext2D): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const size = App.SIGN_SIZE;

    ctx.save();
    ctx.fillStyle = "rgba(8,8,16,0.55)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = rgb(WHITE);

    const bar = size * App.SIGN_BAR_RATIO;
    const half = size * App.SIGN_GAP_RATIO;
    ctx.fillRect(cx - half - bar, cy - size / 2, bar, size);
    ctx.fillRect(cx + half, cy - size / 2, bar, size);
    ctx.restore();
  }
}
