# abdelrahman-hegab.com

Angular 22, Bun, Node 24 (`nvm use`). Deployed on Cloudflare Pages from `dist/portfolio/browser`.

Install Bun on its own (`brew install oven-sh/bun/bun`) so it stays on your PATH after `nvm use` switches Node; a Bun installed as an npm global disappears with the Node version it was installed under. Every `bun run x` below also works as `npm run x`.

```bash
bun install
bun run start   # dev server on :4200
bun run build
bun run test
bun run cv      # build the CV PDFs (needs: brew install tectonic)
bun run check   # build + tests + knip (dead code)
```

- Page content and numbers: `src/app/content.ts`. Numbers come from Spare's Metabase via `cv/metrics.sql`.
- Styles: `src/styles/` is the Hegab design system (tokens + `hg-*` components); `src/styles.css` is the page layout.
- CV: LaTeX source in `cv/`; `bun run cv` writes `public/assets/abdelrahman-hegab-resume.pdf`, served at one stable URL (see `public/_headers`, `public/_redirects`).
