# Press Forge / Trim Proof Project Transfer Handoff

Last updated: 2026-06-16

This folder is the local source checkout for the customer-facing product **Trim Proof**. The repo name and folder still say **Press Forge**, but public product copy, docs, routes, emails, and marketing strategy now use Trim Proof.

## Quick Identity

- Local path: `/Users/georgemcpherson/Documents/Press Forge`
- Git remote: `https://github.com/georgemcp/press-forge.git`
- Current branch during handoff: `feature/dataforseo-live-research`
- Product domain: `https://trimproof.com`
- Internal/repo name: Press Forge
- Customer-facing brand: Trim Proof
- Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase, Stripe, Redis/BullMQ, OpenAI/Gemini image and brief providers, Vitest.

## What Trim Proof Does

Trim Proof turns plain-English print briefs into checked PDF/X-oriented proofs for common local print jobs:

- Flyers
- Posters
- Menus
- Brochures
- Business cards
- Postcards
- Letterhead

The strategic wedge is **AI creative upstream, deterministic prepress downstream**. AI can help generate creative direction and non-text assets, while code owns print geometry, vector text, embedded fonts, bleed, crop marks, CMYK-oriented output, ICC profile handling, raster DPI checks, PDF/X status, and preflight reporting.

## Move-To-New-Computer Checklist

1. Copy the entire folder or clone the GitHub repo after the final handoff commits are pushed.
2. Install Node.js 22.x or a compatible modern Node runtime.
3. From the project root, run `npm ci`.
4. Create `.env.local` from `.env.example`.
5. Transfer secret values securely from the old machine or provider dashboards. Do not paste secret values into git-tracked docs.
6. Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
7. Start local dev with `npm run dev -- --port 3015` or another free port.
8. Visit `http://localhost:3015`, `/app`, `/pilot-application`, `/sample-reports`, and `/admin/login`.
9. If production deploy access is needed, recreate the production `.env.production` on the VPS or hosting target from the provider dashboards.

## Credentials And Secret Handling

Actual credential values are intentionally **not committed** and should not be added to this document.

Local secret file:

- `.env.local` exists on the source machine and is ignored by git.
- `.env.example` is the committed variable-name template.
- If physically moving the whole folder, `.env.local` may travel with the folder; still treat it as a secret file.
- If cloning fresh on the new computer, recreate `.env.local` manually from `.env.example`.

Local Codex env registry:

- The broader Codex env registry is under `/Users/georgemcpherson/.codex/secrets/project-env`.
- That registry is outside this repo and will not be included by a normal project-folder copy unless explicitly migrated.

Never commit:

- `.env`
- `.env.local`
- `.env.production`
- provider API keys
- service-role keys
- admin passwords
- OAuth refresh tokens
- private keys
- raw provider secrets from dashboards

## Required Environment Variables

Public or build-time variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_GTM_CONTAINER_ID`

Server secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TRIMPROOF_ADMIN_PASSWORD`
- `TRIMPROOF_ADMIN_SESSION_SECRET`
- `TRIMPROOF_AUTH_SESSION_SECRET`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `RESEND_API_KEY` or `SENDGRID_API_KEY`
- `DATAFORSEO_LOGIN`
- `DATAFORSEO_PASSWORD`

Stripe and pricing:

- `STRIPE_EXPORT_PRICE_ID`
- `STRIPE_SUBSCRIPTION_PRICE_ID`
- `STRIPE_PORTAL_CONFIGURATION_ID`
- `TRIMPROOF_EXPORT_PRICE_CENTS`
- `TRIMPROOF_SUBSCRIPTION_PRICE_CENTS`
- `TRIMPROOF_PRO_MONTHLY_EXPORT_LIMIT`
- `TRIMPROOF_STRIPE_FEE_BPS`
- `TRIMPROOF_STRIPE_FIXED_FEE_CENTS`
- `TRIMPROOF_ESTIMATED_PROOF_COST_CENTS`

Email:

- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `EMAIL_REPLY_TO`
- `TRIMPROOF_EMAIL_FROM`
- `TRIMPROOF_EMAIL_FROM_NAME`
- `TRIMPROOF_EMAIL_REPLY_TO`
- `TRIMPROOF_ADMIN_EMAIL`
- `EMAIL_ADMIN_TO`
- `ADMIN_SUPPORT_EMAIL`
- `SUPPORT_EMAIL`
- `RESEND_FROM_EMAIL`
- `SENDGRID_FROM_EMAIL`
- `SENDGRID_FROM_NAME`

AI models:

- `OPENAI_BRIEF_MODEL`
- `OPENAI_CHAT_MODEL`
- `OPENAI_DESIGN_MODEL`
- `OPENAI_IMAGE_MODEL`
- `GEMINI_BRIEF_MODEL`
- `GEMINI_CHAT_MODEL`
- `GEMINI_DESIGN_MODEL`
- `GEMINI_IMAGE_MODEL`
- `TRIMPROOF_IMAGE_PROVIDER_MODE`

