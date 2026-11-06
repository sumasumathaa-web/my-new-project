"use client";

import React from "react";
import Link from "next/link";
import { requestPasswordResetClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    try {
      const { error: err } = await requestPasswordResetClient(email);
      if (err) {
        setError(err);
        return;
      }
      setSent(true);
    } catch {
      setError("Could not send reset email right now.");
    }
  }

  return (
    <div className="container-pad max-w-md py-16">
      <div className="card p-8">
        <h1 className="font-serif text-3xl text-charcoal">Reset password</h1>
        {sent ? (
          <p className="mt-4 text-sm text-[#2F6B38]">
            If an account exists for that email, a secure reset link is on its way. The link opens a page where you set a
            new password.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" name="email" type="email" required className="input" />
            </div>
            {error ? <p role="alert" className="text-sm text-burgundy">{error}</p> : null}
            <button type="submit" className="btn-burgundy w-full">Send reset link</button>
          </form>
        )}
        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="text-charcoal-muted underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
