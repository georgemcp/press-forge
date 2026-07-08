# DataForSEO Business Card Size Research - 2026-06-07

## Source

- Provider: DataForSEO
- Endpoints:
  - Google Ads Search Volume live
  - Google SERP Organic live advanced
- Location: United States
- Language: English
- Credentials: loaded from the local Codex project env registry; no secrets are stored in this document.

## Exact-Match Demand

| Keyword | Monthly searches | Competition | CPC |
| --- | ---: | --- | ---: |
| business card size | 27,100 | MEDIUM | $5.54 |
| standard business card size | 9,900 | MEDIUM | $6.80 |
| standard business card dimensions | 9,900 | MEDIUM | $6.80 |
| what size is a business card | 8,100 | LOW | $4.88 |
| business card dimensions | 6,600 | LOW | $7.74 |
| business card size inches | 2,400 | MEDIUM | $3.24 |
| business card dimensions inches | 2,400 | MEDIUM | $3.24 |
| business card size pixels | 1,300 | LOW | $12.42 |
| business card size in pixels | 1,300 | LOW | $12.42 |
| business card dimensions pixels | 1,300 | LOW | $12.42 |
| us business card size | 390 | MEDIUM | $8.05 |
| business card size in mm | 320 | LOW | $7.93 |
| business card aspect ratio | 210 | LOW | $4.00 |
| business card size with bleed | 170 | MEDIUM | $7.41 |

## SERP Shape

DataForSEO SERP for `business card size` showed:

- Rank 1: VistaPrint business card size and dimension guide
- Rank 2: Canva business card size guide
- Rank 3: MOO business card size and dimension guide
- Ranks 4-10: print-shop, office-supply, and domain-brand business-card size guides

People Also Ask questions:

- Is a business card 2x3?
- Are business cards 3x5?
- What is the size of a business card holder?
- How many business cards can fit on an 8.5 x11?

Related searches included `business card size in pixels`, `business card size in cm`, `business card size in inches`, `business card size in mm`, and `business card size in width and height`.

## Interpretation

This is a very large supported-product setup cluster. It is broader than the existing `/tools/business-card-bleed-size` page, which targets users who already know they need bleed. Searchers for `business card size`, `standard business card dimensions`, and `what size is a business card` need the first decision: trim size, dimensions, pixels, and whether bleed changes the document size.

## Implemented Target

- Route: `/tools/business-card-size-guide`
- Primary keywords: `business card size`, `standard business card size`, `business card dimensions`, `standard business card dimensions`, `what size is a business card`
- Secondary keywords: `business card size pixels`, `business card size in mm`, `business card size with bleed`
- Schema expected from the tool-page template: Article, FAQPage, HowTo, BreadcrumbList
- Conversion path: free demo account, one export credit, or Trim Proof Pro through the standard public tool-page CTA block

## Content Boundaries

- State the common US standard as 3.5 x 2 inches and the metric equivalent as about 89 x 51 mm.
- State the 300 DPI trimmed pixel size as 1050 x 600 px.
- State the full-bleed size with 0.125 inch bleed as 3.75 x 2.25 inches and 1125 x 675 px at 300 DPI.
- Clarify that 2 x 3 inches and 3 x 5 inches are not the common US business-card trim.
- State that printer specifications still control final trim size, bleed, safe area, marks, color workflow, stock, finishing, and delivery format.

## Validation

- Route renders at `/tools/business-card-size-guide`
- Page appears in `/sitemap.xml`
- `llms.txt` lists the page
- Homepage keyword map links to the page
- Regression tests cover size math, pixels, bleed, and printer-specific caveats
