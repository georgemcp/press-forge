import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { canServeProofFile } from "@/lib/print/delivery-manifest";

export const runtime = "nodejs";

const allowedFilePattern = /^(?:pressforge-(?:business-card|postcard|flyer|poster|brochure|letterhead)\.(?:source\.pdf|pdfx\.pdf|master\.svg)|asset-[a-z0-9-]+(?:-preview)?\.png|preflight-report\.json)$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getContentType(fileName: string) {
  if (fileName.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (fileName.endsWith(".svg")) {
    return "image/svg+xml; charset=utf-8";
  }
  if (fileName.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (fileName.endsWith(".png")) {
    return "image/png";
  }
  return "application/octet-stream";
}

interface FileRouteContext {
  params: Promise<{
    file: string[];
  }>;
}

export async function GET(_request: Request, { params }: FileRouteContext) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Sign in to download proof files." }, { status: 401 });
  }
  const { file } = await params;
  const [jobId, fileName, extra] = file;
  if (!jobId || !fileName || extra || !uuidPattern.test(jobId) || !allowedFilePattern.test(fileName)) {
    return NextResponse.json({ error: "Invalid proof file path." }, { status: 400 });
  }

  const generatedRoot = process.env.TRIMPROOF_GENERATED_DIR ?? path.join(process.cwd(), ".trimproof-generated");
  const outputDir = path.join(generatedRoot, jobId);
  const proofPath = path.join(outputDir, fileName);

  try {
    if (!(await canServeProofFile(outputDir, fileName, account.userId))) {
      return NextResponse.json({ error: "This proof file is not available to this account." }, { status: 403 });
    }
    const bytes = await fs.readFile(proofPath);
    return new Response(bytes, {
      headers: {
        "Content-Type": getContentType(fileName),
        "Content-Disposition": `${fileName.endsWith(".pdf") || fileName.endsWith(".svg") ? "attachment" : "inline"}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": fileName.endsWith(".svg") ? "sandbox; default-src 'none'" : "default-src 'none'",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ error: "Proof file not found." }, { status: 404 });
  }
}
