import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { updateProfileAction } from "./actions";
import { getBranding } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const user = await requireUser("/account");
  const sb = safeServiceSupabase();
  const { data: profile } = sb
    ? await sb.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };
  const branding = await getBranding();

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-charcoal">Profile</h1>
      {searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Profile updated.</p>
      ) : null}
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
      ) : null}

      <form action={updateProfileAction} className="card max-w-xl space-y-4 p-6">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" value={user.email ?? ""} disabled className="input bg-champagne/60" />
        </div>
        <div>
          <label htmlFor="full_name" className="label">Full name</label>
          <input id="full_name" name="full_name" maxLength={120} defaultValue={(profile?.full_name as string) ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="phone" className="label">Phone</label>
          <input id="phone" name="phone" type="tel" maxLength={20} defaultValue={(profile?.phone as string) ?? ""} className="input" placeholder="+91 …" />
        </div>
        <label className="flex items-center gap-2 text-sm text-charcoal-soft">
          <input
            type="checkbox"
            name="marketing_opt_in"
            defaultChecked={Boolean(profile?.marketing_opt_in)}
            className="accent-burgundy"
          />
          Email me inspiration and offers from {branding.businessName}
        </label>
        <button type="submit" className="btn-burgundy">Save changes</button>
      </form>

      <div className="card max-w-xl p-6">
        <h2 className="font-serif text-xl text-charcoal">Security</h2>
        <p className="mt-2 text-sm text-charcoal-muted">
          To change your password, use the secure reset link — a fresh email will be sent to your inbox.
        </p>
        <ChangePasswordButton email={user.email ?? ""} />
      </div>
    </div>
  );
}

import { ChangePasswordButton } from "@/components/change-password-button";
