# DataForSEO Business Card Maker Research - 2026-06-07

Market: United States / English  
Source: DataForSEO Google Ads Search Volume and Google organic SERP live advanced  
Target routes: `/tools/ai-business-card-generator`, `/tools/free-ai-business-card-generator`

## Keyword Demand

| Keyword | Monthly searches | CPC | Competition |
|---|---:|---:|---|
| `business card maker` | 27,100 | $6.92 | Low |
| `business card creator` | 27,100 | $6.92 | Low |
| `business card generator` | 27,100 | $6.92 | Low |
| `free business card maker` | 4,400 | $4.97 | High |
| `free business card generator` | 4,400 | $4.97 | High |
| `online business card maker` | 2,400 | $7.51 | High |
| `ai business card generator` | 1,600 | $5.17 | High |
| `ai business card maker` | 210 | $5.14 | High |
| `free ai business card generator` | 140 | $3.94 | High |
| `business card design maker` | 30 | $6.30 | High |

## SERP Pattern

DataForSEO SERP snapshots for `business card maker` and `business card generator` show the page-one set is dominated by design, template, and print-ordering competitors:

- Vistaprint
- Canva
- Adobe Express
- Design.com
- Jukebox Print
- 123Print
- BizCardMaker
- MOO
- Walmart Business Print
- Avery
- Template.net
- Reddit and QR/vCard-adjacent results

People Also Ask questions include:

- What's the best site to make business cards?
- What is the best free business card maker?
- What is the best place to get business cards made?
- What is the average cost for 100 business cards?

## SEO/AEO Recommendation

Expand the existing `/tools/ai-business-card-generator` route around broad `business card maker`, `business card creator`, and `business card generator` intent instead of creating duplicate doorway pages.

Also expand `/tools/free-ai-business-card-generator` to answer `free business card maker` and `free business card generator` searches with the paid boundary visible.

Positioning:

- Trim Proof is not a print shop, print-ordering platform, or universal design-template marketplace.
- Trim Proof generates and checks a business-card PDF proof from a brief and supported product profile.
- A print-ready business card proof should preserve final names, phone numbers, email addresses, URLs, and QR/contact details as embedded vector text.
- The proof should define 3.5 x 2 inch trim, 0.125 inch bleed, safe area, crop marks when requested, PDF/X-1a target, and preflight status.
- Free/demo art is watermarked.
- Clean production PDF/X downloads require paid export credit or Pro access.
- Printer specifications still control final acceptance.

## Implementation Notes

Updated files:

- `src/lib/seo/tool-pages.ts`
- `src/components/marketing-site.tsx`
- `public/llms.txt`
- `test/seo-pages.test.ts`
- `docs/seo/seo-aeo-geo-plan.md`
- `docs/seo/seo-aeo-geo-audit-2026-06-06.md`

Validation:

- Focused SEO page tests should assert broad business-card maker keywords, free maker keywords, vector text, 3.5 x 2 inch trim, 0.125 inch bleed, free-watermarked demo, paid-clean PDF/X export, no printed-card sales claim, and no printer-acceptance guarantee.
- Live smoke should confirm `/tools/ai-business-card-generator`, `/tools/free-ai-business-card-generator`, `/sitemap.xml`, `/llms.txt`, and `/api/health`.
- Submit the updated public route set through IndexNow after deployment.
