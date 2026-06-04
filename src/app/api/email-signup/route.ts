import { z } from "zod";
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/db/supabase";

const emailSignupSchema = z.object({
  email: z.string().email(),
  source: z.string().min(1).max(80).default("unknown")
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => undefined);
  const parsed = emailSignupSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email signup payload." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  if (supabase) {
    await supabase.from("email_signups").upsert(
      {
        email: parsed.data.email,
        source: parsed.data.source
      },
      {
        onConflict: "email"
      }
    );
  }

  return NextResponse.json({
    ok: true,
    persisted: Boolean(supabase)
  });
}
