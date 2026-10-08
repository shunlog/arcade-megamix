import type { Color, PixelFont } from "./config.js";
import { WHITE, rgb } from "./config.js";

export interface OverlayLine {
  text: string;
  color: Color;
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  big: PixelFont,
  small: PixelFont,
  title: string,
  lines: readonly OverlayLine[],
): void {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, width, height);

  const titleSurface = big.render(title, WHITE);
  ctx.drawImage(titleSurface, Math.floor((width - titleSurface.width) / 2), height / 2 - 60);

  let y = height / 2;
  for (const line of lines) {
    const surface = small.render(line.text, line.color);
    ctx.drawImage(surface, Math.floor((width - surface.width) / 2), y);
    y += 40;
  }
}

export function fillCircle(
  ctx: CanvasRenderingContext2D,
  color: Color,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.fillStyle = rgb(color);
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
  ctx.fill();
}

export function strokeCircle(
  ctx: CanvasRenderingContext2D,
  color: Color,
  x: number,
  y: number,
  radius: number,
  width = 1,
): void {
  ctx.strokeStyle = rgb(color);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
  ctx.stroke();
}

export function strokePolygon(
  ctx: CanvasRenderingContext2D,
  color: Color,
  points: ReadonlyArray<readonly [number, number]>,
  width = 1,
): void {
  if (points.length === 0) return;
  ctx.strokeStyle = rgb(color);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.stroke();
}

export function fillPolygon(
  ctx: CanvasRenderingContext2D,
  color: Color,
  points: ReadonlyArray<readonly [number, number]>,
): void {
  if (points.length === 0) return;
  ctx.fillStyle = rgb(color);
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

export function fillDiscMinusWedge(
  ctx: CanvasRenderingContext2D,
  color: Color,
  x: number,
  y: number,
  radius: number,
  angle: number,
  mouth: number,
): void {
  ctx.fillStyle = rgb(color);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, Math.max(0, radius), angle + mouth, angle - mouth + Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

export function fillRect(
  ctx: CanvasRenderingContext2D,
  color: Color,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 0,
): void {
  ctx.fillStyle = rgb(color);
  beginRoundedRect(ctx, x, y, w, h, radius);
  ctx.fill();
}

export function beginRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}
