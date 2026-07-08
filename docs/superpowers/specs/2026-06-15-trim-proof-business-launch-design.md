# Trim Proof Business Launch Design

*Date: 2026-06-15*

## Purpose

Turn Trim Proof from a working product into a more credible business by tightening positioning, clarifying the buyer, improving the marketing site, and creating launch assets that support founder-led sales.

This spec focuses on the business launch layer, not a full rebuild. The current repo already includes a Next.js app, Supabase persistence, Stripe checkout, account gating, saved designs, analytics, SEO tool pages, and a marketing homepage.

## Current Product Truth

Trim Proof creates checked PDF/X proofs for supported starter products: business cards, flyers, posters, brochures, menus, postcards, and letterhead.

The product's durable technical claim is:

> AI creative upstream, deterministic prepress downstream.

That means image models can help with creative assets, while code controls vector text, embedded fonts, trim and bleed geometry, crop marks, CMYK-oriented output, ICC profiles, image DPI checks, PDF/X status, and preflight reporting.

## Recommended Approach

Use a focused "checked print handoff" positioning.

Rejected alternatives:
- Generic AI design suite: too crowded against Canva, Adobe Express, Design.com, and template marketplaces.
- Expert preflight replacement: too heavy and inaccurate for a self-serve launch; Acrobat, PitStop, callas, and FlightCheck already own expert workflows.
- Broad local-business design agency: dilutes the product and weakens the software business.

The chosen wedge is a bridge between creative generators and expert preflight tools: fast enough for non-specialists, concrete enough for print production conversations.

## Buyer Segments

Primary:
- Print shops that want faster first-pass proofs and fewer incomplete customer files.
- In-house marketers who need local print collateral without prepress expertise.
- Freelance designers who want safer handoffs for small print jobs.

Secondary:
- Restaurants, real estate teams, event teams, local service businesses, and creators with recurring print needs.

Anti-persona:
- Buyers who need arbitrary PDF repair, complex packaging workflows, legal proof approval, or guaranteed acceptance by every printer.

## Marketing Site Design

Homepage changes:
- Keep the existing visual hero and production-path framing.
- Add a buyer segment section for print shops, in-house marketers, and freelancers.
- Add a comparison section that explains the gap between generic AI design tools, traditional preflight tools, and Trim Proof.
- Add a launch-pilot section that turns the waitlist into a concrete early-access offer.
- Keep pricing, tool-library, FAQ, and email capture sections.

Content principles:
- Use concrete print terms: PDF/X, preflight, bleed, crop marks, vector text, CMYK-oriented output, and trim boxes.
- Do not claim guaranteed printer acceptance.
- Do not invent logos, testimonials, customer counts, or case studies.
- Keep "Trim Proof" as the public brand and treat "Press Forge" as internal or legacy naming.

## Product Marketing Assets

Create `.agents/product-marketing-context.md` as the reusable context for future marketing work.

It must capture:
- Product overview and category.
- ICP, personas, pain points, and switching dynamics.
- Competitive landscape and differentiation.
- Objections and responses.
- Customer language and brand voice.
- Proof-point boundaries.
- Business goals and conversion actions.

## Launch Blueprint

Create `docs/business/trim-proof-business-blueprint.md` with:
- Positioning and brand strategy.
- Product additions by priority.
- Marketing site plan.
- Marketing ideas.
- Marketing psychology.
- Sales enablement.
- Launch plan.
- Success metrics.
- Immediate build queue.

## Data Flow

Marketing homepage:
- Visitors see the product wedge, buyer segments, pricing, SEO tools, and launch offer.
- CTA clicks route to `/signup?intent=demo&next=/app`, `/signup?intent=single_export&next=/app%3Fmode%3Dadvanced`, or `/signup?intent=pro&next=/app%3Fmode%3Dadvanced`.
- Email capture posts to `/api/email-signup` with source and analytics attribution.

Signup:
- The account form captures company, role, monthly print jobs, primary use case, plan interest, and marketing consent.
- Supabase stores account context.
- Stripe handles paid export or Pro paths.

Analytics:
- Browser events and server-side GA4 events continue to track signup, checkout, purchase, lead generation, and proof export.
- No personally identifiable data should be sent to GA4 event params.

## Error Handling

Marketing email:
- Invalid payloads return 400.
- Supabase absence should not block a launch-list response.
- Email failures should be logged with provider context but not expose implementation details to users.
- Confirmation email must use the canonical Trim Proof brand and site origin.

Business docs:
- Claims that are not supported by the current product must be written as plans or goals, not proof.
- Pilot offers must be framed as early-access feedback programs, not established customer success.

## Testing

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run test`

Manual verification:
- Open the homepage at desktop and mobile widths.
- Confirm new sections do not overflow, overlap, or bury CTAs.
- Submit the email form in a safe test environment and confirm the API response.
- Confirm confirmation email copy says Trim Proof and links to the configured site origin.

## Scope Boundaries

In scope:
- Docs and marketing context.
- Homepage positioning and conversion sections.
- Brand consistency bug fix in launch-list email.

Out of scope for this spec:
- New Supabase schema.
- New Stripe products.
- Hostinger deployment.
- Full resource/checklist page.
- New use-case pages.
- Downloadable proof report.
- Free arbitrary PDF preflight uploader.

Those items belong in follow-on implementation plans.

## Spec Self-Review

- Placeholder scan: no TBD or TODO placeholders remain.
- Consistency check: public product name is Trim Proof throughout.
- Scope check: this is a focused business-launch slice, not the full roadmap.
- Ambiguity check: unsupported claims are stated as launch plans or future work, not present facts.
