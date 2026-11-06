"use client";

import React from "react";
import { requestPasswordResetClient } from "@/lib/auth-client";

export function ChangePasswordButton({ email }: { email: string }) {
  const [state, setState] = React.useState<"idle" | "sent" | "error">("idle");
  return (
    <div className="mt-4">
      <button
        type="button"
        className="btn-outline"
        onClick={async () => {
          const { error } = await requestPasswordResetClient(email);
          setState(error ? "error" : "sent");
        }}
      >
        Email me a password reset link
      </button>
      {state === "sent" ? <p className="mt-2 text-sm text-[#2F6B38]">Check your inbox for the reset link.</p> : null}
      {state === "error" ? <p className="mt-2 text-sm text-burgundy">Could not send the email right now.</p> : null}
    </div>
  );
}
