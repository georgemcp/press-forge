import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { generateDesignSpec } from "@/lib/ai/design-generator";
import { layoutSpecSchema } from "@/lib/print/layout-spec";
import type { ProductType, PrintProfileId } from "@/lib/print/constants";
import type { BriefEnhancementResult } from "@/lib/ai/brief-enhancer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json(
      { error: "Create an account to generate designs." },
      { status: 401 }
    );
  }

  const payload = (await request.json().catch(() => ({}))) as {
    enhancedBrief?: BriefEnhancementResult;
    brief?: string;
    productType?: ProductType;
    printProfile?: PrintProfileId;
    pdfxLevel?: string;
    cropMarks?: boolean;
    referenceImageUrls?: string[];
    designIteration?: number;
  };

  if (!payload.enhancedBrief) {
    return NextResponse.json(
      { error: "Please enhance your brief first before generating a design." },
      { status: 400 }
    );
  }

  if (!payload.productType) {
    return NextResponse.json(
      { error: "Please select a product type." },
      { status: 400 }
    );
  }

  try {
    const result = await generateDesignSpec({
      enhancedBrief: payload.enhancedBrief,
      productType: payload.productType,
      printProfile: payload.printProfile,
      pdfxLevel: (payload.pdfxLevel as "PDF/X-1a:2001" | "PDF/X-4") || "PDF/X-1a:2001",
      cropMarks: payload.cropMarks !== false,
      referenceImageUrls: payload.referenceImageUrls,
      designIteration: payload.designIteration || 1,
    });

    // Validate the generated spec
    const parsed = layoutSpecSchema.safeParse(result.layoutSpec);
    if (!parsed.success) {
      console.error(
        "AI generated invalid layout spec:",
        JSON.stringify(parsed.error.issues, null, 2)
      );
      return NextResponse.json(
        {
          error: "The AI generated an invalid layout. Please try again with a more detailed brief.",
          issues: parsed.error.issues,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      designId: randomUUID(),
      layoutSpec: parsed.data,
      designRationale: result.designRationale,
      assetPrompts: result.assetPrompts,
    });
  } catch (error) {
    console.error("Design generation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Design generation failed. Check AI provider configuration.",
      },
      { status: 500 }
    );
  }
}
