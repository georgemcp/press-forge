import { NextResponse } from "next/server";
import { accountProfileSchema, profileToUserUpdate } from "@/lib/auth/account-profile";
import { ACCOUNT_SESSION_COOKIE, createAccountSessionValue, getAccountSessionCookieOptions, isAccountAuthConfigured } from "@/lib/auth/account-session";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { getAdminSignupRecipients, sendTransactionalEmail } from "@/lib/email/transactional";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function adminSignupNotification(profile: ReturnType<typeof profileToUserUpdate>, recipients: string[]) {
  const lines = [
    "New Trim Proof account",
    `Email: ${profile.email}`,
    `Name: ${profile.full_name}`,
    `Company: ${profile.company_name}`,
    `Role: ${profile.role}`,
    `Website: ${profile.company_website ?? ""}`,
    `Phone: ${profile.phone ?? ""}`,
    `Monthly jobs: ${profile.monthly_print_jobs}`,
    `Use case: ${profile.primary_use_case}`,
    `Plan interest: ${profile.plan_interest}`,
    `Marketing consent: ${profile.marketing_consent ? "yes" : "no"}`,
    `Time: ${profile.onboarding_completed_at}`
  ];

  return {
    to: recipients,
    subject: "New Trim Proof account",
    text: lines.join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h1 style="font-size:20px;margin:0 0 12px">New Trim Proof account</h1>
        <p><strong>Email:</strong> ${escapeHtml(profile.email)}</p>
        <p><strong>Name:</strong> ${escapeHtml(profile.full_name)}</p>
        <p><strong>Company:</strong> ${escapeHtml(profile.company_name)}</p>
        <p><strong>Role:</strong> ${escapeHtml(profile.role)}</p>
        <p><strong>Website:</strong> ${escapeHtml(profile.company_website ?? "")}</p>
        <p><strong>Phone:</strong> ${escapeHtml(profile.phone ?? "")}</p>
        <p><strong>Monthly jobs:</strong> ${escapeHtml(profile.monthly_print_jobs)}</p>
        <p><strong>Use case:</strong> ${escapeHtml(profile.primary_use_case)}</p>
        <p><strong>Plan interest:</strong> ${escapeHtml(profile.plan_interest)}</p>
        <p><strong>Marketing consent:</strong> ${profile.marketing_consent ? "yes" : "no"}</p>
      </div>
    `
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getSafeNextPath(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

async function readSignupPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return {
      formPost: false,
      payload: await request.json().catch(() => undefined)
    };
  }

  const formData = await request.formData().catch(() => undefined);
  if (!formData) {
    return {
      formPost: false,
      payload: undefined
    };
  }

  return {
    formPost: true,
    payload: {
      ...Object.fromEntries(formData),
      marketingConsent: formData.get("marketingConsent") === "on"
    }
  };
}

export async function POST(request: Request) {
  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: "Account signup is not configured." }, { status: 503 });
  }

  const { formPost, payload } = await readSignupPayload(request);
  const parsed = accountProfileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Complete the required account fields before starting Trim Proof." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service client is not configured." }, { status: 503 });
  }

  const profile = profileToUserUpdate(parsed.data);
  let authUser;
  let authError;
  try {
    const authResult = await supabase.auth.admin.createUser({
      email: profile.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name,
        company_name: profile.company_name,
        role: profile.role,
        plan_interest: profile.plan_interest
      }
    });
    authUser = authResult.data;
    authError = authResult.error;
  } catch (error) {
    console.error("Trim Proof account signup auth request failed", {
      error: getErrorMessage(error)
    });
    return NextResponse.json({ error: "Account signup is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }

  if (authError || !authUser.user) {
    const message = authError?.message.toLowerCase().includes("already") ? "An account already exists for this email. Sign in instead." : authError?.message ?? "Account could not be created.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: authUser.user.id,
      ...profile
    },
    {
      onConflict: "id"
    }
  );
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await supabase.from("email_signups").upsert(
    {
      email: profile.email,
      source: `account_${profile.plan_interest}`
    },
    {
      onConflict: "email"
    }
  );

  const recipients = getAdminSignupRecipients();
  const adminNotification = recipients?.length
    ? await sendTransactionalEmail(adminSignupNotification(profile, recipients))
    : {
        status: "skipped" as const,
        configured: false,
        reason: "Admin notification recipient is not configured."
      };

  if (adminNotification.status === "failed") {
    console.error("Trim Proof account signup notification failed", {
      provider: adminNotification.provider,
      reason: adminNotification.reason
    });
  }

  const response = formPost
    ? NextResponse.redirect(new URL(getSafeNextPath((payload as { nextPath?: string }).nextPath), request.url), { status: 303 })
    : NextResponse.json({
        ok: true,
        account: {
          id: authUser.user.id,
          email: profile.email,
          fullName: profile.full_name,
          companyName: profile.company_name
        },
        email: {
          adminNotification
        }
      });
  response.cookies.set(
    ACCOUNT_SESSION_COOKIE,
    createAccountSessionValue({
      userId: authUser.user.id,
      email: profile.email
    }),
    getAccountSessionCookieOptions()
  );
  return response;
}
