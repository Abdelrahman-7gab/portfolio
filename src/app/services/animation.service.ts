import { Injectable } from '@angular/core';
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
  private mousePosition = { x: 0, y: 0 };
  private readonly particleSymbols = ['•', '○', '◦', '⚬', '∙', '·'];

  initializeHeroAnimations(nameText: HTMLElement, socialIcons: HTMLElement) {
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

      letter.addEventListener('mouseenter', () => {
        const tween = this.tweens[Number(letter.dataset['tween'])];
        if (tween && !gsap.isTweening(letter)) {
          tween.restart();
        }
      });
    });
  }

  initializeScrollAnimations(cards: HTMLElement[]) {
    cards.forEach((card, index) => {
      const startX = index % 2 === 0 ? -800 : 800;

      this.createCardAnimation(card, startX);
      this.setupCardHoverEffects(card);
    });

    this.initializeSectionTitleAnimation();
  }

  private createCardAnimation(card: HTMLElement, startX: number) {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: card,
        start: 'top bottom',
        end: '+=70%',
        toggleActions: 'play none none reverse',
        scrub: 1,
      }
    });

    tl.fromTo(card,
      {
        opacity: 0,
        x: startX,
        y: 0,
        rotationX: 15,
        scale: 0.95,
        transformOrigin: '50% 100%'
      },
      {
        opacity: 1,
        x: 0,
        y: 0,
        rotationX: 0,
        scale: 1,
        duration: 1,
        ease: 'power2.out'
      }
    );
  }

  private setupCardHoverEffects(card: HTMLElement) {
    gsap.to(card, {
      paused: true,
      scale: 1.02,
      boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
      y: -5,
      duration: 0.3,
      ease: 'power2.out'
    });

    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        scale: 1.02,
        boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
        y: -5,
        duration: 0.3,
        ease: 'power2.out'
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        scale: 1,
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        y: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    });
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
        duration: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionTitle,
          start: 'top bottom-=100',
          end: 'top center',
          toggleActions: 'play none none reverse',
          scrub: 1
        }
      }
    );
  }

  initializeMatrixEffect(container: HTMLElement) {
    this.matrixContainer = container;
    this.createMatrixGrid();
    this.startMatrixAnimation();

    // Add mouse move listener
    window.addEventListener('mousemove', (e) => {
      this.mousePosition = { x: e.clientX, y: e.clientY };
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

  private startMatrixAnimation() {
    const animate = () => {
      for (const particle of this.matrixParticles) {
        if (!this.matrixContainer) break;

        const dx = this.mousePosition.x - (particle.x + this.matrixContainer.offsetLeft);
        const dy = this.mousePosition.y - (particle.y + this.matrixContainer.offsetTop);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          if (!particle.changing) {
            particle.changing = true;
            this.animateParticle(particle);
          }
        } else {
          if (particle.changing) {
            particle.changing = false;
            particle.element.textContent = particle.originalChar;
            particle.element.style.color = '#c15905';
            particle.element.style.opacity = '0.3';
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
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
    this.experienceContainer = section;
    this.createExperienceParticles();
    this.startExperienceAnimation();
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
    const animate = () => {
      if (!this.experienceContainer) return;

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

        if (distance < maxDistance && relativeY > 0 && relativeY < rect.height) {
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

  initializeExperienceEffects(cards: HTMLElement[]) {
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
      card.addEventListener('mouseenter', () => {
        this.startGlitchEffect(glitchContainer);
      });

      card.addEventListener('mouseleave', () => {
        this.stopGlitchEffect(glitchContainer);
      });
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
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.experienceAnimationId) {
      cancelAnimationFrame(this.experienceAnimationId);
    }
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
