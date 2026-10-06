// Browser entry point: wires the canvas, input and main loop.
//
// The game boots into a startup menu. From there the player can start the
// full "megamix" rotation or open a sub-menu that launches a single
// mini-game. There is no URL-based game selection any more.

import { BLACK, GRAY, PixelFont, SCREEN_H, SCREEN_W, WHITE } from "./config.js";
import { App } from "./app.js";
import { GAME_ENTRIES } from "./games/index.js";
import { Menu } from "./menu.js";
import { StandaloneRunner } from "./runner.js";
import { Buzzer } from "./sound.js";
import { Keys, type KeyCode } from "./keys.js";

type Screen = "menu" | "minigames" | "megamix" | "standalone";

function isTypingKey(code: string): boolean {
  return code === Keys.UP || code === Keys.DOWN || code === Keys.LEFT || code === Keys.RIGHT || code === Keys.SPACE;
}

/** Map a mouse event to canvas coordinates, honouring the CSS letterbox. */
function canvasPoint(canvas: HTMLCanvasElement, event: MouseEvent): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / SCREEN_W, rect.height / SCREEN_H);
  const offsetX = (rect.width - SCREEN_W * scale) / 2;
  const offsetY = (rect.height - SCREEN_H * scale) / 2;
  return [(event.clientX - rect.left - offsetX) / scale, (event.clientY - rect.top - offsetY) / scale];
}

function start(): void {
  const canvas = document.getElementById("game") as HTMLCanvasElement | null;
  if (canvas === null) throw new Error("missing #game canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const big = new PixelFont(3);
  const small = new PixelFont(2);

  let screen: Screen = "menu";
  let app: App | null = null;
  let runner: StandaloneRunner | null = null;
  let paused = false;

  const buzzer = new Buzzer();

  const showMenu = (): void => {
    screen = "menu";
    app = null;
    runner = null;
    paused = false;
  };

  const startMegamix = (): void => {
    app = new App(SCREEN_W, SCREEN_H);
    runner = null;
    paused = false;
    screen = "megamix";
    buzzer.tick(0); // play begins on tick 0
  };

  const startStandalone = (ctor: (typeof GAME_ENTRIES)[number]["ctor"]): void => {
    runner = new StandaloneRunner(ctor, SCREEN_W, SCREEN_H);
    app = null;
    paused = false;
    screen = "standalone";
  };

  const mainMenu = new Menu(
    "ARCADE MEGAMIX",
    [
      { label: "PLAY", onSelect: startMegamix },
      { label: "MINI-GAMES", onSelect: () => (screen = "minigames") },
    ],
    big,
    small,
    "SELECT MODE",
  );

  const miniMenu = new Menu(
    "MINI-GAMES",
    [
      ...GAME_ENTRIES.map((entry) => ({
        label: entry.label,
        onSelect: () => startStandalone(entry.ctor),
      })),
      { label: "BACK", onSelect: showMenu },
    ],
    big,
    small,
  );

  const activeMenu = (): Menu | null => (screen === "menu" ? mainMenu : screen === "minigames" ? miniMenu : null);

  const keyDown = (event: KeyboardEvent): void => {
    const code = event.code as KeyCode;
    if (isTypingKey(code)) event.preventDefault();
    buzzer.resume(); // unlock audio from a user gesture

    const menu = activeMenu();
    if (menu !== null) {
      if (screen === "minigames" && code === Keys.ESC) {
        showMenu();
        return;
      }
      menu.handleKeyDown(code);
      return;
    }

    const dead = screen === "megamix" ? app!.gameOver : !runner!.game.alive;

    if (code === Keys.ESC) {
      if (!dead) paused = !paused;
      return;
    }
    if (code === Keys.P) {
      if (!dead) paused = !paused;
      return;
    }
    if (paused && code === Keys.Q) {
      showMenu();
      return;
    }
    if (paused) return;

    if (dead) {
      if (code === Keys.Q) {
        showMenu();
        return;
      }
      if (code === Keys.R) {
        if (screen === "megamix") {
          app!.restart();
          buzzer.tick(0);
        } else {
          runner!.game.reset();
        }
      }
      return;
    }

    if (screen === "megamix") app!.handleKeyDown(code);
    else runner!.handleKeyDown(code);
  };

  const keyUp = (event: KeyboardEvent): void => {
    const code = event.code as KeyCode;
    if (isTypingKey(code)) event.preventDefault();
    if (activeMenu() !== null) return;
    if (screen === "megamix") app!.handleKeyUp(code);
    else runner!.handleKeyUp(code);
  };

  const mouseMove = (event: MouseEvent): void => {
    const menu = activeMenu();
    if (menu === null) {
      canvas.style.cursor = "default";
      return;
    }
    const [x, y] = canvasPoint(canvas, event);
    menu.handleMouseMove(x, y);
    canvas.style.cursor = menu.isOver(x, y) ? "pointer" : "default";
  };

  const click = (event: MouseEvent): void => {
    buzzer.resume(); // unlock audio from a user gesture
    const menu = activeMenu();
    if (menu === null) return;
    const [x, y] = canvasPoint(canvas, event);
    menu.handleClick(x, y);
  };

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  canvas.addEventListener("mousemove", mouseMove);
  canvas.addEventListener("click", click);

  const drawPause = (): void => {
    ctx.fillStyle = `rgba(${BLACK[0]},${BLACK[1]},${BLACK[2]},0.6)`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const title = big.render("PAUSED", WHITE);
    ctx.drawImage(title, Math.floor((SCREEN_W - title.width) / 2), SCREEN_H / 2 - 40);
    const hint = small.render("P OR ESC RESUME    Q QUIT TO MENU", GRAY);
    ctx.drawImage(hint, Math.floor((SCREEN_W - hint.width) / 2), SCREEN_H / 2 + 30);
  };

  let last = performance.now();
  const frame = (now: number): void => {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1; // avoid huge jumps after tab switches

    if (screen === "menu") {
      mainMenu.draw(ctx, SCREEN_W, SCREEN_H);
    } else if (screen === "minigames") {
      miniMenu.draw(ctx, SCREEN_W, SCREEN_H);
    } else if (screen === "megamix") {
      if (!paused) {
        const tick = app!.update(dt);
        if (tick >= 0) buzzer.tick(tick);
      }
      app!.draw(ctx);
      if (paused) drawPause();
    } else {
      if (!paused) runner!.update(dt);
      runner!.draw(ctx);
      if (paused) drawPause();
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
