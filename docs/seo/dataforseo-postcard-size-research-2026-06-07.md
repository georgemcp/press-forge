# DataForSEO Postcard Size Research - 2026-06-07

## Source

- Provider: DataForSEO
- Endpoints:
  - Google Ads Search Volume live
  - Google SERP Organic live advanced
- Location: United States
- Language: English
- Credentials: loaded from the local Codex project env registry; no secrets are stored in this document.

USPS source checked for mailing-rule wording:

- USPS Publication 25, section 6-2 Dimensions: `https://about.usps.com/publications/pub25/pub25_ch6_002.htm`

## Exact-Match Demand

| Keyword | Monthly searches | Competition | CPC |
| --- | ---: | --- | ---: |
| postcard size | 18,100 | LOW | $7.14 |
| postcard dimensions | 18,100 | LOW | $7.14 |
| postcard sizes | 18,100 | LOW | $7.14 |
| standard postcard size | 8,100 | MEDIUM | $6.65 |
| postcard size in pixels | 210 | LOW | n/a |
| postcard size inches | 110 | LOW | $4.24 |
| 4x6 postcard size | 70 | HIGH | $1.62 |
| 5x7 postcard size | 40 | HIGH | $3.98 |
| postcard safe area | 10 | LOW | $59.14 |
| postcard bleed size | 10 | LOW | n/a |
| postcard size with bleed | 10 | LOW | n/a |

Related supported-product size terms from the same refresh:

- `flyer size`: 2,900 monthly searches, high competition, $4.51 CPC
- `standard flyer size`: 1,300 monthly searches, high competition, $7.22 CPC
- `flyer dimensions`: 590 monthly searches, medium competition, $3.20 CPC
- `letterhead dimensions`: 110 monthly searches, low competition, $11.75 CPC

## SERP Shape

DataForSEO SERP for `postcard size` showed:

- Rank 1: USPS Postal Explorer / Publication 25 card dimensions
- Rank 2: Printivity standard postcard size guide
- Rank 3: MOO postcard sizes and dimensions guide
- Rank 4: VistaPrint postcard size guide
- Rank 5: USPS Postal Explorer quick service guide
- Ranks 6-10: printer and direct-mail size guides

People Also Ask questions:

- Can I mail a 5x7 card as a postcard?
- Are most postcards 4x6 or 5x7?
- Is a postcard A6 or A5?
- What are USPS rules for postcards?

Related searches included `postcard size in cm`, `postcard size in inch`, `postcard size pixels`, `postcard size in mm`, and `postcard size ratio`.

## Interpretation

This is a large, low-competition, high-CPC supported-product cluster. The query is broader than "postcard PDF template" but still close to production intent because searchers need dimensions before setting up artwork, bleed, safe area, and pixels. The SERP rewards concise size answers plus USPS caveats, making the page a good fit for AEO and GEO extraction.

## Implemented Target

- Route: `/tools/postcard-size-guide`
- Primary keywords: `postcard size`, `postcard dimensions`, `postcard sizes`, `standard postcard size`
- Secondary keywords: `postcard size in pixels`, `postcard size inches`, `postcard size with bleed`
- Schema expected from the tool-page template: Article, FAQPage, HowTo, BreadcrumbList
- Conversion path: free demo account, one export credit, or Trim Proof Pro through the standard public tool-page CTA block

## Content Boundaries

- State common print sizes without claiming one universal postcard size.
- Distinguish print trim, bleed box, and USPS mailing dimensions.
- State that USPS card-price dimensions use the trimmed piece, not the bleed box.
- State that printer and mailing requirements still control final acceptance.
- Keep Trim Proof positioned as a fresh checked proof workflow for supported postcards, not a universal file repair service.

## Validation

- Route renders at `/tools/postcard-size-guide`
- Page appears in `/sitemap.xml`
- `llms.txt` lists the page
- Homepage keyword map links to the page
- Regression tests cover size math, USPS caveat, and internal linking
