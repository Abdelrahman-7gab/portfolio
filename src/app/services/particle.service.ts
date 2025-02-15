import { Injectable } from '@angular/core';

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class ParticleService {
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private mouse = { x: 0, y: 0 };
  private animationFrameId?: number;

  initialize(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context from canvas');
    this.ctx = context;

    this.initializeParticles(canvas);
    this.setupResizeHandler(canvas);
  }

  updateMousePosition(x: number, y: number) {
    this.mouse = { x, y };
  }

  private initializeParticles(canvas: HTMLCanvasElement) {
    this.particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      dx: (Math.random() - 0.5) * 2,
      dy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1
    }));
  }

  private setupResizeHandler(canvas: HTMLCanvasElement) {
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  animate(canvas: HTMLCanvasElement) {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.updateAndDrawParticles(canvas);
    this.drawCursorGlow();

    this.animationFrameId = requestAnimationFrame(() => this.animate(canvas));
  }

  private updateAndDrawParticles(canvas: HTMLCanvasElement) {
    if (!this.ctx) return;

    for (const particle of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(193, 89, 5, 0.5)';
      this.ctx.fill();

      this.updateParticlePosition(particle, canvas);
    }
  }

  private updateParticlePosition(particle: Particle, canvas: HTMLCanvasElement) {
    particle.x += particle.dx;
    particle.y += particle.dy;

    const dx = this.mouse.x - particle.x;
    const dy = this.mouse.y - particle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 100) {
      particle.x += dx * 0.02;
      particle.y += dy * 0.02;
    }

    if (particle.x < 0 || particle.x > canvas.width) particle.dx *= -1;
    if (particle.y < 0 || particle.y > canvas.height) particle.dy *= -1;
  }

  private drawCursorGlow() {
    if (!this.ctx) return;

    const gradient = this.ctx.createRadialGradient(
      this.mouse.x, this.mouse.y, 0,
      this.mouse.x, this.mouse.y, 50
    );
    gradient.addColorStop(0, 'rgba(193, 89, 5, 0.2)');
    gradient.addColorStop(1, 'rgba(193, 89, 5, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
