# Trim Proof Claim Evidence Register

*Last updated: 2026-06-15*

Use this register before publishing marketing copy, sales collateral, ads, launch posts, or comparison pages. The rule is simple: if the claim needs proof, cite the proof or do not use the claim.

Status key:
- `Approved`: safe to publish with current evidence.
- `Bounded`: safe only when the copy includes the stated limitation.
- `Evidence needed`: do not publish as a factual outcome claim yet.
- `Do not use`: blocked until product capability, legal permission, or customer proof exists.

## Safe Claims

| Claim | Status | Current evidence | Source of truth | Validation step | Where it can be used |
|-------|--------|------------------|-----------------|-----------------|----------------------|
| Trim Proof turns plain-English print briefs into checked PDF/X-oriented proofs. | Approved | Current app workflow and route copy. | `src/components/press-forge-workspace.tsx`, `src/app/app/page.tsx`, `src/components/marketing-site.tsx` | Generate a demo proof locally and confirm route copy still describes PDF/X-oriented output. | Homepage, use-case pages, sales kit, checklist. |
| Supported starter products include flyers, posters, menus, brochures, business cards, postcards, and letterhead. | Approved | Product type data, layout/spec tests, app copy. | `src/lib/print/constants.ts`, `test/layout-spec.test.ts`, `test/sample-briefs.test.ts` | Run product/profile tests and confirm each product appears in app onboarding or tool pages. | Product pages, pricing, onboarding, sales collateral. |
| The workflow checks trim, bleed, safe area, crop marks, vector text, color workflow, image DPI, and PDF/X status. | Bounded | Print layout/export code and proof/export tests cover these checks for supported workflows. | `src/lib/print/preflight.ts`, `src/lib/print/preflight-report.ts`, `test/preflight-report.test.ts`, `test/proof-export-route.test.ts` | Generate a proof and inspect the report artifacts before claiming the exact checks. | Homepage, checklist, use-case pages, sales kit. |
| A free account can create a watermarked demo proof. | Approved | App/pricing copy and proof-export behavior covered by tests. | `src/app/pricing/page.tsx`, `src/app/api/exports/proof/route.ts`, `test/proof-export-route.test.ts` | Run proof-export route tests and browser-smoke the demo proof path. | Pricing, lead magnet pages, onboarding. |
| Paid paths are a $12 export credit and $49/month Pro plan with 15 advanced exports. | Approved | Pricing page, Stripe checkout config, billing tests. | `src/app/pricing/page.tsx`, `src/lib/billing/stripe.ts`, `src/lib/billing/paid-session.ts`, `test/stripe-url.test.ts`, `test/paid-session.test.ts` | Run billing tests and verify live Stripe price IDs before production launch. | Pricing, sales kit, use-case pages. |
| Trim Proof does not guarantee printer acceptance. | Approved | Product boundary decision documented across pages and docs. | `.agents/product-marketing-context.md`, `src/app/about/page.tsx`, `src/lib/seo/tool-pages.ts`, `docs/sales/trim-proof-pilot-sales-kit.md` | Search public copy for guarantee language and keep negative boundary phrasing visible. | FAQ, sales objections, comparison pages. |
| Print workflow presets can set SWOP, GRACoL, FOGRA, or no-marks digital handoff defaults for supported products. | Approved | Preset constants, app Specs tab, and focused tests cover profile, PDF/X, crop marks, and summary copy. | `src/lib/print/constants.ts`, `src/components/press-forge-workspace.tsx`, `test/print-workflow-presets.test.ts` | Run preset tests and browser-smoke the Specs tab before using in launch copy. | App onboarding, sales demos, product docs. |

## Claims That Need Evidence Before Use

