"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const { error: signErr } = await signInClient(String(fd.get("email")), String(fd.get("password")));
      if (signErr) {
        setError("Invalid email or password.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Could not sign in. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-pad max-w-md py-16">
      <div className="card p-8">
        <h1 className="font-serif text-3xl text-charcoal">Welcome back</h1>
        <p className="mt-1 text-sm text-charcoal-muted">Sign in to manage orders and invitations.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
          </div>
          {error ? <p role="alert" className="text-sm text-burgundy">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn-burgundy w-full">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="mt-5 flex justify-between text-sm">
          <Link href="/forgot-password" className="text-charcoal-muted underline">Forgot password?</Link>
          <Link href={`/register${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-burgundy">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}
