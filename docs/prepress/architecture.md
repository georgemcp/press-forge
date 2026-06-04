# Trim Proof Architecture

Trim Proof is built around one invariant: image models create creative assets, while deterministic tooling owns print validity.

## Pipeline

1. Brief intake becomes a schema-validated `LayoutSpec`.
2. Creative providers generate only non-text assets.
3. The prepress engine composes a deterministic PDF master with real embedded fonts.
4. Ghostscript converts to CMYK PDF/X with an output-intent ICC profile.
5. Preflight checks dimensions, boxes, font embedding, PDF/X subtype, and raster DPI.
6. Stripe billing grants export credits or subscription access; exports are delivered only after the preflight gate.

## Local Proof

Run:

```bash
npm run proof:pdf
```

Outputs are written to `artifacts/proof` and include:

- `trimproof-business-card.source.pdf`
- `trimproof-business-card.pdfx.pdf` when Ghostscript succeeds
- `trimproof-business-card.master.svg`
- `preflight-report.json`

## Billing

Prices are configured in Stripe, not hardcoded:

- `STRIPE_EXPORT_PRICE_ID` for pay-per-export credits
- `STRIPE_SUBSCRIPTION_PRICE_ID` for SaaS plans

The app intentionally does not set pricing rates in code.
