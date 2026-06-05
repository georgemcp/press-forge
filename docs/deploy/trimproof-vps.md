# Trim Proof VPS Deployment

Production target:

- Domain: `trimproof.com`
- VPS: `srv1169050.hstgr.cloud`
- Public IP: `148.230.84.75`
- App directory: `/opt/trimproof`
- Local app port behind nginx: `3047`
- Supabase project: `justcsfgntvtbxprcnoh`
- Stripe prices: export credit `price_1TejgIRy14ye40TRwCxJSBu7`; monthly subscription `price_1TejgJRy14ye40TRgqMqHR9V`
- Stripe Customer Portal configuration: `bpc_1TelBzRy14ye40TRGJb4wixa`
- GA4 property: `properties/540372104`; web stream `15008052932`; measurement ID `G-9VNCX1HGN5`
- Google Search Console: URL-prefix property `https://trimproof.com/` verified under `geomcpherson@gmail.com` on `2026-06-05`; sitemap `/sitemap.xml` reads as `Success` with 13 discovered pages. Domain TXT verification is published, but the optional domain property `trimproof.com` is not yet verified in Search Console.
- Transactional email: SendGrid from `launch@trimproof.com`; admin notifications to `george.mcpherson@rightawaygroup.com`
- TLS: Let's Encrypt certificate at `/etc/letsencrypt/live/trimproof.com/`, expiring `2026-09-02` with scheduled auto-renewal

The app is deployed with Docker Compose. Nginx terminates public HTTP/HTTPS and proxies to the app container on `127.0.0.1:3047`.
Public `NEXT_PUBLIC_*` variables are passed as Docker build args so statically rendered marketing pages include analytics tags after rebuilds. Use `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build` for production rebuilds.

Required production env:

- `NEXT_PUBLIC_APP_URL=https://trimproof.com`
- `REDIS_URL=redis://redis:6379`
- `TRIMPROOF_GENERATED_DIR=/app/.trimproof-generated`
- `STRIPE_SECRET_KEY`, `STRIPE_EXPORT_PRICE_ID`, `STRIPE_SUBSCRIPTION_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PORTAL_CONFIGURATION_ID` when the app should use a specific Stripe Customer Portal configuration
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `GA4_PROPERTY_ID`, `GOOGLE_ANALYTICS_PROPERTY_ID`, or `NEXT_PUBLIC_GTM_CONTAINER_ID` when analytics tags are live
- `GA4_API_SECRET` or `GA4_MEASUREMENT_PROTOCOL_API_SECRET` when verified Stripe/webhook purchases, launch signups, checkout starts, and proof exports should send server-side GA4 conversion events
- `TRIMPROOF_ADMIN_EMAIL`, `TRIMPROOF_ADMIN_PASSWORD`, and `TRIMPROOF_ADMIN_SESSION_SECRET` for the protected `/admin` management center
- `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `TRIMPROOF_ADMIN_EMAIL`, and either `RESEND_API_KEY` or `SENDGRID_API_KEY` when transactional signup email is live
- `OPENAI_API_KEY` and/or `GEMINI_API_KEY` when creative image providers are enabled
- `OPENAI_IMAGE_MODEL=gpt-image-2` and `GEMINI_IMAGE_MODEL=gemini-3-pro-image` for the current premium creative model defaults
- `TRIMPROOF_EXPORT_PRICE_CENTS`, `TRIMPROOF_SUBSCRIPTION_PRICE_CENTS`, `TRIMPROOF_STRIPE_FEE_BPS`, `TRIMPROOF_STRIPE_FIXED_FEE_CENTS`, and `TRIMPROOF_ESTIMATED_PROOF_COST_CENTS` when admin contribution-margin assumptions need to differ from defaults

Production email DNS:

- SendGrid authenticated domain ID: `31303631`
- `em.trimproof.com` CNAME `u56539253.wl004.sendgrid.net`
- `s1._domainkey.trimproof.com` CNAME `s1.domainkey.u56539253.wl004.sendgrid.net`
- `s2._domainkey.trimproof.com` CNAME `s2.domainkey.u56539253.wl004.sendgrid.net`
- Validation status on `2026-06-04`: `valid=true` for return-path and both DKIM records.

Production Google DNS and files:

- Search Console domain verification TXT on root: `google-site-verification=bd3Ho8LUomJBMjQUbjya7pEtTmAsqcXCapvzVBidFcw`
- Search Console URL-prefix verification file: `/google43b9c98a02f6c033.html`
- Sitemap submitted in Search Console for the URL-prefix property on `2026-06-05`: `https://trimproof.com/sitemap.xml`; Search Console status: `Success`, last read `2026-06-05`, discovered pages `13`.

Verification:

- `docker compose -f docker-compose.prod.yml ps`
- `curl http://127.0.0.1:3047/api/health`
- Confirm `/api/health` reports `stripeCheckoutConfigured`, `stripeWebhookConfigured`, and `stripePortalConfigured` as `true` before treating paid exports and subscription management as live.
- Generate a proof in `/app` and verify the returned `/api/exports/proof/files/...` URL downloads a PDF.
- Start a Checkout Session from `/app?mode=advanced` with a billing email and confirm Stripe opens a Trim Proof-branded hosted Checkout page.
- Confirm the Stripe webhook endpoint is subscribed to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted` so paid access follows refunds, failed payments, and cancellations.
- Submit `/api/billing/access-link` with a billing email and confirm active subscriptions or unused export credits receive an emailed `/app?mode=advanced&checkout=success&session_id=...` access link.
- For a paid subscription checkout session, submit `/api/billing/portal` and confirm Stripe opens subscription management with a return URL back to `/app`.
- `curl -I http://trimproof.com`
- `curl -I https://trimproof.com` after the certificate is issued
- Browser-check `https://trimproof.com` and `https://trimproof.com/app` for `https://www.googletagmanager.com/gtag/js?id=G-9VNCX1HGN5`
- Confirm `https://trimproof.com/google43b9c98a02f6c033.html` returns the Search Console verification file and `dig TXT trimproof.com` includes the domain verification token.
- Confirm `https://trimproof.com/sitemap.xml` returns HTTP 200 with `application/xml` and remains listed in `robots.txt`.
- Confirm `/api/health` reports `serverAnalyticsConfigured: true` when `GA4_API_SECRET` is set.
- Confirm `/privacy` remains published before sending GA4 Measurement Protocol events.
- Visit `/admin/login`, authenticate with the production admin password, and confirm `/admin` loads account, subscription, order, usage, margin, and readiness sections.
- Submit the launch-list form and confirm `/api/email-signup` returns an `email.confirmation.status`; `sent` means provider delivery was accepted, `skipped` means the signup was saved but no provider was configured.
