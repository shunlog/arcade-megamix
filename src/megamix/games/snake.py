"""Mini-game: Snake.

Designed to feel like the Google snake doodle: grid movement, buffered turn
input and a snake that grows by one apple at a time. The logic is kept free
of any rendering so it can be unit-tested directly.
"""

from __future__ import annotations

import random
from collections import deque

import pygame

from ..config import (
    APPLE_RED,
    BLACK,
    DARK,
    SCORE_SNAKE_APPLE,
    SNAKE_GREEN,
    SNAKE_HEAD,
)
from .base import MiniGame

RIGHT = (1, 0)
LEFT = (-1, 0)
UP = (0, -1)
DOWN = (0, 1)


class SnakeGame(MiniGame):
    name = "SNAKE"

    CELL = 20
    START_LEN = 3
    STEP_TIME = 0.11
    MAX_QUEUE = 3

    def __init__(self, width: int, height: int, rng: random.Random | None = None) -> None:
        self.cols = width // self.CELL
        self.rows = height // self.CELL
        self.rng = rng or random.Random()
        super().__init__(width, height)

    # -- lifecycle -----------------------------------------------------------
    def reset(self) -> None:
        cy = self.rows // 2
        cx = self.cols // 3
        self.snake: deque[tuple[int, int]] = deque(
            (cx - i, cy) for i in range(self.START_LEN)
        )
        self.direction = RIGHT
        self.pending: deque[tuple[int, int]] = deque()
        self.move_timer = 0.0
        self.score = 0
        self.alive = True
        self.apple = self._random_free_cell()

    # -- input ---------------------------------------------------------------
    def turn(self, direction: tuple[int, int]) -> bool:
        """Queue a turn. Rejects reversals and duplicates of the last queued
        direction, which is what makes buffered input feel correct."""
        last = self.pending[-1] if self.pending else self.direction
        if direction == last:
            return False
        if direction == (-last[0], -last[1]):
            return False
        if len(self.pending) >= self.MAX_QUEUE:
            return False
        self.pending.append(direction)
        return True

    def on_keydown(self, key: int) -> None:
        super().on_keydown(key)
        if key in (pygame.K_UP, pygame.K_w):
            self.turn(UP)
        elif key in (pygame.K_DOWN, pygame.K_s):
            self.turn(DOWN)
        elif key in (pygame.K_LEFT, pygame.K_a):
            self.turn(LEFT)
        elif key in (pygame.K_RIGHT, pygame.K_d):
            self.turn(RIGHT)

    # -- simulation ----------------------------------------------------------
    def step(self) -> None:
        if not self.alive:
            return

        # Consume exactly one buffered turn per step.
        while self.pending:
            candidate = self.pending.popleft()
            if candidate != self.direction and candidate != (
                -self.direction[0],
                -self.direction[1],
            ):
                self.direction = candidate
                break

        hx, hy = self.snake[0]
        nx, ny = hx + self.direction[0], hy + self.direction[1]

        if not (0 <= nx < self.cols and 0 <= ny < self.rows):
            self.alive = False
            return

        eating = (nx, ny) == self.apple
        body = set(self.snake)
        if not eating:
            body.discard(self.snake[-1])  # tail vacates this step
        if (nx, ny) in body:
            self.alive = False
            return

        self.snake.appendleft((nx, ny))
        if eating:
            self.add_score(SCORE_SNAKE_APPLE)
            self.apple = self._random_free_cell()
        else:
            self.snake.pop()

    def update(self, dt: float) -> bool:
        if not self.alive:
            return False
        self.move_timer += dt
        while self.alive and self.move_timer >= self.STEP_TIME:
            self.move_timer -= self.STEP_TIME
            self.step()
        return self.alive

    def _random_free_cell(self) -> tuple[int, int]:
        free = [
            (x, y)
            for y in range(self.rows)
            for x in range(self.cols)
            if (x, y) not in set(self.snake)
        ]
        if not free:
            return (0, 0)
        return self.rng.choice(free)

    # -- rendering -----------------------------------------------------------
    def draw(self, surface: pygame.Surface) -> None:
        surface.fill(BLACK)
        size = self.CELL

        for i, (x, y) in enumerate(self.snake):
            rect = pygame.Rect(x * size, y * size, size, size).inflate(-2, -2)
            color = SNAKE_HEAD if i == 0 else SNAKE_GREEN
            pygame.draw.rect(surface, color, rect, border_radius=5)

        # eyes on the head, oriented by travel direction
        hx, hy = self.snake[0]
        cx, cy = hx * size + size // 2, hy * size + size // 2
        dx, dy = self.direction
        ox, oy = dy * 3, dx * 3
        pygame.draw.circle(surface, DARK, (cx + dx * 3 + ox, cy + dy * 3 + oy), 2)
        pygame.draw.circle(surface, DARK, (cx + dx * 3 - ox, cy + dy * 3 - oy), 2)

        ax, ay = self.apple
        pygame.draw.circle(
            surface, APPLE_RED, (ax * size + size // 2, ay * size + size // 2), size // 2 - 2
        )


def main() -> None:  # pragma: no cover - interactive entry point
    from ..runner import run_standalone

    run_standalone(SnakeGame)


if __name__ == "__main__":  # pragma: no cover
    main()
