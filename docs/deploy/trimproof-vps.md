# Trim Proof VPS Deployment

Production target:

- Domain: `trimproof.com`
- VPS: `srv1169050.hstgr.cloud`
- Public IP: `148.230.84.75`
- App directory: `/opt/trimproof`
- Local app port behind nginx: `3047`
- Supabase project: `justcsfgntvtbxprcnoh`
- Stripe prices: export credit `price_1TfLrqRy14ye40TRZGwCYsyi`; monthly subscription `price_1TfLrqRy14ye40TRwqtdoH7W`
- Stripe Customer Portal configuration: `bpc_1TelBzRy14ye40TRGJb4wixa`
- GA4 property: `properties/540469930` (Trim Proof), verified against the live measurement ID on `2026-09-14`; web stream `15016978016`; measurement ID `G-20N2FZHDHV`. The formerly documented property `499598107` belongs to a different site and must not be used for Trim Proof reporting.
- Google Search Console: domain property `trimproof.com` verified under the Bare Getaways Google account on `2026-06-06` by DNS provider verification; sitemap `/sitemap.xml` reads as `Success`, last read `2026-06-06`, with 23 discovered pages.
- Transactional email: SendGrid from `launch@trimproof.com`; replies to `support@trimproof.com`; admin notifications and admin login use the private `TRIMPROOF_ADMIN_EMAIL` deployment setting. Admin credentials were configured and browser-verified on `2026-09-14`; never put a plaintext password in deployment files or logs.
- TLS: Let's Encrypt certificate at `/etc/letsencrypt/live/trimproof.com/`, expiring `2026-09-02` with scheduled auto-renewal

The app is deployed with Docker Compose. Nginx terminates public HTTP/HTTPS and proxies to the app container on `127.0.0.1:3047`.
Public `NEXT_PUBLIC_*` variables are passed as Docker build args so statically rendered marketing pages include analytics tags after rebuilds. Set the release revision before each production rebuild so the image carries auditable OCI source metadata, then wait for all native health checks:

```sh
TRIMPROOF_IMAGE_REVISION="$(tr -d '\r\n' < .release-commit)"
if ! printf '%s\n' "$TRIMPROOF_IMAGE_REVISION" | grep -Eq '^[0-9a-f]{40}$'; then
  printf '%s\n' 'Invalid or missing .release-commit marker.' >&2
  exit 1
fi
export TRIMPROOF_IMAGE_REVISION
docker compose -p trimproof --env-file .env.production -f docker-compose.prod.yml up -d --build --wait
```

`TRIMPROOF_IMAGE_SOURCE` defaults to `https://github.com/georgemcp/press-forge`. Override it only when building from a different canonical source repository. If `TRIMPROOF_IMAGE_REVISION` is omitted, the image label is deliberately `unknown` rather than claiming an unverified commit.

The production image uses Node 24 LTS on Bookworm Slim, and both Node and Redis retain human-readable tags while pinning their multi-platform image digests for reproducible base-image resolution. Before web or worker startup, the one-shot `generated-volume-init` service sets the shared proof volume root to UID/GID `1000:1000` with mode `0750`; it has no network, a read-only root filesystem, and only the `CHOWN` capability. The production Compose file otherwise applies non-root execution, drops Linux capabilities, blocks privilege escalation, and sets adjustable CPU, memory, and process limits. Override `TRIMPROOF_WEB_CPUS`, `TRIMPROOF_WEB_MEMORY_LIMIT`, `TRIMPROOF_WORKER_CPUS`, `TRIMPROOF_WORKER_MEMORY_LIMIT`, `TRIMPROOF_REDIS_CPUS`, or `TRIMPROOF_REDIS_MEMORY_LIMIT` in the deployment shell only when the VPS capacity requires different budgets.

Install `deploy/nginx.trimproof.conf` as a site file included from nginx's `http` context (the rate-limit zones and WebSocket map must remain outside the `server` block), then validate before reloading:

