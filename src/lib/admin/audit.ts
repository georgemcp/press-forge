import { createServiceSupabaseClient } from "@/lib/db/supabase";
import type { Json, TablesInsert } from "@/types/supabase";

type SupabaseClient = NonNullable<ReturnType<typeof createServiceSupabaseClient>>;

export interface AdminAuditInput {
  supabase?: SupabaseClient;
  actor?: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Json;
}

export async function recordAdminAuditEvent(input: AdminAuditInput) {
  const supabase = input.supabase ?? createServiceSupabaseClient();
  if (!supabase) {
    return;
  }

  const event: TablesInsert<"admin_audit_events"> = {
    actor: input.actor ?? process.env.TRIMPROOF_ADMIN_EMAIL ?? "admin",
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    metadata: input.metadata ?? {}
  };

  const { error } = await supabase.from("admin_audit_events").insert(event);
  if (error) {
    console.error("Trim Proof admin audit event failed", {
      action: input.action,
      targetType: input.targetType,
      reason: error.message
    });
  }
}
