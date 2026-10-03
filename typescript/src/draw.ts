// Drawing helpers for the canvas port of pygame's primitives.

import type { Color } from "./config.js";
import { rgb } from "./config.js";

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

/** Python's `%` semantics (result has the sign of the divisor). */
export function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}
