import { Component, type ElementRef, type OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgFor } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import gsap from 'gsap';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgFor, FontAwesomeModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('nameText', { static: true }) nameText!: ElementRef;
  @ViewChild('roleText', { static: true }) roleTextElement!: ElementRef;
  @ViewChild('socialIcons', { static: true }) socialIcons!: ElementRef;
  @ViewChild('particleCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cursor', { static: true }) cursorRef!: ElementRef;
  @ViewChild('cursorTrailer', { static: true }) cursorTrailerRef!: ElementRef;

  readonly nameChars = 'Abdelrahman Hegab'.split('');
  private tweens: { [key: string]: gsap.core.Tween } = {};

  // Social icons
  faGithub = faGithub;
  faLinkedin = faLinkedin;
  faEnvelope = faEnvelope;
  faFileAlt = faFileAlt;

  private mouse = { x: 0, y: 0 };
  private particles: Array<{ x: number; y: number; dx: number; dy: number; size: number }> = [];
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId?: number;

  // Role text animation
  private readonly roleTextContent = 'Full Stack Developer';
  displayedRole = '';
  private typewriterInterval?: number;

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;

    // Update social icons parallax
    const icons = document.querySelectorAll('.icon-link');
    icons.forEach((icon, index) => {
      const rect = icon.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distX = this.mouse.x - centerX;
      const distY = this.mouse.y - centerY;

      const element = icon as HTMLElement;
      element.style.transform = `translate(${distX * 0.05}px, ${distY * 0.05}px)`;
    });

    // Update custom cursor
    const cursor = this.cursorRef.nativeElement;
    const trailer = this.cursorTrailerRef.nativeElement;

    // Smooth cursor following
    gsap.to(cursor, {
      x: event.clientX,
      y: event.clientY,
      duration: 0.2
    });

    // Trailer follows with delay
    gsap.to(trailer, {
      x: event.clientX,
      y: event.clientY,
      duration: 0.5
    });

    // Add hover effect for interactive elements
    const target = event.target as HTMLElement;
    if (target.closest('a') || target.closest('.char')) {
      cursor.classList.add('cursor-hover');
      trailer.classList.add('cursor-hover');
    } else {
      cursor.classList.remove('cursor-hover');
      trailer.classList.remove('cursor-hover');
    }
  }

  ngOnInit(): void {
    // Hide default cursor when component initializes
    document.body.style.cursor = 'none';

    // Initial state - hide texts and icons
    gsap.set([
      this.nameText.nativeElement,
      this.socialIcons.nativeElement
    ], {
      opacity: 0,
      y: 50
    });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.call(() => this.startTypewriter()).
    to(this.nameText.nativeElement, {
      opacity: 1,
      y: 0,
      duration: 2
    })
    .to(this.socialIcons.nativeElement, {
      opacity: 1,
      y: 0,
      duration: 1.5,
      stagger: 0.2,
      delay: 2
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

  ngAfterViewInit() {
    this.initCanvas();
    this.animate();
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1
      });
    }
  }

  private animate() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw and update particles
    this.particles.forEach(particle => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(193, 89, 5, 0.5)'; // Using your orange color
      this.ctx.fill();

      // Update position
      particle.x += particle.dx;
      particle.y += particle.dy;

      // Mouse interaction
      const dx = this.mouse.x - particle.x;
      const dy = this.mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 100) {
        particle.x += dx * 0.02;
        particle.y += dy * 0.02;
      }

      // Bounce off walls
      if (particle.x < 0 || particle.x > canvas.width) particle.dx *= -1;
      if (particle.y < 0 || particle.y > canvas.height) particle.dy *= -1;
    });

    // Draw cursor glow
    const gradient = this.ctx.createRadialGradient(
      this.mouse.x, this.mouse.y, 0,
      this.mouse.x, this.mouse.y, 50
    );
    gradient.addColorStop(0, 'rgba(193, 89, 5, 0.2)');
    gradient.addColorStop(1, 'rgba(193, 89, 5, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    document.body.style.cursor = 'auto';

    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
    }
  }
}
