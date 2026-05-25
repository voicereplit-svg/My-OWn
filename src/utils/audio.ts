class AudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private activeOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private currentChordIndex: number = 0;
  private ambientTimer: any = null;
  private melodyTimer: any = null;

  // Soothing chord progressions in C major and A natural minor
  private chords = [
    // Chord 1: C Maj 9 (C3, G3, B3, D4, E4)
    [130.81, 196.00, 246.94, 293.66, 329.63],
    // Chord 2: A min 9 (A2, E3, G3, B3, C4, E4)
    [110.00, 164.81, 196.00, 246.94, 261.63, 329.63],
    // Chord 3: F Maj 9 (F2, C3, A3, C4, E4)
    [87.31, 130.81, 220.00, 261.63, 329.63],
    // Chord 4: G Dom 11/13 susp (G2, D3, F3, A3, C4, E4)
    [98.00, 146.83, 174.61, 220.00, 261.63, 329.63]
  ];

  constructor() {
    // Check if user previously muted
    try {
      const stored = localStorage.getItem("mcqs_audio_muted");
      if (stored !== null) {
        this.muted = stored === "true";
      }
    } catch (e) {
      console.warn("Could not read local storage for audio preferences", e);
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch((err) => console.log("Audio resumption failed:", err));
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem("mcqs_audio_muted", String(muted));
    } catch (e) {
      console.warn("Could not write audio preference to local storage", e);
    }

    if (muted) {
      this.stopAmbient();
    } else {
      this.startAmbient();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Play a dynamic, soft button click voice with an organic poppy tactile feel
   */
  public playButtonClick() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Part 1: High frequency click tap (very short, crisp)
      const oscTick = this.ctx.createOscillator();
      const gainTick = this.ctx.createGain();
      oscTick.type = "sine";
      oscTick.frequency.setValueAtTime(1400, now);
      oscTick.frequency.exponentialRampToValueAtTime(700, now + 0.012);
      gainTick.gain.setValueAtTime(0.008, now); // Low voice
      gainTick.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

      // Part 2: Soft woodblock/bubble pop (warm body)
      const oscPop = this.ctx.createOscillator();
      const gainPop = this.ctx.createGain();
      oscPop.type = "triangle";
      oscPop.frequency.setValueAtTime(260, now);
      oscPop.frequency.exponentialRampToValueAtTime(130, now + 0.06);
      gainPop.gain.setValueAtTime(0.015, now); // Low voice
      gainPop.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      oscTick.connect(gainTick);
      gainTick.connect(this.ctx.destination);

      oscPop.connect(gainPop);
      gainPop.connect(this.ctx.destination);

      oscTick.start(now);
      oscTick.stop(now + 0.015);

      oscPop.start(now);
      oscPop.stop(now + 0.08);
    } catch (e) {
      console.error("Button click audio play failed", e);
    }
  }

  /**
   * Helper to fade in a chord progression smoothly
   */
  private playAmbientChord(freqs: number[]) {
    if (!this.ctx || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const oldOscs = this.activeOscillators;
      this.activeOscillators = [];

      // Transition fade-out of previous oscillators
      oldOscs.forEach(({ osc, gain }) => {
        try {
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
          osc.stop(now + 2.6);
        } catch (e) {}
      });

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(320, now); // High cuts for maximum warmth

      // Create new oscillator nodes for the next chord, ramping up volume gently
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        
        // Gentle chorusing detune drift
        osc.detune.setValueAtTime((idx - (freqs.length / 2)) * 5, now);

        noteGain.gain.setValueAtTime(0, now);
        // Absolute soft volume as requested by user ("low voice not high voice")
        noteGain.gain.linearRampToValueAtTime(0.003, now + 2.5); 

        osc.connect(noteGain);
        noteGain.connect(filter);
        this.activeOscillators.push({ osc, gain: noteGain });

        try {
          osc.start(now);
        } catch (e) {}
      });

      filter.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Error playing ambient chord", e);
    }
  }

  /**
   * Random beautiful melody sparkle over the active chord
   */
  private triggerMelodySparkle() {
    if (!this.ctx || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const currentChord = this.chords[this.currentChordIndex];
      const baseNote = currentChord[Math.floor(Math.random() * currentChord.length)];
      
      // Sparkle chime 2 octaves up
      const freq = baseNote * 4; 
      if (freq > 1800) return; // Keep it smooth and velvet, not high and piercing

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now);
      // Soft chime strike with exponential release
      gain.gain.linearRampToValueAtTime(0.002, now + 0.15); // Extra soft ("low voice")
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

      // Simple sweet feedback slapback echo
      const delay = this.ctx.createDelay();
      delay.delayTime.setValueAtTime(0.3, now);
      const delayGain = this.ctx.createGain();
      delayGain.gain.setValueAtTime(0.2, now);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      gain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 3.2);
    } catch (e) {
      console.warn("Melody sparkle trigger failed", e);
    }
  }

  /**
   * Starts background music loops.
   * Plays beautiful gentle chords changing every 8 seconds,
   * coupled with sporadic soft high chimes.
   */
  public startAmbient() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;
    if (this.ambientTimer) return; // Already playing background music

    try {
      this.currentChordIndex = 0;
      this.playAmbientChord(this.chords[this.currentChordIndex]);

      // Cycle chords every 8 seconds
      this.ambientTimer = setInterval(() => {
        this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
        this.playAmbientChord(this.chords[this.currentChordIndex]);
      }, 8000);

      // Trigger melody chimes every 3.5 seconds
      this.melodyTimer = setInterval(() => {
        this.triggerMelodySparkle();
      }, 3500);

    } catch (e) {
      console.warn("Ambient background music startup failed", e);
    }
  }

  /**
   * Stops background music loops
   */
  public stopAmbient() {
    if (this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.melodyTimer) {
      clearInterval(this.melodyTimer);
      this.melodyTimer = null;
    }

    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      this.activeOscillators.forEach(({ osc, gain }) => {
        try {
          // Swift release fadeout
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
          osc.stop(now + 1.4);
        } catch (e) {}
      });
      this.activeOscillators = [];
    } catch (e) {
      console.warn("Ambient background music teardown failed", e);
    }
  }

  public playClick() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = "sine";
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);

      // Low voice volume
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      console.error("Audio click play failed", e);
    }
  }

  public playCorrect() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      this.playTone(523.25, 0.12, 0.02, "sine"); // C5 (quiet, gentle)
      setTimeout(() => {
        if (this.muted) return;
        this.playTone(659.25, 0.15, 0.02, "sine"); // E5 (quiet, gentle)
      }, 70);
      setTimeout(() => {
        if (this.muted) return;
        this.playTone(783.99, 0.22, 0.02, "sine"); // G5 (quiet, gentle)
      }, 140);
    } catch (e) {
      console.error("Audio Correct play failed", e);
    }
  }

  public playIncorrect() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = "triangle";
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.22);

      // Soft non-startling buzzer
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.error("Audio Incorrect play failed", e);
    }
  }

  public playAlert() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const playBeep = (delay: number) => {
        setTimeout(() => {
          if (this.muted) return;
          this.playTone(820, 0.15, 0.015, "sawtooth");
        }, delay);
      };

      playBeep(0);
      playBeep(120);
    } catch (e) {
      console.error("Audio Alert play failed", e);
    }
  }

  public playVictory() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          if (this.muted) return;
          this.playTone(freq, 0.25, 0.01, "sine"); // Extra quiet, beautiful victory cascade
        }, idx * 80);
      });
    } catch (e) {
      console.error("Audio Victory play failed", e);
    }
  }

  private playTone(freq: number, duration: number, volume: number = 0.02, type: OscillatorType = "sine") {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = type;
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }
}

export const audio = new AudioEngine();
