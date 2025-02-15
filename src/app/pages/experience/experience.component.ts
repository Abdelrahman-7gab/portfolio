import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CommonModule } from '@angular/common';

gsap.registerPlugin(ScrollTrigger);

interface Experience {
  company: string;
  role: string;
  period: string;
  description: string[];
  technologies: string[];
}

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss'
})
export class ExperienceComponent implements OnInit {
  @ViewChild('cardsContainer', { static: true }) cardsContainer!: ElementRef;

  experiences: Experience[] = [
    {
      company: 'Company One',
      role: 'Senior Software Engineer',
      period: 'Jan 2023 - Present',
      description: [
        'Led development of microservices architecture',
        'Improved system performance by 40%',
        'Mentored junior developers'
      ],
      technologies: ['Angular', 'Node.js', 'TypeScript', 'AWS']
    },
    {
      company: 'Company Two',
      role: 'Full Stack Developer',
      period: 'Mar 2021 - Dec 2022',
      description: [
        'Developed scalable web applications',
        'Implemented CI/CD pipelines',
        'Reduced loading time by 60%'
      ],
      technologies: ['React', 'Express.js', 'MongoDB', 'Docker']
    },
    {
      company: 'Company Three',
      role: 'Frontend Developer',
      period: 'Jun 2020 - Feb 2021',
      description: [
        'Built responsive web interfaces',
        'Optimized application performance',
        'Collaborated with design team'
      ],
      technologies: ['Vue.js', 'JavaScript', 'SCSS', 'Git']
    }
  ];

  ngOnInit() {
    this.initScrollAnimations();
  }

  private initScrollAnimations() {
    const cards = gsap.utils.toArray<HTMLElement>('.experience-card');

    // Initial state
    gsap.set(cards, {
      opacity: 0,
      y: 100,
      scale: 0.9
    });

    // Create scroll-triggered animations for each card
    cards.forEach((card, index) => {
      gsap.to(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top center+=100',
          end: 'bottom center',
          toggleActions: 'play none none reverse',
          markers: false,
        },
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
        stagger: {
          amount: 0.3,
          from: 'start'
        }
      });
    });
  }
}
