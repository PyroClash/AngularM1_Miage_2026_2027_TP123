import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Page } from '../models/page.model';
import type { Track } from '../models/track.model';
import { TrackService } from './track.service';

describe('TrackService HTTP contract', () => {
  let http: HttpTestingController;
  let service: TrackService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(TrackService);
  });

  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  it('sends page and limit with GET and returns the simulated page', () => {
    const received = vi.fn();
    const response: Page<Track> = { items: [], page: 2, limit: 3, total: 0, pages: 1 };
    service.list(2, 3).subscribe(received);

    const request = http.expectOne('/api/tracks?page=2&limit=3');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('3');
    request.flush(response);
    expect(received).toHaveBeenCalledExactlyOnceWith(response);
  });
});
