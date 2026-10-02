from megamix.config import SCORE_TRON_KILL
from megamix.games.tron import DOWN, LEFT, RIGHT, TronGame


def make_game() -> TronGame:
    g = TronGame(400, 300)
    g.reset()
    return g


def test_reverse_turn_is_rejected() -> None:
    g = make_game()
    g.player.direction = RIGHT
    assert g.queue_turn(g.player, LEFT) is False


def test_player_hitting_wall_dies() -> None:
    g = make_game()
    g.player.x, g.player.y = 0, 0
    g.player.direction = LEFT
    g.player.trail = {(0, 0)}
    g.enemy = None

    g.tick()

    assert g.alive is False


def test_enemy_crash_awards_kill_points() -> None:
    g = make_game()
    # Corner the enemy so its only in-bounds move runs into the player's trail.
    g.enemy.x, g.enemy.y = 0, 0
    g.enemy.direction = LEFT
    g.enemy.trail = {(0, 0)}
    g.player.x, g.player.y = 10, 10
    g.player.trail = {(10, 10), (1, 0), (0, 1)}
    before = g.score

    g.tick()

    assert g.enemy is None
    assert g.score == before + SCORE_TRON_KILL


def test_player_leaves_a_trail() -> None:
    g = make_game()
    g.enemy = None
    start = (g.player.x, g.player.y)

    g.tick()

    assert start in g.player.trail
