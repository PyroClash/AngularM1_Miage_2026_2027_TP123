import { HttpEventType, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Track } from '../../shared/models/track.model';
import { authInterceptor } from '../../shared/interceptors/auth.interceptor';
import { AuthService } from '../../shared/services/auth.service';
import { PlaybackAnalysis } from '../../shared/services/playback-analysis.service';
import { GuitarStageComponent } from '../guitar-stage/guitar-stage';
import { TracksPageComponent } from './tracks-page';

@Component({ selector: 'app-guitar-stage', template: '' })
class GuitarStageStub {}

const track: Track = {
  id: 'a', title: 'Blues', originalName: 'blues.mp3', mimeType: 'audio/mpeg',
  size: 1024, createdAt: '2026-10-01T12:00:00Z',
};

describe('TracksPageComponent deletion and upload', () => {
  let http: HttpTestingController;

  afterEach(() => {
    try {
      http?.verify();
    } finally {
      TestBed.resetTestingModule();
      vi.restoreAllMocks();
    }
  });

  async function setup() {
    const snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [TracksPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: signal('test-token') } },
      ],
    }).overrideComponent(TracksPageComponent, {
      remove: { imports: [GuitarStageComponent], providers: [PlaybackAnalysis] },
      add: {
        imports: [GuitarStageStub],
        providers: [
          { provide: PlaybackAnalysis, useValue: { prepare: vi.fn(), attach: vi.fn() } },
          { provide: MatSnackBar, useValue: snackBar },
        ],
      },
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TracksPageComponent);
    http.expectOne('/api/tracks?page=1&limit=5').flush({
      items: [track], page: 1, limit: 5, total: 1, pages: 1,
    });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, component: fixture.componentInstance, element, snackBar };
  }

  it('sends DELETE after confirmation and reloads the list after 204', async () => {
    const { fixture, component, element, snackBar } = await setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    element.querySelector<HTMLButtonElement>('.delete-button')!.click();
    fixture.detectChanges();

    const request = http.expectOne('/api/tracks/a');
    expect(confirm).toHaveBeenCalledOnce();
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(element.querySelector<HTMLButtonElement>('.delete-button')!.disabled).toBe(true);
    component.deleteTrack(track);
    http.expectNone(other => other.method === 'DELETE');

    request.flush(null, { status: 204, statusText: 'No Content' });
    const reload = http.expectOne('/api/tracks?page=1&limit=5');
    expect(reload.request.method).toBe('GET');
    reload.flush({ items: [], page: 1, limit: 5, total: 0, pages: 1 });
    fixture.detectChanges();

    expect(component.deletingId()).toBeNull();
    expect(component.total()).toBe(0);
    expect(element.querySelectorAll('.track-card')).toHaveLength(0);
    expect(snackBar.open).toHaveBeenCalledWith('« Blues » a été supprimé.', 'Fermer', { duration: 5000 });
  });

  it('displays upload progress and restores the controls after an HTTP error', async () => {
    const { fixture, component, element } = await setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const file = new File(['audio fixture'], 'blues.mp3', { type: 'audio/mpeg' });
    component.file = file;
    component.title.setValue('Blues');
    component.upload();
    fixture.detectChanges();

    const request = http.expectOne({ method: 'POST', url: '/api/tracks' });
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(request.request.body).toBeInstanceOf(FormData);
    expect(request.request.body.get('audio')).toBe(file);
    expect(request.request.body.get('title')).toBe('Blues');
    expect(request.request.reportProgress).toBe(true);
    expect(element.querySelector<HTMLInputElement>('#track-title')!.disabled).toBe(true);
    expect(element.querySelector<HTMLInputElement>('#track-file')!.disabled).toBe(true);
    expect(element.querySelector<HTMLButtonElement>('.import-button')!.disabled).toBe(true);
    component.upload();
    http.expectNone(other => other.method === 'POST');

    request.event({ type: HttpEventType.UploadProgress, loaded: 25, total: 100 });
    fixture.detectChanges();
    expect(component.uploadProgress()).toBe(25);
    expect(element.querySelector('.upload-progress')?.textContent).toContain('Envoi : 25 %');

    request.flush({ message: 'Envoi refusé' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(element.querySelector('.upload-panel [role="alert"]')?.textContent).toContain('Envoi refusé');
    expect(component.uploading()).toBe(false);
    expect(component.uploadProgress()).toBeNull();
    expect(component.file).toBe(file);
    expect(element.querySelector<HTMLInputElement>('#track-title')!.disabled).toBe(false);
    expect(element.querySelector<HTMLInputElement>('#track-file')!.disabled).toBe(false);
    expect(element.querySelector<HTMLButtonElement>('.import-button')!.disabled).toBe(false);
    http.expectNone(other => other.method === 'GET');
  });
});
