import { NextResponse } from "next/server";
import { ACCOUNT_SESSION_COOKIE, getAccountSessionCookieOptions } from "@/lib/auth/account-session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCOUNT_SESSION_COOKIE, "", {
    ...getAccountSessionCookieOptions(),
    maxAge: 0
  });
  return response;
}
