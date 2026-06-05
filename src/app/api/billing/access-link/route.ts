import { z } from "zod";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/billing/stripe";
import { verifyPaidCheckoutSession } from "@/lib/billing/paid-session";
import { buildAccessLinkEmail } from "@/lib/billing/access-link-email";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { sendTransactionalEmail } from "@/lib/email/transactional";

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

async function findReusableOrder(email: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return { order: undefined, error: "Supabase service client is not configured." };
  }

  const { data, error } = await supabase
    .from("export_orders")
    .select("stripe_session_id, entitlement, status, customer_email, created_at")
    .ilike("customer_email", email)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return { order: undefined, error: error.message };
  }

  for (const order of (data ?? []) as AccessOrder[]) {
    try {
      const session = await verifyPaidCheckoutSession(order.stripe_session_id);
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
  const payload = await request.json().catch(() => undefined);
  const parsed = accessLinkSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid billing email." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const { order, error } = await findReusableOrder(email);
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
