# Analytics and Tagging Setup

## Environment Variables

Set these after the production domain and analytics property exist:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-9VNCX1HGN5
NEXT_PUBLIC_GTM_CONTAINER_ID=GTM-...
GA4_API_SECRET=...
NEXT_PUBLIC_APP_URL=https://trimproof.com
```

`NEXT_PUBLIC_GA_MEASUREMENT_ID` and `NEXT_PUBLIC_GTM_CONTAINER_ID` must be available during the Docker build as well as at runtime. Static marketing pages are generated at build time.
`GA4_API_SECRET` is server-only. `GA4_MEASUREMENT_PROTOCOL_API_SECRET` is also accepted as an alias. Create the secret in GA4 under Admin > Data streams > the Trim Proof web stream > Measurement Protocol API secrets, then set it only in production/server env.

## Events

Trim Proof pushes events to both `dataLayer` and `gtag` when configured:

- `dummy_proof_started`
- `advanced_mode_selected`
- `proof_export_started`
- `proof_export_completed`
- `checkout_started`
- `email_signup_submitted`

The email signup API also returns server-side delivery status for the transactional confirmation and admin alert. Use that API response for operational smoke tests; use GA4 for aggregate conversion reporting.

Trim Proof also emits server-side GA4 Measurement Protocol events when `GA4_API_SECRET` and `NEXT_PUBLIC_GA_MEASUREMENT_ID` are configured:

- `purchase` from the verified Stripe `checkout.session.completed` webhook, including `transaction_id`, `value`, `currency`, `entitlement`, `checkout_mode`, and ecommerce `items`.
- `generate_lead` from a successful launch-list signup, including `source` and page context.
- `checkout_started` from server-side Stripe Checkout creation when GA attribution is present.
- `proof_export_completed` from successful proof generation, including proof mode, product type, PDF/X level, print profile, preflight status, and asset provider.

The browser sends GA client/session attribution into Stripe Checkout metadata so the server-side `purchase` event can be tied back to the original web visitor. Do not put email addresses or other direct personal identifiers in GA event params.

## Recommended GA4 Conversions

Mark these as key events:

- `proof_export_completed`
- `checkout_started`
- `email_signup_submitted`
- `purchase`
- `generate_lead`

## GTM Tags

Create GA4 event tags for each custom event above. Use a dataLayer custom event trigger matching the event name.

## Production Smoke Tests

- `curl https://trimproof.com/api/health` should return `serverAnalyticsConfigured: true` once `GA4_API_SECRET` is set.
- Start a Stripe checkout from `/app` and confirm the Checkout Session metadata contains `ga_client_id` when the `_ga` cookie exists.
- Complete a test checkout and confirm the Stripe webhook records the order and sends a GA4 `purchase`.
- Submit the marketing email form and confirm the API response includes `analytics.status` as `sent`, `skipped`, or `failed`.

## Domain Note

A real GA4 web data stream should use the production website URL. Do not attach tracking to a final property until the production domain is chosen.
