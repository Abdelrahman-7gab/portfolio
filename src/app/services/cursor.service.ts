import { Injectable, ElementRef } from '@angular/core';
import gsap from 'gsap';

@Injectable({
  providedIn: 'root'
})
export class CursorService {
  private mouse = { x: 0, y: 0 };
  private cursorRef?: ElementRef;
  private cursorTrailerRef?: ElementRef;

  initialize(cursorRef: ElementRef, cursorTrailerRef: ElementRef) {
    this.cursorRef = cursorRef;
    this.cursorTrailerRef = cursorTrailerRef;
    document.body.style.cursor = 'none';
  }

  handleMouseMove(event: MouseEvent) {
    if (!this.cursorRef || !this.cursorTrailerRef) return;

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
  }

  destroy() {
    document.body.style.cursor = 'auto';
  }
}
