import { NextResponse } from "next/server";
import { PRODUCT_PROFILES, type ProductType } from "@/lib/print/constants";
import { deriveLayoutSpecFromBrief } from "@/lib/print/brief-layout";

export const runtime = "nodejs";

function parseProductType(value: unknown): ProductType | undefined {
  return typeof value === "string" && value in PRODUCT_PROFILES ? (value as ProductType) : undefined;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { brief?: string; productType?: unknown };
  const spec = deriveLayoutSpecFromBrief({ brief: payload.brief, productType: parseProductType(payload.productType) });

  return NextResponse.json({
    spec,
    source: "deterministic-brief-parser",
    note: "The parser keeps print geometry deterministic while creating model-routed asset slots for the proof renderer."
  });
}
