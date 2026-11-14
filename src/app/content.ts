// Everything the page says. Numbers: Spare's Metabase, see cv/metrics.sql.

/** My commits across Spare's repositories (see COMMITS). Shown on the receipt and in the Commits chapter. */
const MY_COMMITS = '1,377';

export const LINKS = {
  email: 'me@abdelrahman-hegab.com',
  phone: '+201129347201',
  phoneLabel: '(+20) 112 934 7201',
  linkedin: 'https://www.linkedin.com/in/abdelrahman-hegab-4779aa1a6/',
  github: 'https://github.com/Abdelrahman-7gab',
  resume: '/assets/abdelrahman-hegab-resume.pdf',
};

export const CHAPTERS = [
  { id: 'hello', name: 'Hello' },
  { id: 'numbers', name: 'Receipt' },
  { id: 'commits', name: 'Commits' },
  { id: 'payments', name: 'Payments' },
  { id: 'tracing', name: 'Tracing' },
  { id: 'career', name: 'Career' },
  { id: 'contact', name: 'Contact' },
];

/** The numbers chapter is a thermal receipt. Rounded from cv/metrics.sql (data through 12 Nov 2026). */
export const RECEIPT = {
  lines: [
    { label: 'Transactions', value: '11.4M' },
    { label: 'Sales', value: '9.9M', sub: true },
    { label: 'Card top-ups', value: '1.19M', sub: true },
    { label: 'Cash top-ups', value: '227K', sub: true },
    { label: 'Returns', value: '101K', sub: true },
    { label: 'People paying', value: '92K' },
    { label: 'Merchants', value: '254' },
    { label: 'Devices printing this', value: '1,700+' },
    { label: 'My commits', value: MY_COMMITS },
  ],
  through: 'Data through 12 Nov 2026',
};

/** My commits in Spare's repositories, grouped by the scope in each conventional-commit message.
 *  From `git log --all --author=hegab --no-merges` across 13 repos, 13 Nov 2026: 1,377 commits, 718 features. */
export const COMMITS = {
  total: MY_COMMITS,
  repos: 13,
  areas: [
    { name: 'Bundles, menus and stock', n: 223 },
    { name: 'Payments and refunds', n: 183 },
    { name: 'Receipt printing', n: 108 },
    { name: 'Financial reporting', n: 104 },
    { name: 'Observability', n: 86 },
    { name: 'Accessibility', n: 35 },
    { name: 'Infrastructure and data', n: 25 },
    { name: 'Everything else', n: 613, rest: true }, // 1,377 minus the scopes above
  ],
};

export const PAYMENTS = [
  {
    title: 'Direct payments and refunds',
    detail: 'Ledger updates, validation and admin tooling',
    value: '101K+ returns',
  },
  {
    title: 'Payment gateway integrations',
    detail: 'Card top-ups across several gateways',
    value: '1.19M top-ups',
  },
  { title: 'Partner Redirect', detail: 'Third-party apps hand their checkout to Spare', value: '' },
  {
    title: 'Cash- and accrual-basis reports',
    detail: 'Sales, returns, VAT and discounts, checked against dashboard totals',
    value: '',
  },
];

/** An illustrative trace of one refund request (made-up timings and generic names, not production data). */
export const TRACE = [
  {
    name: 'POST /refunds',
    service: 'api',
    start: 0,
    dur: 412,
    depth: 0,
    attrs: 'http.method=POST · http.status_code=200',
  },
  {
    name: 'auth.verify',
    service: 'api',
    start: 4,
    dur: 10,
    depth: 1,
    attrs: 'enduser.role=parent',
  },
  {
    name: 'refund.validate',
    service: 'api',
    start: 16,
    dur: 312,
    depth: 1,
    attrs: 'refund.window_days=14',
  },
  {
    name: 'SELECT bills',
    service: 'mysql',
    start: 42,
    dur: 280,
    depth: 2,
    slow: true,
    attrs: 'db.statement=SELECT * FROM bills WHERE user_id = ? · rows_examined=1.2M',
  },
  {
    name: 'GET balance',
    service: 'redis',
    start: 324,
    dur: 3,
    depth: 2,
    attrs: 'db.operation=GET · cache.hit=true',
  },
  {
    name: 'gateway.refund',
    service: 'http',
    start: 330,
    dur: 64,
    depth: 1,
    attrs: 'peer.service=card-gateway · http.status_code=200',
  },
  {
    name: 'INSERT ledger_entry',
    service: 'mysql',
    start: 396,
    dur: 14,
    depth: 1,
    attrs: 'db.operation=INSERT · rows_affected=2',
  },
];

