import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { createServiceSupabaseClient } from "@/lib/db/supabase";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/heic",
  "image/heif",
];

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json(
      { error: "Create an account to upload images." },
      { status: 401 }
    );
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "reference";

  if (!file) {
    return NextResponse.json(
      { error: "No file provided. Use form field 'file'." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    const fileId = randomUUID();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const storagePath = `${account.userId}/${category}/${fileId}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("design-assets")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("design-assets").getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      fileId,
      url: publicUrl,
      path: storagePath,
      originalName: file.name,
      contentType: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Upload failed.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json(
      { error: "Create an account to view uploads." },
      { status: 401 }
    );
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ files: [] });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "reference";

  try {
    const { data, error } = await supabase.storage
      .from("design-assets")
      .list(`${account.userId}/${category}`);

    if (error) {
      console.error("List uploads failed:", error);
      return NextResponse.json({ files: [] });
    }

    const files = (data || []).map((file) => {
      const {
        data: { publicUrl },
      } = supabase.storage
        .from("design-assets")
        .getPublicUrl(`${account.userId}/${category}/${file.name}`);

      return {
        id: file.name.split(".")[0],
        name: file.name,
        url: publicUrl,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || "image/png",
        createdAt: file.created_at,
      };
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("List uploads failed:", error);
    return NextResponse.json({ files: [] });
  }
}
