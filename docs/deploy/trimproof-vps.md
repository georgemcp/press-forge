# Trim Proof VPS Deployment

Production target:

- Domain: `trimproof.com`
- VPS: `srv1169050.hstgr.cloud`
- Public IP: `148.230.84.75`
- App directory: `/opt/trimproof`
- Local app port behind nginx: `3047`
- Supabase project: `justcsfgntvtbxprcnoh`
- Stripe prices: export credit `price_1TejgIRy14ye40TRwCxJSBu7`; monthly subscription `price_1TejgJRy14ye40TRgqMqHR9V`
- TLS: Let's Encrypt certificate at `/etc/letsencrypt/live/trimproof.com/`, expiring `2026-09-02` with scheduled auto-renewal

The app is deployed with Docker Compose. Nginx terminates public HTTP/HTTPS and proxies to the app container on `127.0.0.1:3047`.

Required production env:

- `NEXT_PUBLIC_APP_URL=https://trimproof.com`
- `REDIS_URL=redis://redis:6379`
- `TRIMPROOF_GENERATED_DIR=/app/.trimproof-generated`
- `STRIPE_SECRET_KEY`, `STRIPE_EXPORT_PRICE_ID`, `STRIPE_SUBSCRIPTION_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` or `NEXT_PUBLIC_GTM_CONTAINER_ID` when analytics tags are live
- `OPENAI_API_KEY` and/or `GEMINI_API_KEY` when creative image providers are enabled

Verification:

- `docker compose -f docker-compose.prod.yml ps`
- `curl http://127.0.0.1:3047/api/health`
- Generate a proof in `/app` and verify the returned `/api/exports/proof/files/...` URL downloads a PDF.
- `curl -I http://trimproof.com`
- `curl -I https://trimproof.com` after the certificate is issued
