# Trim Proof SEO, AEO, and GEO Plan

## Demand Evidence

DataForSEO showed the strongest current demand around:

- `ai flyer generator`: 4,400 monthly searches, high competition
- `ai business card generator`: 1,600 monthly searches, high competition
- `business card pdf template`: 210 monthly searches
- `pdf to cmyk`, `convert pdf to cmyk`, `cmyk pdf converter`: 140 monthly searches each
- `pdf/x-1a`, `pdf x1a`, `pdf x 1a`: 140 monthly searches each
- `print ready pdf`: 110 monthly searches
- `business card with bleed`: 110 monthly searches

## Architecture

- Homepage targets the broad product category: AI print-ready PDF generator.
- `/app` gives visitors a live dummy proof and advanced mode.
- `/tools/print-ready-pdf-generator` targets print-ready PDF terms.
- `/tools/pdf-to-cmyk-converter` targets CMYK conversion terms.
- `/tools/add-bleed-to-pdf-online` targets bleed and crop-mark tasks.
- `/tools/pdf-preflight-checker` targets preflight and check-for-print terms.
- `/tools/ai-business-card-generator` targets AI business card searches.
- `/tools/ai-flyer-generator` targets AI flyer searches.

## AEO Blocks

Every important page should answer the main query within the first screen:

- What is the tool?
- What does it check or produce?
- Why is deterministic prepress different from a raster image generator?
- What are the next steps?

## GEO / AI Search

The site includes:

- `llms.txt` with concise citeable facts
- AI crawler access in `robots.ts`
- JSON-LD for `SoftwareApplication`, `FAQPage`, `HowTo`, and `Organization`
- Clear text explanations of PDF/X, CMYK, bleed, crop marks, vector fonts, and preflight

## Tracking Events

- `dummy_proof_started`
- `advanced_mode_selected`
- `proof_export_started`
- `proof_export_completed`
- `checkout_started`
- `email_signup_submitted`

## Validation

- Render each page and inspect JSON-LD in browser DOM.
- Submit `/sitemap.xml` and `/robots.txt` in Search Console after production domain is chosen.
- Configure GA4 Measurement ID and GTM container through env.
- Create conversion events for export started, export completed, checkout started, and signup submitted.
