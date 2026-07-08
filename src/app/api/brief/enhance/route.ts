import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { enhanceBrief } from "@/lib/ai/brief-enhancer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json(
      { error: "Create an account to use AI brief enhancement." },
      { status: 401 }
    );
  }

  const payload = (await request.json().catch(() => ({}))) as {
    brief?: string;
    productType?: string;
    referenceImageDescriptions?: string[];
  };

  if (!payload.brief || payload.brief.trim().length < 3) {
    return NextResponse.json(
      { error: "Please enter a brief with at least a few words describing what you want." },
      { status: 400 }
    );
  }

  try {
    const result = await enhanceBrief({
      brief: payload.brief.trim(),
      productType: payload.productType,
      referenceImageDescriptions: payload.referenceImageDescriptions,
    });

    return NextResponse.json({
      success: true,
      enhancement: result,
    });
  } catch (error) {
    console.error("Brief enhancement failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI brief enhancement failed. Check that at least one AI provider is configured.",
      },
      { status: 500 }
    );
  }
}
