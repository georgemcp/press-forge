import { z } from "zod";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { sendServerAnalyticsEvent } from "@/lib/analytics/server-events";
import { getAdminSignupRecipients, sendTransactionalEmail } from "@/lib/email/transactional";
import { checkRateLimit, getRequestIp, rateLimitResponse } from "@/lib/security/request";

const analyticsSchema = z
  .object({
    gaClientId: z.string().min(1).max(120).optional(),
    gaSessionId: z.string().min(1).max(120).optional(),
    pagePath: z.string().min(1).max(240).optional()
  })
  .optional();

const emailSignupSchema = z.object({
  email: z.string().email(),
  source: z.string().min(1).max(80).default("unknown"),
  analytics: analyticsSchema
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function numericSessionId(value?: string) {
  const sessionId = Number(value);
  return Number.isFinite(sessionId) && sessionId > 0 ? sessionId : undefined;
}

function confirmationEmail(email: string) {
  const safeEmail = escapeHtml(email);
  const text = [
    "You're on the Press Forge launch list.",
    "",
    "Press Forge is an AI-powered print design studio. Describe your vision, upload references, and let AI generate print-ready PDF/X files with bleed, crop marks, vector text, CMYK, and preflight validation.",
    "",
    "Create an account at https://pressforge.com/signup to start designing, or use advanced mode when you need a paid production export.",
    "",
    "Press Forge"
  ].join("\n");

  return {
    to: email,
    subject: "You're on the Press Forge launch list",
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h1 style="font-size:22px;margin:0 0 12px">You're on the Press Forge launch list.</h1>
        <p>Press Forge is an AI-powered print design studio. Describe your vision, upload references, and let AI generate print-ready PDF/X files with bleed, crop marks, vector text, CMYK, and preflight validation.</p>
        <p><a href="https://pressforge.com/signup">Create an account</a> to start designing, or use advanced mode when you need a paid production export.</p>
        <p style="font-size:13px;color:#6b7280">Signup email: ${safeEmail}</p>
        <p>Press Forge</p>
      </div>
    `
  };
}

function adminNotificationEmail(email: string, source: string, recipients: string[]) {
  const timestamp = new Date().toISOString();
  const text = [`New Trim Proof signup`, `Email: ${email}`, `Source: ${source}`, `Time: ${timestamp}`].join("\n");

  return {
    to: recipients,
    subject: "New Trim Proof launch signup",
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h1 style="font-size:20px;margin:0 0 12px">New Trim Proof signup</h1>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Source:</strong> ${escapeHtml(source)}</p>
        <p><strong>Time:</strong> ${timestamp}</p>
      </div>
    `
  };
}

export async function POST(request: Request) {
  const ipLimit = checkRateLimit({
    namespace: "email-signup-ip",
    key: getRequestIp(request),
    limit: 5,
    windowMs: 60 * 60 * 1000
  });
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit, "Too many signup requests. Try again later.");
  }

  const payload = await request.json().catch(() => undefined);
  const parsed = emailSignupSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email signup payload." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const emailLimit = checkRateLimit({
    namespace: "email-signup-address",
    key: email,
    limit: 1,
    windowMs: 24 * 60 * 60 * 1000
  });
  if (!emailLimit.allowed) {
    return rateLimitResponse(emailLimit, "This email was already submitted recently.");
  }

  const supabase = createServiceSupabaseClient();
  let isNewSignup = true;
  if (supabase) {
    const { data: existing, error: lookupError } = await supabase
      .from("email_signups")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (lookupError) {
      return NextResponse.json({ error: "Signup could not be saved." }, { status: 503 });
    }
    isNewSignup = !existing;
    if (isNewSignup) {
      const { error } = await supabase.from("email_signups").insert({ email, source: parsed.data.source });
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        return NextResponse.json({ error: "Signup could not be saved." }, { status: 503 });
      }
      if (error) {
        isNewSignup = false;
      }
    }
  }

  if (!isNewSignup) {
    return NextResponse.json({
      ok: true,
      persisted: Boolean(supabase),
      email: {
        confirmation: { status: "skipped", configured: true, reason: "Email already registered." },
        adminNotification: { status: "skipped", configured: true, reason: "Email already registered." }
      }
    });
  }

  const confirmation = await sendTransactionalEmail(confirmationEmail(email));
  const adminRecipients = getAdminSignupRecipients();
  const adminNotification = adminRecipients?.length
    ? await sendTransactionalEmail(adminNotificationEmail(email, parsed.data.source, adminRecipients))
    : {
        status: "skipped" as const,
        configured: false,
        reason: "Admin notification recipient is not configured."
      };

  if (confirmation.status === "failed" || adminNotification.status === "failed") {
    console.error("Trim Proof email signup notification failed", {
      confirmationStatus: confirmation.status,
      confirmationProvider: confirmation.provider,
      adminStatus: adminNotification.status,
      adminProvider: adminNotification.provider
    });
  }

  const analytics = await sendServerAnalyticsEvent({
    name: "generate_lead",
    clientId: parsed.data.analytics?.gaClientId,
    params: {
      source: parsed.data.source,
      page_path: parsed.data.analytics?.pagePath,
      session_id: numericSessionId(parsed.data.analytics?.gaSessionId),
      currency: "USD",
      value: 0
    }
  });
  if (analytics.status === "failed") {
    console.error("Trim Proof server analytics event failed", {
      event: "generate_lead",
      provider: analytics.provider,
      reason: analytics.reason
    });
  }

  return NextResponse.json({
    ok: true,
    persisted: Boolean(supabase),
    analytics,
    email: {
      confirmation,
      adminNotification
    }
  });
}
