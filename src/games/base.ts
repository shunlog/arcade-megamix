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
  /**
   * Global speed multiplier, driven by the current level (1.0 at level 0,
   * +0.1 per level). Every mini-game scales its speeds by this value so the
   * whole arcade gets faster together. Standalone runs leave it at 1.0.
   */
  speedMultiplier = 1.0;
  /**
   * Global score multiplier, driven by the current level (1.0 at level 0,
   * then +0.1, +0.2, +0.3, ... per level). Every score award is scaled by it
   * and rounded up. Standalone runs leave it at 1.0.
   */
  scoreMultiplier = 1.0;

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
    this.score += Math.ceil(amount * this.scoreMultiplier);
  }
}
