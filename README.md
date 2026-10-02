# Arcade Megamix

Five classic arcade games in one, switching at an ever faster rate. Survive as
long as you can and rack up the highest score.

The mini-games rotate in this order:

**Snake → Asteroids → Pong → Tron → Pac-Man → Snake → …**

- The first loop gives each game **10 seconds**.
- Every time the rotation wraps around, games get **1 second less**.
- The round length bottoms out at **3 seconds**.
- Each mini-game keeps its state, so you resume exactly where you left off.
- The run ends the moment you die in *any* mini-game.

The remaining time until the next switch is shown top-left. Your total score is
shown top-right in a big blocky pixel font.

## Install

Requires [uv](https://docs.astral.sh/uv/).

```bash
uv sync
```

Python 3.12 is used automatically via `.python-version`.

## Play

```bash
uv run arcade-megamix
```

On the game-over screen press **R** to restart or **Esc** to quit.

## Controls

| Mini-game | Controls |
| --- | --- |
| Snake | Arrows / WASD. Turns are buffered — queue up to 3 at once. |
| Asteroids | ← → rotate, ↑ thrust, Space fire. |
| Pong | ↑ ↓ (or W/S) move the left paddle. |
| Tron | Arrows / WASD to steer. |
| Pac-Man | Arrows / WASD to move. |

## Run a mini-game on its own

Every game is self-contained and runnable for testing:

```bash
uv run python -m megamix.games.snake
uv run python -m megamix.games.asteroids
uv run python -m megamix.games.pong
uv run python -m megamix.games.tron
uv run python -m megamix.games.pacman
```

Standalone mode shows the game's own score and lets you restart with **R**.

## Tests

```bash
uv run pytest
```

The tests exercise the pure game logic (movement, collisions, scoring, round
timing and switching) without needing a display.

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

## Project layout

```
src/megamix/
  app.py            # main loop, round timing and game switching
  runner.py         # shared standalone runner
  config.py         # screen, palette, scoring constants, pixel font
  games/
    base.py         # MiniGame interface
    snake.py        # Google-snake-style buffered controls
    asteroids.py    # extra wave every new loop
    pong.py
    tron.py
    pacman.py
tests/              # pytest suite for the game logic
```
