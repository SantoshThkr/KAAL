export class AmbientAudio {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array | null = null;

  async toggle(enabled: boolean) {
    if (!this.context) {
      this.context = new AudioContext();
      this.oscillator = this.context.createOscillator();
      this.gain = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.data = new Uint8Array(this.analyser.frequencyBinCount);
      this.oscillator.type = "sine";
      this.oscillator.frequency.value = 196;
      this.gain.gain.value = 0.012;
      this.oscillator.connect(this.gain).connect(this.analyser).connect(this.context.destination);
      this.oscillator.start();
    }
    if (enabled) await this.context.resume();
    else await this.context.suspend();
  }

  energy() {
    if (!this.analyser || !this.data) return 0;
    this.analyser.getByteFrequencyData(this.data);
    let total = 0;
    for (let index = 0; index < this.data.length; index += 1) total += this.data[index];
    return total / (this.data.length * 255);
  }
}
