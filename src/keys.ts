// Keyboard codes as used by the DOM `KeyboardEvent.code` values.

export const Keys = {
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  W: "KeyW",
  A: "KeyA",
  S: "KeyS",
  D: "KeyD",
  SPACE: "Space",
  ENTER: "Enter",
  R: "KeyR",
  ESC: "Escape",
  P: "KeyP",
  Q: "KeyQ",
} as const;

export type KeyCode = (typeof Keys)[keyof typeof Keys] | string;