Prepress/runtime:

- `REDIS_URL`
- `TRIMPROOF_GENERATED_DIR`
- `TRIMPROOF_ASSET_DPI`
- `TRIMPROOF_MAX_ASSET_PIXELS`
- `PDFX_LEVEL`
- `DEFAULT_ICC_PROFILE`
- `CMYK_ICC_PROFILE_PATH`

Aliases accepted by current code:

- `GA4_MEASUREMENT_ID`
- `GA4_API_SECRET`
- `GA4_MEASUREMENT_PROTOCOL_API_SECRET`
- `GOOGLE_ANALYTICS_API_SECRET`
- `NEXTAUTH_SECRET`
- `ADMIN_DASHBOARD_EMAIL`
- `ADMIN_DASHBOARD_PASSWORD`
- `ADMIN_DASHBOARD_SESSION_SECRET`

## Provider Inventory

Production/deploy details already documented in `docs/deploy/trimproof-vps.md`:

- Domain: `trimproof.com`
- VPS: `srv1169050.hstgr.cloud`
- Public IP: `148.230.84.75`
- App directory: `/opt/trimproof`
- Local container port behind nginx: `3047`
- Supabase project ref: `justcsfgntvtbxprcnoh`
- Stripe export credit price: `price_1TfLrqRy14ye40TRZGwCYsyi`
- Stripe monthly subscription price: `price_1TfLrqRy14ye40TRwqtdoH7W`
- Stripe Customer Portal configuration: `bpc_1TelBzRy14ye40TRGJb4wixa`
- GA4 property: `properties/499598107`
- GA4 web stream: `15016978016`
- GA4 measurement ID: `G-20N2FZHDHV`
- SendGrid sender: `launch@trimproof.com`
- Reply-to: `support@trimproof.com`
- Admin/account email in docs: `george.mcpherson@baregetaways.com`

These IDs are not themselves enough to authenticate. Pull actual secret values from provider dashboards, the VPS env file, or the old machine's `.env.local`.

## Major App Surfaces

Public marketing:

- `/`
- `/about`
- `/pricing`
- `/privacy`
- `/tools`
- `/tools/[slug]`
- `/for-print-shops`
- `/for-marketers`
- `/for-designers`
- `/prepress-checklist`
- `/compare/canva-print-ready-pdf`
- `/sample-reports`
- `/pilot-application`

Account/product:

- `/signup`
- `/login`
- `/app`

Admin:

- `/admin/login`
- `/admin`
- `/admin/accounts/[email]`

Important API routes:

- `/api/auth/signup`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/designs`
- `/api/email-signup`
- `/api/pilot-application`
- `/api/upload`
- `/api/layout-spec`
- `/api/exports/proof`
- `/api/exports/proof/files/[...file]`
- `/api/billing/checkout`
- `/api/billing/session`
- `/api/billing/webhook`
- `/api/billing/portal`
- `/api/billing/access-link`
- `/api/health`

## What Is Done

Business/brand:

- Customer-facing brand standardized around Trim Proof.
- Product marketing context exists at `.agents/product-marketing-context.md`.
- Business blueprint exists at `docs/business/trim-proof-business-blueprint.md`.
- Claim evidence guard exists at `docs/business/claim-evidence-register.md` and `test/claim-safety.test.ts`.
- Sales kit, outreach playbook, target list, and first-touch batch exist in `docs/sales`.

Marketing site and SEO:

- Homepage has workflow, product screenshot, ICP sections, comparison framing, pricing, pilot CTA, tools library, FAQ, and launch-list capture.
- Public use-case pages are shipped for print shops, marketers, and designers.
- Prepress checklist lead magnet is shipped.
- Canva print-ready comparison page is shipped.
- Sample reports page is shipped with non-customer examples and claim boundaries.
- Pilot application page is shipped and feeds the admin pipeline.
- Sitemap includes public acquisition pages.
- DataForSEO keyword and SERP research docs/data are in `docs/seo` and `src/lib/seo`.

Product:

- Supported products include flyer, poster, menu, brochure, business card, postcard, and letterhead.
- Sample briefs exist for supported products and personas.
- Upload-first flows for customer PDFs/images are implemented.
- Client/job naming exists for saved designs.
- First-run proof-readiness checklist is in the app.
- Print workflow presets exist for SWOP, GRACoL, FOGRA, and digital/no-marks handoffs.
- Downloadable proof report/preflight report path is implemented.
- Demo/watermark behavior and paid export gating are covered by tests.

Admin/business operations:

- Admin center is protected by server-side session checks.
- Admin data loader surfaces signups, users, orders, management notes, pilot prospects, outreach events, evidence records, readiness, margin assumptions, and usage.
- Pilot prospect table and admin form are implemented.
- Pilot outreach event ledger and admin logging controls are implemented.
- Pilot evidence ledger and intake form are implemented.
- Public `/pilot-application` upserts structured leads into `pilot_prospects` and mirrors email into `email_signups`.

Billing/account:

- Stripe checkout paths exist for export credits and Pro subscriptions.
- Stripe webhook lifecycle handlers exist for checkout, refunds, subscription changes, invoice events, and access state.
- Customer portal flow exists.
- Account access-link flow exists.

Supabase:

- Migrations exist for initial schema, export orders, Stripe lifecycle IDs, admin management, onboarding/subscription usage, project type expansions, design asset storage, saved designs, saved design job metadata, pilot prospects, pilot outreach events, and pilot evidence records.
- RLS is enabled on newer pilot/evidence/admin tables according to migration tests.

Verification from this handoff pass:

- Secret-pattern scan across candidate committed files found no real-looking provider keys.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run test` passed.
- `npm run build` passed.

