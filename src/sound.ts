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
    switch (name) {
      case "tick":
        this.tone(587, 0.07, TICK_VOLUME * 0.6, "triangle", 0, 523);
        this.tone(1175, 0.05, 0.06, "sine");
        break;
      case "tickFinal":
        this.tone(880, 0.09, TICK_VOLUME * 0.6, "triangle", 0, 784);
        this.tone(1760, 0.06, 0.06, "sine");
        break;

      case "menuMove":
        this.tone(660, 0.045, 0.06, "square");
        break;
      case "menuSelect":
        this.tone(520, 0.06, 0.08, "square");
        this.tone(780, 0.08, 0.08, "square", 0.06);
        break;
      case "start":
        this.tone(440, 0.07, 0.08, "square");
        this.tone(660, 0.07, 0.08, "square", 0.08);
        this.tone(880, 0.1, 0.08, "square", 0.16);
        break;
      case "pause":
        this.tone(560, 0.08, 0.08, "triangle");
        this.tone(360, 0.12, 0.08, "triangle", 0.08);
        break;
      case "resume":
        this.tone(360, 0.08, 0.08, "triangle");
        this.tone(560, 0.12, 0.08, "triangle", 0.08);
        break;
      case "quit":
        this.tone(420, 0.09, 0.09, "square", 0, 180);
        break;
      case "death":
        this.tone(660, 0.12, 0.12, "square", 0.0);
        this.tone(523, 0.12, 0.12, "square", 0.13);
        this.tone(392, 0.12, 0.12, "square", 0.26);
        this.tone(262, 0.42, 0.13, "square", 0.39, 110);
        break;

      case "paddle":
        this.tone(480, 0.05, 0.09, "square");
        break;
      case "paddleCpu":
        this.tone(320, 0.05, 0.07, "square");
        break;
      case "wall":
        this.tone(260, 0.04, 0.05, "triangle");
        break;
      case "goal":
        this.tone(660, 0.06, 0.09, "square");
        this.tone(880, 0.06, 0.09, "square", 0.06);
        this.tone(1100, 0.12, 0.09, "square", 0.12);
        break;

      case "pellet":
        this.tone(720, 0.035, 0.055, "triangle");
        break;

      case "snakeTurn":
        this.tone(300, 0.035, 0.06, "square");
        break;
      case "apple":
        this.tone(620, 0.06, 0.08, "square");
        this.tone(930, 0.09, 0.08, "square", 0.06);
        break;

      case "tronTurn":
        this.tone(820, 0.03, 0.06, "square");
        break;
      case "tronTurnEnemy":
        this.tone(520, 0.03, 0.045, "square");
        break;
      case "tronKill":
        this.tone(180, 0.3, 0.1, "sawtooth", 0, 900);
        break;

      case "shoot":
        this.tone(900, 0.07, 0.06, "square", 0, 300);
        break;
      case "explode":
        this.tone(150, 0.16, 0.1, "square", 0, 70);
        this.tone(90, 0.14, 0.07, "triangle", 0.01, 55);
        break;
    }
  }
}
