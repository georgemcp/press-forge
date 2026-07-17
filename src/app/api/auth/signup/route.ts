import { NextResponse } from "next/server";
import { accountProfileSchema, profileToUserUpdate } from "@/lib/auth/account-profile";
import { isAccountAuthConfigured } from "@/lib/auth/account-session";
import { createAnonSupabaseClient, createServiceSupabaseClient } from "@/lib/db/supabase";
import { checkRateLimit, getRequestIp, isSameOriginMutation, rateLimitResponse } from "@/lib/security/request";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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
  const serviceClient = createServiceSupabaseClient();
  if (!authClient || !serviceClient) {
    return NextResponse.json({ error: "Supabase account services are not configured." }, { status: 503 });
  }

  const profile = profileToUserUpdate(parsed.data);
  let authUser;
  let authError;
  try {
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const emailRedirectTo = new URL("/login?verified=1", appOrigin).toString();
    const authResult = await authClient.auth.signUp({
      email: profile.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: profile.full_name,
          company_name: profile.company_name,
          role: profile.role,
          plan_interest: profile.plan_interest
        }
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
    const isExisting = authError?.message.toLowerCase().includes("already");
    return NextResponse.json(
      { error: isExisting ? "Check your email for a verification link, or sign in if the account already exists." : "Account could not be created." },
      { status: isExisting ? 202 : 400 }
    );
  }

  const { error: profileError } = await serviceClient.from("users").upsert(
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

  await serviceClient.from("email_signups").upsert(
    {
      email: profile.email,
      source: `account_${profile.plan_interest}`
    },
    {
      onConflict: "email"
    }
  );

  const response = formPost
    ? NextResponse.redirect(new URL("/login?check_email=1", request.url), { status: 303 })
    : NextResponse.json({
        ok: true,
        requiresEmailConfirmation: true,
        message: "Check your email and verify your address before signing in."
      }, { status: 202 });
  return response;
}
