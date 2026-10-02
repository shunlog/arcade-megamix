Write a game in pygame that combines the classic video games listed below:
- snake
- asteroids
- pong
- tron
- pac-man

Use pygame and uv.

The game will be in the form of mini-games that switch 
at an increasingly faster rate,
and the player aims to get the highest score.

The idea is that the game starts with the first mini-game (snake), 
then after 10 seconds it switches to the next one (asteroids), 
another 10 seconds, next mini-game, so on and so forth,
once it reaches the last one in the list, 
it goes back to the first mini-game,
but now each round lasts 9 seconds.
The duration of the round keeps decreasing by 1 second on each loop
but is capped at 3 seconds.
The game is over when the player dies in any of the mini-games.

In the top-left, show the remaining time until the game switches.

Show a score in the top-right of the screen, in a big pixel font.
The scoring should be normalized accross all mini-games,
so for example eating a pellet in pac-man is worth only 1 point,
but killing a rider in tron is worth way more points.

Each mini-game's state is saved, so the player continues from where they left off.
For snake, tron and pac-man, don't worry about what happens when the game ends.
Only in the case of asteroids, make new asteroids appear on each new loop.

Make it so each mini-game should be runnable on its own, for testability.
Use ADTs for each game and write a few tests for them.

Keep it simple.

For snake, make it feel like a clone of the Google snake game in pygame.
Put emphasis on correct controls, the rotation inputs should be queued correctly.