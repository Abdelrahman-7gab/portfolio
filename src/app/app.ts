import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  CHAPTERS,
  COMMITS,
  COPY,
  EDUCATION,
  LINKS,
  PAYMENTS,
  RECEIPT,
  SPANS,
  STACK,
  TRACE,
} from './content';
import type { Stage } from './stage-3d';
import { NOW, duration, monthYear, months, year } from './time';

const FIRST = SPANS[SPANS.length - 1].from; // the earliest span starts the career trace
const WORDS = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];
const STILL =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Decided before first paint, so the hero's two-column layout never reflows when the 3D scene arrives later.
const CAN_3D = !STILL && typeof window !== 'undefined' && 'WebGL2RenderingContext' in window;

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  host: {
    '(document:keydown)': 'onKey($event)',
    '[class.has-3d]': 'has3d()',
    '[class.stage-ready]': 'stageReady()',
  },
})
export class App {
  protected readonly links = LINKS;
  protected readonly education = EDUCATION;
  protected readonly copy = COPY;
  protected readonly chapters = CHAPTERS;
  protected readonly payments = PAYMENTS;
  protected readonly stack = STACK;
  protected readonly receipt = RECEIPT;
  protected readonly receiptLabel = `Receipt since March 2024: ${RECEIPT.lines.map((l) => `${l.label} ${l.value}`).join(', ')}. ${RECEIPT.through}.`;
  protected readonly commits = COMMITS;
  protected readonly commitMax = Math.max(...COMMITS.areas.filter((a) => !a.rest).map((a) => a.n));
  protected readonly nameFirst = [...'Abdelrahman'];
  protected readonly nameLast = [...'Hegab'];
  protected readonly year = NOW[0];
  protected readonly careerStart = FIRST[0];
  private readonly yearsWorked = Math.floor(months(FIRST, NOW) / 12);
  protected readonly careerYears = WORDS[this.yearsWorked] ?? this.yearsWorked;

  // The trace's x-axis runs from just before the first span to just after today.
  protected readonly start = Math.floor(year(FIRST) - 0.3);
  protected readonly end = year(NOW) + 0.3;
  protected readonly ticks = Array.from(
    { length: NOW[0] - Math.ceil(this.start) + 1 },
    (_, i) => Math.ceil(this.start) + i,
  );
  protected readonly spans = SPANS.map((s) => ({
    ...s,
    live: !s.to,
    a: year(s.from),
    b: year(s.to ?? NOW),
    dur: duration(months(s.from, s.to ?? NOW)),
    // What a screen reader says for the role button: dates in words instead of bar positions and "2Y 9M".
    label: `${s.name}, ${s.role}, ${monthYear(s.from)} to ${s.to ? monthYear(s.to) : 'now'}`,
  }));

  protected readonly current = signal(0);
  protected readonly built = signal(new Set<string>(['hello']));
  protected readonly picked = signal(-1); // career accordion: all roles start collapsed
  protected readonly copied = signal<string | null>(null);
  private readonly email = viewChild<ElementRef<HTMLElement>>('email');
  protected readonly theme = signal<'dark' | 'light'>('dark');
  protected readonly has3d = signal(CAN_3D);
  protected readonly stageReady = signal(false);
  private readonly stageHost = viewChild<ElementRef<HTMLElement>>('stage');
  private stage?: Stage;

  // Trace waterfall: a cursor sweeps through time and each span draws in as it is reached.
  protected readonly traceScale = TRACE[0].dur;
  protected readonly traceTicks = [0, 100, 200, 300, 400];
  protected readonly cursor = signal(0);
  protected readonly sweeping = signal(false);
  protected readonly hovered = signal(3);
  protected readonly trace = computed(() =>
    TRACE.map((s) => {
      const shown = Math.max(0, Math.min(s.dur, this.cursor() - s.start));
      return {
        ...s,
        left: (s.start / this.traceScale) * 100,
        width: (shown / this.traceScale) * 100,
        on: this.cursor() >= s.start,
      };
    }),
  );
  protected readonly progress = computed(() => ((this.current() + 1) / CHAPTERS.length) * 100);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly still = STILL;

