from megamix.config import SCORE_ASTEROID_BIG, SCORE_ASTEROID_SMALL
from megamix.games.asteroids import Asteroid, AsteroidsGame, Bullet


def make_game() -> AsteroidsGame:
    g = AsteroidsGame(400, 300)
    g.reset()
    return g


def test_add_wave_adds_asteroids() -> None:
    g = make_game()
    before = len(g.asteroids)
    g.add_wave(2)
    assert len(g.asteroids) == before + 2


def test_shooting_a_big_asteroid_splits_it_and_scores() -> None:
    g = make_game()
    g.asteroids = [Asteroid(100, 100, 0, 0, 25)]
    g.bullets = [Bullet(100, 100, 0, 0)]

    g._collide_bullets()

    assert g.score == SCORE_ASTEROID_BIG
    assert len(g.asteroids) == 2  # split into two smaller rocks
    assert len(g.bullets) == 0


def test_shooting_a_small_asteroid_does_not_split() -> None:
    g = make_game()
    g.asteroids = [Asteroid(100, 100, 0, 0, 10)]
    g.bullets = [Bullet(100, 100, 0, 0)]

    g._collide_bullets()

    assert g.score == SCORE_ASTEROID_SMALL
    assert len(g.asteroids) == 0


def test_ship_collision_kills() -> None:
    g = make_game()
    g.asteroids = [Asteroid(g.ship_x, g.ship_y, 0, 0, 25)]
    g._collide_ship()
    assert g.alive is False