## What Is Not Done / Needs Follow-Up

Business proof:

- No public customer logos yet.
- No public testimonials yet.
- No claimed printer acceptance rate, time-saved metric, or customer count yet.
- Pilot learnings must be recorded in `pilot_evidence_records` and approved before public use.

Product roadmap:

- Adobe Express and Acrobat/PitStop comparison pages are still future work.
- Export history/proof report archive for Pro accounts is still future work.
- Shared proof links are still future work.
- Saved custom printer-spec presets are still future work.
- Role-based/multi-operator admin users are still future work.
- Exact AI provider cost ingestion should replace configured proof-cost assumptions.
- Invoice-level MRR history should persist Stripe invoice events more deeply.

Ops/deploy:

- Production secrets must be recreated or securely transferred on any new host.
- Verify production `/api/health` after env migration.
- Verify Stripe webhooks after any deploy target change.
- Verify Search Console and GA4 events after deployment.
- If moving to a different VPS/domain, update `NEXT_PUBLIC_APP_URL`, Stripe webhook URL, Supabase auth redirect URLs, Google/Search Console verification, SendGrid DNS, nginx, and TLS.

Security hardening:

- Do not expose `.env.local` in commits or support tickets.
- Treat `NEXT_PUBLIC_*` values as browser-visible.
- Add/verify production security headers at nginx/edge if not already handled there.
- Add rate limiting at the reverse proxy or app layer for auth, signup, upload, AI generation, and public lead endpoints before high-volume launch.
- Keep admin password and session secret strong and rotate them if the folder is copied through any untrusted channel.

## Key Commands

Local development:

```bash
npm ci
npm run dev -- --port 3015
```

Verification:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

SEO research refresh:

```bash
npm run seo:dataforseo-refresh
npm run seo:dataforseo-serp-refresh
```

Proof generation script:

```bash
npm run proof:pdf
```

Worker:

```bash
npm run worker
```

Supabase:

```bash
supabase db push --linked
supabase gen types typescript
```

Production deploy reference:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Important Files

Configuration:

- `.env.example`
- `.gitignore`
- `package.json`
- `next.config.ts`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `Dockerfile`
- `deploy/nginx.trimproof.conf`
- `supabase/config.toml`

Core app:

- `src/components/press-forge-workspace.tsx`
- `src/components/marketing-site.tsx`
- `src/app/app/page.tsx`
- `src/app/page.tsx`
- `src/app/api/exports/proof/route.ts`
- `src/app/api/billing/webhook/route.ts`
- `src/app/api/pilot-application/route.ts`

Business docs:

- `.agents/product-marketing-context.md`
- `docs/business/trim-proof-business-blueprint.md`
- `docs/business/claim-evidence-register.md`
- `docs/sales/trim-proof-pilot-sales-kit.md`
- `docs/sales/trim-proof-pilot-outreach-playbook.md`
- `docs/deploy/trimproof-vps.md`
- `docs/admin/setup.md`
- `docs/analytics/setup.md`

Tests:

- `test/claim-safety.test.ts`
- `test/pilot-application.test.ts`
- `test/pilot-prospects.test.ts`
- `test/pilot-outreach.test.ts`
- `test/pilot-evidence-records.test.ts`
- `test/acquisition-pages.test.ts`
- `test/seo-sitemap.test.ts`
- `test/proof-export-route.test.ts`
- `test/upload-route.test.ts`

## Transfer Notes

- `node_modules`, `.next`, `.trimproof-generated`, `artifacts`, and `*.tsbuildinfo` are ignored local artifacts and are not required in git.
- `public/images/product/trim-proof-workspace-app.png` is the committed public product screenshot used by marketing pages.
- `public/google43b9c98a02f6c033.html` and `public/f64c051c1bf42b8295e5ab034ca543b5.txt` are public verification files; keep them if the domain/property still depends on them.
- If copying the folder directly instead of cloning, consider excluding `node_modules` and `.next` to save space, then run `npm ci` and `npm run build` on the new computer.
- Keep `.env.local` only if the new computer is trusted and the transfer channel is secure.