  constructor() {
    const destroy = inject(DestroyRef);
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') this.theme.set(saved);
    } catch {}
    // The one place the theme reaches the page and the 3D scene. It is stored only when the visitor toggles it.
    effect(() => {
      const theme = this.theme();
      document.documentElement.dataset['theme'] = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#050608' : '#F5F6F7');
      this.stage?.setTheme(theme);
    });

    afterNextRender(() => {
      const sections = [...this.host.querySelectorAll<HTMLElement>('[data-chapter]')];
      // A chapter is current while it crosses the middle of the screen; it builds once it is a quarter visible.
      const middle = new IntersectionObserver(
        (entries) =>
          entries.forEach(
            // Read the section under the middle line directly: after a big jump the entries can arrive in any order.
            () => {
              const i = sections.findIndex((s) => {
                const r = s.getBoundingClientRect();
                return r.top <= innerHeight / 2 && r.bottom > innerHeight / 2;
              });
              if (i >= 0) this.current.set(i);
            },
          ),
        { rootMargin: '-50% 0px -50% 0px' },
      );
      const reveal = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting && this.build(e.target.id)),
        {
          threshold: 0.1,
        },
      );
      sections.forEach((s) => (middle.observe(s), reveal.observe(s)));
      destroy.onDestroy(() => (middle.disconnect(), reveal.disconnect(), this.stage?.dispose()));
      // The 3D scene is heavy to set up; start it once the page has settled.
      if ('requestIdleCallback' in window)
        requestIdleCallback(() => this.mountStage(), { timeout: 1500 });
      else setTimeout(() => this.mountStage(), 300);
    });
  }

  private build(id: string) {
    if (this.built().has(id)) return;
    this.built.update((s) => new Set(s).add(id));
    if (id === 'tracing') this.replayTrace();
  }

  protected replayTrace() {
    if (this.still) return this.cursor.set(this.traceScale);
    // Linear sweep: the cursor is time, so every bar grows at the same rate. Bars skip their CSS transition meanwhile.
    this.sweeping.set(true);
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1800);
      this.cursor.set(p * this.traceScale);
      if (p < 1) requestAnimationFrame(step);
      else this.sweeping.set(false);
    };
    requestAnimationFrame(step);
  }

  /** Loads the 3D terminal. Without WebGL, or with reduced motion, the CSS versions stay. */
  private async mountStage() {
    const host = this.stageHost()?.nativeElement;
    if (!host || !CAN_3D) return;
    try {
      const { mountStage } = await import('./stage-3d');
      this.stage = await mountStage(host, RECEIPT);
      this.stageReady.set(true); // until now the page's own receipt stays visible in place of the 3D one
      this.stage.setTheme(this.theme());
    } catch {
      this.has3d.set(false); // WebGL failed after all: fall back to the CSS receipt and the one-column hero
    }
  }

  // The hero name swells toward the cursor (Mona Sans weight and width axes). Letter centres are measured
  // once when the pointer enters, so the swelling itself never moves the targets it is measured against.
  // They are kept in page coordinates, so scrolling while hovering does not throw them off.
  // On touch: a finger dragged along the name swells it the same way, and a tap sends a wave out from the finger.
  private letters: { el: HTMLElement; x: number; y: number; p: string }[] = [];
  private lensFrame = 0;
  private touch = { x: 0, y: 0, t: 0 };
  /** Sets one letter's swell (0-1), touching the style only when the rounded value changes. */
  private swell(l: (typeof this.letters)[number], p: number) {
    const v = p.toFixed(2);
    if (v !== l.p) l.el.style.setProperty('--p', (l.p = v));
  }
  private measure(name: HTMLElement) {
    this.letters = [...name.querySelectorAll<HTMLElement>('.ch')].map((el) => {
      const r = el.getBoundingClientRect();
      return { el, x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY, p: '0' };
    });
  }
  protected lensEnter(e: PointerEvent) {
    if (this.still || e.pointerType !== 'mouse') return;
    this.measure(e.currentTarget as HTMLElement);
  }
  protected lensLeave(e: PointerEvent) {
    if (e.pointerType === 'mouse') this.lensOff(); // a finger also "leaves" when it lifts; that must not cut a wave short
  }
  protected touchDown(e: PointerEvent) {
    if (this.still || e.pointerType === 'mouse') return;
    this.measure(e.currentTarget as HTMLElement);
    this.touch = { x: e.pageX, y: e.pageY, t: e.timeStamp };
    this.lens(e);
  }
  protected touchUp(e: PointerEvent) {
    if (e.pointerType === 'mouse' || !this.letters.length) return;
    const tap =
      e.timeStamp - this.touch.t < 350 &&
      Math.hypot(e.pageX - this.touch.x, e.pageY - this.touch.y) < 12;
    if (tap) this.wave(e.pageX);
    else this.lensOff();
  }
  /** A swell that travels out from x through the letters, then settles. */
  private wave(x: number) {
    cancelAnimationFrame(this.lensFrame);
    const t0 = performance.now();
    const step = (now: number) => {
      let moving = false;
      for (const l of this.letters) {
        const k = (now - t0 - Math.abs(l.x - x) * 1.4) / 460; // the further the letter, the later it swells
        if (k < 1) moving = true;
        this.swell(l, k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0);
      }
      if (moving) this.lensFrame = requestAnimationFrame(step);
      else this.letters = [];
    };
    this.lensFrame = requestAnimationFrame(step);
  }
  protected lens(e: PointerEvent) {
    if (!this.letters.length) return;
    cancelAnimationFrame(this.lensFrame);
    this.lensFrame = requestAnimationFrame(() => {
      for (const l of this.letters) {
        this.swell(l, Math.max(0, 1 - Math.hypot(e.pageX - l.x, (e.pageY - l.y) * 1.6) / 190));
      }
    });
  }
  protected lensOff() {
    cancelAnimationFrame(this.lensFrame);
    this.letters.forEach((l) => this.swell(l, 0));
    this.letters = [];
  }

  protected reprint() {
    this.stage?.reprint();
  }

  protected go(i: number) {
    const target = Math.max(0, Math.min(CHAPTERS.length - 1, i));
    const el = document.getElementById(CHAPTERS[target].id);
    el?.scrollIntoView({ behavior: this.still ? 'auto' : 'smooth' });
    el?.focus({ preventScroll: true }); // the next Tab continues inside the chapter
  }

  /** Opens one role (closing the others). If the closing panel above pulls this role out of view, bring it back. */
  protected pick(i: number, e: Event) {
    this.picked.set(this.picked() === i ? -1 : i);
    const button = e.currentTarget as HTMLElement;
    setTimeout(
      () => button.scrollIntoView({ block: 'nearest', behavior: this.still ? 'auto' : 'smooth' }),
      this.still ? 0 : 380,
    );
  }

  protected onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      // Keys belong to whatever has focus: no chapter steps or theme toggle from a link, button or field.
      target.closest?.('a, button, input, textarea, select, [contenteditable]')
    )
      return;
    // Only j/k and left/right step chapters. Up/down, page keys and Space keep scrolling normally, so tall chapters stay reachable.
    const next = ['ArrowRight', 'j'].includes(e.key);
    const prev = ['ArrowLeft', 'k'].includes(e.key);
    if (e.key === 't') return this.toggleTheme();
    if (!next && !prev) return;
    e.preventDefault();
    this.go(this.current() + (next ? 1 : -1));
  }

  protected toggleTheme() {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
    try {
      localStorage.setItem('theme', this.theme());
    } catch {}
  }

  protected async copyEmail() {
    try {
      await navigator.clipboard.writeText(LINKS.email);
      this.copied.set('Copied');
    } catch {
      // Clipboard blocked: select the address so the visitor can copy it themselves.
      const el = this.email()?.nativeElement;
      if (el) getSelection()?.selectAllChildren(el);
      this.copied.set('Selected, copy it yourself');
    }
    setTimeout(() => this.copied.set(null), 2400);
  }
}