```sh
sudo install -m 0644 deploy/nginx.trimproof.conf /etc/nginx/sites-available/trimproof.com
sudo ln -sfn /etc/nginx/sites-available/trimproof.com /etc/nginx/sites-enabled/trimproof.com
sudo nginx -t
sudo systemctl reload nginx
```

Required production env:

- `NEXT_PUBLIC_APP_URL=https://trimproof.com`
- `REDIS_URL=redis://redis:6379`
- `TRIMPROOF_GENERATED_DIR=/app/.trimproof-generated`
- `STRIPE_SECRET_KEY`, `STRIPE_EXPORT_PRICE_ID`, `STRIPE_SUBSCRIPTION_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PORTAL_CONFIGURATION_ID` when the app should use a specific Stripe Customer Portal configuration
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `GA4_PROPERTY_ID`, `GOOGLE_ANALYTICS_PROPERTY_ID`, or `NEXT_PUBLIC_GTM_CONTAINER_ID` when analytics tags are live
- `GA4_API_SECRET` or `GA4_MEASUREMENT_PROTOCOL_API_SECRET` when verified Stripe/webhook purchases, launch signups, checkout starts, and proof exports should send server-side GA4 conversion events
- `TRIMPROOF_ADMIN_EMAIL`, `TRIMPROOF_ADMIN_PASSWORD_HASH`, and `TRIMPROOF_ADMIN_SESSION_SECRET` for the protected `/admin` management center; only a scrypt password hash is accepted in every environment
- `TRIMPROOF_HEALTH_TOKEN` for authenticated detailed readiness checks; public `/api/health` exposes liveness only
- `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `TRIMPROOF_ADMIN_EMAIL`, and either `RESEND_API_KEY` or `SENDGRID_API_KEY` when transactional signup email is live
- `OPENAI_API_KEY` and/or `GEMINI_API_KEY` when creative image providers are enabled
- `OPENAI_IMAGE_MODEL=gpt-image-2` and `GEMINI_IMAGE_MODEL=gemini-3-pro-image` for the current premium creative model defaults
- `TRIMPROOF_EXPORT_PRICE_CENTS`, `TRIMPROOF_SUBSCRIPTION_PRICE_CENTS`, `TRIMPROOF_PRO_MONTHLY_EXPORT_LIMIT`, `TRIMPROOF_STRIPE_FEE_BPS`, `TRIMPROOF_STRIPE_FIXED_FEE_CENTS`, and `TRIMPROOF_ESTIMATED_PROOF_COST_CENTS` when admin contribution-margin assumptions need to differ from defaults

Production email DNS:

- SendGrid authenticated domain ID: `31303631`
- `em.trimproof.com` CNAME `u56539253.wl004.sendgrid.net`
- `s1._domainkey.trimproof.com` CNAME `s1.domainkey.u56539253.wl004.sendgrid.net`
- `s2._domainkey.trimproof.com` CNAME `s2.domainkey.u56539253.wl004.sendgrid.net`
- Validation status on `2026-06-04`: `valid=true` for return-path and both DKIM records.

Production Google DNS and files:

- Search Console domain verification TXT on root: `google-site-verification=bd3Ho8LUomJBMjQUbjya7pEtTmAsqcXCapvzVBidFcw`
- Google Workspace domain verification TXT on root: `google-site-verification=Ndt3tGj37UhmgAO5WXtEHubtioeRvj-yve6TAOIoz0E`
- Search Console URL-prefix verification file: `/google43b9c98a02f6c033.html`
- Sitemap submitted in Search Console for the Bare Getaways domain property: `https://trimproof.com/sitemap.xml`; Search Console status: `Success`, last read `2026-06-06`, discovered pages `23`.

Verification:

