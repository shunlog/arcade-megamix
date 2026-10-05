# Arcade Megamix

Five classic arcade games in one, switching at an ever faster rate. Survive as
long as you can and rack up the highest score. Built with TypeScript and an
HTML5 canvas.

The mini-games rotate in this order:

**Snake → Asteroids → Pong → Tron → Pac-Man → Snake → …**

- The first loop gives each game **10 seconds**.
- Every time the rotation wraps around, games get **1 second less**.
- The round length bottoms out at **3 seconds**.
- Each mini-game keeps its state, so you resume exactly where you left off.
- The run ends the moment you die in *any* mini-game.

The remaining time until the next switch is shown top-left. Your total score is
shown top-right in a big blocky pixel font.

## Requirements

- Node.js 18+ (no runtime dependencies; TypeScript is the only dev dependency)
- [pnpm](https://pnpm.io/) (this project is managed with pnpm)

## Run

```bash
pnpm install
pnpm start
```

Then open <http://localhost:8080/>.

`pnpm start` compiles the TypeScript with `tsc` and launches the zero-dependency
static server in `serve.mjs`. You can also run the two steps separately:

```bash
pnpm run build      # tsc -> dist/
pnpm run serve      # serves the current directory
```

Any static file server works; `index.html` loads `./dist/main.js` as an ES
module.

Other scripts:

```bash
pnpm run build      # compile TypeScript to dist/
pnpm run typecheck  # type-check only
pnpm test           # build, then run the logic tests (Node test runner)
```

`serve.mjs` also serves `embed.html`, an iframe embed demo of the game page.

## Start-up menu

The game opens on a start-up screen with two options:

- **PLAY** starts the full rotation described above.
- **MINI-GAMES** opens a picker with one button per mini-game plus **BACK**.

Navigate with the arrow keys / WASD and confirm with Enter or Space, or just
click the buttons. There is no URL-based game selection; everything happens in
the in-game menus.

## Controls

| Mini-game | Controls |
| --- | --- |
| Snake | Arrows / WASD. Turns are buffered — queue up to 3 at once. |
| Asteroids | ← → rotate, ↑ thrust, Space fire. |
| Pong | ↑ ↓ (or W/S) move the left paddle. |
| Tron | Arrows / WASD to steer. |
| Pac-Man | Arrows / WASD to move. |

**P** or **Esc** pauses while a game is running; while paused, **Q** quits
back to the start-up menu. After a game over, **R** restarts and **Esc**
returns to the start-up menu.

## Scoring

Scores are normalised so that a Pac-Man pellet is the baseline of **1 point**:

| Event | Points |
| --- | --- |
| Pac-Man pellet | 1 |
| Snake apple | 5 |
| Pong paddle hit | 1 |
| Pong goal (past the CPU) | 10 |
| Asteroid destroyed (big) | 10 |
| Asteroid destroyed (small) | 5 |
| Tron: enemy rider crashes | 25 |

## Tests

```bash
pnpm test
```

This builds the project and runs the logic tests with Node's built-in test
runner (`node --test`). The tests cover round timing/switching, snake buffering
and growth, asteroid waves on a new loop, Tron arena resets and Pac-Man pellet
scoring.

## Project layout

```
index.html          # game page
embed.html          # iframe embed demo
serve.mjs           # zero-dependency static dev server
src/
  main.ts           # browser entry: canvas, input, animation loop
  menu.ts           # canvas startup / mini-game menus
  app.ts            # RoundManager + App (round timing and game switching)
  runner.ts         # standalone mini-game runner
  config.ts         # screen, palette, scoring constants, pixel font
  keys.ts           # KeyboardEvent.code constants
  rng.ts            # random helpers (+ deterministic seeded RNG for tests)
  draw.ts           # small canvas drawing helpers
  games/
    base.ts         # MiniGame interface
    snake.ts
    asteroids.ts
    pong.ts
    tron.ts
    pacman.ts
    index.ts        # GAME_ORDER
test/
  logic.test.mjs
```

## Implementation notes

- **Input** uses `KeyboardEvent.code` (`ArrowUp`, `KeyW`, `Space`, …) so the
  key mapping is layout independent.
- **Rendering** draws directly to a `CanvasRenderingContext2D`. Rounded corners
  use `roundRect` with an `arcTo` fallback.
- **Modulo semantics**: JavaScript's `%` keeps the sign of the dividend, so
  the wrapping used by Asteroids goes through `mod()` in `draw.ts`.
- **The pixel font** is a hand-authored 5x7 bitmap glyph set painted as
  integer-aligned squares, so text stays razor sharp with no anti-aliasing.
- **Esc** pauses while a game is running. On the game-over screen it returns
  to the start-up menu instead, and **P** still toggles pause.
