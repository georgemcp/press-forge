# Trim Proof Admin Center

The admin center lives at `/admin` and is protected by a signed HTTP-only session cookie.

## Required Env

```bash
TRIMPROOF_ADMIN_PASSWORD=...
TRIMPROOF_ADMIN_SESSION_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
```

Use a long random value for `TRIMPROOF_ADMIN_SESSION_SECRET`. The password is checked server-side and is never exposed to the browser.

## Optional Margin Assumptions

```bash
TRIMPROOF_EXPORT_PRICE_CENTS=900
TRIMPROOF_SUBSCRIPTION_PRICE_CENTS=2900
TRIMPROOF_STRIPE_FEE_BPS=290
TRIMPROOF_STRIPE_FIXED_FEE_CENTS=30
TRIMPROOF_ESTIMATED_PROOF_COST_CENTS=18
```

These values drive contribution margin reporting until exact provider COGS ingestion is added. Stripe fee math is an estimate and excludes tax, disputes, currency conversion, and any negotiated pricing.

## Current Views

- KPIs: revenue, contribution profit, margin, subscriptions, accounts, paid orders, and proof usage.
- Accounts: known emails from Supabase users, launch signups, and Stripe checkout orders.
- Subscriptions: active and expired subscription checkout records with Stripe dashboard links.
- Order ledger: export credits and subscriptions by status.
- Usage: generated proof folders, pass/fail status, provider hints, file count, and storage footprint.
- Readiness: Supabase, Stripe, GA4 server events, email, OpenAI, Gemini, pricing, and margin assumptions.

## Known Gaps

- Recurring invoice revenue is inferred from active subscription run-rate; invoice-level MRR history requires persisting Stripe invoice events.
- Exact AI provider costs are estimated per generated proof; exact OpenAI/Gemini cost ingestion should replace the configured proof-cost assumption.
- Account management is read-first with Stripe dashboard links. Direct refund, comp credit, cancellation, and user-role actions should be added only after role-based admin users exist.
