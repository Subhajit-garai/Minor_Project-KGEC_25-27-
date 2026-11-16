// Web Audio API synthesizer for sci-fi cybernetic packet telemetry sounds
class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled = false;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggle(enabled?: boolean) {
    this.enabled = enabled !== undefined ? enabled : !this.enabled;
    if (this.enabled) {
      this.initCtx();
    }
    return this.enabled;
  }

  playPacketTick(status: string) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freqMap: Record<string, number> = {
        internet: 330,
        captured: 440,
        processing: 554.37,
        processed: 659.25,
        decisioning: 880,
        accepted: 1108.73,
        rejected: 220,
        error: 180,
      };

      const freq = freqMap[status] || 440;
      osc.type = status === "rejected" || status === "error" ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

export const soundEffects = new SoundEffects();
