import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { generateProof } from "@/lib/print/proof";
import { layoutSpecSchema } from "@/lib/print/layout-spec";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";
import { claimExportCredit, finalizeExportCredit, releaseExportCredit, type PaidCheckoutSession, verifyPaidCheckoutSession } from "@/lib/billing/paid-session";

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

  let paidSession: PaidCheckoutSession | undefined;
  try {
    paidSession = payload.mode === "advanced" ? await verifyPaidCheckoutSession(payload.checkoutSessionId) : undefined;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Checkout session verification failed."
      },
      { status: 402 }
    );
  }
  if (payload.mode === "advanced") {
    if (!paidSession) {
      return NextResponse.json({ error: "Advanced PDF/X export requires a paid checkout session." }, { status: 402 });
    }
    if (paidSession?.entitlement === "export_credit" && paidSession.consumed) {
      return NextResponse.json({ error: "This export credit has already been used." }, { status: 402 });
    }
  }

  const jobId = randomUUID();
  let claimedExportCredit = false;
  if (paidSession?.entitlement === "export_credit") {
    try {
      await claimExportCredit(paidSession.id, jobId);
      claimedExportCredit = true;
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "This export credit could not be claimed."
        },
        { status: 402 }
      );
    }
  }

  try {
    const generatedRoot = process.env.TRIMPROOF_GENERATED_DIR ?? path.join(process.cwd(), ".trimproof-generated");
    const outputDir = path.join(generatedRoot, jobId);
    const proof = await generateProof(parsed.data, outputDir);
    const fileBase = `/api/exports/proof/files/${jobId}`;
    if (paidSession?.entitlement === "export_credit") {
      await finalizeExportCredit(paidSession.id, jobId);
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
    if (claimedExportCredit && paidSession?.entitlement === "export_credit") {
      await releaseExportCredit(paidSession.id, jobId);
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Proof generation failed."
      },
      { status: 500 }
    );
  }
}
