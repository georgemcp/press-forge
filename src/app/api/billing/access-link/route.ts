import { z } from "zod";
import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { getAppUrl } from "@/lib/billing/stripe";
import { verifyPaidCheckoutSession } from "@/lib/billing/paid-session";
import { buildAccessLinkEmail } from "@/lib/billing/access-link-email";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { sendTransactionalEmail } from "@/lib/email/transactional";
import { checkRateLimit, getRequestIp, rateLimitResponse } from "@/lib/security/request";

export const runtime = "nodejs";

const accessLinkSchema = z.object({
  email: z.string().email()
});

type AccessOrder = {
  stripe_session_id: string;
  entitlement: string;
  status: string;
  customer_email: string | null;
  created_at: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findReusableOrder(account: { userId: string; email: string }) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return { order: undefined, error: "Supabase service client is not configured." };
  }

  const { data, error } = await supabase
    .from("export_orders")
    .select("stripe_session_id, entitlement, status, customer_email, created_at")
    .eq("customer_email", account.email)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return { order: undefined, error: error.message };
  }

  for (const order of (data ?? []) as AccessOrder[]) {
    try {
      const session = await verifyPaidCheckoutSession(order.stripe_session_id, account);
      if (session && !session.consumed) {
        return { order, error: undefined };
      }
    } catch {
      // Skip stale, refunded, cancelled, or otherwise invalid paid sessions.
    }
  }

  return { order: undefined, error: undefined };
}

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Sign in before requesting an access link." }, { status: 401 });
  }
  const rateLimit = checkRateLimit({
    namespace: "billing-access-link",
    key: `${account.userId}:${getRequestIp(request)}`,
    limit: 3,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, "Access-link request limit reached. Try again later.");
  }

  const payload = await request.json().catch(() => undefined);
  const parsed = accessLinkSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid billing email." }, { status: 400 });
  }

  const requestedEmail = normalizeEmail(parsed.data.email);
  if (requestedEmail !== account.email) {
    return NextResponse.json({ error: "Access links can only be requested for the signed-in account email." }, { status: 403 });
  }

  const email = account.email;
  const { order, error } = await findReusableOrder(account);
  if (error) {
    return NextResponse.json({ error }, { status: 503 });
  }
  if (!order) {
    return NextResponse.json({
      ok: true,
      matched: false,
      email: {
        status: "skipped",
        configured: false,
        reason: "No active subscription or unused export credit was found for this billing email."
      }
    });
  }

  const accessUrl = `${getAppUrl()}/app?mode=advanced&checkout=success&session_id=${encodeURIComponent(order.stripe_session_id)}`;
  const delivery = await sendTransactionalEmail(buildAccessLinkEmail(email, order, accessUrl));
  if (delivery.status === "failed") {
    console.error("Trim Proof access link email failed", {
      provider: delivery.provider,
      status: delivery.status
    });
  }

  return NextResponse.json({
    ok: true,
    matched: true,
    entitlement: order.entitlement,
    email: delivery
  });
}
