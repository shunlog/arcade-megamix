"""Common interface for every mini-game.

Each mini-game is a small ADT-ish object that owns its own persistent state.
The main app just swaps which one receives frames; nothing is reset between
switches, so the player resumes exactly where they left off.
"""

from __future__ import annotations

import abc

import pygame


class MiniGame(abc.ABC):
    name: str = "game"

    def __init__(self, width: int, height: int) -> None:
        self.width = width
        self.height = height
        self.score = 0
        self.alive = True
        self.pressed: set[int] = set()
        self.reset()

    # -- input ---------------------------------------------------------------
    def on_keydown(self, key: int) -> None:
        self.pressed.add(key)

    def on_keyup(self, key: int) -> None:
        self.pressed.discard(key)

    # -- lifecycle -----------------------------------------------------------
    @abc.abstractmethod
    def reset(self) -> None:
        """Start a fresh run (also resets score)."""

    @abc.abstractmethod
    def update(self, dt: float) -> bool:
        """Advance one frame. Returns False once the player has died."""

    @abc.abstractmethod
    def draw(self, surface: pygame.Surface) -> None:
        """Render the current state."""

    # -- helpers -------------------------------------------------------------
    def add_score(self, amount: int) -> None:
        self.score += amount
