/** RSVP listing for the invitation owner (service role; ownership checked by caller). */
import { safeServiceSupabase } from "@/lib/supabase/admin";

export interface RsvpRow {
  id: string;
  guest_name: string;
  attending: "yes" | "no" | "maybe";
  guests: number;
  message: string | null;
  created_at: string;
}

export async function listRsvps(customizationId: string): Promise<RsvpRow[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("rsvp_responses")
    .select("*")
    .eq("customization_id", customizationId)
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as RsvpRow[];
}
