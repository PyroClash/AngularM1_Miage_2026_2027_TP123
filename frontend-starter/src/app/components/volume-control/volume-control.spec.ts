import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VolumeControlComponent } from './volume-control';

describe('VolumeControlComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  async function setup() {
    await TestBed.configureTestingModule({ imports: [VolumeControlComponent] }).compileComponents();
    const fixture = TestBed.createComponent(VolumeControlComponent);
    fixture.detectChanges();
    const control = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    control.setPointerCapture = vi.fn();
    control.hasPointerCapture = vi.fn(() => true);
    control.releasePointerCapture = vi.fn();
    const emitted = vi.fn((value: number) => {
      fixture.componentRef.setInput('value', value);
      fixture.detectChanges();
    });
    fixture.componentInstance.valueChange.subscribe(emitted);
    const pointer = (x: number, y: number) => ({
      button: 0, pointerId: 1, clientX: x, clientY: y, currentTarget: control, preventDefault: vi.fn(),
    }) as unknown as PointerEvent;
    return { fixture, component: fixture.componentInstance, control, emitted, pointer };
  }

  it('changes only on dragging, uses the dominant axis and clamps the volume', async () => {
    const { component, emitted, pointer, control } = await setup();
    component.startDrag(pointer(100, 100));
    component.endDrag(pointer(100, 100));
    expect(emitted).not.toHaveBeenCalled();
    expect(control).toBe(document.activeElement);

    component.startDrag(pointer(100, 100));
    component.moveDrag(pointer(114, 90));
    expect(emitted).toHaveBeenLastCalledWith(0.9);
    component.moveDrag(pointer(300, 90));
    expect(emitted).toHaveBeenLastCalledWith(1);
    component.endDrag(pointer(300, 90));
    component.startDrag(pointer(100, 100));
    component.moveDrag(pointer(110, 400));
    expect(emitted).toHaveBeenLastCalledWith(0);
    component.endDrag(pointer(110, 400));
    expect(component.dragging()).toBe(false);
    expect(control.releasePointerCapture).toHaveBeenCalledTimes(3);
  });

  it('accepts native range changes and restores the previous volume after muting', async () => {
    const { component, control, fixture, emitted } = await setup();
    control.value = '0.37';
    control.dispatchEvent(new Event('input', { bubbles: true }));
    expect(emitted).toHaveBeenLastCalledWith(0.37);
    expect(control.getAttribute('aria-valuetext')).toBe('37 %');
    const mute = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    mute.click();
    expect(component.level()).toBe(0);
    expect(mute.getAttribute('aria-label')).toBe('Rétablir le son');
    mute.click();
    expect(component.level()).toBe(0.37);
    expect(mute.getAttribute('aria-label')).toBe('Couper le son');
  });
});
