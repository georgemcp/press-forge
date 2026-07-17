import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { enhanceBrief } from "@/lib/ai/brief-enhancer";
import { checkRateLimit, getRequestIp, rateLimitResponse } from "@/lib/security/request";

export const runtime = "nodejs";

const briefRequestSchema = z.object({
  brief: z.string().trim().min(3).max(6000),
  productType: z.enum(["business_card", "postcard", "flyer", "poster", "brochure", "letterhead"]).optional(),
  referenceImageDescriptions: z.array(z.string().min(1).max(200)).max(8).optional()
});

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json(
      { error: "Create an account to use AI brief enhancement." },
      { status: 401 }
    );
  }

  const rateLimit = checkRateLimit({
    namespace: "brief-enhance",
    key: `${account.userId}:${getRequestIp(request)}`,
    limit: 20,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, "Brief enhancement limit reached. Try again later.");
  }

  const parsed = briefRequestSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a brief with at least a few words describing what you want." },
      { status: 400 }
    );
  }

  try {
    const result = await enhanceBrief({
      brief: parsed.data.brief,
      productType: parsed.data.productType,
      referenceImageDescriptions: parsed.data.referenceImageDescriptions,
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
