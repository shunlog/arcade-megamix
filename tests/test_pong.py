from megamix.config import SCORE_PONG_GOAL, SCORE_PONG_HIT
from megamix.games.pong import PongGame


def make_game() -> PongGame:
    g = PongGame(400, 300)
    g.reset()
    return g


def test_player_paddle_hit_scores() -> None:
    g = make_game()
    g.player_y = 100
    g.ball_x = 20 + g.PADDLE_W + 1
    g.ball_y = 110
    g.ball_vx = -g.BALL_SPEED
    g.ball_vy = 0
    before = g.score

    g.update(0.016)

    assert g.score == before + SCORE_PONG_HIT
    assert g.ball_vx > 0


def test_ball_past_player_kills() -> None:
    g = make_game()
    g.ball_x = -20
    g.ball_vx = -g.BALL_SPEED
    assert g.update(0.016) is False


def test_ball_past_ai_scores_and_re_serves() -> None:
    g = make_game()
    g.ball_x = g.width + 5
    g.ball_vx = g.BALL_SPEED
    before = g.score

    g.update(0.016)

    assert g.score == before + SCORE_PONG_GOAL
    assert g.ball_vx < 0
