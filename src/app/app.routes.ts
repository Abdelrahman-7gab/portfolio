import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'experience',
    loadComponent: () =>
      import('./pages/experience/experience.component')
        .then(m => m.ExperienceComponent)
  },
  // ... other routes
];
