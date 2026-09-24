import { DatePipe, NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const AUDIO_TYPES = new Set([
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
]);

function frenchPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.nextPageLabel = 'Page suivante';
  intl.previousPageLabel = 'Page précédente';
  intl.getRangeLabel = (page, pageSize, length) => {
    if (length === 0) return '0 sur 0';
    const start = page * pageSize + 1;
    const end = Math.min(start + pageSize - 1, length);
    return `${start}–${end} sur ${length}`;
  };
  return intl;
}

@Component({
  imports: [DatePipe, NgOptimizedImage, ReactiveFormsModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: frenchPaginatorIntl }],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent {
  private readonly service = inject(TrackService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly audioInput = viewChild<ElementRef<HTMLInputElement>>('audioInput');
  private readonly player = viewChild<ElementRef<HTMLAudioElement>>('player');
  private listRequest = 0;
  private audioRequest = 0;

  readonly tracks = signal<Track[]>([]);
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly uploading = signal(false);
  readonly uploadError = signal('');
  readonly uploadSuccess = signal('');
  readonly audioLoading = signal(false);
  readonly audioError = signal('');
  readonly playingTrack = signal<Track | null>(null);
  readonly audioUrl = signal('');
  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly volume = signal(0.8);
  readonly title = new FormControl('', { nonNullable: true });
  file?: File;

  constructor() {
    this.load();
    this.destroyRef.onDestroy(() => {
      const url = this.audioUrl();
      if (url) URL.revokeObjectURL(url);
    });
  }

  choose(event: Event): void {
    this.file = (event.target as HTMLInputElement).files?.[0];
    this.uploadError.set(this.validateFile(this.file));
    this.uploadSuccess.set('');
  }

  private validateFile(file?: File): string {
    if (!file) return 'Choisissez un fichier audio.';
    if (!AUDIO_TYPES.has(file.type)) return 'Format non accepté. Choisissez un fichier MP3, WAV, OGG ou M4A.';
    if (file.size > MAX_FILE_SIZE) return 'Le fichier dépasse la limite de 25 Mo.';
    return '';
  }

  private message(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const serverMessage = error.error?.message;
      if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
    }
    return fallback;
  }

  load(): void {
    const request = ++this.listRequest;
    this.loading.set(true);
    this.loadError.set('');
    this.service.list(this.page(), 5).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (request !== this.listRequest) return;
        this.tracks.set(response.items);
        this.page.set(response.page);
        this.pages.set(response.pages);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: (error) => {
        if (request !== this.listRequest) return;
        console.error('[TracksPage] Chargement impossible', error);
        this.loadError.set(this.message(error, 'Impossible de charger les pistes. Réessayez.'));
        this.loading.set(false);
      },
    });
  }

  go(page: number): void {
    if (this.loading() || page < 1 || page > this.pages() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  upload(): void {
    if (this.uploading()) return;
    const validationError = this.validateFile(this.file);
    this.uploadError.set(validationError);
    this.uploadSuccess.set('');
    if (validationError || !this.file) return;

    this.uploading.set(true);
    this.service.upload(this.file, this.title.value.trim() || this.file.name)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (track) => {
          this.uploading.set(false);
          this.uploadSuccess.set(`« ${track.title} » a été ajouté.`);
          this.title.setValue('');
          this.file = undefined;
          const input = this.audioInput()?.nativeElement;
          if (input) input.value = '';
          this.page.set(1);
          this.load();
        },
        error: (error) => {
          console.error('[TracksPage] Envoi impossible', error);
          this.uploadError.set(this.message(error, 'Impossible d’envoyer le fichier. Réessayez.'));
          this.uploading.set(false);
        },
      });
  }

  play(track: Track): void {
    if (this.playingTrack()?.id === track.id && this.audioUrl()) {
      this.togglePlayback();
      return;
    }
    const request = ++this.audioRequest;
    this.audioLoading.set(true);
    this.audioError.set('');
    this.service.audio(track.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        if (request !== this.audioRequest) return;
        const previousUrl = this.audioUrl();
        this.isPlaying.set(false);
        this.currentTime.set(0);
        this.duration.set(0);
        this.audioUrl.set(URL.createObjectURL(blob));
        this.playingTrack.set(track);
        this.audioLoading.set(false);
        if (previousUrl) URL.revokeObjectURL(previousUrl);
      },
      error: (error) => {
        if (request !== this.audioRequest) return;
        console.error('[TracksPage] Lecture impossible', error);
        this.audioError.set(this.message(error, 'Impossible de charger ce morceau. Réessayez.'));
        this.audioLoading.set(false);
      },
    });
  }

  togglePlayback(): void {
    const audio = this.player()?.nativeElement;
    if (!audio || !this.audioUrl()) return;
    if (audio.paused) {
      this.audioError.set('');
      void audio.play().catch(() => this.audioError.set('Lecture impossible. Réessayez avec le bouton de lecture.'));
    } else {
      audio.pause();
    }
  }

  seek(event: Event): void {
    const audio = this.player()?.nativeElement;
    if (audio && this.duration() > 0) {
      audio.currentTime = Number((event.target as HTMLInputElement).value);
      this.currentTime.set(audio.currentTime);
    }
  }

  setVolume(event: Event): void {
    this.volume.set(Number((event.target as HTMLInputElement).value));
  }

  syncTime(audio: HTMLAudioElement): void {
    this.currentTime.set(audio.currentTime);
    this.duration.set(Number.isFinite(audio.duration) ? audio.duration : 0);
  }

  formatTime(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  }

  formatType(track: Track): string {
    return track.originalName.split('.').pop()?.toUpperCase() || track.mimeType;
  }

  formatSize(bytes: number): string {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
      : `${Math.round(bytes / 1024)} Ko`;
  }
}
