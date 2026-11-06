"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpClient } from "@/lib/auth-client";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [checkEmail, setCheckEmail] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setBusy(false);
      return;
    }
    try {
      const result = await signUpClient(
        String(fd.get("email")),
        password,
        String(fd.get("name") ?? ""),
        next,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.hasSession) {
        router.push(next);
        router.refresh();
      } else {
        setCheckEmail(true);
      }
    } catch {
      setError("Could not create account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="container-pad max-w-md py-16">
        <div className="card p-8 text-center">
          <h1 className="font-serif text-2xl text-charcoal">Confirm your email</h1>
          <p className="mt-3 text-sm text-charcoal-muted">
            We sent a confirmation link to your email. Open it to activate your account, then sign in.
          </p>
          <Link href="/login" className="btn-burgundy mt-6 inline-flex">Go to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-pad max-w-md py-16">
      <div className="card p-8">
        <h1 className="font-serif text-3xl text-charcoal">Create your account</h1>
        <p className="mt-1 text-sm text-charcoal-muted">Save drafts, track orders, personalise invitations.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="label">Full name</label>
            <input id="name" name="name" required maxLength={120} autoComplete="name" className="input" />
          </div>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password (min 8 characters)</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </div>
          {error ? <p role="alert" className="text-sm text-burgundy">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn-burgundy w-full">
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-burgundy">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
export default function RegisterPage() {
  return (
    <React.Suspense fallback={null}>
      <RegisterForm />
    </React.Suspense>
  );
}
