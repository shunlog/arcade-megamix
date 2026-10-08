import { GRAY, PixelFont, WHITE } from "./config.js";
import { drawOverlay } from "./draw.js";
import type { KeyCode } from "./keys.js";
import type { Sfx } from "./sound.js";

export const HUD_MARGIN = 16;
export const HUD_TOP = 12;

export interface GameSession {
  onTick: ((tick: number) => void) | null;
  readonly gameOver: boolean;
  readonly name: string;
  readonly score: number;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  handleKeyDown(key: KeyCode): void;
  handleKeyUp(key: KeyCode): void;
  restart(): void;
  drainSounds(): Sfx[];
}

export function drawScore(
  ctx: CanvasRenderingContext2D,
  width: number,
  big: PixelFont,
  small: PixelFont,
  score: number,
  caption?: string,
): void {
  const surface = big.render(String(score).padStart(6, "0"), WHITE);
  ctx.drawImage(surface, width - surface.width - HUD_MARGIN, HUD_TOP);

  if (caption === undefined) return;
  const extra = small.render(caption, GRAY);
  ctx.drawImage(extra, width - extra.width - HUD_MARGIN, HUD_TOP + surface.height + 6);
}

export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  big: PixelFont,
  small: PixelFont,
  score: number,
): void {
  drawOverlay(ctx, width, height, big, small, "GAME OVER", [
    { text: `FINAL SCORE ${score}`, color: GRAY },
    { text: "R = RESTART    Q = MENU", color: GRAY },
  ]);
}
