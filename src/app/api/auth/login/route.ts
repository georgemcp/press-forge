import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCOUNT_SESSION_COOKIE, createAccountSessionValue, getAccountSessionCookieOptions, isAccountAuthConfigured } from "@/lib/auth/account-session";
import { createAnonSupabaseClient } from "@/lib/db/supabase";
import { safeInternalPath } from "@/lib/security/navigation";
import { checkRateLimit, getRequestIp, isSameOriginMutation, rateLimitResponse } from "@/lib/security/request";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(120)
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function readLoginPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return {
      formPost: false,
      payload: await request.json().catch(() => undefined)
    };
  }

  const formData = await request.formData().catch(() => undefined);
  return {
    formPost: Boolean(formData),
    payload: formData ? Object.fromEntries(formData) : undefined
  };
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Cross-site login requests are not allowed." }, { status: 403 });
  }
  const rateLimit = checkRateLimit({
    namespace: "account-login",
    key: getRequestIp(request),
    limit: 10,
    windowMs: 15 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, "Too many login attempts. Try again in a few minutes.");
  }

  if (!isAccountAuthConfigured()) {
    return NextResponse.json({ error: "Account login is not configured." }, { status: 503 });
  }

  const { formPost, payload } = await readLoginPayload(request);
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your account email and password." }, { status: 400 });
  }

  const supabase = createAnonSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase client is not configured." }, { status: 503 });
  }

  let data;
  let error;
  try {
    const loginResult = await supabase.auth.signInWithPassword({
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password
    });
    data = loginResult.data;
    error = loginResult.error;
  } catch (loginError) {
    console.error("Trim Proof account login request failed", {
      error: getErrorMessage(loginError)
    });
    return NextResponse.json({ error: "Account login is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }

  if (error || !data.user?.email) {
    return NextResponse.json({ error: "That email and password did not match." }, { status: 401 });
  }

  const response = formPost
    ? NextResponse.redirect(new URL(safeInternalPath((payload as { nextPath?: string }).nextPath), request.url), { status: 303 })
    : NextResponse.json({
        ok: true,
        account: {
          id: data.user.id,
          email: data.user.email
        }
      });
  response.cookies.set(
    ACCOUNT_SESSION_COOKIE,
    createAccountSessionValue({
      userId: data.user.id,
      email: data.user.email
    }),
    getAccountSessionCookieOptions()
  );
  return response;
}
