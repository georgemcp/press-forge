import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { verifyPaidCheckoutSession } from "@/lib/billing/paid-session";
import { describeServerError } from "@/lib/security/server-error";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Sign in before verifying checkout access." }, { status: 401 });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing checkout session ID." }, { status: 400 });
  }

  try {
    const session = await verifyPaidCheckoutSession(sessionId, account);
    return NextResponse.json({
      paid: Boolean(session),
      session
    });
  } catch (error) {
    console.error("Trim Proof checkout session verification failed", {
      error: describeServerError(error)
    });
    return NextResponse.json(
      {
        paid: false,
        error: "Checkout session could not be verified. Try again later."
      },
      { status: 402 }
    );
  }
}
