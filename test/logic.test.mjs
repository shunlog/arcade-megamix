import test from "node:test";
import assert from "node:assert/strict";

import { App, RoundManager } from "../dist/app.js";
import { GAME_ORDER } from "../dist/games/index.js";
import { AsteroidsGame } from "../dist/games/asteroids.js";
import { PacmanGame } from "../dist/games/pacman.js";
import { SnakeGame, UP } from "../dist/games/snake.js";
import { TronGame } from "../dist/games/tron.js";
import { seededRng } from "../dist/rng.js";
import { speedMultiplier, scoreMultiplier } from "../dist/config.js";
import { PongGame } from "../dist/games/pong.js";
import { StandaloneRunner } from "../dist/runner.js";

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
  const rm = new RoundManager(1);
  const dt = rm.tickDuration + 1e-6;
  assert.equal(rm.duration, 10);

  for (let i = 0; i < 7; i++) rm.tick(dt);
  assert.equal(rm.tickIndex, 7);
  assert.equal(rm.advance(), true);
  assert.equal(rm.level, 0);
  assert.equal(rm.duration, 10);

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
  rm.advance();
  assert.ok(Math.abs(rm.tickDuration - tick) < 1e-9);
  rm.tick(dt);
  assert.ok(rm.tickDuration < tick);
});

test("the cycle is six play ticks then a two-tick pause", () => {
  const rm = new RoundManager(5);
  const dt = rm.tickDuration + 1e-6;

  for (let i = 1; i <= 5; i++) {
    assert.equal(rm.tick(dt), i);
    assert.equal(rm.phase, "play");
  }
  assert.equal(rm.tick(dt), 6);
  assert.equal(rm.phase, "pause");
  assert.equal(rm.tick(dt), 7);
  assert.equal(rm.phase, "switch");
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
  assert.equal(rm.duration, 10);
});

test("timeToSwitch counts down to the tick-7 switch", () => {
  const rm = new RoundManager(5);
  assert.ok(Math.abs(rm.timeToSwitch - 7 * rm.tickDuration) < 1e-9);
  rm.tick(rm.tickDuration);
  assert.ok(Math.abs(rm.timeToSwitch - 6 * rm.tickDuration) < 1e-9);
});

test("difficulty sets the round's starting level and survives a restart", () => {
  const app = new App(800, 600, 3);
  assert.equal(app.round.level, 3);
  assert.equal(app.round.duration, 7);

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

test("app gives pong an extra ball on every level wrap", () => {
  const app = new App();
  const pong = app.games.find((g) => g instanceof PongGame);
  const balls = pong.balls.length;

  for (let i = 0; i < GAME_ORDER.length; i++) app.doSwitch();
  assert.equal(pong.balls.length, balls + 1);
});

test("app gives snake an extra apple on every level wrap", () => {
  const app = new App();
  const snake = app.games.find((g) => g instanceof SnakeGame);
  const apples = snake.apples.length;

  for (let i = 0; i < GAME_ORDER.length; i++) app.doSwitch();
  assert.equal(snake.apples.length, apples + 1);
});

test("snake replaces an eaten apple without losing the extras", () => {
  const snake = new SnakeGame(300, 200, seededRng(3));
  snake.addApple();
  assert.equal(snake.apples.length, 2);

  const [hx, hy] = snake.snake[0];
  snake.apples[0] = [hx + 1, hy];
  snake.step();
  assert.equal(snake.apples.length, 2);
});

test("pong ends only once every ball has been lost", () => {
  const pong = new PongGame(800, 600, seededRng(1));
  assert.equal(pong.balls.length, 1);
  pong.addBall();
  assert.equal(pong.balls.length, 2);

  pong.balls[0].x = -100;
  assert.equal(pong.update(1 / 60), true);
  assert.equal(pong.balls.length, 1);
  assert.equal(pong.alive, true);

  pong.balls[0].x = -100;
  assert.equal(pong.update(1 / 60), false);
  assert.equal(pong.alive, false);
});

test("standalone pong spawns an extra ball every five seconds", () => {
  const runner = new StandaloneRunner(PongGame, 800, 600);
  const pong = runner.game;
  pong.balls[0].vx = 0;
  pong.balls[0].vy = 0;
  assert.equal(pong.balls.length, 1);

  for (let i = 0; i < 5 * 60 + 2; i++) runner.update(1 / 60);
  assert.equal(pong.balls.length, 2);
  assert.equal(pong.alive, true);
});

test("snake rejects reversals and can be buffered", () => {
  const snake = new SnakeGame(300, 200, seededRng(1));
  assert.equal(snake.turn(UP), true);
  assert.equal(snake.turn(UP), false);
  assert.equal(snake.turn([0, 1]), false);
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

test("speed multiplier is 1.0 at level 0 and +0.1 per level", () => {
  assert.equal(speedMultiplier(0), 1.0);
  assert.ok(Math.abs(speedMultiplier(1) - 1.1) < 1e-9);
  assert.ok(Math.abs(speedMultiplier(6) - 1.6) < 1e-9);
});

test("the app gives every mini-game the current level's multiplier", () => {
  const app = new App(800, 600, 3);
  assert.ok(Math.abs(app.round.level - 3) < 1e-9);
  for (const g of app.games) {
    assert.ok(Math.abs(g.speedMultiplier - 1.3) < 1e-9);
  }
});

test("mini-game speeds scale with the multiplier", () => {
  const distance = (multiplier) => {
    const pong = new PongGame(800, 600, seededRng(1));
    pong.speedMultiplier = multiplier;
    const x0 = pong.ballX;
    const y0 = pong.ballY;
    pong.update(1 / 60);
    return Math.hypot(pong.ballX - x0, pong.ballY - y0);
  };
  const base = distance(1);
  assert.ok(Math.abs(distance(2) - base * 2) < 1e-6);
  assert.ok(Math.abs(distance(3) - base * 3) < 1e-6);
});

test("score multiplier grows at an accelerating rate", () => {
  assert.equal(scoreMultiplier(0), 1.0);
  assert.ok(Math.abs(scoreMultiplier(1) - 1.1) < 1e-9);
  assert.ok(Math.abs(scoreMultiplier(2) - 1.3) < 1e-9);
  assert.ok(Math.abs(scoreMultiplier(3) - 1.6) < 1e-9);
  assert.ok(Math.abs(scoreMultiplier(4) - 2.0) < 1e-9);
  assert.ok(Math.abs(scoreMultiplier(5) - 2.5) < 1e-9);
  for (let level = 1; level < 8; level++) {
    const step = scoreMultiplier(level) - scoreMultiplier(level - 1);
    assert.ok(Math.abs(step - 0.1 * level) < 1e-9);
  }
});

test("score awards are scaled and rounded up", () => {
  const pac = new PacmanGame(800, 600, seededRng(5));
  pac.scoreMultiplier = 1.6;
  pac.addScore(1);
  assert.equal(pac.score, 2);
  pac.addScore(5);
  assert.equal(pac.score, 10);
});

test("the app gives every mini-game the current level's score multiplier", () => {
  const app = new App(800, 600, 3);
  for (const g of app.games) {
    assert.ok(Math.abs(g.scoreMultiplier - 1.6) < 1e-9);
  }
});
