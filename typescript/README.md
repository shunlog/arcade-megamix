# Arcade Megamix — TypeScript + canvas port

A faithful port of the pygame original in `../python/` to TypeScript running on
an HTML5 canvas. The game logic is a direct translation: same constants, same
round timing, same scoring and the same buffered-input behaviour.

## Requirements

- Node.js 18+ (no runtime dependencies; TypeScript is the only dev dependency)

## Run

```bash
npm install
npm start
```

Then open <http://localhost:8080/>.

`npm start` compiles the TypeScript with `tsc` and launches the zero-dependency
static server in `serve.mjs`. You can also run the two steps separately:

```bash
npm run build      # tsc -> dist/
npm run serve      # serves the current directory
```

Any static file server works; `index.html` loads `./dist/main.js` as an ES
module.

## Play a single mini-game

Pass a `game` query parameter or hash:

- <http://localhost:8080/?game=snake>
- <http://localhost:8080/?game=asteroids>
- <http://localhost:8080/?game=pong>
- <http://localhost:8080/?game=tron>
- <http://localhost:8080/?game=pacman>
- or `#snake`, `#asteroids`, … as the hash

## Tests

```bash
npm test
```

This builds the project and runs the logic tests with Node's built-in test
runner (`node --test`). The tests cover the same behaviour as the Python pytest
suite: round timing/switching, snake buffering and growth, asteroid waves on a
new loop, Tron arena resets and Pac-Man pellet scoring.

## Project layout

```
src/
  main.ts           # browser entry: canvas, input, animation loop
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

## Port notes

- **Input** uses `KeyboardEvent.code` (`ArrowUp`, `KeyW`, `Space`, …) so the
  key mapping is layout independent and mirrors pygame's key constants.
- **Rendering** draws directly to a `CanvasRenderingContext2D`. Rounded corners
  use `roundRect` with an `arcTo` fallback.
- **Python modulo** (`(-5) % 800 == 795`) differs from JavaScript's `%`, so the
  wrapping used by Asteroids goes through `mod()` in `draw.ts`.
- **The pixel font** renders text to an offscreen canvas at a small size, then
  scales it up with `imageSmoothingEnabled = false`, matching the original's
  non-anti-aliased look.
- **Esc** toggles pause in the browser instead of quitting, and **P** does the
  same. **R** still restarts after a game over.
