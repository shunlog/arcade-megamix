"""Mini-game: Asteroids.

The ship persists between switches. A fresh wave of asteroids is added every
time the main game completes a full loop through the five mini-games.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

import pygame

from ..config import (
    ASTEROID_GRAY,
    BLACK,
    BULLET_YELLOW,
    SCORE_ASTEROID_BIG,
    SCORE_ASTEROID_SMALL,
    SHIP_WHITE,
)
from .base import MiniGame


@dataclass
class Asteroid:
    x: float
    y: float
    vx: float
    vy: float
    radius: float

    @property
    def is_big(self) -> bool:
        return self.radius >= 20


@dataclass
class Bullet:
    x: float
    y: float
    vx: float
    vy: float
    life: float = 1.2


class AsteroidsGame(MiniGame):
    name = "ASTEROIDS"

    ROT_SPEED = 4.0
    THRUST = 260.0
    FRICTION = 0.4
    MAX_BULLETS = 5
    FIRE_COOLDOWN = 0.18

    def __init__(self, width: int, height: int, rng: random.Random | None = None) -> None:
        self.rng = rng or random.Random()
        super().__init__(width, height)

    # -- lifecycle -----------------------------------------------------------
    def reset(self) -> None:
        self.ship_x = self.width / 2
        self.ship_y = self.height / 2
        self.ship_vx = 0.0
        self.ship_vy = 0.0
        self.angle = -math.pi / 2
        self.fire_timer = 0.0
        self.bullets: list[Bullet] = []
        self.asteroids: list[Asteroid] = []
        self.score = 0
        self.alive = True
        self.add_wave(3)

    def add_wave(self, count: int = 2) -> None:
        for _ in range(count):
            edge = self.rng.choice(("top", "bottom", "left", "right"))
            if edge == "top":
                x, y = self.rng.uniform(0, self.width), 0.0
            elif edge == "bottom":
                x, y = self.rng.uniform(0, self.width), float(self.height)
            elif edge == "left":
                x, y = 0.0, self.rng.uniform(0, self.height)
            else:
                x, y = float(self.width), self.rng.uniform(0, self.height)
            speed = self.rng.uniform(40, 90)
            heading = self.rng.uniform(0, math.tau)
            self.asteroids.append(
                Asteroid(
                    x,
                    y,
                    math.cos(heading) * speed,
                    math.sin(heading) * speed,
                    self.rng.uniform(18, 30),
                )
            )

    # -- simulation ----------------------------------------------------------
    def update(self, dt: float) -> bool:
        if not self.alive:
            return False

        if pygame.K_LEFT in self.pressed or pygame.K_a in self.pressed:
            self.angle -= self.ROT_SPEED * dt
        if pygame.K_RIGHT in self.pressed or pygame.K_d in self.pressed:
            self.angle += self.ROT_SPEED * dt

        if pygame.K_UP in self.pressed or pygame.K_w in self.pressed:
            self.ship_vx += math.cos(self.angle) * self.THRUST * dt
            self.ship_vy += math.sin(self.angle) * self.THRUST * dt

        # mild drag so the ship does not accelerate forever
        self.ship_vx -= self.ship_vx * self.FRICTION * dt
        self.ship_vy -= self.ship_vy * self.FRICTION * dt
        self.ship_x = (self.ship_x + self.ship_vx * dt) % self.width
        self.ship_y = (self.ship_y + self.ship_vy * dt) % self.height

        self.fire_timer = max(0.0, self.fire_timer - dt)
        if (pygame.K_SPACE in self.pressed) and self.fire_timer == 0.0:
            self._fire()

        for b in self.bullets:
            b.x = (b.x + b.vx * dt) % self.width
            b.y = (b.y + b.vy * dt) % self.height
            b.life -= dt
        self.bullets = [b for b in self.bullets if b.life > 0]

        for a in self.asteroids:
            a.x = (a.x + a.vx * dt) % self.width
            a.y = (a.y + a.vy * dt) % self.height

        self._collide_bullets()
        self._collide_ship()
        return self.alive

    def _fire(self) -> None:
        if len(self.bullets) >= self.MAX_BULLETS:
            return
        speed = 480.0
        self.bullets.append(
            Bullet(
                self.ship_x,
                self.ship_y,
                math.cos(self.angle) * speed,
                math.sin(self.angle) * speed,
            )
        )
        self.fire_timer = self.FIRE_COOLDOWN

    def _collide_bullets(self) -> None:
        for b in list(self.bullets):
            for a in list(self.asteroids):
                if math.hypot(b.x - a.x, b.y - a.y) <= a.radius:
                    self.bullets.remove(b)
                    self.asteroids.remove(a)
                    if a.is_big:
                        self.add_score(SCORE_ASTEROID_BIG)
                        self._split(a)
                    else:
                        self.add_score(SCORE_ASTEROID_SMALL)
                    break

    def _split(self, a: Asteroid) -> None:
        for sign in (-1, 1):
            heading = math.atan2(a.vy, a.vx) + sign * 0.7
            speed = math.hypot(a.vx, a.vy) * 1.2
            self.asteroids.append(
                Asteroid(
                    a.x,
                    a.y,
                    math.cos(heading) * speed,
                    math.sin(heading) * speed,
                    a.radius * 0.55,
                )
            )

    def _collide_ship(self) -> None:
        for a in self.asteroids:
            if math.hypot(self.ship_x - a.x, self.ship_y - a.y) <= a.radius + 6:
                self.alive = False
                return

    # -- rendering -----------------------------------------------------------
    def draw(self, surface: pygame.Surface) -> None:
        surface.fill(BLACK)

        for a in self.asteroids:
            pygame.draw.circle(surface, ASTEROID_GRAY, (int(a.x), int(a.y)), int(a.radius), 2)

        for b in self.bullets:
            pygame.draw.circle(surface, BULLET_YELLOW, (int(b.x), int(b.y)), 3)

        self._draw_ship(surface)

    def _draw_ship(self, surface: pygame.Surface) -> None:
        size = 14
        nose = (
            self.ship_x + math.cos(self.angle) * size,
            self.ship_y + math.sin(self.angle) * size,
        )
        left = (
            self.ship_x + math.cos(self.angle + 2.5) * size,
            self.ship_y + math.sin(self.angle + 2.5) * size,
        )
        right = (
            self.ship_x + math.cos(self.angle - 2.5) * size,
            self.ship_y + math.sin(self.angle - 2.5) * size,
        )
        pygame.draw.polygon(surface, SHIP_WHITE, [nose, left, right], 2)


def main() -> None:  # pragma: no cover - interactive entry point
    from ..runner import run_standalone

    run_standalone(AsteroidsGame)


if __name__ == "__main__":  # pragma: no cover
    main()
