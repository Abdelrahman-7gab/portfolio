import { Experience } from '../models/experience.model';

export const experiences: Experience[] = [
  {
    company: 'Spare Payments',
    role: 'Full-Stack Software Engineer',
    location: 'Cairo, Egypt',
    period: 'Mar 2024 - Present',
    description: [
      'Shipped payment features used by 70K+ users across 200+ merchants.',
      'Built payment, refund, gateway, and partner integration flows.',
      'Delivered financial reporting, exports, and reconciliation checks.',
      'Added OpenTelemetry tracing across HTTP, MySQL, and Redis.',
      'Reworked multi-printer support for 1,400+ merchant devices.'
    ],
    technologies: ['Angular', 'Ionic', 'Node.js', 'MySQL', 'Redis', 'OpenTelemetry', 'Electron']
  },
  {
    company: 'Alfan',
    role: 'Frontend Software Engineer',
    location: 'UAE, Remote',
    period: 'Jan 2023 - Apr 2024',
    description: [
      'Built reusable, responsive React interfaces for a creator monetization platform.',
      'Built a dashboard for cross-platform creator earnings.',
      'Refined product interactions and automated repetitive workflows.'
    ],
    technologies: ['React', 'TypeScript', 'Redux', 'Python', 'Selenium']
  },
  {
    company: 'Tensorgraph.io',
    role: 'Software Engineer (Part-Time)',
    location: 'Maadi, Egypt',
    period: 'Aug 2021 - Jan 2023',
    description: [
      'Built Node.js/PostgreSQL APIs for recommendations and analytics.',
      'Designed the responsive chat experience for the recommendation bot.',
      'Integrated TensorFlow recommendations from requirements to deployment.'
    ],
    technologies: ['Node.js', 'Angular', 'PostgreSQL', 'TensorFlow', 'Socket.io']
  }
];
