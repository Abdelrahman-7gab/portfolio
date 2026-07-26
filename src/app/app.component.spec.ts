import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AnimationService } from './services/animation.service';
import { CursorService } from './services/cursor.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: AnimationService,
          useValue: jasmine.createSpyObj<AnimationService>('AnimationService', [
            'initializeHeroAnimations',
            'initializeLetterAnimations',
            'initializeScrollAnimations',
            'initializeExperienceEffect',
            'initializeMatrixEffect',
            'destroy'
          ])
        },
        {
          provide: CursorService,
          useValue: jasmine.createSpyObj<CursorService>('CursorService', [
            'initialize',
            'handleMouseMove',
            'destroy'
          ])
        }
      ]
    }).compileComponents();
  });

  it('renders the portfolio identity and featured work', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Abdelrahman Hegab');
    expect(element.querySelector('.projects-section h2')?.textContent).toContain(
      'Featured Projects'
    );
  });

  it('exposes working email and phone links', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.contact-item[href^="mailto:"]')).not.toBeNull();
    expect(element.querySelector('.contact-item[href="tel:+201129347201"]')).not.toBeNull();
  });
});
