# DataForSEO Postcard Maker Research - 2026-06-07

Market: United States / English
Source: DataForSEO Google Ads Search Volume and Google organic SERP live advanced
Target routes: `/tools/postcard-maker`, `/tools/free-postcard-maker`

## Keyword Demand

| Keyword | Monthly searches | CPC | Competition |
|---|---:|---:|---|
| `postcard design` | 2,900 | $7.62 | High |
| `postcard designer` | 2,900 | $7.62 | High |
| `postcard maker` | 1,300 | $6.30 | High |
| `postcard creator` | 260 | $6.39 | High |
| `online postcard maker` | 260 | $6.36 | High |
| `postcard maker online` | 260 | $6.36 | High |
| `postcard generator online` | 260 | $6.36 | High |
| `free postcard maker` | 210 | $2.65 | High |
| `free postcard creator` | 210 | $2.65 | High |
| `free postcard generator` | 210 | $2.65 | High |
| `postcard maker free` | 210 | $2.65 | High |
| `postcard generator` | 90 | $3.39 | High |
| `AI postcard generator` | 50 | $7.03 | High |
| `AI postcard maker` | 20 | $3.37 | Medium |
| `free AI postcard generator` | 20 | $4.44 | High |
| `business postcard maker` | 20 | $10.63 | High |
| `direct mail postcard maker` | null | n/a | n/a |
| `4x6 postcard maker` | null | n/a | n/a |
| `postcard maker with bleed` | null | n/a | n/a |
| `print ready postcard maker` | null | n/a | n/a |

Core exact design, maker, online, free, and AI variants total about 9,390 monthly searches before null-volume AEO phrases.

## SERP Pattern

DataForSEO SERP snapshot for `postcard maker` shows page one dominated by design tools, print-ordering platforms, stationery vendors, and template makers:

- Canva
- Adobe Express
- Walgreens Photo
- Vistaprint
- Jukebox Print
- Avery
- MyPostcard
- MyCreativeShop
- Design.com
- Reddit
- Kittl
- MOO

The SERP makes Trim Proof's positioning clear: it should not compete as a generic design template app, stationery marketplace, print-ordering platform, or postcard mailing service. The conversion wedge is a checked print handoff file with visible bleed, safe area, vector text, mailing-zone guidance, PDF/X-1a preflight, free watermarked demo art, and paid clean production export.

## SEO/AEO Recommendation

Add exact-match supported-product routes:

- `/tools/postcard-maker` for `postcard design`, `postcard designer`, `postcard maker`, `postcard creator`, `online postcard maker`, `postcard generator online`, `AI postcard generator`, and print-ready postcard proof intent.
- `/tools/free-postcard-maker` for `free postcard maker`, `free postcard creator`, `free postcard generator`, `postcard maker free`, and free-demo intent.

Positioning:

- Trim Proof is not a print shop, postcard mailing service, postage provider, or universal design-template marketplace.
- Trim Proof generates and checks postcard PDF proofs from a brief and supported product profile.
- A print-ready postcard maker should preserve final offer, address, QR, disclaimer, URL, and contact copy as embedded vector text.
- The proof should define postcard trim, 0.125 inch bleed when artwork reaches the edge, safe area, optional mailing-zone guidance, crop marks when requested, PDF/X-1a target, and preflight status.
- Free/demo art is watermarked.
- Clean production PDF/X downloads require paid export credit or Pro access.
- USPS, direct-mail vendor, and printer specifications still control final acceptance.

## Implementation Notes

Updated files:

- `src/lib/seo/tool-pages.ts`
- `src/components/marketing-site.tsx`
- `src/app/tools/page.tsx`
- `public/llms.txt`
- `test/seo-pages.test.ts`
- `docs/seo/seo-aeo-geo-plan.md`
- `docs/seo/seo-aeo-geo-audit-2026-06-06.md`

Validation:

- Focused SEO page tests should assert postcard maker/design/free keywords, vector text, 0.125 inch bleed, watermarked free demo art, paid-clean PDF/X export, no printed/mailing service claim, and no USPS/printer-acceptance guarantee.
- Live smoke should confirm `/tools/postcard-maker`, `/tools/free-postcard-maker`, `/tools`, `/sitemap.xml`, `/llms.txt`, and `/api/health`.
- Submit the updated public route set through IndexNow after deployment.
