# CAN Simulator Docs

Next.js 16 + Nextra 4 documentation site for the CAN Simulator project — an interactive reference for the CAN bus protocol (ISO 11898).

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server (Turbopack, default in Next 16)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint check |

## Project Structure

```
docs-site/
├── app/
│   ├── layout.tsx          Root layout (metadata, fonts, Nextra theme)
│   ├── page.mdx            Landing page (/)
│   ├── sitemap.ts          Dynamic XML sitemap
│   ├── robots.ts           robots.txt
│   └── docs/
│       ├── _meta.json      Sidebar navigation order
│       ├── page.mdx        Docs index (/docs)
│       ├── introduction/   What CAN is, history, stack overview
│       ├── physical-layer/ CANH/CANL, termination, topology
│       ├── frame-format/   Standard + extended data frame anatomy
│       ├── arbitration/    (Phase 2 stub)
│       ├── bit-timing/     (Phase 2 stub)
│       ├── error-handling/ (Phase 2 stub)
│       ├── higher-layers/  (Phase 2 stub)
│       └── faq/            (Phase 2 stub)
├── components/
│   ├── ArticleSchema.tsx   JSON-LD TechArticle + BreadcrumbList
│   └── FrameAnatomy.tsx    Interactive CAN frame field explorer
├── lib/
│   ├── site.ts             Site URL, name, description constants
│   └── utils.ts            cn() helper (clsx + tailwind-merge)
├── next.config.ts          Nextra plugin
├── postcss.config.mjs      Tailwind v4 PostCSS
├── tsconfig.json
└── .env.example            Environment variable template
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO (sitemap, JSON-LD, OG tags) | `http://localhost:3000` |
| `NEXT_PUBLIC_SIMULATOR_URL` | URL of the live CAN simulator app (used in CTAs) | `http://localhost:5173` |

Set these in `.env.local` for local development. On Vercel, add them via `vercel env add` or the dashboard.

## Deployment

This is designed to run as a **separate Vercel project** from the CAN Simulator app.

1. Link the project: `vercel link` (root directory = `docs-site`)
2. Set env vars: `vercel env add NEXT_PUBLIC_SITE_URL production`
3. Deploy: `vercel --prod`

## Phase Roadmap

- **Phase 1 (current)**: Introduction, Physical Layer, Frame Format + FrameAnatomy widget + SEO wiring
- **Phase 2**: Arbitration (+ ArbitrationMini widget), Bit Timing (+ calculator), Error Handling
- **Phase 3**: Higher-Layer Protocols, FAQ (+ FAQPage schema), OG image generation

## Tech Stack

- Next.js 16.1.4 (App Router, Turbopack)
- Nextra 4.6.1 + nextra-theme-docs
- React 19
- Tailwind CSS v4
- TypeScript (strict)
