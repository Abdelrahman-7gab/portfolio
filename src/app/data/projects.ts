export interface Project {
  title: string;
  description: string;
  image: string;
  technologies: string[];
  liveUrl?: string;
  githubUrl?: string;
  npmUrl?: string;
  features: string[];
}

// Function to determine MCPRunner URL based on date
function getMCPRunnerURL(): string {
  const expirationDate = new Date('2026-03-10');
  return new Date() < expirationDate ? 'https://mcprunner.com' : 'https://mcprunnerweb.pages.dev/';
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
    title: 'MCPRunner',
    description: 'A lightweight CLI tool designed to simplify running scripts with environment variables, specifically optimized for Cursor AI development workflows.',
    image: './assets/images/mcprunner.png',
    technologies: ['Node.js', 'CLI', 'Cross-Platform', 'Shell Scripting'],
    githubUrl: 'https://github.com/Abdelrahman-7gab/MCPRunner',
    liveUrl: getMCPRunnerURL(),
    npmUrl: 'https://www.npmjs.com/package/mcprunner',
    features: [
      'Single command execution for scripts with environment variables',
      'Interactive web interface for command generation',
      'Cross-platform support (Windows, macOS, Linux)',
      'Solves a problem with Cursor AI before V0.47.0 and standardizes the way to run scripts with environment variables'
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
    technologies: ['React', 'Node.JS', 'Redis', 'Chart.js', 'MongoDB'],
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
