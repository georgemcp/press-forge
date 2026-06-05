import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedFilePattern = /^(?:trimproof-business-card\.(?:source\.pdf|pdfx\.pdf|master\.svg)|asset-[a-z0-9-]+\.png|preflight-report\.json)$/;
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
  const { file } = await params;
  const [jobId, fileName, extra] = file;
  if (!jobId || !fileName || extra || !uuidPattern.test(jobId) || !allowedFilePattern.test(fileName)) {
    return NextResponse.json({ error: "Invalid proof file path." }, { status: 400 });
  }

  const generatedRoot = process.env.TRIMPROOF_GENERATED_DIR ?? path.join(process.cwd(), ".trimproof-generated");
  const proofPath = path.join(generatedRoot, jobId, fileName);

  try {
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
