export interface Project {
  title: string;
  description: string;
  image: string;
  technologies: string[];
  liveUrl?: string;
  githubUrl?: string;
  features: string[];
}

export const projects: Project[] = [
  {
    title: 'Musicpedia',
    description: 'A comprehensive music discovery platform that allows users to explore artists, albums, and tracks with detailed information, lyrics, and metadata.',
    image: './assets/images/musicpedia.png',
    technologies: ['Angular', 'RxJS', 'NGRX', 'Web Scraping', 'Cloudflare Workers'],
    githubUrl: 'https://github.com/Abdelrahman-7gab/Musicpedia',
    liveUrl: 'https://musicpedia.abdelrahman-hegab.com',
    features: [
      'Integration with Deezer API for real-time music data',
      'Interactive artist and album exploration',
      'Responsive and intuitive user interface',
      'Web Scraping for lyrics'
    ]
  },
  {
    title: 'Portfolio Website',
    description: 'A modern, interactive portfolio website built with Angular featuring custom animations, particle effects, and responsive design.',
    image: './assets/images/portfolio.png',
    technologies: ['Angular', 'TypeScript', 'GSAP', 'HTML Canvas', 'SCSS'],
    githubUrl: 'https://github.com/Abdelrahman-7gab/portfolio',
    liveUrl: 'https://abdelrahman-hegab.com',
    features: [
      'Custom cursor animations and particle effects',
      'Smooth scroll animations with GSAP',
      'Interactive UI elements with hover effects',
    ]
  },
  {
    title: 'Currency Exchange',
    description: 'A real-time currency exchange application providing accurate conversion rates, historical data, and market trends analysis.',
    image: './assets/images/currency.png',
    technologies: ['React','Node.JS', 'Redis', 'Chart.js', 'MongoDB'],
    githubUrl: 'https://github.com/Abdelrahman-7gab/Currency-Exchanger',
    features: [
      'Real-time currency conversion with live rates',
      'Historical exchange rate charts and trends',
      'Redis for caching',
      'Chart.js for visualizations',
      'JWT authentication',
    ]
  }
];
