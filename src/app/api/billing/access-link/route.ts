import { z } from "zod";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/billing/stripe";
import { verifyPaidCheckoutSession } from "@/lib/billing/paid-session";
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function accessLinkEmail(email: string, order: AccessOrder, accessUrl: string) {
  const label = order.entitlement === "subscription" ? "Trim Proof Pro subscription" : "Trim Proof export credit";
  const safeAccessUrl = escapeHtml(accessUrl);
  const safeEmail = escapeHtml(email);
  const text = [
    `Your ${label} access link is ready.`,
    "",
    "Open this link to unlock advanced PDF/X export mode:",
    accessUrl,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "Trim Proof"
  ].join("\n");

  return {
    to: email,
    subject: "Your Trim Proof access link",
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h1 style="font-size:22px;margin:0 0 12px">Your ${escapeHtml(label)} access link is ready.</h1>
        <p>Open this link to unlock advanced PDF/X export mode:</p>
        <p><a href="${safeAccessUrl}">Open Trim Proof advanced mode</a></p>
        <p style="font-size:13px;color:#6b7280">Billing email: ${safeEmail}</p>
        <p>If you did not request this, you can ignore this email.</p>
        <p>Trim Proof</p>
      </div>
    `
  };
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
  const delivery = await sendTransactionalEmail(accessLinkEmail(email, order, accessUrl));
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
