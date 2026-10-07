// The browser sound primitive: the Web Audio API.
//
// All sound is built from a graph of nodes connected together. For a plain
// one-shot tone that is just three node types:
//
//   AudioContext     the audio "engine" and its clock (currentTime, sample rate)
//   OscillatorNode   generates a periodic waveform: the tone source
//   GainNode         scales loudness; ramping its gain shapes the envelope
//
// The graph for one buzz is:  oscillator -> gain -> destination (speakers)
//
// Browsers keep an AudioContext "suspended" until the page has received a
// user gesture (key press / click), so `resume()` must be called from inside
// an input handler before anything will be audible.
//
// Two loudness tiers keep the mix readable: the rotation `tick` buzzes are
// deliberately loud (the beat is the game's heartbeat), while mini-game and
// menu effects sit well under them so they can never drown the tick out.

/** Every one-shot effect the arcade can trigger. */
export type Sfx =
  // menus / shell
  | "menuMove"
  | "menuSelect"
  | "pause"
  | "resume"
  | "quit"
  | "start"
  | "death"
  // pong
  | "paddle"
  | "paddleCpu"
  | "wall"
  | "goal"
  // pac-man
  | "pellet"
  // snake
  | "snakeTurn"
  | "apple"
  // tron
  | "tronTurn"
  | "tronTurnEnemy"
  | "tronKill"
  // asteroids
  | "shoot"
  | "explode";

/** Peak gain of the loud rotation tick; effects stay far below this. */
const TICK_VOLUME = 0.4;

export class Buzzer {
  private ctx: AudioContext | null = null;

  /**
   * Create / resume the audio engine. Safe to call repeatedly; call it from
   * a keydown or click handler so the browser unlocks audio.
   */
  resume(): void {
    if (this.ctx === null) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /**
   * Schedule one enveloped tone. `delay` shifts it into the future so a
   * sequence of calls forms a melody; `endFreq` slides the pitch (a sweep).
   */
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

    // An envelope that jumps up then decays avoids the "click" you get from
    // starting/stopping a tone at full volume. exponentialRamp can never
    // reach exactly 0, so use a tiny non-zero value.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(ctx.destination);

    // Fire and forget: the oscillator cleans itself up after stop().
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /** Play a single short buzz (a square wave with a snappy envelope). */
  buzz(freq = 220, duration = 0.08, volume = 0.15): void {
    this.tone(freq, duration, volume);
  }

  /**
   * Buzz a rotation tick. Ticks 0-5 are the playing ticks; the final two
   * ticks of the cycle (pause and the incoming game) use a different pitch.
   * These are the loudest sounds in the mix by design.
   */
  tick(index: number): void {
    this.buzz(index >= 7 ? 440 : 220, 0.09, TICK_VOLUME);
  }

  /** Play a named mini-game / menu effect. */
  sfx(name: Sfx): void {
    switch (name) {
      // -- shell -----------------------------------------------------------
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
        // A little descending game-over melody.
        this.tone(660, 0.12, 0.12, "square", 0.0);
        this.tone(523, 0.12, 0.12, "square", 0.13);
        this.tone(392, 0.12, 0.12, "square", 0.26);
        this.tone(262, 0.42, 0.13, "square", 0.39, 110);
        break;

      // -- pong ------------------------------------------------------------
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

      // -- pac-man ---------------------------------------------------------
      case "pellet":
        // Short and quiet: this fires very often.
        this.tone(720, 0.035, 0.05, "triangle");
        break;

      // -- snake -----------------------------------------------------------
      case "snakeTurn":
        this.tone(300, 0.035, 0.06, "square");
        break;
      case "apple":
        this.tone(620, 0.06, 0.08, "square");
        this.tone(930, 0.09, 0.08, "square", 0.06);
        break;

      // -- tron ------------------------------------------------------------
      case "tronTurn":
        this.tone(820, 0.03, 0.06, "square");
        break;
      case "tronTurnEnemy":
        this.tone(520, 0.03, 0.045, "square");
        break;
      case "tronKill":
        this.tone(180, 0.3, 0.1, "sawtooth", 0, 900);
        break;

      // -- asteroids -------------------------------------------------------
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
