// Shared constants, colors and a chunky pixel font helper.

export const SCREEN_W = 800;
export const SCREEN_H = 600;
export const FPS = 60;

export type Color = readonly [number, number, number];

// --- Palette ----------------------------------------------------------------
export const BLACK: Color = [8, 8, 16];
export const WHITE: Color = [240, 240, 240];
export const GRAY: Color = [90, 90, 110];
export const DARK: Color = [24, 24, 38];

export const SNAKE_GREEN: Color = [86, 191, 74];
export const SNAKE_HEAD: Color = [140, 220, 90];
export const APPLE_RED: Color = [222, 58, 58];

export const ASTEROID_GRAY: Color = [170, 170, 180];
export const SHIP_WHITE: Color = [235, 235, 245];
export const BULLET_YELLOW: Color = [250, 230, 120];

export const PONG_WHITE: Color = [240, 240, 240];
export const PONG_ACCENT: Color = [120, 200, 255];

export const TRON_PLAYER: Color = [90, 200, 255];
export const TRON_ENEMY: Color = [255, 120, 90];
export const TRON_GRID: Color = [20, 30, 45];

export const PAC_YELLOW: Color = [250, 220, 40];
export const GHOST_RED: Color = [230, 60, 60];
export const GHOST_PINK: Color = [240, 140, 190];
export const GHOST_CYAN: Color = [90, 220, 230];
export const PELLET: Color = [240, 210, 160];

// --- Scoring (normalised across games) --------------------------------------
// Pac-Man pellet is the baseline: 1 point.
export const SCORE_PAC_PELLET = 1;
export const SCORE_SNAKE_APPLE = 5;
export const SCORE_PONG_HIT = 1;
export const SCORE_PONG_GOAL = 10;
export const SCORE_ASTEROID_BIG = 10;
export const SCORE_ASTEROID_SMALL = 5;
export const SCORE_TRON_KILL = 25;

/** Format a colour tuple as a canvas fillStyle string. */
export function rgb(color: Color): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

/**
 * A cheap pixel font: render small without anti-aliasing, then scale up.
 * Keeps the project asset-free while giving the requested big blocky look.
 */
export class PixelFont {
  readonly baseSize: number;
  readonly scale: number;

  constructor(size = 12, scale = 3) {
    this.baseSize = size;
    this.scale = scale;
  }

  /** Render `text` to an offscreen canvas so it can be drawn blocky. */
  render(text: string, color: Color, scale: number = this.scale): HTMLCanvasElement {
    const probe = document.createElement("canvas");
    const pctx = probe.getContext("2d")!;
    const font = `bold ${this.baseSize}px "Courier New", monospace`;
    pctx.font = font;
    const width = Math.max(1, Math.ceil(pctx.measureText(text).width));
    const height = Math.max(1, Math.ceil(this.baseSize * 1.25));

    const low = document.createElement("canvas");
    low.width = width;
    low.height = height;
    const lctx = low.getContext("2d")!;
    lctx.font = font;
    lctx.textBaseline = "top";
    lctx.fillStyle = rgb(color);
    lctx.fillText(text, 0, 0);

    const out = document.createElement("canvas");
    out.width = Math.max(1, width * scale);
    out.height = Math.max(1, height * scale);
    const octx = out.getContext("2d")!;
    octx.imageSmoothingEnabled = false;
    octx.drawImage(low, 0, 0, out.width, out.height);
    return out;
  }

  /** Draw `text` at (`x`, `y`) and return the rendered surface. */
  draw(
    ctx: CanvasRenderingContext2D,
    text: string,
    color: Color,
    x: number,
    y: number,
    scale: number = this.scale,
  ): HTMLCanvasElement {
    const surface = this.render(text, color, scale);
    ctx.drawImage(surface, x, y);
    return surface;
  }
}
