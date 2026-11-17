// All sound is synthesised live with WebAudio — no audio files, nothing to load.
// Short oscillator blips and filtered noise bursts, one voice per game event, plus a
// master gain the player can mute with M. The context starts on the first gesture,
// as browsers require, so title-screen silence is normal until the player clicks.

export class SoundBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
  }

  /** Create the context on a user gesture; safe to call again. */
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.context.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
    return this.muted;
  }

  /** One oscillator note: frequency slides from f0 to f1 over `seconds`. */
  tone(f0, f1, seconds, type = 'square', volume = 0.5, delay = 0) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, f0), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  /** One burst of white noise through a falling low-pass filter: explosions and hits. */
  noise(seconds, volume = 0.5, delay = 0) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + delay;
    const frames = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, start);
    filter.frequency.exponentialRampToValueAtTime(120, start + seconds);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
  }

  shoot() { this.tone(880, 320, 0.09, 'square', 0.16); }
  dash() { this.noise(0.16, 0.22); this.tone(220, 660, 0.14, 'sine', 0.2); }
  foeDown() { this.noise(0.22, 0.4); this.tone(300, 60, 0.2, 'sawtooth', 0.25); }
  pickup() { this.tone(660, 990, 0.08, 'sine', 0.3); this.tone(990, 1320, 0.1, 'sine', 0.22, 0.05); }
  heart() { this.tone(520, 780, 0.16, 'sine', 0.35); this.tone(780, 1040, 0.18, 'sine', 0.3, 0.08); }
  hurt() { this.noise(0.18, 0.45); this.tone(160, 70, 0.22, 'sawtooth', 0.35); }
  waveStart() { this.tone(392, 392, 0.1, 'triangle', 0.3); this.tone(523, 523, 0.1, 'triangle', 0.3, 0.1); this.tone(659, 659, 0.16, 'triangle', 0.32, 0.2); }
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.22, 'triangle', 0.32, i * 0.13)); }
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.94, 0.26, 'triangle', 0.3, i * 0.15)); }
}
