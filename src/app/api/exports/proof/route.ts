import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { generateProof } from "@/lib/print/proof";
import { layoutSpecSchema } from "@/lib/print/layout-spec";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";
import { consumeExportCredit, verifyPaidCheckoutSession } from "@/lib/billing/paid-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    spec?: unknown;
    brief?: string;
    mode?: "dummy" | "advanced";
    checkoutSessionId?: string;
  };
  const parsed = layoutSpecSchema.safeParse(payload.spec ?? sampleBusinessCardLayout);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "LayoutSpec failed validation.",
        issues: parsed.error.issues
      },
      { status: 400 }
    );
  }

  try {
    const paidSession = payload.mode === "advanced" ? await verifyPaidCheckoutSession(payload.checkoutSessionId) : undefined;
    if (payload.mode === "advanced" && !paidSession) {
      return NextResponse.json({ error: "Advanced PDF/X export requires a paid checkout session." }, { status: 402 });
    }
    if (paidSession?.entitlement === "export_credit" && paidSession.consumed) {
      return NextResponse.json({ error: "This export credit has already been used." }, { status: 402 });
    }

    const jobId = randomUUID();
    const generatedRoot = process.env.TRIMPROOF_GENERATED_DIR ?? path.join(process.cwd(), ".trimproof-generated");
    const outputDir = path.join(generatedRoot, jobId);
    const proof = await generateProof(parsed.data, outputDir);
    const fileBase = `/api/exports/proof/files/${jobId}`;
    if (paidSession?.entitlement === "export_credit") {
      await consumeExportCredit(paidSession.id, jobId);
    }
    return NextResponse.json({
      jobId,
      report: proof.report,
      downloadUrl: `${fileBase}/${path.basename(proof.report.pdfPath)}`,
      sourceUrl: `${fileBase}/${path.basename(proof.sourcePdfPath)}`,
      svgUrl: `${fileBase}/${path.basename(proof.svgMasterPath)}`,
      reportUrl: `${fileBase}/${path.basename(proof.reportPath)}`,
      assetUrls: proof.assets.map((asset) => ({
        slotId: asset.slotId,
        provider: asset.provider,
        url: `${fileBase}/${path.basename(asset.filePath)}`,
        effectiveDpi: asset.effectiveDpi
      }))
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Proof generation failed."
      },
      { status: 500 }
    );
  }
}
