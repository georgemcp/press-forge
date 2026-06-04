# Analytics and Tagging Setup

## Environment Variables

Set these after the production domain and analytics property exist:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-9VNCX1HGN5
NEXT_PUBLIC_GTM_CONTAINER_ID=GTM-...
NEXT_PUBLIC_APP_URL=https://trimproof.com
```

`NEXT_PUBLIC_GA_MEASUREMENT_ID` and `NEXT_PUBLIC_GTM_CONTAINER_ID` must be available during the Docker build as well as at runtime. Static marketing pages are generated at build time.

## Events

Trim Proof pushes events to both `dataLayer` and `gtag` when configured:

- `dummy_proof_started`
- `advanced_mode_selected`
- `proof_export_started`
- `proof_export_completed`
- `checkout_started`
- `email_signup_submitted`

## Recommended GA4 Conversions

Mark these as key events:

- `proof_export_completed`
- `checkout_started`
- `email_signup_submitted`

## GTM Tags

Create GA4 event tags for each custom event above. Use a dataLayer custom event trigger matching the event name.

## Domain Note

A real GA4 web data stream should use the production website URL. Do not attach tracking to a final property until the production domain is chosen.
