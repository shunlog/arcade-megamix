import type { MiniGame } from "./base.js";
import { AsteroidsGame } from "./asteroids.js";
import { PacmanGame } from "./pacman.js";
import { PongGame } from "./pong.js";
import { SnakeGame } from "./snake.js";
import { TronGame } from "./tron.js";

export type MiniGameCtor = new (width: number, height: number) => MiniGame;

export interface GameEntry {
  id: string;
  label: string;
  ctor: MiniGameCtor;
}

export const GAME_ENTRIES: readonly GameEntry[] = [
  { id: "snake", label: "SNAKE", ctor: SnakeGame },
  { id: "asteroids", label: "ASTEROIDS", ctor: AsteroidsGame },
  { id: "pong", label: "PONG", ctor: PongGame },
  { id: "tron", label: "TRON", ctor: TronGame },
  { id: "pacman", label: "PAC-MAN", ctor: PacmanGame },
];

export const GAME_ORDER: readonly MiniGameCtor[] = GAME_ENTRIES.map((entry) => entry.ctor);

export { AsteroidsGame, PacmanGame, PongGame, SnakeGame, TronGame };
export { MiniGame } from "./base.js";
