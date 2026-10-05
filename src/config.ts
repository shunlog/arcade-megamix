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

// --- Bitmap pixel font ------------------------------------------------------
// A hand-authored 5x7 glyph set drawn one square at a time. Because every
// pixel is painted at an integer scale there is no anti-aliasing, so the
// result stays razor sharp at any size (unlike scaling a system font up).

const GLYPH_W = 5;
const GLYPH_H = 7;
const GLYPH_GAP = 1; // in glyph pixels, before scaling

type Glyph = readonly [string, string, string, string, string, string, string];

const GLYPHS: Record<string, Glyph> = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#..##", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".#...", "#...."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".#...", "#...."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  "\"": [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "*": [".....", "#.#.#", ".###.", "#####", ".###.", "#.#.#", "....."],
  "/": ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
  "\\": ["#....", ".#...", ".#...", "..#..", "...#.", "...#.", "....#"],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "[": [".###.", ".#...", ".#...", ".#...", ".#...", ".#...", ".###."],
  "]": [".###.", "...#.", "...#.", "...#.", "...#.", "...#.", ".###."],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
  ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
  "_": [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", ".#.##", "#..##"],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
};

/**
 * A true bitmap pixel font: each 5x7 glyph is painted as integer-aligned
 * squares, so edges stay perfectly sharp with no anti-aliasing blur.
 */
export class PixelFont {
  readonly scale: number;

  constructor(scale = 3) {
    this.scale = Math.max(1, Math.floor(scale));
  }

  /** Height of one line of text in device pixels. */
  get height(): number {
    return GLYPH_H * this.scale;
  }

  /** Width of a single character cell (glyph + spacing) in device pixels. */
  get advance(): number {
    return (GLYPH_W + GLYPH_GAP) * this.scale;
  }

  /** Render `text` to an offscreen canvas so it can be drawn blocky. */
  render(text: string, color: Color, scale: number = this.scale): HTMLCanvasElement {
    const s = Math.max(1, Math.floor(scale));
    const chars = Array.from(text.toUpperCase());
    const advance = (GLYPH_W + GLYPH_GAP) * s;
    const width = Math.max(1, chars.length * advance - GLYPH_GAP * s);
    const height = GLYPH_H * s;

    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const octx = out.getContext("2d")!;
    octx.imageSmoothingEnabled = false;
    octx.fillStyle = rgb(color);

    chars.forEach((ch, i) => {
      const glyph = GLYPHS[ch] ?? GLYPHS["?"];
      const ox = i * advance;
      for (let row = 0; row < GLYPH_H; row++) {
        const bits = glyph[row];
        for (let col = 0; col < GLYPH_W; col++) {
          if (bits[col] === "#") octx.fillRect(ox + col * s, row * s, s, s);
        }
      }
    });
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
