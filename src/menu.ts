// Canvas menus used for the startup screen and the mini-game picker.
//
// A menu is a list of labelled buttons navigated with the arrow keys / WASD
// and activated with Enter or Space. The same buttons also respond to the
// mouse, so clicking works too.

import { BLACK, DARK, GRAY, PixelFont, WHITE, rgb } from "./config.js";
import { fillRect } from "./draw.js";
import { Keys } from "./keys.js";

export interface MenuItem {
  label: string;
  onSelect: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Menu {
  selected = 0;
  private rects: Rect[] = [];

  constructor(
    readonly title: string,
    readonly items: MenuItem[],
    readonly big: PixelFont,
    readonly small: PixelFont,
    readonly subtitle = "",
  ) {}

  /** Move the selection, wrapping around the ends. */
  move(delta: number): void {
    const n = this.items.length;
    if (n === 0) return;
    this.selected = (this.selected + delta + n) % n;
  }

  activate(): void {
    this.items[this.selected]?.onSelect();
  }

  /** Returns true when the menu consumed the key. */
  handleKeyDown(key: string): boolean {
    if (key === Keys.UP || key === Keys.W) {
      this.move(-1);
      return true;
    }
    if (key === Keys.DOWN || key === Keys.S) {
      this.move(1);
      return true;
    }
    if (key === Keys.ENTER || key === Keys.SPACE) {
      this.activate();
      return true;
    }
    return false;
  }

  handleMouseMove(x: number, y: number): void {
    const hit = this.hitTest(x, y);
    if (hit >= 0) this.selected = hit;
  }

  /** True when (`x`, `y`) is inside one of the buttons. */
  isOver(x: number, y: number): boolean {
    return this.hitTest(x, y) >= 0;
  }

  handleClick(x: number, y: number): void {
    const hit = this.hitTest(x, y);
    if (hit < 0) return;
    this.selected = hit;
    this.activate();
  }

  private hitTest(x: number, y: number): number {
    return this.rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = rgb(BLACK);
    ctx.fillRect(0, 0, width, height);

    const titleY = 60;
    const title = this.big.render(this.title, WHITE);
    ctx.drawImage(title, Math.floor((width - title.width) / 2), titleY);

    let titleBottom = titleY + title.height;
    if (this.subtitle !== "") {
      const sub = this.small.render(this.subtitle, GRAY);
      ctx.drawImage(sub, Math.floor((width - sub.width) / 2), titleBottom + 14);
      titleBottom += 14 + sub.height;
    }

    const rowH = this.big.height;
    const padX = 30;
    const padY = 12;
    const gap = 20;
    const totalH = this.items.length * (rowH + padY * 2) + Math.max(0, this.items.length - 1) * gap;
    let y = Math.max(titleBottom + 36, Math.floor((height - totalH) / 2));

    this.rects = [];
    this.items.forEach((item, i) => {
      const active = i === this.selected;
      const surface = this.big.render(item.label, active ? WHITE : GRAY);
      const w = surface.width + padX * 2;
      const h = rowH + padY * 2;
      const x = Math.floor((width - w) / 2);
      const ry = y - padY;

      this.rects.push({ x, y: ry, w, h });
      if (active) fillRect(ctx, DARK, x, ry, w, h, 8);

      ctx.strokeStyle = rgb(active ? WHITE : GRAY);
      ctx.lineWidth = active ? 3 : 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(x + 1, ry + 1, w - 2, h - 2, 8);
      else ctx.rect(x, ry, w, h);
      ctx.stroke();

      ctx.drawImage(surface, Math.floor((width - surface.width) / 2), y);
      y += h + gap;
    });

    const hint = this.small.render("ARROWS / WASD MOVE   ENTER SELECT", GRAY);
    ctx.drawImage(hint, Math.floor((width - hint.width) / 2), height - 48);
  }
}
