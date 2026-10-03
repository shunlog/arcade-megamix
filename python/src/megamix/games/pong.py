"""Mini-game: Pong.

The player is the left paddle. Each paddle hit is worth a point; scoring past
the CPU is worth a bundle. If the CPU scores, the player dies.
"""

from __future__ import annotations

import random

import pygame

from ..config import (
    BLACK,
    GRAY,
    PONG_ACCENT,
    PONG_WHITE,
    SCORE_PONG_GOAL,
    SCORE_PONG_HIT,
)
from .base import MiniGame


class PongGame(MiniGame):
    name = "PONG"

    PADDLE_W = 12
    PADDLE_H = 80
    PADDLE_SPEED = 420.0
    BALL_SIZE = 12
    BALL_SPEED = 360.0
    AI_SPEED = 300.0

    def __init__(self, width: int, height: int, rng: random.Random | None = None) -> None:
        self.rng = rng or random.Random()
        super().__init__(width, height)

    # -- lifecycle -----------------------------------------------------------
    def reset(self) -> None:
        self.player_y = self.height / 2 - self.PADDLE_H / 2
        self.ai_y = self.height / 2 - self.PADDLE_H / 2
        self.score = 0
        self.alive = True
        self._serve(direction=self.rng.choice((-1, 1)))

    def _serve(self, direction: int) -> None:
        self.ball_x = self.width / 2
        self.ball_y = self.height / 2
        angle = self.rng.uniform(-0.5, 0.5)
        self.ball_vx = self.BALL_SPEED * direction
        self.ball_vy = self.BALL_SPEED * angle

    # -- simulation ----------------------------------------------------------
    def update(self, dt: float) -> bool:
        if not self.alive:
            return False

        if pygame.K_UP in self.pressed or pygame.K_w in self.pressed:
            self.player_y -= self.PADDLE_SPEED * dt
        if pygame.K_DOWN in self.pressed or pygame.K_s in self.pressed:
            self.player_y += self.PADDLE_SPEED * dt
        self.player_y = max(0, min(self.height - self.PADDLE_H, self.player_y))

        # Simple tracking AI with a capped speed.
        target = self.ball_y - self.PADDLE_H / 2
        diff = target - self.ai_y
        step = max(-self.AI_SPEED * dt, min(self.AI_SPEED * dt, diff))
        self.ai_y = max(0, min(self.height - self.PADDLE_H, self.ai_y + step))

        self.ball_x += self.ball_vx * dt
        self.ball_y += self.ball_vy * dt

        if self.ball_y <= 0 or self.ball_y + self.BALL_SIZE >= self.height:
            self.ball_vy *= -1
            self.ball_y = max(0, min(self.height - self.BALL_SIZE, self.ball_y))

        self._collide_paddles()

        if self.ball_x + self.BALL_SIZE < 0:
            self.alive = False
        elif self.ball_x > self.width:
            self.add_score(SCORE_PONG_GOAL)
            self._serve(direction=-1)
        return self.alive

    def _collide_paddles(self) -> None:
        ball = pygame.Rect(self.ball_x, self.ball_y, self.BALL_SIZE, self.BALL_SIZE)
        player = pygame.Rect(20, self.player_y, self.PADDLE_W, self.PADDLE_H)
        ai = pygame.Rect(
            self.width - 20 - self.PADDLE_W, self.ai_y, self.PADDLE_W, self.PADDLE_H
        )

        if self.ball_vx < 0 and ball.colliderect(player):
            self.ball_x = player.right
            self._bounce(offset=(self.ball_y - self.player_y) / self.PADDLE_H - 0.5)
            self.add_score(SCORE_PONG_HIT)
        elif self.ball_vx > 0 and ball.colliderect(ai):
            self.ball_x = ai.left - self.BALL_SIZE
            self._bounce(offset=(self.ball_y - self.ai_y) / self.PADDLE_H - 0.5)

    def _bounce(self, offset: float) -> None:
        self.ball_vx *= -1
        self.ball_vy = offset * self.BALL_SPEED * 1.4
        if abs(self.ball_vy) < 40:
            self.ball_vy = 40 if self.ball_vy >= 0 else -40

    # -- rendering -----------------------------------------------------------
    def draw(self, surface: pygame.Surface) -> None:
        surface.fill(BLACK)
        for y in range(0, self.height, 24):
            pygame.draw.rect(surface, GRAY, (self.width // 2 - 2, y, 4, 12))

        pygame.draw.rect(
            surface, PONG_ACCENT, (20, self.player_y, self.PADDLE_W, self.PADDLE_H)
        )
        pygame.draw.rect(
            surface,
            PONG_WHITE,
            (self.width - 20 - self.PADDLE_W, self.ai_y, self.PADDLE_W, self.PADDLE_H),
        )
        pygame.draw.rect(
            surface, PONG_WHITE, (self.ball_x, self.ball_y, self.BALL_SIZE, self.BALL_SIZE)
        )


def main() -> None:  # pragma: no cover - interactive entry point
    from ..runner import run_standalone

    run_standalone(PongGame)


if __name__ == "__main__":  # pragma: no cover
    main()
