import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { canServeProofFile, isAllowedProofFileName } from "@/lib/print/delivery-manifest";

export const runtime = "nodejs";

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
  if (fileName.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (fileName.endsWith(".txt")) {
    return "text/plain; charset=utf-8";
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
  const { file } = await params;
  const [jobId, fileName, extra] = file;
  if (!jobId || !fileName || extra || !uuidPattern.test(jobId) || !isAllowedProofFileName(fileName)) {
    return NextResponse.json({ error: "Invalid proof file path." }, { status: 400 });
  }

  const generatedRoot = process.env.TRIMPROOF_GENERATED_DIR ?? path.join(process.cwd(), ".trimproof-generated");
  const outputDir = path.join(generatedRoot, jobId);
  const proofPath = path.join(outputDir, fileName);

  try {
    if (!(await canServeProofFile(outputDir, fileName))) {
      return NextResponse.json({ error: "Production proof downloads require advanced export access." }, { status: 403 });
    }
    const bytes = await fs.readFile(proofPath);
    return new Response(bytes, {
      headers: {
        "Content-Type": getContentType(fileName),
        "Content-Disposition": `${fileName.endsWith(".pdf") ? "attachment" : "inline"}; filename="${fileName}"`,
        "Cache-Control": "private, max-age=900"
      }
    });
  } catch {
    return NextResponse.json({ error: "Proof file not found." }, { status: 404 });
  }
}
