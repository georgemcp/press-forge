import { NextResponse } from "next/server";
import { getAccountSessionFromCookies } from "@/lib/auth/account-server";
import { createServiceSupabaseClient } from "@/lib/db/supabase";
import type { Json } from "@/types/supabase";
import type { LayoutSpec } from "@/lib/print/layout-spec";
import type { BriefEnhancementResult } from "@/lib/ai/brief-enhancer";

export const runtime = "nodejs";

export interface SavedDesign {
  id: string;
  userId: string;
  name: string;
  brief: string;
  enhancedBrief: BriefEnhancementResult | null;
  layoutSpec: LayoutSpec;
  designRationale: string | null;
  productType: string;
  referenceImageUrls: string[];
  iterationCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── GET /api/designs — list saved designs ──────────────────────────────────────

export async function GET(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Sign in to view your saved designs." }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const designId = searchParams.get("id");

  // Load a single design by ID
  if (designId) {
    const { data, error } = await supabase
      .from("saved_designs")
      .select("*")
      .eq("id", designId)
      .eq("user_id", account.userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Design not found." }, { status: 404 });
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      design: {
        id: row.id as string,
        userId: row.user_id as string,
        name: (row.name as string) || "Untitled Design",
        brief: (row.brief as string) || "",
        enhancedBrief: (row.enhanced_brief as BriefEnhancementResult | null) || null,
        layoutSpec: row.layout_spec as LayoutSpec,
        designRationale: (row.design_rationale as string) || null,
        productType: (row.product_type as string) || "business_card",
        referenceImageUrls: (row.reference_image_urls as string[]) || [],
        iterationCount: (row.iteration_count as number) || 1,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      },
    });
  }

  // List all designs
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  const { data, error } = await supabase
    .from("saved_designs")
    .select("*")
    .eq("user_id", account.userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to list designs:", error);
    return NextResponse.json({ error: "Failed to load designs." }, { status: 500 });
  }

  const designs: SavedDesign[] = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    name: (row.name as string) || "Untitled Design",
    brief: (row.brief as string) || "",
    enhancedBrief: (row.enhanced_brief as BriefEnhancementResult | null) || null,
    layoutSpec: row.layout_spec as LayoutSpec,
    designRationale: (row.design_rationale as string) || null,
    productType: (row.product_type as string) || "business_card",
    referenceImageUrls: (row.reference_image_urls as string[]) || [],
    iterationCount: (row.iteration_count as number) || 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));

  return NextResponse.json({ designs });
}

// ── DELETE /api/designs?id=… ──────────────────────────────────────────────────

export async function DELETE(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Sign in to delete designs." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const designId = searchParams.get("id");
  if (!designId) {
    return NextResponse.json({ error: "Missing design id." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const { error } = await supabase
    .from("saved_designs")
    .delete()
    .eq("id", designId)
    .eq("user_id", account.userId);

  if (error) {
    console.error("Failed to delete design:", error);
    return NextResponse.json({ error: "Failed to delete design." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── POST /api/designs — save a design ─────────────────────────────────────────

export async function POST(request: Request) {
  const account = await getAccountSessionFromCookies();
  if (!account) {
    return NextResponse.json({ error: "Sign in to save designs." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    id?: string;              // if provided, update existing design
    name?: string;
    brief?: string;
    enhancedBrief?: BriefEnhancementResult | null;
    layoutSpec?: LayoutSpec;
    designRationale?: string;
    productType?: string;
    referenceImageUrls?: string[];
    iterationCount?: number;
  };

  if (!payload.layoutSpec) {
    return NextResponse.json({ error: "Missing layout spec." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const designData = {
    user_id: account.userId,
    name: payload.name || "Untitled Design",
    brief: payload.brief || "",
    enhanced_brief: payload.enhancedBrief as Json || null,
    layout_spec: payload.layoutSpec as unknown as Json,
    design_rationale: payload.designRationale || null,
    product_type: payload.productType || "business_card",
    reference_image_urls: payload.referenceImageUrls || [],
    iteration_count: payload.iterationCount || 1,
  };

  if (payload.id) {
    // Update existing design
    const { data, error } = await supabase
      .from("saved_designs")
      .update(designData)
      .eq("id", payload.id)
      .eq("user_id", account.userId)
      .select("id")
      .single();

    if (error) {
      console.error("Failed to update design:", error);
      return NextResponse.json({ error: "Failed to update design." }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  }

  // Insert new design
  const { data, error } = await supabase
    .from("saved_designs")
    .insert(designData)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save design:", error);
    return NextResponse.json({ error: "Failed to save design." }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id });
}
