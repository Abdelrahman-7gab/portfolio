import { ElementRef, Injectable, NgZone } from '@angular/core';
import gsap from 'gsap';

@Injectable({
  providedIn: 'root'
})
export class CursorService {
  private mouse = { x: 0, y: 0 };
  private cursorRef?: ElementRef;
  private cursorTrailerRef?: ElementRef;
  private enabled = false;

  constructor(private readonly ngZone: NgZone) {}

  initialize(cursorRef: ElementRef, cursorTrailerRef: ElementRef) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    this.cursorRef = cursorRef;
    this.cursorTrailerRef = cursorTrailerRef;
    this.enabled = true;
    document.body.style.cursor = 'none';
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.handleMouseMove);
    });
  }

  readonly handleMouseMove = (event: MouseEvent) => {
    if (!this.enabled || !this.cursorRef || !this.cursorTrailerRef) return;

    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;

    const cursor = this.cursorRef.nativeElement;
    const trailer = this.cursorTrailerRef.nativeElement;

    gsap.to(cursor, {
      x: event.clientX,
      y: event.clientY,
      duration: 0.1
    });

    gsap.to(trailer, {
      x: event.clientX,
      y: event.clientY,
      duration: 0.3
    });

    const target = event.target as HTMLElement;
    if (target.closest('a') || target.closest('.char')) {
      cursor.classList.add('cursor-hover');
      trailer.classList.add('cursor-hover');
    } else {
      cursor.classList.remove('cursor-hover');
      trailer.classList.remove('cursor-hover');
    }
  };

  destroy() {
    if (!this.enabled) return;

    if (this.cursorRef && this.cursorTrailerRef) {
      gsap.killTweensOf([
        this.cursorRef.nativeElement,
        this.cursorTrailerRef.nativeElement
      ]);
    }
    window.removeEventListener('mousemove', this.handleMouseMove);
    document.body.style.cursor = 'auto';
    this.cursorRef = undefined;
    this.cursorTrailerRef = undefined;
    this.enabled = false;
  }
}
