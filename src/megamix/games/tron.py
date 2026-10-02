"""Mini-game: Tron (light cycles).

The player and one enemy rider leave permanent trails. Crashing into a wall or
any trail kills you; making the enemy crash is worth a big pile of points.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field

import pygame

from ..config import BLACK, SCORE_TRON_KILL, TRON_ENEMY, TRON_GRID, TRON_PLAYER
from .base import MiniGame

RIGHT = (1, 0)
LEFT = (-1, 0)
UP = (0, -1)
DOWN = (0, 1)


@dataclass
class Rider:
    x: int
    y: int
    direction: tuple[int, int]
    color: tuple[int, int, int]
    is_player: bool = False
    trail: set[tuple[int, int]] = field(default_factory=set)
    pending: list[tuple[int, int]] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.trail.add((self.x, self.y))


class TronGame(MiniGame):
    name = "TRON"

    CELL = 20
    STEP_TIME = 0.06
    MAX_QUEUE = 2

    def __init__(self, width: int, height: int, rng: random.Random | None = None) -> None:
        self.cols = width // self.CELL
        self.rows = height // self.CELL
        self.rng = rng or random.Random()
        super().__init__(width, height)

    # -- lifecycle -----------------------------------------------------------
    def reset(self) -> None:
        self.player = Rider(5, self.rows // 2, RIGHT, TRON_PLAYER, is_player=True)
        self.enemy = Rider(self.cols - 6, self.rows // 2, LEFT, TRON_ENEMY)
        self.move_timer = 0.0
        self.respawn_timer = 0.0
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
            self.queue_turn(self.player, direction)

    def queue_turn(self, rider: Rider, direction: tuple[int, int]) -> bool:
        last = rider.pending[-1] if rider.pending else rider.direction
        if direction == last or direction == (-last[0], -last[1]):
            return False
        if len(rider.pending) >= self.MAX_QUEUE:
            return False
        rider.pending.append(direction)
        return True

    # -- simulation ----------------------------------------------------------
    def update(self, dt: float) -> bool:
        if not self.alive:
            return False
        self.move_timer += dt
        while self.alive and self.move_timer >= self.STEP_TIME:
            self.move_timer -= self.STEP_TIME
            self.tick()

        if not self.enemy:
            self.respawn_timer -= dt
            if self.respawn_timer <= 0:
                self._spawn_enemy()
        return self.alive

    @property
    def riders(self) -> list[Rider]:
        return [r for r in (self.player, self.enemy) if r is not None]

    def tick(self) -> None:
        all_trails: set[tuple[int, int]] = set()
        for r in self.riders:
            all_trails |= r.trail

        proposals: dict[int, tuple[int, int, tuple[int, int]]] = {}
        for r in self.riders:
            if r.is_player:
                direction = self._next_player_direction(r)
            else:
                direction = self._next_enemy_direction(r)
            nx, ny = r.x + direction[0], r.y + direction[1]
            proposals[id(r)] = (nx, ny, direction)

        # head-on collisions: same target cell by two riders
        target_counts: dict[tuple[int, int], int] = {}
        for nx, ny, _ in proposals.values():
            target_counts[(nx, ny)] = target_counts.get((nx, ny), 0) + 1

        crashed: list[Rider] = []
        for r in self.riders:
            nx, ny, _ = proposals[id(r)]
            if not (0 <= nx < self.cols and 0 <= ny < self.rows):
                crashed.append(r)
            elif (nx, ny) in all_trails:
                crashed.append(r)
            elif target_counts[(nx, ny)] > 1:
                crashed.append(r)

        for r in list(crashed):
            if r.is_player:
                self.alive = False
                return
            self.enemy = None
            self.add_score(SCORE_TRON_KILL)
            self.respawn_timer = 1.0

        for r in self.riders:
            nx, ny, direction = proposals[id(r)]
            r.trail.add((nx, ny))
            r.x, r.y = nx, ny
            r.direction = direction

    def _next_player_direction(self, rider: Rider) -> tuple[int, int]:
        while rider.pending:
            candidate = rider.pending.pop(0)
            if candidate != rider.direction and candidate != (
                -rider.direction[0],
                -rider.direction[1],
            ):
                return candidate
        return rider.direction

    def _next_enemy_direction(self, rider: Rider) -> tuple[int, int]:
        options = [UP, DOWN, LEFT, RIGHT]
        options = [d for d in options if d != (-rider.direction[0], -rider.direction[1])]
        safe = []
        for d in options:
            nx, ny = rider.x + d[0], rider.y + d[1]
            if 0 <= nx < self.cols and 0 <= ny < self.rows:
                safe.append(d)
        if not safe:
            return rider.direction

        # Chase the player, but avoid cells we can already see are occupied.
        def danger(d: tuple[int, int]) -> int:
            nx, ny = rider.x + d[0], rider.y + d[1]
            for other in self.riders:
                if (nx, ny) in other.trail:
                    return 1
            return 0

        safe.sort(
            key=lambda d: (
                danger(d),
                abs(rider.x + d[0] - self.player.x) + abs(rider.y + d[1] - self.player.y),
                self.rng.random(),
            )
        )
        return safe[0]

    def _spawn_enemy(self) -> None:
        occupied = set()
        for r in self.riders:
            occupied |= r.trail
        free = [
            (x, y)
            for y in range(self.rows)
            for x in range(self.cols)
            if (x, y) not in occupied
        ]
        if not free:
            return
        x, y = self.rng.choice(free)
        self.enemy = Rider(x, y, self.rng.choice((UP, DOWN, LEFT, RIGHT)), TRON_ENEMY)

    # -- rendering -----------------------------------------------------------
    def draw(self, surface: pygame.Surface) -> None:
        surface.fill(BLACK)
        for x in range(0, self.width, self.CELL):
            pygame.draw.line(surface, TRON_GRID, (x, 0), (x, self.height))
        for y in range(0, self.height, self.CELL):
            pygame.draw.line(surface, TRON_GRID, (0, y), (self.width, y))

        for r in self.riders:
            for (x, y) in r.trail:
                pygame.draw.rect(
                    surface,
                    r.color,
                    (x * self.CELL + 1, y * self.CELL + 1, self.CELL - 2, self.CELL - 2),
                )


def main() -> None:  # pragma: no cover - interactive entry point
    from ..runner import run_standalone

    run_standalone(TronGame)


if __name__ == "__main__":  # pragma: no cover
    main()
