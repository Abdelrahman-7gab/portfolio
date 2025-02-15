import { Component, type ElementRef, type OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgFor } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgFor],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  @ViewChild('nameText', { static: true }) nameText!: ElementRef;
  @ViewChild('roleText', { static: true }) roleText!: ElementRef;

  readonly nameChars = 'Abdelrahman Hegab'.split('');
  private tweens: { [key: string]: gsap.core.Tween } = {};

  ngOnInit(): void {
    // Initial state - hide texts
    gsap.set([this.nameText.nativeElement, this.roleText.nativeElement], {
      opacity: 0,
      y: 50
    });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to(this.nameText.nativeElement, {
      opacity: 1,
      y: 0,
      duration: 1.5
    })
    .to(this.roleText.nativeElement, {
      opacity: 1,
      y: 0,
      duration: 1.5
    }, '-=1');

    // Wait for initial animations to complete
    setTimeout(() => {
      // Setup bounce animations
      const letters = gsap.utils.toArray<HTMLElement>('.char');

      letters.forEach((letter, index) => {
        // Create the tween
        this.tweens[index.toString()] = gsap.to(letter, {
          yPercent: -50,
          duration: 0.4,
          yoyo: true,
          repeat: 1,
          paused: true,
          ease: "power2.out"
        });

        // Add data attribute
        letter.dataset['tween'] = index.toString();

        // Add direct hover listener
        letter.addEventListener('mouseenter', () => {
          const tween = this.tweens[letter.dataset['tween'] || ''];
          if (tween && !gsap.isTweening(letter)) {
            tween.restart();
          }
        });
      });
    }, 100);
  }
}
