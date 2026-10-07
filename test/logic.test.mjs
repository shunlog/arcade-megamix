// Logic tests for the game engine.
// Run with: pnpm test  (builds first, then uses Node's built-in test runner).

import test from "node:test";
import assert from "node:assert/strict";

import { App, RoundManager } from "../dist/app.js";
import { GAME_ORDER } from "../dist/games/index.js";
import { AsteroidsGame } from "../dist/games/asteroids.js";
import { PacmanGame } from "../dist/games/pacman.js";
import { SnakeGame, UP } from "../dist/games/snake.js";
import { TronGame } from "../dist/games/tron.js";
import { seededRng } from "../dist/rng.js";

test("round duration shrinks per level and is capped", () => {
  const rm = new RoundManager(5);
  assert.equal(rm.level, 0);
  assert.equal(rm.duration, 10);
  rm.level = 1;
  assert.equal(rm.duration, 9);
  rm.level = 7;
  assert.equal(rm.duration, 3);
  rm.level = 50;
  assert.equal(rm.duration, 3);
});

test("a tick is an eighth of the level duration", () => {
  const rm = new RoundManager(5);
  assert.ok(Math.abs(rm.tickDuration - 10 / 8) < 1e-9);
  rm.level = 1;
  assert.ok(Math.abs(rm.tickDuration - 9 / 8) < 1e-9);
});

test("completing a cycle raises the level only when the next cycle plays", () => {
  const rm = new RoundManager(1); // one game: every swap completes a cycle
  const dt = rm.tickDuration + 1e-6;
  assert.equal(rm.duration, 10);

  // Seven ticks reach the swap; the level does not rise during the pause tick.
  for (let i = 0; i < 7; i++) rm.tick(dt);
  assert.equal(rm.tickIndex, 7);
  assert.equal(rm.advance(), true);
  assert.equal(rm.level, 0);
  assert.equal(rm.duration, 10);

  // Wrapping to tick 0 begins the new level and shortens the duration.
  assert.equal(rm.tick(dt), 0);
  assert.equal(rm.level, 1);
  assert.equal(rm.duration, 9);
});

test("the tick duration stays constant across a wrapping cycle", () => {
  const rm = new RoundManager(1);
  const tick = rm.tickDuration;
  const dt = tick + 1e-6;

  for (let i = 0; i < 7; i++) {
    rm.tick(dt);
    assert.ok(Math.abs(rm.tickDuration - tick) < 1e-9);
  }
  rm.advance(); // the cycle wraps
  assert.ok(Math.abs(rm.tickDuration - tick) < 1e-9); // unchanged during the pause tick
  rm.tick(dt); // tick 0 of the new level
  assert.ok(rm.tickDuration < tick);
});

test("the cycle is six play ticks then a two-tick pause", () => {
  const rm = new RoundManager(5);
  const dt = rm.tickDuration + 1e-6;

  // Ticks 1..5 remain in play.
  for (let i = 1; i <= 5; i++) {
    assert.equal(rm.tick(dt), i);
    assert.equal(rm.phase, "play");
  }
  // Tick 6 pauses, tick 7 swaps in the next game (still paused).
  assert.equal(rm.tick(dt), 6);
  assert.equal(rm.phase, "pause");
  assert.equal(rm.tick(dt), 7);
  assert.equal(rm.phase, "switch");
  // The next boundary starts a fresh playing cycle.
  assert.equal(rm.tick(dt), 0);
  assert.equal(rm.phase, "play");
});

test("the pause lasts two ticks, a quarter of the level duration", () => {
  const rm = new RoundManager(5);
  assert.ok(Math.abs(2 * rm.tickDuration - rm.duration / 4) < 1e-9);
  assert.ok(Math.abs(rm.playDuration - (3 * rm.duration) / 4) < 1e-9);
});

test("advance wraps the game index at the end of a cycle", () => {
  const rm = new RoundManager(5);
  for (let i = 0; i < 5; i++) rm.advance();
  assert.equal(rm.index, 0);
  assert.equal(rm.duration, 10); // the level rises on the next tick 0
});

test("timeToSwitch counts down to the tick-7 switch", () => {
  const rm = new RoundManager(5);
  assert.ok(Math.abs(rm.timeToSwitch - 7 * rm.tickDuration) < 1e-9);
  rm.tick(rm.tickDuration); // now on tick 1
  assert.ok(Math.abs(rm.timeToSwitch - 6 * rm.tickDuration) < 1e-9);
});

test("difficulty sets the round's starting level and survives a restart", () => {
  const app = new App(800, 600, 3);
  assert.equal(app.round.level, 3);
  assert.equal(app.round.duration, 7); // 10 - 3 * LEVEL_STEP

  app.restart();
  assert.equal(app.round.level, 3);
  assert.equal(app.round.duration, 7);
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

  assert.equal(app.round.index, 0);
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

test("pacman escapes a wall even when an impossible turn is buffered", () => {
  const pac = new PacmanGame(800, 600, seededRng(5));
  // Facing up into a wall at (1,0); left is also a wall, so the buffered
  // left turn can never fire. A later down turn must not be stuck behind it.
  pac.pacX = 1;
  pac.pacY = 1;
  pac.pacDir = [0, -1];
  pac.pending = [
    [-1, 0],
    [0, 1],
  ];
  pac.stepPac();
  assert.deepEqual(pac.pacDir, [0, 1]);
  assert.equal(pac.pacY, 2);
  assert.equal(pac.pending.length, 0);
});