- `docker compose -p trimproof -f docker-compose.prod.yml ps`
- Confirm `generated-volume-init` exits with code `0`, and `web`, `worker`, and `redis` report `healthy`; web checks the public liveness route, worker verifies Redis connectivity through its configured URL, and Redis uses `redis-cli ping`.
- Confirm the generated volume root reports UID/GID `1000:1000` and mode `750`; the worker performs a forced stale-proof cleanup at startup and hourly thereafter.
- `docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }} {{ index .Config.Labels "org.opencontainers.image.source" }}' "$(docker compose -p trimproof --env-file .env.production -f docker-compose.prod.yml images -q web)"` should report the deployed Git commit and canonical repository.
- `curl http://127.0.0.1:3047/api/health`
- Confirm `/api/health` reports `stripeCheckoutConfigured`, `stripeWebhookConfigured`, and `stripePortalConfigured` as `true` before treating paid exports and subscription management as live.
- Visit `/app` in a fresh browser context and confirm it redirects to `/signup?next=...`; create an account before demo use.
- Generate a signed-in demo proof in `/app` and verify demo art/previews are visibly watermarked while production PDF, source PDF, and SVG downloads remain locked.
- Start a Checkout Session from signed-in `/app?mode=advanced` and confirm Stripe opens a Trim Proof-branded hosted Checkout page using the account email.
- Confirm the Stripe webhook endpoint is subscribed to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` so paid access follows refunds, failed payments, recoveries, and cancellations.
- Submit `/api/billing/access-link` while signed in and confirm active subscriptions or unused export credits receive an emailed `/app?mode=advanced&checkout=success&session_id=...` access link for that same account email.
- For a paid subscription checkout session, submit `/api/billing/portal` and confirm Stripe opens subscription management with a return URL back to `/app`.
- `curl -I http://trimproof.com`
- `curl -I https://trimproof.com` after the certificate is issued
- Confirm the HTTPS response includes HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`, omits `X-Powered-By`, and does not expose the nginx version.
- Confirm `https://trimproof.com/leviathan.html` returns `404`; the retired embedded command-center page must not be restored from an older release.
- Browser-check `https://trimproof.com` and `https://trimproof.com/app` for `https://www.googletagmanager.com/gtag/js?id=G-20N2FZHDHV`
- Confirm `https://trimproof.com/google43b9c98a02f6c033.html` returns the Search Console verification file and `dig TXT trimproof.com` includes the domain verification token.
- Confirm `https://trimproof.com/sitemap.xml` returns HTTP 200 with `application/xml` and remains listed in `robots.txt`.
- Confirm `/api/health` reports `serverAnalyticsConfigured: true` when `GA4_API_SECRET` is set.
- Confirm `/privacy` remains published before sending GA4 Measurement Protocol events.
- Visit `/admin/login`, authenticate with the production admin password, and confirm `/admin` loads account, subscription, order, usage, margin, and readiness sections.
- Submit the launch-list form and confirm `/api/email-signup` returns an `email.confirmation.status`; `sent` means provider delivery was accepted, `skipped` means the signup was saved but no provider was configured.

## Release, read-back and rollback

This section fills the gaps the 2026-10-17 deploy packet listed as undocumented. It adds no new scripts: every command reuses the Docker Compose, image-inspect and nginx invocations already in this guide. `<TARGET_SHA>` means the full 40-hex commit on `origin/main` at release time; `<PREVIOUS_SHA>` means the sha currently labelled on the running image.

### Source delivery

Nothing in this repository moves a release tree into `/opt/trimproof`: there is no `git pull`, `rsync` or tarball step, and CI builds and tests but never deploys. The operator performs the delivery and records how. Operator to confirm whether `/opt/trimproof` is a git checkout:

```sh
test -d /opt/trimproof/.git && echo "git checkout" || echo "not a git checkout"
```

If it is a checkout, deliver the exact release commit there and prove the tree:

```sh
git -C /opt/trimproof fetch origin
git -C /opt/trimproof checkout --detach <TARGET_SHA>
git -C /opt/trimproof rev-parse HEAD      # must equal <TARGET_SHA>
git -C /opt/trimproof status --porcelain  # only .release-commit may appear; see next section
```

If it is not a checkout, operator to confirm and record exactly how the tree arrived (for example an extracted `git archive` of `<TARGET_SHA>`) and show that its contents match the target commit before building. Do not guess.

### `.release-commit` marker

The build block above reads `.release-commit`, but no repository command writes it. Write exactly the target 40-hex sha, nothing else:

