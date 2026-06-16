# Trim Proof Business Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Press Forge into a launchable Trim Proof business by tightening the brand, shipping a buyer-aware marketing site, documenting the product-market thesis, and creating the next build queue for pilots, sales, launch, and proof collection.

**Architecture:** Keep the deterministic print-export app as the core product, use the homepage and SEO pages for acquisition, use email signup and Stripe checkout for conversion, and store business strategy docs beside the code so product, marketing, and engineering can move together.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind v4 CSS variables, Supabase, Stripe, server analytics, email signup API, static business docs.

---

## Current Slice

- [x] Brand the public launch list as Trim Proof instead of Press Forge in `src/app/api/email-signup/route.ts`.
- [x] Generate signup links from `getSiteOrigin()` instead of a hardcoded legacy domain.
- [x] Align public site metadata, checkout branding, account-gate copy, workspace heading, proof export metadata, and sample proof contact copy around Trim Proof.
- [x] Add a lightweight SVG favicon at `public/icon.svg` and wire it through Next metadata.
- [x] Add buyer-segment messaging to `src/components/marketing-site.tsx` for print shops, in-house marketers, and freelance designers.
- [x] Add a comparison section that positions Trim Proof against generic AI design tools and traditional preflight software.
- [x] Add a print-shop pilot section with a dedicated email-capture source.
- [x] Avoid duplicate homepage form IDs by making `EmailCapture` accept distinct `id`, `source`, and `buttonLabel` props.
- [x] Extract shared `EmailCaptureForm` so homepage, buyer pages, and checklist signups use the same route and analytics pattern.
- [x] Add `/for-print-shops`, `/for-marketers`, and `/for-designers` acquisition pages.
- [x] Add `/prepress-checklist` as a visible checklist lead magnet with email capture.
- [x] Add public acquisition pages to the sitemap.
- [x] Add acquisition-page tests for persona pages, checklist content, homepage links, and sitemap coverage.
- [x] Add a sample-brief gallery inside the app covering every supported product.
- [x] Add a first-run proof-readiness checklist inside the app brief panel.
- [x] Track sample-brief selection with a dedicated analytics event.
- [x] Make the saved-designs list fail open to an empty first-run state when the optional Supabase table is missing locally.
- [x] Create `.agents/product-marketing-context.md` as the reusable product marketing source of truth.
- [x] Create `docs/business/trim-proof-business-blueprint.md` with positioning, launch plan, sales enablement, growth ideas, and metrics.
- [x] Create `docs/sales/trim-proof-pilot-sales-kit.md` with pilot one-pager, discovery script, objection handling, and follow-up sequence.
- [x] Create `docs/superpowers/specs/2026-06-15-trim-proof-business-launch-design.md` with the implementation rationale.
- [x] Add a readable preflight report export with HTML, text, and JSON artifacts for every generated proof.
- [x] Align generated proof artifact filenames, delivery allowlist, and manifest checks around `trimproof-<product>`.
- [x] Add a factual `/compare/canva-print-ready-pdf` page with official Canva source notes and unsupported-claim boundaries.
- [x] Add a real current-workspace product screenshot to the homepage and remove exposed legacy Press Forge naming from default demo surfaces.
- [x] Add client and job naming to saved designs so print shops can separate customer work.
- [x] Add upload-first intake for customer PDFs and images, with source-file brief seeding and safer upload validation.
- [x] Add print workflow presets for common shop requirements with trim, bleed, safe-area, crop-mark, PDF/X, and color workflow notes.
- [x] Add a project design context file so future frontend polish stays anchored to Trim Proof's audience, proof-first product surface, and honest brand boundaries.
- [x] Strengthen the claim evidence register with source-of-truth paths, validation steps, safe replacement copy, pilot evidence fields, and an automated unsupported-claim guard test.
- [x] Add a Supabase-backed pilot prospect tracker so founder-sourced Week 2 targets can enter the admin pipeline before they sign up.
- [x] Create and seed a 25-account public-source Tampa Bay / St. Petersburg target list for the Week 2 pilot push.
- [x] Add a segment-aware first-touch batch generator in the admin pipeline and stage the Day 2 top-ten outreach batch without sending or overclaiming.
- [x] Run `npm run lint`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run test`.
- [x] Run `npm run build`.
- [x] Start the local Next.js server and inspect the homepage at desktop and mobile widths.

## Next Product Builds

- [x] Add a "preflight report" export that gives users a shareable pass/fail summary before they download a production PDF.
- [x] Add team/workspace naming around saved designs so a print shop can separate client jobs.
- [x] Add upload-first flows for existing PDFs and images, not only prompt-first creation.
- [x] Add print-profile presets for common shop requirements, including bleed, trim size, margin, and color workflow notes.
- [x] Add a first-run checklist inside the app that guides users from brief to proof to export.
- [x] Add a lightweight pilot CRM table or admin view for signup source, company type, use case, and follow-up status.
- [x] Add a Supabase-backed target-list table, admin form, and pipeline merge logic for founder-sourced pilot prospects.

## Marketing Site Follow-Up

- [x] Add a dedicated `/for-print-shops` page focused on intake cleanup, preflight handoff, and fast customer proofing.
- [x] Add a dedicated `/for-marketers` page focused on repeat local marketing assets and brand-safe exports.
- [x] Add a dedicated `/for-designers` page focused on small-job production safety.
- [x] Add a `/compare/canva-print-ready-pdf` page only if it stays factual and avoids unsupported superiority claims.
- [x] Add a `/prepress-checklist` lead magnet page that captures email and shows visible practical advice.
- [x] Add a structured public pilot application that qualifies segment, first supported job, handoff pain, volume, and printer-spec context before founder follow-up.
- [x] Add real screenshots or generated product images once the current app UI is stable enough to show.

## Sales Enablement

- [x] Draft a one-page print-shop pilot offer: 10 export credits, founder onboarding, and feedback call.
- [x] Draft a simple discovery-call script for print shops and franchise/local marketing teams.
- [x] Draft objection handling for "we already use Canva," "our RIP catches this," "PDF/X is overkill," and "AI designs are too generic."
- [x] Draft a two-email follow-up sequence after a signup or pilot conversation.
- [x] Track every claim that needs evidence before public use, including uptime, customer counts, time saved, and printer acceptance rates.
- [x] Draft a Week 2 pilot outreach playbook for target-list design, sourcing, message variants, follow-up cadence, community posts, admin logging, and evidence-safe success criteria.

## Launch Plan

- [ ] Week 1: Ship marketing site updates, collect first pilot signups, and publish the prepress checklist.
- [x] Week 1 readiness: Add claim-safety controls for pilot, sales, and launch copy before public proof claims are published.
- [ ] Week 2: Recruit 10 print shops or designers through direct outreach and local print communities.
- [x] Week 2 readiness: Add the founder-led pilot outreach playbook and guard it with a regression test before live recruiting.
- [x] Week 2 readiness: Add the admin prospect form, Supabase schema, and pipeline merge logic for the 25-account target list.
- [x] Week 2 readiness: Seed the 25-account public-source target list into Supabase with `needs_follow_up` status and no outreach claims.
- [x] Week 2 readiness: Stage the first ten copy-ready founder outreach drafts while keeping send/contacted/recruited claims out of the system.
- [x] Week 2 readiness: Add the manual outreach event ledger and admin `Log sent` controls so first touches and pilot outcomes are tracked as evidence.
- [x] Week 2 readiness: Add the structured public pilot application so inbound leads can enter `pilot_prospects` with qualification context instead of email-only intent.
- [x] Week 3 readiness: Add the pilot evidence ledger and admin intake form so real supported jobs, report clarity, outcomes, quote permission, and public-claim status are tracked before launch proof is published.
- [ ] Week 3: Run real jobs through the app, record failure modes, and prioritize product fixes.
- [x] Week 4 readiness: Add the public sample reports page so supported formats, non-customer report examples, before/after handoff examples, and claim boundaries are visible before customer proof exists.
- [ ] Week 4: Publish factual launch proof: supported formats, sample reports, before/after handoff examples, and anonymized pilot learnings.
- [ ] After launch: Keep SEO pages tied to real product workflows and avoid thin doorway-style location or template pages.

## Verification

- [x] Confirm homepage navigation anchors exist for `#for-teams`, `#compare`, `#pricing`, and `#faq`.
- [x] Confirm both email forms point at `/api/email-signup` with distinct `source` values.
- [x] Confirm signup confirmation email uses Trim Proof naming and the configured site origin.
- [x] Confirm no duplicate form IDs were introduced.
- [x] Confirm `/app` sample-brief onboarding works at desktop and mobile widths with first-party API responses clean.
- [x] Confirm build output has no TypeScript, lint, or Next.js route errors.

## Scope Boundaries

- [ ] Do not claim customer logos, printer acceptance rates, certifications, or guarantees until evidence exists.
- [ ] Do not create fake reviews, fake locations, or invented business facts.
- [x] Keep public and sales copy guarded by `test/claim-safety.test.ts` for high-risk unsupported launch claims.
- [ ] Do not commit unrelated dirty work from the existing feature branch.
- [ ] Do not push or open a PR until the workspace can be staged cleanly around this logical change.
