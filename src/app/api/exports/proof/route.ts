import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { sendServerAnalyticsEvent } from "@/lib/analytics/server-events";
import { generateProof, publicPreflightReport } from "@/lib/print/proof";
import { cleanupStaleProofJobs, writeProofDeliveryManifest } from "@/lib/print/delivery-manifest";
import { layoutSpecSchema } from "@/lib/print/layout-spec";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";
import {
  claimExportCredit,
  claimSubscriptionExport,
  finalizeExportCredit,
  finalizeSubscriptionExport,
  releaseExportCredit,
  releaseSubscriptionExport,
  type PaidCheckoutSession,
  verifyPaidCheckoutSession
} from "@/lib/billing/paid-session";
import { checkRateLimit, getRequestIp, rateLimitResponse } from "@/lib/security/request";

export const runtime = "nodejs";

const proofRequestSchema = z.object({
  spec: layoutSpecSchema.optional(),
  brief: z.string().max(6000).optional(),
  mode: z.enum(["dummy", "advanced"]).optional(),
  checkoutSessionId: z.string().min(4).max(255).regex(/^cs_[A-Za-z0-9_]+$/).optional(),
  analytics: z.object({
    gaClientId: z.string().max(120).optional(),
    gaSessionId: z.string().max(120).optional(),
    pagePath: z.string().max(240).optional()
  }).optional()
});

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Create an account before generating a Press Forge demo or export." }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    namespace: "proof-export",
    key: `${account.userId}:${getRequestIp(request)}`,
    limit: 12,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, "Proof generation limit reached. Try again later.");
  }

  const parsedRequest = proofRequestSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Proof request failed validation.",
        issues: parsedRequest.error.issues
      },
      { status: 400 }
    );
  }
  const payload = parsedRequest.data;
  const spec = payload.spec ?? layoutSpecSchema.parse(sampleBusinessCardLayout);

  const mode = payload.mode === "advanced" ? "advanced" : "dummy";
  let paidSession: PaidCheckoutSession | undefined;
  try {
    paidSession = mode === "advanced" ? await verifyPaidCheckoutSession(payload.checkoutSessionId, account) : undefined;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Checkout session verification failed."
      },
      { status: 402 }
    );
  }
  if (mode === "advanced") {
    if (!paidSession) {
      return NextResponse.json({ error: "Advanced PDF/X export requires a paid checkout session." }, { status: 402 });
    }
    if (paidSession?.entitlement === "export_credit" && paidSession.consumed) {
      return NextResponse.json({ error: "This export credit has already been used." }, { status: 402 });
    }
  }

  const jobId = randomUUID();
  let claimedExportCredit = false;
  let claimedSubscriptionExport = false;
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
  } else if (paidSession?.entitlement === "subscription") {
    try {
      await claimSubscriptionExport(paidSession, account.userId, jobId);
      claimedSubscriptionExport = true;
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "This subscription export could not be claimed."
        },
        { status: 402 }
      );
    }
  }

  try {
    const generatedRoot = process.env.TRIMPROOF_GENERATED_DIR ?? path.join(process.cwd(), ".trimproof-generated");
    await cleanupStaleProofJobs(generatedRoot);
    const outputDir = path.join(generatedRoot, jobId);
    const proof = await generateProof(spec, outputDir, {
      watermarkDemoArt: mode === "dummy",
      allowModelAssets: mode === "advanced"
    });
    const manifest = await writeProofDeliveryManifest(outputDir, mode, account.userId);
    const fileBase = `/api/exports/proof/files/${jobId}`;
    if (paidSession?.entitlement === "export_credit") {
      await finalizeExportCredit(paidSession.id, jobId);
    } else if (paidSession?.entitlement === "subscription") {
      await finalizeSubscriptionExport(jobId);
    }
    const productionUrls = manifest.canDownloadProductionFiles
      ? {
          downloadUrl: `${fileBase}/${path.basename(proof.report.pdfPath)}`,
          sourceUrl: `${fileBase}/${path.basename(proof.sourcePdfPath)}`,
          svgUrl: `${fileBase}/${path.basename(proof.svgMasterPath)}`
        }
      : {};
    const analytics = await sendServerAnalyticsEvent({
      name: "proof_export_completed",
      clientId: payload.analytics?.gaClientId,
      params: {
        mode,
        product_type: spec.productType,
        report_status: proof.report.status,
        print_profile: proof.report.printProfile,
        pdfx_level: proof.report.pdfxLevel,
        asset_provider: proof.assets[0]?.provider,
        production_download_locked: !manifest.canDownloadProductionFiles,
        entitlement: paidSession?.entitlement ?? "dummy",
        page_path: payload.analytics?.pagePath,
        session_id: numericSessionId(payload.analytics?.gaSessionId)
      }
    });
    if (analytics.status === "failed") {
      console.error("Press Forge server analytics event failed", {
        event: "proof_export_completed",
        provider: analytics.provider,
        reason: analytics.reason
      });
    }

    return NextResponse.json({
      jobId,
      mode,
      productionDownloadLocked: !manifest.canDownloadProductionFiles,
      report: publicPreflightReport(proof.report),
      analytics,
      demoArtWatermarked: mode === "dummy",
      ...productionUrls,
      reportUrl: `${fileBase}/${path.basename(proof.reportPath)}`,
      assetUrls: proof.assets.map((asset) => ({
        slotId: asset.slotId,
        provider: asset.provider,
        url: `${fileBase}/${path.basename(asset.filePath)}`,
        previewUrl: `${fileBase}/${path.basename(asset.previewPath)}`,
        effectiveDpi: asset.effectiveDpi
      }))
    });
  } catch (error) {
    if (claimedExportCredit && paidSession?.entitlement === "export_credit") {
      await releaseExportCredit(paidSession.id, jobId);
    }
    if (claimedSubscriptionExport && paidSession?.entitlement === "subscription") {
      await releaseSubscriptionExport(jobId);
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Proof generation failed."
      },
      { status: 500 }
    );
  }
}

function numericSessionId(value?: string) {
  const sessionId = Number(value);
  return Number.isFinite(sessionId) && sessionId > 0 ? sessionId : undefined;
}
