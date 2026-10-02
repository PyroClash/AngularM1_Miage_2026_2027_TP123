/** Normalized audio bands, reused by the analyser without frame allocations. */
export interface AudioSpectrum {
  bass: number;
  mid: number;
  treble: number;
}
