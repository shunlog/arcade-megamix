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

export class Buzzer {
  private ctx: AudioContext | null = null;
  private elapsed = 0;

  /**
   * Create / resume the audio engine. Safe to call repeatedly; call it from
   * a keydown or click handler so the browser unlocks audio.
   */
  resume(): void {
    if (this.ctx === null) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** Play a single short buzz (a square wave with a snappy envelope). */
  buzz(freq = 220, duration = 0.08): void {
    const ctx = this.ctx;
    if (ctx === null) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now);

    // An envelope that jumps up then decays avoids the "click" you get from
    // starting/stopping a tone at full volume. exponentialRamp can never
    // reach exactly 0, so use a tiny non-zero value.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(ctx.destination);

    // Fire and forget: the oscillator cleans itself up after stop().
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /** Advance the clock and buzz once every second. Call once per frame. */
  update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed >= 1.0) {
      this.elapsed -= 1.0;
      this.buzz();
    }
  }
}
