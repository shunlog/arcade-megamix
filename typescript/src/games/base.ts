// Common interface for every mini-game.
//
// Each mini-game is a small ADT-ish object that owns its own persistent state.
// The main app just swaps which one receives frames; nothing is reset between
// switches, so the player resumes exactly where they left off.

import type { KeyCode } from "../keys.js";

export abstract class MiniGame {
  name = "game";
  readonly width: number;
  readonly height: number;
  score = 0;
  alive = true;
  readonly pressed = new Set<KeyCode>();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  // -- input ---------------------------------------------------------------
  onKeyDown(key: KeyCode): void {
    this.pressed.add(key);
  }

  onKeyUp(key: KeyCode): void {
    this.pressed.delete(key);
  }

  // -- lifecycle -----------------------------------------------------------
  /** Start a fresh run (also resets score). */
  abstract reset(): void;

  /** Advance one frame. Returns false once the player has died. */
  abstract update(dt: number): boolean;

  /** Render the current state. */
  abstract draw(ctx: CanvasRenderingContext2D): void;

  // -- helpers -------------------------------------------------------------
  addScore(amount: number): void {
    this.score += amount;
  }
}
