import { NextResponse } from "next/server";
import { deriveLayoutSpecFromBrief } from "@/lib/print/brief-layout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { brief?: string };
  const spec = deriveLayoutSpecFromBrief({ brief: payload.brief });

  return NextResponse.json({
    spec,
    source: "deterministic-brief-parser",
    note: "The parser keeps print geometry deterministic while creating model-routed asset slots for the proof renderer."
  });
}
