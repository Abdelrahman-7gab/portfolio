import { Injectable, NgZone } from '@angular/core';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface MatrixParticle {
  element: HTMLElement;
  originalChar: string;
  x: number;
  y: number;
  changing: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  element: HTMLElement;
}

@Injectable({
  providedIn: 'root'
})
export class AnimationService {
  private tweens: { [key: string]: gsap.core.Tween } = {};
  private matrixParticles: MatrixParticle[] = [];
  private experienceParticles: Particle[] = [];
  private readonly cryptoChars = '01{}[]<>!@#$%^&*()_+-=;:,.?/|~';
  private matrixContainer?: HTMLElement;
  private experienceContainer?: HTMLElement;
  private animationFrameId?: number;
  private experienceAnimationId?: number;
  private experienceObserver?: IntersectionObserver;
  private experienceVisible = false;
  private mousePosition = { x: 0, y: 0 };
  private readonly particleSymbols = ['•', '○', '◦', '⚬', '∙', '·'];
  private readonly cleanupFunctions: Array<() => void> = [];
  private readonly updateMousePosition = (event: MouseEvent) => {
    this.mousePosition = { x: event.clientX, y: event.clientY };
    if (this.animationFrameId !== undefined) return;

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = undefined;
      this.updateMatrixParticles();
    });
  };

  constructor(private readonly ngZone: NgZone) {}

  private get prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  initializeHeroAnimations(nameText: HTMLElement, socialIcons: HTMLElement) {
    if (this.prefersReducedMotion) return;

    gsap.set([nameText, socialIcons], {
      opacity: 0,
      y: 50
    });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to(nameText, {
      opacity: 1,
      y: 0,
      duration: 2
    })
    .to(socialIcons, {
      opacity: 1,
      y: 0,
      duration: 1.5,
      stagger: 0.2,
      delay: 2
    }, '-=1.9');
  }

  initializeLetterAnimations(letters: HTMLElement[]) {
    if (this.prefersReducedMotion) return;

    letters.forEach((letter, index) => {
      this.tweens[index] = gsap.to(letter, {
        yPercent: -50,
        duration: 0.4,
        yoyo: true,
        repeat: 1,
        paused: true,
        ease: "power2.out"
      });

      letter.dataset['tween'] = index.toString();

      const handleMouseEnter = () => {
        const tween = this.tweens[Number(letter.dataset['tween'])];
        if (tween && !gsap.isTweening(letter)) {
          tween.restart();
        }
      };

      letter.addEventListener('mouseenter', handleMouseEnter);
      this.cleanupFunctions.push(() =>
        letter.removeEventListener('mouseenter', handleMouseEnter)
      );
    });
  }

  initializeScrollAnimations(cards: HTMLElement[]) {
    if (this.prefersReducedMotion) return;

    cards.forEach((card, index) => {
      const startX = index % 2 === 0 ? -300 : 300;

      this.createCardAnimation(card, startX);
      this.setupCardHoverEffects(card);
    });

    this.initializeSectionTitleAnimation();
  }

  private createCardAnimation(card: HTMLElement, startX: number) {
    // Experience cards animation (horizontal) - tied to scroll position
    const isMobile = window.innerWidth <= 768;

    gsap.fromTo(card,
      {
        opacity: 0,
        x: startX * 0.5, // Balanced movement distance
        y: 30, // Moderate vertical movement
        scale: 0.92 // Moderate scale change
      },
      {
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
      }
    );
  }

  private setupCardHoverEffects(card: HTMLElement) {
    // Simple, high-performance hover effects
    const handleMouseEnter = () => {
      gsap.to(card, {
        scale: 1.02,
        y: -8,
        boxShadow: '0 12px 25px rgba(193, 89, 5, 0.15)',
        borderColor: 'rgba(193, 89, 5, 0.4)',
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        scale: 1,
        y: 0,
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
    this.cleanupFunctions.push(
      () => card.removeEventListener('mouseenter', handleMouseEnter),
      () => card.removeEventListener('mouseleave', handleMouseLeave)
    );
  }

  private initializeSectionTitleAnimation() {
    const sectionTitle = document.querySelector('.section-title');
    if (!sectionTitle) return;

    gsap.fromTo(sectionTitle,
      {
        opacity: 0,
        y: 50
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionTitle,
          start: 'top bottom-=100',
          end: 'top center',
          toggleActions: 'play none none reverse'
        }
      }
    );
  }

  initializeMatrixEffect(container: HTMLElement) {
    if (this.prefersReducedMotion) return;

    this.ngZone.runOutsideAngular(() => {
      this.matrixContainer = container;
      this.createMatrixGrid();
      window.addEventListener('mousemove', this.updateMousePosition);
      this.cleanupFunctions.push(() =>
        window.removeEventListener('mousemove', this.updateMousePosition)
      );
    });
  }

  private createMatrixGrid() {
    if (!this.matrixContainer) return;

    const containerRect = this.matrixContainer.getBoundingClientRect();
    const cellSize = 25;

    // Calculate grid dimensions
    const columns = Math.floor(containerRect.width / cellSize);
    const rows = Math.floor(containerRect.height / cellSize);

    // Clear existing particles
    this.matrixParticles = [];
    this.matrixContainer.innerHTML = '';

    // Create grid of characters
    for (let y = 0; y < rows; y += 2) {
      for (let x = 0; x < columns; x += 2) {
        const char = this.cryptoChars[Math.floor(Math.random() * this.cryptoChars.length)];
        const element = document.createElement('span');

        element.style.position = 'absolute';
        element.style.left = `${x * cellSize}px`;
        element.style.top = `${y * cellSize}px`;
        element.style.fontFamily = 'Fira Code, monospace';
        element.style.fontSize = '14px';
        element.style.color = '#c15905';
        element.style.opacity = '0.2';
        element.textContent = char;

        this.matrixContainer.appendChild(element);

        this.matrixParticles.push({
          element,
          originalChar: char,
          x: x * cellSize,
          y: y * cellSize,
          changing: false
        });
      }
    }
  }

  private updateMatrixParticles() {
    if (!this.matrixContainer) return;

    const containerLeft = this.matrixContainer.offsetLeft;
    const containerTop = this.matrixContainer.offsetTop;

    for (const particle of this.matrixParticles) {
      const dx = this.mousePosition.x - (particle.x + containerLeft);
      const dy = this.mousePosition.y - (particle.y + containerTop);

      if (dx * dx + dy * dy < 22500) {
        if (!particle.changing) {
          particle.changing = true;
          this.animateParticle(particle);
        }
      } else if (particle.changing) {
        particle.changing = false;
        particle.element.textContent = particle.originalChar;
        particle.element.style.color = '#c15905';
        particle.element.style.opacity = '0.3';
      }
    }
  }

  private animateParticle(particle: MatrixParticle) {
    const changeChar = () => {
      if (!particle.changing) return;

      particle.element.textContent = this.cryptoChars[Math.floor(Math.random() * this.cryptoChars.length)];
      particle.element.style.color = '#ff8534';
      particle.element.style.opacity = '0.8';

      setTimeout(changeChar, 150);
    };

    changeChar();
  }

  initializeExperienceEffect(section: HTMLElement) {
    if (this.prefersReducedMotion) return;

    this.experienceContainer = section;
    this.createExperienceParticles();
    this.ngZone.runOutsideAngular(() => {
      this.experienceObserver = new IntersectionObserver(
        ([entry]) => {
          this.experienceVisible = entry?.isIntersecting ?? false;
          if (this.experienceVisible) {
            this.startExperienceAnimation();
          } else {
            this.stopExperienceAnimation();
          }
        },
        { rootMargin: '100px' }
      );
      this.experienceObserver.observe(section);
    });
  }

  private createExperienceParticles() {
    if (!this.experienceContainer) return;

    const containerRect = this.experienceContainer.getBoundingClientRect();
    const particleCount = Math.floor((containerRect.width * containerRect.height) / 15000);

    // Create overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'experience-overlay';
    overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    `;
    this.experienceContainer.appendChild(overlayContainer);

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('span');
      particle.textContent = this.particleSymbols[Math.floor(Math.random() * this.particleSymbols.length)];
      particle.style.cssText = `
        position: absolute;
        color: #c15905;
        opacity: 0.4;
        will-change: transform;
        pointer-events: none;
      `;
      overlayContainer.appendChild(particle);

      this.experienceParticles.push({
        x: Math.random() * containerRect.width,
        y: Math.random() * containerRect.height,
        size: Math.random() * 8 + 4,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        element: particle
      });
    }
  }

  private startExperienceAnimation() {
    if (this.experienceAnimationId !== undefined) return;

    const animate = () => {
      if (!this.experienceContainer || !this.experienceVisible) {
        this.experienceAnimationId = undefined;
        return;
      }

      const rect = this.experienceContainer.getBoundingClientRect();
      const relativeX = this.mousePosition.x - rect.left;
      const relativeY = this.mousePosition.y - rect.top;

      for (const particle of this.experienceParticles) {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Boundary check
        if (particle.x < 0) particle.x = rect.width;
        if (particle.x > rect.width) particle.x = 0;
        if (particle.y < 0) particle.y = rect.height;
        if (particle.y > rect.height) particle.y = 0;

        // Mouse interaction
        const dx = relativeX - particle.x;
        const dy = relativeY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 150;

        if (distance > 0 && distance < maxDistance && relativeY > 0 && relativeY < rect.height) {
          const force = (1 - distance / maxDistance) * 0.2;
          particle.speedX += (dx / distance) * force;
          particle.speedY += (dy / distance) * force;

          // Add glow effect
          particle.element.style.textShadow = `0 0 ${distance / 5}px #ff8534`;
          particle.element.style.opacity = (0.4 + (1 - distance / maxDistance) * 0.6).toString();
        } else {
          // Reset glow and opacity
          particle.element.style.textShadow = 'none';
          particle.element.style.opacity = '0.4';

          // Apply friction to slow down particles
          particle.speedX *= 0.99;
          particle.speedY *= 0.99;
        }

        // Speed limit
        const maxSpeed = 2;
        const speed = Math.sqrt(particle.speedX * particle.speedX + particle.speedY * particle.speedY);
        if (speed > maxSpeed) {
          particle.speedX = (particle.speedX / speed) * maxSpeed;
          particle.speedY = (particle.speedY / speed) * maxSpeed;
        }

        // Update particle position
        particle.element.style.transform = `translate(${particle.x}px, ${particle.y}px) scale(${particle.size / 10})`;
      }

      this.experienceAnimationId = requestAnimationFrame(animate);
    };

    animate();
  }

  private stopExperienceAnimation() {
    if (this.experienceAnimationId === undefined) return;

    cancelAnimationFrame(this.experienceAnimationId);
    this.experienceAnimationId = undefined;
  }

  initializeExperienceEffects(cards: HTMLElement[]) {
    if (this.prefersReducedMotion) return;

    for (const card of cards) {
      // Create glitch effect container
      const glitchContainer = document.createElement('div');
      glitchContainer.className = 'glitch-container';
      card.appendChild(glitchContainer);

      // Add glitch characters
      for (let i = 0; i < 20; i++) {
        const glitchChar = document.createElement('span');
        glitchChar.className = 'glitch-char';
        glitchChar.textContent = this.cryptoChars[Math.floor(Math.random() * this.cryptoChars.length)];
        glitchContainer.appendChild(glitchChar);
      }

      // Add hover effect
      const handleMouseEnter = () => {
        this.startGlitchEffect(glitchContainer);
      };

      const handleMouseLeave = () => {
        this.stopGlitchEffect(glitchContainer);
      };

      card.addEventListener('mouseenter', handleMouseEnter);
      card.addEventListener('mouseleave', handleMouseLeave);
      this.cleanupFunctions.push(
        () => card.removeEventListener('mouseenter', handleMouseEnter),
        () => card.removeEventListener('mouseleave', handleMouseLeave)
      );
    }
  }

  private startGlitchEffect(container: HTMLElement) {
    const chars = container.querySelectorAll('.glitch-char');
    for (const char of chars) {
      gsap.to(char, {
        opacity: 0.8,
        duration: 0.1,
        repeat: -1,
        yoyo: true,
        onRepeat: () => {
          (char as HTMLElement).textContent =
            this.cryptoChars[Math.floor(Math.random() * this.cryptoChars.length)];
        }
      });
    }
  }

  private stopGlitchEffect(container: HTMLElement) {
    const chars = container.querySelectorAll('.glitch-char');
    for (const char of chars) {
      gsap.to(char, {
        opacity: 0,
        duration: 0.2,
        onComplete: () => {
          gsap.killTweensOf(char);
        }
      });
    }
  }

  destroy() {
    for (const cleanup of this.cleanupFunctions.splice(0)) {
      cleanup();
    }
    for (const trigger of ScrollTrigger.getAll()) {
      trigger.kill();
    }
    for (const animation of gsap.globalTimeline.getChildren()) {
      animation.kill();
    }
    for (const tween of Object.values(this.tweens)) {
      tween.kill();
    }
    this.tweens = {};

    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    this.experienceObserver?.disconnect();
    this.experienceObserver = undefined;
    this.experienceVisible = false;
    this.stopExperienceAnimation();
    this.matrixParticles.forEach((particle) => (particle.changing = false));
    this.matrixParticles = [];
    this.experienceParticles = [];
    if (this.matrixContainer) {
      this.matrixContainer.innerHTML = '';
    }
    if (this.experienceContainer) {
      const overlay = this.experienceContainer.querySelector('.experience-overlay');
      if (overlay) {
        overlay.remove();
      }
    }
  }
}
