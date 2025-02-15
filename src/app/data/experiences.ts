import { Experience } from '../models/experience.model';

export const experiences: Experience[] = [
  {
    company: 'Spare Payments',
    role: 'Fullstack Software Developer',
    period: 'Mar 2024 - Present',
    description: [
      'Developing a fintech digital payments platform using Angular, Ionic, Node.js, and MySQL with Redis caching',
      'Contributing to microservices architecture implementation for handling high-volume financial transactions',
      'Designing and implementing secure APIs with robust data integrity and privacy measures',
      'Optimizing database performance through efficient MySQL integration and query optimization'
    ],
    technologies: ['Angular', 'Ionic', 'Node.js', 'MySQL', 'Redis', 'Microservices', 'Mocha']
  },
  {
    company: 'Alfan',
    role: 'Frontend Developer',
    period: 'Jan 2023 - Apr 2024',
    description: [
      'Built responsive and performant user interfaces using React and modern frontend technologies',
      'Collaborated closely with design teams to implement intuitive and visually appealing user experiences',
      'Developed automation scripts to streamline development workflows and reduce manual processes',
      'Implemented responsive design patterns ensuring cross-device compatibility'
    ],
    technologies: ['React', 'TypeScript', 'Node.js', 'Python', 'Selenium']
  },
  {
    company: 'Tensorgraph.io',
    role: 'Junior Software Engineer',
    period: 'Aug 2021 - Jan 2023',
    description: [
      'Managed full-cycle software development from requirements gathering to deployment',
      'Developed and optimized RESTful APIs using Node.js and PostgreSQL',
      'Contributed to an intelligent recommendation system implementation using TensorFlow',
      'Collaborated in an agile environment to deliver high-quality software solutions'
    ],
    technologies: ['Node.js', 'Angular', 'PostgreSQL', 'TensorFlow', 'Socket.io']
  }
];
