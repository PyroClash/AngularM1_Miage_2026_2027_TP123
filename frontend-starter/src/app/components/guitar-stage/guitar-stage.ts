import { NgOptimizedImage } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { PlaybackAnalysis } from '../../shared/services/playback-analysis.service';
import type { GuitarScene } from './guitar-scene';

@Component({
  selector: 'app-guitar-stage',
  imports: [NgOptimizedImage],
  templateUrl: './guitar-stage.html',
  styleUrl: './guitar-stage.css',
})
export class GuitarStageComponent {
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly analysis = inject(PlaybackAnalysis);
  private readonly destroyRef = inject(DestroyRef);
  private scene?: GuitarScene;
  private generation = 0;
  readonly ready = signal(false);

  constructor() {
    afterNextRender(() => {
      void this.start(++this.generation);
      this.destroyRef.onDestroy(() => {
        ++this.generation;
        this.scene?.dispose();
      });
    });
  }

  private async start(generation: number): Promise<void> {
    try {
      const { GuitarScene } = await import('./guitar-scene');
      if (generation !== this.generation) return;
      const scene = new GuitarScene(this.host().nativeElement, () => this.analysis.sample(), () => this.ready.set(false));
      this.scene = scene;
      const loaded = await scene.load();
      if (!loaded || generation !== this.generation) return;
      this.ready.set(true);
    } catch {
      if (generation === this.generation) {
        this.scene?.dispose();
        this.scene = undefined;
        this.ready.set(false);
      }
    }
  }
}
