"use client";

import { useRouter } from "next/navigation";
import { signOutClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-charcoal-muted underline underline-offset-2 hover:text-burgundy"
      onClick={async () => {
        await signOutClient();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
