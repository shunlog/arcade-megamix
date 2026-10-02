"""Mini-game: Pac-Man.

A compact hand-made maze. Eating a pellet is the scoring baseline (1 point).
Touching a ghost ends the run.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

import pygame

from ..config import (
    BLACK,
    DARK,
    GHOST_CYAN,
    GHOST_PINK,
    GHOST_RED,
    PAC_YELLOW,
    PELLET,
    SCORE_PAC_PELLET,
)
from .base import MiniGame

RIGHT = (1, 0)
LEFT = (-1, 0)
UP = (0, -1)
DOWN = (0, 1)

MAZE = (
    "###################",
    "#........#........#",
    "#.##.###.#.###.##.#",
    "#.................#",
    "#.##.#.#####.#.##.#",
    "#....#...#...#....#",
    "####.### # ###.####",
    "   #.#       #.#   ",
    "####.# ##-## #.####",
    "#........#........#",
    "#.##.###.#.###.##.#",
    "#..#...........#..#",
    "##.#.#.#####.#.#.##",
    "#....#...#...#....#",
    "###################",
)

GHOST_SPAWNS = ((7, 7), (9, 7), (11, 7))
PAC_SPAWN = (9, 11)
GHOST_COLORS = (GHOST_RED, GHOST_PINK, GHOST_CYAN)


@dataclass
class Ghost:
    x: int
    y: int
    direction: tuple[int, int]
    color: tuple[int, int, int]


class PacmanGame(MiniGame):
    name = "PAC-MAN"

    CELL = 32
    PAC_STEP = 0.13
    GHOST_STEP = 0.19
    MAX_QUEUE = 2

    def __init__(self, width: int, height: int, rng: random.Random | None = None) -> None:
        self.rng = rng or random.Random()
        self.rows = len(MAZE)
        self.cols = len(MAZE[0])
        super().__init__(width, height)

    # -- lifecycle -----------------------------------------------------------
    def reset(self) -> None:
        self.pac_x, self.pac_y = PAC_SPAWN
        self.pac_dir = LEFT
        self.pending: list[tuple[int, int]] = []
        self.pac_timer = 0.0
        self.ghost_timer = 0.0
        self.ghosts = [
            Ghost(x, y, self.rng.choice((UP, DOWN, LEFT, RIGHT)), color)
            for (x, y), color in zip(GHOST_SPAWNS, GHOST_COLORS)
        ]
        self.pellets = {
            (x, y)
            for y, row in enumerate(MAZE)
            for x, ch in enumerate(row)
            if ch == "."
        }
        self.score = 0
        self.alive = True

    # -- input ---------------------------------------------------------------
    def on_keydown(self, key: int) -> None:
        super().on_keydown(key)
        mapping = {
            pygame.K_UP: UP,
            pygame.K_w: UP,
            pygame.K_DOWN: DOWN,
            pygame.K_s: DOWN,
            pygame.K_LEFT: LEFT,
            pygame.K_a: LEFT,
            pygame.K_RIGHT: RIGHT,
            pygame.K_d: RIGHT,
        }
        direction = mapping.get(key)
        if direction is not None:
            self.queue_turn(direction)

    def queue_turn(self, direction: tuple[int, int]) -> bool:
        last = self.pending[-1] if self.pending else self.pac_dir
        if direction == last:
            return False
        if len(self.pending) >= self.MAX_QUEUE:
            return False
        self.pending.append(direction)
        return True

    # -- grid helpers --------------------------------------------------------
    def _walkable(self, x: int, y: int, ghost: bool = False) -> bool:
        if not (0 <= x < self.cols and 0 <= y < self.rows):
            return False
        cell = MAZE[y][x]
        if cell == "#":
            return False
        if cell == "-" and not ghost:
            return False
        return True

    # -- simulation ----------------------------------------------------------
    def update(self, dt: float) -> bool:
        if not self.alive:
            return False

        self.pac_timer += dt
        while self.alive and self.pac_timer >= self.PAC_STEP:
            self.pac_timer -= self.PAC_STEP
            self._step_pac()
            self._check_collision()

        self.ghost_timer += dt
        while self.alive and self.ghost_timer >= self.GHOST_STEP:
            self.ghost_timer -= self.GHOST_STEP
            self._step_ghosts()
            self._check_collision()

        return self.alive

    def _step_pac(self) -> None:
        # Try the buffered turn until it becomes legal.
        if self.pending:
            candidate = self.pending[0]
            if self._walkable(self.pac_x + candidate[0], self.pac_y + candidate[1]):
                self.pac_dir = candidate
                self.pending.pop(0)

        nx, ny = self.pac_x + self.pac_dir[0], self.pac_y + self.pac_dir[1]
        if not self._walkable(nx, ny):
            return
        self.pac_x, self.pac_y = nx, ny
        if (nx, ny) in self.pellets:
            self.pellets.discard((nx, ny))
            self.add_score(SCORE_PAC_PELLET)
            if not self.pellets:
                self._refill_pellets()

    def _refill_pellets(self) -> None:
        self.pellets = {
            (x, y)
            for y, row in enumerate(MAZE)
            for x, ch in enumerate(row)
            if ch == "."
        }

    def _step_ghosts(self) -> None:
        for ghost in self.ghosts:
            options = [UP, DOWN, LEFT, RIGHT]
            options = [
                d
                for d in options
                if d != (-ghost.direction[0], -ghost.direction[1])
                and self._walkable(ghost.x + d[0], ghost.y + d[1], ghost=True)
            ]
            if not options:
                options = [(-ghost.direction[0], -ghost.direction[1])]
            options.sort(
                key=lambda d: (
                    abs(ghost.x + d[0] - self.pac_x) + abs(ghost.y + d[1] - self.pac_y),
                    self.rng.random(),
                )
            )
            ghost.direction = options[0]
            ghost.x += ghost.direction[0]
            ghost.y += ghost.direction[1]

    def _check_collision(self) -> None:
        for ghost in self.ghosts:
            if (ghost.x, ghost.y) == (self.pac_x, self.pac_y):
                self.alive = False
                return

    # -- rendering -----------------------------------------------------------
    def draw(self, surface: pygame.Surface) -> None:
        surface.fill(BLACK)
        c = self.CELL
        for y, row in enumerate(MAZE):
            for x, ch in enumerate(row):
                if ch == "#":
                    pygame.draw.rect(
                        surface, (28, 40, 160), (x * c, y * c, c, c), border_radius=6
                    )
                elif ch == "-":
                    pygame.draw.rect(surface, (240, 170, 200), (x * c, y * c + c // 2, c, 4))

        for (x, y) in self.pellets:
            pygame.draw.circle(surface, PELLET, (x * c + c // 2, y * c + c // 2), 3)

        for ghost in self.ghosts:
            self._draw_ghost(surface, ghost)
        self._draw_pac(surface)

    def _draw_pac(self, surface: pygame.Surface) -> None:
        c = self.CELL
        center = (self.pac_x * c + c // 2, self.pac_y * c + c // 2)
        pygame.draw.circle(surface, PAC_YELLOW, center, c // 2 - 3)
        # mouth wedge pointing in the travel direction
        a = math.radians({RIGHT: 0, LEFT: 180, UP: 90, DOWN: 270}[self.pac_dir])
        p1 = (center[0] + math.cos(a + 0.5) * c, center[1] + math.sin(a + 0.5) * c)
        p2 = (center[0] + math.cos(a - 0.5) * c, center[1] + math.sin(a - 0.5) * c)
        pygame.draw.polygon(surface, BLACK, [center, p1, p2])

    def _draw_ghost(self, surface: pygame.Surface, ghost: Ghost) -> None:
        c = self.CELL
        x, y = ghost.x * c, ghost.y * c
        pygame.draw.circle(surface, ghost.color, (x + c // 2, y + c // 2 - 2), c // 2 - 3)
        pygame.draw.rect(surface, ghost.color, (x + 3, y + c // 2 - 2, c - 6, c // 2))
        pygame.draw.circle(surface, DARK, (x + c // 2 - 5, y + c // 2 - 4), 3)
        pygame.draw.circle(surface, DARK, (x + c // 2 + 5, y + c // 2 - 4), 3)


def main() -> None:  # pragma: no cover - interactive entry point
    from ..runner import run_standalone

    run_standalone(PacmanGame)


if __name__ == "__main__":  # pragma: no cover
    main()
