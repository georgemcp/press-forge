import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { PRINT_PROFILES, PRODUCT_PROFILES, type PrintProfileId, type ProductType } from "@/lib/print/constants";
import { deriveLayoutSpecFromBrief } from "@/lib/print/brief-layout";
import type { LayoutSpec } from "@/lib/print/layout-spec";

export const runtime = "nodejs";

function parseProductType(value: unknown): ProductType | undefined {
  return typeof value === "string" && value in PRODUCT_PROFILES ? (value as ProductType) : undefined;
}

function parsePrintProfile(value: unknown): PrintProfileId | undefined {
  return typeof value === "string" && value in PRINT_PROFILES ? (value as PrintProfileId) : undefined;
}

function parsePdfxLevel(value: unknown): LayoutSpec["pdfxLevel"] | undefined {
  return value === "PDF/X-1a:2001" ? value : undefined;
}

function parseCropMarks(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Create an account before using Trim Proof." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    brief?: string;
    productType?: unknown;
    printProfile?: unknown;
    pdfxLevel?: unknown;
    cropMarks?: unknown;
  };
  const spec = deriveLayoutSpecFromBrief({
    brief: payload.brief,
    productType: parseProductType(payload.productType),
    printProfile: parsePrintProfile(payload.printProfile),
    pdfxLevel: parsePdfxLevel(payload.pdfxLevel),
    cropMarks: parseCropMarks(payload.cropMarks)
  });

  return NextResponse.json({
    spec,
    source: "deterministic-brief-parser",
    note: "The parser keeps print geometry deterministic while creating model-routed asset slots for the proof renderer."
  });
}
