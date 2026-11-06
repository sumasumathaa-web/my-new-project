import { safeServiceSupabase } from "@/lib/supabase/admin";
import type { Json } from "@/lib/types";

/**
 * Writes an immutable audit record for security-relevant and business
 * operations (admin CRUD, order transitions, payment events, logins...).
 * Best-effort: failures are logged, never thrown into user flows.
 */
export async function logAudit(entry: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Json;
}): Promise<void> {
  try {
    const sb = safeServiceSupabase();
    if (!sb) return;
    await sb.from("audit_logs").insert({
      actor_user_id: entry.actorUserId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
      meta: entry.meta ?? {},
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
