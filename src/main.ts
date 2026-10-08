import { GRAY, PixelFont, SCREEN_H, SCREEN_W } from "./config.js";
import { App } from "./app.js";
import { drawOverlay } from "./draw.js";
import { GAME_ENTRIES } from "./games/index.js";
import { Menu } from "./menu.js";
import { StandaloneRunner } from "./runner.js";
import { drawGameOver, type GameSession } from "./session.js";
import { Buzzer } from "./sound.js";
import { Keys, type KeyCode } from "./keys.js";

const PREVENT_DEFAULT: ReadonlySet<string> = new Set<string>([
  Keys.UP,
  Keys.DOWN,
  Keys.LEFT,
  Keys.RIGHT,
  Keys.SPACE,
]);

type Screen =
  | { kind: "menu"; menu: Menu }
  | { kind: "game"; session: GameSession; paused: boolean; deathAnnounced: boolean };

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
  const buzzer = new Buzzer();

  const openGame = (session: GameSession): void => {
    session.onTick = (tick) => buzzer.tick(tick);
    screen = { kind: "game", session, paused: false, deathAnnounced: false };
    buzzer.sfx("start");
  };

  const startMegamix = (startLevel: number): void => openGame(new App(SCREEN_W, SCREEN_H, startLevel));
  const startStandalone = (entry: (typeof GAME_ENTRIES)[number]): void =>
    openGame(new StandaloneRunner(entry.ctor, SCREEN_W, SCREEN_H));

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
      ...GAME_ENTRIES.map((entry) => ({ label: entry.label, onSelect: () => startStandalone(entry) })),
      { label: "BACK", onSelect: showMenu },
    ],
    big,
    small,
  );

  const mainMenu = new Menu(
    "ARCADE MEGAMIX",
    [
      { label: "PLAY", onSelect: () => (screen = { kind: "menu", menu: difficultyMenu }) },
      { label: "MINI-GAMES", onSelect: () => (screen = { kind: "menu", menu: miniMenu }) },
    ],
    big,
    small,
    "SELECT MODE",
  );

  let screen: Screen = { kind: "menu", menu: mainMenu };

  function showMenu(): void {
    screen = { kind: "menu", menu: mainMenu };
  }

  for (const menu of [mainMenu, difficultyMenu, miniMenu]) {
    menu.onMove = () => buzzer.sfx("menuMove");
    menu.onActivate = () => buzzer.sfx("menuSelect");
  }

  const drawPause = (): void => {
    drawOverlay(ctx, SCREEN_W, SCREEN_H, big, small, "PAUSED", [
      { text: "P / ESC = RESUME    Q = MENU", color: GRAY },
    ]);
  };

  const keyDown = (event: KeyboardEvent): void => {
    const code = event.code as KeyCode;
    if (PREVENT_DEFAULT.has(code)) event.preventDefault();
    buzzer.resume();

    if (screen.kind === "menu") {
      if (screen.menu !== mainMenu && code === Keys.ESC) {
        buzzer.sfx("quit");
        showMenu();
        return;
      }
      screen.menu.handleKeyDown(code);
      return;
    }

    const { session } = screen;

    if (!session.gameOver && (code === Keys.ESC || code === Keys.P)) {
      screen.paused = !screen.paused;
      buzzer.sfx(screen.paused ? "pause" : "resume");
      return;
    }
    if (screen.paused) {
      if (code === Keys.Q) {
        buzzer.sfx("quit");
        showMenu();
      }
      return;
    }
    if (session.gameOver) {
      if (code === Keys.Q) {
        buzzer.sfx("quit");
        showMenu();
      } else if (code === Keys.R) {
        screen.deathAnnounced = false;
        session.restart();
      }
      return;
    }

    session.handleKeyDown(code);
  };

  const keyUp = (event: KeyboardEvent): void => {
    const code = event.code as KeyCode;
    if (PREVENT_DEFAULT.has(code)) event.preventDefault();
    if (screen.kind === "game") screen.session.handleKeyUp(code);
  };

  const mouseMove = (event: MouseEvent): void => {
    if (screen.kind !== "menu") {
      canvas.style.cursor = "default";
      return;
    }
    const [x, y] = canvasPoint(canvas, event);
    screen.menu.handleMouseMove(x, y);
    canvas.style.cursor = screen.menu.isOver(x, y) ? "pointer" : "default";
  };

  const click = (event: MouseEvent): void => {
    buzzer.resume();
    if (screen.kind !== "menu") return;
    const [x, y] = canvasPoint(canvas, event);
    screen.menu.handleClick(x, y);
  };

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  canvas.addEventListener("mousemove", mouseMove);
  canvas.addEventListener("click", click);

  let last = performance.now();
  const frame = (now: number): void => {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;

    if (screen.kind === "menu") {
      screen.menu.draw(ctx, SCREEN_W, SCREEN_H);
    } else {
      const { session } = screen;
      if (!screen.paused) {
        session.update(dt);
        for (const name of session.drainSounds()) buzzer.sfx(name);
      }
      session.draw(ctx);

      if (session.gameOver && !screen.deathAnnounced) {
        screen.deathAnnounced = true;
        buzzer.sfx("death");
      }
      if (session.gameOver) {
        drawGameOver(ctx, SCREEN_W, SCREEN_H, big, small, session.score);
      } else if (screen.paused) {
        drawPause();
      }
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
