import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { generateDesignSpec } from "@/lib/ai/design-generator";
import { layoutSpecSchema } from "@/lib/print/layout-spec";
import { briefEnhancementSchema } from "@/lib/ai/brief-enhancer";
import { checkRateLimit, getRequestIp, rateLimitResponse } from "@/lib/security/request";
import { describeServerError, redactSensitiveDetail } from "@/lib/security/server-error";

export const runtime = "nodejs";

// Issue fields that describe the schema rather than echo the submitted value.
const safeIssueKeys = new Set(["path", "code", "message", "expected", "values"]);

/**
 * Reduces validation issues to the structure the client actually needs. Zod
 * can attach the rejected input to an issue (`input`, `received`, ...) and its
 * default messages may quote that value; neither may be logged or returned.
 */
function sanitizeValidationIssues(issues: readonly unknown[]) {
  return issues.map((issue) => {
    const record =
      issue && typeof issue === "object" ? (issue as Record<string, unknown>) : {};
    let message = typeof record.message === "string" ? record.message : "Invalid value";

    // Anything outside the safe fields is a candidate value echo: replace its
    // textual form inside the message before the issue leaves the server.
    for (const [key, value] of Object.entries(record)) {
      if (safeIssueKeys.has(key)) {
        continue;
      }
      const text =
        typeof value === "string" || typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : undefined;
      if (text && text.length >= 2) {
        message = message.split(text).join("[redacted]");
      }
    }

    return {
      path: Array.isArray(record.path) ? record.path : [],
      code: typeof record.code === "string" ? record.code : "invalid",
      message: redactSensitiveDetail(message)
    };
  });
}

const uploadReferenceSchema = z.string().max(200).regex(/^\/api\/upload\?file_id=[0-9a-f-]{36}$/i);
const generateRequestSchema = z.object({
  enhancedBrief: briefEnhancementSchema,
  brief: z.string().max(6000).optional(),
  productType: z.enum(["business_card", "postcard", "flyer", "poster", "brochure", "letterhead"]),
  printProfile: z.enum(["USWebCoatedSWOP", "GRACoL2013", "FOGRA39"]).optional(),
  pdfxLevel: z.enum(["PDF/X-1a:2001", "PDF/X-4"]).optional(),
  cropMarks: z.boolean().optional(),
  referenceImageUrls: z.array(uploadReferenceSchema).max(8).optional(),
  designIteration: z.number().int().min(1).max(100).optional()
});

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json(
      { error: "Create an account to generate designs." },
      { status: 401 }
    );
  }

  const rateLimit = checkRateLimit({
    namespace: "design-generate",
    key: `${account.userId}:${getRequestIp(request)}`,
    limit: 10,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, "Design generation limit reached. Try again later.");
  }

  const parsedRequest = generateRequestSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Design generation request failed validation." },
      { status: 400 }
    );
  }
  const payload = parsedRequest.data;

  try {
    const result = await generateDesignSpec({
      enhancedBrief: payload.enhancedBrief,
      productType: payload.productType,
      printProfile: payload.printProfile,
      pdfxLevel: payload.pdfxLevel || "PDF/X-1a:2001",
      cropMarks: payload.cropMarks !== false,
      referenceImageUrls: payload.referenceImageUrls,
      designIteration: payload.designIteration || 1,
    });

    // Validate the generated spec
    const parsed = layoutSpecSchema.safeParse(result.layoutSpec);
    if (!parsed.success) {
      const issues = sanitizeValidationIssues(parsed.error.issues);
      console.error("AI generated invalid layout spec:", JSON.stringify(issues, null, 2));
      return NextResponse.json(
        {
          error: "The AI generated an invalid layout. Please try again with a more detailed brief.",
          issues,
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
    console.error("Design generation failed", { error: describeServerError(error) });
    return NextResponse.json(
      {
        error: "Design generation failed. Check AI provider configuration.",
      },
      { status: 500 }
    );
  }
}
