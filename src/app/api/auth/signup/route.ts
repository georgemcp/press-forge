import { NextResponse } from "next/server";
import { accountProfileSchema, profileToUserUpdate } from "@/lib/auth/account-profile";
import { isAccountAuthConfigured } from "@/lib/auth/account-session";
import { createAnonSupabaseClient, createServiceSupabaseClient } from "@/lib/db/supabase";
import { checkRateLimit, getRequestIp, isSameOriginMutation, rateLimitResponse } from "@/lib/security/request";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function acceptedSignupResponse(formPost: boolean, request: Request) {
  return formPost
    ? NextResponse.redirect(new URL("/login?check_email=1", request.url), { status: 303 })
    : NextResponse.json({
        ok: true,
        requiresEmailConfirmation: true,
        message: "Check your email and verify your address before signing in."
      }, { status: 202 });
}

function isExistingAccountResponse(
  user: { identities?: unknown[] | null } | null,
  error: { code?: string; message: string } | null
) {
  if (user?.identities?.length === 0) {
    return true;
  }
  return error?.code === "user_already_exists" || /already (?:registered|exists)/i.test(error?.message ?? "");
}

async function persistMarketingConsent(email: string, source: string) {
  const serviceClient = createServiceSupabaseClient();
  if (!serviceClient) {
    console.error("Trim Proof signup marketing consent persistence is unavailable");
    return;
  }

  try {
    const { error } = await serviceClient.from("email_signups").upsert(
      { email, source },
      { onConflict: "email" }
    );
    if (error) {
      console.error("Trim Proof signup marketing consent persistence failed");
    }
  } catch {
    console.error("Trim Proof signup marketing consent persistence failed");
  }
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
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Cross-site signup requests are not allowed." }, { status: 403 });
  }
  const rateLimit = checkRateLimit({
    namespace: "account-signup",
    key: getRequestIp(request),
    limit: 5,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, "Too many account creation attempts. Try again later.");
  }

  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: "Account signup is not configured." }, { status: 503 });
  }

  const { formPost, payload } = await readSignupPayload(request);
  const parsed = accountProfileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Complete the required account fields before starting Trim Proof." }, { status: 400 });
  }

  const authClient = createAnonSupabaseClient();
  if (!authClient) {
    return NextResponse.json({ error: "Supabase account service is not configured." }, { status: 503 });
  }

  const profile = profileToUserUpdate(parsed.data);
  let authResult;
  try {
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const emailRedirectTo = new URL("/login?verified=1", appOrigin).toString();
    authResult = await authClient.auth.signUp({
      email: profile.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: profile.full_name,
          company_name: profile.company_name,
          role: profile.role,
          company_website: profile.company_website,
          phone: profile.phone,
          monthly_print_jobs: profile.monthly_print_jobs,
          primary_use_case: profile.primary_use_case,
          plan_interest: profile.plan_interest,
          marketing_consent: profile.marketing_consent
        }
      }
    });
  } catch (error) {
    console.error("Trim Proof account signup auth request failed", {
      error: getErrorMessage(error)
    });
    return NextResponse.json({ error: "Account signup is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }

  if (isExistingAccountResponse(authResult.data.user, authResult.error)) {
    return acceptedSignupResponse(formPost, request);
  }

  if (authResult.error || !authResult.data.user) {
    return NextResponse.json({ error: "Account could not be created." }, { status: 400 });
  }

  if (profile.marketing_consent) {
    await persistMarketingConsent(profile.email, `account_${profile.plan_interest}`);
  }

  return acceptedSignupResponse(formPost, request);
}
