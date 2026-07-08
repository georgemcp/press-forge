import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { verifyPaidCheckoutSession } from "@/lib/billing/paid-session";

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
    const session = await verifyPaidCheckoutSession(sessionId);
    if (session?.customerEmail && session.customerEmail.trim().toLowerCase() !== account.email) {
      return NextResponse.json({ paid: false, error: "This checkout belongs to a different account email." }, { status: 403 });
    }
    return NextResponse.json({
      paid: Boolean(session),
      session
    });
  } catch (error) {
    return NextResponse.json(
      {
        paid: false,
        error: error instanceof Error ? error.message : "Checkout session verification failed."
      },
      { status: 402 }
    );
  }
}
