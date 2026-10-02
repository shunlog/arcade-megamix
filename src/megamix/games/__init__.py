"""Mini-game exports, in switching order."""

from .asteroids import AsteroidsGame
from .pacman import PacmanGame
from .pong import PongGame
from .snake import SnakeGame
from .tron import TronGame

# The order the app cycles through.
GAME_ORDER = (SnakeGame, AsteroidsGame, PongGame, TronGame, PacmanGame)

__all__ = [
    "SnakeGame",
    "AsteroidsGame",
    "PongGame",
    "TronGame",
    "PacmanGame",
    "GAME_ORDER",
]
