// Browsers keep an AudioContext "suspended" until the page has received a
// user gesture (key press / click), so `resume()` must be called from inside
// an input handler before anything will be audible.

export type Sfx =
  | "tick"
  | "tickFinal"
  | "menuMove"
  | "menuSelect"
  | "pause"
  | "resume"
  | "quit"
  | "start"
  | "death"
  | "paddle"
  | "paddleCpu"
  | "wall"
  | "goal"
  | "pellet"
  | "snakeTurn"
  | "apple"
  | "tronTurn"
  | "tronTurnEnemy"
  | "tronKill"
  | "shoot"
  | "explode";

const TICK_VOLUME = 0.4;

type Tone = readonly [
  freq: number,
  duration: number,
  volume?: number,
  type?: OscillatorType,
  delay?: number,
  endFreq?: number,
];

const SFX: Record<Sfx, readonly Tone[]> = {
  tick: [
    [587, 0.07, TICK_VOLUME * 0.6, "triangle", 0, 523],
    [1175, 0.05, 0.06, "sine"],
  ],
  tickFinal: [
    [880, 0.09, TICK_VOLUME * 0.6, "triangle", 0, 784],
    [1760, 0.06, 0.06, "sine"],
  ],

  menuMove: [[660, 0.045, 0.06, "square"]],
  menuSelect: [
    [520, 0.06, 0.08, "square"],
    [780, 0.08, 0.08, "square", 0.06],
  ],
  start: [
    [440, 0.07, 0.08, "square"],
    [660, 0.07, 0.08, "square", 0.08],
    [880, 0.1, 0.08, "square", 0.16],
  ],
  pause: [
    [560, 0.08, 0.08, "triangle"],
    [360, 0.12, 0.08, "triangle", 0.08],
  ],
  resume: [
    [360, 0.08, 0.08, "triangle"],
    [560, 0.12, 0.08, "triangle", 0.08],
  ],
  quit: [[420, 0.09, 0.09, "square", 0, 180]],
  death: [
    [660, 0.12, 0.12, "square"],
    [523, 0.12, 0.12, "square", 0.13],
    [392, 0.12, 0.12, "square", 0.26],
    [262, 0.42, 0.13, "square", 0.39, 110],
  ],

  paddle: [[480, 0.05, 0.09, "square"]],
  paddleCpu: [[320, 0.05, 0.07, "square"]],
  wall: [[260, 0.04, 0.05, "triangle"]],
  goal: [
    [660, 0.06, 0.09, "square"],
    [880, 0.06, 0.09, "square", 0.06],
    [1100, 0.12, 0.09, "square", 0.12],
  ],

  pellet: [[720, 0.035, 0.055, "triangle"]],

  snakeTurn: [[300, 0.035, 0.06, "square"]],
  apple: [
    [620, 0.06, 0.08, "square"],
    [930, 0.09, 0.08, "square", 0.06],
  ],

  tronTurn: [[820, 0.03, 0.06, "square"]],
  tronTurnEnemy: [[520, 0.03, 0.045, "square"]],
  tronKill: [[180, 0.3, 0.1, "sawtooth", 0, 900]],

  shoot: [[900, 0.07, 0.06, "square", 0, 300]],
  explode: [
    [150, 0.16, 0.1, "square", 0, 70],
    [90, 0.14, 0.07, "triangle", 0.01, 55],
  ],
};

export class Buzzer {
  private ctx: AudioContext | null = null;

  resume(): void {
    if (this.ctx === null) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private tone(
    freq: number,
    duration: number,
    volume = 0.08,
    type: OscillatorType = "square",
    delay = 0,
    endFreq?: number,
  ): void {
    const ctx = this.ctx;
    if (ctx === null) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  tick(index: number): void {
    this.sfx(index >= 7 ? "tickFinal" : "tick");
  }

  sfx(name: Sfx): void {
    for (const [freq, duration, volume, type, delay, endFreq] of SFX[name]) {
      this.tone(freq, duration, volume, type, delay, endFreq);
    }
  }
}
