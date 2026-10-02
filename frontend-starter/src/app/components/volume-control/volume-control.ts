import { Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-volume-control',
  templateUrl: './volume-control.html',
  styleUrl: './volume-control.css',
})
export class VolumeControlComponent {
  readonly value = input(0.8);
  readonly valueChange = output<number>();
  readonly level = computed(() => this.clamp(this.value()));
  readonly percentage = computed(() => Math.round(this.level() * 100));
  readonly angle = computed(() => `${this.level() * 270 - 135}deg`);
  readonly sweep = computed(() => `${this.level() * 270}deg`);
  readonly dragging = signal(false);

  private previousVolume = 0.8;
  private drag: { id: number; x: number; y: number; value: number; axis: 'x' | 'y' | null } | null = null;

  startDrag(event: PointerEvent): void {
    if (event.button !== 0 || this.drag) return;
    event.preventDefault();
    const control = event.currentTarget as HTMLInputElement;
    control.focus({ preventScroll: true });
    control.setPointerCapture(event.pointerId);
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, value: this.level(), axis: null };
    this.dragging.set(true);
  }

  moveDrag(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    event.preventDefault();
    const horizontal = event.clientX - drag.x;
    const vertical = drag.y - event.clientY;
    if (!drag.axis) {
      if (Math.max(Math.abs(horizontal), Math.abs(vertical)) < 3) return;
      drag.axis = Math.abs(horizontal) > Math.abs(vertical) ? 'x' : 'y';
    }
    this.change(drag.value + (drag.axis === 'x' ? horizontal : vertical) / 140);
  }

  endDrag(event: PointerEvent): void {
    if (this.drag?.id !== event.pointerId) return;
    this.drag = null;
    this.dragging.set(false);
    const control = event.currentTarget as HTMLInputElement;
    if (control.hasPointerCapture(event.pointerId)) control.releasePointerCapture(event.pointerId);
  }

  onInput(event: Event): void {
    this.change((event.target as HTMLInputElement).valueAsNumber);
  }

  toggleMute(): void {
    if (this.level() > 0) {
      this.previousVolume = this.level();
      this.change(0);
    } else {
      this.change(this.previousVolume);
    }
  }

  private change(value: number): void {
    this.valueChange.emit(Math.round(this.clamp(value) * 100) / 100);
  }

  private clamp(value: number): number {
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  }
}
