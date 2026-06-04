import { NextResponse } from "next/server";
import { verifyPaidCheckoutSession } from "@/lib/billing/paid-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing checkout session ID." }, { status: 400 });
  }

  try {
    const session = await verifyPaidCheckoutSession(sessionId);
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
