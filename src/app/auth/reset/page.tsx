"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { hasRecoverySessionClient, updatePasswordClient } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // Supabase parses the recovery link and sets a session; local mode uses ?token=.
    hasRecoverySessionClient().then(setReady);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const { error: err } = await updatePasswordClient(password);
    if (err) {
      setError(err);
      return;
    }
    router.push("/login");
  }

  return (
    <div className="container-pad max-w-md py-16">
      <div className="card p-8">
        <h1 className="font-serif text-3xl text-charcoal">Choose a new password</h1>
        {ready ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="label">New password</label>
              <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
            </div>
            {error ? <p role="alert" className="text-sm text-burgundy">{error}</p> : null}
            <button type="submit" className="btn-burgundy w-full">Update password</button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-charcoal-muted">
            This reset link is invalid or has expired. Request a new one from the{" "}
            <a href="/forgot-password" className="text-burgundy underline">forgot password</a> page.
          </p>
        )}
      </div>
    </div>
  );
}