| Claim | Evidence needed | Status | Safe replacement |
|-------|-----------------|--------|------------------|
| "Accepted by printers" or "printer-approved." | Named printer/vendor acceptance evidence and permission to cite. | Do not use | "Built for supported print handoff checks; printer specs still control final acceptance." |
| Time saved, such as "cuts prep time by 50%." | Pilot before/after measurements with method and sample size. | Evidence needed | "Designed to reduce avoidable file-prep back-and-forth." |
| Customer counts, logos, or testimonials. | Customer permission and approved quote/logo usage. | Evidence needed | "Pilot feedback is being collected." |
| Uptime, reliability, or SLA claims. | Production monitoring history and documented SLA. | Evidence needed | "Use the live product for supported demo and paid export paths." |
| "Replaces Canva, Acrobat, PitStop, or RIP workflows." | Product capability and customer evidence supporting replacement. | Do not use | "Fits between creative tools and expert preflight workflows." |
| "Fixes any PDF" or "repairs Canva exports." | A supported repair workflow, tests, and bounded product docs. | Do not use | "Creates a fresh checked proof for supported products." |
| "Works for every print product." | Product profiles and tests for each claimed product. | Do not use | "Supports flyers, posters, menus, brochures, business cards, postcards, and letterhead." |
| "Certified PDF/X compliance" or similar certification language. | Certification, validator output, and legal review. | Do not use | "PDF/X-oriented export with visible preflight checks." |

## Pilot Evidence To Collect

- Job type tested.
- Original customer input type: brief, screenshot, Canva export, PDF, native file, or other.
- Printer or vendor spec used for comparison.
- Checks passed and checks requiring review.
- Whether the proof report made the next action clearer.
- Time spent before and after, if the pilot participant can measure it.
- Quote permission, exact wording, title, company, and public attribution level.
- Whether the output was used as-is, revised in another tool, rejected, or only used for internal review.
- The exact product version or commit tested, plus whether the user tested dummy proof, export credit, or Pro.

## Pilot Evidence Records

Use the admin pipeline's `Record pilot evidence` form after a participant tests a real supported job. It writes to `pilot_evidence_records`, which is the internal source of truth for Week 3 learning and Week 4 public-proof review.

| Field | How to use it | Public proof rule |
|-------|---------------|-------------------|
| `prospect_email` | Same normalized email used in the pilot pipeline. | Never expose publicly. |
| `job_type` | Supported product tested: flyer, poster, menu, brochure, business card, postcard, or letterhead. | Safe only as an aggregate supported-workflow note. |
| `source_material` | Brief, screenshot, PDF, Canva export, image, or other starting material. | Remove customer-identifying details before public use. |
| `printer_spec` | Vendor spec, written requirement, or workflow target used for comparison. | Do not imply vendor endorsement. |
| `tested_path` | Dummy proof, export credit, Pro, or unknown. | Safe as product-path context. |
| `checks_summary` | Checks passed, checks needing review, and missing workflow notes. | Use only bounded product language unless validated across enough pilots. |
| `report_clarity` | Whether the report made the next action clearer. | Safe as an anonymized learning if no outcome metric is implied. |
| `outcome` | Reviewed only, needs revision, used after review, not fit, or blocked. | Do not turn a single row into an acceptance-rate or success-rate claim. |
| `quote_permission` | None, anonymous, or attributed. | Customer quote copy still needs the exact approved wording. |
| `public_claim_status` | `not_approved`, `approved_internal`, or `approved_public`. | Only `approved_public` can be referenced in external launch proof. |
| `product_version` | Commit, release, or other product version tested. | Cite internally when debugging pilot findings. |

`approved_public` means the row has passed claim review; it does not grant permission to publish private email addresses, customer files, private specs, unapproved logos, or broad metrics.

## Pilot Evidence Intake Template

Use this format when a pilot participant gives feedback:

| Field | Entry |
|-------|-------|
| Participant | Company, role, and permission level |
| Job type | Supported product and dimensions |
| Source material | Brief, screenshot, PDF, Canva export, or image |
| Printer spec | Vendor name or written spec used for comparison |
| Trim Proof path | Dummy proof, export credit, or Pro |
| Report outcome | Passed, needs attention, or failed checks |
| Next action | Used, revised, rejected, or reviewed only |
| Measured time | Before/after method, if available |
| Quote permission | None, anonymous, attributed, or logo allowed |
| Follow-up | Missing workflow, product request, or objection |

## Copy Review Rule

Before publishing a new page or collateral item, scan for:
- Numeric outcomes.
- Acceptance or guarantee language.
- Customer proof.
- Replacement claims.
- Universal repair claims.
- Unsupported product or file-format claims.

If the claim is not in Safe Claims and evidence is missing, rewrite it as a bounded capability or remove it.

## Automated Guardrail

Run the claim-safety test before launch copy changes:

```bash
npm run test -- test/claim-safety.test.ts
```

The test scans public marketing, pricing, audience, comparison, SEO, and sales files for high-risk unsupported wording. It does not replace human review, but it catches the phrases most likely to create false proof.
