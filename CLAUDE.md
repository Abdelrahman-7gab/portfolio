# abdelrahman-hegab.com

Personal portfolio: one Angular 22 page told in chapters (Hello, Receipt, Commits, Payments, Tracing, Career, Contact), plus the CV's LaTeX source. Deployed on Cloudflare Pages from `dist/portfolio/browser`.

## Commands

Node 24 (`nvm use`). Bun is the package manager; every `bun run x` also works as `npm run x` (use npm if `bun` is not on PATH after `nvm use`).

- `bun run start`: dev server on :4200 (`NG_CLI_ANALYTICS=false` skips Angular's analytics prompt)
- `bun run check`: build + tests + knip (dead code / unused deps). Run before calling work done.
- `bun run test`: Vitest, `src/**/*.spec.ts`
- `bun run format`: Prettier over `src`
- `bun run cv`: builds `cv/build/{resume,cv}.pdf` with Tectonic and copies the résumé to `public/assets/abdelrahman-hegab-resume.pdf`

## Where things live

- `src/app/content.ts`: every word and number on the page. Change copy here, not in the template.
- `src/app/app.html` / `app.ts`: the single page component (chapters, observers, keyboard stepping, theme, name lens, trace sweep).
- `src/app/stage-3d.ts`: lazy-loaded Three.js scene (a generic handheld card terminal). One fixed full-screen canvas behind the page that follows `[data-anchor]` boxes in the layout (`hello`, `receipt`, `payments`; a box the layout hides with `display: none` is skipped, so CSS decides which boxes exist per layout). Wide screens glide between the hero and the receipt close-up on a fixed canvas; payments (and everything on phones, ≤900px) is glued to its box and changes box only off screen. On phones the canvas is docked: laid over that box as part of the page, so touch scrolling moves the terminal with the text, and its height ignores the address bar. Phones print a sideways strip from the terminal on its side. The loop stops when parked off-screen.
- Big screens: `styles.css` scales the header, `main` and footer by `--zoom` (stepped media queries, from 1800px wide and 940px tall). Zoom scales viewport units too, so full-screen heights divide by `--zoom`. The 3D canvas is not zoomed; it follows the boxes' on-screen rects.
- `src/app/time.ts`: year/month helpers for the career trace (tested in `app.spec.ts`).
- `src/styles/tokens.css`, `src/styles/components.css`: copy of the Hegab design system (tokens + `hg-*` components). `src/styles.css`: page layout only.
- `cv/`: LaTeX CV (Awesome-CV). `cv/metrics.sql`: the Metabase queries behind the numbers.
- `public/_headers`, `public/_redirects`: Cloudflare Pages caching (the résumé keeps one URL, no-cache) and old résumé links.

## Rules

- Numbers must be real and sourced. Platform numbers come from Spare's Metabase (`cv/metrics.sql`); commit counts from `git log --all -i --author=hegab --no-merges` across the Spare repos. Never invent or round up past the source.
- Keep the résumé (`cv/resume/*.tex`), the site (`content.ts`) and LinkedIn saying the same numbers.
- Style with tokens (`var(--space-*)`, `--radius-*`, `--dur-*`, `--ease-*`, colours). New reusable UI goes in `components.css` as an `hg-*` class; `styles.css` is for page layout, not for overriding components.
- `--signal` (amber) means live / in production only. No emoji, no exclamation marks, first person, short sentences.
- Staggered animations use a `--i` index custom property (`[style.--i]="i"`), not `:nth-child` ladders.
- Everything must work with `prefers-reduced-motion` (no 3D, no loops) and without WebGL (the CSS receipt is the fallback).
- Check desktop (1440×900, 1280×720) and phone (375×812) in both themes; no horizontal scroll.

## Gotchas

- The dev server hot-swaps the template on edit; IntersectionObservers then watch detached nodes and chapters look blank. Reload the page after template edits.
- In the browser pane, the first screenshot after a jump can be stale; check the DOM, or take a second one.
- The macOS Desktop folder blocks the app's preview runner; start the dev server from a terminal instead.
