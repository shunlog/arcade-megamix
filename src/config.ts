export const SCREEN_W = 800;
export const SCREEN_H = 600;
export const FPS = 60;

export type Color = readonly [number, number, number];

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

export const SCORE_PAC_PELLET = 1;
export const SCORE_SNAKE_APPLE = 5;
export const SCORE_PONG_HIT = 5;
export const SCORE_PONG_GOAL = 10;
export const SCORE_ASTEROID_BIG = 10;
export const SCORE_ASTEROID_SMALL = 5;
export const SCORE_TRON_KILL = 25;

export const LEVEL_START = 10.0;
export const LEVEL_STEP = 1.0;
export const LEVEL_FLOOR = 3.0;

export const PLAY_TICKS = 7;
export const PAUSE_TICKS = 1;
export const TICKS_PER_CYCLE = PLAY_TICKS + PAUSE_TICKS;

export const SPEED_PER_LEVEL = 0.1;

export function speedMultiplier(level: number): number {
  return 1.0 + Math.max(0, level) * SPEED_PER_LEVEL;
}

// --- Global score multiplier -------------------------------------------------
// Every point award is scaled by this factor and rounded up to an integer. It
// starts at 1.0 and grows at an accelerating rate: the level-1 step adds 0.1,
// the level-2 step adds 0.2, the level-3 step adds 0.3, and so on. So the
// value is 1.0, 1.1, 1.3, 1.6, 2.0, 2.5, ...
export const SCORE_PER_LEVEL_STEP = 0.1;

export function scoreMultiplier(level: number): number {
  const n = Math.max(0, level);
  return 1.0 + (SCORE_PER_LEVEL_STEP * (n * (n + 1))) / 2;
}

export function rgb(color: Color): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

const GLYPH_W = 5;
const GLYPH_H = 7;
const GLYPH_GAP = 1;

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

export class PixelFont {
  readonly scale: number;

  constructor(scale = 3) {
    this.scale = Math.max(1, Math.floor(scale));
  }

  get height(): number {
    return GLYPH_H * this.scale;
  }

  get advance(): number {
    return (GLYPH_W + GLYPH_GAP) * this.scale;
  }

  render(text: string, color: Color): HTMLCanvasElement {
    const s = this.scale;
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

  draw(
    ctx: CanvasRenderingContext2D,
    text: string,
    color: Color,
    x: number,
    y: number,
  ): HTMLCanvasElement {
    const surface = this.render(text, color);
    ctx.drawImage(surface, x, y);
    return surface;
  }
}
