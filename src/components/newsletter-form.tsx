"use client";

import React from "react";

export function NewsletterForm() {
  const [state, setState] = React.useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = React.useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    const consent = new FormData(form).get("consent") === "on";
    setState("busy");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setState("done");
        form.reset();
      } else {
        setState("error");
        setMessage(data.error ?? "Could not subscribe right now.");
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (state === "done") {
    return <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Thank you — you are subscribed. ✦</p>;
  }
  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-md flex-col gap-3">
      <div className="flex gap-2">
        <label htmlFor="nl-email" className="sr-only">
          Email address
        </label>
        <input id="nl-email" name="email" type="email" required placeholder="you@example.com" className="input flex-1" />
        <button type="submit" disabled={state === "busy"} className="btn-burgundy px-5 py-2.5 text-sm">
          {state === "busy" ? "…" : "Subscribe"}
        </button>
      </div>
      <label className="flex items-start gap-2 text-left text-xs text-charcoal-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 accent-burgundy" />
        I agree to receive inspiration and offers by email. I can unsubscribe anytime.
      </label>
      {state === "error" && message ? (
        <p role="alert" className="text-left text-xs text-burgundy">
          {message}
        </p>
      ) : null}
    </form>
  );
}
