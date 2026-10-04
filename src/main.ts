// Browser entry point: wires the canvas, input and main loop.

import { BLACK, GRAY, PixelFont, SCREEN_H, SCREEN_W, WHITE } from "./config.js";
import { App } from "./app.js";
import { AsteroidsGame } from "./games/asteroids.js";
import { PacmanGame } from "./games/pacman.js";
import { PongGame } from "./games/pong.js";
import { SnakeGame } from "./games/snake.js";
import { TronGame } from "./games/tron.js";
import type { StandaloneCtor } from "./runner.js";
import { StandaloneRunner } from "./runner.js";
import { Keys, type KeyCode } from "./keys.js";

const gameByName: Record<string, StandaloneCtor> = {
  snake: SnakeGame,
  asteroids: AsteroidsGame,
  pong: PongGame,
  tron: TronGame,
  pacman: PacmanGame,
  "pac-man": PacmanGame,
};

function requestedGame(): StandaloneCtor | null {
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get("game") ?? window.location.hash.replace(/^#/, "")).toLowerCase().trim();
  if (raw === "" || raw === "megamix" || raw === "all") return null;
  return gameByName[raw] ?? null;
}

function isTypingKey(code: string): boolean {
  return code === Keys.UP || code === Keys.DOWN || code === Keys.LEFT || code === Keys.RIGHT || code === Keys.SPACE;
}

function start(): void {
  const canvas = document.getElementById("game") as HTMLCanvasElement | null;
  if (canvas === null) throw new Error("missing #game canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const standalone = requestedGame();
  const app = standalone === null ? new App(SCREEN_W, SCREEN_H) : new StandaloneRunner(standalone, SCREEN_W, SCREEN_H);
  const big = new PixelFont(14, 3);
  const small = new PixelFont(10, 2);

  let paused = false;
  let last = performance.now();

  const keyDown = (event: KeyboardEvent): void => {
    const code = event.code as KeyCode;
    if (isTypingKey(code)) event.preventDefault();

    // Escape/P toggles pause in the browser (pygame quits; the web has no quit).
    if (code === Keys.ESC || code === Keys.P) {
      paused = !paused;
      return;
    }
    if (paused) return;
    app.handleKeyDown(code);
  };

  const keyUp = (event: KeyboardEvent): void => {
    const code = event.code as KeyCode;
    if (isTypingKey(code)) event.preventDefault();
    app.handleKeyUp(code);
  };

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  const frame = (now: number): void => {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1; // avoid huge jumps after tab switches

    if (!paused) app.update(dt);
    app.draw(ctx);

    if (paused) {
      ctx.fillStyle = `rgba(${BLACK[0]},${BLACK[1]},${BLACK[2]},0.6)`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      const paused0 = big.render("PAUSED", WHITE);
      ctx.drawImage(paused0, Math.floor((SCREEN_W - paused0.width) / 2), SCREEN_H / 2 - 30);
      const hint = small.render("press P or ESC to resume", GRAY);
      ctx.drawImage(hint, Math.floor((SCREEN_W - hint.width) / 2), SCREEN_H / 2 + 30);
    }

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
