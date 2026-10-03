"""Shared constants, colors and a chunky pixel font helper."""

from __future__ import annotations

import pygame

# --- Screen -----------------------------------------------------------------
SCREEN_W = 800
SCREEN_H = 600
FPS = 60

# --- Palette ----------------------------------------------------------------
BLACK = (8, 8, 16)
WHITE = (240, 240, 240)
GRAY = (90, 90, 110)
DARK = (24, 24, 38)

SNAKE_GREEN = (86, 191, 74)
SNAKE_HEAD = (140, 220, 90)
APPLE_RED = (222, 58, 58)

ASTEROID_GRAY = (170, 170, 180)
SHIP_WHITE = (235, 235, 245)
BULLET_YELLOW = (250, 230, 120)

PONG_WHITE = (240, 240, 240)
PONG_ACCENT = (120, 200, 255)

TRON_PLAYER = (90, 200, 255)
TRON_ENEMY = (255, 120, 90)
TRON_GRID = (20, 30, 45)

PAC_YELLOW = (250, 220, 40)
GHOST_RED = (230, 60, 60)
GHOST_PINK = (240, 140, 190)
GHOST_CYAN = (90, 220, 230)
PELLET = (240, 210, 160)

# --- Scoring (normalised across games) --------------------------------------
# Pac-Man pellet is the baseline: 1 point.
SCORE_PAC_PELLET = 1
SCORE_SNAKE_APPLE = 5
SCORE_PONG_HIT = 1
SCORE_PONG_GOAL = 10
SCORE_ASTEROID_BIG = 10
SCORE_ASTEROID_SMALL = 5
SCORE_TRON_KILL = 25


class PixelFont:
    """A cheap pixel font: render small without AA, then scale up.

    Keeps the project dependency-free (no font asset) while giving the
    requested big blocky look.
    """

    def __init__(self, size: int = 12, scale: int = 3) -> None:
        if not pygame.font.get_init():
            pygame.font.init()
        self.base = pygame.font.SysFont("couriernew", size, bold=True)
        self.scale = scale

    def render(self, text: str, color, scale: int | None = None) -> pygame.Surface:
        scale = self.scale if scale is None else scale
        surf = self.base.render(text, False, color)
        w = max(1, surf.get_width() * scale)
        h = max(1, surf.get_height() * scale)
        return pygame.transform.scale(surf, (w, h))
