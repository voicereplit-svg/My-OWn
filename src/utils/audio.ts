class AudioEngine {
  private muted: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem("mcqs_audio_muted");
      if (stored !== null) {
        this.muted = stored === "true";
      }
    } catch (e) {
      console.warn("Could not read local storage for audio preferences", e);
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem("mcqs_audio_muted", String(muted));
    } catch (e) {
      console.warn("Could not write audio preference to local storage", e);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playButtonClick() {
    // Completely silent to strictly respect "remove all sounds"
  }

  public startAmbient() {
    // Completely silent to strictly respect "remove all sounds"
  }

  public stopAmbient() {
    // Completely silent to strictly respect "remove all sounds"
  }

  public playClick() {
    // Completely silent to strictly respect "remove all sounds"
  }

  public playCorrect() {
    // Completely silent to strictly respect "remove all sounds"
  }

  public playIncorrect() {
    // Completely silent to strictly respect "remove all sounds"
  }

  public playAlert() {
    // Completely silent to strictly respect "remove all sounds"
  }

  public playVictory() {
    // Completely silent to strictly respect "remove all sounds"
  }
}

export const audio = new AudioEngine();
