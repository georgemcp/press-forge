import Stripe from "stripe";
import { getConfiguredAppOrigin } from "@/lib/security/request";

let stripeClient: Stripe | undefined;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return undefined;
  }
  stripeClient ??= new Stripe(secretKey, {
    apiVersion: "2026-05-27.dahlia"
  });
  return stripeClient;
}

export function getExportPriceId() {
  return process.env.STRIPE_EXPORT_PRICE_ID;
}

/**
 * Absolute origin for customer-facing links (Stripe return URLs, access
 * links). It comes only from the configured site origin, never from the
 * request Host / X-Forwarded-Host headers. Production fails closed when no
 * valid origin is configured; local development falls back to localhost.
 */
export function getAppUrl(): string | undefined {
  return getConfiguredAppOrigin() ?? (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000");
}
