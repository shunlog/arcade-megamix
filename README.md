# Arcade Megamix

Five classic arcade games in one, switching at an ever faster rate. Survive as
long as you can and rack up the highest score.

This repository holds two implementations of the same game:

```
python/       original pygame implementation
typescript/   TypeScript + HTML5 canvas port
```

The mini-games rotate in this order:

**Snake → Asteroids → Pong → Tron → Pac-Man → Snake → …**

- The first loop gives each game **10 seconds**.
- Every time the rotation wraps around, games get **1 second less**.
- The round length bottoms out at **3 seconds**.
- Each mini-game keeps its state, so you resume exactly where you left off.
- The run ends the moment you die in *any* mini-game.

The remaining time until the next switch is shown top-left. Your total score is
shown top-right in a big blocky pixel font.

## Python (pygame)

Requires [uv](https://docs.astral.sh/uv/).

```bash
cd python
uv sync
uv run arcade-megamix
uv run pytest
```

See [`python/README.md`](python/README.md) for the full controls and layout.

## TypeScript + HTML5 canvas

Requires Node.js 18+.

```bash
cd typescript
npm install
npm start          # builds with tsc and serves on http://localhost:8080/
```

Open <http://localhost:8080/>. You can also launch a single mini-game on its
own with a query string or hash, e.g.
<http://localhost:8080/?game=snake> or `#pacman`.

Other scripts:

```bash
npm run build      # compile TypeScript to dist/
npm run typecheck  # type-check only
npm test           # build, then run the logic tests (Node test runner)
```

See [`typescript/README.md`](typescript/README.md) for details on the port.

## Controls

| Mini-game | Controls |
| --- | --- |
| Snake | Arrows / WASD. Turns are buffered — queue up to 3 at once. |
| Asteroids | ← → rotate, ↑ thrust, Space fire. |
| Pong | ↑ ↓ (or W/S) move the left paddle. |
| Tron | Arrows / WASD to steer. |
| Pac-Man | Arrows / WASD to move. |

In the web port, **P** or **Esc** pauses (the browser has no "quit"), and **R**
restarts after a game over.

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