```sh
cd /opt/trimproof && printf '%s\n' <TARGET_SHA> > .release-commit
tr -d '\r\n' < .release-commit | grep -Eq '^[0-9a-f]{40}$' && echo MARKER_OK
```

`.release-commit` is not in `.gitignore`; it is expected to show as untracked and must not be committed. A missing or invalid marker aborts the build; a stale but valid marker silently labels the image with an **old** sha, so always compare the image label during read-back rather than trusting build success.

### Migrations

Forward-only SQL lives in `supabase/migrations/`. The repository documents no apply command (no `supabase db push` or equivalent) and CI does not run migrations. Before building, compare the deployed and target commits:

```sh
git -C /opt/trimproof diff --name-only <PREVIOUS_SHA> <TARGET_SHA> -- supabase/migrations
```

- Empty output: this release has no schema dependency.
- Any file listed: **STOP.** Applying it is a production database write on project `justcsfgntvtbxprcnoh` and needs its own named GO from claude-fleet after a dry run. It is not covered by the deploy GO.
- If the running image label is `unknown` or `<no value>`, `<PREVIOUS_SHA>` is unusable; operator to confirm the previously deployed sha before claiming the diff is empty.

Migrations are forward-only. Do not attempt a database rollback without a separate GO.

### Read-back

Run these on the VPS after `up -d --build --wait` and before calling the release live:

```sh
cd /opt/trimproof
C="docker compose -p trimproof --env-file .env.production -f docker-compose.prod.yml"

cat .release-commit                 # must equal <TARGET_SHA>
$C ps                               # generated-volume-init Exited (0); web, worker, redis healthy
docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }} {{ index .Config.Labels "org.opencontainers.image.source" }}' "$($C images -q web)"
#   expect: <TARGET_SHA> https://github.com/georgemcp/press-forge
docker image inspect --format '{{.Id}}' "$($C images -q web)"; docker inspect --format '{{.Image}}' "$($C ps -q web)"
docker image inspect --format '{{.Id}}' "$($C images -q worker)"; docker inspect --format '{{.Image}}' "$($C ps -q worker)"
#   the two ids must match for each service
curl -fsS http://127.0.0.1:3047/api/health
```

Then run the public and functional checks in **Verification** above. Public `/api/health` carries no commit sha, so the OCI label plus the container/image id match is the only proof of which commit is live; operator to confirm the deployed identity in the token-authenticated readiness response as well.

### Rollback

Rollback was undocumented before this section. Both options are derived from Compose behaviour and have not been executed; operator to confirm the Compose image names on the VPS before relying on Option A.

Capture the running images before every deploy, under a recorded suffix:

```sh
cd /opt/trimproof
C="docker compose -p trimproof --env-file .env.production -f docker-compose.prod.yml"
RB=$(date -u +%Y%m%d%H%M%S)
docker tag "$($C images -q web)" "trimproof-rollback-web:$RB"
docker tag "$($C images -q worker)" "trimproof-rollback-worker:$RB"
echo "rollback tag: $RB"
```

If `$C images -q web` returns nothing, there is no previous image to roll back to; record that instead.

**Option A — restore the captured images.** `web` and `worker` have no `image:` key in `docker-compose.prod.yml`, so Compose builds and names them `<project>-<service>`, assumed here to be `trimproof-web` and `trimproof-worker`. Operator to confirm those names with `$C images` before running:

```sh
docker tag "trimproof-rollback-web:$RB" trimproof-web:latest
docker tag "trimproof-rollback-worker:$RB" trimproof-worker:latest
$C up -d --no-build --wait
```

**Option B — rebuild the previous sha.** Restore the previous source tree and write `<PREVIOUS_SHA>` to `.release-commit`, then rerun the documented build block above. Base images are digest-pinned, so the rebuild is reproducible.

After either rollback, rewrite `.release-commit` to the restored sha and repeat **Read-back**, expecting the previous sha. For nginx, restore the pre-change site-file copy if one was taken, then `sudo nginx -t && sudo systemctl reload nginx`.
