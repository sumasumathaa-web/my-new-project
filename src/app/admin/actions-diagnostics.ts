"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { safeServiceSupabase } from "@/lib/supabase/admin";

/**
 * One-click write test for the System Status page.
 *
 * It writes a single audit-log row through exactly the same service-role client
 * that every admin save uses, then redirects back with the measured latency.
 * If this reports success but a normal save "does nothing", the problem is in
 * that form's payload; if it reports an error, the message shown is the real
 * database error (never swallowed).
 */
export async function runWriteTestAction() {
  const admin = await requireAdmin();
  const started = Date.now();
  let outcome: string;
  try {
    const sb = safeServiceSupabase();
    if (!sb) throw new Error("No database client: service-role key or Supabase URL is missing.");
    // Deliberately NOT via logAudit(): that helper swallows errors, and this test
    // must surface the real database error message.
    const { error } = await sb.from("audit_logs").insert({
      actor_user_id: admin.id,
      actor_email: admin.email,
      action: "system.write_test",
      entity: "system",
      entity_id: "write-test",
      meta: { at: new Date().toISOString() },
    });
    if (error) throw new Error(error.message);
    outcome = `ok&ms=${Date.now() - started}`;
  } catch (e) {
    outcome = `fail&ms=${Date.now() - started}&reason=${encodeURIComponent(e instanceof Error ? e.message : "Unknown error")}`;
  }
  redirect(`/admin/status?test=${outcome}`);
}
