import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faFileAlt, faExternalLinkAlt, faPhone } from '@fortawesome/free-solid-svg-icons';
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

  readonly nameChars = 'Abdelrahman Hegab'.split('');
  readonly roleTextContent = 'Full Stack Developer';
  displayedRole = '';
  currentYear = new Date().getFullYear();

  // Social icons
  faGithub = faGithub;
  faLinkedin = faLinkedin;
  faEnvelope = faEnvelope;
  faFileAlt = faFileAlt;
  faExternalLink = faExternalLinkAlt;
  faPhone = faPhone;

  experiences = experiences;
  projects = projects;

  private typewriterInterval?: number;

  constructor(
    private cursorService: CursorService,
    private animationService: AnimationService
  ) {}

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.cursorService.handleMouseMove(event);
  }

  ngOnInit() {
    this.cursorService.initialize(this.cursorRef, this.cursorTrailerRef);
    this.startTypewriter();
    this.animationService.initializeHeroAnimations(
      this.nameText.nativeElement,
      this.socialIcons.nativeElement
    );
  }

  ngAfterViewInit() {
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

    // Initialize project scroll animations
    const projectCards = Array.from(document.querySelectorAll<HTMLElement>('.project-card'));
    projectCards.forEach((card, index) => {
      gsap.from(card, {
        opacity: 0,
        y: 100,
        duration: 1,
        scrollTrigger: {
          trigger: card,
          start: 'top bottom-=100',
          end: 'top center',
          toggleActions: 'play none none reverse',
          scrub: 1
        }
      });
    });
  }

  private startTypewriter() {
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
    this.cursorService.destroy();
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
    }
    this.animationService.destroy();
  }
}
