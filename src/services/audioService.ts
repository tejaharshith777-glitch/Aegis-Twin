/**
 * Aegis Sound Synthesis & Voice Audio Engine
 * Provides Web Audio API synthesized sound effects, speech synthesis, and audio visualization.
 */

class AudioService {
  private audioCtx: AudioContext | null = null;
  private sfxEnabled = true;
  private sfxVolume = 0.4;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private speechRate = 1.0;
  private speechPitch = 1.0;
  private selectedVoiceURI: string | null = null;
  private listeners: Set<() => void> = new Set();
  private wordCallback: ((word: string, charIndex: number) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedSfx = localStorage.getItem('aegis_sfx_enabled');
        if (savedSfx !== null) this.sfxEnabled = savedSfx === 'true';
        const savedRate = localStorage.getItem('aegis_speech_rate');
        if (savedRate) this.speechRate = parseFloat(savedRate) || 1.0;
        const savedVoice = localStorage.getItem('aegis_voice_uri');
        if (savedVoice) this.selectedVoiceURI = savedVoice;
      } catch {
        // Ignore local storage errors
      }
    }
  }

  private initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public getSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    try {
      localStorage.setItem('aegis_sfx_enabled', String(enabled));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getSpeechRate(): number {
    return this.speechRate;
  }

  public setSpeechRate(rate: number) {
    this.speechRate = Math.max(0.6, Math.min(2.0, rate));
    try {
      localStorage.setItem('aegis_speech_rate', String(this.speechRate));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getSelectedVoiceURI(): string | null {
    return this.selectedVoiceURI;
  }

  public setSelectedVoiceURI(uri: string | null) {
    this.selectedVoiceURI = uri;
    try {
      if (uri) localStorage.setItem('aegis_voice_uri', uri);
      else localStorage.removeItem('aegis_voice_uri');
    } catch {
      // ignore
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // ignore
      }
    });
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('en'));
  }

  // --- Web Audio SFX Generation ---

  public playClick() {
    if (!this.sfxEnabled) return;
    const ctx = this.initAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.035);

      gain.gain.setValueAtTime(this.sfxVolume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  public playSuccess() {
    if (!this.sfxEnabled) return;
    const ctx = this.initAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 chord arpeggio
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteTime = now + i * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0, noteTime);
        gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.2, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.35);
      });
    } catch {
      // Ignore
    }
  }

  public playAlert(defcon: 1 | 2 | 3 = 1) {
    if (!this.sfxEnabled) return;
    const ctx = this.initAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const repeats = defcon === 1 ? 3 : defcon === 2 ? 2 : 1;
      const baseFreq = defcon === 1 ? 880 : defcon === 2 ? 660 : 440;

      for (let i = 0; i < repeats; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const burstTime = now + i * 0.12;

        osc.type = defcon === 1 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(baseFreq, burstTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, burstTime + 0.08);

        gain.gain.setValueAtTime(this.sfxVolume * 0.35, burstTime);
        gain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(burstTime);
        osc.stop(burstTime + 0.1);
      }
    } catch {
      // Ignore
    }
  }

  public playScan() {
    if (!this.sfxEnabled) return;
    const ctx = this.initAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.18);

      gain.gain.setValueAtTime(this.sfxVolume * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Ignore
    }
  }

  public playMicChirp(opening = true) {
    if (!this.sfxEnabled) return;
    const ctx = this.initAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (opening) {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.07);
      } else {
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.07);
      }

      gain.gain.setValueAtTime(this.sfxVolume * 0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore
    }
  }

  // --- Voice Briefing Playback ---

  public isVoiceActive(): boolean {
    return this.isSpeaking;
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudioElement = null;
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.wordCallback = null;
    this.notify();
  }

  public async playVoiceBriefing(
    text: string,
    options?: {
      onWord?: (word: string, charIndex: number) => void;
      onEnd?: () => void;
      onError?: (err: Error) => void;
      murfBlob?: Blob | null;
    },
  ): Promise<void> {
    this.stopSpeaking();
    this.isSpeaking = true;
    this.wordCallback = options?.onWord || null;
    this.notify();

    // If Murf audio blob is provided, use HTML5 audio
    if (options?.murfBlob) {
      try {
        const audioUrl = URL.createObjectURL(options.murfBlob);
        const audio = new Audio(audioUrl);
        this.currentAudioElement = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.isSpeaking = false;
          this.currentAudioElement = null;
          this.notify();
          options?.onEnd?.();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          this.isSpeaking = false;
          this.currentAudioElement = null;
          this.notify();
          // Fallback to speech synthesis
          this.speakWithBrowser(text, options);
        };

        await audio.play();
        return;
      } catch {
        this.speakWithBrowser(text, options);
        return;
      }
    }

    this.speakWithBrowser(text, options);
  }

  private speakWithBrowser(
    text: string,
    options?: {
      onWord?: (word: string, charIndex: number) => void;
      onEnd?: () => void;
      onError?: (err: Error) => void;
    },
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeaking = false;
      this.notify();
      options?.onError?.(new Error('Browser speech synthesis is not supported'));
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      utterance.rate = this.speechRate;
      utterance.pitch = this.speechPitch;

      // Match preferred voice
      const voices = window.speechSynthesis.getVoices();
      if (this.selectedVoiceURI) {
        const match = voices.find((v) => v.voiceURI === this.selectedVoiceURI);
        if (match) utterance.voice = match;
      } else {
        // Preferred natural English voice
        const naturalVoice = voices.find((v) =>
          (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Arthur')))
        );
        if (naturalVoice) utterance.voice = naturalVoice;
      }

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex;
          const word = text.slice(charIndex, charIndex + (event.charLength || 10)).split(/\s/)[0];
          this.wordCallback?.(word, charIndex);
        }
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.notify();
        options?.onEnd?.();
      };

      utterance.onerror = (e) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.notify();
        if (e.error !== 'canceled') {
          options?.onError?.(new Error(`Speech synthesis error: ${e.error}`));
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      this.isSpeaking = false;
      this.notify();
      options?.onError?.(err instanceof Error ? err : new Error('Speech synthesis failed'));
    }
  }
}

export const audioService = new AudioService();
