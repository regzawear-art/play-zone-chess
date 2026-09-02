// Web Audio API sound system — synthesized in-browser, no asset files needed.
// Crisp, instant response with mute + volume control.

type SoundName = 'move' | 'capture' | 'check' | 'checkmate' | 'castle' | 'select' | 'game-start' | 'game-end' | 'tick' | 'victory';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;
  private _volume = 0.7;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : this._volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  private musicOsc: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private musicLfo: OscillatorNode | null = null;
  private _musicMuted = true;

  get muted() {
    return this._muted;
  }
  get volume() {
    return this._volume;
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this._volume;
    if (m) this.stopMusic();
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.master && !this._muted) this.master.gain.value = this._volume;
  }

  get musicMuted() { return this._musicMuted; }

  toggleMusic() {
    if (this._musicMuted) this.startMusic();
    else this.stopMusic();
  }

  startMusic() {
    const ctx = this.ensure();
    if (!this.master || this.musicOsc) return;
    this._musicMuted = false;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.04;
    this.musicGain.connect(this.master);
    this.musicOsc = ctx.createOscillator();
    this.musicOsc.type = 'sine';
    this.musicOsc.frequency.value = 220;
    this.musicOsc.connect(this.musicGain);
    this.musicOsc.start();
    // gentle vibrato
    this.musicLfo = ctx.createOscillator();
    this.musicLfo.type = 'sine';
    this.musicLfo.frequency.value = 0.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 15;
    this.musicLfo.connect(lfoGain);
    lfoGain.connect(this.musicOsc.frequency);
    this.musicLfo.start();
  }

  stopMusic() {
    this._musicMuted = true;
    if (this.musicOsc) {
      try { this.musicOsc.stop(); } catch {}
      this.musicOsc.disconnect();
      this.musicOsc = null;
    }
    if (this.musicLfo) {
      try { this.musicLfo.stop(); } catch {}
      this.musicLfo.disconnect();
      this.musicLfo = null;
    }
    if (this.musicGain) {
      this.musicGain.disconnect();
      this.musicGain = null;
    }
  }

  private tone(
    freq: number,
    start: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    freqEnd?: number,
  ) {
    const ctx = this.ensure();
    if (!this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + dur);
    }
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private noiseBurst(start: number, dur: number, gain: number, filterFreq: number) {
    const ctx = this.ensure();
    if (!this.master) return;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  play(name: SoundName) {
    if (this._muted) return;
    const ctx = this.ensure();
    if (!this.master) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'select':
        this.tone(660, t, 0.06, 'sine', 0.12);
        break;
      case 'move':
        // wooden tap — short filtered click + soft body
        this.noiseBurst(t, 0.05, 0.18, 2200);
        this.tone(180, t, 0.09, 'triangle', 0.18, 120);
        break;
      case 'capture':
        // heavier, two-layer hit
        this.noiseBurst(t, 0.08, 0.28, 1200);
        this.tone(120, t, 0.13, 'square', 0.22, 70);
        this.tone(240, t, 0.1, 'triangle', 0.14, 140);
        break;
      case 'castle':
        this.tone(320, t, 0.07, 'triangle', 0.18);
        this.tone(440, t + 0.07, 0.07, 'triangle', 0.18);
        break;
      case 'check':
        // alert chime — two rising tones
        this.tone(880, t, 0.16, 'sine', 0.22);
        this.tone(1175, t + 0.12, 0.22, 'sine', 0.2);
        break;
      case 'checkmate':
        // victory fanfare — ascending arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => this.tone(f, t + i * 0.12, 0.34, 'triangle', 0.22));
        this.tone(1568, t + 0.48, 0.5, 'sine', 0.18);
        break;
      case 'game-start':
        this.tone(523.25, t, 0.12, 'triangle', 0.16);
        this.tone(783.99, t + 0.1, 0.2, 'triangle', 0.16);
        break;
      case 'game-end':
        this.tone(659.25, t, 0.2, 'sine', 0.16);
        this.tone(523.25, t + 0.18, 0.4, 'sine', 0.16);
        break;
      case 'victory': {
        const vn = [523.25, 659.25, 783.99, 1046.5];
        vn.forEach((f, i) => this.tone(f, t + i * 0.12, 0.35, 'sine', 0.15));
        this.tone(1568, t + 0.48, 0.6, 'sine', 0.12);
        break;
      }
      case 'tick':
        this.tone(1200, t, 0.03, 'square', 0.06);
        break;
    }
  }
}

export const sound = new SoundEngine();
export type { SoundName };