export const STACK = [
  'TypeScript',
  'Angular',
  'Ionic',
  'React',
  'Node.js',
  'MySQL',
  'PostgreSQL',
  'Redis',
  'OpenTelemetry',
  'Electron',
];

/** Career as spans. Months are 1-12; no end means it is happening now. Each point has the area it belongs to. */
export const SPANS = [
  {
    name: 'Spare Payments',
    logo: 'spare',
    role: 'Full-stack software engineer',
    from: [2024, 3] as const,
    to: null,
    points: [
      {
        area: 'Payments',
        text: 'Payment, refund and gateway flows, plus Partner Redirect for third-party apps.',
      },
      {
        area: 'Reporting',
        text: 'Cash- and accrual-basis financial reports with reconciliation checks.',
      },
      {
        area: 'Observability',
        text: 'OpenTelemetry tracing and structured logging across core services.',
      },
      {
        area: 'Printing',
        text: 'Receipt printing across web and Electron for 1,700+ merchant devices.',
      },
      {
        area: 'Bundles',
        text: 'A new bundle builder, end to end: schema, API, admin builder and the app’s picker, with proration, selling periods and order-ahead cut-offs. Rolling out now.',
      },
    ],
  },
  {
    name: 'Alfan',
    logo: 'alfan',
    role: 'Frontend engineer · UAE, remote',
    from: [2023, 1] as const,
    to: [2024, 4] as const,
    points: [
      {
        area: 'Product UI',
        text: 'Responsive React interfaces for a creator monetization platform.',
      },
      {
        area: 'Dashboard',
        text: 'An earnings dashboard that brought creators’ income from every platform into one view.',
      },
      { area: 'Growth', text: 'Started as an intern, went full-time after six months.' },
    ],
  },
  {
    name: 'TensorGraph.io',
    logo: 'tensorgraph',
    role: 'Software engineer · part-time',
    from: [2021, 8] as const,
    to: [2023, 1] as const,
    points: [
      {
        area: 'APIs',
        text: 'Node.js and PostgreSQL APIs for recommendation and analytics workflows.',
      },
      { area: 'Chat UI', text: 'The chat interface between users and the recommendation bot.' },
      {
        area: 'ML in product',
        text: 'TensorFlow recommendations wired into product features, requirements to deployment.',
      },
    ],
  },
];

/** Education sits under the career trace, not on it: the trace is work only. */
export const EDUCATION = {
  school: 'German University in Cairo',
  degree: 'B.E. Computer Science and Engineering',
  years: '2018 — 2023',
};

/** Chapter headings: kicker, headline (with its muted second half) and intro. The career headline is preceded by
 *  the computed number of years, and its kicker by the computed start year (app.ts). */
export const COPY = {
  hello: {
    kicker: 'Full-stack software engineer',
    lead: 'Payments, refunds, POS apps, observability and more. I build what happens after a student taps a Spare wristband to pay.',
  },
  numbers: {
    kicker: 'Spare Payments · since March\u00a02024', // no lone "2024" on its own line
    title: 'What I’ve worked on,',
    mute: 'in numbers',
    lead: `I helped build the payment system that has handled ${RECEIPT.lines[0].value} transactions since I joined. These are Spare’s own numbers.`,
  },
  commits: {
    kicker: 'git log --author=me',
    title: `${COMMITS.total} commits,`,
    mute: 'by area',
    lead: `Across ${COMMITS.repos} of Spare’s repositories, grouped by the scope in each commit message.`,
  },
  payments: {
    kicker: 'Payments',
    title: 'Payments',
    mute: 'and refunds',
    lead: 'I built direct payments and refunds, wired in the card gateways, and wrote the reports that finance checks against the dashboard.',
  },
  tracing: {
    kicker: 'Observability · OpenTelemetry',
    title: 'Tracing',
    mute: 'slow requests',
    lead: 'I added OpenTelemetry tracing and structured logs to Spare’s core services, so every slow request shows exactly which call made it slow.',
    hint: 'hover, tap or focus a span to see its attributes',
  },
  career: {
    kicker: 'Career',
    title: 'years',
    mute: 'of work',
    lead: 'Two startups, then full-stack at Spare. Open a role to see what I did there.',
  },
  contact: { kicker: 'Contact', title: 'Get in touch' },
};
