import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { designChat } from "@/lib/ai/design-agent";
import { briefEnhancementSchema } from "@/lib/ai/brief-enhancer";
import { assetSlotSchema, layoutSpecSchema, textBlockSchema } from "@/lib/print/layout-spec";
import { checkRateLimit, getRequestIp, rateLimitResponse } from "@/lib/security/request";

export const runtime = "nodejs";

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000)
  })).min(1).max(20),
  context: z.object({
    brief: z.string().max(6000),
    enhancedBrief: briefEnhancementSchema.optional(),
    currentSpec: layoutSpecSchema.optional(),
    designRationale: z.string().max(4000).optional(),
    iteration: z.number().int().min(1).max(100),
    productType: z.enum(["business_card", "postcard", "flyer", "poster", "brochure", "letterhead"])
  })
});

const chatResponseSchema = z.object({
  message: z.string().min(1).max(4000),
  specChanges: layoutSpecSchema.partial().optional(),
  newAssetSlots: z.array(assetSlotSchema).max(8).optional(),
  newTextBlocks: z.array(textBlockSchema).max(64).optional(),
  newStyleDirection: z.string().min(1).max(2000).optional(),
  suggestedAction: z.enum(["regenerate", "tweak", "approve"]).optional()
});

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json(
      { error: "Create an account to use the design chat." },
      { status: 401 }
    );
  }

  const rateLimit = checkRateLimit({
    namespace: "design-chat",
    key: `${account.userId}:${getRequestIp(request)}`,
    limit: 30,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, "Design chat limit reached. Try again later.");
  }

  const parsed = chatRequestSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Design chat request failed validation." },
      { status: 400 }
    );
  }

  try {
    const response = chatResponseSchema.parse(await designChat(parsed.data.messages, parsed.data.context));

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("Design chat failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Design chat failed. Check AI provider configuration.",
      },
      { status: 500 }
    );
  }
}
