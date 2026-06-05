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
- GA4 measurement ID: `G-9VNCX1HGN5`
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
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` or `NEXT_PUBLIC_GTM_CONTAINER_ID` when analytics tags are live
- `GA4_API_SECRET` when verified Stripe/webhook purchases and launch signups should send server-side GA4 conversion events
- `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `TRIMPROOF_ADMIN_EMAIL`, and either `RESEND_API_KEY` or `SENDGRID_API_KEY` when transactional signup email is live
- `OPENAI_API_KEY` and/or `GEMINI_API_KEY` when creative image providers are enabled

Production email DNS:

- SendGrid authenticated domain ID: `31303631`
- `em.trimproof.com` CNAME `u56539253.wl004.sendgrid.net`
- `s1._domainkey.trimproof.com` CNAME `s1.domainkey.u56539253.wl004.sendgrid.net`
- `s2._domainkey.trimproof.com` CNAME `s2.domainkey.u56539253.wl004.sendgrid.net`
- Validation status on `2026-06-04`: `valid=true` for return-path and both DKIM records.

Verification:

- `docker compose -f docker-compose.prod.yml ps`
- `curl http://127.0.0.1:3047/api/health`
- Generate a proof in `/app` and verify the returned `/api/exports/proof/files/...` URL downloads a PDF.
- Start a Checkout Session from `/app?mode=advanced` with a billing email and confirm Stripe opens a Trim Proof-branded hosted Checkout page.
- Submit `/api/billing/access-link` with a billing email and confirm active subscriptions or unused export credits receive an emailed `/app?mode=advanced&checkout=success&session_id=...` access link.
- For a paid subscription checkout session, submit `/api/billing/portal` and confirm Stripe opens subscription management with a return URL back to `/app`.
- `curl -I http://trimproof.com`
- `curl -I https://trimproof.com` after the certificate is issued
- Browser-check `https://trimproof.com` and `https://trimproof.com/app` for `https://www.googletagmanager.com/gtag/js?id=G-9VNCX1HGN5`
- Confirm `/api/health` reports `serverAnalyticsConfigured: true` when `GA4_API_SECRET` is set.
- Submit the launch-list form and confirm `/api/email-signup` returns an `email.confirmation.status`; `sent` means provider delivery was accepted, `skipped` means the signup was saved but no provider was configured.
