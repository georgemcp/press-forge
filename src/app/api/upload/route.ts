import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import { checkRateLimit, getRequestIp, rateLimitResponse } from "@/lib/security/request";
import { canonicalUploadPath, isUploadUuid } from "@/lib/security/upload";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ACCOUNT_STORAGE = 100 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_IMAGE_DIMENSION = 4096;
const CATEGORY = "reference";
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function uploadUrl(fileId: string) {
  return `/api/upload?file_id=${encodeURIComponent(fileId)}`;
}

function safeOriginalName(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200) || "upload";
}

function configuredStorageLimit() {
  const configured = Number(process.env.TRIMPROOF_MAX_UPLOAD_STORAGE_BYTES);
  return Number.isFinite(configured) && configured >= MAX_FILE_SIZE
    ? Math.min(configured, 1024 * 1024 * 1024)
    : MAX_ACCOUNT_STORAGE;
}

async function listUploads(supabase: NonNullable<ReturnType<typeof createServiceSupabaseClient>>, userId: string) {
  return supabase.storage.from("design-assets").list(`${userId}/${CATEGORY}`, {
    limit: 1000,
    sortBy: { column: "created_at", order: "desc" }
  });
}

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Create an account to upload images." }, { status: 401 });
  }

  const rateLimit = checkRateLimit({
    namespace: "upload",
    key: `${account.userId}:${getRequestIp(request)}`,
    limit: 20,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, "Upload limit reached. Try again later.");
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  }

  const formData = await request.formData().catch(() => undefined);
  const file = formData?.get("file");
  const category = formData?.get("category") ?? CATEGORY;
  if (category !== CATEGORY) {
    return NextResponse.json({ error: "Invalid upload category." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "No image file was provided." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are allowed." }, { status: 415 });
  }

  try {
    const source = Buffer.from(await file.arrayBuffer());
    const normalized = await sharp(source, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
      animated: false
    })
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true
      })
      .png({ compressionLevel: 9 })
      .toBuffer();

    if (normalized.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "The normalized image is too large." }, { status: 413 });
    }

    const { data: existing, error: listError } = await listUploads(supabase, account.userId);
    if (listError) {
      throw new Error("Storage usage could not be verified.");
    }
    const currentUsage = (existing ?? []).reduce((total, item) => total + Number(item.metadata?.size ?? 0), 0);
    if (currentUsage + normalized.length > configuredStorageLimit()) {
      return NextResponse.json({ error: "Account upload storage limit reached. Delete an image before uploading another." }, { status: 413 });
    }

    const fileId = randomUUID();
    const storagePath = canonicalUploadPath(account.userId, fileId);
    const { error: uploadError } = await supabase.storage.from("design-assets").upload(storagePath, normalized, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: false
    });
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    return NextResponse.json({
      success: true,
      fileId,
      url: uploadUrl(fileId),
      originalName: safeOriginalName(file.name),
      contentType: "image/png",
      size: normalized.length
    });
  } catch (error) {
    console.error("Upload failed", { error: error instanceof Error ? error.message : "Unknown upload error" });
    return NextResponse.json({ error: "Upload failed. Provide a valid PNG, JPEG, or WebP image." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Create an account to view uploads." }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  }

  const fileId = new URL(request.url).searchParams.get("file_id");
  if (fileId) {
    if (!isUploadUuid(fileId)) {
      return NextResponse.json({ error: "Invalid upload identifier." }, { status: 400 });
    }
    const { data, error } = await supabase.storage.from("design-assets").download(canonicalUploadPath(account.userId, fileId));
    if (error || !data) {
      return NextResponse.json({ error: "Upload not found." }, { status: 404 });
    }
    return new Response(await data.arrayBuffer(), {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${fileId}.png"`,
        "X-Content-Type-Options": "nosniff"
      }
    });
  }

  const { data, error } = await listUploads(supabase, account.userId);
  if (error) {
    console.error("List uploads failed", { error: error.message });
    return NextResponse.json({ error: "Uploads could not be loaded." }, { status: 503 });
  }

  const files = (data ?? [])
    .filter((item) => /^[0-9a-f-]{36}\.png$/i.test(item.name))
    .map((item) => {
      const id = item.name.slice(0, -4);
      return {
        id,
        name: item.name,
        url: uploadUrl(id),
        size: Number(item.metadata?.size ?? 0),
        contentType: "image/png",
        createdAt: item.created_at
      };
    });

  return NextResponse.json({ files });
}

export async function DELETE(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Create an account to delete uploads." }, { status: 401 });
  }
  const fileId = new URL(request.url).searchParams.get("file_id");
  if (!fileId || !isUploadUuid(fileId)) {
    return NextResponse.json({ error: "Invalid upload identifier." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  }
  const { error } = await supabase.storage.from("design-assets").remove([canonicalUploadPath(account.userId, fileId)]);
  if (error) {
    return NextResponse.json({ error: "Upload could not be deleted." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
