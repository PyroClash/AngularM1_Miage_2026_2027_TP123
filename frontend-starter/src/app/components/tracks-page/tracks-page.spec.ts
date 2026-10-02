import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatPaginator } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Page } from '../../shared/models/page.model';
import type { Track } from '../../shared/models/track.model';
import { PlaybackAnalysis } from '../../shared/services/playback-analysis.service';
import { TrackService } from '../../shared/services/track.service';
import { GuitarStageComponent } from '../guitar-stage/guitar-stage';
import { TracksPageComponent } from './tracks-page';

@Component({ selector: 'app-guitar-stage', template: '' })
class GuitarStageStub {}

const trackA: Track = {
  id: 'a', title: 'Blues A', originalName: 'blues-a.mp3', mimeType: 'audio/mpeg',
  size: 1024, createdAt: '2026-10-01T12:00:00Z',
};
const trackB: Track = { ...trackA, id: 'b', title: 'Blues B', originalName: 'blues-b.mp3' };
const trackC: Track = { ...trackA, id: 'c', title: 'Blues C', originalName: 'blues-c.mp3' };

describe('TracksPageComponent playback and pagination', () => {
  const createUrl = vi.fn<(blob: Blob) => string>();
  const revokeUrl = vi.fn<(url: string) => void>();

  beforeEach(() => {
    createUrl.mockReset().mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second');
    revokeUrl.mockReset();
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = createUrl;
      static override revokeObjectURL = revokeUrl;
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function setup() {
    const listResponses: Subject<Page<Track>>[] = [];
    const audioResponses = new Map<string, Subject<Blob>>();
    const service = {
      list: vi.fn(() => {
        const response = new Subject<Page<Track>>();
        listResponses.push(response);
        return response;
      }),
      audio: vi.fn((id: string) => {
        const response = new Subject<Blob>();
        audioResponses.set(id, response);
        return response;
      }),
    };
    await TestBed.configureTestingModule({
      imports: [TracksPageComponent],
      providers: [{ provide: TrackService, useValue: service }],
    }).overrideComponent(TracksPageComponent, {
      remove: { imports: [GuitarStageComponent], providers: [PlaybackAnalysis] },
      add: {
        imports: [GuitarStageStub],
        providers: [{ provide: PlaybackAnalysis, useValue: { prepare: vi.fn(), attach: vi.fn() } }],
      },
    }).compileComponents();
    const fixture = TestBed.createComponent(TracksPageComponent);
    listResponses[0].next({ items: [trackA, trackB], page: 1, limit: 5, total: 7, pages: 2 });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, component: fixture.componentInstance, element, service, listResponses, audioResponses };
  }

  it('ignores stale audio responses and releases the replaced and final object URLs', async () => {
    const { component, fixture, audioResponses } = await setup();
    component.play(trackA);
    component.play(trackB);
    const currentBlob = new Blob(['current'], { type: 'audio/mpeg' });
    audioResponses.get(trackB.id)!.next(currentBlob);
    audioResponses.get(trackA.id)!.next(new Blob(['stale']));

    expect(component.playingTrack()).toEqual(trackB);
    expect(createUrl).toHaveBeenCalledExactlyOnceWith(currentBlob);
    expect(revokeUrl).not.toHaveBeenCalled();

    component.play(trackC);
    audioResponses.get(trackC.id)!.next(new Blob(['replacement']));
    expect(component.audioUrl()).toBe('blob:second');
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:first');
    fixture.destroy();
    expect(revokeUrl.mock.calls).toEqual([['blob:first'], ['blob:second']]);
  });

  it('keeps pause available while another track loads and ignores that cancelled selection', async () => {
    const { component, fixture, element, audioResponses } = await setup();
    component.play(trackA);
    audioResponses.get(trackA.id)!.next(new Blob(['a']));
    fixture.detectChanges();
    const audio = element.querySelector('audio')!;
    vi.spyOn(audio, 'paused', 'get').mockReturnValue(false);
    audio.dispatchEvent(new Event('play'));
    component.play(trackB);
    fixture.detectChanges();
    const master = element.querySelector<HTMLButtonElement>('.master-play')!;

    expect(master.disabled).toBe(false);
    master.click();
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(component.pendingTrack()).toBeNull();
    expect(component.audioLoading()).toBe(false);
    audioResponses.get(trackB.id)!.next(new Blob(['cancelled']));
    expect(component.playingTrack()).toEqual(trackA);
    expect(component.audioUrl()).toBe('blob:first');
    expect(createUrl).toHaveBeenCalledOnce();
  });

  it('shows a recoverable autoplay refusal and does not retry on every canplay event', async () => {
    const { component, fixture, element, audioResponses } = await setup();
    component.play(trackA);
    audioResponses.get(trackA.id)!.next(new Blob(['a']));
    fixture.detectChanges();
    const audio = element.querySelector('audio')!;
    const play = vi.mocked(audio.play).mockRejectedValueOnce(new Error('NotAllowedError'));

    audio.dispatchEvent(new Event('canplay'));
    await Promise.resolve();
    audio.dispatchEvent(new Event('canplay'));
    fixture.detectChanges();
    expect(play).toHaveBeenCalledOnce();
    expect(component.isPlaying()).toBe(false);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Cliquez sur Lecture');

    element.querySelector<HTMLButtonElement>('.master-play')!.click();
    await Promise.resolve();
    expect(play).toHaveBeenCalledTimes(2);
    expect(component.audioError()).toBe('');
  });

  it('keeps the displayed page and cards consistent when a page request fails', async () => {
    const { component, fixture, element, service, listResponses } = await setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    element.querySelector<HTMLButtonElement>('[aria-label="Page suivante"]')!.click();
    expect(service.list).toHaveBeenLastCalledWith(2, 5);
    expect(component.page()).toBe(1);
    listResponses[1].error(new HttpErrorResponse({ status: 503 }));
    fixture.detectChanges();

    expect(component.page()).toBe(1);
    const paginator = fixture.debugElement.query(By.directive(MatPaginator)).componentInstance as MatPaginator;
    expect(paginator.pageIndex).toBe(0);
    expect(component.tracks()).toEqual([trackA, trackB]);
    expect(element.querySelector('.track-number')?.textContent?.trim()).toBe('01');
    expect(component.loading()).toBe(false);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Impossible de charger');
    element.querySelector<HTMLButtonElement>('[aria-label="Page suivante"]')!.click();
    expect(service.list).toHaveBeenCalledTimes(3);
    expect(service.list).toHaveBeenLastCalledWith(2, 5);
  });
});
