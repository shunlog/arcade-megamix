"""Main application: cycle through the mini-games, switching ever faster."""

from __future__ import annotations

from dataclasses import dataclass, field

import pygame

from .config import BLACK, GRAY, SCREEN_H, SCREEN_W, WHITE, PixelFont
from .games import GAME_ORDER, AsteroidsGame


@dataclass
class RoundManager:
    """Tracks which mini-game is active and how long until the next switch.

    Rounds start at ``start`` seconds and shrink by ``step`` on every full
    loop through all games, down to a ``floor``.
    """

    count: int
    start: float = 10.0
    step: float = 1.0
    floor: float = 3.0
    index: int = 0
    loops: int = 0
    remaining: float = field(default=0.0)

    def __post_init__(self) -> None:
        self.remaining = self.duration

    @property
    def duration(self) -> float:
        return max(self.floor, self.start - self.loops * self.step)

    def tick(self, dt: float) -> bool:
        """Advance time. Returns True when it is time to switch games.

        This does not move to the next game itself; the caller does that via
        :meth:`advance` so a switch can only happen once per expiry.
        """
        self.remaining -= dt
        return self.remaining <= 0

    def advance(self) -> bool:
        """Move to the next game. Returns True if a new loop began."""
        self.index += 1
        wrapped = False
        if self.index >= self.count:
            self.index = 0
            self.loops += 1
            wrapped = True
        self.remaining = self.duration
        return wrapped


class App:
    def __init__(self, width: int = SCREEN_W, height: int = SCREEN_H) -> None:
        self.width = width
        self.height = height
        self.big = PixelFont(size=14, scale=3)
        self.small = PixelFont(size=10, scale=2)
        self.games = [cls(width, height) for cls in GAME_ORDER]
        self.round = RoundManager(len(self.games))
        self.game_over = False

    @property
    def active(self):
        return self.games[self.round.index]

    @property
    def total_score(self) -> int:
        return sum(g.score for g in self.games)

    def restart(self) -> None:
        self.games = [cls(self.width, self.height) for cls in GAME_ORDER]
        self.round = RoundManager(len(self.games))
        self.game_over = False

    def _switch(self) -> None:
        wrapped = self.round.advance()
        # Every mini-game keeps its state; only Asteroids gets a fresh wave
        # on each new loop through the full rotation.
        if wrapped:
            for g in self.games:
                if isinstance(g, AsteroidsGame):
                    g.add_wave(2)
        # Drop held keys so a key held through the switch doesn't stick.
        for g in self.games:
            g.pressed.clear()

    def update(self, dt: float) -> None:
        if self.game_over:
            return
        if self.round.tick(dt):
            self._switch()
        if not self.active.update(dt):
            self.game_over = True

    def handle_event(self, event: pygame.event.Event) -> bool:
        """Returns False when the app should quit."""
        if event.type == pygame.QUIT:
            return False
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                return False
            if self.game_over and event.key == pygame.K_r:
                self.restart()
                return True
        if not self.game_over:
            if event.type == pygame.KEYDOWN:
                self.active.on_keydown(event.key)
            elif event.type == pygame.KEYUP:
                self.active.on_keyup(event.key)
        return True

    def draw(self, surface: pygame.Surface) -> None:
        self.active.draw(surface)

        # top-left: time until the next switch + current mini-game name
        secs = max(0.0, self.round.remaining)
        timer = self.big.render(f"{secs:04.1f}", WHITE)
        surface.blit(timer, (16, 12))
        label = self.small.render(self.active.name, GRAY)
        surface.blit(label, (18, 12 + timer.get_height() + 6))

        # top-right: big pixel score
        score = self.big.render(f"{self.total_score:06d}", WHITE)
        surface.blit(score, (self.width - score.get_width() - 16, 12))

        if self.game_over:
            over = self.big.render("GAME OVER", WHITE)
            hint = self.small.render("R = restart    ESC = quit", GRAY)
            surface.blit(over, ((self.width - over.get_width()) // 2, self.height // 2 - 60))
            final = self.small.render(f"FINAL SCORE {self.total_score}", GRAY)
            surface.blit(final, ((self.width - final.get_width()) // 2, self.height // 2))
            surface.blit(hint, ((self.width - hint.get_width()) // 2, self.height // 2 + 40))


def main() -> None:  # pragma: no cover - interactive entry point
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    pygame.display.set_caption("Arcade Megamix")
    clock = pygame.time.Clock()
    app = App()

    running = True
    while running:
        dt = clock.tick(60) / 1000.0
        for event in pygame.event.get():
            running = app.handle_event(event)
            if not running:
                break
        app.update(dt)
        screen.fill(BLACK)
        app.draw(screen)
        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":  # pragma: no cover
    main()
