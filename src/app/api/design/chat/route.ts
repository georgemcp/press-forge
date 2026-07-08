import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { designChat, type DesignChatMessage } from "@/lib/ai/design-agent";
import type { BriefEnhancementResult } from "@/lib/ai/brief-enhancer";
import type { LayoutSpec } from "@/lib/print/layout-spec";

export const runtime = "nodejs";

interface ChatApiRequest {
  messages: DesignChatMessage[];
  context: {
    brief: string;
    enhancedBrief?: BriefEnhancementResult;
    currentSpec?: LayoutSpec;
    designRationale?: string;
    iteration: number;
    productType: string;
  };
}

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json(
      { error: "Create an account to use the design chat." },
      { status: 401 }
    );
  }

  const payload = (await request.json().catch(() => ({}))) as ChatApiRequest;

  if (!payload.messages || payload.messages.length === 0) {
    return NextResponse.json(
      { error: "Please include at least one message." },
      { status: 400 }
    );
  }

  if (!payload.context) {
    return NextResponse.json(
      { error: "Context is required for design chat." },
      { status: 400 }
    );
  }

  try {
    const response = await designChat(payload.messages, payload.context);

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
