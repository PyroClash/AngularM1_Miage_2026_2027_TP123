import { DestroyRef, Injectable, inject } from '@angular/core';
import type { AudioSpectrum } from '../models/audio-spectrum';

/** A single audio graph per library view; the original player owns playback. */
@Injectable()
export class PlaybackAnalysis {
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: MediaElementAudioSourceNode;
  private element?: HTMLAudioElement;
  private readonly sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private readonly samples = new Uint8Array(512);
  private readonly spectrum: AudioSpectrum = { bass: 0, mid: 0, treble: 0 };
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.source?.disconnect();
      this.analyser?.disconnect();
      void this.context?.close().catch(() => undefined);
    });
  }

  /** Called directly from the play button, while a user gesture is available. */
  prepare(): void {
    if (this.destroyed) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume().then(() => this.connect()).catch(() => undefined);
    } catch {
      // Web Audio is an enhancement: leave native audio playback untouched.
    }
  }

  attach(element?: HTMLAudioElement): void {
    if (this.element === element) return;
    this.source?.disconnect();
    this.source = undefined;
    this.element = element;
    this.connect();
  }

  sample(): AudioSpectrum {
    if (!this.analyser || !this.element || this.element.paused || this.context?.state !== 'running') {
      this.spectrum.bass = this.spectrum.mid = this.spectrum.treble = 0;
      return this.spectrum;
    }
    this.analyser.getByteFrequencyData(this.samples);
    const binHz = this.context.sampleRate / this.analyser.fftSize;
    this.spectrum.bass = this.band(40, 250, binHz);
    this.spectrum.mid = this.band(250, 2400, binHz);
    this.spectrum.treble = this.band(2400, 12000, binHz);
    return this.spectrum;
  }

  private band(low: number, high: number, binHz: number): number {
    const start = Math.max(1, Math.ceil(low / binHz));
    const end = Math.min(this.samples.length, Math.ceil(high / binHz));
    let sum = 0;
    for (let i = start; i < end; i++) sum += this.samples[i] ** 2;
    return end > start ? Math.sqrt(sum / (end - start)) / 255 : 0;
  }

  private connect(): void {
    if (this.destroyed || !this.element || this.source || this.context?.state !== 'running') return;
    try {
      if (!this.analyser) {
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyser.smoothingTimeConstant = .55;
        this.analyser.connect(this.context.destination);
      }
      this.source = this.sources.get(this.element) ?? this.context.createMediaElementSource(this.element);
      this.sources.set(this.element, this.source);
      this.source.connect(this.analyser);
    } catch {
      // If routing fails after a source was created, keep an audible direct path.
      this.source?.disconnect();
      this.source?.connect(this.context.destination);
    }
  }
}
