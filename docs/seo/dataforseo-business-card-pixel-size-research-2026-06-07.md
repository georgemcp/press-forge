# DataForSEO Business Card Pixel Size Research

Market: United States / English  
Refresh time: 2026-06-07T15:03:00Z  
Source: DataForSEO Google Ads Search Volume and Google organic SERP live endpoints

## Why This Refresh Was Run

The supported product library already covers business-card maker, template, size, and bleed intent. This refresh checked whether narrower pixel, DPI, Photoshop, safe-area, and print-check searches justified a separate page or should remain folded into the broader business-card size guide.

## Exact Keyword Results

| Keyword | Search volume | CPC | Competition | Competition index |
|---|---:|---:|---|---:|
| business card dimensions pixels | 1,300 | 12.42 | LOW | 6 |
| business card pixel size | 1,300 | 12.42 | LOW | 6 |
| business card size in pixels | 1,300 | 12.42 | LOW | 6 |
| business card size pixels | 1,300 | 12.42 | LOW | 6 |
| business card size photoshop | 390 | 12.93 | LOW | 10 |
| business card resolution | 90 | 2.84 | LOW | 12 |
| business card safe area | 30 |  | MEDIUM | 54 |
| business card safe zone | 10 |  | LOW | 29 |
| business card size in pixels 300 dpi | 10 |  | LOW | 5 |

Exact supported-product adjacent terms with lower volume:

| Keyword | Search volume | CPC | Competition | Competition index |
|---|---:|---:|---|---:|
| flyer size pixels | 260 |  | LOW | 1 |
| flyer size in pixels | 260 |  | LOW | 1 |
| postcard size pixels | 210 |  | LOW | 8 |
| postcard size in pixels | 210 |  | LOW | 8 |
| canva business card size | 50 | 2.15 | LOW | 16 |
| canva flyer size | 50 |  | LOW | 9 |
| canva postcard size | 40 |  | LOW | 12 |
| letterhead size pixels | 10 |  | LOW | 0 |
| letterhead size in pixels | 10 |  | LOW | 0 |

Zero-volume or near-zero print-check variants in this refresh included `check pdf for print`, `check pdf for printing`, `pdf print checker`, `pdf preflight checker online`, `print ready file checker`, `print ready checker`, and `pdf to print ready`.

Unsupported product demand found in the same refresh:

| Keyword | Search volume | CPC | Competition | Competition index |
|---|---:|---:|---|---:|
| poster maker | 18,100 | 2.46 | MEDIUM | 65 |
| free poster maker | 4,400 | 1.70 | MEDIUM | 40 |
| tri fold brochure template | 4,400 | 2.80 | MEDIUM | 65 |
| menu maker | 2,900 | 4.81 | HIGH | 73 |
| brochure maker | 1,900 | 4.39 | MEDIUM | 64 |
| free menu maker | 1,900 | 4.63 | HIGH | 70 |
| free brochure maker | 720 | 3.51 | MEDIUM | 65 |

## SERP Notes

DataForSEO organic SERP snapshots for `business card size pixels` and `business card pixel size` showed printer and design-tool guides in the top results, including Vistaprint, MOO, Jukebox Print, Softriver, Namecheap, CorelDRAW, Smartpress, MyBoxPrinter, 4over4, YouTube, and Reddit.

People Also Ask questions included:

- What is the pixel size of a business card?
- What is 300 dpi in pixels for a business card?
- Is a business card 2x3?
- What is a good size for business cards?
- What is the resolution for a business card?

Many top results answer the 1050 x 600 px trim size, but full-bleed and safe-area numbers vary by printer template. Trim Proof should use the supported profile math while explicitly stating that printer upload sizes can differ.

## Build Decision

Implemented:

- `/tools/business-card-pixel-size`: a focused guide for the pixel/DPI cluster, using Trim Proof's supported business-card profile:
  - 3.5 x 2 inch trim
  - 1050 x 600 px at 300 DPI after trim
  - 0.125 inch bleed on each edge when requested
  - 3.75 x 2.25 inch full-bleed file
  - 1125 x 675 px full-bleed size at 300 DPI
  - 0.125 inch default safe margin
  - 3.25 x 1.75 inch safe area
  - 975 x 525 px safe-area reference at 300 DPI

Deferred:

- Poster, brochure, tri-fold brochure, and menu maker pages. The demand is real, but those products are not current Trim Proof starter profiles, so publishing maker pages now would overstate the product.
- Separate flyer, postcard, and letterhead pixel-size pages. The exact pixel demand is materially smaller and is already covered in the current size/format guides. Split only if Search Console impressions show page-level opportunity.

## AEO / GEO Angle

The new page should answer the exact pixel-size question in the first screen, then explain why some printer templates disagree. It should route users to the business-card proof workflow without claiming Trim Proof sells printed cards, repairs arbitrary files, or guarantees printer acceptance.
