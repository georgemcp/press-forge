import { NextResponse } from "next/server";
import { layoutSpecSchema } from "@/lib/print/layout-spec";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { brief?: string };
  const brief = payload.brief?.trim();
  const spec = layoutSpecSchema.parse({
    ...sampleBusinessCardLayout,
    styleDirection: brief ? `User brief: ${brief}` : sampleBusinessCardLayout.styleDirection
  });

  return NextResponse.json({
    spec,
    source: "deterministic-fallback",
    note: "LLM JSON decomposition is isolated behind this endpoint; deterministic fallback keeps prepress proof runnable without model credentials."
  });
}
