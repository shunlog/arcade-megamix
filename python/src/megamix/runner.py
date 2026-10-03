"""Run a single mini-game on its own, for testing and development."""

from __future__ import annotations

import pygame

from .config import BLACK, GRAY, SCREEN_H, SCREEN_W, WHITE, PixelFont


def run_standalone(game_cls) -> None:  # pragma: no cover - interactive
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    pygame.display.set_caption(f"Megamix - {game_cls.name if hasattr(game_cls, 'name') else game_cls.__name__}")
    clock = pygame.time.Clock()
    big = PixelFont(size=14, scale=3)
    small = PixelFont(size=10, scale=2)

    game = game_cls(SCREEN_W, SCREEN_H)
    running = True
    while running:
        dt = clock.tick(60) / 1000.0
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_r and not game.alive:
                    game.reset()
                else:
                    game.on_keydown(event.key)
            elif event.type == pygame.KEYUP:
                game.on_keyup(event.key)

        if game.alive:
            game.update(dt)

        screen.fill(BLACK)
        game.draw(screen)

        score = big.render(f"{game.score:06d}", WHITE)
        screen.blit(score, (SCREEN_W - score.get_width() - 16, 12))
        name = small.render(game.name, GRAY)
        screen.blit(name, (16, 16))

        if not game.alive:
            over = big.render("GAME OVER", WHITE)
            hint = small.render("press R to restart / ESC to quit", GRAY)
            screen.blit(over, ((SCREEN_W - over.get_width()) // 2, SCREEN_H // 2 - 40))
            screen.blit(hint, ((SCREEN_W - hint.get_width()) // 2, SCREEN_H // 2 + 40))

        pygame.display.flip()

    pygame.quit()
