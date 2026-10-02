import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlaybackAnalysis } from './playback-analysis.service';

describe('PlaybackAnalysis', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('does not reroute native audio if AudioContext cannot resume', async () => {
    const createSource = vi.fn();
    vi.stubGlobal('AudioContext', class {
      state = 'suspended';
      resume = () => Promise.reject(new Error('Not allowed'));
      close = () => Promise.resolve();
      createMediaElementSource = createSource;
    });
    TestBed.configureTestingModule({ providers: [PlaybackAnalysis] });
    const analysis = TestBed.inject(PlaybackAnalysis);
    analysis.attach(document.createElement('audio'));
    analysis.prepare();
    await Promise.resolve();
    await Promise.resolve();
    expect(createSource).not.toHaveBeenCalled();
    expect(analysis.sample()).toEqual({ bass: 0, mid: 0, treble: 0 });
  });

  it('reuses the source for an audio element and releases the graph on navigation', async () => {
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const analyser = { connect: vi.fn(), disconnect: vi.fn(), fftSize: 0, smoothingTimeConstant: 0 };
    const createSource = vi.fn(() => source);
    const close = vi.fn(() => Promise.resolve());
    const destination = {};
    vi.stubGlobal('AudioContext', class {
      state = 'running';
      destination = destination;
      resume = () => Promise.resolve();
      close = close;
      createMediaElementSource = createSource;
      createAnalyser = () => analyser;
    });
    TestBed.configureTestingModule({ providers: [PlaybackAnalysis] });
    const analysis = TestBed.inject(PlaybackAnalysis);
    const audio = document.createElement('audio');
    analysis.prepare();
    await Promise.resolve();
    analysis.attach(audio);
    analysis.attach(undefined);
    analysis.attach(audio);
    expect(createSource).toHaveBeenCalledExactlyOnceWith(audio);
    expect(source.connect).toHaveBeenLastCalledWith(analyser);
    expect(analyser.connect).toHaveBeenCalledExactlyOnceWith(destination);
    TestBed.resetTestingModule();
    expect(source.disconnect).toHaveBeenCalled();
    expect(analyser.disconnect).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
  it('separates bass, mids and treble by frequency and clears them when playback stops', async () => {
    let frequency = 100;
    const analyser = {
      connect: vi.fn(), disconnect: vi.fn(), fftSize: 1024, smoothingTimeConstant: 0,
      getByteFrequencyData: (samples: Uint8Array) => {
        samples.fill(0);
        samples[Math.round(frequency / (48000 / analyser.fftSize))] = 255;
      },
    };
    vi.stubGlobal('AudioContext', class {
      state = 'running';
      sampleRate = 48000;
      destination = {};
      resume = () => Promise.resolve();
      close = () => Promise.resolve();
      createAnalyser = () => analyser;
      createMediaElementSource = () => ({ connect: vi.fn(), disconnect: vi.fn() });
    });
    TestBed.configureTestingModule({ providers: [PlaybackAnalysis] });
    const analysis = TestBed.inject(PlaybackAnalysis);
    const audio = document.createElement('audio');
    const paused = vi.spyOn(audio, 'paused', 'get').mockReturnValue(false);
    analysis.prepare();
    await Promise.resolve();
    analysis.attach(audio);
    for (const [hz, band] of [[100, 'bass'], [1000, 'mid'], [6000, 'treble']] as const) {
      frequency = hz;
      const spectrum = analysis.sample();
      expect(spectrum[band]).toBeGreaterThan(0);
      for (const other of ['bass', 'mid', 'treble'] as const) {
        if (other !== band) expect(spectrum[other]).toBe(0);
      }
    }
    paused.mockReturnValue(true);
    expect(analysis.sample()).toEqual({ bass: 0, mid: 0, treble: 0 });
  });
});
