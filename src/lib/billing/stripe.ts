import Stripe from "stripe";

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

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
