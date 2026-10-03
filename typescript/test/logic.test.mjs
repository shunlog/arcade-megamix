// Logic tests for the TypeScript port, mirroring the Python pytest suite.
// Run with: npm test  (builds first, then uses Node's built-in test runner).

import test from "node:test";
import assert from "node:assert/strict";

import { App, RoundManager } from "../dist/app.js";
import { GAME_ORDER } from "../dist/games/index.js";
import { AsteroidsGame } from "../dist/games/asteroids.js";
import { PacmanGame } from "../dist/games/pacman.js";
import { SnakeGame, UP } from "../dist/games/snake.js";
import { TronGame } from "../dist/games/tron.js";
import { seededRng } from "../dist/rng.js";

test("round duration shrinks and is capped", () => {
  const rm = new RoundManager(5);
  assert.equal(rm.duration, 10);
  rm.loops = 1;
  assert.equal(rm.duration, 9);
  rm.loops = 7;
  assert.equal(rm.duration, 3);
  rm.loops = 50;
  assert.equal(rm.duration, 3);
});

test("tick switches after a full round", () => {
  const rm = new RoundManager(5);
  assert.equal(rm.tick(9.9), false);
  assert.equal(rm.index, 0);
  assert.equal(rm.tick(0.2), true);
  rm.advance();
  assert.equal(rm.index, 1);
});

test("advance wraps and shortens the next loop", () => {
  const rm = new RoundManager(5);
  for (let i = 0; i < 5; i++) rm.advance();
  assert.equal(rm.index, 0);
  assert.equal(rm.loops, 1);
  assert.equal(rm.remaining, 9);
});

test("each switch gives a full duration", () => {
  const rm = new RoundManager(2);
  rm.tick(10.1);
  rm.advance();
  assert.equal(rm.remaining, 10);
  rm.tick(10.1);
  rm.advance();
  assert.equal(rm.index, 0);
  assert.equal(rm.loops, 1);
  assert.equal(rm.remaining, 9);
});

test("app cycles through every game and adds asteroids on wrap", () => {
  const app = new App();
  const asteroids = app.games.find((g) => g instanceof AsteroidsGame);
  const rocks = asteroids.asteroids.length;

  const seen = [app.active.name];
  for (let i = 0; i < GAME_ORDER.length; i++) {
    app.doSwitch();
    seen.push(app.active.name);
  }

  assert.equal(app.round.loops, 1);
  assert.equal(seen[0], seen[seen.length - 1]);
  assert.equal(asteroids.asteroids.length, rocks + 2);
});

test("snake rejects reversals and can be buffered", () => {
  const snake = new SnakeGame(300, 200, seededRng(1));
  assert.equal(snake.turn(UP), true);
  assert.equal(snake.turn(UP), false); // duplicate
  assert.equal(snake.turn([0, 1]), false); // reversal of UP
});

test("snake dies at the wall", () => {
  const snake = new SnakeGame(300, 200, seededRng(2));
  for (let i = 0; i < 30 && snake.alive; i++) snake.step();
  assert.equal(snake.alive, false);
});

test("snake grows and scores when eating", () => {
  const snake = new SnakeGame(300, 200, seededRng(3));
  const [hx, hy] = snake.snake[0];
  snake.apple = [hx + 1, hy];
  const before = snake.snake.length;
  snake.step();
  assert.equal(snake.score, 5);
  assert.equal(snake.snake.length, before + 1);
});

test("tron clears trails when the arena resets", () => {
  const tron = new TronGame(400, 300, seededRng(4));
  tron.player.trail.add("99,99");
  tron.reset();
  assert.equal(tron.player.trail.has("99,99"), false);
  assert.equal(tron.alive, true);
});

test("pacman eats a pellet for one point", () => {
  const pac = new PacmanGame(800, 600, seededRng(5));
  pac.pacX = 1;
  pac.pacY = 1;
  pac.pacDir = [1, 0];
  pac.pellets.add("2,1");
  const start = pac.score;
  pac.stepPac();
  assert.equal(pac.score, start + 1);
  assert.equal(pac.pellets.has("2,1"), false);
});
