from megamix.app import RoundManager


def test_round_duration_shrinks_and_is_capped() -> None:
    rm = RoundManager(count=5)
    assert rm.duration == 10
    rm.loops = 1
    assert rm.duration == 9
    rm.loops = 7
    assert rm.duration == 3
    rm.loops = 50
    assert rm.duration == 3


def test_tick_switches_after_a_full_round() -> None:
    rm = RoundManager(count=5)
    assert rm.tick(9.9) is False
    assert rm.index == 0
    assert rm.tick(0.2) is True
    rm.advance()
    assert rm.index == 1


def test_advance_wraps_and_shortens_the_next_loop() -> None:
    rm = RoundManager(count=5)
    for _ in range(5):
        rm.advance()
    assert rm.index == 0
    assert rm.loops == 1
    assert rm.remaining == 9


def test_each_switch_gives_a_full_duration() -> None:
    rm = RoundManager(count=2)
    rm.tick(10.1)
    rm.advance()
    assert rm.remaining == 10
    rm.tick(10.1)
    rm.advance()
    assert rm.index == 0
    assert rm.loops == 1
    assert rm.remaining == 9


def test_app_cycles_through_every_game_and_adds_asteroids_on_wrap() -> None:
    import pygame

    from megamix.app import App
    from megamix.games import AsteroidsGame, GAME_ORDER

    pygame.font.init()
    app = App()
    asteroids = next(g for g in app.games if isinstance(g, AsteroidsGame))
    rocks = len(asteroids.asteroids)

    seen = [app.active.name]
    for _ in range(len(GAME_ORDER)):
        app._switch()
        seen.append(app.active.name)

    assert app.round.loops == 1
    assert seen[0] == seen[-1]  # back to the first mini-game
    assert len(asteroids.asteroids) == rocks + 2  # fresh wave on the new loop
