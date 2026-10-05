// Mini-game exports, in switching order.

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

// Every mini-game with a stable id and menu label, in switching order.
export const GAME_ENTRIES: readonly GameEntry[] = [
  { id: "snake", label: "SNAKE", ctor: SnakeGame },
  { id: "asteroids", label: "ASTEROIDS", ctor: AsteroidsGame },
  { id: "pong", label: "PONG", ctor: PongGame },
  { id: "tron", label: "TRON", ctor: TronGame },
  { id: "pacman", label: "PAC-MAN", ctor: PacmanGame },
];

// The order the app cycles through.
export const GAME_ORDER: readonly MiniGameCtor[] = GAME_ENTRIES.map((entry) => entry.ctor);

export { AsteroidsGame, PacmanGame, PongGame, SnakeGame, TronGame };
export { MiniGame } from "./base.js";
