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
    const contact = element.querySelector('.contact-section');

    expect(contact?.querySelector('a[href^="mailto:"]')).not.toBeNull();
    expect(contact?.querySelector('a[href="tel:+201129347201"]')).not.toBeNull();
  });

  it('collapses and expands the primary navigation', (done) => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('.nav-toggle');

    toggle?.click();
    fixture.detectChanges();

    const navigation = element.querySelector<HTMLElement>('.site-nav');
    expect(navigation?.classList.contains('is-collapsed')).toBeTrue();
    expect(element.querySelector('.nav-links')).toBeNull();
    expect(element.querySelector('.nav-drag-handle')).not.toBeNull();

    navigation?.style.setProperty('left', '100px');
    navigation?.style.setProperty('top', '120px');
    navigation?.style.setProperty('transform', 'none');

    toggle?.click();
    window.setTimeout(() => {
      fixture.detectChanges();

      expect(element.querySelector('.nav-links')).not.toBeNull();
      expect(navigation?.style.left).toBe('');
      expect(navigation?.style.top).toBe('');
      expect(navigation?.style.transform).toBe('');
      done();
    }, 400);
  });
});
