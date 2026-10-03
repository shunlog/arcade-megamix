from megamix.config import SCORE_PAC_PELLET
from megamix.games.pacman import LEFT, RIGHT, Ghost, PacmanGame


def make_game() -> PacmanGame:
    g = PacmanGame(608, 480)
    g.reset()
    return g


def test_eating_a_pellet_scores_one_point() -> None:
    g = make_game()
    g.ghosts = []
    g.pac_x, g.pac_y = 5, 1
    g.pac_dir = RIGHT
    g.pellets = {(6, 1), (7, 1)}
    g.score = 0

    g._step_pac()

    assert g.score == SCORE_PAC_PELLET
    assert (6, 1) not in g.pellets
    assert (g.pac_x, g.pac_y) == (6, 1)


def test_walls_block_movement() -> None:
    g = make_game()
    g.ghosts = []
    g.pac_x, g.pac_y = 1, 1
    g.pac_dir = LEFT

    g._step_pac()

    assert (g.pac_x, g.pac_y) == (1, 1)


def test_touching_a_ghost_kills() -> None:
    g = make_game()
    g.ghosts = [Ghost(g.pac_x, g.pac_y, LEFT, (255, 0, 0))]

    g._check_collision()

    assert g.alive is False
