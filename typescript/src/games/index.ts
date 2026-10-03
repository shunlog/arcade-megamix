// Mini-game exports, in switching order.

import type { MiniGame } from "./base.js";
import { AsteroidsGame } from "./asteroids.js";
import { PacmanGame } from "./pacman.js";
import { PongGame } from "./pong.js";
import { SnakeGame } from "./snake.js";
import { TronGame } from "./tron.js";

export type MiniGameCtor = new (width: number, height: number) => MiniGame;

// The order the app cycles through.
export const GAME_ORDER: readonly MiniGameCtor[] = [
  SnakeGame,
  AsteroidsGame,
  PongGame,
  TronGame,
  PacmanGame,
];

export { AsteroidsGame, PacmanGame, PongGame, SnakeGame, TronGame };
export { MiniGame } from "./base.js";
