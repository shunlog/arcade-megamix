from collections import deque

from megamix.config import SCORE_SNAKE_APPLE
from megamix.games.snake import DOWN, LEFT, RIGHT, UP, SnakeGame


def make_game() -> SnakeGame:
    g = SnakeGame(400, 300)
    g.reset()
    return g


def test_reversal_and_duplicate_turns_are_rejected() -> None:
    g = make_game()
    g.direction = RIGHT
    assert g.turn(LEFT) is False
    assert g.turn(RIGHT) is False
    assert g.turn(UP) is True
    # DOWN would reverse the most recently queued UP.
    assert g.turn(DOWN) is False


def test_turns_are_buffered_and_applied_one_per_step() -> None:
    g = make_game()
    g.direction = RIGHT
    g.pending.clear()
    assert g.turn(UP)
    assert g.turn(LEFT)

    g.step()
    assert g.direction == UP
    assert list(g.pending) == [LEFT]

    g.step()
    assert g.direction == LEFT


def test_eating_apple_grows_snake_and_scores() -> None:
    g = make_game()
    head = g.snake[0]
    g.apple = (head[0] + 1, head[1])
    g.direction = RIGHT
    length = len(g.snake)

    g.step()

    assert len(g.snake) == length + 1
    assert g.score == SCORE_SNAKE_APPLE
    assert g.apple not in g.snake


def test_hitting_a_wall_kills() -> None:
    g = make_game()
    g.snake = deque([(g.cols - 1, 5)])
    g.direction = RIGHT
    g.apple = (0, 0)

    g.step()

    assert g.alive is False


def test_hitting_the_body_kills() -> None:
    g = make_game()
    # A little loop; the head moves into the body cell at (6, 5).
    g.snake = deque([(5, 5), (5, 6), (6, 6), (6, 5), (4, 5)])
    g.direction = RIGHT
    g.apple = (0, 0)

    g.step()

    assert g.alive is False
