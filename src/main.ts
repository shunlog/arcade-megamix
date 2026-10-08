import { GRAY, PixelFont, SCREEN_H, SCREEN_W } from "./config.js";
import { App } from "./app.js";
import { drawOverlay } from "./draw.js";
import { GAME_ENTRIES, type MiniGame } from "./games/index.js";
import { Menu } from "./menu.js";
import { StandaloneRunner } from "./runner.js";
import { Buzzer } from "./sound.js";
import { Keys, type KeyCode } from "./keys.js";

type Screen = "menu" | "minigames" | "difficulty" | "megamix" | "standalone";

function isTypingKey(code: string): boolean {
  return code === Keys.UP || code === Keys.DOWN || code === Keys.LEFT || code === Keys.RIGHT || code === Keys.SPACE;
}

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

  const playSound = (game: MiniGame): void => {
    if (game.sounds.length === 0) return;
    for (const name of game.sounds) buzzer.sfx(name);
    game.sounds.length = 0;
  };

  let deathAnnounced = false;

  const showMenu = (): void => {
    screen = "menu";
    app = null;
    runner = null;
    paused = false;
    deathAnnounced = false;
  };

  const startMegamix = (startLevel: number): void => {
    app = new App(SCREEN_W, SCREEN_H, startLevel);
    runner = null;
    paused = false;
    deathAnnounced = false;
    screen = "megamix";
    buzzer.sfx("start");
    buzzer.tick(0);
  };

  const startStandalone = (ctor: (typeof GAME_ENTRIES)[number]["ctor"]): void => {
    runner = new StandaloneRunner(ctor, SCREEN_W, SCREEN_H);
    app = null;
    paused = false;
    deathAnnounced = false;
    screen = "standalone";
    buzzer.sfx("start");
  };

  const mainMenu = new Menu(
    "ARCADE MEGAMIX",
    [
      { label: "PLAY", onSelect: () => (screen = "difficulty") },
      { label: "MINI-GAMES", onSelect: () => (screen = "minigames") },
    ],
    big,
    small,
    "SELECT MODE",
  );

  const difficultyMenu = new Menu(
    "DIFFICULTY",
    [
      { label: "EASY", onSelect: () => startMegamix(0) },
      { label: "MEDIUM", onSelect: () => startMegamix(3) },
      { label: "HARD", onSelect: () => startMegamix(6) },
      { label: "BACK", onSelect: showMenu },
    ],
    big,
    small,
    "STARTING LEVEL 0 / 3 / 6",
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

  const activeMenu = (): Menu | null =>
    screen === "menu"
      ? mainMenu
      : screen === "minigames"
        ? miniMenu
        : screen === "difficulty"
          ? difficultyMenu
          : null;

  for (const menu of [mainMenu, difficultyMenu, miniMenu]) {
    menu.onMove = () => buzzer.sfx("menuMove");
    menu.onActivate = () => buzzer.sfx("menuSelect");
  }

  const keyDown = (event: KeyboardEvent): void => {
    const code = event.code as KeyCode;
    if (isTypingKey(code)) event.preventDefault();
    buzzer.resume();

    const menu = activeMenu();
    if (menu !== null) {
      if ((screen === "minigames" || screen === "difficulty") && code === Keys.ESC) {
        buzzer.sfx("quit");
        showMenu();
        return;
      }
      menu.handleKeyDown(code);
      return;
    }

    const dead = screen === "megamix" ? app!.gameOver : !runner!.game.alive;

    if (code === Keys.ESC) {
      if (!dead) {
        paused = !paused;
        buzzer.sfx(paused ? "pause" : "resume");
      }
      return;
    }
    if (code === Keys.P) {
      if (!dead) {
        paused = !paused;
        buzzer.sfx(paused ? "pause" : "resume");
      }
      return;
    }
    if (paused && code === Keys.Q) {
      buzzer.sfx("quit");
      showMenu();
      return;
    }
    if (paused) return;

    if (dead) {
      if (code === Keys.Q) {
        buzzer.sfx("quit");
        showMenu();
        return;
      }
      if (code === Keys.R) {
        deathAnnounced = false;
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
    buzzer.resume();
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
    drawOverlay(ctx, SCREEN_W, SCREEN_H, big, small, "PAUSED", [
      { text: "P / ESC = RESUME    Q = MENU", color: GRAY },
    ]);
  };

  let last = performance.now();
  const frame = (now: number): void => {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;

    if (screen === "menu") {
      mainMenu.draw(ctx, SCREEN_W, SCREEN_H);
    } else if (screen === "minigames") {
      miniMenu.draw(ctx, SCREEN_W, SCREEN_H);
    } else if (screen === "difficulty") {
      difficultyMenu.draw(ctx, SCREEN_W, SCREEN_H);
    } else if (screen === "megamix") {
      if (!paused) {
        const tick = app!.update(dt);
        if (tick >= 0) buzzer.tick(tick);
        for (const g of app!.games) playSound(g);
      }
      if (app!.gameOver && !deathAnnounced) {
        deathAnnounced = true;
        buzzer.sfx("death");
      }
      app!.draw(ctx);
      if (paused) drawPause();
    } else {
      if (!paused) {
        runner!.update(dt);
        playSound(runner!.game);
      }
      if (!runner!.game.alive && !deathAnnounced) {
        deathAnnounced = true;
        buzzer.sfx("death");
      }
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
