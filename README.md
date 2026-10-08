# Arcade Megamix

Five classic arcade games in one, switching at an ever faster rate. Survive as
long as you can and rack up the highest score. Built with TypeScript and an
HTML5 canvas.

The mini-games rotate in this order:

**Snake → Asteroids → Pong → Tron → Pac-Man → Snake → …**

- Each mini-game keeps its state, so you resume exactly where you left off.
- The run ends the moment you die in *any* mini-game.

### Eight ticks

Each mini-game runs for eight ticks:

- **Ticks 1-7** — you are playing. A tick lasts `level duration / 8`.
- **Tick 8** — the next mini-game is swapped in, frozen, with a big pause
  sign over the middle.
- **Next tick** — play starts again and the cycle repeats.

Every mini-game has the same duration within a level. When you complete a
cycle by passing through every mini-game, the level goes up and the duration
drops by **1 second** (from 10s down to a 3s floor); a shorter duration means
shorter ticks. These are configured in `config.ts`.

The difficulty chosen at start-up decides which level the run begins on, so it
jumps straight into the faster ticks.

The current level is shown top-left (with the active mini-game's name beneath
it). Your total score is shown top-right in a big blocky pixel font.

### Sound

The buzzes are generated with the Web Audio API in `src/sound.ts` — no audio
files. The final buzz of each cycle (the switch-pause tick) uses a higher
pitch. Browsers only allow audio after a user gesture, so the audio
context is unlocked on the first key press or click.

The tick buzzes are intentionally the loudest sounds in the mix, so mini-game
effects never drown out the beat. Mini-games queue effects (`this.sfx(...)`) as
they happen and the shell plays them after each update, keeping the game logic
free of audio. Effects cover ball/paddle and wall hits plus goals in Pong,
pellet eating in Pac-Man, turning and apple eating in Snake, turning and kills
in Tron, and shooting/explosions in Asteroids. The shell also adds menu move /
select blips, pause and resume tones, a quit blip and a short descending
game-over melody.

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

For development with automatic rebuilds and browser reloads:

```bash
pnpm run dev        # tsc --watch + live-server, opens http://localhost:8080/
```

`pnpm run dev` keeps `tsc` compiling in the background and live-server watches
`dist/`, `index.html` and `embed.html`, refreshing the page whenever a rebuild
lands. (Stop it with Ctrl-C; the `tsc --watch` job runs in the background, so
run `pkill -f "tsc --watch"` if it outlives the shell.)

Any static file server works; `index.html` loads `./dist/main.js` as an ES
module.

Other scripts:

```bash
pnpm run build      # compile TypeScript to dist/
pnpm run dev        # build/watch + live-reload dev server (port 8080)
pnpm run typecheck  # type-check only
pnpm test           # build, then run the logic tests (Node test runner)
```

`serve.mjs` also serves `embed.html`, an iframe embed demo of the game page.

## Start-up menu

The game opens on a start-up screen with two options:

- **PLAY** opens a difficulty picker before starting the full rotation:
  - **EASY** starts at level 0 (10s per level),
  - **MEDIUM** starts at level 3 (7s per level),
  - **HARD** starts at level 6 (4s per level).
  - **BACK** returns to the main menu.
- **MINI-GAMES** opens a picker with one button per mini-game plus **BACK**.

Navigate with the arrow keys / WASD and confirm with Enter or Space, or just
click the buttons. **Esc** backs out of the difficulty and mini-game menus.
There is no URL-based game selection; everything happens in the in-game menus.
