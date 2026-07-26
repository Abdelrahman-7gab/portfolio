import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGithub, faLinkedin, faNpm } from '@fortawesome/free-brands-svg-icons';
import {
  faChevronLeft,
  faChevronRight,
  faEnvelope,
  faEllipsis,
  faExternalLinkAlt,
  faFileAlt,
  faPhone
} from '@fortawesome/free-solid-svg-icons';
import { CursorService } from './services/cursor.service';
import { AnimationService } from './services/animation.service';
import gsap from 'gsap';
import { projects } from './data/projects';
import { experiences } from './data/experiences';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FontAwesomeModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('nameText', { static: true }) nameText!: ElementRef;
  @ViewChild('roleText', { static: true }) roleTextElement!: ElementRef;
  @ViewChild('socialIcons', { static: true }) socialIcons!: ElementRef;
  @ViewChild('cursor', { static: true }) cursorRef!: ElementRef;
  @ViewChild('cursorTrailer', { static: true }) cursorTrailerRef!: ElementRef;
  @ViewChild('matrixContainer', { static: true }) matrixContainer!: ElementRef;
  @ViewChild('siteNav', { static: true }) siteNav!: ElementRef<HTMLElement>;

  readonly nameChars = 'Abdelrahman Hegab'.split('');
  readonly roleTextContent = 'Full-Stack Software Engineer';
  displayedRole = '';
  currentYear = new Date().getFullYear();
  isNavCollapsed = false;
  isNavReturning = false;

  // Social icons
  faGithub = faGithub;
  faLinkedin = faLinkedin;
  faEnvelope = faEnvelope;
  faFileAlt = faFileAlt;
  faExternalLink = faExternalLinkAlt;
  faPhone = faPhone;
  faNpm = faNpm;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faEllipsis = faEllipsis;

  experiences = experiences;
  projects = projects;

  private typewriterInterval?: number;
  private navigationDragCleanup?: () => void;
  private navigationReturnTween?: gsap.core.Tween;

  toggleNavigation() {
    if (this.isNavReturning) return;

    if (!this.isNavCollapsed) {
      this.isNavCollapsed = true;
      return;
    }

    this.returnNavigationToOrigin();
  }

  startNavigationDrag(event: PointerEvent) {
    if (!this.isNavCollapsed || this.isNavReturning || event.button !== 0) return;

    event.preventDefault();
    this.navigationDragCleanup?.();

    const handle = event.currentTarget as HTMLElement;
    const nav = this.siteNav.nativeElement;
    const rect = nav.getBoundingClientRect();
    const pointerId = event.pointerId;
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    nav.style.left = `${rect.left}px`;
    nav.style.top = `${rect.top}px`;
    nav.style.transform = 'none';
    nav.classList.add('is-dragging');
    handle.setPointerCapture(pointerId);

    this.ngZone.runOutsideAngular(() => {
      let nextX = rect.left;
      let nextY = rect.top;
      let animationFrameId: number | undefined;

      const applyPosition = () => {
        nav.style.left = `${nextX}px`;
        nav.style.top = `${nextY}px`;
        animationFrameId = undefined;
      };

      const move = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;

        nextX = Math.min(
          Math.max(0, moveEvent.clientX - offsetX),
          window.innerWidth - nav.offsetWidth
        );
        nextY = Math.min(
          Math.max(0, moveEvent.clientY - offsetY),
          window.innerHeight - nav.offsetHeight
        );

        animationFrameId ??= requestAnimationFrame(applyPosition);
      };

      const stop = (stopEvent: PointerEvent) => {
        if (stopEvent.pointerId !== pointerId) return;
        cleanup();
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
        if (handle.hasPointerCapture(pointerId)) {
          handle.releasePointerCapture(pointerId);
        }
        if (animationFrameId !== undefined) {
          cancelAnimationFrame(animationFrameId);
          applyPosition();
        }
        nav.classList.remove('is-dragging');
        if (this.navigationDragCleanup === cleanup) {
          this.navigationDragCleanup = undefined;
        }
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
      this.navigationDragCleanup = cleanup;
    });
  }

  moveNavigationWithKeyboard(event: KeyboardEvent) {
    if (!this.isNavCollapsed) return;

    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    }[event.key];

    if (!direction) return;
    event.preventDefault();

    const nav = this.siteNav.nativeElement;
    const rect = nav.getBoundingClientRect();
    const step = event.shiftKey ? 32 : 8;
    const left = Math.min(
      Math.max(0, rect.left + direction[0] * step),
      window.innerWidth - nav.offsetWidth
    );
    const top = Math.min(
      Math.max(0, rect.top + direction[1] * step),
      window.innerHeight - nav.offsetHeight
    );

    nav.style.left = `${left}px`;
    nav.style.top = `${top}px`;
    nav.style.transform = 'none';
  }

  private returnNavigationToOrigin() {
    const nav = this.siteNav.nativeElement;
    const rect = nav.getBoundingClientRect();
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const targetLeft = (window.innerWidth - rect.width) / 2;
    const targetTop = rootFontSize * (window.innerWidth <= 768 ? 0.65 : 1);
    const translateX = targetLeft - rect.left;
    const translateY = targetTop - rect.top;

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      (Math.abs(translateX) < 1 && Math.abs(translateY) < 1)
    ) {
      this.finishNavigationExpansion();
      return;
    }

    this.isNavReturning = true;
    this.navigationReturnTween = gsap.fromTo(
      nav,
      { x: 0, y: 0 },
      {
        x: translateX,
        y: translateY,
        duration: 0.32,
        ease: 'power3.out',
        onComplete: () => this.finishNavigationExpansion()
      }
    );
  }

  private finishNavigationExpansion() {
    this.navigationReturnTween?.kill();
    this.navigationReturnTween = undefined;
    this.resetNavigationPosition();
    this.ngZone.run(() => {
      this.isNavReturning = false;
      this.isNavCollapsed = false;
    });
  }

  private resetNavigationPosition() {
    this.navigationDragCleanup?.();
    const nav = this.siteNav.nativeElement;
    nav.style.removeProperty('left');
    nav.style.removeProperty('top');
    nav.style.removeProperty('transform');
    nav.classList.remove('is-dragging');
  }

  constructor(
    private cursorService: CursorService,
    private animationService: AnimationService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.cursorService.initialize(this.cursorRef, this.cursorTrailerRef);
    this.startTypewriter();
    this.ngZone.runOutsideAngular(() => {
      this.animationService.initializeHeroAnimations(
        this.nameText.nativeElement,
        this.socialIcons.nativeElement
      );
    });
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      const letters = Array.from(document.querySelectorAll<HTMLElement>('.char'));
      this.animationService.initializeLetterAnimations(letters);

      const cards = Array.from(document.querySelectorAll<HTMLElement>('.experience-card'));
      this.animationService.initializeScrollAnimations(cards);

      const experienceSection = document.querySelector('.experience-section') as HTMLElement;
      if (experienceSection) {
        this.animationService.initializeExperienceEffect(experienceSection);
      }

      const matrixContainer = document.querySelector('.matrix-container') as HTMLElement;
      if (matrixContainer) {
        this.animationService.initializeMatrixEffect(matrixContainer);
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      // Initialize project scroll animations (vertical) - tied to scroll position
      const projectCards = Array.from(document.querySelectorAll<HTMLElement>('.project-card'));
      projectCards.forEach((card, index) => {
        const startY = index % 2 === 0 ? -60 : 60; // Balanced vertical movement
        const isMobile = window.innerWidth <= 768;

        gsap.fromTo(card, {
          opacity: 0,
          x: 0, // No horizontal movement
          y: startY, // Moderate vertical movement
          scale: 0.92 // Moderate scale change
        }, {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: isMobile ? 'top bottom+=50' : 'top bottom+=100', // Start earlier on mobile
            end: isMobile ? 'top center-=50' : 'top center',       // End earlier on mobile
            scrub: 0.5,
            toggleActions: 'play reverse play reverse'
          }
        });
      });
    });
  }

  private startTypewriter() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.displayedRole = this.roleTextContent;
      return;
    }

    let currentIndex = 0;
    const typingSpeed = 100; // milliseconds per character

    this.typewriterInterval = window.setInterval(() => {
      if (currentIndex <= this.roleTextContent.length) {
        this.displayedRole = this.roleTextContent.slice(0, currentIndex) +
          (currentIndex < this.roleTextContent.length ? '|' : '');
        currentIndex++;
      } else {
        // Add a blinking cursor effect after typing is complete
        this.displayedRole = this.roleTextContent +
          (Math.floor(Date.now() / 500) % 2 === 0 ? '|' : '');
      }
    }, typingSpeed);
  }

  ngOnDestroy() {
    this.navigationDragCleanup?.();
    this.navigationReturnTween?.kill();
    this.cursorService.destroy();
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
    }
    this.animationService.destroy();
  }
}
