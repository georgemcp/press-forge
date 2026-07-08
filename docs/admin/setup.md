# Trim Proof Admin Center

The admin center lives at `/admin` and is protected by a signed HTTP-only session cookie.

## Required Env

```bash
TRIMPROOF_ADMIN_PASSWORD=...
TRIMPROOF_ADMIN_SESSION_SECRET=...
TRIMPROOF_ADMIN_EMAIL=owner@example.com
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
```

Use a long random value for `TRIMPROOF_ADMIN_SESSION_SECRET`. The email and password are checked server-side, and only a signed HTTP-only cookie is stored in the browser. Changing `TRIMPROOF_ADMIN_EMAIL` invalidates existing admin sessions.

## Optional Margin Assumptions

```bash
TRIMPROOF_EXPORT_PRICE_CENTS=1200
TRIMPROOF_SUBSCRIPTION_PRICE_CENTS=4900
TRIMPROOF_PRO_MONTHLY_EXPORT_LIMIT=15
TRIMPROOF_STRIPE_FEE_BPS=290
TRIMPROOF_STRIPE_FIXED_FEE_CENTS=30
TRIMPROOF_ESTIMATED_PROOF_COST_CENTS=18
```

These values drive contribution margin reporting until exact provider COGS ingestion is added. Stripe fee math is an estimate and excludes tax, disputes, currency conversion, and any negotiated pricing.

## Current Views

- KPIs: revenue, contribution profit, margin, subscriptions, accounts, paid orders, and proof usage.
- Accounts: known emails from Supabase users, launch signups, Stripe checkout orders, and manually managed account rows.
- Account workspaces: status, notes, last-contact date, account records, order actions, and an audit trail at `/admin/accounts/[email]`.
- Subscriptions: active and expired subscription checkout records with Stripe dashboard links.
- Order ledger: export credits and subscriptions by status.
- Usage: generated proof folders, pass/fail status, provider hints, file count, and storage footprint.
- Audit: recent admin actions from `admin_audit_events`.
- Readiness: Supabase, Stripe, GA4 server events, email, OpenAI, Gemini, pricing, and margin assumptions.

## Management Actions

All management actions re-check the signed admin session server-side before mutating data.

- Save account status, notes, and last-contact date.
- Open a Stripe Customer Portal session for a customer.
- Resend an access link for active paid orders.
- Expire local order access.
- Create a Stripe refund for orders with a payment intent and mark the order refunded.
- Cancel a Stripe subscription and expire matching subscription access rows.

## Known Gaps

- Recurring invoice revenue is inferred from active subscription run-rate; invoice-level MRR history requires persisting Stripe invoice events.
- Exact AI provider costs are estimated per generated proof; exact OpenAI/Gemini cost ingestion should replace the configured proof-cost assumption.
- Role-based admin users should replace the single super-admin credential before adding multi-operator permissions or support-staff roles.
